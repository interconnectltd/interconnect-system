-- ooxmichaelxoo@gmail.comのリンクを確認

-- 1. profilesテーブルからユーザーIDを取得
SELECT id, email, name 
FROM profiles 
WHERE email = 'ooxmichaelxoo@gmail.com';

-- 2. そのユーザーIDでinvite_linksを直接確認
SELECT 
    il.id,
    il.created_by,
    il.link_code,
    il.description,
    il.is_active,
    il.created_at,
    p.email as created_by_email
FROM invite_links il
LEFT JOIN profiles p ON p.id = il.created_by
WHERE p.email = 'ooxmichaelxoo@gmail.com'
ORDER BY il.created_at DESC;

-- 3. get_user_invite_links関数でテスト（ユーザーIDを使用）
-- まずユーザーIDを取得してから実行してください
SELECT * FROM get_user_invite_links(
    (SELECT id FROM profiles WHERE email = 'ooxmichaelxoo@gmail.com')
);

-- 4. 新しいリンクを作成してみる
SELECT create_invite_link(
    (SELECT id FROM profiles WHERE email = 'ooxmichaelxoo@gmail.com'),
    'SQLエディタから作成したテストリンク'
);

-- 5. RLSポリシーの状態を再確認
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'invite_links';