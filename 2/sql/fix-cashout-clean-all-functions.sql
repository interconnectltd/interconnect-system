-- ===========================
-- 換金システム修正SQL（すべての関数バージョンを削除）
-- 同名の関数の全バージョンを削除してから再作成
-- ===========================

-- 1. すべてのバージョンの関数を削除
DROP FUNCTION IF EXISTS deduct_user_points(UUID, INTEGER);
DROP FUNCTION IF EXISTS add_user_points(UUID, INTEGER);
DROP FUNCTION IF EXISTS add_user_points(UUID, INTEGER, TEXT, TEXT, UUID);

-- 他の可能性のあるバージョンも削除（念のため）
DROP FUNCTION IF EXISTS deduct_user_points(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS add_user_points(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS add_user_points(UUID, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_user_points(UUID, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_user_points(UUID, INTEGER, TEXT, TEXT, UUID) CASCADE;

-- 2. cashout_requestsテーブルの作成（存在しない場合のみ）
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

-- 3. deduct_user_points関数を新規作成（一つのバージョンのみ）
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
    
    -- 成功時は何も返さない（VOID）
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. add_user_points関数を新規作成（5つのパラメータバージョンのみ）
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
    
    -- 成功時は何も返さない（VOID）
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 簡易バージョンのadd_user_points関数（後方互換性のため）
CREATE OR REPLACE FUNCTION add_user_points(
    p_user_id UUID, 
    p_amount INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    -- フルバージョンの関数を呼び出す
    PERFORM add_user_points(p_user_id, p_amount, 'referral_reward', NULL, NULL);
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 権限の付与
GRANT EXECUTE ON FUNCTION deduct_user_points(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_points(UUID, INTEGER, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_points(UUID, INTEGER) TO authenticated;

-- 7. 既存ユーザーのuser_pointsレコードを作成（存在しない場合）
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

-- 8. 動作確認
DO $$
DECLARE
    v_function_count INTEGER;
BEGIN
    -- 関数の数を確認
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc
    WHERE proname IN ('deduct_user_points', 'add_user_points');
    
    RAISE NOTICE '作成された関数の数: %', v_function_count;
    
    -- テーブルの存在確認
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cashout_requests') THEN
        RAISE NOTICE 'cashout_requestsテーブル: 存在';
    ELSE
        RAISE NOTICE 'cashout_requestsテーブル: 存在しない';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_points') THEN
        RAISE NOTICE 'user_pointsテーブル: 存在';
    ELSE
        RAISE NOTICE 'user_pointsテーブル: 存在しない';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'point_transactions') THEN
        RAISE NOTICE 'point_transactionsテーブル: 存在';
    ELSE
        RAISE NOTICE 'point_transactionsテーブル: 存在しない';
    END IF;
END $$;

-- 9. 関数の最終確認
SELECT 
    proname as function_name,
    proargnames as argument_names,
    prorettype::regtype as return_type
FROM pg_proc
WHERE proname IN ('deduct_user_points', 'add_user_points')
ORDER BY proname, array_length(proargnames, 1);