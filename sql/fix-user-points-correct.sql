-- ===========================
-- user_pointsテーブル修正SQL（正しいカラム構造版）
-- ===========================

-- 既存のuser_pointsテーブルのカラム構造を確認
-- user_points:
-- - id
-- - user_id
-- - total_points (NOT points)
-- - available_points
-- - spent_points
-- - level
-- - created_at
-- - updated_at

-- 1. 初期データ挿入（正しいカラム名を使用）
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

-- 2. get_referral_stats関数を修正（user_pointsの正しいカラム名を使用）
DROP FUNCTION IF EXISTS get_referral_stats(UUID);

CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS TABLE(
    available_points INTEGER,
    total_points_earned INTEGER,
    total_referrals INTEGER,
    successful_referrals INTEGER,
    conversion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH user_stats AS (
        -- ユーザーのポイント情報（正しいカラム名）
        SELECT 
            COALESCE(up.available_points, 0) as available_points,
            COALESCE(up.total_points, 0) as total_points_earned
        FROM user_points up
        WHERE up.user_id = p_user_id
    ),
    referral_stats AS (
        -- 紹介統計
        SELECT 
            COUNT(*) as total_referrals,
            COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as successful_referrals
        FROM invitations i
        WHERE i.inviter_id = p_user_id
    )
    SELECT 
        COALESCE((SELECT available_points FROM user_stats), 0)::INTEGER,
        COALESCE((SELECT total_points_earned FROM user_stats), 0)::INTEGER,
        COALESCE((SELECT total_referrals FROM referral_stats), 0)::INTEGER,
        COALESCE((SELECT successful_referrals FROM referral_stats), 0)::INTEGER,
        CASE 
            WHEN (SELECT total_referrals FROM referral_stats) > 0 
            THEN ROUND(((SELECT successful_referrals FROM referral_stats)::NUMERIC / (SELECT total_referrals FROM referral_stats)) * 100, 2)
            ELSE 0
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. invite_linksテーブルの修正（created_byカラムが正しい）
-- user_idカラムは存在しないので、created_byを使用
ALTER TABLE invite_links 
DROP COLUMN IF EXISTS user_id;

-- 4. create_invite_link関数を修正（created_byカラムを使用）
DROP FUNCTION IF EXISTS create_invite_link(UUID, TEXT);

CREATE OR REPLACE FUNCTION create_invite_link(
    p_user_id UUID,
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    created_by UUID,
    link_code TEXT,
    description TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
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
    
    -- リンクを作成（created_byカラムを使用）
    INSERT INTO invite_links (created_by, link_code, description, is_active)
    VALUES (p_user_id, v_link_code, p_description, true)
    RETURNING invite_links.id INTO v_id;
    
    -- 結果を返す
    RETURN QUERY
    SELECT 
        il.id,
        il.created_by,
        il.link_code,
        il.description,
        il.is_active,
        il.created_at
    FROM invite_links il
    WHERE il.id = v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLSポリシーの更新（created_byを使用）
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own invite links" ON invite_links;
CREATE POLICY "Users can view their own invite links" ON invite_links
    FOR SELECT USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can create invite links" ON invite_links;
CREATE POLICY "Users can create invite links" ON invite_links
    FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their own invite links" ON invite_links;
CREATE POLICY "Users can update their own invite links" ON invite_links
    FOR UPDATE USING (created_by = auth.uid());

-- 6. cashout_requestsテーブルの作成（存在しない場合）
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

-- 7. cashout_requestsのインデックスとRLS
CREATE INDEX IF NOT EXISTS idx_cashout_requests_user_id ON cashout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_status ON cashout_requests(status);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_created_at ON cashout_requests(created_at DESC);

ALTER TABLE cashout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own cashout requests" ON cashout_requests;
CREATE POLICY "Users can view their own cashout requests" ON cashout_requests
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create cashout requests" ON cashout_requests;
CREATE POLICY "Users can create cashout requests" ON cashout_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 8. 権限の付与
GRANT ALL ON user_points TO authenticated;
GRANT ALL ON cashout_requests TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_invite_link(UUID, TEXT) TO authenticated;