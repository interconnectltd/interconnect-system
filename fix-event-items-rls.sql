-- event_itemsテーブルのRLSポリシーを修正
-- 認証されていないユーザーでも公開イベントを閲覧できるようにする

-- 1. RLSを有効化（既に有効化されている場合はスキップ）
ALTER TABLE event_items ENABLE ROW LEVEL SECURITY;

-- 2. 既存のポリシーを削除
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON event_items;
DROP POLICY IF EXISTS "Enable read access for all users" ON event_items;
DROP POLICY IF EXISTS "Users can create events" ON event_items;
DROP POLICY IF EXISTS "Users can update their own events" ON event_items;

-- 3. 新しいポリシーを作成

-- 公開イベントは誰でも閲覧可能（anonユーザーも含む）
CREATE POLICY "Public events are viewable by everyone" 
    ON event_items FOR SELECT 
    USING (is_public = true);

-- 非公開イベントは認証されたユーザーのみ閲覧可能
CREATE POLICY "Private events are viewable by authenticated users" 
    ON event_items FOR SELECT 
    TO authenticated
    USING (is_public = false);

-- イベントの作成は認証されたユーザーのみ
CREATE POLICY "Authenticated users can create events" 
    ON event_items FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- イベントの更新は作成者のみ
CREATE POLICY "Users can update their own events" 
    ON event_items FOR UPDATE 
    TO authenticated
    USING (created_by = auth.uid());

-- 4. 権限を付与
GRANT SELECT ON event_items TO anon;
GRANT SELECT, INSERT, UPDATE ON event_items TO authenticated;

-- 5. テスト用クエリ
-- 公開イベントが表示されるか確認
SELECT id, title, event_date, is_public FROM event_items WHERE is_public = true LIMIT 5;