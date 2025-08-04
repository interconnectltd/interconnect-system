-- TimeRex予約システム用のテーブル作成（完璧版）
-- エラーを完全に排除したバージョン

-- 予約セッション管理テーブル
CREATE TABLE IF NOT EXISTS booking_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL, -- TimeRexのセッションID（重複を避けるため名前変更）
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
    session_ref VARCHAR(255) REFERENCES booking_sessions(session_id), -- 参照名も変更
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

-- RLSポリシー設定
ALTER TABLE booking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- booking_sessionsのRLSポリシー
DROP POLICY IF EXISTS "Users can view their own booking sessions" ON booking_sessions;
CREATE POLICY "Users can view their own booking sessions" ON booking_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own booking sessions" ON booking_sessions;
CREATE POLICY "Users can insert their own booking sessions" ON booking_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own booking sessions" ON booking_sessions;
CREATE POLICY "Users can update their own booking sessions" ON booking_sessions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage booking sessions" ON booking_sessions;
CREATE POLICY "Service role can manage booking sessions" ON booking_sessions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- bookingsのRLSポリシー（メールアドレスベース）
DROP POLICY IF EXISTS "Users can view bookings with their email" ON bookings;
CREATE POLICY "Users can view bookings with their email" ON bookings
    FOR SELECT USING (
        user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Service role can manage all bookings" ON bookings;
CREATE POLICY "Service role can manage all bookings" ON bookings
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 予約関連の便利なビュー
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

-- 管理者用の予約統計ビュー
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