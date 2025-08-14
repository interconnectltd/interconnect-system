-- profilesテーブルの実際の構造に基づいた正確なSQL
-- 存在するカラムのみを使用: id, email, name, avatar_url, bio, location, company, title, skills, interests, created_at, updated_at

-- まず既存のダミーユーザーがいるか確認
-- SELECT * FROM profiles WHERE name IN ('りゅう', 'guest');

-- 「りゅう」ユーザーの更新（より充実したプロフィールに）
UPDATE profiles
SET 
    title = 'プロダクトマネージャー',
    company = '株式会社イノベーションテック',
    location = '東京都渋谷区神宮前1-2-3',
    skills = ARRAY[
        'プロジェクト管理',
        'アジャイル開発',
        'プロダクトマネジメント',
        'UI/UXデザイン',
        'データ分析',
        'SQL',
        'Python',
        'マーケティング戦略',
        'KPI設計',
        'チームビルディング'
    ]::text[],
    interests = ARRAY[
        'プロダクト開発',
        'スタートアップ',
        'テクノロジートレンド',
        'デザイン思考',
        'イノベーション'
    ]::text[],
    bio = 'プロダクトマネジメントに10年以上携わり、BtoBおよびBtoCの両方で成功を収めてきました。データドリブンなアプローチと顧客中心の思考を組み合わせ、革新的なプロダクトを生み出すことに情熱を注いでいます。最近はAIを活用した新機能開発に注力しています。',
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=ryu',
    updated_at = NOW()
WHERE name = 'りゅう';

-- 「guest」ユーザーの更新（初心者プロフィールに）
UPDATE profiles
SET 
    title = 'インターン',
    company = 'スタートアップA',
    location = '大阪',
    skills = ARRAY[
        'Excel',
        'PowerPoint'
    ]::text[],
    interests = ARRAY[
        'ビジネス'
    ]::text[],
    bio = '現在インターンとして勉強中です。',
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest',
    updated_at = NOW()
WHERE name = 'guest';

-- 新規ユーザー1: エンジニア（高スコア）
INSERT INTO profiles (
    id, 
    name, 
    email, 
    title, 
    company, 
    location, 
    skills, 
    interests, 
    bio, 
    avatar_url,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid(),
    '田中太郎',
    'tanaka@example.com',
    'テックリード',
    'メガテック株式会社',
    '東京都港区六本木7-8-9 ミッドタウンタワー',
    ARRAY[
        'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js',
        'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB',
        'AI・機械学習', 'データサイエンス', 'システムアーキテクチャ'
    ]::text[],
    ARRAY['AI', '機械学習', 'オープンソース', 'テックカンファレンス', 'メンタリング']::text[],
    '15年以上のソフトウェア開発経験を持ち、特にAIと機械学習の分野で多くのプロジェクトをリードしてきました。',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=tanaka',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- 新規ユーザー2: マーケター（中スコア）
INSERT INTO profiles (
    id,
    name,
    email,
    title,
    company,
    location,
    skills,
    interests,
    bio,
    avatar_url,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid(),
    '佐藤花子',
    'sato@example.com',
    'マーケティングマネージャー',
    'デジタルマーケティング社',
    '名古屋市中区',
    ARRAY[
        'デジタルマーケティング', 'SEO', 'SEM', 'コンテンツマーケティング',
        'Google Analytics', 'SNS運用'
    ]::text[],
    ARRAY['マーケティング', 'ブランディング', 'グロースハック']::text[],
    'BtoB/BtoCの両方でマーケティング戦略を立案・実行してきました。',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=sato',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- 新規ユーザー3: デザイナー（低スコア設定）
INSERT INTO profiles (
    id,
    name,
    email,
    title,
    company,
    location,
    skills,
    interests,
    bio,
    avatar_url,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid(),
    '山田美咲',
    'yamada@example.com',
    'ジュニアデザイナー',
    'デザインスタジオ',
    '福岡',
    ARRAY['Photoshop', 'Illustrator', 'Figma']::text[],
    ARRAY['UI/UX', 'アート']::text[],
    'デザイナーとして成長中です。',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=yamada',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- データ確認用クエリ
-- SELECT 
--     name,
--     title,
--     company,
--     location,
--     LENGTH(location) as location_length,
--     array_length(skills, 1) as skills_count,
--     array_length(interests, 1) as interests_count,
--     LENGTH(bio) as bio_length
-- FROM profiles
-- WHERE name IN ('りゅう', 'guest', '田中太郎', '佐藤花子', '山田美咲')
-- ORDER BY name;