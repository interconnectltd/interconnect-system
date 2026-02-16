-- ============================================================
-- notifications テーブル DELETE RLS ポリシー追加
-- 問題: 通知の削除操作がRLSエラーで失敗する
-- 実行: Supabase SQL Editor で実行
-- ============================================================

-- ユーザーは自分の通知を削除できる
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- 管理者は全通知を削除できる
DROP POLICY IF EXISTS "Admin can delete all notifications" ON notifications;
CREATE POLICY "Admin can delete all notifications" ON notifications
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );
