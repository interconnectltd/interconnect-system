-- profilesテーブルの必要カラム追加
-- マッチング機能に必要なカラムを追加

-- 1. 既存のカラムを確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. 不足しているカラムを追加
-- industryカラム（業界）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS industry VARCHAR(50);

-- locationカラム（地域）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS location VARCHAR(50);

-- skillsカラム（スキル・興味関心）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS skills TEXT[];

-- last_active_atカラム（最終アクティブ日時）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- is_publicカラム（プロフィール公開設定）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- 3. インデックスの追加（検索性能向上）
CREATE INDEX IF NOT EXISTS idx_profiles_industry ON profiles(industry) WHERE industry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_skills ON profiles USING GIN(skills) WHERE skills IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON profiles(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON profiles(is_public);

-- 4. 既存データの更新（デモ用）
UPDATE profiles SET
    industry = CASE 
        WHEN random() < 0.25 THEN 'tech'
        WHEN random() < 0.5 THEN 'finance'
        WHEN random() < 0.75 THEN 'healthcare'
        ELSE 'retail'
    END,
    location = CASE 
        WHEN random() < 0.4 THEN 'tokyo'
        WHEN random() < 0.6 THEN 'osaka'
        WHEN random() < 0.8 THEN 'nagoya'
        ELSE 'fukuoka'
    END,
    skills = CASE 
        WHEN random() < 0.3 THEN ARRAY['協業', 'パートナーシップ', 'AI', 'DX']
        WHEN random() < 0.6 THEN ARRAY['投資', 'ファンディング', 'スタートアップ', 'FinTech']
        ELSE ARRAY['メンタリング', 'ネットワーキング', 'マーケティング', 'グローバル']
    END
WHERE industry IS NULL OR location IS NULL OR skills IS NULL;

-- 5. RLSポリシーの更新（公開プロフィールのみ表示）
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (is_public = true OR id = auth.uid());

-- 6. ビュー：検索用プロフィール
CREATE OR REPLACE VIEW searchable_profiles AS
SELECT 
    p.*,
    COALESCE(
        (SELECT COUNT(*) FROM connections c 
         WHERE c.status = 'accepted' 
         AND (c.user_id = p.id OR c.connected_user_id = p.id)),
        0
    ) AS connection_count
FROM profiles p
WHERE p.is_public = true
AND p.id != auth.uid();

-- 7. 権限付与
GRANT SELECT ON searchable_profiles TO authenticated;

-- 8. 関数：最終アクティブ日時の更新
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET last_active_at = NOW()
    WHERE id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. トリガー：ログイン時に最終アクティブ日時を更新
-- （注：実際のアプリケーションでは、別の方法で実装する必要があります）