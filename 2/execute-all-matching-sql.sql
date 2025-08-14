-- マッチング機能用の全SQL実行スクリプト
-- このファイルを一度実行すれば、必要なテーブルとデータが全て設定されます

-- ========================================
-- 1. connectionsテーブルの作成
-- ========================================
CREATE TABLE IF NOT EXISTS connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connected_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_connection UNIQUE (user_id, connected_user_id),
    CONSTRAINT no_self_connection CHECK (user_id != connected_user_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_connected_user_id ON connections(connected_user_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_created_at ON connections(created_at DESC);

-- updated_atの自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
DROP TRIGGER IF EXISTS update_connections_updated_at ON connections;
CREATE TRIGGER update_connections_updated_at
    BEFORE UPDATE ON connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLSを有効化
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
DROP POLICY IF EXISTS "Users can view their own connections" ON connections;
CREATE POLICY "Users can view their own connections"
    ON connections FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

DROP POLICY IF EXISTS "Users can create connection requests" ON connections;
CREATE POLICY "Users can create connection requests"
    ON connections FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update received connection requests" ON connections;
CREATE POLICY "Users can update received connection requests"
    ON connections FOR UPDATE
    TO authenticated
    USING (auth.uid() = connected_user_id)
    WITH CHECK (auth.uid() = connected_user_id AND user_id = OLD.user_id AND connected_user_id = OLD.connected_user_id);

DROP POLICY IF EXISTS "Users can delete their pending requests" ON connections;
CREATE POLICY "Users can delete their pending requests"
    ON connections FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id AND status = 'pending');

-- 権限付与
GRANT SELECT, INSERT, UPDATE, DELETE ON connections TO authenticated;

-- ========================================
-- 2. profilesテーブルの更新
-- ========================================

-- 必要なカラムを追加
DO $$ 
BEGIN
    -- industryカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'industry') THEN
        ALTER TABLE profiles ADD COLUMN industry VARCHAR(50);
    END IF;
    
    -- locationカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
        ALTER TABLE profiles ADD COLUMN location VARCHAR(50);
    END IF;
    
    -- skillsカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'skills') THEN
        ALTER TABLE profiles ADD COLUMN skills TEXT[];
    END IF;
    
    -- last_active_atカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_active_at') THEN
        ALTER TABLE profiles ADD COLUMN last_active_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- is_publicカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_public') THEN
        ALTER TABLE profiles ADD COLUMN is_public BOOLEAN DEFAULT true;
    END IF;
END $$;

-- インデックスの追加
CREATE INDEX IF NOT EXISTS idx_profiles_industry ON profiles(industry) WHERE industry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_skills ON profiles USING GIN(skills) WHERE skills IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON profiles(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON profiles(is_public);

-- ========================================
-- 3. 既存データの更新（重要）
-- ========================================

-- NULLデータを適切なデフォルト値で更新
UPDATE profiles 
SET 
    industry = COALESCE(industry, 'tech'),
    location = COALESCE(location, 'tokyo'),
    skills = COALESCE(skills, ARRAY['ビジネス', 'ネットワーキング']),
    last_active_at = COALESCE(last_active_at, NOW()),
    is_public = COALESCE(is_public, true)
WHERE industry IS NULL OR location IS NULL OR skills IS NULL;

-- ========================================
-- 4. テストデータの挿入
-- ========================================

-- サンプルプロフィールの更新（既存ユーザーに業界・地域・スキルを設定）
UPDATE profiles
SET 
    industry = CASE 
        WHEN random() < 0.3 THEN 'tech'
        WHEN random() < 0.5 THEN 'finance'
        WHEN random() < 0.7 THEN 'healthcare'
        WHEN random() < 0.9 THEN 'retail'
        ELSE industry
    END,
    location = CASE 
        WHEN random() < 0.4 THEN 'tokyo'
        WHEN random() < 0.6 THEN 'osaka'
        WHEN random() < 0.8 THEN 'nagoya'
        WHEN random() < 0.95 THEN 'fukuoka'
        ELSE location
    END,
    skills = CASE 
        WHEN random() < 0.25 THEN ARRAY['協業', 'パートナーシップ', 'AI', 'DX', 'イノベーション']
        WHEN random() < 0.5 THEN ARRAY['投資', 'ファンディング', 'スタートアップ', 'FinTech', 'ベンチャー']
        WHEN random() < 0.75 THEN ARRAY['メンタリング', 'コーチング', 'リーダーシップ', '人材育成']
        ELSE ARRAY['ネットワーキング', 'マーケティング', 'グローバル', 'DX', '新規事業']
    END,
    title = CASE 
        WHEN title IS NULL OR title = '' THEN 
            CASE 
                WHEN random() < 0.2 THEN 'CEO'
                WHEN random() < 0.4 THEN 'マネージャー'
                WHEN random() < 0.6 THEN 'エンジニア'
                WHEN random() < 0.8 THEN 'デザイナー'
                ELSE 'コンサルタント'
            END
        ELSE title
    END,
    company = CASE 
        WHEN company IS NULL OR company = '' THEN 
            CASE 
                WHEN random() < 0.3 THEN '株式会社テクノロジー'
                WHEN random() < 0.6 THEN 'イノベーション株式会社'
                ELSE 'グローバル商事'
            END
        ELSE company
    END,
    bio = CASE 
        WHEN bio IS NULL OR bio = '' THEN 
            'ビジネスの新しい可能性を探求し、イノベーションを通じて社会に価値を提供することを目指しています。'
        ELSE bio
    END
WHERE true;

-- ========================================
-- 5. ビューの作成
-- ========================================

-- アクティブなコネクション一覧ビュー
DROP VIEW IF EXISTS active_connections;
CREATE VIEW active_connections AS
SELECT 
    CASE 
        WHEN c.user_id = auth.uid() THEN c.connected_user_id
        ELSE c.user_id
    END AS connected_user_id,
    c.status,
    c.created_at,
    c.updated_at,
    p.name AS connected_user_name,
    p.avatar_url AS connected_user_avatar,
    p.title AS connected_user_title,
    p.company AS connected_user_company
FROM connections c
JOIN profiles p ON p.id = CASE 
    WHEN c.user_id = auth.uid() THEN c.connected_user_id
    ELSE c.user_id
END
WHERE (c.user_id = auth.uid() OR c.connected_user_id = auth.uid())
AND c.status = 'accepted';

-- 権限付与
GRANT SELECT ON active_connections TO authenticated;

-- ========================================
-- 6. 動作確認用クエリ
-- ========================================

-- テーブル構造の確認
SELECT 
    'connections table columns:' as info,
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'connections'
UNION ALL
SELECT 
    'profiles new columns:' as info,
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('industry', 'location', 'skills', 'last_active_at', 'is_public')
ORDER BY info, column_name;

-- データの確認
SELECT 
    'Profiles with matching data:' as info,
    COUNT(*) as count
FROM profiles
WHERE industry IS NOT NULL 
AND location IS NOT NULL 
AND skills IS NOT NULL;