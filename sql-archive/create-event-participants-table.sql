-- イベント参加者テーブルの作成
-- このテーブルはイベントへの参加登録を管理します

-- テーブルが存在しない場合のみ作成
CREATE TABLE IF NOT EXISTS event_participants (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'waitlist')),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    
    -- 同一ユーザーが同一イベントに複数回登録できないようにする
    UNIQUE(event_id, user_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_status ON event_participants(status);
CREATE INDEX IF NOT EXISTS idx_event_participants_registered_at ON event_participants(registered_at);

-- RLS（Row Level Security）の有効化
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
-- 全員が参加者リストを閲覧可能
CREATE POLICY "event_participants_select_policy" ON event_participants
    FOR SELECT
    USING (true);

-- 認証されたユーザーは自分の参加登録を作成可能
CREATE POLICY "event_participants_insert_policy" ON event_participants
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の参加登録を更新可能
CREATE POLICY "event_participants_update_policy" ON event_participants
    FOR UPDATE
    USING (auth.uid() = user_id);

-- ユーザーは自分の参加登録を削除可能（キャンセル）
CREATE POLICY "event_participants_delete_policy" ON event_participants
    FOR DELETE
    USING (auth.uid() = user_id);

-- コメント追加
COMMENT ON TABLE event_participants IS 'イベント参加者の登録情報を管理するテーブル';
COMMENT ON COLUMN event_participants.id IS '参加登録ID';
COMMENT ON COLUMN event_participants.event_id IS 'イベントID';
COMMENT ON COLUMN event_participants.user_id IS 'ユーザーID';
COMMENT ON COLUMN event_participants.status IS '参加ステータス（confirmed: 確定, cancelled: キャンセル, waitlist: キャンセル待ち）';
COMMENT ON COLUMN event_participants.registered_at IS '登録日時';
COMMENT ON COLUMN event_participants.cancelled_at IS 'キャンセル日時';
COMMENT ON COLUMN event_participants.notes IS '備考';

-- サンプルデータの挿入（必要に応じて）
-- INSERT INTO event_participants (event_id, user_id, status) VALUES
-- ('イベントID', 'ユーザーID', 'confirmed');