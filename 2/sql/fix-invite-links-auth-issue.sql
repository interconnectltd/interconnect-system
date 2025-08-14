-- invite_linksテーブルのauth.uid()問題を修正

-- 1. 現在のauth.uid()を確認
SELECT auth.uid() as current_auth_uid;

-- 2. invite_linksテーブルの構造を確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'invite_links'
ORDER BY ordinal_position;

-- 3. auth.uid()がnullの場合の対処法
-- テスト用：特定のユーザーIDで直接テスト
DO $$
DECLARE
    v_test_user_id UUID;
    v_link_code TEXT;
BEGIN
    -- profilesテーブルから最初のユーザーIDを取得
    SELECT id INTO v_test_user_id
    FROM profiles
    LIMIT 1;
    
    IF v_test_user_id IS NULL THEN
        RAISE NOTICE 'ユーザーが見つかりません';
        RETURN;
    END IF;
    
    RAISE NOTICE 'テストユーザーID: %', v_test_user_id;
    
    -- リンクコード生成
    v_link_code := 'TEST-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 4);
    
    -- 直接INSERTを試みる
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
            v_test_user_id,
            v_link_code,
            'auth.uid()テスト用リンク',
            true,
            NULL,
            0
        );
        
        RAISE NOTICE 'リンクを作成しました: %', v_link_code;
        
        -- 作成されたデータを確認
        PERFORM * FROM invite_links 
        WHERE link_code = v_link_code;
        
        RAISE NOTICE '作成確認完了';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'エラー: % - %', SQLERRM, SQLSTATE;
    END;
END $$;

-- 4. SECURITY DEFINER関数を修正（auth.uid()の代わりにパラメータを使用）
CREATE OR REPLACE FUNCTION create_invite_link_fixed(
    p_user_id UUID,
    p_description TEXT DEFAULT 'マイ紹介リンク'
)
RETURNS JSON AS $$
DECLARE
    v_link_code TEXT;
    v_link_id UUID;
    v_result JSON;
BEGIN
    -- ユーザーIDがnullの場合はエラー
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'ユーザーIDが指定されていません';
    END IF;
    
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
    
    -- リンクを作成（デフォルト値を明示的に設定）
    INSERT INTO invite_links (
        created_by, 
        link_code, 
        description, 
        is_active,
        max_uses,
        used_count,
        expires_at
    )
    VALUES (
        p_user_id,
        v_link_code,
        p_description,
        true,
        NULL,  -- max_uses
        0,     -- used_count
        NULL   -- expires_at
    )
    RETURNING id INTO v_link_id;
    
    -- 作成されたリンクの情報を取得
    SELECT json_build_object(
        'success', true,
        'id', id,
        'link_code', link_code,
        'description', description,
        'full_url', 'https://interconnect-auto-test.netlify.app/register?ref=' || link_code,
        'created_at', created_at
    ) INTO v_result
    FROM invite_links
    WHERE id = v_link_id;
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 権限付与
GRANT EXECUTE ON FUNCTION create_invite_link_fixed TO authenticated;

-- 5. 直接取得用の関数も作成
CREATE OR REPLACE FUNCTION get_my_invite_links(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    created_by UUID,
    link_code TEXT,
    description TEXT,
    max_uses INTEGER,
    used_count INTEGER,
    is_active BOOLEAN,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'ユーザーIDが指定されていません';
    END IF;
    
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
        il.created_at
    FROM invite_links il
    WHERE il.created_by = p_user_id
    ORDER BY il.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_my_invite_links TO authenticated;

-- 6. 既存の関数名を変更（競合を避けるため）
DROP FUNCTION IF EXISTS create_invite_link(UUID, TEXT);
DROP FUNCTION IF EXISTS create_invite_link(UUID, TEXT, INTEGER);

-- 7. 新しい名前で関数を作成
ALTER FUNCTION create_invite_link_fixed(UUID, TEXT) RENAME TO create_invite_link;

-- 8. テスト：現在のユーザーでリンク作成
-- ※この部分は実際のユーザーIDを使用してテストしてください
/*
SELECT create_invite_link(
    'c0b97b9e-4c33-4cec-a393-5c2d20998cf9'::UUID,  -- あなたのユーザーID
    '修正版テストリンク'
);
*/

-- 9. デバッグ情報を表示
SELECT 
    'invite_links total records' as info,
    COUNT(*)::TEXT as value
FROM invite_links
UNION ALL
SELECT 
    'auth.uid() value' as info,
    COALESCE(auth.uid()::TEXT, 'NULL') as value;