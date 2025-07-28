-- ======================================
-- Profilesテーブルの最終修正版
-- 既存の構造を考慮した安全な更新
-- ======================================

-- 0. 現在のテーブル構造を確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles';

-- 1. 必要な列を安全に追加（既存の列はスキップ）
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT[],
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS line_id TEXT,
ADD COLUMN IF NOT EXISTS line_qr_url TEXT,
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- 2. display_nameまたはnameをfull_nameにコピー
UPDATE public.profiles 
SET full_name = COALESCE(full_name, display_name, name, email)
WHERE full_name IS NULL;

-- 3. シンプルなインデックスを追加（GINインデックスは最小限に）
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON public.profiles(company);
CREATE INDEX IF NOT EXISTS idx_profiles_industry ON public.profiles(industry);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON public.profiles(is_online);

-- 4. 既存のデータを活用してサンプルデータを更新
DO $$
DECLARE
    profile_record RECORD;
    counter INTEGER := 0;
BEGIN
    -- 既存のプロフィールを更新
    FOR profile_record IN 
        SELECT id FROM public.profiles 
        WHERE full_name IS NULL OR company IS NULL 
        LIMIT 10
    LOOP
        counter := counter + 1;
        
        UPDATE public.profiles
        SET 
            full_name = CASE 
                WHEN counter = 1 THEN '山田 太郎'
                WHEN counter = 2 THEN '佐藤 花子'
                WHEN counter = 3 THEN '高橋 健一'
                WHEN counter = 4 THEN '伊藤 美咲'
                WHEN counter = 5 THEN '渡辺 裕太'
                ELSE 'サンプルユーザー ' || counter
            END,
            company = CASE 
                WHEN counter = 1 THEN '株式会社テックイノベーション'
                WHEN counter = 2 THEN 'グローバルコマース株式会社'
                WHEN counter = 3 THEN 'デジタルソリューションズ'
                WHEN counter = 4 THEN 'タレントマネジメント株式会社'
                WHEN counter = 5 THEN 'セールスフォース株式会社'
                ELSE 'サンプル企業 ' || counter
            END,
            title = CASE 
                WHEN counter = 1 THEN '代表取締役CEO'
                WHEN counter = 2 THEN 'マーケティング部長'
                WHEN counter = 3 THEN 'CTO'
                WHEN counter = 4 THEN '人事部長'
                WHEN counter = 5 THEN '営業本部長'
                ELSE '部長'
            END,
            industry = CASE 
                WHEN counter % 3 = 0 THEN 'IT・テクノロジー'
                WHEN counter % 3 = 1 THEN '金融・保険'
                ELSE '製造業'
            END,
            role = CASE 
                WHEN counter <= 2 THEN 'executive'
                WHEN counter <= 5 THEN 'manager'
                ELSE 'specialist'
            END,
            skills = CASE 
                WHEN counter = 1 THEN ARRAY['IT', 'AI', 'DX推進']
                WHEN counter = 2 THEN ARRAY['マーケティング', 'EC', 'グローバル']
                WHEN counter = 3 THEN ARRAY['開発', 'クラウド', 'DevOps']
                WHEN counter = 4 THEN ARRAY['人材開発', '採用', '組織開発']
                WHEN counter = 5 THEN ARRAY['営業戦略', 'BtoB', 'CRM']
                ELSE ARRAY['ビジネス', 'コミュニケーション']
            END,
            bio = COALESCE(bio, 'プロフィール準備中です。'),
            is_online = (counter % 2 = 1)
        WHERE id = profile_record.id;
    END LOOP;
    
    RAISE NOTICE 'Updated % profiles with sample data', counter;
END $$;

-- 5. 統計情報の確認
SELECT 
    COUNT(*) as total_profiles,
    COUNT(full_name) as with_full_name,
    COUNT(company) as with_company,
    COUNT(skills) as with_skills,
    COUNT(CASE WHEN is_online THEN 1 END) as online_count
FROM public.profiles;

-- 6. サンプルデータの確認（最初の5件）
SELECT 
    id,
    full_name,
    company,
    title,
    industry,
    role,
    skills,
    is_online
FROM public.profiles
WHERE full_name IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;