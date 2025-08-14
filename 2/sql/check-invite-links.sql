-- invite_linksテーブルの内容を確認

-- 1. テーブル構造を確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invite_links'
ORDER BY ordinal_position;

-- 2. 全レコードを確認
SELECT * FROM invite_links
ORDER BY created_at DESC;

-- 3. 特定ユーザーのリンクを確認（ユーザーIDを置き換えて使用）
-- SELECT * FROM invite_links
-- WHERE created_by = 'c0b97b9e-4c33-4cec-a393-5c2d20998cf9'
-- ORDER BY created_at DESC;

-- 4. RLSポリシーを確認
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
WHERE tablename = 'invite_links';