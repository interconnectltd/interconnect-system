-- invite_linksテーブルのRLSポリシーを確認
-- 1. RLSが有効か確認
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'invite_links';

-- 2. 現在のRLSポリシー一覧
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

-- 3. invite_linksテーブルの構造確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'invite_links'
ORDER BY ordinal_position;

-- 4. 既存のデータ確認（最新10件）
SELECT 
    id,
    link_code,
    description,
    created_by,
    created_at,
    is_active
FROM invite_links
ORDER BY created_at DESC
LIMIT 10;

-- 5. RLSポリシーを修正（必要に応じて）
-- まず既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view their own invite links" ON invite_links;
DROP POLICY IF EXISTS "Users can insert their own invite links" ON invite_links;
DROP POLICY IF EXISTS "Users can update their own invite links" ON invite_links;
DROP POLICY IF EXISTS "Users can delete their own invite links" ON invite_links;

-- 新しいポリシーを作成
-- SELECTポリシー
CREATE POLICY "Users can view their own invite links"
ON invite_links
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- INSERTポリシー
CREATE POLICY "Users can insert their own invite links"
ON invite_links
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- UPDATEポリシー
CREATE POLICY "Users can update their own invite links"
ON invite_links
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- DELETEポリシー
CREATE POLICY "Users can delete their own invite links"
ON invite_links
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- 6. RLSを有効化（念のため）
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

-- 7. ポリシー適用後の確認
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'invite_links';