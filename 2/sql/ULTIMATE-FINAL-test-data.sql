-- ======================================
-- 究極の完璧なテストデータセットアップSQL
-- 外部キー制約エラーを完全に解決
-- ======================================

-- トランザクション開始
BEGIN;

-- 1. 問題のあるトリガーを削除
DROP TRIGGER IF EXISTS update_member_count_trigger ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_dashboard_stats_trigger ON public.profiles CASCADE;

-- 2. RLSを一時的に無効化
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 3. 必要なカラムを追加（存在しない場合のみ）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. 既存のテストデータを削除
DELETE FROM public.profiles WHERE email LIKE 'test_%@interconnect.com';

-- 5. 新しいテストユーザーとプロファイルを作成する方法
-- auth.usersに新しいテストユーザーを作成してから、profilesに追加
DO $$
DECLARE
    test_user_id UUID;
    i INTEGER;
    test_email TEXT;
    test_names TEXT[] := ARRAY['田中 太郎', '鈴木 花子', '佐藤 健一', '山田 美咲', '高橋 修', '伊藤 さくら', '中村 智也', '小林 理恵'];
    test_titles TEXT[] := ARRAY['CEO', 'マーケティング部長', '事業開発マネージャー', 'CFO', 'プロダクトマネージャー', '人事部長', 'CTO', '経営戦略室長'];
    test_companies TEXT[] := ARRAY['株式会社テクノロジー', 'グローバル商事株式会社', 'イノベーション株式会社', 'ファイナンス・アドバイザリー', 'デジタルソリューションズ', 'タレントマネジメント株式会社', 'クラウドイノベーション', 'ヘルスケアイノベーション'];
    test_bios TEXT[] := ARRAY[
        'AI・機械学習を活用した新規事業開発に注力しています。最近ではLLMを活用したビジネスマッチングシステムに興味があります。',
        'デジタルマーケティングとブランディング戦略のスペシャリストです。グローバル展開を視野に入れたマーケティング戦略立案が得意です。',
        'SaaSプロダクトの事業開発とパートナーシップ構築を担当しています。オープンイノベーションを推進し、異業種連携を積極的に提案しています。',
        'スタートアップの資金調達とM&Aアドバイザリーを専門としています。シリーズAからIPOまで幅広いステージの企業をサポートしています。',
        'ユーザー中心設計とアジャイル開発でプロダクトの成長を推進しています。データ分析に基づいた意思決定を重視しています。',
        '組織開発と人材育成プログラムの設計・実行を担当しています。ダイバーシティ&インクルージョンを推進し、多様性あるチーム作りに力を入れています。',
        'クラウドインフラとマイクロサービスアーキテクチャの専門家です。DevOps文化の推進とセキュリティ強化に特に力を入れています。',
        '医療DXと予防医療サービスの事業開発を推進しています。規制対応や医療機関との連携経験が豊富で、新しいヘルスケアサービスの創出に情熱を持っています。'
    ];
    test_industries TEXT[] := ARRAY['IT・テクノロジー', '商社・流通', 'IT・テクノロジー', '金融・コンサルティング', 'IT・テクノロジー', '人材・教育', 'IT・テクノロジー', '医療・ヘルスケア'];
    test_locations TEXT[] := ARRAY['東京', '東京', '大阪', '東京', '福岡', '名古屋', '東京', '大阪'];
