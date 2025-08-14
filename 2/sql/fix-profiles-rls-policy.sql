-- ======================================
-- ProfilesテーブルのRLSポリシーを修正
-- テストデータを挿入できるようにする
-- ======================================

-- 1. 既存のINSERTポリシーを削除
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 2. より柔軟なINSERTポリシーを作成
-- ログインしているユーザーは任意のプロファイルを作成できる
-- （テスト環境用）
CREATE POLICY "Authenticated users can insert profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- 3. UPDATEポリシーも更新（テスト用）
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id OR auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = id OR auth.uid() IS NOT NULL);

-- 4. DELETEポリシーも追加（テストデータのクリーンアップ用）
CREATE POLICY "Users can delete test profiles" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (email LIKE 'test_%@interconnect.com');

-- 5. 現在のポリシーを確認
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
    AND schemaname = 'public'
ORDER BY policyname;

-- 6. テスト: 現在のユーザーIDを確認
SELECT auth.uid() as current_user_id;

-- 7. 注意: 本番環境ではより厳格なポリシーを設定すること
-- 例:
-- CREATE POLICY "Users can only insert their own profile" 
-- ON public.profiles 
-- FOR INSERT 
-- WITH CHECK (auth.uid() = id);