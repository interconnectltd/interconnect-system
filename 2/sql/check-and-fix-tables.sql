-- ==========================================
-- テーブル構造を確認してから修正するSQL
-- ==========================================

-- 1. まず既存のテーブル構造を確認
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name IN ('profiles', 'meeting_minutes', 'connections')
ORDER BY 
    table_name, ordinal_position;

-- 2. profilesテーブルの現在の構造を確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public';

-- 3. auth.usersとprofilesの関係を確認
-- Supabaseでは通常、profilesテーブルのidカラムがauth.usersのidと同じ値を持つ
-- user_idではなくidを使用する場合が多い

-- 4. profilesテーブルに不足しているカラムを追加（エラーを避けるため個別に実行）
DO $$
BEGIN
    -- skills カラムを追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'skills') THEN
        ALTER TABLE profiles ADD COLUMN skills TEXT[] DEFAULT '{}';
    END IF;
    
    -- interests カラムを追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'interests') THEN
        ALTER TABLE profiles ADD COLUMN interests TEXT[] DEFAULT '{}';
    END IF;
    
    -- location カラムを追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'location') THEN
        ALTER TABLE profiles ADD COLUMN location TEXT;
    END IF;
    
    -- industry カラムを追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'industry') THEN
        ALTER TABLE profiles ADD COLUMN industry TEXT;
    END IF;
    
    -- bio カラムを追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'bio') THEN
        ALTER TABLE profiles ADD COLUMN bio TEXT;
    END IF;
    
    -- title カラムを追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'title') THEN
        ALTER TABLE profiles ADD COLUMN title TEXT;
    END IF;
    
    -- company カラムを追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'company') THEN
        ALTER TABLE profiles ADD COLUMN company TEXT;
    END IF;
    
    -- updated_at カラムを追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 5. meeting_minutesテーブルが存在する場合は削除して再作成
-- （user_idカラムが存在しない可能性があるため）
DROP TABLE IF EXISTS meeting_minutes CASCADE;

-- 6. meeting_minutesテーブルを正しい構造で作成
-- Supabaseの標準的な方法に従い、profile_idを使用
CREATE TABLE meeting_minutes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,  -- user_idではなくprofile_id
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
CREATE INDEX idx_meeting_minutes_profile_id ON meeting_minutes(profile_id);
CREATE INDEX idx_meeting_minutes_meeting_date ON meeting_minutes(meeting_date);

-- 7. connectionsテーブルを修正（既存の場合は削除して再作成）
DROP TABLE IF EXISTS connections CASCADE;

CREATE TABLE connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,  -- profilesテーブルのidを参照
    connected_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,  -- profilesテーブルのidを参照
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, connected_user_id)
);

-- インデックスを追加
CREATE INDEX idx_connections_user_id ON connections(user_id);
CREATE INDEX idx_connections_connected_user_id ON connections(connected_user_id);
CREATE INDEX idx_connections_status ON connections(status);

-- 8. RLSポリシーの設定

-- meeting_minutesのRLS（profile_idを使用）
ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own meeting minutes" ON meeting_minutes;
CREATE POLICY "Users can view own meeting minutes" ON meeting_minutes
    FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can insert own meeting minutes" ON meeting_minutes;
CREATE POLICY "Users can insert own meeting minutes" ON meeting_minutes
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update own meeting minutes" ON meeting_minutes;
CREATE POLICY "Users can update own meeting minutes" ON meeting_minutes
    FOR UPDATE USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete own meeting minutes" ON meeting_minutes;
CREATE POLICY "Users can delete own meeting minutes" ON meeting_minutes
    FOR DELETE USING (auth.uid() = profile_id);

-- connectionsのRLS
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

-- profilesのRLS（既存のポリシーがない場合）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- すべてのユーザーがプロファイルを閲覧可能
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

-- ユーザーは自分のプロファイルのみ更新可能
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- 9. トリガー関数の作成（updated_atの自動更新用）
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

-- 10. テスト用データの挿入（現在のユーザーのプロファイルを更新）
UPDATE profiles 
SET 
    skills = CASE 
        WHEN skills IS NULL OR array_length(skills, 1) IS NULL 
        THEN ARRAY['JavaScript', 'React', 'Node.js', 'Supabase']
        ELSE skills
    END,
    interests = CASE 
        WHEN interests IS NULL OR array_length(interests, 1) IS NULL 
        THEN ARRAY['AI', 'Web開発', 'スタートアップ']
        ELSE interests
    END,
    location = COALESCE(location, '東京'),
    industry = COALESCE(industry, 'IT・テクノロジー'),
    bio = COALESCE(bio, 'フルスタックエンジニアとして活動しています。'),
    title = COALESCE(title, 'フルスタックエンジニア'),
    company = COALESCE(company, 'フリーランス')
WHERE id IN (SELECT id FROM profiles LIMIT 5);

-- 11. 確認用クエリ
SELECT 
    'profiles' as table_name,
    COUNT(*) as total_rows,
    COUNT(skills) as rows_with_skills,
    COUNT(location) as rows_with_location,
    COUNT(industry) as rows_with_industry
FROM profiles
UNION ALL
SELECT 
    'connections' as table_name,
    COUNT(*) as total_rows,
    0 as rows_with_skills,
    0 as rows_with_location,
    0 as rows_with_industry
FROM connections
UNION ALL
SELECT 
    'meeting_minutes' as table_name,
    COUNT(*) as total_rows,
    0 as rows_with_skills,
    0 as rows_with_location,
    0 as rows_with_industry
FROM meeting_minutes;