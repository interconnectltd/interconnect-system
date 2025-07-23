-- ===========================
-- Dashboard Stats RLS Policy Update
-- 認証なしでも読み取り可能にする修正
-- ===========================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "dashboard_stats_select" ON dashboard_stats;

-- 新しいポリシー: 誰でも読み取り可能（anon含む）
CREATE POLICY "dashboard_stats_public_read" ON dashboard_stats
    FOR SELECT USING (true);

-- 統計データが存在しない場合は作成
INSERT INTO dashboard_stats (
    total_members,
    monthly_events,
    matching_success,
    unread_messages,
    member_growth_percentage,
    event_increase,
    pending_invitations
) 
SELECT 
    1,    -- 初期メンバー数
    5,    -- 今月のイベント数（仮）
    0,    -- マッチング成功数
    0,    -- 未読メッセージ
    12.5, -- 前月比成長率（仮）
    3,    -- イベント増加数（仮）
    0     -- 保留中の招待
WHERE NOT EXISTS (SELECT 1 FROM dashboard_stats);

-- 統計データの強制更新（デバッグ用）
UPDATE dashboard_stats 
SET 
    total_members = (SELECT COUNT(*) FROM auth.users),
    updated_at = NOW()
WHERE id = (SELECT id FROM dashboard_stats LIMIT 1);

-- 確認用: 現在のデータを表示
SELECT * FROM dashboard_stats;

-- ===========================
-- 完了メッセージ
-- ===========================

DO $$
BEGIN
    RAISE NOTICE '===================================';
    RAISE NOTICE 'RLS Policy Updated Successfully!';
    RAISE NOTICE '===================================';
    RAISE NOTICE 'dashboard_stats table is now publicly readable';
    RAISE NOTICE 'Anonymous users can now read the stats';
END $$;