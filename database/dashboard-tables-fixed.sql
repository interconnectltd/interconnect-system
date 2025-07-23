-- ===========================
-- INTERCONNECT Dashboard Tables (修正版)
-- ===========================

-- まず既存のテーブルを確認して削除（必要な場合）
-- DROP TABLE IF EXISTS user_activities CASCADE;
-- DROP TABLE IF EXISTS dashboard_stats CASCADE;

-- ダッシュボード統計データテーブル
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

-- ユーザーアクティビティテーブル（is_publicカラムを削除）
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- イベントテーブル（既存の場合は確認のみ）
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME,
    time VARCHAR(100), -- 表示用時間文字列
    location VARCHAR(255),
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- メッセージテーブル（既存の場合は確認のみ）
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    message_type VARCHAR(20) DEFAULT 'direct',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- ===========================
-- インデックス作成（is_publicインデックスを削除）
-- ===========================

-- user_activitiesテーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);

-- eventsテーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);

-- messagesテーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON messages(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ===========================
-- RLS (Row Level Security) ポリシー
-- ===========================

-- dashboard_stats テーブルのRLS有効化
ALTER TABLE dashboard_stats ENABLE ROW LEVEL SECURITY;

-- 読み取り: 認証済みユーザーなら誰でも
CREATE POLICY "dashboard_stats_select" ON dashboard_stats
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 更新: 認証済みユーザーのみ
CREATE POLICY "dashboard_stats_update" ON dashboard_stats
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 挿入: 認証済みユーザーのみ
CREATE POLICY "dashboard_stats_insert" ON dashboard_stats
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- user_activities テーブルのRLS有効化
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- 読み取り: 全てのアクティビティを認証済みユーザーが閲覧可能
CREATE POLICY "user_activities_select" ON user_activities
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 挿入: 自分のアクティビティのみ
CREATE POLICY "user_activities_insert" ON user_activities
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 更新: 自分のアクティビティのみ
CREATE POLICY "user_activities_update" ON user_activities
    FOR UPDATE USING (user_id = auth.uid());

-- 削除: 自分のアクティビティのみ
CREATE POLICY "user_activities_delete" ON user_activities
    FOR DELETE USING (user_id = auth.uid());

-- events テーブルのRLS有効化
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 読み取り: アクティブなイベントは誰でも
CREATE POLICY "events_select" ON events
    FOR SELECT USING (
        status = 'active' OR 
        created_by = auth.uid()
    );

-- 挿入: 認証済みユーザー
CREATE POLICY "events_insert" ON events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 更新: 作成者のみ
CREATE POLICY "events_update" ON events
    FOR UPDATE USING (created_by = auth.uid());

-- 削除: 作成者のみ
CREATE POLICY "events_delete" ON events
    FOR DELETE USING (created_by = auth.uid());

-- messages テーブルのRLS有効化
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 読み取り: 送信者または受信者のみ
CREATE POLICY "messages_select" ON messages
    FOR SELECT USING (
        sender_id = auth.uid() OR 
        recipient_id = auth.uid()
    );

-- 挿入: 認証済みユーザー（送信者として）
CREATE POLICY "messages_insert" ON messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

-- 更新: 受信者のみ（既読フラグ更新用）
CREATE POLICY "messages_update" ON messages
    FOR UPDATE USING (recipient_id = auth.uid());

-- 削除: 送信者または受信者
CREATE POLICY "messages_delete" ON messages
    FOR DELETE USING (
        sender_id = auth.uid() OR 
        recipient_id = auth.uid()
    );

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

-- サンプルイベントデータ（既存データがない場合のみ）
INSERT INTO events (
    title,
    description,
    event_date,
    time,
    location,
    max_participants,
    status
) 
SELECT * FROM (VALUES
    ('経営戦略セミナー', 'ビジネス戦略について学ぶセミナーです', CURRENT_DATE + INTERVAL '7 days', '14:00〜16:00', 'オンライン開催', 50, 'active'),
    ('交流ランチ会', 'メンバー同士の交流を深めるランチ会です', CURRENT_DATE + INTERVAL '10 days', '12:00〜14:00', '東京・丸の内', 30, 'active'),
    ('新規事業ピッチ大会', '新規事業のアイデアを競うピッチ大会です', CURRENT_DATE + INTERVAL '17 days', '18:00〜20:00', '大阪・梅田', 100, 'active')
) AS t(title, description, event_date, time, location, max_participants, status)
WHERE NOT EXISTS (SELECT 1 FROM events WHERE status = 'active');

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

-- events updated_at自動更新
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS events_updated_at ON events;
CREATE TRIGGER events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_events_updated_at();

-- ===========================
-- 統計データ自動更新関数
-- ===========================

-- 統計データを自動計算・更新する関数
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
DECLARE
    total_users INTEGER;
    monthly_events_count INTEGER;
    unread_count INTEGER;
    current_month_start DATE;
    current_month_end DATE;
BEGIN
    -- 今月の開始・終了日を計算
    current_month_start := DATE_TRUNC('month', CURRENT_DATE);
    current_month_end := current_month_start + INTERVAL '1 month' - INTERVAL '1 day';
    
    -- 総ユーザー数を取得（auth.usersから）
    SELECT COUNT(*) INTO total_users FROM auth.users;
    
    -- 今月のイベント数を取得
    SELECT COUNT(*) INTO monthly_events_count 
    FROM events 
    WHERE event_date >= current_month_start 
    AND event_date <= current_month_end
    AND status = 'active';
    
    -- 未読メッセージ数を取得（全体）
    SELECT COUNT(*) INTO unread_count 
    FROM messages 
    WHERE is_read = false;
    
    -- 統計データを更新
    UPDATE dashboard_stats SET
        total_members = total_users,
        monthly_events = monthly_events_count,
        unread_messages = unread_count,
        updated_at = NOW()
    WHERE id = (SELECT id FROM dashboard_stats LIMIT 1);
    
    -- レコードが存在しない場合は挿入
    IF NOT FOUND THEN
        INSERT INTO dashboard_stats (
            total_members,
            monthly_events,
            unread_messages
        ) VALUES (
            total_users,
            monthly_events_count,
            unread_count
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ===========================
-- 便利なビュー作成（is_publicカラムを削除）
-- ===========================

-- 最近のアクティビティビュー（ユーザー情報付き）
CREATE OR REPLACE VIEW recent_activities_with_users AS
SELECT 
    ua.id,
    ua.activity_type,
    ua.description,
    ua.metadata,
    ua.created_at,
    u.email,
    COALESCE(
        u.raw_user_meta_data->>'name',
        u.raw_user_meta_data->>'display_name',
        SPLIT_PART(u.email, '@', 1)
    ) as name,
    u.raw_user_meta_data->>'picture' as picture_url
FROM user_activities ua
LEFT JOIN auth.users u ON ua.user_id = u.id
ORDER BY ua.created_at DESC;

-- 今後のイベントビュー
CREATE OR REPLACE VIEW upcoming_events AS
SELECT *
FROM events
WHERE event_date >= CURRENT_DATE
AND status = 'active'
ORDER BY event_date ASC;

-- ===========================
-- 権限設定
-- ===========================

-- ビューへの読み取り権限
GRANT SELECT ON recent_activities_with_users TO authenticated, anon;
GRANT SELECT ON upcoming_events TO authenticated, anon;

-- 統計更新関数の実行権限
GRANT EXECUTE ON FUNCTION refresh_dashboard_stats() TO authenticated;

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
-- 完了メッセージ
-- ===========================

-- 作成完了をログに記録
DO $$
BEGIN
    RAISE NOTICE 'INTERCONNECT Dashboard tables created successfully!';
    RAISE NOTICE 'Tables: dashboard_stats, user_activities, events, messages';
    RAISE NOTICE 'Views: recent_activities_with_users, upcoming_events';
    RAISE NOTICE 'Functions: refresh_dashboard_stats()';
    RAISE NOTICE 'Note: is_public column has been removed from user_activities table';
END $$;