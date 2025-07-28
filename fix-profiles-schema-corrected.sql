-- ======================================
-- Profilesテーブルのスキーマ修正（エラー修正版）
-- メンバーページで必要な列を追加
-- ======================================

-- 1. 既存のprofilesテーブルに必要な列を追加
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

-- 2. 既存のnameをfull_nameにコピー（データの整合性のため）
UPDATE public.profiles 
SET full_name = name 
WHERE full_name IS NULL AND name IS NOT NULL;

-- 3. インデックスを追加（日本語検索設定なしのシンプル版）
CREATE INDEX IF NOT EXISTS profiles_full_name_idx ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS profiles_company_idx ON public.profiles(company);
CREATE INDEX IF NOT EXISTS profiles_industry_idx ON public.profiles(industry);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_skills_idx ON public.profiles USING gin(skills);
CREATE INDEX IF NOT EXISTS profiles_is_online_idx ON public.profiles(is_online);

-- 4. 最初にサンプルユーザーをauth.usersに作成（既存のユーザーがない場合）
DO $$
DECLARE
    sample_user_id UUID;
BEGIN
    -- 既存のユーザーをチェック
    SELECT id INTO sample_user_id FROM auth.users LIMIT 1;
    
    -- ユーザーが存在しない場合はサンプルを作成
    IF sample_user_id IS NULL THEN
        -- Supabaseの管理画面からユーザーを作成することを推奨
        RAISE NOTICE 'auth.usersにユーザーが存在しません。Supabase管理画面からユーザーを作成してください。';
    END IF;
END $$;

-- 5. サンプルデータを挿入（既存のユーザーIDを使用）
DO $$
DECLARE
    existing_user_id UUID;
    new_profile_id UUID;
BEGIN
    -- 既存のユーザーIDを取得
    SELECT id INTO existing_user_id FROM auth.users LIMIT 1;
    
    IF existing_user_id IS NOT NULL THEN
        -- 既存のプロフィールを更新またはサンプルデータを挿入
        INSERT INTO public.profiles (
            id, email, name, full_name, company, title, industry, role, skills, bio, avatar_url, is_online
        ) VALUES 
        -- 既存ユーザーのプロフィールを更新
        (existing_user_id, 
         (SELECT email FROM auth.users WHERE id = existing_user_id),
         '山田太郎', '山田太郎', '株式会社テックイノベーション', '代表取締役CEO', 'IT・テクノロジー', 'executive', 
         ARRAY['IT', 'AI', 'DX推進'], 'テクノロジーで社会課題を解決することを目指しています。', 'assets/user-placeholder.svg', true)
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            company = EXCLUDED.company,
            title = EXCLUDED.title,
            industry = EXCLUDED.industry,
            role = EXCLUDED.role,
            skills = EXCLUDED.skills,
            bio = EXCLUDED.bio,
            is_online = EXCLUDED.is_online;
    END IF;
    
    -- 追加のサンプルプロフィール（IDは自動生成）
    INSERT INTO public.profiles (
        id, email, name, full_name, company, title, industry, role, skills, bio, avatar_url, is_online
    ) VALUES 
    (gen_random_uuid(), 'sato@example.com', '佐藤花子', '佐藤花子', 'グローバルコマース株式会社', 'マーケティング部長', '小売・流通', 'manager', 
     ARRAY['マーケティング', 'EC', 'グローバル'], '国際的なマーケティング戦略の立案・実行を担当しています。', 'assets/user-placeholder.svg', false),
    
    (gen_random_uuid(), 'takahashi@example.com', '高橋健一', '高橋健一', 'デジタルソリューションズ', 'CTO', 'IT・テクノロジー', 'executive', 
     ARRAY['開発', 'クラウド', 'DevOps'], 'クラウドネイティブなシステム開発を専門としています。', 'assets/user-placeholder.svg', true),
    
    (gen_random_uuid(), 'ito@example.com', '伊藤美咲', '伊藤美咲', 'タレントマネジメント株式会社', '人事部長', '人材・教育', 'manager', 
     ARRAY['人材開発', '採用', '組織開発'], '人と組織の成長をサポートすることが私の使命です。', 'assets/user-placeholder.svg', false)
    
    ON CONFLICT (id) DO NOTHING;
END $$;

-- 6. 統計確認
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as profiles_with_name,
    COUNT(CASE WHEN company IS NOT NULL THEN 1 END) as profiles_with_company,
    COUNT(CASE WHEN industry IS NOT NULL THEN 1 END) as profiles_with_industry,
    COUNT(CASE WHEN skills IS NOT NULL AND array_length(skills, 1) > 0 THEN 1 END) as profiles_with_skills
FROM public.profiles;

-- 7. 必要に応じて既存のprofilesテーブルの構造を確認
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY 
    ordinal_position;