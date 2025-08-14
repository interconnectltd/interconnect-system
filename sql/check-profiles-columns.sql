-- profilesテーブルの構造を確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'profiles'
    AND table_schema = 'public'
ORDER BY 
    ordinal_position;

-- profilesテーブルのサンプルデータを確認（名前に関連するカラムを探す）
SELECT * FROM profiles LIMIT 1;