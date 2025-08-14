-- event_itemsテーブルのカラムを確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'event_items' 
ORDER BY ordinal_position;

-- もしくは
-- DESCRIBE event_items;