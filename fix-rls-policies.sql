-- ===========================
-- RLSポリシーの修正
-- 既存のポリシーを削除して、より緩いポリシーを作成
-- ===========================

-- dashboard_stats の修正
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.dashboard_stats;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.dashboard_stats;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.dashboard_stats;

-- 全員が読めるようにする（デバッグ用）
CREATE POLICY "Allow anonymous read" ON public.dashboard_stats
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert" ON public.dashboard_stats
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update" ON public.dashboard_stats
    FOR UPDATE USING (auth.role() = 'authenticated');

-- events の修正
DROP POLICY IF EXISTS "Events are viewable by authenticated users" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;

-- 全員が読めるようにする（デバッグ用）
CREATE POLICY "Allow anonymous read events" ON public.events
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert events" ON public.events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- user_activities の修正
DROP POLICY IF EXISTS "Public activities are viewable by everyone" ON public.user_activities;
DROP POLICY IF EXISTS "Users can insert own activities" ON public.user_activities;

-- より緩いポリシー
CREATE POLICY "Allow read public activities" ON public.user_activities
    FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Allow insert own activities" ON public.user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- messages の修正
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

CREATE POLICY "Allow read own messages" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Allow send messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ===========================
-- サンプルデータ作成（認証不要）
-- ===========================

-- dashboard_stats にサンプルデータ
INSERT INTO public.dashboard_stats (
    total_members,
    monthly_events,
    matching_success,
    unread_messages,
    member_growth_percentage,
    event_increase
) VALUES (
    10, 5, 3, 2, 15.5, 2
) ON CONFLICT DO NOTHING;

-- events にサンプルデータ
INSERT INTO public.events (
    title,
    description,
    event_date,
    time,
    location,
    status
) VALUES 
(
    'ウェルカムセミナー',
    '新規メンバー向けの説明会',
    CURRENT_DATE + INTERVAL '3 days',
    '10:00-12:00',
    '東京オフィス',
    'active'
),
(
    'ネットワーキングイベント',
    'メンバー同士の交流会',
    CURRENT_DATE + INTERVAL '7 days',
    '18:00-20:00',
    'オンライン',
    'active'
) ON CONFLICT DO NOTHING;