-- eventsテーブルの構造を詳しく確認

-- 1. eventsテーブルのカラムを確認
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'events'
ORDER BY ordinal_position;

-- 2. eventsテーブルにデータがあるか確認
SELECT COUNT(*) as event_count FROM events;

-- 3. サンプルデータを1件取得
SELECT * FROM events LIMIT 1;