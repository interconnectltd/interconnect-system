-- event_itemsテーブルのRLSポリシーを修正（created_byカラムなしバージョン）
-- 認証されていないユーザーでも公開イベントを閲覧できるようにする

-- 1. RLSを有効化（既に有効化されている場合はスキップ）
ALTER TABLE event_items ENABLE ROW LEVEL SECURITY;

-- 2. 既存のポリシーを削除
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON event_items;
DROP POLICY IF EXISTS "Enable read access for all users" ON event_items;
DROP POLICY IF EXISTS "Users can create events" ON event_items;
DROP POLICY IF EXISTS "Users can update their own events" ON event_items;
DROP POLICY IF EXISTS "Private events are viewable by authenticated users" ON event_items;
DROP POLICY IF EXISTS "Authenticated users can create events" ON event_items;

-- 3. シンプルなポリシーを作成

-- すべてのユーザーがイベントを閲覧可能（一時的な解決策）
CREATE POLICY "Enable read access for all users" 
    ON event_items FOR SELECT 
    USING (true);

-- イベントの作成は認証されたユーザーのみ
CREATE POLICY "Authenticated users can create events" 
    ON event_items FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- イベントの更新は認証されたユーザーのみ（一時的に全員許可）
CREATE POLICY "Authenticated users can update events" 
    ON event_items FOR UPDATE 
    TO authenticated
    USING (true);

-- 4. 権限を付与
GRANT SELECT ON event_items TO anon;
GRANT SELECT, INSERT, UPDATE ON event_items TO authenticated;

-- 5. event_itemsテーブルの構造を確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'event_items'
ORDER BY ordinal_position;

-- 6. テスト用クエリ
-- イベントが表示されるか確認
SELECT id, title, event_date, is_public FROM event_items LIMIT 5;