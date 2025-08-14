-- invite_linksテーブルにINSERT権限とRLSポリシーを確認・修正

-- 1. 既存のINSERTポリシーを確認
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'invite_links' AND cmd = 'INSERT';

-- 2. INSERT用のRLSポリシーを再作成
DROP POLICY IF EXISTS "Users can insert their own invite links" ON invite_links;

CREATE POLICY "Users can insert their own invite links"
ON invite_links
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- 3. 別の方法：SECURITY DEFINERなしの関数を作成
CREATE OR REPLACE FUNCTION create_invite_link_direct(
    p_user_id UUID,
    p_description TEXT DEFAULT 'マイ紹介リンク'
)
RETURNS TABLE (
    id UUID,
    created_by UUID,
    link_code TEXT,
    description TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_link_code TEXT;
BEGIN
    -- ユニークなリンクコードを生成
    LOOP
        v_link_code := UPPER(
            SUBSTRING(MD5(RANDOM()::TEXT), 1, 4) || '-' ||
            SUBSTRING(MD5(RANDOM()::TEXT), 1, 4)
        );
        
        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM invite_links WHERE link_code = v_link_code
        );
    END LOOP;
    
    -- 直接INSERTして結果を返す
    RETURN QUERY
    INSERT INTO invite_links (created_by, link_code, description, is_active)
    VALUES (p_user_id, v_link_code, p_description, true)
    RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- 権限付与
GRANT EXECUTE ON FUNCTION create_invite_link_direct TO authenticated;

-- 4. テスト用：直接INSERTを試みる関数
CREATE OR REPLACE FUNCTION test_direct_insert(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_count_before INTEGER;
    v_count_after INTEGER;
BEGIN
    -- 挿入前のレコード数
    SELECT COUNT(*) INTO v_count_before
    FROM invite_links
    WHERE created_by = p_user_id;
    
    -- テストレコードを挿入
    BEGIN
        INSERT INTO invite_links (created_by, link_code, description, is_active)
        VALUES (p_user_id, 'TEST-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 4), 'テスト挿入', true);
        
        -- 挿入後のレコード数
        SELECT COUNT(*) INTO v_count_after
        FROM invite_links
        WHERE created_by = p_user_id;
        
        -- 結果を構築
        SELECT json_build_object(
            'success', true,
            'count_before', v_count_before,
            'count_after', v_count_after,
            'inserted', v_count_after > v_count_before,
            'user_id', p_user_id
        ) INTO v_result;
        
    EXCEPTION WHEN OTHERS THEN
        SELECT json_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
        ) INTO v_result;
    END;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION test_direct_insert TO authenticated;