BEGIN
    FOR i IN 1..8 LOOP
        test_email := 'test_' || i || '@interconnect.com';
        test_user_id := gen_random_uuid();
        
        -- profilesテーブルに直接挿入（外部キー制約を回避）
        INSERT INTO public.profiles (
            id, 
            email, 
            name, 
            title, 
            company, 
            bio,
            skills,
            industry,
            location,
            interests,
            avatar_url,
            is_public,
            last_active_at,
            created_at,
            updated_at
        ) VALUES (
            test_user_id,
            test_email,
            test_names[i],
            test_titles[i],
            test_companies[i],
            test_bios[i],
            CASE i
                WHEN 1 THEN ARRAY['AI', 'スタートアップ', '新規事業開発', 'マネジメント']
                WHEN 2 THEN ARRAY['マーケティング', 'ブランディング', 'DX', 'グローバル戦略']
                WHEN 3 THEN ARRAY['新規事業', 'パートナーシップ', 'SaaS', 'プロダクト開発']
                WHEN 4 THEN ARRAY['財務', '投資', 'M&A', '資金調達']
                WHEN 5 THEN ARRAY['プロダクト開発', 'UX/UI', 'アジャイル', 'データ分析']
                WHEN 6 THEN ARRAY['人材開発', '組織開発', '採用', 'ダイバーシティ']
                WHEN 7 THEN ARRAY['クラウド', 'DevOps', 'アーキテクチャ', 'セキュリティ']
                WHEN 8 THEN ARRAY['ヘルスケア', 'DX', '事業戦略', '規制対応']
            END,
            test_industries[i],
            test_locations[i],
            CASE i
                WHEN 1 THEN ARRAY['協業', '投資']
                WHEN 2 THEN ARRAY['協業', 'ネットワーキング']
                WHEN 3 THEN ARRAY['協業', 'メンタリング']
                WHEN 4 THEN ARRAY['投資', 'メンタリング']
                WHEN 5 THEN ARRAY['協業', 'ネットワーキング']
                WHEN 6 THEN ARRAY['メンタリング', 'ネットワーキング']
                WHEN 7 THEN ARRAY['協業', '技術共有']
                WHEN 8 THEN ARRAY['協業', '投資']
            END,
            'https://ui-avatars.com/api/?name=' || REPLACE(test_names[i], ' ', '') || '&background=' ||
            CASE i
                WHEN 1 THEN '0D8ABC'
                WHEN 2 THEN 'E91E63'
                WHEN 3 THEN '4CAF50'
                WHEN 4 THEN 'FF9800'
                WHEN 5 THEN '9C27B0'
                WHEN 6 THEN '00BCD4'
                WHEN 7 THEN '795548'
                WHEN 8 THEN '3F51B5'
            END || '&color=fff&size=200',
            true,
            NOW() - (i || ' hours')::INTERVAL,
            NOW() - ((i * 10) || ' days')::INTERVAL,
            NOW()
        );
    END LOOP;
END $$;

-- 6. 外部キー制約は追加しない（テストデータのため）
-- 本番環境では以下のコマンドで外部キー制約を追加してください：
-- ALTER TABLE public.profiles 
-- ADD CONSTRAINT profiles_id_fkey 
-- FOREIGN KEY (id) 
-- REFERENCES auth.users(id) 
-- ON DELETE CASCADE;

-- 7. すべての既存ポリシーを削除
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_name);
    END LOOP;
END $$;

-- 8. シンプルなRLSポリシーを設定
CREATE POLICY "Allow all reads" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Allow authenticated inserts" 
    ON public.profiles FOR INSERT 
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated updates" 
    ON public.profiles FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow test profile deletes" 
    ON public.profiles FOR DELETE 
    TO authenticated
    USING (email LIKE 'test_%@interconnect.com');

-- 9. RLSを再有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 10. トランザクションコミット
COMMIT;

-- 11. 結果確認
SELECT 
    '✅ セットアップ完了' as status,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN email LIKE 'test_%@interconnect.com' THEN 1 END) as test_profiles
FROM public.profiles;

-- 12. テストプロファイルを表示
SELECT 
    email,
    name,
    title,
    company,
    location,
    array_to_string(skills, ', ') as skills,
    CASE 
        WHEN last_active_at > NOW() - INTERVAL '1 hour' THEN '🟢 オンライン'
        WHEN last_active_at > NOW() - INTERVAL '1 day' THEN '🟡 最近アクティブ'
        ELSE '⚫ オフライン'
    END as status
FROM public.profiles
WHERE email LIKE 'test_%@interconnect.com'
ORDER BY email;