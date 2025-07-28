-- Automatic Activity Insertion
-- 自動的に現在のユーザーIDを使用してアクティビティを挿入

-- 現在認証されているユーザーのアクティビティを挿入
DO $$
DECLARE
    current_user_id UUID;
    current_user_name TEXT;
BEGIN
    -- 現在のユーザー情報を取得
    SELECT id, name INTO current_user_id, current_user_name
    FROM profiles
    WHERE id = auth.uid();
    
    -- ユーザーが見つからない場合は、最初のユーザーを使用
    IF current_user_id IS NULL THEN
        SELECT id, name INTO current_user_id, current_user_name
        FROM profiles
        LIMIT 1;
    END IF;
    
    -- アクティビティを挿入
    IF current_user_id IS NOT NULL THEN
        INSERT INTO user_activities (user_id, activity_type, activity_data, is_public, created_at)
        VALUES 
            -- 今日のアクティビティ
            (current_user_id, 'user_registered', 
             jsonb_build_object('description', 'さんがコミュニティに参加しました'), 
             true, NOW() - INTERVAL '2 hours'),
            
            (current_user_id, 'event_joined', 
             jsonb_build_object(
                 'event_name', '月例ネットワーキング会',
                 'event_id', 'event-123',
                 'description', 'さんがイベント「月例ネットワーキング会」に参加登録しました'
             ), 
             true, NOW() - INTERVAL '5 hours'),
            
            -- 昨日のアクティビティ
            (current_user_id, 'matching_success', 
             jsonb_build_object(
                 'partner_name', '田中太郎',
                 'partner_id', 'user-456',
                 'description', 'さんと田中太郎さんのマッチングが成立しました'
             ), 
             true, NOW() - INTERVAL '1 day'),
            
            -- 2日前
            (current_user_id, 'event_created', 
             jsonb_build_object(
                 'event_name', 'AI技術交流会',
                 'event_date', '2025-08-15',
                 'description', 'さんが新しいイベント「AI技術交流会」を作成しました'
             ), 
             true, NOW() - INTERVAL '2 days'),
            
            (current_user_id, 'profile_updated', 
             jsonb_build_object(
                 'fields_updated', ARRAY['bio', 'skills'],
                 'completion_rate', 85,
                 'description', 'さんがプロフィールを更新しました'
             ), 
             true, NOW() - INTERVAL '2 days 4 hours'),
            
            -- 3日前
            (current_user_id, 'achievement_unlocked', 
             jsonb_build_object(
                 'achievement_name', '初めての参加',
                 'achievement_icon', 'fa-award',
                 'description', 'さんが「初めての参加」の実績を解除しました'
             ), 
             true, NOW() - INTERVAL '3 days'),
            
            -- 5日前
            (current_user_id, 'event_completed', 
             jsonb_build_object(
                 'event_name', '新規事業セミナー',
                 'participants', 45,
                 'satisfaction', 4.8,
                 'description', 'イベント「新規事業セミナー」が成功裏に終了しました'
             ), 
             true, NOW() - INTERVAL '5 days'),
            
            -- 1週間前
            (current_user_id, 'milestone_reached', 
             jsonb_build_object(
                 'milestone_description', '総メンバー数が1,000人を突破しました！',
                 'milestone_type', 'community',
                 'description', '総メンバー数が1,000人を突破しました！'
             ), 
             true, NOW() - INTERVAL '7 days');
            
        RAISE NOTICE 'アクティビティを挿入しました。ユーザーID: %, ユーザー名: %', current_user_id, current_user_name;
    ELSE
        RAISE NOTICE 'ユーザーが見つかりません。profilesテーブルにユーザーが存在することを確認してください。';
    END IF;
END $$;

-- 他のユーザーのアクティビティもランダムに生成
INSERT INTO user_activities (user_id, activity_type, activity_data, is_public, created_at)
SELECT 
    p.id,
    activity_types.type_name,
    jsonb_build_object(
        'description', activity_types.description,
        'user_name', p.name,
        'event_name', CASE 
            WHEN activity_types.type_name LIKE 'event%' 
            THEN (ARRAY['春の交流会', '技術セミナー', 'ビジネスマッチング会', '新年会'])[floor(random() * 4 + 1)::int]
            ELSE NULL
        END,
        'partner_name', CASE 
            WHEN activity_types.type_name = 'matching_success' 
            THEN (SELECT name FROM profiles WHERE id != p.id ORDER BY random() LIMIT 1)
            ELSE NULL
        END
    ),
    true,
    NOW() - (random() * INTERVAL '14 days')
FROM 
    profiles p,
    (VALUES 
        ('user_registered', 'さんがコミュニティに参加しました'),
        ('profile_updated', 'さんがプロフィールを更新しました'),
        ('event_joined', 'さんがイベントに参加登録しました'),
        ('matching_request', 'さんがマッチングリクエストを送信しました'),
        ('message_sent', 'さんがメッセージを送信しました')
    ) AS activity_types(type_name, description)
WHERE 
    p.id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000')
    AND random() < 0.3  -- 30%の確率で各アクティビティを生成
LIMIT 10;

-- 結果を確認
SELECT 
    ua.id,
    ua.activity_type,
    ua.activity_data->>'description' as description,
    ua.activity_data->>'event_name' as event_name,
    ua.created_at,
    p.name as user_name,
    p.avatar_url
FROM user_activities ua
LEFT JOIN profiles p ON ua.user_id = p.id
WHERE ua.is_public = true
ORDER BY ua.created_at DESC
LIMIT 20;