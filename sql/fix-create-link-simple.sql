-- ===========================
-- 紹介リンク作成関数の完全修正（簡単版）
-- ===========================

-- 1. 既存の関数をすべて削除
DROP FUNCTION IF EXISTS create_invite_link(UUID);
DROP FUNCTION IF EXISTS create_invite_link(UUID, TEXT);
DROP FUNCTION IF EXISTS create_invite_link(UUID, TEXT, INTEGER);

-- 2. シンプルな単一関数として再作成
CREATE OR REPLACE FUNCTION create_invite_link(
    p_user_id UUID,
    p_description TEXT DEFAULT 'マイ紹介リンク'
)
RETURNS JSON AS $$
DECLARE
    v_link_code TEXT;
    v_result JSON;
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
    
    -- リンクを作成
    INSERT INTO invite_links (created_by, link_code, description, is_active)
    VALUES (p_user_id, v_link_code, p_description, true);
    
    -- 結果をJSONで返す
    SELECT json_build_object(
        'success', true,
        'link_code', v_link_code,
        'description', p_description,
        'full_url', 'https://interconnect-system.netlify.app/register?ref=' || v_link_code
    ) INTO v_result;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 権限付与
GRANT EXECUTE ON FUNCTION create_invite_link(UUID, TEXT) TO authenticated;

-- 4. テスト（デバッグ用）
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'create_invite_link';