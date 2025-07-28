-- ===========================
-- Events テーブルのRLSポリシー修正
-- ===========================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Events are viewable by authenticated users" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Allow anonymous read events" ON public.events;
DROP POLICY IF EXISTS "Allow authenticated insert events" ON public.events;

-- より緩いポリシーを作成（デバッグ用）

-- 1. 読み取り：誰でも可能
CREATE POLICY "Anyone can view events" ON public.events
    FOR SELECT USING (true);

-- 2. 作成：認証済みユーザーなら誰でも
CREATE POLICY "Authenticated users can create events" ON public.events
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- 3. 更新：作成者のみ（created_byがある場合）
CREATE POLICY "Users can update own events" ON public.events
    FOR UPDATE 
    USING (
        created_by IS NULL OR 
        created_by = auth.uid()
    );

-- 4. 削除：作成者のみ
CREATE POLICY "Users can delete own events" ON public.events
    FOR DELETE 
    USING (
        created_by IS NULL OR 
        created_by = auth.uid()
    );

-- ===========================
-- User Activities のRLSポリシー修正
-- ===========================

DROP POLICY IF EXISTS "Allow read public activities" ON public.user_activities;
DROP POLICY IF EXISTS "Allow insert own activities" ON public.user_activities;
DROP POLICY IF EXISTS "Public activities are viewable by everyone" ON public.user_activities;
DROP POLICY IF EXISTS "Users can insert own activities" ON public.user_activities;

-- 1. 読み取り：公開アクティビティは誰でも
CREATE POLICY "Anyone can view public activities" ON public.user_activities
    FOR SELECT 
    USING (
        is_public = true OR 
        user_id = auth.uid()
    );

-- 2. 作成：認証済みユーザーが自分のアクティビティを作成
CREATE POLICY "Users can create own activities" ON public.user_activities
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        user_id = auth.uid()
    );

-- ===========================
-- Dashboard Stats のRLSポリシー修正  
-- ===========================

DROP POLICY IF EXISTS "Allow anonymous read" ON public.dashboard_stats;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.dashboard_stats;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.dashboard_stats;

-- 1. 読み取り：誰でも可能
CREATE POLICY "Anyone can read dashboard stats" ON public.dashboard_stats
    FOR SELECT USING (true);

-- 2. 作成/更新：認証済みユーザー
CREATE POLICY "Authenticated can manage stats" ON public.dashboard_stats
    FOR ALL 
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);