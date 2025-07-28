-- Sample Activities for Testing
-- テスト用のサンプルアクティビティデータ

-- 注意: user_idは実際のauth.usersテーブルのIDに置き換えてください

-- 過去7日間のアクティビティを生成
INSERT INTO user_activities (user_id, activity_type, activity_data, is_public, created_at)
VALUES 
    -- 今日のアクティビティ
    (auth.uid(), 'user_registered', 
     '{"description": "さんがコミュニティに参加しました"}'::jsonb, 
     true, NOW() - INTERVAL '2 hours'),
    
    (auth.uid(), 'event_joined', 
     '{"event_name": "月例ネットワーキング会", "event_id": "event-123"}'::jsonb, 
     true, NOW() - INTERVAL '5 hours'),
    
    -- 昨日のアクティビティ
    (auth.uid(), 'matching_success', 
     '{"partner_name": "田中太郎", "partner_id": "user-456"}'::jsonb, 
     true, NOW() - INTERVAL '1 day'),
    
    (auth.uid(), 'message_sent', 
     '{"recipient_name": "山田花子", "message_preview": "こんにちは、プロジェクトについて..."}'::jsonb, 
     false, NOW() - INTERVAL '1 day 3 hours'),
    
    -- 2日前
    (auth.uid(), 'event_created', 
     '{"event_name": "AI技術交流会", "event_date": "2025-08-15"}'::jsonb, 
     true, NOW() - INTERVAL '2 days'),
    
    (auth.uid(), 'profile_updated', 
     '{"fields_updated": ["bio", "skills"], "completion_rate": 85}'::jsonb, 
     true, NOW() - INTERVAL '2 days 4 hours'),
    
    -- 3日前
    (auth.uid(), 'achievement_unlocked', 
     '{"achievement_name": "初めての参加", "achievement_icon": "fa-award"}'::jsonb, 
     true, NOW() - INTERVAL '3 days'),
    
    -- 5日前
    (auth.uid(), 'event_completed', 
     '{"event_name": "新規事業セミナー", "participants": 45, "satisfaction": 4.8}'::jsonb, 
     true, NOW() - INTERVAL '5 days'),
    
    -- 1週間前
    (auth.uid(), 'milestone_reached', 
     '{"milestone_description": "総メンバー数が1,000人を突破しました！", "milestone_type": "community"}'::jsonb, 
     true, NOW() - INTERVAL '7 days');

-- アクティビティタイプの統計を確認
SELECT 
    activity_type,
    COUNT(*) as count,
    MAX(created_at) as latest_activity
FROM user_activities
WHERE is_public = true
GROUP BY activity_type
ORDER BY count DESC;

-- 最新の公開アクティビティを確認（ダッシュボード表示用）
SELECT 
    ua.*,
    p.name,
    p.avatar_url
FROM user_activities ua
LEFT JOIN profiles p ON ua.user_id = p.id
WHERE ua.is_public = true
ORDER BY ua.created_at DESC
LIMIT 10;