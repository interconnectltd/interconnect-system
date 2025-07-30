-- 議事録専用テーブルの作成（オプション）
-- messagesテーブルでも管理可能ですが、議事録を別管理したい場合はこのテーブルを使用

CREATE TABLE IF NOT EXISTS meeting_minutes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    participants TEXT[],
    tags TEXT[],
    business_phase TEXT CHECK (business_phase IN ('seed', 'mvp', 'growth', 'mature')),
    is_urgent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX idx_meeting_minutes_user_id ON meeting_minutes(user_id);
CREATE INDEX idx_meeting_minutes_meeting_date ON meeting_minutes(meeting_date DESC);
CREATE INDEX idx_meeting_minutes_tags ON meeting_minutes USING GIN(tags);
CREATE INDEX idx_meeting_minutes_content ON meeting_minutes USING GIN(to_tsvector('japanese', content));

-- RLSポリシー
ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の議事録のみ表示・作成・更新・削除可能
CREATE POLICY "Users can view own meeting minutes" ON meeting_minutes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own meeting minutes" ON meeting_minutes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meeting minutes" ON meeting_minutes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meeting minutes" ON meeting_minutes
    FOR DELETE USING (auth.uid() = user_id);

-- 更新日時の自動更新
CREATE OR REPLACE FUNCTION update_meeting_minutes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_meeting_minutes_updated_at
    BEFORE UPDATE ON meeting_minutes
    FOR EACH ROW
    EXECUTE FUNCTION update_meeting_minutes_updated_at();