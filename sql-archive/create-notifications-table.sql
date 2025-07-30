-- 通知テーブルの作成
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'message',           -- 新着メッセージ
        'connection_request', -- 接続リクエスト
        'connection_accepted', -- 接続承認
        'event_reminder',    -- イベントリマインダー
        'event_cancelled',   -- イベントキャンセル
        'event_updated',     -- イベント更新
        'system',           -- システム通知
        'announcement'      -- お知らせ
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,            -- 追加データ（sender_id, event_id など）
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- RLS（Row Level Security）の有効化
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
-- ユーザーは自分の通知のみ閲覧可能
CREATE POLICY "Users can view their own notifications" 
    ON notifications FOR SELECT 
    USING (auth.uid() = user_id);

-- ユーザーは自分の通知を更新可能（既読にする）
CREATE POLICY "Users can update their own notifications" 
    ON notifications FOR UPDATE 
    USING (auth.uid() = user_id);

-- ユーザーは自分の通知を削除可能
CREATE POLICY "Users can delete their own notifications" 
    ON notifications FOR DELETE 
    USING (auth.uid() = user_id);

-- システムは通知を作成可能（サービスロールのみ）
CREATE POLICY "System can create notifications" 
    ON notifications FOR INSERT 
    WITH CHECK (true);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.read = true AND OLD.read = false THEN
        NEW.read_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications
    FOR EACH ROW 
    EXECUTE FUNCTION update_notifications_updated_at();

-- リアルタイム通知の有効化
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- サンプルデータの挿入（開発用）
-- 実際の本番環境では削除してください
/*
INSERT INTO notifications (user_id, type, title, message, data) VALUES
(
    (SELECT id FROM auth.users LIMIT 1),
    'message',
    '新着メッセージ',
    '田中太郎さんからメッセージが届きました',
    '{"sender_id": "123e4567-e89b-12d3-a456-426614174000", "sender_name": "田中太郎"}'::jsonb
),
(
    (SELECT id FROM auth.users LIMIT 1),
    'event_reminder',
    'イベントリマインダー',
    '「DX推進セミナー」が明日開催されます',
    '{"event_id": "456e7890-e89b-12d3-a456-426614174000", "event_date": "2024-02-15"}'::jsonb
);
*/