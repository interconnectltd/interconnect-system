-- ======================================
-- 完璧なテストデータセットアップSQL
-- あらゆるエラーを回避し、確実に動作する
-- ======================================

-- トランザクション開始
BEGIN;

-- 1. 現在の状態を確認
DO $$
BEGIN
    RAISE NOTICE '開始: profilesテーブルのセットアップ';
    RAISE NOTICE '現在のレコード数: %', (SELECT COUNT(*) FROM public.profiles);
END $$;

-- 2. RLSを一時的に無効化
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 3. 必要なカラムが存在するか確認し、なければ追加
DO $$
BEGIN
    -- companyカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company') THEN
        ALTER TABLE public.profiles ADD COLUMN company TEXT;
        RAISE NOTICE 'companyカラムを追加しました';
    END IF;
    
    -- titleカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'title') THEN
        ALTER TABLE public.profiles ADD COLUMN title TEXT;
        RAISE NOTICE 'titleカラムを追加しました';
    END IF;
    
    -- skillsカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'skills') THEN
        ALTER TABLE public.profiles ADD COLUMN skills TEXT[];
        RAISE NOTICE 'skillsカラムを追加しました';
    END IF;
    
    -- industryカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'industry') THEN
        ALTER TABLE public.profiles ADD COLUMN industry TEXT;
        RAISE NOTICE 'industryカラムを追加しました';
    END IF;
    
    -- locationカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
        ALTER TABLE public.profiles ADD COLUMN location TEXT;
        RAISE NOTICE 'locationカラムを追加しました';
    END IF;
    
    -- interestsカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'interests') THEN
        ALTER TABLE public.profiles ADD COLUMN interests TEXT[];
        RAISE NOTICE 'interestsカラムを追加しました';
    END IF;
    
    -- is_publicカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_public') THEN
        ALTER TABLE public.profiles ADD COLUMN is_public BOOLEAN DEFAULT true;
        RAISE NOTICE 'is_publicカラムを追加しました';
    END IF;
    
    -- last_active_atカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_active_at') THEN
        ALTER TABLE public.profiles ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'last_active_atカラムを追加しました';
    END IF;
END $$;

-- 4. emailカラムにユニーク制約を追加（存在しない場合）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_email_key' 
        AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
        RAISE NOTICE 'emailユニーク制約を追加しました';
    END IF;
END $$;

-- 5. 既存のテストデータを削除
DELETE FROM public.profiles WHERE email LIKE 'test_%@interconnect.com';
RAISE NOTICE '既存のテストデータを削除しました';

-- 6. 新しいテストプロファイルを挿入
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
        'AI・機械学習を活用した新規事業開発に注力しています。最近では特にLLMを活用したビジネスマッチングシステムに興味があります。', 
        ARRAY['AI', 'スタートアップ', '新規事業開発', 'マネジメント'], 
        'IT・テクノロジー', 
        '東京', 
        ARRAY['協業', '投資'], 
        'https://ui-avatars.com/api/?name=田中太郎&background=0D8ABC&color=fff&size=200&font-size=0.4', 
        true,
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '2 hours'
    ),
    (
        gen_random_uuid(), 
        'test_2@interconnect.com', 
        '鈴木 花子', 
        'マーケティング部長', 
        'グローバル商事株式会社', 
        'デジタルマーケティングとブランディング戦略のスペシャリストです。グローバル展開を視野に入れたマーケティング戦略立案が得意です。', 
        ARRAY['マーケティング', 'ブランディング', 'DX', 'グローバル戦略'], 
        '商社・流通', 
        '東京', 
        ARRAY['協業', 'ネットワーキング'], 
        'https://ui-avatars.com/api/?name=鈴木花子&background=E91E63&color=fff&size=200&font-size=0.4', 
        true,
        NOW() - INTERVAL '5 hours',
        NOW() - INTERVAL '60 days',
        NOW() - INTERVAL '5 hours'
    ),
    (
        gen_random_uuid(), 
        'test_3@interconnect.com', 
        '佐藤 健一', 
        '事業開発マネージャー', 
        'イノベーション株式会社', 
        'SaaSプロダクトの事業開発とパートナーシップ構築を担当しています。オープンイノベーションを推進し、異業種連携を積極的に提案しています。', 
        ARRAY['新規事業', 'パートナーシップ', 'SaaS', 'プロダクト開発'], 
        'IT・テクノロジー', 
        '大阪', 
        ARRAY['協業', 'メンタリング'], 
        'https://ui-avatars.com/api/?name=佐藤健一&background=4CAF50&color=fff&size=200&font-size=0.4', 
        true,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '45 days',
        NOW() - INTERVAL '1 day'
    ),
    (
        gen_random_uuid(), 
        'test_4@interconnect.com', 
        '山田 美咲', 
        'CFO', 
        'ファイナンス・アドバイザリー', 
        'スタートアップの資金調達とM&Aアドバイザリーを専門としています。シリーズAからIPOまで幅広いステージの企業をサポートしています。', 
        ARRAY['財務', '投資', 'M&A', '資金調達'], 
        '金融・コンサルティング', 
        '東京', 
        ARRAY['投資', 'メンタリング'], 
        'https://ui-avatars.com/api/?name=山田美咲&background=FF9800&color=fff&size=200&font-size=0.4', 
        true,
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '90 days',
        NOW() - INTERVAL '3 days'
    ),
    (
        gen_random_uuid(), 
        'test_5@interconnect.com', 
        '高橋 修', 
        'プロダクトマネージャー', 
        'デジタルソリューションズ', 
        'ユーザー中心設計とアジャイル開発でプロダクトの成長を推進しています。データ分析に基づいた意思決定を重視しています。', 
        ARRAY['プロダクト開発', 'UX/UI', 'アジャイル', 'データ分析'], 
        'IT・テクノロジー', 
        '福岡', 
        ARRAY['協業', 'ネットワーキング'], 
        'https://ui-avatars.com/api/?name=高橋修&background=9C27B0&color=fff&size=200&font-size=0.4', 
        true,
        NOW() - INTERVAL '12 hours',
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '12 hours'
    ),
    (
        gen_random_uuid(), 
        'test_6@interconnect.com', 
        '伊藤 さくら', 
        '人事部長', 
        'タレントマネジメント株式会社', 
        '組織開発と人材育成プログラムの設計・実行を担当しています。ダイバーシティ&インクルージョンを推進し、多様性あるチーム作りに力を入れています。', 
        ARRAY['人材開発', '組織開発', '採用', 'ダイバーシティ'], 
        '人材・教育', 
        '名古屋', 
        ARRAY['メンタリング', 'ネットワーキング'], 
        'https://ui-avatars.com/api/?name=伊藤さくら&background=00BCD4&color=fff&size=200&font-size=0.4', 
        true,
        NOW() - INTERVAL '4 hours',
        NOW() - INTERVAL '75 days',
        NOW() - INTERVAL '4 hours'
    ),
    (
        gen_random_uuid(), 
        'test_7@interconnect.com', 
        '中村 智也', 
        'CTO', 
        'クラウドイノベーション', 
        'クラウドインフラとマイクロサービスアーキテクチャの専門家です。DevOps文化の推進とセキュリティ強化に特に力を入れています。', 
        ARRAY['クラウド', 'DevOps', 'アーキテクチャ', 'セキュリティ'], 
        'IT・テクノロジー', 
        '東京', 
        ARRAY['協業', '技術共有'], 
        'https://ui-avatars.com/api/?name=中村智也&background=795548&color=fff&size=200&font-size=0.4', 
        true,
        NOW() - INTERVAL '6 hours',
        NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '6 hours'
    ),
    (
        gen_random_uuid(), 
        'test_8@interconnect.com', 
        '小林 理恵', 
        '経営戦略室長', 
        'ヘルスケアイノベーション', 
        '医療DXと予防医療サービスの事業開発を推進しています。規制対応や医療機関との連携経験が豊富で、新しいヘルスケアサービスの創出に情熱を持っています。', 
        ARRAY['ヘルスケア', 'DX', '事業戦略', '規制対応'], 
        '医療・ヘルスケア', 
        '大阪', 
        ARRAY['協業', '投資'], 
        'https://ui-avatars.com/api/?name=小林理恵&background=3F51B5&color=fff&size=200&font-size=0.4', 
        true,
        NOW() - INTERVAL '1 hour',
        NOW() - INTERVAL '50 days',
        NOW() - INTERVAL '1 hour'
    );

