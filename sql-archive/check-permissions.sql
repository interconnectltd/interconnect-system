-- ===========================
-- テーブル権限の確認
-- ===========================

-- 1. テーブルの存在確認
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('events', 'dashboard_stats', 'user_activities', 'messages')
ORDER BY tablename;

-- 2. RLSの状態確認
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('events', 'dashboard_stats', 'user_activities', 'messages')
ORDER BY tablename;

-- 3. ポリシーの確認
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('events', 'dashboard_stats', 'user_activities', 'messages')
ORDER BY tablename, policyname;

-- 4. カラム情報の確認
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('events', 'dashboard_stats', 'user_activities', 'messages')
ORDER BY table_name, ordinal_position;

-- 5. 権限の確認
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name IN ('events', 'dashboard_stats', 'user_activities', 'messages')
ORDER BY table_name, grantee, privilege_type;

-- ===========================
-- 簡易的な権限テスト
-- ===========================

-- anonロールでのテスト（Supabaseのデフォルト）
SET ROLE anon;

-- 各テーブルへのSELECT権限確認
DO $$
BEGIN
    -- events
    BEGIN
        PERFORM * FROM public.events LIMIT 1;
        RAISE NOTICE 'events: SELECT OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'events: SELECT ERROR - %', SQLERRM;
    END;
    
    -- dashboard_stats
    BEGIN
        PERFORM * FROM public.dashboard_stats LIMIT 1;
        RAISE NOTICE 'dashboard_stats: SELECT OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'dashboard_stats: SELECT ERROR - %', SQLERRM;
    END;
    
    -- user_activities  
    BEGIN
        PERFORM * FROM public.user_activities LIMIT 1;
        RAISE NOTICE 'user_activities: SELECT OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'user_activities: SELECT ERROR - %', SQLERRM;
    END;
    
    -- messages
    BEGIN
        PERFORM * FROM public.messages LIMIT 1;
        RAISE NOTICE 'messages: SELECT OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'messages: SELECT ERROR - %', SQLERRM;
    END;
END $$;

-- デフォルトロールに戻す
RESET ROLE;