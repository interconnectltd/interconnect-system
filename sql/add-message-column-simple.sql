-- connectionsテーブルにmessageカラムを追加する簡易版
-- Supabase SQL Editorで実行してください

-- messageカラムを追加（存在しない場合のみ）
ALTER TABLE connections 
ADD COLUMN IF NOT EXISTS message TEXT;

-- カラムが追加されたことを確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'connections' 
AND column_name = 'message';