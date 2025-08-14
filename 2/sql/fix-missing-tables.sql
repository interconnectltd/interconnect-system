-- ==========================================
-- 不足しているテーブルとカラムの修正SQL
-- ==========================================

-- 1. meeting_minutes テーブルを作成（存在しない場合）
CREATE TABLE IF NOT EXISTS meeting_minutes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    meeting_title TEXT,
    meeting_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    summary TEXT,
    content TEXT,
    participants TEXT[],
    topics TEXT[],
    action_items JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_user_id ON meeting_minutes(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_meeting_date ON meeting_minutes(meeting_date);

-- 2. profilesテーブルに不足カラムを追加
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. connectionsテーブルの確認と修正
CREATE TABLE IF NOT EXISTS connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    connected_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, connected_user_id)
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_connected_user_id ON connections(connected_user_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

-- 4. RLSポリシーの設定

-- meeting_minutes のRLS
ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own meeting minutes" ON meeting_minutes;
CREATE POLICY "Users can view own meeting minutes" ON meeting_minutes
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own meeting minutes" ON meeting_minutes;
CREATE POLICY "Users can insert own meeting minutes" ON meeting_minutes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own meeting minutes" ON meeting_minutes;
CREATE POLICY "Users can update own meeting minutes" ON meeting_minutes
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own meeting minutes" ON meeting_minutes;
CREATE POLICY "Users can delete own meeting minutes" ON meeting_minutes
    FOR DELETE USING (auth.uid() = user_id);

-- connections のRLS
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their connections" ON connections;
CREATE POLICY "Users can view their connections" ON connections
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

DROP POLICY IF EXISTS "Users can create connections" ON connections;
CREATE POLICY "Users can create connections" ON connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their connections" ON connections;
CREATE POLICY "Users can update their connections" ON connections
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

-- 5. トリガー関数の作成（updated_atの自動更新用）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーの設定
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_connections_updated_at ON connections;
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meeting_minutes_updated_at ON meeting_minutes;
CREATE TRIGGER update_meeting_minutes_updated_at BEFORE UPDATE ON meeting_minutes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. サンプルデータの追加（テスト用）
-- 既存ユーザーのプロファイルを更新
UPDATE profiles 
SET 
    skills = ARRAY['JavaScript', 'React', 'Node.js', 'Supabase'],
    interests = ARRAY['AI', 'Web開発', 'スタートアップ'],
    location = '東京',
    industry = 'IT・テクノロジー',
    bio = 'フルスタックエンジニアとして活動しています。',
    title = 'フルスタックエンジニア',
    company = 'フリーランス'
WHERE id = (SELECT id FROM auth.users LIMIT 1);

-- テスト用のプロファイルデータ生成
DO $$
DECLARE
    user_record RECORD;
    skills_options TEXT[][] := ARRAY[
        ARRAY['Python', 'Django', 'Machine Learning'],
        ARRAY['Java', 'Spring', 'AWS'],
        ARRAY['React', 'TypeScript', 'GraphQL'],
        ARRAY['Ruby', 'Rails', 'PostgreSQL'],
        ARRAY['Go', 'Docker', 'Kubernetes']
    ];
    interests_options TEXT[][] := ARRAY[
        ARRAY['AI', 'データ分析', 'クラウド'],
        ARRAY['FinTech', 'ブロックチェーン', 'セキュリティ'],
        ARRAY['EdTech', 'UI/UX', 'プロダクト開発'],
        ARRAY['HealthTech', 'IoT', 'モバイル開発'],
        ARRAY['GreenTech', 'SaaS', 'DevOps']
    ];
    locations TEXT[] := ARRAY['東京', '大阪', '名古屋', '福岡', '札幌'];
    industries TEXT[] := ARRAY['IT・テクノロジー', '金融', '医療・ヘルスケア', '教育', '製造業'];
    titles TEXT[] := ARRAY['エンジニア', 'プロダクトマネージャー', 'デザイナー', 'データサイエンティスト', 'CTO'];
    companies TEXT[] := ARRAY['テックスタートアップ', 'AIベンチャー', 'フィンテック企業', 'SaaS企業', 'コンサルティング'];
    i INTEGER := 1;
BEGIN
    FOR user_record IN SELECT id FROM profiles WHERE skills IS NULL OR array_length(skills, 1) IS NULL LIMIT 5
    LOOP
        UPDATE profiles
        SET
            skills = skills_options[i],
            interests = interests_options[i],
            location = locations[i],
            industry = industries[i],
            bio = 'プロフェッショナルとして' || industries[i] || '分野で活動しています。',
            title = titles[i],
            company = companies[i]
        WHERE id = user_record.id;
        
        i := i + 1;
        IF i > 5 THEN i := 1; END IF;
    END LOOP;
END $$;

-- 確認用クエリ
SELECT 
    COUNT(*) as total_profiles,
    COUNT(skills) as profiles_with_skills,
    COUNT(location) as profiles_with_location,
    COUNT(industry) as profiles_with_industry
FROM profiles;