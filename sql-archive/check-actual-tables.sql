-- ======================================
-- 実際のテーブル構造を確認
-- ======================================

-- 1. active_usersがビューであることを確認
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name IN ('active_users', 'user_profiles', 'profiles')
ORDER BY table_name;

-- 2. active_usersビューの定義を確認
SELECT definition
FROM pg_views
WHERE schemaname = 'public' 
AND viewname = 'active_users';

-- 3. 実際のユーザー情報を持つテーブルを探す
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name IN ('email', 'name', 'company', 'position')
AND table_name NOT IN (
    SELECT viewname FROM pg_views WHERE schemaname = 'public'
)
ORDER BY table_name, ordinal_position;

-- 4. user_profilesテーブルの構造を確認
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 5. profilesテーブルの構造を確認
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;