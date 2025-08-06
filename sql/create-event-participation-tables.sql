-- イベント参加登録システム用テーブル

-- 既存のevent_participantsテーブルを拡張
ALTER TABLE event_participants 
ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS attendance_status TEXT DEFAULT 'registered' CHECK (attendance_status IN ('registered', 'attended', 'cancelled', 'no-show')),
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS attendance_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS special_requirements TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'free'));

-- イベント参加証テーブル
CREATE TABLE IF NOT EXISTS event_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) NOT NULL,
    participant_id UUID REFERENCES auth.users(id) NOT NULL,
    certificate_number TEXT UNIQUE NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    certificate_url TEXT,
    UNIQUE(event_id, participant_id)
);

-- イベントリマインダー設定テーブル
CREATE TABLE IF NOT EXISTS event_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('email', 'notification', 'both')),
    reminder_timing INTEGER NOT NULL, -- 何分前に通知するか
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id, reminder_timing)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_event_participants_status ON event_participants(attendance_status);
CREATE INDEX IF NOT EXISTS idx_event_participants_payment ON event_participants(payment_status);
CREATE INDEX IF NOT EXISTS idx_event_certificates_number ON event_certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_event_reminders_timing ON event_reminders(reminder_timing);

-- RLS の設定
ALTER TABLE event_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;

-- event_certificates のポリシー
CREATE POLICY "Users can view their own certificates" ON event_certificates
    FOR SELECT USING (auth.uid() = participant_id);

CREATE POLICY "Admins can manage certificates" ON event_certificates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- event_reminders のポリシー
CREATE POLICY "Users can manage their own reminders" ON event_reminders
    FOR ALL USING (auth.uid() = user_id);

-- 参加証番号生成関数
CREATE OR REPLACE FUNCTION generate_certificate_number(event_id UUID, participant_number INTEGER)
RETURNS TEXT AS $$
DECLARE
    event_date DATE;
    formatted_date TEXT;
BEGIN
    -- イベント日付を取得
    SELECT date INTO event_date FROM events WHERE id = event_id;
    
    -- YYYYMMDD形式にフォーマット
    formatted_date := TO_CHAR(event_date, 'YYYYMMDD');
    
    -- 証明書番号を生成: IC-YYYYMMDD-XXXX
    RETURN 'IC-' || formatted_date || '-' || LPAD(participant_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 参加登録時のトリガー関数
CREATE OR REPLACE FUNCTION handle_event_registration()
RETURNS TRIGGER AS $$
DECLARE
    event_rec RECORD;
    participant_count INTEGER;
BEGIN
    -- イベント情報を取得
    SELECT * INTO event_rec FROM events WHERE id = NEW.event_id;
    
    -- 参加者数を確認
    SELECT COUNT(*) INTO participant_count 
    FROM event_participants 
    WHERE event_id = NEW.event_id 
    AND attendance_status != 'cancelled';
    
    -- 定員チェック
    IF event_rec.max_participants IS NOT NULL AND participant_count >= event_rec.max_participants THEN
        RAISE EXCEPTION 'このイベントは定員に達しています';
    END IF;
    
    -- デフォルトリマインダーを設定（1日前）
    INSERT INTO event_reminders (event_id, user_id, reminder_type, reminder_timing)
    VALUES (NEW.event_id, NEW.user_id, 'both', 1440) -- 1440分 = 24時間
    ON CONFLICT (event_id, user_id, reminder_timing) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
CREATE TRIGGER trigger_event_registration
    AFTER INSERT ON event_participants
    FOR EACH ROW
    EXECUTE FUNCTION handle_event_registration();

-- キャンセル処理のトリガー関数
CREATE OR REPLACE FUNCTION handle_event_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    -- キャンセル時のタイムスタンプを記録
    IF NEW.attendance_status = 'cancelled' AND OLD.attendance_status != 'cancelled' THEN
        NEW.cancelled_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- キャンセルトリガーの作成
CREATE TRIGGER trigger_event_cancellation
    BEFORE UPDATE ON event_participants
    FOR EACH ROW
    EXECUTE FUNCTION handle_event_cancellation();