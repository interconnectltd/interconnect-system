-- ======================================
-- メンバーページ用の最適化されたSQL
-- 実際のテーブル構造に基づいた実装
-- ======================================

-- 1. 実際に使用するテーブルを確認
SELECT 
    'active_users' as table_name,
    COUNT(*) as record_count,
    COUNT(DISTINCT id) as unique_users
FROM active_users
UNION ALL
SELECT 
    'user_profiles' as table_name,
    COUNT(*) as record_count,
    COUNT(DISTINCT id) as unique_users
FROM user_profiles
UNION ALL
SELECT 
    'connections' as table_name,
    COUNT(*) as record_count,
    COUNT(DISTINCT requester_id) as unique_requesters
FROM connections;

-- 2. active_usersテーブルに必要な列を追加（すでに多くの列が存在）
ALTER TABLE public.active_users 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT[],
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- 3. full_nameにnameの値をコピー
UPDATE public.active_users 
SET full_name = COALESCE(full_name, name)
WHERE full_name IS NULL AND name IS NOT NULL;

-- 4. 必要なインデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_active_users_full_name ON public.active_users(full_name);
CREATE INDEX IF NOT EXISTS idx_active_users_company ON public.active_users(company);
CREATE INDEX IF NOT EXISTS idx_active_users_industry ON public.active_users(industry);
CREATE INDEX IF NOT EXISTS idx_active_users_position ON public.active_users(position);
CREATE INDEX IF NOT EXISTS idx_active_users_is_active ON public.active_users(is_active);
CREATE INDEX IF NOT EXISTS idx_active_users_is_online ON public.active_users(is_online);

