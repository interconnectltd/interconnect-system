-- 紹介プログラム完全セットアップSQL
-- このスクリプトをSupabaseのSQLエディタで実行してください

-- 1. UUID拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. invite_linksテーブル（紹介リンク管理）
CREATE TABLE IF NOT EXISTS invite_links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    link_code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    registration_count INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    total_rewards_earned INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. invitationsテーブルの修正（既存テーブルがある場合）
DO $$
BEGIN
    -- テーブルが存在しない場合は作成
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invitations') THEN
        CREATE TABLE invitations (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            inviter_email TEXT NOT NULL,
            invitee_email TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
    
    -- 必要なカラムを追加
    ALTER TABLE invitations 
    ADD COLUMN IF NOT EXISTS inviter_id UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS invite_code TEXT,
    ADD COLUMN IF NOT EXISTS reward_status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS meeting_completed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS reward_processed_at TIMESTAMP WITH TIME ZONE;
END $$;

-- 4. point_transactionsテーブル（ポイント履歴）
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

-- 5. cashout_requestsテーブル（キャッシュアウト申請）
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

-- 6. profilesテーブルにポイント関連カラムを追加
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_points_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS available_points INTEGER DEFAULT 0;

-- 7. RLSポリシーの設定
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashout_requests ENABLE ROW LEVEL SECURITY;

-- invite_linksのポリシー
CREATE POLICY "Users can view own invite links" ON invite_links
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create invite links" ON invite_links
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own invite links" ON invite_links
    FOR UPDATE USING (auth.uid() = created_by);

-- point_transactionsのポリシー
CREATE POLICY "Users can view own transactions" ON point_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- cashout_requestsのポリシー
CREATE POLICY "Users can view own cashout requests" ON cashout_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cashout requests" ON cashout_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. 紹介統計を取得する関数
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS TABLE(
    available_points INTEGER,
    total_points_earned INTEGER,
    total_points_used INTEGER,
    total_registrations INTEGER,
    total_completions INTEGER,
    conversion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            p.id as user_id,
            COALESCE(p.available_points, 0) as available_points,
            COALESCE(p.total_points_earned, 0) as total_points_earned,
            COALESCE(p.total_points_used, 0) as total_points_used
        FROM profiles p
        WHERE p.id = p_user_id
    ),
    referral_stats AS (
        SELECT
            COUNT(DISTINCT i.id) FILTER (WHERE i.status IN ('registered', 'completed')) as total_registrations,
            COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'completed') as total_completions
        FROM invitations i
        WHERE i.inviter_id = p_user_id
    )
    SELECT 
        s.available_points::INTEGER,
        s.total_points_earned::INTEGER,
        s.total_points_used::INTEGER,
        r.total_registrations::INTEGER,
        r.total_completions::INTEGER,
        CASE 
            WHEN r.total_registrations > 0 
            THEN ROUND((r.total_completions::NUMERIC / r.total_registrations::NUMERIC * 100), 2)
            ELSE 0
        END as conversion_rate
    FROM stats s, referral_stats r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. リンクコード生成関数
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 10. 招待リンク作成関数
CREATE OR REPLACE FUNCTION create_invite_link(
    p_user_id UUID,
    p_description TEXT DEFAULT NULL,
    p_max_uses INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_link_code TEXT;
    v_link_id UUID;
BEGIN
    -- ユニークなコードを生成
    LOOP
        v_link_code := generate_invite_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM invite_links WHERE link_code = v_link_code);
    END LOOP;
    
    -- リンクを作成
    INSERT INTO invite_links (created_by, link_code, description, max_uses)
    VALUES (p_user_id, v_link_code, p_description, p_max_uses)
    RETURNING id INTO v_link_id;
    
    RETURN v_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. ポイント付与関数
CREATE OR REPLACE FUNCTION add_referral_reward(
    p_user_id UUID,
    p_invitation_id UUID,
    p_amount INTEGER DEFAULT 1000
)
RETURNS VOID AS $$
BEGIN
    -- ポイント履歴に追加
    INSERT INTO point_transactions (
        user_id, 
        amount, 
        type, 
        description, 
        reference_type, 
        reference_id
    )
    VALUES (
        p_user_id, 
        p_amount, 
        'earned', 
        '紹介報酬', 
        'invitation', 
        p_invitation_id
    );
    
    -- profilesテーブルのポイントを更新
    UPDATE profiles
    SET 
        total_points_earned = total_points_earned + p_amount,
        available_points = available_points + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- invitationsテーブルの報酬ステータスを更新
    UPDATE invitations
    SET 
        reward_status = 'processed',
        reward_processed_at = NOW()
    WHERE id = p_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_invite_links_created_by ON invite_links(created_by);
CREATE INDEX IF NOT EXISTS idx_invite_links_link_code ON invite_links(link_code);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_id ON invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_user_id ON cashout_requests(user_id);

-- 13. トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 14. 更新日時トリガー
CREATE TRIGGER update_invite_links_updated_at BEFORE UPDATE
    ON invite_links FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE
    ON invitations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_cashout_requests_updated_at BEFORE UPDATE
    ON cashout_requests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 15. テストデータの追加（必要に応じて）
-- INSERT INTO invite_links (created_by, link_code, description)
-- VALUES (auth.uid(), 'TEST1234', 'テスト用紹介リンク');

GRANT EXECUTE ON FUNCTION get_referral_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_invite_link TO authenticated;
GRANT EXECUTE ON FUNCTION add_referral_reward TO service_role;