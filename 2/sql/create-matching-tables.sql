-- マッチングシステム用テーブル作成

-- 1. マッチング申請テーブル
CREATE TABLE IF NOT EXISTS match_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES auth.users(id) NOT NULL,
    recipient_id UUID REFERENCES auth.users(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(requester_id, recipient_id)
);

-- 2. マッチング履歴テーブル
CREATE TABLE IF NOT EXISTS match_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID REFERENCES auth.users(id) NOT NULL,
    user2_id UUID REFERENCES auth.users(id) NOT NULL,
    match_request_id UUID REFERENCES match_requests(id),
    match_score NUMERIC(3,2),
    match_reasons JSONB,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_connection UNIQUE(user1_id, user2_id),
    CONSTRAINT user_order CHECK (user1_id < user2_id)
);

-- 3. プロフィール閲覧履歴テーブル
CREATE TABLE IF NOT EXISTS profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_id UUID REFERENCES auth.users(id) NOT NULL,
    viewed_user_id UUID REFERENCES auth.users(id) NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    view_duration INTEGER, -- 秒単位
    source TEXT -- 'matching', 'search', 'direct' など
);

-- 4. ブックマークテーブル
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    bookmarked_user_id UUID REFERENCES auth.users(id) NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, bookmarked_user_id)
);

-- インデックスの作成
CREATE INDEX idx_match_requests_requester ON match_requests(requester_id);
CREATE INDEX idx_match_requests_recipient ON match_requests(recipient_id);
CREATE INDEX idx_match_requests_status ON match_requests(status);
CREATE INDEX idx_match_connections_users ON match_connections(user1_id, user2_id);
CREATE INDEX idx_profile_views_viewer ON profile_views(viewer_id);
CREATE INDEX idx_profile_views_viewed ON profile_views(viewed_user_id);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);

-- RLS (Row Level Security) の設定
ALTER TABLE match_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- match_requests のポリシー
CREATE POLICY "Users can view their own requests" ON match_requests
    FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create requests" ON match_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Recipients can update request status" ON match_requests
    FOR UPDATE USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);

-- match_connections のポリシー
CREATE POLICY "Users can view their connections" ON match_connections
    FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- profile_views のポリシー
CREATE POLICY "Users can create profile views" ON profile_views
    FOR INSERT WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Users can view who viewed their profile" ON profile_views
    FOR SELECT USING (auth.uid() = viewed_user_id);

-- bookmarks のポリシー
CREATE POLICY "Users can manage their bookmarks" ON bookmarks
    FOR ALL USING (auth.uid() = user_id);

-- トリガー関数：マッチング承認時に接続を作成
CREATE OR REPLACE FUNCTION create_match_connection()
RETURNS TRIGGER AS $$
BEGIN
    -- ステータスが accepted に変更された場合
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        -- user1_id < user2_id となるように並び替えて挿入
        INSERT INTO match_connections (
            user1_id,
            user2_id,
            match_request_id,
            connected_at
        ) VALUES (
            LEAST(NEW.requester_id, NEW.recipient_id),
            GREATEST(NEW.requester_id, NEW.recipient_id),
            NEW.id,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
CREATE TRIGGER trigger_create_match_connection
    AFTER UPDATE ON match_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_match_connection();

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_match_requests_updated_at
    BEFORE UPDATE ON match_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();