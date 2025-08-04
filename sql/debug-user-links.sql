-- ===========================
-- 特定ユーザーの紹介リンク確認
-- ===========================

-- 1. 実際のユーザーIDでリンクを確認
SELECT 
    id,
    created_by,
    link_code,
    description,
    is_active,
    created_at
FROM invite_links 
WHERE created_by = 'c0b97b9e-4c33-4cec-a393-5c2d20998cf9'
ORDER BY created_at DESC;

-- 2. すべてのリンクを確認（管理者権限で）
SELECT 
    id,
    created_by,
    link_code,
    description,
    is_active,
    created_at
FROM invite_links 
ORDER BY created_at DESC
LIMIT 10;

-- 3. RLSポリシーを一時的に無効化してテスト
ALTER TABLE invite_links DISABLE ROW LEVEL SECURITY;

-- テスト後は必ず再有効化
-- ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

-- 4. 現在のユーザー確認
SELECT auth.uid() as current_user_id;

-- 5. RLSポリシーの詳細確認
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'invite_links';