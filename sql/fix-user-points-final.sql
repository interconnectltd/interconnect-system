-- ===========================
-- user_pointsテーブル修正SQL（最終版）
-- 正しいカラム構造に基づく修正
-- ===========================

-- 既存のuser_pointsテーブルのカラム構造:
-- - id
-- - user_id
-- - total_points (NOT points)
-- - available_points
-- - spent_points
-- - level
-- - created_at
-- - updated_at

-- 1. user_pointsテーブルが存在しない場合は作成
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

-- 2. インデックスを追加
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_available_points ON user_points(available_points);
CREATE INDEX IF NOT EXISTS idx_user_points_level ON user_points(level);

-- 3. RLSポリシーを設定
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own points" ON user_points;
CREATE POLICY "Users can view their own points" ON user_points
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own points" ON user_points;
CREATE POLICY "Users can update their own points" ON user_points
    FOR UPDATE USING (user_id = auth.uid());

-- 4. get_referral_stats関数を再作成（正しいカラム名を使用）
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

-- 5. 初期データ挿入（正しいカラム名を使用）
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

-- 6. invite_linksテーブルの確認（created_byカラムを使用）
-- invite_linksテーブルは既にcreated_byカラムを使用しているため、修正不要

-- 7. create_invite_link関数（既に修正済み）
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

-- 8. キャッシュアウト機能用の関数
CREATE OR REPLACE FUNCTION process_cashout_request(
    p_user_id UUID,
    p_points INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_available_points INTEGER;
BEGIN
    -- 利用可能ポイントを確認
    SELECT available_points INTO v_available_points
    FROM user_points
    WHERE user_id = p_user_id;
    
    -- ポイントが不足している場合
    IF v_available_points < p_points THEN
        RETURN FALSE;
    END IF;
    
    -- ポイントを減算
    UPDATE user_points
    SET 
        available_points = available_points - p_points,
        spent_points = spent_points + p_points,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 紹介報酬追加関数
CREATE OR REPLACE FUNCTION add_referral_reward(
    p_user_id UUID,
    p_points INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE user_points
    SET 
        total_points = total_points + p_points,
        available_points = available_points + p_points,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- レベルの更新（1000ポイントごとに1レベル）
    UPDATE user_points
    SET level = GREATEST(1, FLOOR(total_points / 1000)::INTEGER + 1)
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 権限の付与
GRANT ALL ON user_points TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_invite_link(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_cashout_request(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION add_referral_reward(UUID, INTEGER) TO authenticated;

-- 11. トリガー関数：新規ユーザー登録時に自動的にuser_pointsレコードを作成
CREATE OR REPLACE FUNCTION create_user_points_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_points (user_id, total_points, available_points, spent_points, level)
    VALUES (NEW.id, 0, 0, 0, 1)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. トリガーの作成（存在しない場合）
DROP TRIGGER IF EXISTS on_auth_user_created_points ON auth.users;
CREATE TRIGGER on_auth_user_created_points
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_points_on_signup();