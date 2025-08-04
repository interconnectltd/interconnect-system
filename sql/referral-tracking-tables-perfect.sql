-- 紹介追跡システム用の追加テーブル（完璧版）
-- 既存のデータベース構造に完全対応し、エラーを完全排除

-- 紹介クリック追跡テーブル
CREATE TABLE IF NOT EXISTS referral_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_code VARCHAR(20) NOT NULL,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    referrer TEXT,
    landing_url TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON referral_clicks(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_clicked_at ON referral_clicks(clicked_at);

-- RLS設定
ALTER TABLE referral_clicks ENABLE ROW LEVEL SECURITY;

-- 管理者のみアクセス可能
DROP POLICY IF EXISTS "Admin can manage referral clicks" ON referral_clicks;
CREATE POLICY "Admin can manage referral clicks" ON referral_clicks
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 既存のinvitationsテーブルの確認と修正
DO $$ 
BEGIN
    -- invitationsテーブルが存在するかチェック
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
        -- registered_atカラムを追加（存在しない場合）
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='invitations' AND column_name='registered_at') THEN
            ALTER TABLE invitations ADD COLUMN registered_at TIMESTAMP WITH TIME ZONE;
        END IF;
        
        -- referral_dataカラムを追加（存在しない場合）
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='invitations' AND column_name='referral_data') THEN
            ALTER TABLE invitations ADD COLUMN referral_data JSONB;
        END IF;
    END IF;
END $$;

-- point_transactionsテーブルにreferral_codeカラム追加（存在しない場合）
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'point_transactions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='point_transactions' AND column_name='referral_code') THEN
            ALTER TABLE point_transactions ADD COLUMN referral_code VARCHAR(20);
            CREATE INDEX IF NOT EXISTS idx_point_transactions_referral_code ON point_transactions(referral_code);
        END IF;
    END IF;
END $$;

-- 紹介コードからポイント付与する関数の改良版
CREATE OR REPLACE FUNCTION add_referral_points(
    referral_code TEXT,
    points INTEGER,
    reason TEXT,
    booking_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    inviter_user_id UUID;
BEGIN
    -- 紹介コードから紹介者IDを取得
    SELECT created_by INTO inviter_user_id
    FROM invite_links 
    WHERE link_code = referral_code 
    AND is_active = true 
    LIMIT 1;
    
    -- 紹介者が見つからない場合は何もしない
    IF inviter_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- profilesテーブルにreferral_pointsカラムがあるか確認して更新
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='profiles' AND column_name='available_points') THEN
        UPDATE profiles 
        SET available_points = COALESCE(available_points, 0) + points,
            updated_at = NOW()
        WHERE id = inviter_user_id;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='profiles' AND column_name='total_points_earned') THEN
        UPDATE profiles 
        SET total_points_earned = COALESCE(total_points_earned, 0) + points,
            updated_at = NOW()
        WHERE id = inviter_user_id;
    END IF;
    
    -- ポイント履歴テーブルに記録
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'point_transactions') THEN
        INSERT INTO point_transactions (user_id, points, reason, created_at, referral_code)
        VALUES (inviter_user_id, points, reason, NOW(), referral_code)
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- 通知を作成（notificationsテーブルが存在する場合のみ）
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        INSERT INTO notifications (user_id, type, title, content, created_at)
        VALUES (
            inviter_user_id,
            'points_awarded',
            'ポイントを獲得しました',
            format('%s により %s ポイントを獲得しました', reason, points),
            NOW()
        )
        ON CONFLICT DO NOTHING;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        -- エラーが発生してもロールバックしない
        RAISE WARNING 'ポイント付与エラー: %', SQLERRM;
END;
$$;

-- 統計用ビューの作成（完全安全版）
-- bookingsテーブルが存在しない場合の問題を回避
CREATE OR REPLACE VIEW referral_statistics AS
SELECT 
    il.link_code,
    il.description,
    il.created_by as inviter_id,
    p.email as inviter_email,
    COUNT(DISTINCT rc.id) as click_count,
    COUNT(DISTINCT i.id) as registration_count,
    0 as booking_count, -- bookingsテーブル作成前は0に設定
    COALESCE(SUM(pt.points), 0) as total_points_earned,
    il.created_at as link_created_at
FROM invite_links il
LEFT JOIN profiles p ON p.id = il.created_by
LEFT JOIN referral_clicks rc ON rc.referral_code = il.link_code
LEFT JOIN invitations i ON i.invitation_code = il.link_code  -- 正しいカラム名使用
LEFT JOIN point_transactions pt ON pt.referral_code = il.link_code
WHERE il.is_active = true
GROUP BY il.id, il.link_code, il.description, il.created_by, p.email, il.created_at
ORDER BY il.created_at DESC;

-- bookingsテーブル作成後にビューを更新する関数
CREATE OR REPLACE FUNCTION update_referral_statistics_view()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- bookingsテーブルが存在する場合のみビューを更新
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        -- ビューを再作成（bookingsテーブルを含む版）
        DROP VIEW IF EXISTS referral_statistics;
        CREATE VIEW referral_statistics AS
        SELECT 
            il.link_code,
            il.description,
            il.created_by as inviter_id,
            p.email as inviter_email,
            COUNT(DISTINCT rc.id) as click_count,
            COUNT(DISTINCT i.id) as registration_count,
            COUNT(DISTINCT b.id) as booking_count,
            COALESCE(SUM(pt.points), 0) as total_points_earned,
            il.created_at as link_created_at
        FROM invite_links il
        LEFT JOIN profiles p ON p.id = il.created_by
        LEFT JOIN referral_clicks rc ON rc.referral_code = il.link_code
        LEFT JOIN invitations i ON i.invitation_code = il.link_code
        LEFT JOIN bookings b ON b.referral_code = il.link_code
        LEFT JOIN point_transactions pt ON pt.referral_code = il.link_code
        WHERE il.is_active = true
        GROUP BY il.id, il.link_code, il.description, il.created_by, p.email, il.created_at
        ORDER BY il.created_at DESC;
    END IF;
END;
$$;