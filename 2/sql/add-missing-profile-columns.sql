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

-- 12. RLSポリシーの更新（新しいカラムを含めるため）
-- 既存のポリシーを削除して再作成
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (is_public = true OR auth.uid() = id);

-- 13. 更新時に last_active_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION public.update_last_active_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 既存のトリガーを削除して再作成
DROP TRIGGER IF EXISTS update_profiles_last_active ON public.profiles;
CREATE TRIGGER update_profiles_last_active
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_last_active_at();

-- 14. 全文検索用のインデックスを追加（pg_trgmエクステンションが必要）
-- まずエクステンションを有効化
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- その後インデックスを作成
CREATE INDEX IF NOT EXISTS profiles_name_trgm_idx ON public.profiles USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_company_trgm_idx ON public.profiles USING gin (company gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_bio_trgm_idx ON public.profiles USING gin (bio gin_trgm_ops);

-- 15. デフォルト値の設定（既存レコード用）
UPDATE public.profiles 
SET 
    is_public = COALESCE(is_public, true),
    last_active_at = COALESCE(last_active_at, updated_at, created_at, NOW()),
    skills = COALESCE(skills, ARRAY[]::TEXT[]),
    interests = COALESCE(interests, ARRAY[]::TEXT[])
WHERE is_public IS NULL 
    OR last_active_at IS NULL 
    OR skills IS NULL 
    OR interests IS NULL;

-- 16. サンプルデータを確認（デバッグ用）
SELECT 
    id,
    email,
    name,
    company,
    title,
    skills,
    industry,
    location,
    interests,
    is_public,
    last_active_at
FROM public.profiles
LIMIT 5;

-- 17. テーブル統計情報を更新（パフォーマンス最適化）
ANALYZE public.profiles;