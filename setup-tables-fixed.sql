-- INTERCONNECT 不足しているテーブルのみ作成（修正版）
-- 既存のeventsテーブルにorganizer_idがない場合用

-- ========================================
-- 1. event_participantsテーブル（修正版）
-- ========================================
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
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_status ON event_participants(status);

-- RLSの有効化
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（organizer_idを使わない版）
CREATE POLICY "Users can view their own participations" 
    ON event_participants FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can register for events" 
    ON event_participants FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participations" 
    ON event_participants FOR UPDATE 
    USING (auth.uid() = user_id);

-- イベント作成者用のポリシーは削除（organizer_idがないため）

-- ========================================
-- 2. notificationsテーブル
-- ========================================
-- 注意: 既にnotificationsのような構造のテーブルが存在する可能性があります
-- その場合は、system_notificationsという名前で作成します

CREATE TABLE IF NOT EXISTS system_notifications (
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
CREATE INDEX IF NOT EXISTS idx_system_notifications_user_id ON system_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_system_notifications_read ON system_notifications(read);
CREATE INDEX IF NOT EXISTS idx_system_notifications_created_at ON system_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_notifications_type ON system_notifications(type);

-- RLSの有効化
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view their own notifications" 
    ON system_notifications FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
    ON system_notifications FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
    ON system_notifications FOR DELETE 
    USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
    ON system_notifications FOR INSERT 
    WITH CHECK (true);

-- ========================================
-- 3. activitiesテーブル
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

-- RLSの有効化
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

-- event_participantsテーブルのトリガー
DROP TRIGGER IF EXISTS update_event_participants_updated_at ON event_participants;
CREATE TRIGGER update_event_participants_updated_at BEFORE UPDATE ON event_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- system_notificationsテーブルのトリガー（特別版）
CREATE OR REPLACE FUNCTION update_system_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.read = true AND OLD.read = false THEN
        NEW.read_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_system_notifications_updated_at ON system_notifications;
CREATE TRIGGER update_system_notifications_updated_at 
    BEFORE UPDATE ON system_notifications
    FOR EACH ROW 
    EXECUTE FUNCTION update_system_notifications_updated_at();

-- ========================================
-- 5. リアルタイム通知の有効化
-- ========================================
-- Supabase Realtimeに必要なテーブルを追加
ALTER PUBLICATION supabase_realtime ADD TABLE system_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;

-- ========================================
-- 6. サンプルアクティビティデータ
-- ========================================
INSERT INTO activities (type, title, description) VALUES
('member_joined', '新しいメンバーが参加しました', 'コミュニティが成長しています'),
('event_completed', 'ネットワーキングイベントが終了', '多くの参加者で盛り上がりました'),
('matching_success', 'ビジネスマッチング成立', '新しいビジネスチャンスが生まれました');

-- ========================================
-- 実行完了メッセージ
-- ========================================
-- テーブルが正常に作成されました。
-- 注意: notificationsの代わりにsystem_notificationsテーブルを使用しています。