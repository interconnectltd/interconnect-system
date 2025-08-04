-- RLSポリシーのデバッグと修正

-- 1. 現在のユーザーIDを確認
SELECT auth.uid() as current_user_id;

-- 2. invite_linksテーブルの全データを確認（管理者権限が必要）
SELECT 
    id,
    link_code,
    description,
    created_by,
    created_at,
    is_active
FROM invite_links
ORDER BY created_at DESC
LIMIT 20;

-- 3. 現在のユーザーのデータのみを確認
SELECT 
    id,
    link_code,
    description,
    created_by,
    created_at,
    is_active,
    (created_by = auth.uid()) as is_mine
FROM invite_links
WHERE created_by = auth.uid()
ORDER BY created_at DESC;

-- 4. RLSを一時的に無効化してテスト（管理者のみ実行可能）
-- ALTER TABLE invite_links DISABLE ROW LEVEL SECURITY;

-- 5. テスト用の直接INSERT（現在のユーザーIDで）
DO $$
DECLARE
    v_user_id UUID;
    v_link_code TEXT;
BEGIN
    v_user_id := auth.uid();
    v_link_code := 'TEST-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 4);
    
    -- 直接INSERT
    INSERT INTO invite_links (created_by, link_code, description, is_active)
    VALUES (v_user_id, v_link_code, 'RLSテスト用リンク', true);
    
    RAISE NOTICE 'リンクを作成しました: % (ユーザーID: %)', v_link_code, v_user_id;
END $$;

-- 6. 作成されたデータを確認
SELECT 
    id,
    link_code,
    description,
    created_by,
    created_at,
    (created_by = auth.uid()) as is_mine
FROM invite_links
WHERE link_code LIKE 'TEST-%'
ORDER BY created_at DESC
LIMIT 5;

-- 7. RLSポリシーを修正（必要に応じて）
-- SELECTポリシーを再作成
DROP POLICY IF EXISTS "Users can view their own invite links" ON invite_links;
CREATE POLICY "Users can view their own invite links"
ON invite_links
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- INSERTポリシーを再作成（明示的に）
DROP POLICY IF EXISTS "Users can insert their own invite links" ON invite_links;
CREATE POLICY "Users can insert their own invite links"
ON invite_links
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- 8. 関数経由でのテスト
SELECT * FROM create_invite_link(
    auth.uid(),
    'RLS修正後のテストリンク'
);

-- 9. 最終確認
SELECT 
    COUNT(*) as total_links,
    COUNT(CASE WHEN created_by = auth.uid() THEN 1 END) as my_links
FROM invite_links;

-- 10. デバッグ情報を表示する関数
CREATE OR REPLACE FUNCTION debug_rls_issue()
RETURNS TABLE (
    info_type TEXT,
    info_value TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'Current User ID'::TEXT, auth.uid()::TEXT
    UNION ALL
    SELECT 'Total Links in Table'::TEXT, COUNT(*)::TEXT FROM invite_links
    UNION ALL
    SELECT 'Links for Current User'::TEXT, COUNT(*)::TEXT FROM invite_links WHERE created_by = auth.uid()
    UNION ALL
    SELECT 'RLS Enabled'::TEXT, 
           CASE WHEN relrowsecurity THEN 'Yes' ELSE 'No' END
    FROM pg_class WHERE relname = 'invite_links';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- デバッグ関数を実行
SELECT * FROM debug_rls_issue();