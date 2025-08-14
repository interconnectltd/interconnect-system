-- ===========================
-- cashout_requestsテーブルの修正
-- ===========================

-- 既存のテーブルを削除（存在する場合）
DROP TABLE IF EXISTS cashout_requests CASCADE;

-- cashout_requestsテーブルを正しい構造で作成
CREATE TABLE cashout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    amount INTEGER NOT NULL, -- 換金申請ポイント数
    gross_amount DECIMAL(10,2) NOT NULL, -- 総額（税込）
    tax_amount DECIMAL(10,2) NOT NULL, -- 源泉徴収税額
    net_amount DECIMAL(10,2) NOT NULL, -- 振込額（税引後）
    bank_info JSONB NOT NULL, -- 銀行情報をJSONBで保存
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
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

-- RLSポリシーの設定
-- ユーザーは自分の換金申請のみ閲覧可能
CREATE POLICY "Users can view own cashout requests" ON cashout_requests
    FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分の換金申請を作成可能
CREATE POLICY "Users can create cashout requests" ON cashout_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の換金申請を更新可能（ステータスがpendingの場合のみ）
CREATE POLICY "Users can update pending cashout requests" ON cashout_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- 権限の付与
GRANT ALL ON cashout_requests TO authenticated;
GRANT ALL ON cashout_requests TO anon;

-- bank_infoカラムの説明用コメント
COMMENT ON COLUMN cashout_requests.bank_info IS 'JSON形式の銀行情報: {bank_name, branch_name, branch_code, account_type, account_number, account_holder}';

-- ポイント残高を減らすRPC関数（存在しない場合は作成）
CREATE OR REPLACE FUNCTION deduct_user_points(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
DECLARE
    v_current_points INTEGER;
BEGIN
    -- 現在のポイント残高を取得（available_pointsカラムを使用）
    SELECT available_points INTO v_current_points
    FROM user_points
    WHERE user_id = p_user_id;
    
    -- ポイントが不足している場合はエラー
    IF v_current_points IS NULL OR v_current_points < p_amount THEN
        RAISE EXCEPTION 'ポイントが不足しています';
    END IF;
    
    -- ポイントを減算（available_pointsとspent_pointsを更新）
    UPDATE user_points
    SET available_points = available_points - p_amount,
        spent_points = spent_points + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- ポイント履歴に記録（ポイント履歴テーブルがある場合）
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'point_transactions') THEN
        INSERT INTO point_transactions (
            user_id,
            amount,
            type,
            description,
            created_at
        ) VALUES (
            p_user_id,
            -p_amount,
            'cashout',
            '換金申請',
            NOW()
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 権限の付与
GRANT EXECUTE ON FUNCTION deduct_user_points(UUID, INTEGER) TO authenticated;

-- テーブル作成確認
SELECT 
    table_name, 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'cashout_requests'
ORDER BY ordinal_position;