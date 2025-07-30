-- ======================================
-- ProfilesテーブルのRLSポリシーを完璧に修正
-- テスト環境と本番環境両方に対応
-- ======================================

-- 0. トランザクション開始
BEGIN;

-- 1. すべての既存ポリシーを削除
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete test profiles" ON public.profiles;

-- 2. SELECTポリシー（全ユーザー共通）
CREATE POLICY "profiles_select_policy" 
ON public.profiles 
FOR SELECT 
USING (
    is_public = true 
    OR auth.uid() = id 
    OR auth.jwt() ->> 'email' = 'ooxmichaelxoo@gmail.com' -- 管理者
);

-- 3. INSERTポリシー（本番とテストを区別）
CREATE POLICY "profiles_insert_policy" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (
    -- 自分自身のプロファイル
    auth.uid() = id 
    -- またはテストユーザー（管理者のみ）
    OR (
        email LIKE 'test_%@interconnect.com' 
        AND auth.jwt() ->> 'email' = 'ooxmichaelxoo@gmail.com'
    )
);

-- 4. UPDATEポリシー
CREATE POLICY "profiles_update_policy" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
    -- 自分自身のプロファイル
    auth.uid() = id 
    -- またはテストユーザー（管理者のみ）
    OR (
        email LIKE 'test_%@interconnect.com' 
        AND auth.jwt() ->> 'email' = 'ooxmichaelxoo@gmail.com'
    )
)
WITH CHECK (
    -- 自分自身のプロファイル
    auth.uid() = id 
    -- またはテストユーザー（管理者のみ）
    OR (
        email LIKE 'test_%@interconnect.com' 
        AND auth.jwt() ->> 'email' = 'ooxmichaelxoo@gmail.com'
    )
);

-- 5. DELETEポリシー（テストデータのみ）
CREATE POLICY "profiles_delete_policy" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (
    -- テストユーザーのみ（管理者のみ削除可能）
    email LIKE 'test_%@interconnect.com' 
    AND auth.jwt() ->> 'email' = 'ooxmichaelxoo@gmail.com'
);

-- 6. auth.usersとの整合性を保つためのトリガーを再作成
CREATE OR REPLACE FUNCTION public.handle_auth_user_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- auth.usersが削除されたら対応するprofilesも削除
    DELETE FROM public.profiles WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存のトリガーを削除して再作成
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
    BEFORE DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_delete();

-- 7. インデックスの最適化
-- パフォーマンス向上のための追加インデックス
CREATE INDEX IF NOT EXISTS profiles_email_pattern_idx ON public.profiles(email text_pattern_ops);
CREATE INDEX IF NOT EXISTS profiles_auth_id_idx ON public.profiles(id);

-- 8. ポリシーの検証
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND schemaname = 'public';
    
    IF policy_count = 4 THEN
        RAISE NOTICE 'RLSポリシーが正常に設定されました: %件', policy_count;
    ELSE
        RAISE EXCEPTION 'RLSポリシーの数が不正です: %件', policy_count;
    END IF;
END $$;

-- 9. 現在の設定を表示
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN length(qual) > 50 THEN substring(qual, 1, 47) || '...'
        ELSE qual
    END as qual_preview,
    CASE 
        WHEN length(with_check) > 50 THEN substring(with_check, 1, 47) || '...'
        ELSE with_check
    END as check_preview
FROM pg_policies 
WHERE tablename = 'profiles' 
AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 10. テストクエリ
SELECT 
    '現在のユーザー:' as info,
    auth.uid() as user_id,
    auth.jwt() ->> 'email' as email,
    CASE 
        WHEN auth.jwt() ->> 'email' = 'ooxmichaelxoo@gmail.com' THEN '管理者'
        ELSE '一般ユーザー'
    END as role;

-- 11. コミット
COMMIT;

-- 12. 使用例と注意事項
COMMENT ON POLICY "profiles_insert_policy" ON public.profiles IS '
INSERTポリシー:
- 通常のユーザー: 自分のIDと一致するプロファイルのみ作成可能
- 管理者 (ooxmichaelxoo@gmail.com): test_*@interconnect.com のテストプロファイルも作成可能
';

-- 13. ロールバック用SQLをコメントで追加
/*
-- 本番環境用の厳格なRLSポリシーに戻す場合:

BEGIN;

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

CREATE POLICY "profiles_insert_policy_strict" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

COMMIT;
*/