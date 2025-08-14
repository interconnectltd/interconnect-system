-- シンプルなイベントデータ挿入（最小限のフィールドのみ）
-- organizer_id制約を回避するためNULLを使用

-- 既存データを確認
SELECT COUNT(*) as current_count FROM event_items;

-- シンプルなテストイベントを挿入（必須フィールドを含む）
INSERT INTO event_items (
    id,
    title,
    description,
    event_type,
    event_date,
    start_time,
    end_time,
    is_public,
    is_cancelled,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'シンプルテストイベント',
    'データ挿入テスト用のシンプルなイベント',
    'online',
    CURRENT_DATE + INTERVAL '1 day',
    '14:00:00',  -- start_time必須
    '16:00:00',  -- end_time必須
    true,
    false,
    NOW(),
    NOW()
);

-- 結果確認
SELECT 
    title,
    event_date,
    is_public
FROM event_items
WHERE title = 'シンプルテストイベント';