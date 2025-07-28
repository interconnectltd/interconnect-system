-- Quick Activity Insert
-- 素早くアクティビティを挿入（エラー回避版）

-- 方法1: profilesテーブルから最初のユーザーを使用
INSERT INTO user_activities (user_id, activity_type, activity_data, is_public, created_at)
SELECT 
    (SELECT id FROM profiles LIMIT 1),
    'user_registered',
    '{"description": "さんがコミュニティに参加しました"}'::jsonb,
    true,
    NOW() - INTERVAL '2 hours'
WHERE EXISTS (SELECT 1 FROM profiles);

-- 方法2: 特定のユーザーIDを使用（あなたのIDに置き換えてください）
-- INSERT INTO user_activities (user_id, activity_type, activity_data, is_public, created_at)
-- VALUES 
--     ('c0b97b9e-4c33-4cec-a393-5c2d20998cf9', 'event_joined', 
--      '{"event_name": "月例ネットワーキング会", "description": "さんがイベントに参加登録しました"}'::jsonb, 
--      true, NOW() - INTERVAL '5 hours');

-- 方法3: 複数のサンプルアクティビティを一度に挿入
WITH first_user AS (
    SELECT id, name FROM profiles LIMIT 1
)
INSERT INTO user_activities (user_id, activity_type, activity_data, is_public, created_at)
SELECT 
    fu.id,
    activity_type,
    jsonb_build_object(
        'description', description,
        'user_name', fu.name
    ),
    true,
    created_at
FROM first_user fu
CROSS JOIN (
    VALUES 
        ('event_joined', 'さんがイベントに参加登録しました', NOW() - INTERVAL '5 hours'),
        ('profile_updated', 'さんがプロフィールを更新しました', NOW() - INTERVAL '1 day'),
        ('matching_success', 'さんのマッチングが成立しました', NOW() - INTERVAL '2 days'),
        ('achievement_unlocked', 'さんが新しい実績を解除しました', NOW() - INTERVAL '3 days')
) AS activities(activity_type, description, created_at);

-- 挿入されたアクティビティを確認
SELECT 
    ua.*,
    p.name
FROM user_activities ua
LEFT JOIN profiles p ON ua.user_id = p.id
ORDER BY ua.created_at DESC
LIMIT 10;