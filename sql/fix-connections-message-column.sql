-- connectionsテーブルにmessageカラムを追加
-- エラー: Could not find the 'message' column of 'connections' in the schema cache

-- 1. 現在のconnectionsテーブルの構造を確認
-- まず、テーブルが存在するか確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'connections'
ORDER BY ordinal_position;

-- 2. messageカラムが存在しない場合は追加
ALTER TABLE connections 
ADD COLUMN IF NOT EXISTS message TEXT;

-- 3. カラムが追加されたことを確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'connections'
AND column_name = 'message';

-- 4. RLSポリシーを更新（messageカラムへのアクセスを許可）
-- 既存のポリシーを確認
SELECT pol.polname, pol.polcmd, rol.rolname
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
JOIN pg_roles rol ON pol.polroles @> ARRAY[rol.oid]
WHERE nsp.nspname = 'public'
AND cls.relname = 'connections';

-- 5. テスト: messageカラムに値を設定できるか確認
-- 注意: 実際のuser_idとconnected_user_idは存在するものに置き換えてください
/*
INSERT INTO connections (user_id, connected_user_id, status, message)
VALUES (
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM auth.users OFFSET 1 LIMIT 1),
    'pending',
    'テストメッセージです'
)
ON CONFLICT DO NOTHING;
*/

-- 6. 既存のレコードにデフォルトメッセージを設定（オプション）
UPDATE connections 
SET message = 'コネクト申請'
WHERE message IS NULL 
AND status = 'pending';

-- 7. スキーマキャッシュをリフレッシュ
-- Supabaseダッシュボードから実行するか、アプリケーションを再起動してください
NOTIFY pgrst, 'reload schema';