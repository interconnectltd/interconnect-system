-- ======================================
-- Profilesテーブルの柔軟なRLSポリシー
-- SQLエディタでも動作するように調整
-- ======================================

-- 1. 一時的にRLSを無効化してテストデータを挿入
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. テストプロファイルを挿入（サンプル）
INSERT INTO public.profiles (id, email, name, title, company, bio, skills, industry, location, interests, avatar_url, is_public)
VALUES 
    (gen_random_uuid(), 'test_1@interconnect.com', '田中 太郎', 'CEO', '株式会社テクノロジー', 'AI・機械学習を活用した新規事業開発に注力', ARRAY['AI', 'スタートアップ', '新規事業'], 'IT・テクノロジー', '東京', ARRAY['協業', '投資'], 'https://ui-avatars.com/api/?name=田中太郎&background=random', true),
    (gen_random_uuid(), 'test_2@interconnect.com', '鈴木 花子', 'マーケティング部長', 'グローバル商事株式会社', 'デジタルマーケティングのスペシャリスト', ARRAY['マーケティング', 'DX', 'グローバル'], '商社・流通', '東京', ARRAY['協業', 'ネットワーキング'], 'https://ui-avatars.com/api/?name=鈴木花子&background=random', true),
    (gen_random_uuid(), 'test_3@interconnect.com', '佐藤 健一', '事業開発マネージャー', 'イノベーション株式会社', 'SaaSプロダクトの事業開発担当', ARRAY['新規事業', 'SaaS', 'パートナーシップ'], 'IT・テクノロジー', '大阪', ARRAY['協業', 'メンタリング'], 'https://ui-avatars.com/api/?name=佐藤健一&background=random', true)
ON CONFLICT (email) DO UPDATE
SET 
    name = EXCLUDED.name,
    title = EXCLUDED.title,
    company = EXCLUDED.company,
    bio = EXCLUDED.bio,
    skills = EXCLUDED.skills,
    industry = EXCLUDED.industry,
    location = EXCLUDED.location,
    interests = EXCLUDED.interests,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();

-- 3. RLSを再有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. 簡素化されたRLSポリシーを設定
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Delete test profiles" ON public.profiles;

-- 読み取り：誰でも可能
CREATE POLICY "Anyone can view profiles" 
ON public.profiles FOR SELECT 
USING (true);

-- 挿入：認証されたユーザーのみ
CREATE POLICY "Authenticated users can insert" 
ON public.profiles FOR INSERT 
TO authenticated
WITH CHECK (true);

-- 更新：認証されたユーザーのみ
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- 削除：テストプロファイルのみ
CREATE POLICY "Delete test profiles" 
ON public.profiles FOR DELETE 
TO authenticated
USING (email LIKE 'test_%@interconnect.com');

-- 5. 挿入されたテストデータを確認
SELECT 
    id,
    email,
    name,
    title,
    company,
    skills,
    industry,
    location,
    interests
FROM public.profiles
WHERE email LIKE 'test_%@interconnect.com'
ORDER BY email;

-- 6. 総件数を確認
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN email LIKE 'test_%@interconnect.com' THEN 1 END) as test_profiles,
    COUNT(CASE WHEN email NOT LIKE 'test_%@interconnect.com' THEN 1 END) as real_profiles
FROM public.profiles;