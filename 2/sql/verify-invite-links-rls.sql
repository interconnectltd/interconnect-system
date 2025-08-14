-- invite_linksテーブルのRLSポリシーを確認
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
WHERE tablename = 'invite_links'
ORDER BY policyname;

-- RLSが有効になっているか確認
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'invite_links';

-- 現在のユーザーで取得可能なデータを確認
-- （Supabaseダッシュボードで実行時は、実際のユーザーIDに置き換えてください）
SELECT * FROM invite_links 
WHERE created_by = auth.uid()
LIMIT 10;