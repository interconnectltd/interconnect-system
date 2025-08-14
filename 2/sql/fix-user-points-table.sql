-- ===========================
-- user_pointsテーブル修正SQL
-- user_idカラムエラーを解決
-- ===========================

-- 1. user_pointsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    points INTEGER DEFAULT 0,
    available_points INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_withdrawn INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. user_idカラムが存在しない場合は追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_points' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE user_points ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 3. インデックスを追加
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);

-- 4. RLSポリシーを設定
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own points" ON user_points;
CREATE POLICY "Users can view their own points" ON user_points
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own points" ON user_points;
CREATE POLICY "Users can update their own points" ON user_points
    FOR UPDATE USING (user_id = auth.uid());

-- 5. get_referral_stats関数を再作成（エラーがある場合の対策）
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
        -- ユーザーのポイント情報
        SELECT 
            COALESCE(up.available_points, 0) as available_points,
            COALESCE(up.total_earned, 0) as total_points_earned
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

-- 6. 初期データ挿入（ユーザーが存在する場合）
INSERT INTO user_points (user_id, points, available_points, total_earned, total_withdrawn)
SELECT 
    id as user_id,
    0 as points,
    0 as available_points,
    0 as total_earned,
    0 as total_withdrawn
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_points)
ON CONFLICT (user_id) DO NOTHING;

-- 7. invite_linksテーブルも念のため確認・修正
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'invite_links' 
        AND column_name = 'user_id'
    ) THEN
        -- もしinvite_linksにuser_idがない場合は追加
        ALTER TABLE invite_links ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 8. 権限の付与
GRANT ALL ON user_points TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_stats(UUID) TO authenticated;