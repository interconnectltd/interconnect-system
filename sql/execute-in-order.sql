-- 実行順序を明確にした完璧なSQL
-- 必ずこの順番で実行してください

-- ========================
-- STEP 1: 予約システムテーブル作成
-- ========================

-- 予約セッション管理テーブル
CREATE TABLE IF NOT EXISTS booking_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL, -- TimeRexのセッションID
    user_id UUID REFERENCES auth.users(id),
    user_email VARCHAR(255),
    referral_code VARCHAR(20),
    status VARCHAR(50) DEFAULT 'pending',
    session_data JSONB, -- TimeRexから返されたデータ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 予約情報テーブル（TimeRexから同期）
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id VARCHAR(255) UNIQUE NOT NULL, -- TimeRexの予約ID
    session_ref VARCHAR(255) REFERENCES booking_sessions(session_id),
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    staff_name VARCHAR(255),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    consultation_type VARCHAR(100),
    consultation_details TEXT,
    referral_code VARCHAR(20),
    meeting_url TEXT, -- TimeRexが生成するオンライン会議URL
    status VARCHAR(50) DEFAULT 'confirmed',
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_booking_sessions_user_id ON booking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_sessions_session_id ON booking_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_email ON bookings(user_email);
CREATE INDEX IF NOT EXISTS idx_bookings_referral_code ON bookings(referral_code);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at ON bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_session_ref ON bookings(session_ref);

-- RLS設定
ALTER TABLE booking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DROP POLICY IF EXISTS "Users can view their own booking sessions" ON booking_sessions;
CREATE POLICY "Users can view their own booking sessions" ON booking_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own booking sessions" ON booking_sessions;
CREATE POLICY "Users can insert their own booking sessions" ON booking_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage booking sessions" ON booking_sessions;
CREATE POLICY "Service role can manage booking sessions" ON booking_sessions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Users can view bookings with their email" ON bookings;
CREATE POLICY "Users can view bookings with their email" ON bookings
    FOR SELECT USING (
        user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Service role can manage all bookings" ON bookings;
CREATE POLICY "Service role can manage all bookings" ON bookings
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ========================
-- STEP 2: 紹介追跡テーブル作成
-- ========================

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

DROP POLICY IF EXISTS "Admin can manage referral clicks" ON referral_clicks;
CREATE POLICY "Admin can manage referral clicks" ON referral_clicks
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ========================
-- STEP 3: 既存テーブル拡張
-- ========================

-- 既存のinvitationsテーブルの確認と修正
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='invitations' AND column_name='registered_at') THEN
            ALTER TABLE invitations ADD COLUMN registered_at TIMESTAMP WITH TIME ZONE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='invitations' AND column_name='referral_data') THEN
            ALTER TABLE invitations ADD COLUMN referral_data JSONB;
        END IF;
    END IF;
END $$;

-- point_transactionsテーブルにreferral_codeカラム追加
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

-- ========================
-- STEP 4: 関数作成
-- ========================

-- 紹介ポイント付与関数
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
    SELECT created_by INTO inviter_user_id
    FROM invite_links 
    WHERE link_code = referral_code 
    AND is_active = true 
    LIMIT 1;
    
    IF inviter_user_id IS NULL THEN
        RETURN;
    END IF;
    
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
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'point_transactions') THEN
        INSERT INTO point_transactions (user_id, points, reason, created_at, referral_code)
        VALUES (inviter_user_id, points, reason, NOW(), referral_code)
        ON CONFLICT DO NOTHING;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'ポイント付与エラー: %', SQLERRM;
END;
$$;

-- ========================
-- STEP 5: ビュー作成
-- ========================

-- 統計用ビュー
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
LEFT JOIN invitations i ON i.invitation_code = il.link_code
LEFT JOIN bookings b ON b.referral_code = il.link_code
LEFT JOIN point_transactions pt ON pt.referral_code = il.link_code
WHERE il.is_active = true
GROUP BY il.id, il.link_code, il.description, il.created_by, p.email, il.created_at
ORDER BY il.created_at DESC;

-- 予約詳細ビュー
CREATE OR REPLACE VIEW booking_details AS
SELECT 
    b.*,
    bs.session_id,
    bs.session_data,
    p.name as user_profile_name,
    p.email as user_profile_email
FROM bookings b
LEFT JOIN booking_sessions bs ON b.session_ref = bs.session_id
LEFT JOIN profiles p ON p.email = b.user_email;

-- 予約統計ビュー
CREATE OR REPLACE VIEW booking_stats AS
SELECT 
    DATE(scheduled_at) as booking_date,
    COUNT(*) as total_bookings,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
    COUNT(CASE WHEN referral_code IS NOT NULL AND referral_code != 'DIRECT' THEN 1 END) as referred_bookings
FROM bookings
GROUP BY DATE(scheduled_at)
ORDER BY booking_date DESC;