-- テスト用の会話データとユーザー興味関心データを生成
-- 実際の実装では、messagesテーブルから移行または自然言語処理で生成

-- サンプルユーザーのID（実際のIDに置き換えてください）
-- user1: c0b97b9e-4c33-4cec-a393-5c2d20998cf9
-- user2: 6d92318e-f64c-462a-b917-e0be21d98240
-- user3: 549456df-9657-4bde-9e3b-2cbb1bfaea64

-- 1. コミュニケーションスタイルデータを挿入
INSERT INTO communication_styles (user_id, avg_message_length, avg_response_time, emoji_usage_rate, active_hours, message_count)
VALUES 
    ('6d92318e-f64c-462a-b917-e0be21d98240', 85.5, 300, 0.15, 
     '{"9": 0.15, "10": 0.20, "11": 0.18, "12": 0.10, "13": 0.12, "14": 0.15, "15": 0.18, "16": 0.20, "17": 0.15, "18": 0.10, "19": 0.08, "20": 0.05}',
     150),
    ('549456df-9657-4bde-9e3b-2cbb1bfaea64', 120.3, 180, 0.25,
     '{"8": 0.10, "9": 0.18, "10": 0.22, "11": 0.20, "12": 0.08, "13": 0.10, "14": 0.18, "15": 0.20, "16": 0.18, "17": 0.15, "18": 0.12, "19": 0.10, "20": 0.08, "21": 0.05}',
     200)
ON CONFLICT (user_id) DO UPDATE
SET 
    avg_message_length = EXCLUDED.avg_message_length,
    avg_response_time = EXCLUDED.avg_response_time,
    emoji_usage_rate = EXCLUDED.emoji_usage_rate,
    active_hours = EXCLUDED.active_hours,
    message_count = EXCLUDED.message_count,
    updated_at = now();

-- 2. ユーザー興味関心データを挿入
INSERT INTO user_interests (user_id, topic, score, frequency)
VALUES
    -- User 2の興味関心
    ('6d92318e-f64c-462a-b917-e0be21d98240', 'AI', 0.9, 45),
    ('6d92318e-f64c-462a-b917-e0be21d98240', 'スタートアップ', 0.85, 38),
    ('6d92318e-f64c-462a-b917-e0be21d98240', 'ビジネス戦略', 0.75, 30),
    ('6d92318e-f64c-462a-b917-e0be21d98240', 'テクノロジー', 0.8, 35),
    ('6d92318e-f64c-462a-b917-e0be21d98240', '投資', 0.6, 20),
    ('6d92318e-f64c-462a-b917-e0be21d98240', 'マーケティング', 0.7, 25),
    ('6d92318e-f64c-462a-b917-e0be21d98240', 'DX', 0.65, 22),
    
    -- User 3の興味関心
    ('549456df-9657-4bde-9e3b-2cbb1bfaea64', 'AI', 0.75, 30),
    ('549456df-9657-4bde-9e3b-2cbb1bfaea64', 'デザイン', 0.9, 42),
    ('549456df-9657-4bde-9e3b-2cbb1bfaea64', 'UX', 0.85, 35),
    ('549456df-9657-4bde-9e3b-2cbb1bfaea64', 'スタートアップ', 0.7, 28),
    ('549456df-9657-4bde-9e3b-2cbb1bfaea64', 'プロダクト開発', 0.8, 32),
    ('549456df-9657-4bde-9e3b-2cbb1bfaea64', 'マーケティング', 0.65, 22),
    ('549456df-9657-4bde-9e3b-2cbb1bfaea64', 'ブランディング', 0.75, 30)
ON CONFLICT (user_id, topic) DO UPDATE
SET 
    score = GREATEST(user_interests.score, EXCLUDED.score),
    frequency = user_interests.frequency + EXCLUDED.frequency,
    updated_at = now();

-- 3. 会話履歴サンプルデータ（任意）
-- 実際の実装では messagesテーブルから移行
INSERT INTO conversations (user_id, partner_id, message, sentiment, topics, word_count, emoji_count)
VALUES
    -- ポジティブな会話の例
    ('c0b97b9e-4c33-4cec-a393-5c2d20998cf9', '6d92318e-f64c-462a-b917-e0be21d98240',
     '最近AIを使った新しいプロジェクトを始めました！スタートアップの文化って本当に刺激的ですね😊',
     0.8, ARRAY['AI', 'スタートアップ'], 20, 1),
    
    ('6d92318e-f64c-462a-b917-e0be21d98240', 'c0b97b9e-4c33-4cec-a393-5c2d20998cf9',
     'それは素晴らしいですね！私もAIを活用したビジネス戦略に興味があります。詳しく聞かせてください！',
     0.75, ARRAY['AI', 'ビジネス戦略'], 25, 0),
    
    -- 共通の興味を持つ会話
    ('c0b97b9e-4c33-4cec-a393-5c2d20998cf9', '549456df-9657-4bde-9e3b-2cbb1bfaea64',
     'UXデザインとAIの融合について考えているんですが、何か良いアイデアありますか？',
     0.6, ARRAY['UX', 'デザイン', 'AI'], 18, 0),
    
    ('549456df-9657-4bde-9e3b-2cbb1bfaea64', 'c0b97b9e-4c33-4cec-a393-5c2d20998cf9',
     'AIを使ってユーザーの行動を予測し、パーソナライズされたUXを提供するのはどうでしょう？🎨',
     0.7, ARRAY['AI', 'UX', 'パーソナライズ'], 22, 1);

-- 4. マッチングスコアの事前計算（オプション）
-- 実際の運用では、定期的なバッチ処理またはリアルタイムで計算
INSERT INTO matching_scores_cache (user_id, target_user_id, total_score, score_breakdown)
VALUES
    ('c0b97b9e-4c33-4cec-a393-5c2d20998cf9', '6d92318e-f64c-462a-b917-e0be21d98240', 85,
     '{"commonTopics": 80, "communicationStyle": 75, "emotionalSync": 85, "activityOverlap": 90, "profileMatch": 95}'),
    
    ('c0b97b9e-4c33-4cec-a393-5c2d20998cf9', '549456df-9657-4bde-9e3b-2cbb1bfaea64', 78,
     '{"commonTopics": 65, "communicationStyle": 70, "emotionalSync": 80, "activityOverlap": 85, "profileMatch": 90}')
ON CONFLICT (user_id, target_user_id) DO UPDATE
SET 
    total_score = EXCLUDED.total_score,
    score_breakdown = EXCLUDED.score_breakdown,
    calculated_at = now(),
    expires_at = now() + INTERVAL '7 days';

-- 5. 統計情報の確認
SELECT 
    'user_interests' as table_name, 
    COUNT(*) as record_count 
FROM user_interests
UNION ALL
SELECT 
    'communication_styles', 
    COUNT(*) 
FROM communication_styles
UNION ALL
SELECT 
    'conversations', 
    COUNT(*) 
FROM conversations
UNION ALL
SELECT 
    'matching_scores_cache', 
    COUNT(*) 
FROM matching_scores_cache;