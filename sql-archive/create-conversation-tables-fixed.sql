-- 会話データと分析用テーブルの作成（修正版）

-- 1. 会話履歴テーブル
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    sentiment FLOAT,
    topics TEXT[],
    word_count INT,
    emoji_count INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックスを個別に作成
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_partner_id ON conversations(partner_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);

-- 2. ユーザー興味関心テーブル
CREATE TABLE IF NOT EXISTS user_interests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic VARCHAR(100) NOT NULL,
    score FLOAT DEFAULT 0,
    frequency INT DEFAULT 1,
    last_mentioned TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_user_topic UNIQUE (user_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_score ON user_interests(score DESC);

-- 3. コミュニケーションスタイル統計テーブル
CREATE TABLE IF NOT EXISTS communication_styles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    avg_message_length FLOAT,
    avg_response_time INT,
    emoji_usage_rate FLOAT,
    active_hours JSONB,
    message_count INT DEFAULT 0,
    last_active_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. マッチングスコアキャッシュテーブル
CREATE TABLE IF NOT EXISTS matching_scores_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_score INT NOT NULL,
    score_breakdown JSONB,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days'),
    CONSTRAINT unique_user_pair UNIQUE (user_id, target_user_id)
);

CREATE INDEX IF NOT EXISTS idx_matching_scores_user_id ON matching_scores_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_matching_scores_expires_at ON matching_scores_cache(expires_at);

