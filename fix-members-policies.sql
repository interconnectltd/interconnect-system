-- ======================================
-- メンバーページ用のRLSポリシー修正
-- CREATE POLICY IF NOT EXISTSはサポートされていないため修正
-- ======================================

-- 1. active_usersテーブルのRLSを有効化
ALTER TABLE public.active_users ENABLE ROW LEVEL SECURITY;

-- 2. 既存のポリシーを削除（エラー回避）
DROP POLICY IF EXISTS "Members are viewable by everyone" ON public.active_users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.active_users;
DROP POLICY IF EXISTS "active_users_select_policy" ON public.active_users;
DROP POLICY IF EXISTS "active_users_update_policy" ON public.active_users;

-- 3. 新しいポリシーを作成

-- すべてのアクティブユーザーを閲覧可能
CREATE POLICY "active_users_select_policy" 
ON public.active_users 
FOR SELECT 
USING (is_active = true);

-- 自分のプロフィールは更新可能
CREATE POLICY "active_users_update_policy" 
ON public.active_users 
FOR UPDATE 
USING (auth.uid() = id);

-- 4. connectionsテーブルのポリシーも修正
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "connections_select_policy" ON public.connections;
DROP POLICY IF EXISTS "connections_insert_policy" ON public.connections;
DROP POLICY IF EXISTS "connections_update_policy" ON public.connections;
DROP POLICY IF EXISTS "connections_delete_policy" ON public.connections;

-- 新しいポリシーを作成
-- 全ユーザーが全コネクションを閲覧可能（プライバシー設定に応じて後で調整）
CREATE POLICY "connections_select_policy" 
ON public.connections 
FOR SELECT 
USING (true);

-- 認証されたユーザーは新規作成可能
CREATE POLICY "connections_insert_policy" 
ON public.connections 
FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

-- 関連するユーザーは更新可能
CREATE POLICY "connections_update_policy" 
ON public.connections 
FOR UPDATE 
USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- 申請者は削除可能
CREATE POLICY "connections_delete_policy" 
ON public.connections 
FOR DELETE 
USING (auth.uid() = requester_id);

-- 5. 必要な列の追加（エラーが出ても続行）
DO $$
BEGIN
    -- active_usersテーブルに必要な列を追加
    ALTER TABLE public.active_users 
    ADD COLUMN IF NOT EXISTS full_name TEXT;
    
    ALTER TABLE public.active_users 
    ADD COLUMN IF NOT EXISTS title TEXT;
    
    ALTER TABLE public.active_users 
    ADD COLUMN IF NOT EXISTS role TEXT;
    
    ALTER TABLE public.active_users 
    ADD COLUMN IF NOT EXISTS skills TEXT[];
    
    ALTER TABLE public.active_users 
    ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
    
    ALTER TABLE public.active_users 
    ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;
    
    -- full_nameにnameの値をコピー
    UPDATE public.active_users 
    SET full_name = COALESCE(full_name, name)
    WHERE full_name IS NULL AND name IS NOT NULL;
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Some columns might already exist: %', SQLERRM;
END $$;

-- 6. インデックスの作成（エラーが出ても続行）
DO $$
BEGIN
    CREATE INDEX idx_active_users_full_name ON public.active_users(full_name);
    CREATE INDEX idx_active_users_company ON public.active_users(company);
    CREATE INDEX idx_active_users_industry ON public.active_users(industry);
    CREATE INDEX idx_active_users_position ON public.active_users(position);
    CREATE INDEX idx_active_users_is_active ON public.active_users(is_active);
    CREATE INDEX idx_active_users_is_online ON public.active_users(is_online);
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Some indexes might already exist: %', SQLERRM;
END $$;

-- 7. メンバー一覧ビューの作成（簡易版）
CREATE OR REPLACE VIEW public.member_list_view AS
SELECT 
    au.id,
    au.email,
    COALESCE(au.full_name, au.name) as display_name,
    au.company,
    au.position,
    au.industry,
    au.skills,
    au.bio,
    au.avatar_url,
    au.is_online,
    au.connection_count,
    au.created_at
FROM public.active_users au
WHERE au.is_active = true;

-- 8. 結果確認
SELECT 
    'Active Users' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN is_active THEN 1 END) as active_count,
    COUNT(CASE WHEN is_online THEN 1 END) as online_count
FROM public.active_users
UNION ALL
SELECT 
    'Connections' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
FROM public.connections;

-- 9. サンプルデータの確認（最初の5件）
SELECT 
    id,
    COALESCE(full_name, name) as display_name,
    company,
    position,
    industry,
    skills,
    is_online
FROM public.active_users
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 5;