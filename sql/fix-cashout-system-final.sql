-- ===========================
-- 換金システム最終修正SQL
-- 既存のテーブル構造に合わせた修正版
-- ===========================

-- 1. cashout_requestsテーブルの作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS cashout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    amount INTEGER NOT NULL, -- 換金申請ポイント数
    gross_amount DECIMAL(10,2) NOT NULL, -- 総額（税込）
    tax_amount DECIMAL(10,2) NOT NULL, -- 源泉徴収税額
    net_amount DECIMAL(10,2) NOT NULL, -- 振込額（税引後）
    bank_info JSONB NOT NULL, -- 銀行情報をJSONBで保存
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
    processed_at TIMESTAMP WITH TIME ZONE,
    reject_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_cashout_requests_user_id ON cashout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_status ON cashout_requests(status);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_created_at ON cashout_requests(created_at DESC);

-- RLSの有効化
ALTER TABLE cashout_requests ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの設定（既存のポリシーを削除してから作成）
DROP POLICY IF EXISTS "Users can view own cashout requests" ON cashout_requests;
CREATE POLICY "Users can view own cashout requests" ON cashout_requests
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create cashout requests" ON cashout_requests;
CREATE POLICY "Users can create cashout requests" ON cashout_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can cancel pending cashout requests" ON cashout_requests;
CREATE POLICY "Users can cancel pending cashout requests" ON cashout_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (status = 'cancelled');

-- 権限の付与
GRANT ALL ON cashout_requests TO authenticated;
GRANT ALL ON cashout_requests TO anon;

-- 2. point_transactionsテーブルの確認と調整
-- 既存のテーブル構造：transaction_type（typeではない）
-- 新しいレコードを追加する際の調整

-- 3. deduct_user_points関数の修正（既存のテーブル構造に合わせる）
CREATE OR REPLACE FUNCTION deduct_user_points(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
DECLARE
    v_current_points INTEGER;
    v_balance_after INTEGER;
BEGIN
    -- トランザクションレベルのロックを取得
    PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));
    
    -- 現在のポイント残高を取得
    SELECT available_points INTO v_current_points
    FROM user_points
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- ユーザーが存在しない場合
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ユーザーのポイント情報が見つかりません';
    END IF;
    
    -- ポイントが不足している場合
    IF v_current_points < p_amount THEN
        RAISE EXCEPTION 'ポイントが不足しています。現在: %, 必要: %', v_current_points, p_amount;
    END IF;
    
    -- 残高を計算
    v_balance_after := v_current_points - p_amount;
    
    -- ポイントを減算
    UPDATE user_points
    SET available_points = available_points - p_amount,
        spent_points = spent_points + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- ポイント履歴に記録（既存のカラム構造に合わせる）
    INSERT INTO point_transactions (
        user_id,
        transaction_type,  -- 'type'ではなく'transaction_type'を使用
        points,           -- 'amount'ではなく'points'を使用
        reason,           -- 'description'の代わりに'reason'を使用
        created_at
    ) VALUES (
        p_user_id,
        'cashout',
        -p_amount,
        '換金申請',
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. add_user_points関数の修正（既存のテーブル構造に合わせる）
CREATE OR REPLACE FUNCTION add_user_points(
    p_user_id UUID, 
    p_amount INTEGER,
    p_type TEXT DEFAULT 'referral_reward',
    p_reason TEXT DEFAULT NULL,
    p_related_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_balance_after INTEGER;
BEGIN
    -- トランザクションレベルのロックを取得
    PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));
    
    -- ポイントを追加
    UPDATE user_points
    SET total_points = total_points + p_amount,
        available_points = available_points + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING available_points INTO v_balance_after;
    
    -- ユーザーが存在しない場合は作成
    IF NOT FOUND THEN
        INSERT INTO user_points (user_id, total_points, available_points, spent_points, level)
        VALUES (p_user_id, p_amount, p_amount, 0, 1)
        RETURNING available_points INTO v_balance_after;
    END IF;
    
    -- レベルの更新（1000ポイントごとに1レベル）
    UPDATE user_points
    SET level = GREATEST(1, FLOOR(total_points / 1000)::INTEGER + 1)
    WHERE user_id = p_user_id;
    
    -- ポイント履歴に記録（既存のカラム構造に合わせる）
    INSERT INTO point_transactions (
        user_id,
        transaction_type,
        points,
        reason,
        related_id,
        related_type,
        created_at
    ) VALUES (
        p_user_id,
        p_type,
        p_amount,
        p_reason,
        p_related_id,
        CASE 
            WHEN p_type = 'referral_reward' THEN 'invitation'
            WHEN p_type = 'cashout' THEN 'cashout_request'
            ELSE NULL
        END,
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 権限の付与
GRANT EXECUTE ON FUNCTION deduct_user_points(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_points(UUID, INTEGER, TEXT, TEXT, UUID) TO authenticated;

-- 6. 既存ユーザーのuser_pointsレコードを作成（存在しない場合）
INSERT INTO user_points (user_id, total_points, available_points, spent_points, level)
SELECT 
    id as user_id,
    0 as total_points,
    0 as available_points,
    0 as spent_points,
    1 as level
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_points)
ON CONFLICT (user_id) DO NOTHING;

-- 7. デバッグ用：テーブル構造の確認
DO $$
BEGIN
    RAISE NOTICE 'cashout_requestsテーブルのカラム:';
    RAISE NOTICE '%', (
        SELECT string_agg(column_name || ' (' || data_type || ')', ', ')
        FROM information_schema.columns 
        WHERE table_name = 'cashout_requests'
    );
    
    RAISE NOTICE 'point_transactionsテーブルのカラム:';
    RAISE NOTICE '%', (
        SELECT string_agg(column_name || ' (' || data_type || ')', ', ')
        FROM information_schema.columns 
        WHERE table_name = 'point_transactions'
    );
    
    RAISE NOTICE 'user_pointsテーブルのカラム:';
    RAISE NOTICE '%', (
        SELECT string_agg(column_name || ' (' || data_type || ')', ', ')
        FROM information_schema.columns 
        WHERE table_name = 'user_points'
    );
END $$;

-- 8. RLSポリシーの確認
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename IN ('cashout_requests', 'point_transactions', 'user_points')
ORDER BY tablename, policyname;