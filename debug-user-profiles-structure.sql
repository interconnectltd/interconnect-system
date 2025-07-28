-- ======================================
-- user_profilesテーブルの正確な構造を調査
-- エラーを一つずつ解決するため
-- ======================================

-- 1. user_profilesテーブルの全カラムを確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 2. connection_countカラムが存在するか確認
SELECT 
    column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
AND column_name = 'connection_count';

-- 3. active_usersビューの定義を確認（connection_countがどこから来ているか）
\d+ active_users

-- 4. もしactive_usersビューの定義が見れない場合は別の方法で確認
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE viewname = 'active_users'
AND schemaname = 'public';

-- 5. user_profilesテーブルのサンプルデータを確認（最初の3件）
SELECT 
    id,
    name,
    company,
    position,
    is_active
FROM user_profiles
WHERE is_active = true
LIMIT 3;

-- 6. connection_countの代替案を探す
-- もしかしたら別のテーブルまたは計算で取得する必要があるかも
SELECT 
    table_name,
    column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name LIKE '%connection%'
ORDER BY table_name;