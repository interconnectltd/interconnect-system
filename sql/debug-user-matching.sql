-- ユーザーIDの不一致を調査

-- 1. profilesテーブルとauth.users()の関係を確認
SELECT 
    'profiles' as source,
    id,
    email,
    name
FROM profiles
WHERE email = 'ooxmichaelxoo@gmail.com'

UNION ALL

SELECT 
    'auth.users' as source,
    au.id,
    au.email,
    au.raw_user_meta_data->>'name' as name
FROM auth.users au
WHERE au.email = 'ooxmichaelxoo@gmail.com';

-- 2. invite_linksの実際のデータを確認
SELECT 
    il.id,
    il.created_by,
    il.link_code,
    il.description,
    p.email as creator_email,
    p.id as profile_id,
    (il.created_by = p.id) as ids_match
FROM invite_links il
LEFT JOIN profiles p ON p.email = 'ooxmichaelxoo@gmail.com'
WHERE il.created_by IN (
    SELECT id FROM profiles WHERE email = 'ooxmichaelxoo@gmail.com'
    UNION
    SELECT id FROM auth.users WHERE email = 'ooxmichaelxoo@gmail.com'
)
ORDER BY il.created_at DESC;

-- 3. auth.uid()とprofiles.idの違いを確認
-- ※この部分は認証されたセッションでのみ動作します
DO $$
DECLARE
    v_auth_uid UUID;
    v_profile_id UUID;
BEGIN
    -- 現在のauth.uid()を取得（nullの可能性あり）
    v_auth_uid := auth.uid();
    
    -- profilesからIDを取得
    SELECT id INTO v_profile_id
    FROM profiles
    WHERE email = 'ooxmichaelxoo@gmail.com';
    
    RAISE NOTICE 'auth.uid(): %', COALESCE(v_auth_uid::TEXT, 'NULL');
    RAISE NOTICE 'profile.id: %', v_profile_id;
    RAISE NOTICE 'IDs match: %', (v_auth_uid = v_profile_id);
END $$;

-- 4. invite_linksのcreated_byの分布を確認
SELECT 
    created_by,
    COUNT(*) as link_count,
    STRING_AGG(link_code, ', ' ORDER BY created_at DESC) as link_codes
FROM invite_links
GROUP BY created_by
ORDER BY link_count DESC;

-- 5. RLSを一時的に無効化してテスト（管理者権限が必要）
-- 注意：本番環境では実行しないでください
-- ALTER TABLE invite_links DISABLE ROW LEVEL SECURITY;

-- テスト後は必ず有効化
-- ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;