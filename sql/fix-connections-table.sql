-- ======================================
-- connectionsテーブルのカラム名修正
-- ======================================

-- 既存のconnectionsテーブルを確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'connections' 
AND table_schema = 'public';

-- カラム名を修正（connected_user_id → target_user_id）
ALTER TABLE public.connections 
RENAME COLUMN connected_user_id TO target_user_id;

-- 確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'connections' 
AND table_schema = 'public';