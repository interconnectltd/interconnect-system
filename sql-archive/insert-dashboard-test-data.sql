-- Dashboard test data insertion script
-- Run this in Supabase SQL editor to add test data

-- Insert dashboard stats if not exists
INSERT INTO dashboard_stats (
    total_members,
    monthly_events,
    matching_success,
    unread_messages,
    member_growth_percentage,
    event_increase,
    matching_success_percentage,
    message_decrease_percentage
) VALUES (
    1234,  -- total_members
    15,    -- monthly_events  
    89,    -- matching_success
    42,    -- unread_messages
    12.0,  -- member_growth_percentage
    3,     -- event_increase
    23.0,  -- matching_success_percentage
    5.0    -- message_decrease_percentage
)
ON CONFLICT (id) DO UPDATE SET
    total_members = EXCLUDED.total_members,
    monthly_events = EXCLUDED.monthly_events,
    matching_success = EXCLUDED.matching_success,
    unread_messages = EXCLUDED.unread_messages,
    updated_at = NOW();

-- Insert some recent activities
INSERT INTO user_activities (
    user_id,
    activity_type,
    activity_data
) VALUES 
(
    (SELECT id FROM auth.users LIMIT 1),
    'member_join',
    '{"description": "山田太郎さんがコミュニティに参加しました", "member_name": "山田太郎"}'::jsonb
),
(
    (SELECT id FROM auth.users LIMIT 1),
    'event_complete',
    '{"description": "月例ネットワーキング会が成功裏に終了", "event_name": "月例ネットワーキング会"}'::jsonb
),
(
    (SELECT id FROM auth.users LIMIT 1),
    'matching_success',
    '{"description": "3件の新しいビジネスマッチングが成立", "count": 3}'::jsonb
);

-- Insert upcoming events
INSERT INTO events (
    title,
    description,
    date,
    time,
    location,
    online,
    max_participants,
    organizer_id
) VALUES
(
    '経営戦略セミナー',
    '最新の経営戦略について学ぶセミナー',
    '2025-02-15',
    '14:00',
    'オンライン開催',
    true,
    100,
    (SELECT id FROM auth.users LIMIT 1)
),
(
    '交流ランチ会',
    '気軽に参加できる交流イベント',
    '2025-02-18',
    '12:00',
    '東京・丸の内',
    false,
    30,
    (SELECT id FROM auth.users LIMIT 1)
),
(
    '新規事業ピッチ大会',
    '新規事業アイデアを発表する機会',
    '2025-02-25',
    '18:00',
    '大阪・梅田',
    false,
    50,
    (SELECT id FROM auth.users LIMIT 1)
);