-- RLSポリシー設定
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_scores_cache ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成（既存の場合はスキップ）
DO $$ 
BEGIN
    -- conversations policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can view their own conversations') THEN
        CREATE POLICY "Users can view their own conversations" ON conversations
            FOR SELECT USING (auth.uid() = user_id OR auth.uid() = partner_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can insert their own conversations') THEN
        CREATE POLICY "Users can insert their own conversations" ON conversations
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    -- user_interests policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_interests' AND policyname = 'Users can view all interests') THEN
        CREATE POLICY "Users can view all interests" ON user_interests
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_interests' AND policyname = 'Users can manage their own interests') THEN
        CREATE POLICY "Users can manage their own interests" ON user_interests
            FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    -- communication_styles policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'communication_styles' AND policyname = 'Users can view all communication styles') THEN
        CREATE POLICY "Users can view all communication styles" ON communication_styles
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'communication_styles' AND policyname = 'Users can update their own style') THEN
        CREATE POLICY "Users can update their own style" ON communication_styles
            FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    -- matching_scores_cache policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matching_scores_cache' AND policyname = 'Users can view their own scores') THEN
        CREATE POLICY "Users can view their own scores" ON matching_scores_cache
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- ストアドプロシージャ：コミュニケーションスタイルを取得
CREATE OR REPLACE FUNCTION get_communication_style(target_user_id UUID)
RETURNS TABLE (
    avg_length FLOAT,
    response_time INT,
    emoji_rate FLOAT,
    activity_pattern JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        avg_message_length,
        avg_response_time,
        emoji_usage_rate,
        active_hours
    FROM communication_styles
    WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- ストアドプロシージャ：活動パターンを取得（完全版）
CREATE OR REPLACE FUNCTION get_activity_pattern(target_user_id UUID)
RETURNS TABLE (activity_hours JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT active_hours
    FROM communication_styles
    WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- トリガー：会話から興味関心を自動更新
CREATE OR REPLACE FUNCTION update_user_interests_from_conversation()
RETURNS TRIGGER AS $$
BEGIN
    -- トピックごとに興味関心を更新
    IF NEW.topics IS NOT NULL AND array_length(NEW.topics, 1) > 0 THEN
        INSERT INTO user_interests (user_id, topic, score, frequency)
        SELECT 
            NEW.user_id,
            unnest(NEW.topics),
            0.5,
            1
        ON CONFLICT (user_id, topic) 
        DO UPDATE SET
            frequency = user_interests.frequency + 1,
            score = LEAST(user_interests.score + 0.1, 1.0),
            last_mentioned = now(),
            updated_at = now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成（既存の場合は削除して再作成）
DROP TRIGGER IF EXISTS trigger_update_interests ON conversations;
CREATE TRIGGER trigger_update_interests
    AFTER INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_user_interests_from_conversation();

-- 既存のmessagesテーブルからデータを移行する関数
CREATE OR REPLACE FUNCTION migrate_messages_to_conversations()
RETURNS void AS $$
DECLARE
    msg RECORD;
    topics_array TEXT[];
    sentiment_score FLOAT;
    emoji_cnt INT;
BEGIN
    FOR msg IN 
        SELECT id, sender_id, receiver_id, content, created_at 
        FROM messages 
        WHERE content IS NOT NULL AND content != ''
    LOOP
        -- 簡易的な感情分析（実際の実装では外部APIを使用）
        sentiment_score := CASE 
            WHEN msg.content LIKE '%ありがとう%' OR msg.content LIKE '%嬉しい%' OR msg.content LIKE '%😊%' OR msg.content LIKE '%😄%' THEN 0.8
            WHEN msg.content LIKE '%すみません%' OR msg.content LIKE '%😢%' OR msg.content LIKE '%😞%' THEN -0.3
            ELSE 0.0
        END;
        
        -- 絵文字カウント
        emoji_cnt := array_length(
            string_to_array(
                regexp_replace(msg.content, '[^😀-🙏🌀-🗿🚀-🛿☀-⛿✀-➿]', '', 'g'),
                ''
            ), 1
        ) - 1;
        IF emoji_cnt IS NULL THEN emoji_cnt := 0; END IF;
        
        -- 簡易的な話題抽出（実際の実装では形態素解析を使用）
        topics_array := ARRAY[]::TEXT[];
        IF msg.content LIKE '%AI%' OR msg.content LIKE '%人工知能%' THEN
            topics_array := array_append(topics_array, 'AI');
        END IF;
        IF msg.content LIKE '%スタートアップ%' OR msg.content LIKE '%起業%' THEN
            topics_array := array_append(topics_array, 'スタートアップ');
        END IF;
        IF msg.content LIKE '%投資%' OR msg.content LIKE '%ファンディング%' THEN
            topics_array := array_append(topics_array, '投資');
        END IF;
        IF msg.content LIKE '%マーケティング%' OR msg.content LIKE '%マーケ%' THEN
            topics_array := array_append(topics_array, 'マーケティング');
        END IF;
        IF msg.content LIKE '%デザイン%' OR msg.content LIKE '%UI%' OR msg.content LIKE '%UX%' THEN
            topics_array := array_append(topics_array, 'デザイン');
        END IF;
        
        -- conversations テーブルに挿入
        INSERT INTO conversations (
            user_id, partner_id, message, sentiment, topics, 
            word_count, emoji_count, created_at
        ) VALUES (
            msg.sender_id,
            msg.receiver_id,
            msg.content,
            sentiment_score,
            topics_array,
            array_length(string_to_array(msg.content, ' '), 1),
            emoji_cnt,
            msg.created_at
        ) ON CONFLICT DO NOTHING;
    END LOOP;
    
    -- コミュニケーションスタイルの集計を更新
    PERFORM update_communication_styles();
END;
$$ LANGUAGE plpgsql;

-- コミュニケーションスタイルを更新する関数
CREATE OR REPLACE FUNCTION update_communication_styles()
RETURNS void AS $$
BEGIN
    INSERT INTO communication_styles (
        user_id,
        avg_message_length,
        avg_response_time,
        emoji_usage_rate,
        active_hours,
        message_count,
        last_active_at
    )
    SELECT 
        c.user_id,
        AVG(c.word_count)::FLOAT,
        300, -- デフォルト値（実際の実装では計算）
        AVG(CASE WHEN c.emoji_count > 0 THEN 1.0 ELSE 0.0 END)::FLOAT,
        jsonb_object_agg(
            EXTRACT(HOUR FROM c.created_at)::TEXT,
            count_by_hour.cnt::FLOAT / total.total_cnt::FLOAT
        ),
        COUNT(*)::INT,
        MAX(c.created_at)
    FROM conversations c
    CROSS JOIN LATERAL (
        SELECT COUNT(*) as total_cnt
        FROM conversations
        WHERE user_id = c.user_id
    ) total
    CROSS JOIN LATERAL (
        SELECT 
            EXTRACT(HOUR FROM created_at) as hour,
            COUNT(*) as cnt
        FROM conversations
        WHERE user_id = c.user_id
        GROUP BY EXTRACT(HOUR FROM created_at)
    ) count_by_hour
    GROUP BY c.user_id, total.total_cnt
    ON CONFLICT (user_id) DO UPDATE SET
        avg_message_length = EXCLUDED.avg_message_length,
        emoji_usage_rate = EXCLUDED.emoji_usage_rate,
        active_hours = EXCLUDED.active_hours,
        message_count = EXCLUDED.message_count,
        last_active_at = EXCLUDED.last_active_at,
        updated_at = now();
END;
$$ LANGUAGE plpgsql;