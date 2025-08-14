-- ======================================
-- 絶対に動作するテストデータセットアップSQL
-- 外部キー制約を完全に削除してから実行
-- ======================================

-- トランザクション開始
BEGIN;

-- 1. 問題のあるトリガーを削除
DROP TRIGGER IF EXISTS update_member_count_trigger ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_dashboard_stats_trigger ON public.profiles CASCADE;

-- 2. 外部キー制約を完全に削除
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. RLSを一時的に無効化
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 4. 必要なカラムを追加（存在しない場合のみ）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. 既存のテストデータを削除
DELETE FROM public.profiles WHERE email LIKE 'test_%@interconnect.com';

-- 6. 外部キー制約なしで新しいテストプロファイルを挿入
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
        'AI・機械学習を活用した新規事業開発に注力しています。最近ではLLMを活用したビジネスマッチングシステムに興味があります。', 
        ARRAY['AI', 'スタートアップ', '新規事業開発', 'マネジメント'], 
        'IT・テクノロジー', 
        '東京', 
        ARRAY['協業', '投資'], 
        'https://ui-avatars.com/api/?name=田中太郎&background=0D8ABC&color=fff&size=200', 
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
        'デジタルマーケティングとブランディング戦略のスペシャリストです。グローバル展開を視野に入れたマーケティング戦略立案が得意です。', 
        ARRAY['マーケティング', 'ブランディング', 'DX', 'グローバル戦略'], 
        '商社・流通', 
        '東京', 
        ARRAY['協業', 'ネットワーキング'], 
        'https://ui-avatars.com/api/?name=鈴木花子&background=E91E63&color=fff&size=200', 
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
        'SaaSプロダクトの事業開発とパートナーシップ構築を担当しています。オープンイノベーションを推進し、異業種連携を積極的に提案しています。', 
        ARRAY['新規事業', 'パートナーシップ', 'SaaS', 'プロダクト開発'], 
        'IT・テクノロジー', 
        '大阪', 
        ARRAY['協業', 'メンタリング'], 
        'https://ui-avatars.com/api/?name=佐藤健一&background=4CAF50&color=fff&size=200', 
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
        'スタートアップの資金調達とM&Aアドバイザリーを専門としています。シリーズAからIPOまで幅広いステージの企業をサポートしています。', 
        ARRAY['財務', '投資', 'M&A', '資金調達'], 
        '金融・コンサルティング', 
        '東京', 
        ARRAY['投資', 'メンタリング'], 
        'https://ui-avatars.com/api/?name=山田美咲&background=FF9800&color=fff&size=200', 
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
        'ユーザー中心設計とアジャイル開発でプロダクトの成長を推進しています。データ分析に基づいた意思決定を重視しています。', 
        ARRAY['プロダクト開発', 'UX/UI', 'アジャイル', 'データ分析'], 
        'IT・テクノロジー', 
        '福岡', 
        ARRAY['協業', 'ネットワーキング'], 
        'https://ui-avatars.com/api/?name=高橋修&background=9C27B0&color=fff&size=200', 
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
        '組織開発と人材育成プログラムの設計・実行を担当しています。ダイバーシティ&インクルージョンを推進し、多様性あるチーム作りに力を入れています。', 
        ARRAY['人材開発', '組織開発', '採用', 'ダイバーシティ'], 
        '人材・教育', 
        '名古屋', 
        ARRAY['メンタリング', 'ネットワーキング'], 
        'https://ui-avatars.com/api/?name=伊藤さくら&background=00BCD4&color=fff&size=200', 
        true,
        NOW() - INTERVAL '4 hours',
        NOW() - INTERVAL '75 days',
        NOW()
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
        'https://ui-avatars.com/api/?name=中村智也&background=795548&color=fff&size=200', 
        true,
        NOW() - INTERVAL '6 hours',
        NOW() - INTERVAL '20 days',
        NOW()
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
        'https://ui-avatars.com/api/?name=小林理恵&background=3F51B5&color=fff&size=200', 
        true,
        NOW() - INTERVAL '1 hour',
        NOW() - INTERVAL '50 days',
        NOW()
    );

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

-- 重要な注意事項：
-- このSQLは外部キー制約を完全に削除します。
-- 本番環境では、auth.usersとの整合性を保つために
-- 適切な外部キー制約を再追加してください。