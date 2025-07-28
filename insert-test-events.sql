-- イベントテストデータの挿入
-- 今月と先月のイベントを作成して統計をテスト

-- 現在の日付を基準に動的に生成
DO $$
DECLARE
    current_date DATE := CURRENT_DATE;
    current_month_start DATE := DATE_TRUNC('month', current_date);
    last_month_start DATE := DATE_TRUNC('month', current_date - INTERVAL '1 month');
BEGIN
    -- 今月のイベント（15件）
    INSERT INTO events (title, event_date, time, location, description, max_participants) VALUES
    -- 第1週
    ('経営戦略セミナー', current_month_start + INTERVAL '2 days', '14:00〜16:00', 'オンライン', '最新の経営戦略について学ぶセミナーです。', 100),
    ('交流ランチ会', current_month_start + INTERVAL '5 days', '12:00〜14:00', '東京・丸の内', 'カジュアルな雰囲気での交流会です。', 20),
    ('新規事業ピッチ大会', current_month_start + INTERVAL '6 days', '18:00〜21:00', '大阪・梅田', '新規事業のアイデアを発表する大会です。', 50),
    
    -- 第2週
    ('AI活用勉強会', current_month_start + INTERVAL '8 days', '19:00〜21:00', 'オンライン', 'ビジネスでのAI活用について学びます。', 80),
    ('業界別交流会（IT）', current_month_start + INTERVAL '10 days', '19:00〜21:00', '東京・渋谷', 'IT業界の経営者が集まる交流会です。', 40),
    ('資金調達セミナー', current_month_start + INTERVAL '12 days', '14:00〜17:00', 'オンライン', 'スタートアップの資金調達について解説します。', 60),
    
    -- 第3週
    ('マーケティング戦略講座', current_month_start + INTERVAL '15 days', '10:00〜12:00', 'オンライン', 'デジタルマーケティングの最新手法を学びます。', 70),
    ('経営者朝食会', current_month_start + INTERVAL '16 days', '7:30〜9:00', '東京・品川', '朝の時間を活用した交流会です。', 15),
    ('DX推進ワークショップ', current_month_start + INTERVAL '18 days', '13:00〜17:00', '名古屋', 'DX推進の具体的な方法を学ぶワークショップです。', 30),
    ('投資家マッチングイベント', current_month_start + INTERVAL '19 days', '18:00〜20:00', '東京・六本木', '投資家との出会いの場を提供します。', 40),
    
    -- 第4週
    ('海外展開セミナー', current_month_start + INTERVAL '22 days', '14:00〜16:00', 'オンライン', '海外市場への進出戦略を解説します。', 50),
    ('業界別交流会（製造業）', current_month_start + INTERVAL '23 days', '19:00〜21:00', '大阪・本町', '製造業の経営者が集まる交流会です。', 35),
    ('リーダーシップ研修', current_month_start + INTERVAL '25 days', '10:00〜18:00', '東京・新宿', '経営者のリーダーシップスキルを磨きます。', 25),
    ('月例ネットワーキング会', current_month_start + INTERVAL '26 days', '19:00〜21:30', '東京・銀座', '定期開催のネットワーキングイベントです。', 60),
    ('イノベーション創出セミナー', current_month_start + INTERVAL '28 days', '15:00〜17:00', 'オンライン', 'イノベーションを生み出す方法論を学びます。', 80);
    
    -- 先月のイベント（12件）
    INSERT INTO events (title, event_date, time, location, description, max_participants) VALUES
    -- 第1週
    ('ビジネスモデル構築講座', last_month_start + INTERVAL '3 days', '14:00〜17:00', 'オンライン', '新しいビジネスモデルの構築方法を学びます。', 50),
    ('地域交流会（関西）', last_month_start + INTERVAL '5 days', '18:00〜20:00', '大阪・梅田', '関西地域の経営者交流会です。', 30),
    
    -- 第2週
    ('営業力強化セミナー', last_month_start + INTERVAL '8 days', '13:00〜15:00', 'オンライン', '営業力を強化する具体的な方法を解説します。', 60),
    ('スタートアップピッチ', last_month_start + INTERVAL '10 days', '18:00〜21:00', '東京・渋谷', 'スタートアップによるピッチイベントです。', 40),
    ('財務戦略講座', last_month_start + INTERVAL '12 days', '10:00〜12:00', 'オンライン', '中小企業の財務戦略について学びます。', 45),
    
    -- 第3週
    ('人材採用セミナー', last_month_start + INTERVAL '15 days', '14:00〜16:00', 'オンライン', '優秀な人材を採用する方法を解説します。', 70),
    ('業界別交流会（サービス業）', last_month_start + INTERVAL '17 days', '19:00〜21:00', '東京・新宿', 'サービス業の経営者交流会です。', 35),
    ('ブランディング戦略講座', last_month_start + INTERVAL '19 days', '13:00〜17:00', '名古屋', 'ブランド構築の戦略を学びます。', 25),
    
    -- 第4週
    ('IT活用セミナー', last_month_start + INTERVAL '22 days', '15:00〜17:00', 'オンライン', '業務効率化のためのIT活用法を解説します。', 55),
    ('経営者ディナー会', last_month_start + INTERVAL '24 days', '19:00〜21:30', '東京・銀座', 'ディナーを楽しみながらの交流会です。', 20),
    ('CSR推進セミナー', last_month_start + INTERVAL '26 days', '14:00〜16:00', 'オンライン', '企業の社会的責任について学びます。', 40),
    ('月例報告会', last_month_start + INTERVAL '27 days', '18:00〜20:00', '東京・品川', 'コミュニティの月例報告会です。', 50);

END $$;

-- 挿入されたデータを確認
SELECT 
    DATE_TRUNC('month', event_date) as month,
    COUNT(*) as event_count,
    CASE 
        WHEN DATE_TRUNC('month', event_date) = DATE_TRUNC('month', CURRENT_DATE) THEN '今月'
        WHEN DATE_TRUNC('month', event_date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') THEN '先月'
        ELSE 'その他'
    END as period
FROM events
WHERE event_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  AND event_date < DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month')
GROUP BY DATE_TRUNC('month', event_date)
ORDER BY month DESC;