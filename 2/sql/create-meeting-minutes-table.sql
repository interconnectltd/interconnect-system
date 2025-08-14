-- ======================================
-- tl;dv議事録データ用テーブル作成
-- ======================================

-- meeting_minutesテーブルの作成
CREATE TABLE IF NOT EXISTS public.meeting_minutes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    meeting_title TEXT,
    meeting_date TIMESTAMP WITH TIME ZONE,
    content TEXT,
    summary TEXT,
    keywords TEXT[],
    participants TEXT[],
    action_items JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_user_id ON public.meeting_minutes(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_meeting_date ON public.meeting_minutes(meeting_date);

-- RLSポリシー
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー（認証されたユーザーは全て読める）
CREATE POLICY "Authenticated users can read all minutes"
    ON public.meeting_minutes FOR SELECT
    TO authenticated
    USING (true);

-- 挿入ポリシー（自分の議事録のみ）
CREATE POLICY "Users can insert own minutes"
    ON public.meeting_minutes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 更新ポリシー（自分の議事録のみ）
CREATE POLICY "Users can update own minutes"
    ON public.meeting_minutes FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 削除ポリシー（自分の議事録のみ）
CREATE POLICY "Users can delete own minutes"
    ON public.meeting_minutes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- サンプルデータ（テスト用）
INSERT INTO public.meeting_minutes (user_id, meeting_title, meeting_date, content, summary, keywords)
SELECT 
    id,
    CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) % 3 = 1 THEN '新規事業戦略会議'
        WHEN ROW_NUMBER() OVER (ORDER BY id) % 3 = 2 THEN 'AI活用プロジェクト'
        ELSE 'マーケティング戦略MTG'
    END,
    NOW() - (ROW_NUMBER() OVER (ORDER BY id) * INTERVAL '7 days'),
    CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) % 3 = 1 THEN 'DX推進について議論。AIを活用した業務効率化の具体的な施策を検討。クラウド移行のロードマップを作成。'
        WHEN ROW_NUMBER() OVER (ORDER BY id) % 3 = 2 THEN 'LLMを使った顧客サポート自動化について。チャットボット導入の費用対効果を分析。実装スケジュールを決定。'
        ELSE 'グローバル展開に向けたブランディング戦略。デジタルマーケティングの強化。SNS活用の具体案を検討。'
    END,
    CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) % 3 = 1 THEN 'DX推進とAI活用について具体的な施策を決定'
        WHEN ROW_NUMBER() OVER (ORDER BY id) % 3 = 2 THEN 'LLMベースの顧客サポート自動化を推進'
        ELSE 'グローバル展開に向けたデジタルマーケティング強化'
    END,
    CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) % 3 = 1 THEN ARRAY['DX', 'AI', 'クラウド', '業務効率化']
        WHEN ROW_NUMBER() OVER (ORDER BY id) % 3 = 2 THEN ARRAY['LLM', 'チャットボット', '自動化', 'カスタマーサポート']
        ELSE ARRAY['マーケティング', 'ブランディング', 'グローバル', 'SNS']
    END
FROM public.profiles
WHERE email LIKE 'test_%@interconnect.com'
LIMIT 6;