-- 5. connectionsテーブルの最適化（既存の構造を使用）
-- 既存のconnectionsテーブルはrequester_idとreceiver_idを使用
CREATE INDEX IF NOT EXISTS idx_connections_requester_id ON public.connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_receiver_id ON public.connections(receiver_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON public.connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_created_at ON public.connections(created_at DESC);

-- 6. メンバー一覧取得用のビューを作成
CREATE OR REPLACE VIEW public.members_list AS
SELECT 
    au.id,
    au.email,
    COALESCE(au.full_name, au.name) as full_name,
    au.company,
    au.position as title,
    au.industry,
    au.position as role,  -- roleは後で適切にマッピング
    au.skills,
    au.bio,
    au.avatar_url,
    au.is_online,
    au.is_active,
    au.last_login_at as last_seen,
    au.created_at,
    -- コネクション数を計算
    COALESCE(conn_sent.count, 0) + COALESCE(conn_received.count, 0) as connection_count
FROM 
    public.active_users au
LEFT JOIN (
    SELECT requester_id, COUNT(*) as count
    FROM public.connections
    WHERE status = 'accepted'
    GROUP BY requester_id
) conn_sent ON au.id = conn_sent.requester_id
LEFT JOIN (
    SELECT receiver_id, COUNT(*) as count
    FROM public.connections
    WHERE status = 'accepted'
    GROUP BY receiver_id
) conn_received ON au.id = conn_received.receiver_id
WHERE 
    au.is_active = true;

-- 7. サンプルデータを更新（実際のデータがある場合）
DO $$
DECLARE
    user_record RECORD;
    sample_skills TEXT[][] := ARRAY[
        ARRAY['IT', 'AI', 'DX推進'],
        ARRAY['マーケティング', 'EC', 'グローバル'],
        ARRAY['開発', 'クラウド', 'DevOps'],
        ARRAY['人材開発', '採用', '組織開発'],
        ARRAY['営業戦略', 'BtoB', 'CRM']
    ];
    counter INTEGER := 0;
BEGIN
    -- 最初の5人のアクティブユーザーにサンプルスキルを設定
    FOR user_record IN 
        SELECT id 
        FROM public.active_users 
        WHERE is_active = true 
        AND (skills IS NULL OR array_length(skills, 1) = 0)
        ORDER BY created_at
        LIMIT 5
    LOOP
        counter := counter + 1;
        
        UPDATE public.active_users
        SET 
            skills = sample_skills[counter],
            is_online = (counter % 2 = 1)
        WHERE id = user_record.id;
    END LOOP;
    
    RAISE NOTICE 'Updated % users with sample skills', counter;
END $$;

-- 8. メンバー検索用の関数を作成
CREATE OR REPLACE FUNCTION search_members(
    search_term TEXT DEFAULT NULL,
    filter_industry TEXT DEFAULT NULL,
    filter_role TEXT DEFAULT NULL,
    page_number INTEGER DEFAULT 1,
    items_per_page INTEGER DEFAULT 12
) 
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    company TEXT,
    title TEXT,
    industry TEXT,
    skills TEXT[],
    avatar_url TEXT,
    is_online BOOLEAN,
    connection_count BIGINT,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered_members AS (
        SELECT 
            m.*,
            COUNT(*) OVER() as total_count
        FROM members_list m
        WHERE 
            (search_term IS NULL OR search_term = '' OR 
             m.full_name ILIKE '%' || search_term || '%' OR 
             m.company ILIKE '%' || search_term || '%' OR 
             m.bio ILIKE '%' || search_term || '%')
            AND (filter_industry IS NULL OR filter_industry = '' OR m.industry = filter_industry)
            AND (filter_role IS NULL OR filter_role = '' OR m.role = filter_role)
    )
    SELECT 
        fm.id,
        fm.full_name,
        fm.company,
        fm.title,
        fm.industry,
        fm.skills,
        fm.avatar_url,
        fm.is_online,
        fm.connection_count,
        fm.total_count
    FROM filtered_members fm
    ORDER BY fm.is_online DESC, fm.full_name
    LIMIT items_per_page
    OFFSET (page_number - 1) * items_per_page;
END;
$$ LANGUAGE plpgsql;

-- 9. 統計情報を確認
SELECT 
    COUNT(*) as total_active_users,
    COUNT(CASE WHEN is_online THEN 1 END) as online_users,
    COUNT(CASE WHEN skills IS NOT NULL AND array_length(skills, 1) > 0 THEN 1 END) as users_with_skills,
    COUNT(CASE WHEN industry IS NOT NULL THEN 1 END) as users_with_industry
FROM public.active_users
WHERE is_active = true;

-- 10. テスト検索を実行
SELECT * FROM search_members('', NULL, NULL, 1, 12);

-- 11. RLSポリシーの確認と修正
-- active_usersテーブルのRLSが有効な場合
ALTER TABLE public.active_users ENABLE ROW LEVEL SECURITY;

-- すべてのユーザーがメンバー一覧を閲覧可能
CREATE POLICY IF NOT EXISTS "Members are viewable by everyone" 
ON public.active_users 
FOR SELECT 
USING (is_active = true);

-- 自分のプロフィールは更新可能
CREATE POLICY IF NOT EXISTS "Users can update own profile" 
ON public.active_users 
FOR UPDATE 
USING (auth.uid() = id);

-- 12. メンバーページ用のマテリアライズドビュー（パフォーマンス向上）
CREATE MATERIALIZED VIEW IF NOT EXISTS public.members_cache AS
SELECT 
    au.id,
    au.email,
    COALESCE(au.full_name, au.name) as full_name,
    au.company,
    au.position as title,
    au.industry,
    au.skills,
    au.avatar_url,
    au.is_online,
    au.connection_count,
    au.message_count,
    au.last_login_at,
    au.created_at
FROM public.active_users au
WHERE au.is_active = true;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_members_cache_full_name ON public.members_cache(full_name);
CREATE INDEX IF NOT EXISTS idx_members_cache_company ON public.members_cache(company);
CREATE INDEX IF NOT EXISTS idx_members_cache_industry ON public.members_cache(industry);

-- 定期的にリフレッシュするための関数
CREATE OR REPLACE FUNCTION refresh_members_cache() 
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.members_cache;
END;
$$ LANGUAGE plpgsql;