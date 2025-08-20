-- user_profilesテーブルの実際のカラムを確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'user_profiles'
ORDER BY 
    ordinal_position;

-- または単純に
-- \d user_profiles