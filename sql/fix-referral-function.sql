-- 紹介システム関数の修正SQL
-- 既存の関数を削除してから再作成します

-- 1. 既存の関数を削除
DROP FUNCTION IF EXISTS get_referral_stats(UUID);

-- 2. 関数を再作成
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

-- 3. 権限を付与
GRANT EXECUTE ON FUNCTION get_referral_stats TO anon, authenticated;

-- 4. profilesテーブルに必要なカラムが存在しない場合は追加
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_points_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS available_points INTEGER DEFAULT 0;

-- 5. invitationsテーブルに必要なカラムが存在しない場合は追加
ALTER TABLE invitations
ADD COLUMN IF NOT EXISTS inviter_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 6. 既存のcreate_invite_link関数も削除して再作成
DROP FUNCTION IF EXISTS create_invite_link(UUID, TEXT, INTEGER);

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

-- 7. 権限を付与
GRANT EXECUTE ON FUNCTION create_invite_link TO authenticated;

-- 8. generate_invite_code関数が存在しない場合は作成
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