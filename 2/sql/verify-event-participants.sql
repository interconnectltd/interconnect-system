-- event_participantsテーブルの動作確認用SQL
-- 406エラー修正後の確認用

-- 1. 現在の参加者数を確認
SELECT COUNT(*) as total_participants FROM event_participants;

-- 2. 参加者の詳細を確認（最新5件）
SELECT 
    ep.id,
    ep.event_id,
    ep.user_id,
    ep.status,
    ep.registration_date,
    ep.attendance_confirmed,
    e.title as event_title,
    e.event_date
FROM event_participants ep
LEFT JOIN event_items e ON ep.event_id = e.id
ORDER BY ep.created_at DESC
LIMIT 5;

-- 3. イベントごとの参加者数を確認
SELECT 
    e.id,
    e.title,
    e.event_date,
    COUNT(ep.id) as participant_count,
    e.max_participants
FROM event_items e
LEFT JOIN event_participants ep ON e.id = ep.event_id
GROUP BY e.id, e.title, e.event_date, e.max_participants
ORDER BY e.event_date DESC;

-- 4. RLSポリシーの状態を確認
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'event_participants'
ORDER BY policyname;

-- 5. テーブル権限の確認
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'event_participants'
ORDER BY grantee, privilege_type;

-- 6. 現在のユーザーの参加イベントを確認
-- 注：auth.uid()はSupabaseコンテキストでのみ動作
SELECT 
    ep.id,
    ep.event_id,
    ep.status,
    e.title,
    e.event_date,
    e.start_time,
    e.end_time
FROM event_participants ep
JOIN event_items e ON ep.event_id = e.id
WHERE ep.user_id = auth.uid()
ORDER BY e.event_date DESC;

-- 7. 参加可能なイベント（まだ参加していないイベント）を確認
SELECT 
    e.id,
    e.title,
    e.event_date,
    e.max_participants,
    COUNT(ep.id) as current_participants,
    e.max_participants - COUNT(ep.id) as available_spots
FROM event_items e
LEFT JOIN event_participants ep ON e.id = ep.event_id
WHERE e.event_date >= CURRENT_DATE
    AND NOT EXISTS (
        SELECT 1 FROM event_participants 
        WHERE event_id = e.id 
        AND user_id = auth.uid()
    )
GROUP BY e.id, e.title, e.event_date, e.max_participants
HAVING e.max_participants > COUNT(ep.id) OR e.max_participants IS NULL
ORDER BY e.event_date ASC;

-- 8. 統計情報
SELECT 
    'Total Events' as metric,
    COUNT(*) as value
FROM event_items
UNION ALL
SELECT 
    'Total Participants' as metric,
    COUNT(*) as value
FROM event_participants
UNION ALL
SELECT 
    'Registered Status' as metric,
    COUNT(*) as value
FROM event_participants
WHERE status = 'registered'
UNION ALL
SELECT 
    'Confirmed Attendance' as metric,
    COUNT(*) as value
FROM event_participants
WHERE attendance_confirmed = true;