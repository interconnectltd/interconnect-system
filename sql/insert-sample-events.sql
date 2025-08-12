-- event_itemsテーブルにサンプルイベントデータを挿入
-- 注意: organizer_idは実際のユーザーIDに置き換える必要があります

-- まず、既存のサンプルデータをクリア（オプション）
-- DELETE FROM event_items WHERE title LIKE 'サンプル%';

-- サンプルイベントデータの挿入
INSERT INTO event_items (
    id,
    title,
    description,
    event_type,
    event_date,
    start_time,
    end_time,
    location,
    online_url,
    max_participants,
    price,
    currency,
    organizer_id,
    organizer_name,
    category,
    tags,
    requirements,
    agenda,
    image_url,
    is_public,
    is_cancelled,
    created_at,
    updated_at
) VALUES
(
    gen_random_uuid(),
    'DX推進セミナー：AIを活用した業務効率化',
    '最新のAI技術を活用した業務効率化の手法について、実例を交えながら解説します。ChatGPTやClaude等の生成AIツールの業務活用方法、自動化プロセスの構築、ROI測定方法まで幅広くカバーします。',
    'online',
    CURRENT_DATE + INTERVAL '7 days',
    '14:00:00',
    '16:00:00',
    NULL,
    'https://zoom.us/j/123456789',
    50,
    0,
    'JPY',
    (SELECT id FROM user_profiles WHERE email = 'admin@interconnects.info' LIMIT 1),
    'INTERCONNECT運営事務局',
    'seminar',
    ARRAY['AI', 'DX', '業務効率化', 'ChatGPT', '生成AI'],
    '特になし。初心者の方も歓迎です。',
    '1. AI技術の基礎知識（30分）
2. 生成AIツールの実演（45分）
3. 業務への応用事例（30分）
4. Q&Aセッション（15分）',
    '/images/events/dx-seminar.jpg',
    true,
    false,
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'ビジネス交流会 in 東京',
    '異業種のビジネスパーソンが集まる交流会です。新しいビジネスチャンスを見つけ、貴重な人脈を築く絶好の機会です。軽食とドリンクを用意しております。',
    'offline',
    CURRENT_DATE + INTERVAL '14 days',
    '18:30:00',
    '20:30:00',
    '東京都渋谷区神宮前1-2-3 交流スペース',
    NULL,
    100,
    3000,
    'JPY',
    (SELECT id FROM user_profiles WHERE email = 'admin@interconnects.info' LIMIT 1),
    'INTERCONNECT運営事務局',
    'networking',
    ARRAY['交流会', 'ネットワーキング', '東京', 'ビジネス'],
    '名刺をご持参ください。ドレスコードはビジネスカジュアルです。',
    '1. 受付・ウェルカムドリンク（30分）
2. 主催者挨拶・アイスブレイク（15分）
3. フリーネットワーキング（60分）
4. ライトニングトーク（3名×5分）
5. クロージング（10分）',
    '/images/events/tokyo-networking.jpg',
    true,
    false,
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'スタートアップピッチイベント',
    '注目のスタートアップ企業5社が登壇し、各社のビジネスモデルと成長戦略をプレゼンテーションします。投資家とのマッチング機会もあります。',
    'hybrid',
    CURRENT_DATE + INTERVAL '21 days',
    '13:00:00',
    '17:00:00',
    '東京都港区六本木3-4-5 イベントホール',
    'https://youtube.com/live/abc123',
    150,
    0,
    'JPY',
    (SELECT id FROM user_profiles WHERE email = 'admin@interconnects.info' LIMIT 1),
    'INTERCONNECT運営事務局',
    'pitch',
    ARRAY['スタートアップ', 'ピッチ', '投資', 'ベンチャー'],
    '事前登録が必要です。投資家の方は別途お問い合わせください。',
    '1. オープニング（15分）
2. スタートアップピッチ（各社15分×5社）
3. 休憩（15分）
4. パネルディスカッション（30分）
5. ネットワーキングセッション（60分）
6. クロージング（15分）',
    '/images/events/startup-pitch.jpg',
    true,
    false,
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'Web3.0とブロックチェーン入門講座',
    'Web3.0の基本概念からブロックチェーン技術の仕組み、実際のビジネス活用事例まで、初心者にも分かりやすく解説します。',
    'online',
    CURRENT_DATE + INTERVAL '10 days',
    '19:00:00',
    '21:00:00',
    NULL,
    'https://teams.microsoft.com/meet/123456',
    80,
    2000,
    'JPY',
    (SELECT id FROM user_profiles WHERE email = 'admin@interconnects.info' LIMIT 1),
    'INTERCONNECT運営事務局',
    'workshop',
    ARRAY['Web3', 'ブロックチェーン', 'NFT', '暗号資産', 'DeFi'],
    'PC持参推奨。プログラミング経験は不要です。',
    '1. Web3.0の概要と将来性（30分）
2. ブロックチェーンの基礎技術（30分）
3. 実践ワークショップ（40分）
4. ビジネス活用事例の紹介（20分）',
    '/images/events/web3-workshop.jpg',
    true,
    false,
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'リーダーシップ開発プログラム',
    '次世代リーダーを育成する実践的なプログラムです。チームビルディング、コミュニケーション戦略、問題解決スキルを体系的に学びます。',
    'offline',
    CURRENT_DATE + INTERVAL '30 days',
    '09:00:00',
    '17:00:00',
    '大阪府大阪市北区梅田2-3-4 研修センター',
    NULL,
    30,
    15000,
    'JPY',
    (SELECT id FROM user_profiles WHERE email = 'admin@interconnects.info' LIMIT 1),
    'INTERCONNECT運営事務局',
    'training',
    ARRAY['リーダーシップ', 'マネジメント', '人材育成', 'コーチング'],
    '管理職または管理職候補の方を対象としています。昼食付き。',
    '1. リーダーシップ理論（90分）
2. ケーススタディ（60分）
3. 昼食休憩（60分）
4. ロールプレイング（90分）
5. グループワーク（60分）
6. アクションプラン作成（60分）',
    '/images/events/leadership-program.jpg',
    true,
    false,
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'サステナビリティ経営フォーラム',
    'ESG投資、カーボンニュートラル、SDGs達成に向けた企業の取り組みについて、先進企業の事例を交えて議論します。',
    'online',
    CURRENT_DATE + INTERVAL '5 days',
    '15:00:00',
    '17:00:00',
    NULL,
    'https://webex.com/meet/sustainability2024',
    200,
    0,
    'JPY',
    (SELECT id FROM user_profiles WHERE email = 'admin@interconnects.info' LIMIT 1),
    'INTERCONNECT運営事務局',
    'forum',
    ARRAY['ESG', 'SDGs', 'サステナビリティ', '環境', 'CSR'],
    '経営者、CSR担当者、投資家の方々を対象としています。',
    '1. 基調講演：サステナビリティ経営の未来（30分）
2. パネルディスカッション：先進企業の取り組み（60分）
3. ブレイクアウトセッション（30分）',
    '/images/events/sustainability-forum.jpg',
    true,
    false,
    NOW(),
    NOW()
);

