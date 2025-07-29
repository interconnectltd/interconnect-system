-- event_participantsテーブルのRLSを修正

-- 1. 既存のポリシーを一旦削除
DROP POLICY IF EXISTS "Users can view their own participations" ON event_participants;
DROP POLICY IF EXISTS "Users can register for events" ON event_participants;
DROP POLICY IF EXISTS "Users can update their own participations" ON event_participants;
DROP POLICY IF EXISTS "Organizers can view participants" ON event_participants;

-- 2. より寛容なSELECTポリシーを作成
CREATE POLICY "Enable read access for authenticated users" 
    ON event_participants FOR SELECT 
    TO authenticated
    USING (true);

-- 3. 自分の参加登録のみ作成・更新可能
CREATE POLICY "Users can insert their own participations" 
    ON event_participants FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participations" 
    ON event_participants FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id);

-- 4. 権限を確認
GRANT SELECT ON event_participants TO anon;
GRANT SELECT ON event_participants TO authenticated;
GRANT INSERT, UPDATE ON event_participants TO authenticated;

-- 5. テスト: 認証されたユーザーとして参加者を確認
-- SELECT * FROM event_participants WHERE user_id = auth.uid();