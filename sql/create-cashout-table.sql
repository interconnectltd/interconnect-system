-- ===========================
-- cashout_requestsテーブルの作成
-- ===========================

-- cashout_requestsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS cashout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    points INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    net_amount DECIMAL(10,2) NOT NULL,
    bank_name TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_holder TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    processed_at TIMESTAMP WITH TIME ZONE,
    reject_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_cashout_requests_user_id ON cashout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_status ON cashout_requests(status);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_created_at ON cashout_requests(created_at DESC);

-- RLSの有効化
ALTER TABLE cashout_requests ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの設定
DROP POLICY IF EXISTS "Users can view their own cashout requests" ON cashout_requests;
CREATE POLICY "Users can view their own cashout requests" ON cashout_requests
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create cashout requests" ON cashout_requests;
CREATE POLICY "Users can create cashout requests" ON cashout_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own cashout requests" ON cashout_requests;
CREATE POLICY "Users can update their own cashout requests" ON cashout_requests
    FOR UPDATE USING (user_id = auth.uid());

-- 権限の付与
GRANT ALL ON cashout_requests TO authenticated;

-- テーブル作成確認
SELECT 
    table_name, 
    table_type 
FROM information_schema.tables 
WHERE table_name = 'cashout_requests';