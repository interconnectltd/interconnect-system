-- 会話データと分析用テーブルの作成

-- 1. 会話履歴テーブル
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- text, image, file, etc
    sentiment FLOAT, -- -1.0 (negative) to 1.0 (positive)
    topics TEXT[], -- 話題のタグ配列
    word_count INT,
    emoji_count INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- インデックス
    INDEX idx_conversations_user_id (user_id),
    INDEX idx_conversations_partner_id (partner_id),
    INDEX idx_conversations_created_at (created_at)
);

-- 2. ユーザー興味関心テーブル
CREATE TABLE IF NOT EXISTS user_interests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic VARCHAR(100) NOT NULL,
    score FLOAT DEFAULT 0, -- 関心度スコア (0-1)
    frequency INT DEFAULT 1, -- 言及回数
    last_mentioned TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- ユニーク制約
    CONSTRAINT unique_user_topic UNIQUE (user_id, topic),
    
    -- インデックス
    INDEX idx_user_interests_user_id (user_id),
    INDEX idx_user_interests_score (score DESC)
);

-- 3. コミュニケーションスタイル統計テーブル
CREATE TABLE IF NOT EXISTS communication_styles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    avg_message_length FLOAT,
    avg_response_time INT, -- 秒単位
    emoji_usage_rate FLOAT, -- 0-1
    active_hours JSONB, -- {"0": 0.1, "1": 0.05, ... "23": 0.2}
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
    score_breakdown JSONB, -- 詳細スコア
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days'),
    
    -- ユニーク制約
    CONSTRAINT unique_user_pair UNIQUE (user_id, target_user_id),
    
    -- インデックス
    INDEX idx_matching_scores_user_id (user_id),
    INDEX idx_matching_scores_expires_at (expires_at)
);

-- RLSポリシー設定
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_scores_cache ENABLE ROW LEVEL SECURITY;

-- conversationsのRLSポリシー
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can insert their own conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_interestsのRLSポリシー
CREATE POLICY "Users can view all interests" ON user_interests
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own interests" ON user_interests
    FOR ALL USING (auth.uid() = user_id);

-- communication_stylesのRLSポリシー
CREATE POLICY "Users can view all communication styles" ON communication_styles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own style" ON communication_styles
    FOR ALL USING (auth.uid() = user_id);

-- matching_scores_cacheのRLSポリシー
CREATE POLICY "Users can view their own scores" ON matching_scores_cache
    FOR SELECT USING (auth.uid() = user_id);

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

-- ストアドプロシージャ：活動パターンを取得
CREATE OR REPLACE FUNCTION get_activity_pattern(target_user_id UUID)
RETURNS TABLE (
    hour_0 FLOAT, hour_1 FLOAT, hour_2 FLOAT, hour_3 FLOAT,
    hour_4 FLOAT, hour_5 FLOAT, hour_6 FLOAT, hour_7 FLOAT,
    hour_8 FLOAT, hour_9 FLOAT, hour_10 FLOAT, hour_11 FLOAT,
    hour_12 FLOAT, hour_13 FLOAT, hour_14 FLOAT, hour_15 FLOAT,
    hour_16 FLOAT, hour_17 FLOAT, hour_18 FLOAT, hour_19 FLOAT,
    hour_20 FLOAT, hour_21 FLOAT, hour_22 FLOAT, hour_23 FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (active_hours->>'0')::FLOAT,
        (active_hours->>'1')::FLOAT,
        (active_hours->>'2')::FLOAT,
        -- ... 省略 ...
        (active_hours->>'23')::FLOAT
    FROM communication_styles
    WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- トリガー：会話から興味関心を自動更新
CREATE OR REPLACE FUNCTION update_user_interests_from_conversation()
RETURNS TRIGGER AS $$
BEGIN
    -- トピックごとに興味関心を更新
    IF NEW.topics IS NOT NULL THEN
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

CREATE TRIGGER trigger_update_interests
    AFTER INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_user_interests_from_conversation();