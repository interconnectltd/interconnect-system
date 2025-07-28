-- Check user_activities table constraints
-- user_activitiesテーブルの制約を確認

-- テーブル構造を確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_activities'
ORDER BY ordinal_position;

-- 制約を確認
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'user_activities';

-- 既存のデータを確認
SELECT COUNT(*) as total_activities FROM user_activities;
SELECT COUNT(DISTINCT user_id) as unique_users FROM user_activities;

-- user_idがNULLのレコードを確認
SELECT * FROM user_activities WHERE user_id IS NULL;

-- profilesテーブルのユーザーを確認
SELECT id, email, name, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- アクティビティタイプの分布を確認
SELECT 
    activity_type,
    COUNT(*) as count,
    COUNT(DISTINCT user_id) as unique_users
FROM user_activities
GROUP BY activity_type
ORDER BY count DESC;