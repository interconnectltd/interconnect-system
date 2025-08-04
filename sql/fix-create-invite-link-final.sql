-- invite_links作成関数の最終修正版
-- auth.uid()に依存しない実装

-- 1. 既存の関数をすべて削除
DROP FUNCTION IF EXISTS create_invite_link(UUID);
DROP FUNCTION IF EXISTS create_invite_link(UUID, TEXT);
DROP FUNCTION IF EXISTS create_invite_link(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS create_invite_link_fixed(UUID, TEXT);

-- 2. 新しい関数を作成（JSONを返す）
CREATE OR REPLACE FUNCTION create_invite_link(
    p_user_id UUID,
    p_description TEXT DEFAULT 'マイ紹介リンク'
)
RETURNS JSON AS $$
DECLARE
    v_link_code TEXT;
    v_link_id UUID;
    v_result JSON;
BEGIN
    -- ユーザーIDの検証
    IF p_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'ユーザーIDが指定されていません'
        );
    END IF;
    
    -- ユーザーが存在するか確認
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'ユーザーが存在しません'
        );
    END IF;
    
    -- ユニークなリンクコードを生成
    LOOP
        v_link_code := UPPER(
            SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 4) || '-' ||
            SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 5, 4)
        );
        
        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM invite_links WHERE link_code = v_link_code
        );
    END LOOP;
    
    -- リンクを作成
    BEGIN
        INSERT INTO invite_links (
            created_by, 
            link_code, 
            description, 
            is_active,
            max_uses,
            used_count
        )
        VALUES (
            p_user_id,
            v_link_code,
            p_description,
            true,
            NULL,
            0
        )
        RETURNING id INTO v_link_id;
        
        -- 作成されたリンクの情報を返す
        SELECT json_build_object(
            'success', true,
            'id', id,
            'link_code', link_code,
            'description', description,
            'full_url', 'https://interconnect-auto-test.netlify.app/register?ref=' || link_code,
            'created_at', created_at,
            'created_by', created_by
        ) INTO v_result
        FROM invite_links
        WHERE id = v_link_id;
        
        RETURN v_result;
        
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'hint', 'created_by: ' || p_user_id::TEXT
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 権限付与
GRANT EXECUTE ON FUNCTION create_invite_link TO authenticated;
GRANT EXECUTE ON FUNCTION create_invite_link TO anon;

-- 4. リンク取得用の関数も作成
CREATE OR REPLACE FUNCTION get_user_invite_links(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    created_by UUID,
    link_code TEXT,
    description TEXT,
    max_uses INTEGER,
    used_count INTEGER,
    is_active BOOLEAN,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    registration_count BIGINT,
    completion_count BIGINT,
    total_rewards_earned BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        il.id,
        il.created_by,
        il.link_code,
        il.description,
        il.max_uses,
        il.used_count,
        il.is_active,
        il.expires_at,
        il.created_at,
        COUNT(DISTINCT CASE WHEN i.id IS NOT NULL THEN i.id END) as registration_count,
        COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) as completion_count,
        COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) * 1000 as total_rewards_earned
    FROM invite_links il
    LEFT JOIN invitations i ON i.invitation_code = il.link_code
    WHERE il.created_by = p_user_id
    GROUP BY il.id, il.created_by, il.link_code, il.description, 
             il.max_uses, il.used_count, il.is_active, il.expires_at, il.created_at
    ORDER BY il.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_invite_links TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_invite_links TO anon;

-- 5. テスト実行（あなたのユーザーIDで実行してください）
-- 実行例：
/*
SELECT create_invite_link(
    'c0b97b9e-4c33-4cec-a393-5c2d20998cf9'::UUID,
    'SQLエディタからのテスト'
);

SELECT * FROM get_user_invite_links('c0b97b9e-4c33-4cec-a393-5c2d20998cf9'::UUID);
*/

-- 6. 既存のデータを確認
SELECT 
    id,
    created_by,
    link_code,
    description,
    is_active,
    created_at
FROM invite_links
ORDER BY created_at DESC
LIMIT 10;

-- 7. ユーザーごとのリンク数を確認
SELECT 
    p.email,
    p.name,
    COUNT(il.id) as link_count
FROM profiles p
LEFT JOIN invite_links il ON il.created_by = p.id
GROUP BY p.id, p.email, p.name
ORDER BY link_count DESC;