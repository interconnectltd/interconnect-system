-- ============================================================
-- Section 9-1: notifications INSERT RLS policy
-- Problem: No INSERT policy → frontend cannot create notifications
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
CREATE POLICY "Authenticated users can create notifications" ON notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- Section 9-2: cashout_requests admin SELECT/UPDATE RLS policies
-- Problem: Admin cannot view/approve/reject cashout requests
-- ============================================================
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

-- ============================================================
-- A11: Admin RLS policies for all admin-accessed tables
-- Problem: Admin pages query across users but RLS blocks access
-- ============================================================

-- connections: admin.html counts total connections
DROP POLICY IF EXISTS "Admin can view all connections" ON connections;
CREATE POLICY "Admin can view all connections" ON connections
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- notifications: admin.html counts report-type notifications
DROP POLICY IF EXISTS "Admin can view all notifications" ON notifications;
CREATE POLICY "Admin can view all notifications" ON notifications
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- invite_links: admin-referral reads all invite links
DROP POLICY IF EXISTS "Admin can view all invite links" ON invite_links;
CREATE POLICY "Admin can view all invite links" ON invite_links
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- invitations: admin-referral reads all invitations
DROP POLICY IF EXISTS "Admin can view all invitations" ON invitations;
CREATE POLICY "Admin can view all invitations" ON invitations
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- user_points: admin-referral reads all user points
DROP POLICY IF EXISTS "Admin can view all user points" ON user_points;
CREATE POLICY "Admin can view all user points" ON user_points
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- fraud_flags: admin-referral reads and manages fraud flags
DROP POLICY IF EXISTS "Admin can manage fraud flags" ON fraud_flags;
CREATE POLICY "Admin can manage fraud flags" ON fraud_flags
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- ip_registration_stats: admin-referral reads IP statistics
DROP POLICY IF EXISTS "Admin can view ip stats" ON ip_registration_stats;
CREATE POLICY "Admin can view ip stats" ON ip_registration_stats
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- meeting_confirmations: admin-referral manages confirmations
DROP POLICY IF EXISTS "Admin can manage meeting confirmations" ON meeting_confirmations;
CREATE POLICY "Admin can manage meeting confirmations" ON meeting_confirmations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- tldv_meeting_records: admin-referral manages tl;dv records
DROP POLICY IF EXISTS "Admin can manage tldv records" ON tldv_meeting_records;
CREATE POLICY "Admin can manage tldv records" ON tldv_meeting_records
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );
