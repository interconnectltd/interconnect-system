-- 検索履歴テーブル
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    search_query TEXT,
    filters JSONB,
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    results_count INTEGER DEFAULT 0,
    clicked_results UUID[] DEFAULT ARRAY[]::UUID[]
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_date ON search_history(searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(search_query);

-- RLS
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の検索履歴のみ閲覧・作成可能
CREATE POLICY "Users can view their own search history" ON search_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own search history" ON search_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 古い検索履歴を自動削除する関数（90日以上前）
CREATE OR REPLACE FUNCTION clean_old_search_history()
RETURNS void AS $$
BEGIN
    DELETE FROM search_history
    WHERE searched_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- 検索履歴から人気の検索キーワードを集計するビュー
CREATE OR REPLACE VIEW popular_search_keywords AS
SELECT 
    search_query,
    COUNT(*) as search_count,
    COUNT(DISTINCT user_id) as unique_users
FROM search_history
WHERE search_query IS NOT NULL 
    AND search_query != ''
    AND searched_at > NOW() - INTERVAL '30 days'
GROUP BY search_query
ORDER BY search_count DESC
LIMIT 20;