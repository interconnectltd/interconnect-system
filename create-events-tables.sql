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
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX idx_event_participants_status ON event_participants(status);

-- RLS（Row Level Security）の有効化
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- eventsテーブルのRLSポリシー
-- 全員が公開イベントを閲覧可能
CREATE POLICY "Public events are viewable by everyone" 
    ON events FOR SELECT 
    USING (is_public = true AND is_cancelled = false);

-- 主催者は自分のイベントを全て操作可能
CREATE POLICY "Organizers can manage their own events" 
    ON events FOR ALL 
    USING (auth.uid() = organizer_id);

-- event_participantsテーブルのRLSポリシー
-- ユーザーは自分の参加情報を閲覧・管理可能
CREATE POLICY "Users can view their own participations" 
    ON event_participants FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can register for events" 
    ON event_participants FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participations" 
    ON event_participants FOR UPDATE 
    USING (auth.uid() = user_id);

-- 主催者は自分のイベントの参加者情報を閲覧可能
CREATE POLICY "Organizers can view participants" 
    ON event_participants FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_participants.event_id 
            AND events.organizer_id = auth.uid()
        )
    );

-- サンプルデータの挿入
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
),
(
    'マーケティング最新トレンド2024',
    'デジタルマーケティングの最新トレンドと実践的な活用方法を解説。SNSマーケティング、インフルエンサーマーケティングの成功事例も紹介。',
    'online',
    CURRENT_DATE + INTERVAL '10 days',
    '13:00',
    '15:00',
    'Microsoft Teams',
    200,
    1500,
    'マーケティング研究会',
    'セミナー',
    ARRAY['マーケティング', 'デジタルマーケティング', 'SNS', 'トレンド']
),
(
    '経営者向けリーダーシップ研修',
    '組織を成長させるリーダーシップスキルを実践的に学ぶワークショップ。グループディスカッションやロールプレイを通じて学びます。',
    'offline',
    CURRENT_DATE + INTERVAL '30 days',
    '09:00',
    '17:00',
    '品川プリンスホテル',
    30,
    15000,
    'ビジネスリーダー育成協会',
    'ワークショップ',
    ARRAY['リーダーシップ', '経営', '人材育成', 'マネジメント']
);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_participants_updated_at BEFORE UPDATE ON event_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();