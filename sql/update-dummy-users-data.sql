-- ダミーユーザーのデータを多様化するSQL
-- matching-unified.jsのダミーデータを実際のDBに反映させる場合に使用

-- まず既存のダミーユーザーがいるか確認
-- SELECT * FROM user_profiles WHERE name IN ('りゅう', 'guest');

-- 「りゅう」ユーザーの更新（より充実したプロフィールに）
UPDATE user_profiles
SET 
    title = 'プロダクトマネージャー',
    position = 'シニアプロダクトマネージャー',
    company = '株式会社イノベーションテック',
    location = '東京都渋谷区神宮前1-2-3',  -- 詳細な住所（文字数増加）
    industry = 'IT・テクノロジー・SaaS・プロダクト開発',  -- 詳細な業界情報
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
    ],  -- 10個のスキル
    interests = ARRAY[
        'プロダクト開発',
        'スタートアップ',
        'テクノロジートレンド',
        'デザイン思考',
        'イノベーション'
    ],  -- 5個の興味
    business_challenges = ARRAY[
        'プロダクトの成長戦略',
        'ユーザー体験の改善',
        'チーム生産性の向上',
        'データドリブンな意思決定'
    ],
    bio = 'プロダクトマネジメントに10年以上携わり、BtoBおよびBtoCの両方で成功を収めてきました。データドリブンなアプローチと顧客中心の思考を組み合わせ、革新的なプロダクトを生み出すことに情熱を注いでいます。最近はAIを活用した新機能開発に注力しています。',
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=ryu',
    picture_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=ryu'
WHERE name = 'りゅう';

-- 「guest」ユーザーの更新（初心者プロフィールに）
UPDATE user_profiles
SET 
    title = NULL,  -- タイトルなし
    position = 'インターン',
    company = 'スタートアップA',
    location = '大阪',  -- 短い地域情報
    industry = '小売',  -- 短い業界情報
    skills = ARRAY[
        'Excel',
        'PowerPoint'
    ],  -- 2個のスキルのみ
    interests = ARRAY[
        'ビジネス'
    ],  -- 1個の興味のみ
    business_challenges = ARRAY[
        '経験を積みたい'
    ],
    bio = '現在インターンとして勉強中です。',  -- 短いbio
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest',
    picture_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest'
WHERE name = 'guest';

-- 新規ユーザー1: エンジニア（高スコア）
INSERT INTO user_profiles (id, name, email, title, position, company, location, industry, skills, interests, business_challenges, bio, avatar_url, picture_url)
VALUES (
    gen_random_uuid(),
    '田中太郎',
    'tanaka@example.com',
    'テックリード',
    'シニアソフトウェアエンジニア',
    'メガテック株式会社',
    '東京都港区六本木7-8-9 ミッドタウンタワー',
    'IT・テクノロジー・AI・機械学習・ビッグデータ',
    ARRAY[
        'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js',
        'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB',
        'AI・機械学習', 'データサイエンス', 'システムアーキテクチャ'
    ],
    ARRAY['AI', '機械学習', 'オープンソース', 'テックカンファレンス', 'メンタリング'],
    ARRAY['スケーラビリティの改善', 'AI導入', 'チーム育成', 'DX推進'],
    '15年以上のソフトウェア開発経験を持ち、特にAIと機械学習の分野で多くのプロジェクトをリードしてきました。',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=tanaka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=tanaka'
) ON CONFLICT (email) DO NOTHING;

-- 新規ユーザー2: マーケター（中スコア）
INSERT INTO user_profiles (id, name, email, title, position, company, location, industry, skills, interests, business_challenges, bio, avatar_url, picture_url)
VALUES (
    gen_random_uuid(),
    '佐藤花子',
    'sato@example.com',
    'マーケティングマネージャー',
    'マーケティング部門責任者',
    'デジタルマーケティング社',
    '名古屋市中区',
    'マーケティング・広告',
    ARRAY[
        'デジタルマーケティング', 'SEO', 'SEM', 'コンテンツマーケティング',
        'Google Analytics', 'SNS運用'
    ],
    ARRAY['マーケティング', 'ブランディング', 'グロースハック'],
    ARRAY['新規顧客獲得', 'ブランド認知度向上', 'ROI改善'],
    'BtoB/BtoCの両方でマーケティング戦略を立案・実行してきました。',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=sato',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=sato'
) ON CONFLICT (email) DO NOTHING;

-- 新規ユーザー3: デザイナー（低スコア設定）
INSERT INTO user_profiles (id, name, email, title, position, company, location, industry, skills, interests, business_challenges, bio, avatar_url, picture_url)
VALUES (
    gen_random_uuid(),
    '山田美咲',
    'yamada@example.com',
    NULL,
    'ジュニアデザイナー',
    'デザインスタジオ',
    '福岡',
    'デザイン',
    ARRAY['Photoshop', 'Illustrator', 'Figma'],
    ARRAY['UI/UX', 'アート'],
    ARRAY['スキルアップ'],
    'デザイナーとして成長中です。',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=yamada',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=yamada'
) ON CONFLICT (email) DO NOTHING;

-- データ確認用クエリ
-- SELECT 
--     name,
--     title,
--     position,
--     company,
--     location,
--     LENGTH(location) as location_length,
--     industry,
--     LENGTH(industry) as industry_length,
--     array_length(skills, 1) as skills_count,
--     array_length(interests, 1) as interests_count,
--     LENGTH(bio) as bio_length
-- FROM user_profiles
-- WHERE name IN ('りゅう', 'guest', '田中太郎', '佐藤花子', '山田美咲')
-- ORDER BY name;