-- ======================================
-- 動作確認済みテストデータセットアップSQL
-- シンタックスエラーを修正
-- ======================================

-- トランザクション開始
BEGIN;

-- 1. RLSを一時的に無効化
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. 必要なカラムを追加（存在しない場合）
DO $$
BEGIN
    -- companyカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'company') THEN
        ALTER TABLE public.profiles ADD COLUMN company TEXT;
    END IF;
    
    -- titleカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'title') THEN
        ALTER TABLE public.profiles ADD COLUMN title TEXT;
    END IF;
    
    -- skillsカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'skills') THEN
        ALTER TABLE public.profiles ADD COLUMN skills TEXT[];
    END IF;
    
    -- industryカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'industry') THEN
        ALTER TABLE public.profiles ADD COLUMN industry TEXT;
    END IF;
    
    -- locationカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'location') THEN
        ALTER TABLE public.profiles ADD COLUMN location TEXT;
    END IF;
    
    -- interestsカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'interests') THEN
        ALTER TABLE public.profiles ADD COLUMN interests TEXT[];
    END IF;
    
    -- is_publicカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_public') THEN
        ALTER TABLE public.profiles ADD COLUMN is_public BOOLEAN DEFAULT true;
    END IF;
    
    -- last_active_atカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_active_at') THEN
        ALTER TABLE public.profiles ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 3. 既存のテストデータを削除
DELETE FROM public.profiles WHERE email LIKE 'test_%@interconnect.com';

-- 4. 新しいテストプロファイルを挿入
INSERT INTO public.profiles (
    id, email, name, title, company, bio, 
    skills, industry, location, interests, 
    avatar_url, is_public, last_active_at, created_at, updated_at
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
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '30 days',
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
        NOW() - INTERVAL '5 hours',
        NOW() - INTERVAL '60 days',
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
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '45 days',
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
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '90 days',
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
        NOW() - INTERVAL '12 hours',
        NOW() - INTERVAL '15 days',
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
        NOW() - INTERVAL '4 hours',
        NOW() - INTERVAL '75 days',
        NOW()
    );

-- 5. 既存のポリシーを削除
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Delete test profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for test profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- 6. シンプルなRLSポリシーを設定
CREATE POLICY "Enable read access for all users" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON public.profiles FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for test profiles" 
ON public.profiles FOR DELETE 
TO authenticated
USING (email LIKE 'test_%@interconnect.com');

-- 7. RLSを再有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 8. 結果を確認
SELECT 
    '========== テストデータ挿入結果 ==========' as info
UNION ALL
SELECT 
    'テストプロファイル数: ' || COUNT(*)::text
FROM public.profiles 
WHERE email LIKE 'test_%@interconnect.com'
UNION ALL
SELECT 
    '総プロファイル数: ' || COUNT(*)::text
FROM public.profiles;

-- 9. 挿入されたテストデータを表示
SELECT 
    email,
    name,
    title,
    company,
    location,
    array_to_string(skills, ', ') as skills
FROM public.profiles
WHERE email LIKE 'test_%@interconnect.com'
ORDER BY email;

-- 10. トランザクションコミット
COMMIT;

-- 11. 最終メッセージ
SELECT '✅ テストデータのセットアップが完了しました！' as result;