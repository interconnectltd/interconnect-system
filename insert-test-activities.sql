-- アクティビティテストデータの挿入
-- 様々なタイプのアクティビティを作成

-- 現在のユーザーIDを取得（実際のユーザーIDに置き換えてください）
DO $$
DECLARE
    user_id UUID;
BEGIN
    -- 最初のユーザーIDを取得
    SELECT id INTO user_id FROM auth.users LIMIT 1;
    
    -- 存在しない場合はサンプルUUIDを使用
    IF user_id IS NULL THEN
        user_id := 'c0b97b9e-4c33-4cec-a393-5c2d20998cf9'::UUID;
    END IF;

    -- 今日のアクティビティ
    INSERT INTO user_activities (user_id, activity_type, activity_data, created_at)
    VALUES 
    (user_id, 'profile_update', 
     '{"description": "プロフィール写真を更新しました", "fields_updated": ["avatar_url"]}'::jsonb,
     NOW() - INTERVAL '30 minutes'),
    
    (user_id, 'message_sent', 
     '{"description": "田中さんにメッセージを送信しました", "recipient": "田中太郎"}'::jsonb,
     NOW() - INTERVAL '2 hours'),
    
    (user_id, 'event_registration', 
     '{"description": "「経営戦略セミナー」に参加登録しました", "event_title": "経営戦略セミナー", "event_date": "2025-02-15"}'::jsonb,
     NOW() - INTERVAL '4 hours');

    -- 今週のアクティビティ
    INSERT INTO user_activities (user_id, activity_type, activity_data, created_at)
    VALUES 
    (user_id, 'matching_success', 
     '{"description": "ABC商事との商談マッチングが成立しました", "company": "ABC商事", "industry": "IT"}'::jsonb,
     NOW() - INTERVAL '1 day'),
    
    (user_id, 'event_complete', 
     '{"description": "「新規事業ピッチ大会」が完了しました", "event_title": "新規事業ピッチ大会", "participants": 45}'::jsonb,
     NOW() - INTERVAL '2 days'),
    
    (user_id, 'member_join', 
     '{"description": "佐藤花子さんがあなたの紹介でコミュニティに参加しました", "new_member": "佐藤花子", "referral": true}'::jsonb,
     NOW() - INTERVAL '3 days');

    -- 今月のアクティビティ
    INSERT INTO user_activities (user_id, activity_type, activity_data, created_at)
    VALUES 
    (user_id, 'profile_update', 
     '{"description": "スキルタグを追加しました", "skills_added": ["Python", "機械学習", "データ分析"]}'::jsonb,
     NOW() - INTERVAL '1 week'),
    
    (user_id, 'matching_success', 
     '{"description": "XYZ企画とのコラボレーションが決定しました", "partner": "XYZ企画", "project": "AI開発"}'::jsonb,
     NOW() - INTERVAL '2 weeks'),
    
    (user_id, 'event_registration', 
     '{"description": "「交流ランチ会」に参加登録しました", "event_title": "交流ランチ会", "location": "東京・丸の内"}'::jsonb,
     NOW() - INTERVAL '3 weeks');

    -- 過去3ヶ月のアクティビティ
    INSERT INTO user_activities (user_id, activity_type, activity_data, created_at)
    VALUES 
    (user_id, 'message_sent', 
     '{"description": "グループチャットでディスカッションに参加しました", "group": "IT経営者の会", "messages": 15}'::jsonb,
     NOW() - INTERVAL '1 month'),
    
    (user_id, 'event_complete', 
     '{"description": "「年末交流パーティー」に参加しました", "event_title": "年末交流パーティー", "connections_made": 8}'::jsonb,
     NOW() - INTERVAL '2 months'),
    
    (user_id, 'matching_success', 
     '{"description": "投資家とのマッチングが成立しました", "investor": "ベンチャーキャピタルA", "amount": "非公開"}'::jsonb,
     NOW() - INTERVAL '2 months 15 days');

END $$;

-- 挿入されたデータを確認
SELECT 
    activity_type,
    activity_data->>'description' as description,
    created_at,
    CASE 
        WHEN created_at > NOW() - INTERVAL '1 day' THEN '今日'
        WHEN created_at > NOW() - INTERVAL '7 days' THEN '今週'
        WHEN created_at > NOW() - INTERVAL '1 month' THEN '今月'
        ELSE '過去'
    END as period
FROM user_activities
ORDER BY created_at DESC
LIMIT 20;