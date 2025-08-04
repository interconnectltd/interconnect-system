-- TimeRex予約システム用のテーブル作成（修正版）

-- 予約セッション管理テーブル
CREATE TABLE IF NOT EXISTS booking_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timerex_session_id VARCHAR(255) UNIQUE NOT NULL, -- TimeRexのセッションID（カラム名変更）
    user_id UUID REFERENCES auth.users(id),
    user_email VARCHAR(255),
    referral_code VARCHAR(20),
    status VARCHAR(50) DEFAULT 'pending',
    timerex_data JSONB, -- TimeRexから返されたデータ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 予約情報テーブル（TimeRexから同期）
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timerex_id VARCHAR(255) UNIQUE NOT NULL, -- TimeRexの予約ID
    timerex_session_id VARCHAR(255) REFERENCES booking_sessions(timerex_session_id), -- 参照先も変更
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    staff_name VARCHAR(255),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    consultation_type VARCHAR(100),
    consultation_details TEXT,
    referral_code VARCHAR(20),
    google_meet_url TEXT, -- TimeRexが生成するオンライン会議URL
    status VARCHAR(50) DEFAULT 'confirmed',
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 通知テーブル（既存のnotificationsテーブルが無い場合のみ作成）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES auth.users(id),
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            data JSONB,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            read_at TIMESTAMP WITH TIME ZONE
        );
    END IF;
END $$;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_booking_sessions_user_id ON booking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_sessions_timerex_session_id ON booking_sessions(timerex_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_timerex_id ON bookings(timerex_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_email ON bookings(user_email);
CREATE INDEX IF NOT EXISTS idx_bookings_referral_code ON bookings(referral_code);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at ON bookings(scheduled_at);

-- 通知テーブルのインデックス（テーブルが存在する場合のみ）
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    END IF;
END $$;

-- RLSポリシー設定
ALTER TABLE booking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 通知テーブルのRLS（存在する場合のみ）
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

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

-- bookingsのRLSポリシー（メールアドレスベース）
DROP POLICY IF EXISTS "Users can view bookings with their email" ON bookings;
CREATE POLICY "Users can view bookings with their email" ON bookings
    FOR SELECT USING (
        user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Service role can manage all bookings" ON bookings;
CREATE POLICY "Service role can manage all bookings" ON bookings
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- notificationsのRLSポリシー（テーブルが存在する場合のみ）
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
        CREATE POLICY "Users can view their own notifications" ON notifications
            FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
        CREATE POLICY "Users can update their own notifications" ON notifications
            FOR UPDATE USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Service role can manage all notifications" ON notifications;
        CREATE POLICY "Service role can manage all notifications" ON notifications
            FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;
END $$;

-- 紹介ポイント付与用の関数（既存のadd_referral_pointsが無い場合）
CREATE OR REPLACE FUNCTION add_referral_points(
    user_id UUID,
    points INTEGER,
    reason TEXT,
    booking_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- profilesテーブルのreferral_pointsを更新
    UPDATE profiles 
    SET referral_points = COALESCE(referral_points, 0) + points,
        updated_at = NOW()
    WHERE id = user_id;
    
    -- ポイント履歴テーブルがある場合は記録
    INSERT INTO point_transactions (user_id, points, reason, booking_id, created_at)
    VALUES (user_id, points, reason, booking_id, NOW())
    ON CONFLICT DO NOTHING; -- テーブルが存在しない場合はスキップ
    
EXCEPTION
    WHEN undefined_table THEN
        -- point_transactionsテーブルが存在しない場合は無視
        NULL;
END;
$$;

-- ポイント取引履歴テーブル（オプション）
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    booking_id TEXT,
    referral_code VARCHAR(20), -- 追加：紹介コード
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_point_transactions_referral_code ON point_transactions(referral_code);

-- point_transactionsのRLS
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own point transactions" ON point_transactions;
CREATE POLICY "Users can view their own point transactions" ON point_transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage point transactions" ON point_transactions;  
CREATE POLICY "Service role can manage point transactions" ON point_transactions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 予約関連の便利なビュー
CREATE OR REPLACE VIEW booking_details AS
SELECT 
    b.*,
    bs.timerex_session_id,
    bs.timerex_data,
    p.name as user_profile_name,
    p.email as user_profile_email
FROM bookings b
LEFT JOIN booking_sessions bs ON b.timerex_session_id = bs.timerex_session_id
LEFT JOIN profiles p ON p.email = b.user_email;

-- 管理者用の予約統計ビュー
CREATE OR REPLACE VIEW booking_stats AS
SELECT 
    DATE(scheduled_at) as booking_date,
    COUNT(*) as total_bookings,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
    COUNT(CASE WHEN referral_code != 'DIRECT' THEN 1 END) as referred_bookings
FROM bookings
GROUP BY DATE(scheduled_at)
ORDER BY booking_date DESC;