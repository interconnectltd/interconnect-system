-- 紹介追跡システム用の追加テーブル（修正版）

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
    ELSE
        -- invitationsテーブルが存在しない場合は作成
        CREATE TABLE invitations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            inviter_id UUID REFERENCES auth.users(id),
            invitee_id UUID REFERENCES auth.users(id),
            invitee_email VARCHAR(255),
            invite_code VARCHAR(20), -- 既存テーブルのカラム名に合わせる
            status VARCHAR(50) DEFAULT 'pending',
            registered_at TIMESTAMP WITH TIME ZONE,
            referral_data JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- インデックス作成
        CREATE INDEX idx_invitations_inviter_id ON invitations(inviter_id);
        CREATE INDEX idx_invitations_invitee_id ON invitations(invitee_id);
        CREATE INDEX idx_invitations_invite_code ON invitations(invite_code);
        
        -- RLS設定
        ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view their own invitations" ON invitations
            FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);
        
        CREATE POLICY "Service role can manage invitations" ON invitations
            FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
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
    
    -- profilesテーブルのreferral_pointsを更新
    UPDATE profiles 
    SET referral_points = COALESCE(referral_points, 0) + points,
        updated_at = NOW()
    WHERE id = inviter_user_id;
    
    -- ポイント履歴テーブルに記録
    INSERT INTO point_transactions (user_id, points, reason, booking_id, referral_code, created_at)
    VALUES (inviter_user_id, points, reason, booking_id, referral_code, NOW())
    ON CONFLICT DO NOTHING;
    
    -- 通知を作成（notificationsテーブルが存在する場合のみ）
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        INSERT INTO notifications (user_id, type, title, message, data, created_at)
        VALUES (
            inviter_user_id,
            'points_awarded',
            'ポイントを獲得しました',
            format('%s により %s ポイントを獲得しました', reason, points),
            jsonb_build_object(
                'points', points,
                'reason', reason,
                'referral_code', referral_code,
                'booking_id', booking_id
            ),
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

-- 統計用ビューの作成（既存テーブル構造に対応）
CREATE OR REPLACE VIEW referral_statistics AS
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
LEFT JOIN invitations i ON i.invite_code = il.link_code  -- invite_code に修正
LEFT JOIN bookings b ON b.referral_code = il.link_code
LEFT JOIN point_transactions pt ON pt.referral_code = il.link_code
WHERE il.is_active = true
GROUP BY il.id, il.link_code, il.description, il.created_by, p.email, il.created_at
ORDER BY il.created_at DESC;

-- 既存のpoint_transactionsテーブルにreferral_codeカラム追加（存在しない場合）
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