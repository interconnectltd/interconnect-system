-- ======================================
-- connection_countカラムの問題を解決
-- ======================================

-- 方法1: user_profilesテーブルにconnection_countカラムを追加
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS connection_count INTEGER DEFAULT 0;

-- 方法2: connectionsテーブルから実際のコネクション数を計算して更新
UPDATE public.user_profiles up
SET connection_count = (
    SELECT COUNT(*)
    FROM public.connections c
    WHERE (c.requester_id = up.id OR c.receiver_id = up.id)
    AND c.status = 'accepted'
)
WHERE up.is_active = true;

-- 方法3: ビューを作成して動的にコネクション数を計算
CREATE OR REPLACE VIEW public.user_profiles_with_connections AS
SELECT 
    up.*,
    COALESCE(conn_count.count, 0) as calculated_connection_count
FROM public.user_profiles up
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as count
    FROM (
        SELECT requester_id as user_id FROM connections WHERE status = 'accepted'
        UNION ALL
        SELECT receiver_id as user_id FROM connections WHERE status = 'accepted'
    ) all_connections
    GROUP BY user_id
) conn_count ON up.id = conn_count.user_id;

-- 結果を確認
SELECT 
    id,
    name,
    company,
    connection_count,
    calculated_connection_count
FROM public.user_profiles_with_connections
WHERE is_active = true
LIMIT 5;