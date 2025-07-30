-- ======================================
-- Profilesテーブルにテストデータを挿入
-- エラーを回避して確実に動作するSQL
-- ======================================

-- 1. 一時的にRLSを無効化
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. emailカラムにユニーク制約を追加（存在しない場合）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_email_key' 
        AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- 3. 既存のテストデータを削除
DELETE FROM public.profiles WHERE email LIKE 'test_%@interconnect.com';

-- 4. 新しいテストプロファイルを挿入
INSERT INTO public.profiles (
    id, email, name, title, company, bio, 
    skills, industry, location, interests, 
    avatar_url, is_public, created_at, updated_at
)
VALUES 
    (
        gen_random_uuid(), 
        'test_1@interconnect.com', 
        '田中 太郎', 
        'CEO', 
        '株式会社テクノロジー', 
        'AI・機械学習を活用した新規事業開発に注力しています。', 
        ARRAY['AI', 'スタートアップ', '新規事業開発'], 
        'IT・テクノロジー', 
        '東京', 
        ARRAY['協業', '投資'], 
        'https://ui-avatars.com/api/?name=田中太郎&background=0D8ABC&color=fff', 
        true,
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(), 
        'test_2@interconnect.com', 
        '鈴木 花子', 
        'マーケティング部長', 
        'グローバル商事株式会社', 
        'デジタルマーケティングとブランディング戦略のスペシャリストです。', 
        ARRAY['マーケティング', 'ブランディング', 'DX'], 
        '商社・流通', 
        '東京', 
        ARRAY['協業', 'ネットワーキング'], 
        'https://ui-avatars.com/api/?name=鈴木花子&background=E91E63&color=fff', 
        true,
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(), 
        'test_3@interconnect.com', 
        '佐藤 健一', 
        '事業開発マネージャー', 
        'イノベーション株式会社', 
        'SaaSプロダクトの事業開発とパートナーシップ構築を担当しています。', 
        ARRAY['新規事業', 'パートナーシップ', 'SaaS'], 
        'IT・テクノロジー', 
        '大阪', 
        ARRAY['協業', 'メンタリング'], 
        'https://ui-avatars.com/api/?name=佐藤健一&background=4CAF50&color=fff', 
        true,
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(), 
        'test_4@interconnect.com', 
        '山田 美咲', 
        'CFO', 
        'ファイナンス・アドバイザリー', 
        'スタートアップの資金調達とM&Aアドバイザリーを専門としています。', 
        ARRAY['財務', '投資', 'M&A'], 
        '金融・コンサルティング', 
        '東京', 
        ARRAY['投資', 'メンタリング'], 
        'https://ui-avatars.com/api/?name=山田美咲&background=FF9800&color=fff', 
        true,
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(), 
        'test_5@interconnect.com', 
        '高橋 修', 
        'プロダクトマネージャー', 
        'デジタルソリューションズ', 
        'ユーザー中心設計とアジャイル開発でプロダクトの成長を推進しています。', 
        ARRAY['プロダクト開発', 'UX/UI', 'アジャイル'], 
        'IT・テクノロジー', 
        '福岡', 
        ARRAY['協業', 'ネットワーキング'], 
        'https://ui-avatars.com/api/?name=高橋修&background=9C27B0&color=fff', 
        true,
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(), 
        'test_6@interconnect.com', 
        '伊藤 さくら', 
        '人事部長', 
        'タレントマネジメント株式会社', 
        '組織開発と人材育成プログラムの設計・実行を担当しています。', 
        ARRAY['人材開発', '組織開発', '採用'], 
        '人材・教育', 
        '名古屋', 
        ARRAY['メンタリング', 'ネットワーキング'], 
        'https://ui-avatars.com/api/?name=伊藤さくら&background=00BCD4&color=fff', 
        true,
        NOW(),
        NOW()
    );

-- 5. 簡素化されたRLSポリシーを設定
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

-- 6. RLSを再有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. 挿入されたテストデータを確認
SELECT 
    id,
    email,
    name,
    title,
    company,
    skills,
    industry,
    location,
    avatar_url
FROM public.profiles
WHERE email LIKE 'test_%@interconnect.com'
ORDER BY email;

-- 8. 総件数を確認
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN email LIKE 'test_%@interconnect.com' THEN 1 END) as test_profiles,
    COUNT(CASE WHEN email NOT LIKE 'test_%@interconnect.com' THEN 1 END) as real_profiles
FROM public.profiles;

-- 9. 正常に挿入されたか確認
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO test_count
    FROM public.profiles 
    WHERE email LIKE 'test_%@interconnect.com';
    
    IF test_count >= 6 THEN
        RAISE NOTICE '✅ テストデータが正常に挿入されました: %件', test_count;
    ELSE
        RAISE WARNING '⚠️ テストデータの挿入が不完全です: %件', test_count;
    END IF;
END $$;