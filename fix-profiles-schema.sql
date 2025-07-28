-- ======================================
-- Profilesテーブルのスキーマ修正
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

-- 3. インデックスを追加（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS profiles_full_name_idx ON public.profiles USING gin(to_tsvector('japanese', full_name));
CREATE INDEX IF NOT EXISTS profiles_company_idx ON public.profiles USING gin(to_tsvector('japanese', company));
CREATE INDEX IF NOT EXISTS profiles_industry_idx ON public.profiles(industry);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_skills_idx ON public.profiles USING gin(skills);
CREATE INDEX IF NOT EXISTS profiles_is_online_idx ON public.profiles(is_online);

-- 4. サンプルデータを挿入（テスト用）
INSERT INTO public.profiles (
    id, email, name, full_name, company, title, industry, role, skills, bio, avatar_url, is_online
) VALUES 
-- 山田太郎
(gen_random_uuid(), 'yamada@techinnovation.jp', '山田太郎', '山田太郎', '株式会社テックイノベーション', '代表取締役CEO', 'IT・テクノロジー', 'executive', ARRAY['IT', 'AI', 'DX推進'], 'テクノロジーで社会課題を解決することを目指しています。', 'assets/user-placeholder.svg', true),

-- 佐藤花子
(gen_random_uuid(), 'sato@globalcommerce.co.jp', '佐藤花子', '佐藤花子', 'グローバルコマース株式会社', 'マーケティング部長', '小売・流通', 'manager', ARRAY['マーケティング', 'EC', 'グローバル'], '国際的なマーケティング戦略の立案・実行を担当しています。', 'assets/user-placeholder.svg', false),

-- 高橋健一
(gen_random_uuid(), 'takahashi@digitalsol.com', '高橋健一', '高橋健一', 'デジタルソリューションズ', 'CTO', 'IT・テクノロジー', 'executive', ARRAY['開発', 'クラウド', 'DevOps'], 'クラウドネイティブなシステム開発を専門としています。', 'assets/user-placeholder.svg', true),

-- 伊藤美咲
(gen_random_uuid(), 'ito@talentmgmt.co.jp', '伊藤美咲', '伊藤美咲', 'タレントマネジメント株式会社', '人事部長', '人材・教育', 'manager', ARRAY['人材開発', '採用', '組織開発'], '人と組織の成長をサポートすることが私の使命です。', 'assets/user-placeholder.svg', false),

-- 渡辺裕太
(gen_random_uuid(), 'watanabe@salesforce.jp', '渡辺裕太', '渡辺裕太', 'セールスフォース株式会社', '営業本部長', 'IT・テクノロジー', 'manager', ARRAY['営業戦略', 'BtoB', 'CRM'], 'データドリブンな営業戦略で顧客満足度向上を実現しています。', 'assets/user-placeholder.svg', true),

-- 中村さくら
(gen_random_uuid(), 'nakamura@innovationlab.jp', '中村さくら', '中村さくら', 'イノベーションラボ', 'プロダクトマネージャー', 'IT・テクノロジー', 'specialist', ARRAY['プロダクト開発', 'UI/UX', 'アジャイル'], 'ユーザー中心のプロダクト開発を心がけています。', 'assets/user-placeholder.svg', false),

-- 田中一郎
(gen_random_uuid(), 'tanaka@consulting.co.jp', '田中一郎', '田中一郎', 'ビジネスコンサルティング', '経営コンサルタント', '経営・コンサルティング', 'specialist', ARRAY['経営戦略', 'DX', '業務改善'], '企業の成長戦略立案をサポートしています。', 'assets/user-placeholder.svg', true),

-- 鈴木みゆき
(gen_random_uuid(), 'suzuki@finance.co.jp', '鈴木みゆき', '鈴木みゆき', 'フィナンシャルサービス', 'CFO', '金融・保険', 'executive', ARRAY['財務戦略', '投資', 'リスク管理'], '持続可能な成長を支える財務戦略を構築しています。', 'assets/user-placeholder.svg', false),

-- 小林直樹
(gen_random_uuid(), 'kobayashi@manufacturing.jp', '小林直樹', '小林直樹', '先進製造業株式会社', '工場長', '製造業', 'manager', ARRAY['製造業', 'IoT', '品質管理'], 'Industry 4.0に対応した次世代工場の運営を行っています。', 'assets/user-placeholder.svg', true),

-- 松本愛子
(gen_random_uuid(), 'matsumoto@healthcare.jp', '松本愛子', '松本愛子', 'ヘルスケアイノベーション', '医療ITコンサルタント', '医療・ヘルスケア', 'specialist', ARRAY['医療IT', 'データ分析', 'ヘルスケア'], '医療分野のデジタル化を推進しています。', 'assets/user-placeholder.svg', false)

ON CONFLICT (id) DO NOTHING;

-- 5. 統計確認
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as profiles_with_name,
    COUNT(CASE WHEN company IS NOT NULL THEN 1 END) as profiles_with_company,
    COUNT(CASE WHEN industry IS NOT NULL THEN 1 END) as profiles_with_industry,
    COUNT(CASE WHEN skills IS NOT NULL AND array_length(skills, 1) > 0 THEN 1 END) as profiles_with_skills
FROM public.profiles;