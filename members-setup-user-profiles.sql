-- ======================================
-- メンバーページセットアップ（user_profilesテーブル用）
-- active_usersはビューなので、実際のテーブルを使用
-- ======================================

-- 1. まず実際のテーブルを確認
SELECT COUNT(*) as user_profiles_count FROM public.user_profiles;

-- 2. user_profilesテーブルに必要な列を追加
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- 3. full_nameを設定
UPDATE public.user_profiles 
SET full_name = COALESCE(full_name, name)
WHERE full_name IS NULL;

-- 4. 基本的なスキルを設定（最初の10人）
UPDATE public.user_profiles
SET skills = ARRAY['ビジネス', 'コミュニケーション']
WHERE id IN (
    SELECT id 
    FROM public.user_profiles
    WHERE skills IS NULL
    AND is_active = true
    ORDER BY created_at DESC
    LIMIT 10
);

-- 5. オンラインステータスを設定（最近ログインした5人）
UPDATE public.user_profiles
SET is_online = true
WHERE id IN (
    SELECT id 
    FROM public.user_profiles
    WHERE is_active = true
    ORDER BY last_login_at DESC NULLS LAST
    LIMIT 5
);

-- 6. 役職の設定
UPDATE public.user_profiles
SET title = position
WHERE title IS NULL AND position IS NOT NULL;

-- 7. 結果確認
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active THEN 1 END) as active_users,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as with_full_name,
    COUNT(CASE WHEN skills IS NOT NULL THEN 1 END) as with_skills,
    COUNT(CASE WHEN is_online THEN 1 END) as online_now
FROM public.user_profiles;

-- 8. JavaScriptコードで使用するためのビューを作成（オプション）
CREATE OR REPLACE VIEW public.members_view AS
SELECT 
    id,
    email,
    COALESCE(full_name, name) as full_name,
    name,
    company,
    position,
    title,
    industry,
    skills,
    bio,
    avatar_url,
    is_online,
    is_active,
    connection_count,
    message_count,
    last_login_at,
    created_at
FROM public.user_profiles
WHERE is_active = true;