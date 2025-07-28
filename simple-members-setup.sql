-- ======================================
-- シンプルなメンバーページセットアップ
-- 最小限の設定でエラーを回避
-- ======================================

-- 1. 基本的な列の追加（一つずつ実行）
ALTER TABLE public.active_users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.active_users ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.active_users ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.active_users ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE public.active_users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE public.active_users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- 2. データの初期化
UPDATE public.active_users 
SET full_name = name 
WHERE full_name IS NULL AND name IS NOT NULL;

-- 3. サンプルスキルの設定
UPDATE public.active_users
SET skills = ARRAY['ビジネス', 'コミュニケーション']
WHERE skills IS NULL OR array_length(skills, 1) = 0
LIMIT 10;

-- 4. 一部のユーザーをオンラインに設定
UPDATE public.active_users
SET is_online = true
WHERE id IN (
    SELECT id FROM public.active_users 
    WHERE is_active = true 
    ORDER BY last_login_at DESC NULLS LAST
    LIMIT 5
);

-- 5. 結果の確認
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active THEN 1 END) as active_users,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as with_full_name,
    COUNT(CASE WHEN skills IS NOT NULL THEN 1 END) as with_skills,
    COUNT(CASE WHEN is_online THEN 1 END) as online_now
FROM public.active_users;