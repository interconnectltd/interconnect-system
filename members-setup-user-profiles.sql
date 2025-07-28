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
-- connection_countとmessage_countは実際に存在するか確認してから含める
CREATE OR REPLACE VIEW public.members_view AS
SELECT 
    up.id,
    up.email,
    COALESCE(up.full_name, up.name) as full_name,
    up.name,
    up.company,
    up.position,
    up.title,
    up.industry,
    up.skills,
    up.bio,
    up.avatar_url,
    up.is_online,
    up.is_active,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'user_profiles' 
                     AND column_name = 'connection_count') 
        THEN up.connection_count 
        ELSE 0 
    END as connection_count,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'user_profiles' 
                     AND column_name = 'message_count') 
        THEN up.message_count 
        ELSE 0 
    END as message_count,
    up.last_login_at,
    up.created_at
FROM public.user_profiles up
WHERE up.is_active = true;