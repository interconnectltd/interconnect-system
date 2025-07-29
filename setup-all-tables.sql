-- INTERCONNECT データベースセットアップ
-- このファイルをSupabaseのSQL Editorで実行してください

-- ========================================
-- 1. イベントテーブル
-- ========================================

-- イベントテーブルの作成
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) CHECK (event_type IN ('online', 'offline', 'hybrid')) DEFAULT 'online',
    event_date TIMESTAMPTZ NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location TEXT,
    online_url TEXT,
    max_participants INTEGER,
    price INTEGER DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'JPY',
    organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organizer_name VARCHAR(255),
    category VARCHAR(100),
    tags TEXT[],
    requirements TEXT,
    agenda TEXT,
    image_url TEXT,
    is_public BOOLEAN DEFAULT true,
    is_cancelled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- イベント参加者テーブル
CREATE TABLE IF NOT EXISTS event_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(50) CHECK (status IN ('registered', 'confirmed', 'cancelled', 'waitlist')) DEFAULT 'registered',
    registration_date TIMESTAMPTZ DEFAULT NOW(),
    attendance_confirmed BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_status ON event_participants(status);

-- RLS（Row Level Security）の有効化
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- eventsテーブルのRLSポリシー
CREATE POLICY "Public events are viewable by everyone" 
    ON events FOR SELECT 
    USING (is_public = true AND is_cancelled = false);

CREATE POLICY "Organizers can manage their own events" 
    ON events FOR ALL 
    USING (auth.uid() = organizer_id);

-- event_participantsテーブルのRLSポリシー
CREATE POLICY "Users can view their own participations" 
    ON event_participants FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can register for events" 
    ON event_participants FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participations" 
    ON event_participants FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Organizers can view participants" 
    ON event_participants FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_participants.event_id 
            AND events.organizer_id = auth.uid()
        )
    );

-- ========================================
-- 2. 通知テーブル
-- ========================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'message',
        'connection_request',
        'connection_accepted',
        'event_reminder',
        'event_cancelled',
        'event_updated',
        'system',
        'announcement'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- RLS（Row Level Security）の有効化
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view their own notifications" 
    ON notifications FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
    ON notifications FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
    ON notifications FOR DELETE 
    USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
    ON notifications FOR INSERT 
    WITH CHECK (true);

-- ========================================
-- 3. アクティビティテーブル（新規追加）
-- ========================================

CREATE TABLE IF NOT EXISTS activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'member_joined',
        'event_completed', 
        'matching_success',
        'message_sent',
        'connection_made',
        'profile_updated',
        'event_created'
    )),
    title TEXT NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);

-- RLS（Row Level Security）の有効化
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- 公開アクティビティは全員が閲覧可能
CREATE POLICY "Public activities are viewable by everyone" 
    ON activities FOR SELECT 
    USING (true);

-- ========================================
-- 4. 更新日時の自動更新トリガー
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- eventsテーブルのトリガー
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- event_participantsテーブルのトリガー
DROP TRIGGER IF EXISTS update_event_participants_updated_at ON event_participants;
CREATE TRIGGER update_event_participants_updated_at BEFORE UPDATE ON event_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- notificationsテーブルのトリガー（特別版）
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.read = true AND OLD.read = false THEN
        NEW.read_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications
    FOR EACH ROW 
    EXECUTE FUNCTION update_notifications_updated_at();

-- ========================================
-- 5. リアルタイム通知の有効化
-- ========================================

-- Supabase Realtimeに必要なテーブルを追加
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;

-- ========================================
-- 6. サンプルデータの挿入
-- ========================================

-- 注意: 以下のサンプルデータは開発環境でのみ実行してください

-- サンプルイベントデータ
INSERT INTO events (
    title, 
    description, 
    event_type, 
    event_date, 
    start_time, 
    end_time, 
    location, 
    max_participants, 
    price, 
    organizer_name, 
    category, 
    tags
) VALUES 
(
    'DX推進セミナー：AIを活用した業務効率化',
    '最新のAI技術を活用した業務効率化の手法について、実例を交えながら解説します。ChatGPTやClaude等の生成AIを業務に活用する具体的な方法を学べます。',
    'online',
    CURRENT_DATE + INTERVAL '7 days',
    '14:00',
    '16:00',
    'Zoomウェビナー',
    50,
    0,
    'INTERCONNECT運営事務局',
    'セミナー',
    ARRAY['AI', 'DX', '業務効率化', '生成AI']
),
(
    'ビジネス交流会 in 東京',
    '異業種のビジネスパーソンが集まる交流会。新しいビジネスチャンスを見つけましょう。名刺交換、フリートークの時間を設けています。',
    'offline',
    CURRENT_DATE + INTERVAL '14 days',
    '18:30',
    '20:30',
    '東京都渋谷区渋谷2-24-12 渋谷スクランブルスクエア 39F',
    80,
    3000,
    'INTERCONNECT運営事務局',
    '交流会',
    ARRAY['ネットワーキング', '異業種交流', '東京']
),
(
    'スタートアップピッチイベント',
    '注目のスタートアップ企業が登壇。投資家とのマッチング機会もあります。5社のスタートアップが各社10分間のピッチを行います。',
    'hybrid',
    CURRENT_DATE + INTERVAL '21 days',
    '10:00',
    '12:00',
    '六本木ヒルズ森タワー + オンライン配信',
    100,
    0,
    'INTERCONNECT運営事務局',
    'ピッチイベント',
    ARRAY['スタートアップ', '投資', 'ピッチ', 'ベンチャー']
);

-- ========================================
-- 7. 統計ビューの作成（グラフ用）
-- ========================================

-- メンバー成長統計ビュー
CREATE OR REPLACE VIEW member_growth_stats AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as new_members,
    SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('day', created_at)) as total_members
FROM user_profiles
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date;

-- イベント統計ビュー
CREATE OR REPLACE VIEW event_stats AS
SELECT 
    DATE_TRUNC('week', event_date) as week,
    event_type,
    COUNT(*) as event_count,
    SUM(COALESCE(max_participants, 0)) as total_capacity
FROM events
WHERE is_cancelled = false
GROUP BY DATE_TRUNC('week', event_date), event_type
ORDER BY week, event_type;

-- 業界別分布ビュー
CREATE OR REPLACE VIEW industry_distribution AS
SELECT 
    industry,
    COUNT(*) as member_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM user_profiles
WHERE industry IS NOT NULL
GROUP BY industry
ORDER BY member_count DESC;

-- ========================================
-- 8. 権限の確認
-- ========================================

-- 現在のユーザーが持つ権限を確認
-- SELECT * FROM information_schema.table_privileges WHERE grantee = current_user;

-- ========================================
-- 実行完了メッセージ
-- ========================================
-- すべてのテーブルとビューが正常に作成されました。
-- Supabaseダッシュボードでテーブルを確認してください。