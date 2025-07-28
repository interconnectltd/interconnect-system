-- ===========================
-- INTERCONNECT Dashboard Tables Creation
-- Supabase SQL Editor で実行してください
-- ===========================

-- 1. dashboard_stats テーブル作成
CREATE TABLE IF NOT EXISTS dashboard_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_members INTEGER DEFAULT 0,
    monthly_events INTEGER DEFAULT 0,
    matching_success INTEGER DEFAULT 0,
    unread_messages INTEGER DEFAULT 0,
    member_growth_percentage DECIMAL(5,2) DEFAULT 0,
    event_increase INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. user_activities テーブル作成
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. events テーブル作成（既存の場合はスキップ）
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    time VARCHAR(100),
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. messages テーブル作成（既存の場合はスキップ）
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================
-- Row Level Security (RLS) 設定
-- ===========================

-- dashboard_stats の RLS
ALTER TABLE dashboard_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read dashboard_stats" ON dashboard_stats
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert dashboard_stats" ON dashboard_stats
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update dashboard_stats" ON dashboard_stats
    FOR UPDATE USING (auth.role() = 'authenticated');

-- user_activities の RLS
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read public activities" ON user_activities
    FOR SELECT USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Allow users to insert own activities" ON user_activities
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- events の RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read events" ON events
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create events" ON events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- messages の RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read own messages" ON messages
    FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Allow users to send messages" ON messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

-- ===========================
-- 初期データ挿入
-- ===========================

-- dashboard_stats の初期データ
INSERT INTO dashboard_stats (
    total_members,
    monthly_events,
    matching_success,
    unread_messages,
    member_growth_percentage,
    event_increase
) VALUES (
    1,  -- 現在のユーザー数に応じて調整
    0,
    0,
    0,
    0.0,
    0
) ON CONFLICT DO NOTHING;

-- ===========================
-- 更新用トリガー
-- ===========================

-- updated_at 自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- dashboard_stats の updated_at トリガー
CREATE TRIGGER update_dashboard_stats_updated_at BEFORE UPDATE ON dashboard_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- events の updated_at トリガー
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();