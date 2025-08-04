-- create_invite_link関数の修正
-- リンクIDではなく、完全なリンクデータを返すように修正

DROP FUNCTION IF EXISTS create_invite_link(UUID, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION create_invite_link(
    p_user_id UUID,
    p_description TEXT DEFAULT NULL,
    p_max_uses INTEGER DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    link_code VARCHAR(20),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_link_code TEXT;
    v_link_id UUID;
BEGIN
    -- ユニークなコードを生成
    LOOP
        v_link_code := generate_invite_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM invite_links WHERE link_code = v_link_code);
    END LOOP;
    
    -- リンクを作成して結果を返す
    RETURN QUERY
    INSERT INTO invite_links (created_by, link_code, description, max_uses)
    VALUES (p_user_id, v_link_code, p_description, p_max_uses)
    RETURNING 
        invite_links.id,
        invite_links.link_code,
        invite_links.description,
        invite_links.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 権限を付与
GRANT EXECUTE ON FUNCTION create_invite_link TO authenticated;

-- テスト用: invite_linksテーブルの内容を確認
-- SELECT * FROM invite_links ORDER BY created_at DESC;