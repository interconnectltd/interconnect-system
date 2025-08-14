-- event_participantsテーブルのカラム修正
-- attendance_statusカラムが存在しない場合は追加、statusをattendance_statusにリネーム

-- 1. 現在のカラムを確認
DO $$
BEGIN
    -- statusカラムが存在し、attendance_statusが存在しない場合
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_participants' 
        AND column_name = 'status'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_participants' 
        AND column_name = 'attendance_status'
    ) THEN
        -- statusをattendance_statusにリネーム
        ALTER TABLE event_participants 
        RENAME COLUMN status TO attendance_status;
        
        RAISE NOTICE 'Renamed column: status -> attendance_status';
    
    -- attendance_statusが存在しない場合は新規作成
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_participants' 
        AND column_name = 'attendance_status'
    ) THEN
        -- attendance_statusカラムを追加
        ALTER TABLE event_participants 
        ADD COLUMN attendance_status text DEFAULT 'registered';
        
        RAISE NOTICE 'Added new column: attendance_status';
    ELSE
        RAISE NOTICE 'Column attendance_status already exists';
    END IF;
END $$;

-- 2. データの整合性を確保（値の統一）
UPDATE event_participants 
SET attendance_status = CASE 
    WHEN attendance_status IN ('confirmed', 'registered') THEN 'registered'
    WHEN attendance_status IN ('cancelled', 'canceled') THEN 'cancelled'
    WHEN attendance_status = 'pending' THEN 'pending'
    WHEN attendance_status = 'waitlist' THEN 'waitlist'
    ELSE 'registered'
END
WHERE attendance_status IS NOT NULL;

-- 3. インデックスの再作成
DROP INDEX IF EXISTS idx_event_participants_status;
DROP INDEX IF EXISTS idx_event_participants_attendance_status;

CREATE INDEX idx_event_participants_attendance_status 
ON event_participants(attendance_status);

CREATE INDEX idx_event_participants_user_event 
ON event_participants(user_id, event_id);

-- 4. 制約の追加
ALTER TABLE event_participants 
DROP CONSTRAINT IF EXISTS event_participants_attendance_status_check;

ALTER TABLE event_participants 
ADD CONSTRAINT event_participants_attendance_status_check 
CHECK (attendance_status IN ('registered', 'cancelled', 'pending', 'waitlist'));

-- 5. デフォルト値の設定
ALTER TABLE event_participants 
ALTER COLUMN attendance_status SET DEFAULT 'registered';

-- 6. RLSポリシーの更新
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view their own participations" ON event_participants;
DROP POLICY IF EXISTS "Users can insert their own participations" ON event_participants;
DROP POLICY IF EXISTS "Users can update their own participations" ON event_participants;

-- 新しいポリシーを作成
CREATE POLICY "Users can view their own participations" 
ON event_participants FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own participations" 
ON event_participants FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participations" 
ON event_participants FOR UPDATE 
USING (auth.uid() = user_id);

-- 7. 確認
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'event_participants' 
ORDER BY ordinal_position;