-- event_participantsテーブルの406エラーを完全に修正
-- 406 Not Acceptableは通常、RLSまたはスキーマの問題

-- 1. テーブルの存在確認
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'event_participants'
) as table_exists;

-- 2. カラム構造の確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'event_participants'
ORDER BY ordinal_position;

-- 3. RLS状態確認
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'event_participants';

-- 4. 現在のポリシー確認
SELECT * FROM pg_policies 
WHERE tablename = 'event_participants';

-- 5. 既存のポリシーをすべて削除
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON event_participants;
DROP POLICY IF EXISTS "Allow public read" ON event_participants;
DROP POLICY IF EXISTS "Users can read their own participation" ON event_participants;
DROP POLICY IF EXISTS "Users can insert their own participation" ON event_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON event_participants;
DROP POLICY IF EXISTS "Users can delete their own participation" ON event_participants;

-- 6. RLSを無効化して再度有効化（クリーンな状態にする）
ALTER TABLE event_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- 7. 認証済みユーザー用の包括的なポリシーを作成
-- SELECT（読み取り）: すべての参加者情報を読める
CREATE POLICY "Allow authenticated users to read all" ON event_participants
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT（挿入）: 自分の参加情報を追加できる
CREATE POLICY "Allow authenticated users to insert own" ON event_participants
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- UPDATE（更新）: 自分の参加情報を更新できる
CREATE POLICY "Allow authenticated users to update own" ON event_participants
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE（削除）: 自分の参加情報を削除できる
CREATE POLICY "Allow authenticated users to delete own" ON event_participants
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 8. anonロール用のポリシー（読み取りのみ）
CREATE POLICY "Allow anon to read all" ON event_participants
    FOR SELECT
    TO anon
    USING (true);

-- 9. 権限を明示的に付与
GRANT SELECT ON event_participants TO anon;
GRANT ALL ON event_participants TO authenticated;

-- 10. 関数が存在する場合の権限付与
GRANT EXECUTE ON FUNCTION auth.uid() TO anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

-- 11. テーブルが適切に設定されているか確認
SELECT 
    has_table_privilege('anon', 'event_participants', 'SELECT') as anon_can_select,
    has_table_privilege('authenticated', 'event_participants', 'SELECT') as auth_can_select,
    has_table_privilege('authenticated', 'event_participants', 'INSERT') as auth_can_insert,
    has_table_privilege('authenticated', 'event_participants', 'UPDATE') as auth_can_update,
    has_table_privilege('authenticated', 'event_participants', 'DELETE') as auth_can_delete;

-- 12. 結果確認
SELECT COUNT(*) as total_participants FROM event_participants;