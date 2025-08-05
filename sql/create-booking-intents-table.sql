-- 予約意図テーブル（TimeRexが使えない間の代替）
CREATE TABLE IF NOT EXISTS booking_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    referral_code VARCHAR(50),
    booking_method VARCHAR(50), -- 'google_calendar', 'calendly', 'timerex'など
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- インデックス
    INDEX idx_booking_intents_user_id (user_id),
    INDEX idx_booking_intents_referral_code (referral_code),
    INDEX idx_booking_intents_created_at (created_at)
);

-- RLSを有効化
ALTER TABLE booking_intents ENABLE ROW LEVEL SECURITY;

-- ポリシー：ユーザーは自分の予約意図のみ作成・閲覧可能
CREATE POLICY "Users can insert their own booking intents"
    ON booking_intents
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own booking intents"
    ON booking_intents
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 管理者は全ての予約意図を閲覧可能
CREATE POLICY "Admins can view all booking intents"
    ON booking_intents
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- コメント
COMMENT ON TABLE booking_intents IS 'ユーザーの予約意図を記録（実際の予約が完了する前の段階）';
COMMENT ON COLUMN booking_intents.referral_code IS '予約時に使用された紹介コード';
COMMENT ON COLUMN booking_intents.booking_method IS '予約に使用された方法（google_calendar, calendly, timerexなど）';