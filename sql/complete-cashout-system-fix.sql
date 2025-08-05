-- ===========================
-- 換金システム完全修正SQL
-- cashout_requestsテーブルとpoint_transactionsテーブルの作成
-- ===========================

-- 1. point_transactionsテーブルの作成（ポイント履歴記録用）
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    amount INTEGER NOT NULL, -- 正の値は追加、負の値は使用
    type TEXT NOT NULL CHECK (type IN ('referral_reward', 'cashout', 'manual_adjustment', 'bonus')),
    description TEXT,
    reference_id UUID, -- 関連するレコードのID（例：cashout_request_id）
    balance_after INTEGER, -- トランザクション後の残高
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(type);

-- RLSの有効化
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view own transactions" ON point_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- 権限の付与
GRANT SELECT ON point_transactions TO authenticated;

-- 2. cashout_requestsテーブルの再作成（正しい構造で）
DROP TABLE IF EXISTS cashout_requests CASCADE;

CREATE TABLE cashout_requests (
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

-- インデックスの作成
CREATE INDEX idx_cashout_requests_user_id ON cashout_requests(user_id);
CREATE INDEX idx_cashout_requests_status ON cashout_requests(status);
CREATE INDEX idx_cashout_requests_created_at ON cashout_requests(created_at DESC);

-- RLSの有効化
ALTER TABLE cashout_requests ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view own cashout requests" ON cashout_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create cashout requests" ON cashout_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel pending cashout requests" ON cashout_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (status = 'cancelled');

-- 権限の付与
GRANT ALL ON cashout_requests TO authenticated;

-- 3. user_pointsテーブルの確認と初期化
-- user_pointsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    total_points INTEGER DEFAULT 0,
    available_points INTEGER DEFAULT 0,
    spent_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 既存ユーザーのuser_pointsレコードを作成
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

-- 4. 改良版deduct_user_points関数
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
    
    -- ポイント履歴に記録
    INSERT INTO point_transactions (
        user_id,
        amount,
        type,
        description,
        balance_after
    ) VALUES (
        p_user_id,
        -p_amount,
        'cashout',
        '換金申請',
        v_balance_after
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ポイント追加関数（報酬付与用）
CREATE OR REPLACE FUNCTION add_user_points(
    p_user_id UUID, 
    p_amount INTEGER,
    p_type TEXT DEFAULT 'referral_reward',
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
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
        INSERT INTO user_points (user_id, total_points, available_points)
        VALUES (p_user_id, p_amount, p_amount)
        RETURNING available_points INTO v_balance_after;
    END IF;
    
    -- レベルの更新（1000ポイントごとに1レベル）
    UPDATE user_points
    SET level = GREATEST(1, FLOOR(total_points / 1000)::INTEGER + 1)
    WHERE user_id = p_user_id;
    
    -- ポイント履歴に記録
    INSERT INTO point_transactions (
        user_id,
        amount,
        type,
        description,
        reference_id,
        balance_after
    ) VALUES (
        p_user_id,
        p_amount,
        p_type,
        p_description,
        p_reference_id,
        v_balance_after
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 権限の付与
GRANT EXECUTE ON FUNCTION deduct_user_points(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_points(UUID, INTEGER, TEXT, TEXT, UUID) TO authenticated;

-- 7. 新規ユーザー登録時の自動ポイントレコード作成
CREATE OR REPLACE FUNCTION create_user_points_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_points (user_id, total_points, available_points, spent_points, level)
    VALUES (NEW.id, 0, 0, 0, 1)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーの作成
DROP TRIGGER IF EXISTS on_auth_user_created_points ON auth.users;
CREATE TRIGGER on_auth_user_created_points
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_points_on_signup();

-- 8. デバッグ用：テーブル構造の確認
SELECT 
    'cashout_requests' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'cashout_requests'
ORDER BY ordinal_position;

SELECT 
    'point_transactions' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'point_transactions'
ORDER BY ordinal_position;

-- 9. RLSポリシーの確認
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('cashout_requests', 'point_transactions', 'user_points')
ORDER BY tablename, policyname;