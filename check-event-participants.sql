-- event_participantsテーブルの状態を確認

-- 1. テーブルが存在するか確認
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'event_participants'
) as table_exists;

-- 2. テーブルの構造を確認
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'event_participants'
ORDER BY ordinal_position;

-- 3. RLSが有効になっているか確認
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'event_participants';

-- 4. 既存のRLSポリシーを確認
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'event_participants';

-- 5. アノニマスユーザーでも読み取りできるようにポリシーを追加
-- （必要に応じて実行）
CREATE POLICY "Enable read access for all users" 
    ON event_participants FOR SELECT 
    USING (true);

-- 6. サービスロールの権限を確認
SELECT has_table_privilege('anon', 'event_participants', 'SELECT') as anon_can_select,
       has_table_privilege('authenticated', 'event_participants', 'SELECT') as auth_can_select;