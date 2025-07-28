-- Sample Activities for Testing (Fixed)
-- テスト用のサンプルアクティビティデータ（修正版）

-- まず現在のユーザーIDを確認
SELECT id, email, name FROM profiles LIMIT 5;

-- 実際のユーザーIDを使用してアクティビティを挿入
-- 注意: 以下の 'YOUR_USER_ID' を実際のユーザーIDに置き換えてください

-- 例: もしあなたのユーザーIDが 'c0b97b9e-4c33-4cec-a393-5c2d20998cf9' の場合：
INSERT INTO user_activities (user_id, activity_type, activity_data, is_public, created_at)
VALUES 
    -- 今日のアクティビティ
    ('c0b97b9e-4c33-4cec-a393-5c2d20998cf9', 'user_registered', 
     '{"description": "さんがコミュニティに参加しました"}'::jsonb, 
     true, NOW() - INTERVAL '2 hours'),
    
    ('c0b97b9e-4c33-4cec-a393-5c2d20998cf9', 'event_joined', 
     '{"event_name": "月例ネットワーキング会", "event_id": "event-123"}'::jsonb, 
     true, NOW() - INTERVAL '5 hours'),
    
    -- 昨日のアクティビティ
    ('c0b97b9e-4c33-4cec-a393-5c2d20998cf9', 'matching_success', 
     '{"partner_name": "田中太郎", "partner_id": "user-456"}'::jsonb, 
     true, NOW() - INTERVAL '1 day'),
    
    ('c0b97b9e-4c33-4cec-a393-5c2d20998cf9', 'message_sent', 
     '{"recipient_name": "山田花子", "message_preview": "こんにちは、プロジェクトについて..."}'::jsonb, 
     false, NOW() - INTERVAL '1 day 3 hours'),
    
    -- 2日前
    ('c0b97b9e-4c33-4cec-a393-5c2d20998cf9', 'event_created', 
     '{"event_name": "AI技術交流会", "event_date": "2025-08-15"}'::jsonb, 
     true, NOW() - INTERVAL '2 days'),
    
    ('c0b97b9e-4c33-4cec-a393-5c2d20998cf9', 'profile_updated', 
     '{"fields_updated": ["bio", "skills"], "completion_rate": 85}'::jsonb, 
     true, NOW() - INTERVAL '2 days 4 hours'),
    
    -- 3日前
    ('c0b97b9e-4c33-4cec-a393-5c2d20998cf9', 'achievement_unlocked', 
     '{"achievement_name": "初めての参加", "achievement_icon": "fa-award"}'::jsonb, 
     true, NOW() - INTERVAL '3 days'),
    
    -- 5日前
    ('c0b97b9e-4c33-4cec-a393-5c2d20998cf9', 'event_completed', 
     '{"event_name": "新規事業セミナー", "participants": 45, "satisfaction": 4.8}'::jsonb, 
     true, NOW() - INTERVAL '5 days'),
    
    -- 1週間前
    ('c0b97b9e-4c33-4cec-a393-5c2d20998cf9', 'milestone_reached', 
     '{"milestone_description": "総メンバー数が1,000人を突破しました！", "milestone_type": "community"}'::jsonb, 
     true, NOW() - INTERVAL '7 days');

-- 複数ユーザーのアクティビティをシミュレート（他のユーザーIDがある場合）
-- 以下は profilesテーブルから自動的にユーザーを選択する方法
WITH random_users AS (
    SELECT id, name FROM profiles 
    WHERE id != 'c0b97b9e-4c33-4cec-a393-5c2d20998cf9'  -- 自分以外
    LIMIT 5
)
INSERT INTO user_activities (user_id, activity_type, activity_data, is_public, created_at)
SELECT 
    ru.id,
    CASE (random() * 4)::int
        WHEN 0 THEN 'user_registered'
        WHEN 1 THEN 'profile_updated'
        WHEN 2 THEN 'event_joined'
        WHEN 3 THEN 'matching_request'
        ELSE 'message_sent'
    END,
    jsonb_build_object(
        'description', 
        CASE (random() * 4)::int
            WHEN 0 THEN 'さんがコミュニティに参加しました'
            WHEN 1 THEN 'さんがプロフィールを更新しました'
            WHEN 2 THEN 'さんがイベントに参加登録しました'
            WHEN 3 THEN 'さんがマッチングリクエストを送信しました'
            ELSE 'さんがメッセージを送信しました'
        END,
        'user_name', ru.name
    ),
    true,
    NOW() - (random() * INTERVAL '10 days')
FROM random_users ru;

-- アクティビティの確認
SELECT 
    ua.id,
    ua.activity_type,
    ua.activity_data,
    ua.created_at,
    p.name as user_name
FROM user_activities ua
LEFT JOIN profiles p ON ua.user_id = p.id
WHERE ua.is_public = true
ORDER BY ua.created_at DESC
LIMIT 20;