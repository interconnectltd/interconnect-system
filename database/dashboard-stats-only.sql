-- ===========================
-- INTERCONNECT Dashboard Stats Table Only
-- 既存のテーブル構造と競合しない最小構成
-- ===========================

-- ダッシュボード統計データテーブルのみ作成
CREATE TABLE IF NOT EXISTS dashboard_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_members INTEGER DEFAULT 0,
    monthly_events INTEGER DEFAULT 0,
    matching_success INTEGER DEFAULT 0,
    unread_messages INTEGER DEFAULT 0,
    member_growth_percentage DECIMAL(5,2) DEFAULT 0,
    event_increase INTEGER DEFAULT 0,
    pending_invitations INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================
-- RLS (Row Level Security) ポリシー
-- ===========================

-- dashboard_stats テーブルのRLS有効化
ALTER TABLE dashboard_stats ENABLE ROW LEVEL SECURITY;

-- 読み取り: 誰でも可能
CREATE POLICY "dashboard_stats_select" ON dashboard_stats
    FOR SELECT USING (true);

-- 更新: 認証済みユーザーのみ
CREATE POLICY "dashboard_stats_update" ON dashboard_stats
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 挿入: 認証済みユーザーのみ
CREATE POLICY "dashboard_stats_insert" ON dashboard_stats
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ===========================
-- 初期データ挿入
-- ===========================

-- 初期統計データ（既存データがない場合のみ）
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
    (SELECT COUNT(*) FROM auth.users),  -- 実際のユーザー数
    5,    -- 今月のイベント数（仮）
    0,    -- マッチング成功数
    0,    -- 未読メッセージ
    12.5, -- 前月比成長率（仮）
    3,    -- イベント増加数（仮）
    0     -- 保留中の招待
WHERE NOT EXISTS (SELECT 1 FROM dashboard_stats);

-- ===========================
-- 自動更新トリガー
-- ===========================

-- dashboard_stats updated_at自動更新
CREATE OR REPLACE FUNCTION update_dashboard_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS dashboard_stats_updated_at ON dashboard_stats;
CREATE TRIGGER dashboard_stats_updated_at
    BEFORE UPDATE ON dashboard_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_stats_updated_at();

-- ===========================
-- 統計データ手動更新関数
-- ===========================

-- メンバー数を更新する関数
CREATE OR REPLACE FUNCTION refresh_member_count()
RETURNS void AS $$
DECLARE
    total_users INTEGER;
BEGIN
    -- 総ユーザー数を取得
    SELECT COUNT(*) INTO total_users FROM auth.users;
    
    -- 統計データを更新
    UPDATE dashboard_stats SET
        total_members = total_users,
        updated_at = NOW()
    WHERE id = (SELECT id FROM dashboard_stats LIMIT 1);
    
    -- レコードが存在しない場合は何もしない（初期データは既に挿入済み）
END;
$$ LANGUAGE plpgsql;

-- 権限設定
GRANT EXECUTE ON FUNCTION refresh_member_count() TO authenticated;

-- ===========================
-- 統計データの初回更新
-- ===========================

-- 関数を実行してメンバー数を更新
SELECT refresh_member_count();

-- ===========================
-- 完了メッセージ
-- ===========================

DO $$
BEGIN
    RAISE NOTICE '===================================';
    RAISE NOTICE 'Dashboard Stats Table Created Successfully!';
    RAISE NOTICE '===================================';
    RAISE NOTICE 'Table created: dashboard_stats';
    RAISE NOTICE 'Initial data inserted with actual member count';
    RAISE NOTICE '';
    RAISE NOTICE 'Note: This minimal version only creates the stats table.';
    RAISE NOTICE 'The dashboard will use fallback data for activities and events.';
END $$;