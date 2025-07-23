-- ===========================
-- INTERCONNECT Dashboard Tables (最小構成版)
-- 既存のテーブルと競合しないバージョン
-- ===========================

-- ダッシュボード統計データテーブル（新規作成）
CREATE TABLE IF NOT EXISTS dashboard_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_members INTEGER DEFAULT 0,
    monthly_events INTEGER DEFAULT 0,
    matching_success INTEGER DEFAULT 0,
    unread_messages INTEGER DEFAULT 0,
    member_growth_percentage DECIMAL(5,2) DEFAULT 0,
    event_increase INTEGER DEFAULT 0,
    pending_invitations INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザーアクティビティテーブル（新規作成）
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================
-- インデックス作成
-- ===========================

-- user_activitiesテーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);

-- ===========================
-- RLS (Row Level Security) ポリシー
-- ===========================

-- dashboard_stats テーブルのRLS有効化
ALTER TABLE dashboard_stats ENABLE ROW LEVEL SECURITY;

-- 読み取り: 認証済みユーザーなら誰でも
CREATE POLICY "dashboard_stats_select" ON dashboard_stats
    FOR SELECT USING (true);

-- 更新: 認証済みユーザーのみ
CREATE POLICY "dashboard_stats_update" ON dashboard_stats
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 挿入: 認証済みユーザーのみ
CREATE POLICY "dashboard_stats_insert" ON dashboard_stats
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- user_activities テーブルのRLS有効化
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- 読み取り: 全てのアクティビティを誰でも閲覧可能
CREATE POLICY "user_activities_select" ON user_activities
    FOR SELECT USING (true);

-- 挿入: 自分のアクティビティのみ
CREATE POLICY "user_activities_insert" ON user_activities
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 更新: 自分のアクティビティのみ
CREATE POLICY "user_activities_update" ON user_activities
    FOR UPDATE USING (user_id = auth.uid());

-- 削除: 自分のアクティビティのみ
CREATE POLICY "user_activities_delete" ON user_activities
    FOR DELETE USING (user_id = auth.uid());

-- ===========================
-- 初期データ挿入
-- ===========================

-- 初期統計データ（既存データがない場合のみ）
INSERT INTO dashboard_stats (
    total_members,
    monthly_events,
    matching_success,
    unread_messages,
    member_growth_percentage,
    event_increase,
    pending_invitations
) 
SELECT 
    1,    -- 現在1人（初期ユーザー）
    3,    -- 今月のイベント数
    0,    -- マッチング成功数
    0,    -- 未読メッセージ
    0.0,  -- 前月比成長率
    3,    -- イベント増加数
    0     -- 保留中の招待
WHERE NOT EXISTS (SELECT 1 FROM dashboard_stats);

-- ===========================
-- 自動更新トリガー
-- ===========================

-- dashboard_stats updated_at自動更新
CREATE OR REPLACE FUNCTION update_dashboard_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS dashboard_stats_updated_at ON dashboard_stats;
CREATE TRIGGER dashboard_stats_updated_at
    BEFORE UPDATE ON dashboard_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_stats_updated_at();

-- ===========================
-- 初期サンプルアクティビティ作成
-- ===========================

-- 現在のユーザーIDを取得してサンプルアクティビティを作成
DO $$
DECLARE
    current_user_id UUID;
BEGIN
    -- 最初のユーザーIDを取得
    SELECT id INTO current_user_id FROM auth.users LIMIT 1;
    
    -- ユーザーが存在する場合のみアクティビティを作成
    IF current_user_id IS NOT NULL THEN
        -- 既存のアクティビティがない場合のみ作成
        IF NOT EXISTS (SELECT 1 FROM user_activities LIMIT 1) THEN
            INSERT INTO user_activities (user_id, activity_type, description, metadata, created_at) VALUES
            (current_user_id, 'join', 'さんがコミュニティに参加しました', '{}', NOW() - INTERVAL '2 hours'),
            (current_user_id, 'event_completed', '月例ネットワーキング会が成功裏に終了', '{"event_name": "月例ネットワーキング会"}', NOW() - INTERVAL '5 hours'),
            (current_user_id, 'matching', '3件の新しいビジネスマッチングが成立', '{"matching_count": 3}', NOW() - INTERVAL '1 day');
        END IF;
    END IF;
END $$;

-- ===========================
-- 統計データ手動更新関数（簡易版）
-- ===========================

-- 統計データを手動で更新する関数
CREATE OR REPLACE FUNCTION update_member_count()
RETURNS void AS $$
DECLARE
    total_users INTEGER;
BEGIN
    -- 総ユーザー数を取得
    SELECT COUNT(*) INTO total_users FROM auth.users;
    
    -- 統計データを更新
    UPDATE dashboard_stats SET
        total_members = total_users,
        updated_at = NOW()
    WHERE id = (SELECT id FROM dashboard_stats LIMIT 1);
END;
$$ LANGUAGE plpgsql;

-- 権限設定
GRANT EXECUTE ON FUNCTION update_member_count() TO authenticated;

-- ===========================
-- 完了メッセージ
-- ===========================

DO $$
BEGIN
    RAISE NOTICE '===================================';
    RAISE NOTICE 'Dashboard tables created successfully!';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - dashboard_stats';
    RAISE NOTICE '  - user_activities';
    RAISE NOTICE '===================================';
    RAISE NOTICE 'Note: events and messages tables were not modified';
    RAISE NOTICE 'as they may have different column names in your setup.';
END $$;