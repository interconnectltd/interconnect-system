-- ===========================
-- user_idカラムの存在確認SQL
-- ===========================

-- 1. 各テーブルのカラムを確認
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('invitations', 'invite_links', 'cashout_requests', 'user_points')
AND column_name LIKE '%user%' OR column_name LIKE '%inviter%' OR column_name LIKE '%invitee%'
ORDER BY table_name, column_name;

-- 2. invite_linksテーブルの構造確認
\d invite_links

-- 3. invitationsテーブルの構造確認
\d invitations

-- 4. cashout_requestsテーブルの構造確認
\d cashout_requests

-- 5. user_pointsテーブルが存在するか確認
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_points'
);

-- 6. get_referral_stats関数の定義を確認
\df get_referral_stats