-- INTERCONNECTプロジェクト用Supabaseデータベース初期化SQL
-- 実行前に必ずSupabaseダッシュボードのSQL Editorで実行してください

-- UUID拡張機能を有効化（必要に応じて）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- プロファイルテーブルの作成
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    line_user_id TEXT UNIQUE,
    email TEXT UNIQUE,
    display_name TEXT,
    picture_url TEXT,
    status_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS（Row Level Security）を有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ユーザーが自分のプロファイルのみアクセスできるポリシー
CREATE POLICY "Users can view own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = user_id);

-- サービスロールは全てのプロファイルにアクセス可能
CREATE POLICY "Service role can access all profiles" 
    ON profiles FOR ALL 
    USING (auth.role() = 'service_role');

-- トリガー関数：更新時刻を自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーの作成
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- インデックスの作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id ON profiles(line_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- 初期データ確認用のビュー
CREATE OR REPLACE VIEW profile_stats AS
SELECT 
    COUNT(*) as total_profiles,
    COUNT(DISTINCT line_user_id) as line_users,
    COUNT(DISTINCT email) as email_users,
    MAX(created_at) as latest_signup
FROM profiles;

-- 実行確認
DO $$
BEGIN
    RAISE NOTICE 'Supabaseデータベースの初期化が完了しました';
    RAISE NOTICE 'profilesテーブルが作成され、RLSポリシーが設定されました';
END $$;