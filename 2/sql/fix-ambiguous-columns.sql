-- ===========================
-- カラム参照の曖昧さ（ambiguous）エラー修正
-- ===========================

-- 1. get_referral_stats関数を修正（テーブルエイリアスを明確に）
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
        -- ユーザーのポイント情報（エイリアスを明確に）
        SELECT 
            COALESCE(up.available_points, 0) as user_available_points,
            COALESCE(up.total_points, 0) as user_total_points
        FROM user_points up
        WHERE up.user_id = p_user_id
    ),
    referral_stats AS (
        -- 紹介統計
        SELECT 
            COUNT(*) as total_refs,
            COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as success_refs
        FROM invitations i
        WHERE i.inviter_id = p_user_id
    )
    SELECT 
        COALESCE((SELECT user_available_points FROM user_stats), 0)::INTEGER,
        COALESCE((SELECT user_total_points FROM user_stats), 0)::INTEGER,
        COALESCE((SELECT total_refs FROM referral_stats), 0)::INTEGER,
        COALESCE((SELECT success_refs FROM referral_stats), 0)::INTEGER,
        CASE 
            WHEN (SELECT total_refs FROM referral_stats) > 0 
            THEN ROUND(((SELECT success_refs FROM referral_stats)::NUMERIC / (SELECT total_refs FROM referral_stats)) * 100, 2)
            ELSE 0
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. invitationsテーブルにcreated_atカラムを追加（存在しない場合）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'invitations' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE invitations ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 3. activitiesテーブルにscheduled_atカラムを追加（存在しない場合）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'scheduled_at'
    ) THEN
        ALTER TABLE activities ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 4. eventsテーブルにevent_dateカラムを追加（存在しない場合）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'event_date'
    ) THEN
        -- start_dateが存在する場合はそれを使う
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'events' 
            AND column_name = 'start_date'
        ) THEN
            ALTER TABLE events ADD COLUMN event_date TIMESTAMP WITH TIME ZONE;
            UPDATE events SET event_date = start_date WHERE event_date IS NULL;
        ELSE
            ALTER TABLE events ADD COLUMN event_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- 5. matchingsテーブルを作成（存在しない場合）
CREATE TABLE IF NOT EXISTS matchings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    matched_user_id UUID REFERENCES auth.users(id) NOT NULL,
    match_score NUMERIC(3,2),
    match_reasons JSONB,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, matched_user_id)
);

-- 6. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_invitations_created_at ON invitations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_scheduled_at ON activities(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_matchings_created_at ON matchings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matchings_status ON matchings(status);

-- 7. 権限の付与
GRANT ALL ON matchings TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_stats(UUID) TO authenticated;