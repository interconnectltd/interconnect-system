-- ======================================
-- 最小限のメンバーページセットアップ
-- エラーを最小化した安全な実装
-- ======================================

-- ステップ1: 必要な列を一つずつ追加
ALTER TABLE public.active_users ADD COLUMN IF NOT EXISTS full_name TEXT;

-- ステップ2: full_nameを設定
UPDATE public.active_users SET full_name = name WHERE full_name IS NULL;

-- ステップ3: その他の列を追加
ALTER TABLE public.active_users ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.active_users ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.active_users ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE public.active_users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- ステップ4: 基本的なデータ設定
-- 最初の5人をオンラインに
UPDATE public.active_users
SET is_online = true
WHERE id IN (
    SELECT id FROM public.active_users 
    WHERE is_active = true 
    ORDER BY COALESCE(last_login_at, created_at) DESC
    LIMIT 5
);

-- ステップ5: 基本的なスキルを設定
UPDATE public.active_users
SET skills = ARRAY['ビジネス']
WHERE id IN (
    SELECT id FROM public.active_users
    WHERE skills IS NULL
    AND is_active = true
    LIMIT 20
);

-- ステップ6: 確認
SELECT 
    'Setup Complete' as status,
    COUNT(*) as total_active_users,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as users_with_name,
    COUNT(CASE WHEN is_online THEN 1 END) as online_users,
    COUNT(CASE WHEN skills IS NOT NULL THEN 1 END) as users_with_skills
FROM public.active_users
WHERE is_active = true;