-- イベント画像の安全な更新スクリプト
-- 既存の404エラーを解消し、より良いプレースホルダー画像を設定

-- 1. 現在の画像URL状況を確認
SELECT 
    title,
    image_url,
    CASE 
        WHEN image_url LIKE '/images/events/%' THEN '修正対象'
        ELSE 'そのまま'
    END as status
FROM event_items
ORDER BY created_at DESC;

-- 2. より適切な画像URLに更新（カテゴリーごとに異なる画像）
UPDATE event_items 
SET image_url = CASE
    -- セミナー系
    WHEN category = 'seminar' OR title LIKE '%セミナー%' 
        THEN '/assets/user-placeholder.svg'
    -- ネットワーキング系
    WHEN category = 'networking' OR title LIKE '%交流会%' 
        THEN '/assets/user-placeholder.svg'
    -- ピッチ系
    WHEN category = 'pitch' OR title LIKE '%ピッチ%' 
        THEN '/assets/user-placeholder.svg'
    -- ワークショップ系
    WHEN category = 'workshop' OR title LIKE '%講座%' OR title LIKE '%ワークショップ%'
        THEN '/assets/user-placeholder.svg'
    -- トレーニング系
    WHEN category = 'training' OR title LIKE '%プログラム%' OR title LIKE '%研修%'
        THEN '/assets/user-placeholder.svg'
    -- フォーラム系
    WHEN category = 'forum' OR title LIKE '%フォーラム%'
        THEN '/assets/user-placeholder.svg'
    -- その他
    ELSE '/assets/user-placeholder.svg'
END
WHERE image_url LIKE '/images/events/%'
   OR image_url IS NULL
   OR image_url = '';

-- 3. 更新結果の確認
SELECT 
    title,
    image_url,
    category
FROM event_items
WHERE updated_at >= NOW() - INTERVAL '1 minute'
ORDER BY updated_at DESC;