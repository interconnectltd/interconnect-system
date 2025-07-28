-- ======================================
-- user_profilesテーブルの構造調査（完全版）
-- すべてのエラーを回避した安全なSQL
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
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_profiles'
            AND column_name = 'connection_count'
        ) 
        THEN 'connection_countカラムは存在します'
        ELSE 'connection_countカラムは存在しません'
    END as result;

-- 3. active_usersビューの定義を確認
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE viewname = 'active_users'
AND schemaname = 'public';

-- 4. user_profilesテーブルのサンプルデータを確認（最初の3件）
SELECT 
    id,
    name,
    company,
    position,
    is_active,
    created_at
FROM user_profiles
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 3;

-- 5. connectionsテーブルの構造を確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'connections'
ORDER BY ordinal_position;

-- 6. connection関連のカラムを探す
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name LIKE '%connection%'
ORDER BY table_name, column_name;

-- 7. 必要なカラムを追加（存在しない場合のみ）
DO $$
BEGIN
    -- connection_countカラムを追加
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
        AND column_name = 'connection_count'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN connection_count INTEGER DEFAULT 0;
        RAISE NOTICE 'connection_countカラムを追加しました';
    END IF;
    
    -- full_nameカラムを追加
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
        AND column_name = 'full_name'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN full_name TEXT;
        RAISE NOTICE 'full_nameカラムを追加しました';
    END IF;
    
    -- skillsカラムを追加
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
        AND column_name = 'skills'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN skills TEXT[];
        RAISE NOTICE 'skillsカラムを追加しました';
    END IF;
    
    -- is_onlineカラムを追加
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
        AND column_name = 'is_online'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN is_online BOOLEAN DEFAULT false;
        RAISE NOTICE 'is_onlineカラムを追加しました';
    END IF;
END $$;

-- 8. データの初期化（full_nameがNULLの場合）
UPDATE public.user_profiles 
SET full_name = name 
WHERE full_name IS NULL 
AND name IS NOT NULL;

-- 9. 基本的なスキルを設定（skillsがNULLの場合）
UPDATE public.user_profiles
SET skills = ARRAY['ビジネス', 'コミュニケーション']::TEXT[]
WHERE skills IS NULL
AND is_active = true
AND id IN (
    SELECT id 
    FROM public.user_profiles 
    WHERE is_active = true 
    ORDER BY created_at DESC
    LIMIT 5
);

-- 10. connection_countを計算して更新
WITH connection_stats AS (
    SELECT 
        user_id,
        COUNT(*) as total_connections
    FROM (
        SELECT requester_id as user_id 
        FROM connections 
        WHERE status = 'accepted'
        UNION ALL
        SELECT receiver_id as user_id 
        FROM connections 
        WHERE status = 'accepted'
    ) all_connections
    GROUP BY user_id
)
UPDATE public.user_profiles up
SET connection_count = COALESCE(cs.total_connections, 0)
FROM connection_stats cs
WHERE up.id = cs.user_id;

-- 11. connection_countがNULLのユーザーを0に設定
UPDATE public.user_profiles
SET connection_count = 0
WHERE connection_count IS NULL;

-- 12. 最終的な確認
SELECT 
    'セットアップ完了' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as with_full_name,
    COUNT(CASE WHEN skills IS NOT NULL AND array_length(skills, 1) > 0 THEN 1 END) as with_skills,
    COUNT(CASE WHEN connection_count > 0 THEN 1 END) as users_with_connections
FROM public.user_profiles
WHERE is_active = true;

-- 13. サンプルデータを表示（最初の5件）
SELECT 
    id,
    name,
    full_name,
    company,
    position,
    skills,
    is_online,
    connection_count
FROM public.user_profiles
WHERE is_active = true
ORDER BY connection_count DESC, created_at DESC
LIMIT 5;