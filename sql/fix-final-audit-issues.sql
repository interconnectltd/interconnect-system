-- ================================================================
-- 最終監査で発見された問題の修正マイグレーション
-- 実行: Supabase SQL Editor
-- 日付: 2026-02-24
-- ================================================================

-- C2: meeting_confirmations に不足カラムを追加
ALTER TABLE meeting_confirmations ADD COLUMN IF NOT EXISTS invitation_id UUID REFERENCES invitations(id);
ALTER TABLE meeting_confirmations ADD COLUMN IF NOT EXISTS meeting_method TEXT;
ALTER TABLE meeting_confirmations ADD COLUMN IF NOT EXISTS verification_methods JSONB;
ALTER TABLE meeting_confirmations ADD COLUMN IF NOT EXISTS meeting_summary TEXT;
ALTER TABLE meeting_confirmations ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE meeting_confirmations ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- M1: fraud_flags に severity カラムを追加
ALTER TABLE fraud_flags ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high'));
-- fraud_flags.details → description マッピングはJS側で対応（既存カラム活用）

-- M6: invite_links に DELETE RLS ポリシーを追加
DROP POLICY IF EXISTS "Users can delete own invite links" ON invite_links;
CREATE POLICY "Users can delete own invite links" ON invite_links
    FOR DELETE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admin can delete invite links" ON invite_links;
CREATE POLICY "Admin can delete invite links" ON invite_links
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- D1: ip_registration_stats に first_registration / last_registration カラムを追加
ALTER TABLE ip_registration_stats ADD COLUMN IF NOT EXISTS first_registration TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE ip_registration_stats ADD COLUMN IF NOT EXISTS last_registration TIMESTAMP WITH TIME ZONE DEFAULT NOW();
