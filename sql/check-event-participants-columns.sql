-- event_participantsテーブルのカラムを確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'event_participants' 
ORDER BY ordinal_position;

-- もしくはこの方法で確認
-- SELECT * FROM event_participants LIMIT 0;