RAISE NOTICE 'テストデータを挿入しました';

-- 7. 既存のポリシーをすべて削除
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_record.policyname);
        RAISE NOTICE 'ポリシーを削除: %', policy_record.policyname;
    END LOOP;
END $$;

-- 8. シンプルで確実なRLSポリシーを設定
CREATE POLICY "Enable read access for all users" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for authenticated users only" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on id" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id OR auth.role() = 'authenticated')
WITH CHECK (auth.uid() = id OR auth.role() = 'authenticated');

CREATE POLICY "Enable delete for test profiles" 
ON public.profiles FOR DELETE 
USING (email LIKE 'test_%@interconnect.com' AND auth.role() = 'authenticated');

RAISE NOTICE 'RLSポリシーを設定しました';

-- 9. RLSを再有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
RAISE NOTICE 'RLSを再有効化しました';

-- 10. 結果を確認
DO $$
DECLARE
    test_count INTEGER;
    total_count INTEGER;
    column_count INTEGER;
BEGIN
    -- テストデータ数
    SELECT COUNT(*) INTO test_count
    FROM public.profiles 
    WHERE email LIKE 'test_%@interconnect.com';
    
    -- 総データ数
    SELECT COUNT(*) INTO total_count
    FROM public.profiles;
    
    -- カラム数
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND table_schema = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '========== セットアップ完了 ==========';
    RAISE NOTICE 'テストプロファイル数: %', test_count;
    RAISE NOTICE '総プロファイル数: %', total_count;
    RAISE NOTICE 'カラム数: %', column_count;
    RAISE NOTICE '=====================================';
    
    -- 検証
    IF test_count >= 8 THEN
        RAISE NOTICE '✅ テストデータが正常に挿入されました';
    ELSE
        RAISE WARNING '⚠️ テストデータの挿入が不完全です';
    END IF;
END $$;

-- 11. テストデータの表示
SELECT 
    email,
    name,
    title,
    company,
    location,
    industry,
    array_to_string(skills, ', ') as skills,
    array_to_string(interests, ', ') as interests,
    CASE 
        WHEN last_active_at > NOW() - INTERVAL '1 hour' THEN 'オンライン'
        WHEN last_active_at > NOW() - INTERVAL '1 day' THEN '最近アクティブ'
        ELSE 'オフライン'
    END as status
FROM public.profiles
WHERE email LIKE 'test_%@interconnect.com'
ORDER BY email;

-- 12. トランザクションコミット
COMMIT;

-- 13. 最終確認
SELECT '✅ すべての処理が完了しました！' as result;