-- 過去のイベント（レポート表示用）
INSERT INTO event_items (
    id,
    title,
    description,
    event_type,
    event_date,
    start_time,
    end_time,
    location,
    online_url,
    max_participants,
    price,
    currency,
    organizer_id,
    organizer_name,
    category,
    tags,
    requirements,
    agenda,
    image_url,
    is_public,
    is_cancelled,
    created_at,
    updated_at
) VALUES
(
    gen_random_uuid(),
    '新年ビジネス交流会 2024',
    '2024年の新年を祝い、新たなビジネスチャンスを探る交流会を開催しました。120名以上の参加者が集まり、活発な交流が行われました。',
    'offline',
    '2024-01-10 18:00:00',
    '18:00:00',
    '21:00:00',
    '東京都千代田区丸の内1-2-3 パレスホテル',
    NULL,
    150,
    5000,
    'JPY',
    (SELECT id FROM user_profiles WHERE email = 'admin@interconnects.info' LIMIT 1),
    'INTERCONNECT運営事務局',
    'networking',
    ARRAY['新年会', '交流会', '東京', 'ネットワーキング'],
    NULL,
    NULL,
    '/images/events/newyear-networking-2024.jpg',
    true,
    false,
    '2024-01-01 10:00:00',
    '2024-01-10 21:00:00'
),
(
    gen_random_uuid(),
    '年末特別セミナー：2024年のビジネストレンド',
    '2024年に向けたビジネストレンドと市場予測について、各分野の専門家が解説しました。オンラインで85名が参加しました。',
    'online',
    '2023-12-20 14:00:00',
    '14:00:00',
    '16:00:00',
    NULL,
    'https://zoom.us/j/987654321',
    100,
    0,
    'JPY',
    (SELECT id FROM user_profiles WHERE email = 'admin@interconnects.info' LIMIT 1),
    'INTERCONNECT運営事務局',
    'seminar',
    ARRAY['トレンド', '2024年', '市場予測', 'ビジネス戦略'],
    NULL,
    NULL,
    '/images/events/yearend-seminar-2023.jpg',
    true,
    false,
    '2023-12-01 10:00:00',
    '2023-12-20 16:00:00'
);

-- 参加者データのサンプル（最初の3つのイベントに対して）
WITH first_three_events AS (
    SELECT id, max_participants 
    FROM event_items 
    WHERE event_date > CURRENT_DATE 
    ORDER BY created_at 
    LIMIT 3
)
INSERT INTO event_participants (
    id,
    event_id,
    user_id,
    status,
    registration_date,
    attendance_confirmed,
    notes,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    e.id,
    u.id,
    CASE 
        WHEN random() < 0.8 THEN 'registered'
        WHEN random() < 0.95 THEN 'confirmed'
        ELSE 'cancelled'
    END,
    NOW() - INTERVAL '1 day' * floor(random() * 7),
    random() < 0.7,
    CASE 
        WHEN random() < 0.3 THEN '楽しみにしています！'
        WHEN random() < 0.5 THEN '初参加です。よろしくお願いします。'
        ELSE NULL
    END,
    NOW(),
    NOW()
FROM first_three_events e
CROSS JOIN LATERAL (
    SELECT id 
    FROM user_profiles 
    WHERE id != (SELECT id FROM user_profiles WHERE email = 'admin@interconnects.info' LIMIT 1)
    ORDER BY random() 
    LIMIT LEAST(e.max_participants / 2, 10)
) u;

-- 統計情報の更新
UPDATE event_items e
SET updated_at = NOW()
WHERE EXISTS (
    SELECT 1 
    FROM event_participants ep 
    WHERE ep.event_id = e.id
);

-- 確認用クエリ
SELECT 
    e.title,
    e.event_type,
    e.event_date,
    e.max_participants,
    COUNT(ep.id) as registered_count,
    COUNT(CASE WHEN ep.status = 'confirmed' THEN 1 END) as confirmed_count
FROM event_items e
LEFT JOIN event_participants ep ON e.id = ep.event_id
WHERE e.is_public = true AND e.is_cancelled = false
GROUP BY e.id, e.title, e.event_type, e.event_date, e.max_participants
ORDER BY e.event_date;