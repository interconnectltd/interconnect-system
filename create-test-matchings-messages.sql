-- マッチングとメッセージのテストデータ作成

-- matchingsテーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS matchings (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user1_id UUID REFERENCES auth.users(id),
    user2_id UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'pending',
    match_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- messagesテーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id),
    recipient_id UUID REFERENCES auth.users(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_matchings_status ON matchings(status);
CREATE INDEX IF NOT EXISTS idx_matchings_created_at ON matchings(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- RLS（Row Level Security）の有効化
ALTER TABLE matchings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- マッチングのRLSポリシー
CREATE POLICY "Users can view their own matchings" ON matchings
    FOR SELECT
    USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- メッセージのRLSポリシー
CREATE POLICY "Users can view their own messages" ON messages
    FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages" ON messages
    FOR UPDATE
    USING (auth.uid() = recipient_id);

-- テストデータの挿入
DO $$
DECLARE
    user_id UUID;
    other_user_id UUID;
    i INTEGER;
BEGIN
    -- 最初のユーザーIDを取得
    SELECT id INTO user_id FROM auth.users LIMIT 1;
    
    -- 存在しない場合はサンプルUUIDを使用
    IF user_id IS NULL THEN
        user_id := 'c0b97b9e-4c33-4cec-a393-5c2d20998cf9'::UUID;
    END IF;
    
    -- 別のユーザーIDを生成
    other_user_id := gen_random_uuid();

    -- 今月のマッチングデータ（15件）
    FOR i IN 1..15 LOOP
        INSERT INTO matchings (user1_id, user2_id, status, match_score, created_at)
        VALUES (
            user_id,
            gen_random_uuid(),
            'success',
            0.75 + random() * 0.25,
            CURRENT_DATE - INTERVAL '1 day' * (random() * 28)::INTEGER
        );
    END LOOP;

    -- 先月のマッチングデータ（12件）
    FOR i IN 1..12 LOOP
        INSERT INTO matchings (user1_id, user2_id, status, match_score, created_at)
        VALUES (
            user_id,
            gen_random_uuid(),
            'success',
            0.70 + random() * 0.30,
            CURRENT_DATE - INTERVAL '1 month' - INTERVAL '1 day' * (random() * 28)::INTEGER
        );
    END LOOP;

    -- 保留中のマッチング（3件）
    FOR i IN 1..3 LOOP
        INSERT INTO matchings (user1_id, user2_id, status, match_score, created_at)
        VALUES (
            user_id,
            gen_random_uuid(),
            'pending',
            0.60 + random() * 0.40,
            CURRENT_DATE - INTERVAL '1 day' * (random() * 7)::INTEGER
        );
    END LOOP;

    -- 未読メッセージ（現在のユーザー宛）
    FOR i IN 1..8 LOOP
        INSERT INTO messages (sender_id, recipient_id, content, is_read, created_at)
        VALUES (
            gen_random_uuid(),
            user_id,
            'テストメッセージ ' || i || ': ご連絡ありがとうございます。',
            FALSE,
            CURRENT_TIMESTAMP - INTERVAL '1 hour' * (random() * 48)::INTEGER
        );
    END LOOP;

    -- 既読メッセージ（現在のユーザー宛）
    FOR i IN 1..15 LOOP
        INSERT INTO messages (sender_id, recipient_id, content, is_read, read_at, created_at)
        VALUES (
            gen_random_uuid(),
            user_id,
            '既読メッセージ ' || i || ': お世話になっております。',
            TRUE,
            CURRENT_TIMESTAMP - INTERVAL '1 day' * (random() * 7)::INTEGER,
            CURRENT_TIMESTAMP - INTERVAL '1 day' * (random() * 14)::INTEGER
        );
    END LOOP;

    -- 送信メッセージ（現在のユーザーから）
    FOR i IN 1..10 LOOP
        INSERT INTO messages (sender_id, recipient_id, content, is_read, created_at)
        VALUES (
            user_id,
            gen_random_uuid(),
            '送信メッセージ ' || i || ': よろしくお願いいたします。',
            CASE WHEN random() > 0.5 THEN TRUE ELSE FALSE END,
            CURRENT_TIMESTAMP - INTERVAL '1 day' * (random() * 7)::INTEGER
        );
    END LOOP;

END $$;

-- 統計を確認
SELECT 
    '今月のマッチング' as stat_type,
    COUNT(*) as count
FROM matchings
WHERE status = 'success'
  AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
  AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
UNION ALL
SELECT 
    '先月のマッチング',
    COUNT(*)
FROM matchings
WHERE status = 'success'
  AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  AND created_at < DATE_TRUNC('month', CURRENT_DATE)
UNION ALL
SELECT 
    '総マッチング成功数',
    COUNT(*)
FROM matchings
WHERE status = 'success'
UNION ALL
SELECT 
    '未読メッセージ数',
    COUNT(*)
FROM messages
WHERE is_read = FALSE
  AND recipient_id = (SELECT id FROM auth.users LIMIT 1);