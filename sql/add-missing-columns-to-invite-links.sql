-- invite_linksテーブルに不足しているカラムを追加
-- referral_countとconversion_countを追加してJavaScriptエラーを解消

-- referral_countカラムを追加（紹介した人数）
ALTER TABLE invite_links 
ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- conversion_countカラムを追加（成約した人数）
ALTER TABLE invite_links 
ADD COLUMN IF NOT EXISTS conversion_count INTEGER DEFAULT 0;

-- RLSポリシーを更新（created_byカラムを使用）
DROP POLICY IF EXISTS "Users can view their own invite links" ON invite_links;
CREATE POLICY "Users can view their own invite links" ON invite_links
    FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can create their own invite links" ON invite_links;
CREATE POLICY "Users can create their own invite links" ON invite_links
    FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their own invite links" ON invite_links;
CREATE POLICY "Users can update their own invite links" ON invite_links
    FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own invite links" ON invite_links;
CREATE POLICY "Users can delete their own invite links" ON invite_links
    FOR DELETE USING (auth.uid() = created_by);

-- RLSを有効化（まだ有効でない場合）
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

-- テーブル構造を確認
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'invite_links' 
ORDER BY ordinal_position;