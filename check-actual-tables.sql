-- Supabaseの実際のテーブル名を確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_profiles')
ORDER BY table_name;

-- profilesまたはuser_profilesテーブルのカラムを確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_profiles')
ORDER BY table_name, ordinal_position;