-- ======================================
-- Profilesテーブルに不足しているカラムを追加
-- ======================================

-- 1. 会社名カラムを追加
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company TEXT;

-- 2. 役職カラムを追加
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS title TEXT;

-- 3. スキル配列カラムを追加
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS skills TEXT[];

-- 4. 業界カラムを追加
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS industry TEXT;

-- 5. 地域カラムを追加
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS location TEXT;

-- 6. 興味・関心配列カラムを追加
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS interests TEXT[];

-- 7. 公開設定カラムを追加（デフォルトはtrue）
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- 8. 最終アクティブ日時カラムを追加
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

-- 9. インデックスを追加（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS profiles_company_idx ON public.profiles(company);
CREATE INDEX IF NOT EXISTS profiles_title_idx ON public.profiles(title);
CREATE INDEX IF NOT EXISTS profiles_industry_idx ON public.profiles(industry);
CREATE INDEX IF NOT EXISTS profiles_location_idx ON public.profiles(location);
CREATE INDEX IF NOT EXISTS profiles_is_public_idx ON public.profiles(is_public);
CREATE INDEX IF NOT EXISTS profiles_last_active_at_idx ON public.profiles(last_active_at);

-- 10. GINインデックスを追加（配列検索の高速化）
CREATE INDEX IF NOT EXISTS profiles_skills_gin_idx ON public.profiles USING GIN (skills);
CREATE INDEX IF NOT EXISTS profiles_interests_gin_idx ON public.profiles USING GIN (interests);

-- 11. カラムが正常に追加されたか確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
    AND column_name IN ('company', 'title', 'skills', 'industry', 'location', 'interests', 'is_public', 'last_active_at')
ORDER BY ordinal_position;

-- 12. サンプルデータを確認（デバッグ用）
SELECT 
    id,
    email,
    name,
    company,
    title,
    skills,
    industry,
    location,
    interests
FROM public.profiles
LIMIT 5;