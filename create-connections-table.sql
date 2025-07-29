-- connectionsテーブルの作成とRLSポリシー設定
-- ユーザー間のコネクション（つながり）を管理するテーブル

-- 1. connectionsテーブルの作成
CREATE TABLE IF NOT EXISTS connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connected_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 複合ユニーク制約（同じユーザーペアで重複申請を防ぐ）
    CONSTRAINT unique_connection UNIQUE (user_id, connected_user_id),
    -- 自分自身へのコネクションを防ぐ
    CONSTRAINT no_self_connection CHECK (user_id != connected_user_id)
);

-- 2. インデックスの作成（検索性能向上）
CREATE INDEX idx_connections_user_id ON connections(user_id);
CREATE INDEX idx_connections_connected_user_id ON connections(connected_user_id);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_connections_created_at ON connections(created_at DESC);

-- 3. updated_atの自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_connections_updated_at
    BEFORE UPDATE ON connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS（Row Level Security）を有効化
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- 5. RLSポリシーの設定

-- 自分が関係するコネクションのみ閲覧可能
CREATE POLICY "Users can view their own connections"
    ON connections FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id OR 
        auth.uid() = connected_user_id
    );

-- 自分からのコネクション申請のみ作成可能
CREATE POLICY "Users can create connection requests"
    ON connections FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 自分が受信したコネクション申請のステータスのみ更新可能
CREATE POLICY "Users can update received connection requests"
    ON connections FOR UPDATE
    TO authenticated
    USING (auth.uid() = connected_user_id)
    WITH CHECK (
        -- statusとmessageのみ更新可能
        auth.uid() = connected_user_id AND
        user_id = OLD.user_id AND
        connected_user_id = OLD.connected_user_id
    );

-- 自分が送信したpending状態のコネクション申請のみ削除可能
CREATE POLICY "Users can delete their pending requests"
    ON connections FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id AND 
        status = 'pending'
    );

-- 6. ヘルパー関数：相互コネクションの確認
CREATE OR REPLACE FUNCTION is_connected(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM connections
        WHERE status = 'accepted'
        AND (
            (user_id = user1_id AND connected_user_id = user2_id) OR
            (user_id = user2_id AND connected_user_id = user1_id)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. ビュー：アクティブなコネクション一覧
CREATE OR REPLACE VIEW active_connections AS
SELECT 
    CASE 
        WHEN c.user_id = auth.uid() THEN c.connected_user_id
        ELSE c.user_id
    END AS connected_user_id,
    c.status,
    c.created_at,
    c.updated_at,
    p.name AS connected_user_name,
    p.avatar_url AS connected_user_avatar,
    p.title AS connected_user_title,
    p.company AS connected_user_company
FROM connections c
JOIN profiles p ON p.id = CASE 
    WHEN c.user_id = auth.uid() THEN c.connected_user_id
    ELSE c.user_id
END
WHERE (c.user_id = auth.uid() OR c.connected_user_id = auth.uid())
AND c.status = 'accepted';

-- 8. 権限付与
GRANT SELECT, INSERT, UPDATE, DELETE ON connections TO authenticated;
GRANT SELECT ON active_connections TO authenticated;

-- 9. テストデータの挿入（オプション）
-- INSERT INTO connections (user_id, connected_user_id, status, message)
-- SELECT 
--     (SELECT id FROM auth.users LIMIT 1 OFFSET 0),
--     (SELECT id FROM auth.users LIMIT 1 OFFSET 1),
--     'accepted',
--     'Nice to connect with you!'
-- WHERE EXISTS (SELECT 1 FROM auth.users HAVING COUNT(*) >= 2);