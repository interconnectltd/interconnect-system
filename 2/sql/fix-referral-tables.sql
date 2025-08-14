-- 紹介プログラム用のテーブル修正

-- 1. cashout_requestsテーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS cashout_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    tax_amount INTEGER NOT NULL,
    net_amount INTEGER NOT NULL,
    bank_info JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RLSポリシーの設定
ALTER TABLE cashout_requests ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のキャッシュアウト申請のみ表示可能
CREATE POLICY "Users can view own cashout requests" ON cashout_requests
    FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分のキャッシュアウト申請を作成可能
CREATE POLICY "Users can create own cashout requests" ON cashout_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. get_referral_stats関数の修正
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS TABLE(
    available_points INTEGER,
    total_earned INTEGER,
    referral_count INTEGER,
    conversion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN t.type = 'earned' THEN t.amount ELSE -t.amount END), 0)::INTEGER as available_points,
        COALESCE(SUM(CASE WHEN t.type = 'earned' THEN t.amount ELSE 0 END), 0)::INTEGER as total_earned,
        COUNT(DISTINCT i.id)::INTEGER as referral_count,
        CASE 
            WHEN COUNT(DISTINCT i.id) > 0 
            THEN (COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END)::NUMERIC / COUNT(DISTINCT i.id)::NUMERIC * 100)
            ELSE 0
        END as conversion_rate
    FROM profiles p
    LEFT JOIN point_transactions t ON p.id = t.user_id
    LEFT JOIN invitations i ON p.id = i.inviter_id
    WHERE p.id = p_user_id
    GROUP BY p.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. invitationsテーブルの修正（inviter_idカラムが存在しない場合）
DO $$
BEGIN
    -- inviter_idカラムが存在しない場合は追加
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'invitations' 
        AND column_name = 'inviter_id'
    ) THEN
        ALTER TABLE invitations ADD COLUMN inviter_id UUID REFERENCES auth.users(id);
    END IF;
    
    -- invite_codeカラムが存在しない場合は追加
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'invitations' 
        AND column_name = 'invite_code'
    ) THEN
        ALTER TABLE invitations ADD COLUMN invite_code TEXT;
    END IF;
    
    -- reward_statusカラムが存在しない場合は追加
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'invitations' 
        AND column_name = 'reward_status'
    ) THEN
        ALTER TABLE invitations ADD COLUMN reward_status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- 5. point_transactionsテーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('earned', 'used', 'expired')),
    description TEXT,
    reference_type TEXT,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSポリシー
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON point_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- 6. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_id ON invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_user_id ON cashout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_status ON cashout_requests(status);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);

-- 7. 更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cashout_requests_updated_at BEFORE UPDATE
    ON cashout_requests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();