-- Section 9-1: notifications INSERT RLS policy
-- Problem: No INSERT policy → frontend cannot create notifications
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
CREATE POLICY "Authenticated users can create notifications" ON notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Section 9-2: cashout_requests admin SELECT/UPDATE RLS policies
-- Problem: Admin cannot view/approve/reject cashout requests
DROP POLICY IF EXISTS "Admin can view all cashout requests" ON cashout_requests;
CREATE POLICY "Admin can view all cashout requests" ON cashout_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );

DROP POLICY IF EXISTS "Admin can update cashout requests" ON cashout_requests;
CREATE POLICY "Admin can update cashout requests" ON cashout_requests
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );
