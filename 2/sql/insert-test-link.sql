-- ===========================
-- テスト用紹介リンクの直接挿入
-- ===========================

-- 1. テスト用リンクを直接挿入
INSERT INTO invite_links (
    created_by,
    link_code,
    description,
    is_active,
    created_at,
    updated_at
) VALUES (
    'c0b97b9e-4c33-4cec-a393-5c2d20998cf9',
    'TEST-LINK',
    'テスト用紹介リンク',
    true,
    NOW(),
    NOW()
);

-- 2. 挿入されたデータを確認
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