-- イベント管理用の専用テーブルを作成
-- 既存のeventsテーブルは通知用なので、別名で作成

-- ========================================
-- 1. event_itemsテーブル（イベント管理用）
-- ========================================
CREATE TABLE IF NOT EXISTS event_items (
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

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_event_items_event_date ON event_items(event_date);
CREATE INDEX IF NOT EXISTS idx_event_items_organizer_id ON event_items(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_items_category ON event_items(category);
CREATE INDEX IF NOT EXISTS idx_event_items_is_public ON event_items(is_public);
CREATE INDEX IF NOT EXISTS idx_event_items_is_cancelled ON event_items(is_cancelled);

-- RLSの有効化
ALTER TABLE event_items ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Public events are viewable by everyone" 
    ON event_items FOR SELECT 
    USING (is_public = true AND is_cancelled = false);

CREATE POLICY "Organizers can manage their own events" 
    ON event_items FOR ALL 
    USING (auth.uid() = organizer_id);

-- ========================================
-- 2. event_participantsテーブルを更新（外部キーを修正）
-- ========================================
-- 既存のevent_participantsテーブルを削除して再作成
DROP TABLE IF EXISTS event_participants CASCADE;

CREATE TABLE event_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES event_items(id) ON DELETE CASCADE,
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
CREATE INDEX idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX idx_event_participants_status ON event_participants(status);

-- RLSの有効化
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
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
            SELECT 1 FROM event_items 
            WHERE event_items.id = event_participants.event_id 
            AND event_items.organizer_id = auth.uid()
        )
    );

-- ========================================
-- 3. activitiesテーブルを更新（外部キーを修正）
-- ========================================
ALTER TABLE activities 
DROP CONSTRAINT IF EXISTS activities_event_id_fkey;

ALTER TABLE activities 
ADD CONSTRAINT activities_event_id_fkey 
FOREIGN KEY (event_id) 
REFERENCES event_items(id) 
ON DELETE SET NULL;

-- ========================================
-- 4. 更新トリガー
-- ========================================
DROP TRIGGER IF EXISTS update_event_items_updated_at ON event_items;
CREATE TRIGGER update_event_items_updated_at BEFORE UPDATE ON event_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 5. サンプルイベントデータ
-- ========================================
INSERT INTO event_items (
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
    '最新のAI技術を活用した業務効率化の手法について、実例を交えながら解説します。',
    'online',
    CURRENT_DATE + INTERVAL '7 days',
    '14:00',
    '16:00',
    'Zoomウェビナー',
    50,
    0,
    'INTERCONNECT運営事務局',
    'セミナー',
    ARRAY['AI', 'DX', '業務効率化']
),
(
    'ビジネス交流会 in 東京',
    '異業種のビジネスパーソンが集まる交流会。新しいビジネスチャンスを見つけましょう。',
    'offline',
    CURRENT_DATE + INTERVAL '14 days',
    '18:30',
    '20:30',
    '東京都渋谷区渋谷2-24-12',
    80,
    3000,
    'INTERCONNECT運営事務局',
    '交流会',
    ARRAY['ネットワーキング', '異業種交流', '東京']
),
(
    'スタートアップピッチイベント',
    '注目のスタートアップ企業が登壇。投資家とのマッチング機会もあります。',
    'hybrid',
    CURRENT_DATE + INTERVAL '21 days',
    '10:00',
    '12:00',
    '六本木ヒルズ森タワー',
    100,
    0,
    'INTERCONNECT運営事務局',
    'ピッチイベント',
    ARRAY['スタートアップ', '投資', 'ピッチ']
);

-- ========================================
-- 実行完了
-- ========================================
-- event_itemsテーブルが作成されました。
-- JavaScriptでは'events'の代わりに'event_items'を使用してください。