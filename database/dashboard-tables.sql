-- ===========================
-- INTERCONNECT Dashboard Tables
-- ===========================

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

-- ユーザーアクティビティテーブル
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT true,
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
-- インデックス作成
-- ===========================

-- user_activitiesテーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_public ON user_activities(is_public) WHERE is_public = true;

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
    FOR SELECT USING (auth.role() = 'authenticated');

-- 更新: 管理者のみ（将来的に管理者ロールを追加予定）
CREATE POLICY "dashboard_stats_update" ON dashboard_stats
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 挿入: 管理者のみ
CREATE POLICY "dashboard_stats_insert" ON dashboard_stats
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- user_activities テーブルのRLS有効化
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- 読み取り: パブリックなアクティビティまたは自分のアクティビティ
CREATE POLICY "user_activities_select" ON user_activities
    FOR SELECT USING (
        is_public = true OR 
        user_id = auth.uid()
    );

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

-- 読み取り: アクティブなイベントは誰でも、その他は作成者のみ
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

-- 初期統計データ
INSERT INTO dashboard_stats (
    total_members,
    monthly_events,
    matching_success,
    unread_messages,
    member_growth_percentage,
    event_increase,
    pending_invitations
) VALUES (
    1,  -- 現在1人（初期ユーザー）
    3,  -- 今月のイベント数
    0,  -- マッチング成功数
    0,  -- 未読メッセージ
    0.0,  -- 前月比成長率
    3,  -- イベント増加数
    0   -- 保留中の招待
) ON CONFLICT DO NOTHING;

-- サンプルイベントデータ
INSERT INTO events (
    title,
    description,
    event_date,
    time,
    location,
    max_participants,
    status
) VALUES 
(
    '経営戦略セミナー',
    'ビジネス戦略について学ぶセミナーです',
    CURRENT_DATE + INTERVAL '7 days',
    '14:00〜16:00',
    'オンライン開催',
    50,
    'active'
),
(
    '交流ランチ会',
    'メンバー同士の交流を深めるランチ会です',
    CURRENT_DATE + INTERVAL '10 days',
    '12:00〜14:00',
    '東京・丸の内',
    30,
    'active'
),
(
    '新規事業ピッチ大会',
    '新規事業のアイデアを競うピッチ大会です',
    CURRENT_DATE + INTERVAL '17 days',
    '18:00〜20:00',
    '大阪・梅田',
    100,
    'active'
) ON CONFLICT DO NOTHING;

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
-- 定期実行設定（コメント）
-- ===========================

-- 以下のコマンドでcronによる定期実行を設定可能（pg_cronが必要）
-- SELECT cron.schedule('refresh-dashboard-stats', '*/15 * * * *', 'SELECT refresh_dashboard_stats();');

-- ===========================
-- 便利なビュー作成
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
WHERE ua.is_public = true
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
GRANT SELECT ON recent_activities_with_users TO authenticated;
GRANT SELECT ON upcoming_events TO authenticated;

-- 統計更新関数の実行権限（管理者用）
GRANT EXECUTE ON FUNCTION refresh_dashboard_stats() TO authenticated;

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
END $$;