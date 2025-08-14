-- ===========================
-- 紹介リンクテーブルのデバッグ確認
-- ===========================

-- 1. invite_linksテーブルの構造確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'invite_links'
ORDER BY ordinal_position;

-- 2. 現在保存されている招待リンクの確認
SELECT 
    id,
    created_by,
    link_code,
    description,
    is_active,
    created_at,
    updated_at
FROM invite_links
ORDER BY created_at DESC
LIMIT 10;

-- 3. ユーザーIDでフィルタリング（実際のユーザーIDに置き換えてください）
-- SELECT * FROM invite_links WHERE created_by = 'c0b97b9e-4c33-4cec-a393-5c2d20998cf9';

-- 4. RLSポリシーの確認
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

-- 5. テーブルの権限確認
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'invite_links';

-- 6. 関数の実行テスト（実際のユーザーIDに置き換えてください）
-- SELECT create_invite_link('c0b97b9e-4c33-4cec-a393-5c2d20998cf9', 'テストリンク');