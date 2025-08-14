-- ===========================
-- 紹介システムテーブル修正SQL
-- 400/404エラーを解決
-- ===========================

-- 1. invitationsテーブルの修正（400エラー対応）
-- 不足しているカラムを追加
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS inviter_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS invitee_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS reward_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS meeting_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_id ON invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invitee_id ON invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- 2. cashout_requestsテーブルの作成（404エラー対応）
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
    processed_at TIMESTAMP,
    reject_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_cashout_requests_user_id ON cashout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_status ON cashout_requests(status);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_created_at ON cashout_requests(created_at DESC);

-- 3. create_invite_link関数の修正（link_code曖昧エラー対応）
DROP FUNCTION IF EXISTS create_invite_link(UUID, TEXT);

CREATE OR REPLACE FUNCTION create_invite_link(
    p_user_id UUID,
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    link_code TEXT,
    description TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP
) AS $$
DECLARE
    v_link_code TEXT;
    v_id UUID;
BEGIN
    -- ユニークなリンクコードを生成
    LOOP
        v_link_code := UPPER(
            SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 4) || '-' ||
            SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 4)
        );
        
        -- テーブルエイリアスを使用して曖昧さを解消
        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM invite_links il 
            WHERE il.link_code = v_link_code
        );
    END LOOP;
    
    -- リンクを作成
    INSERT INTO invite_links (user_id, link_code, description, is_active)
    VALUES (p_user_id, v_link_code, p_description, true)
    RETURNING invite_links.id INTO v_id;
    
    -- 結果を返す（テーブルエイリアスを使用）
    RETURN QUERY
    SELECT 
        il.id,
        il.user_id,
        il.link_code,
        il.description,
        il.is_active,
        il.created_at
    FROM invite_links il
    WHERE il.id = v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. invite_linksテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS invite_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    link_code TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_invite_links_user_id ON invite_links(user_id);
CREATE INDEX IF NOT EXISTS idx_invite_links_link_code ON invite_links(link_code);
CREATE INDEX IF NOT EXISTS idx_invite_links_is_active ON invite_links(is_active);

-- 5. RLSポリシーの設定
-- invitationsテーブルのRLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own invitations" ON invitations;
CREATE POLICY "Users can view their own invitations" ON invitations
    FOR SELECT USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

DROP POLICY IF EXISTS "Users can create invitations" ON invitations;
CREATE POLICY "Users can create invitations" ON invitations
    FOR INSERT WITH CHECK (inviter_id = auth.uid());

-- cashout_requestsテーブルのRLS
ALTER TABLE cashout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own cashout requests" ON cashout_requests;
CREATE POLICY "Users can view their own cashout requests" ON cashout_requests
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create cashout requests" ON cashout_requests;
CREATE POLICY "Users can create cashout requests" ON cashout_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- invite_linksテーブルのRLS
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own invite links" ON invite_links;
CREATE POLICY "Users can view their own invite links" ON invite_links
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create invite links" ON invite_links;
CREATE POLICY "Users can create invite links" ON invite_links
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own invite links" ON invite_links;
CREATE POLICY "Users can update their own invite links" ON invite_links
    FOR UPDATE USING (user_id = auth.uid());

-- 6. 関数の権限設定
GRANT EXECUTE ON FUNCTION create_invite_link(UUID, TEXT) TO authenticated;