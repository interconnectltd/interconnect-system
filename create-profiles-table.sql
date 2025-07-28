-- ======================================
-- Profilesテーブルの作成（存在しない場合）
-- ======================================

-- 1. profilesテーブルを作成
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    last_login TIMESTAMP WITH TIME ZONE
);

-- 2. RLS（Row Level Security）を有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. ポリシーを作成

-- 誰でも閲覧可能（メンバー一覧表示用）
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

-- 自分のプロフィールは更新可能
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- 新規ユーザー登録時に自動的にプロフィールを作成
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 4. 新規ユーザー登録時に自動的にプロフィールを作成するFunction
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger設定
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. 既存のauth.usersデータをprofilesに同期（初回のみ実行）
INSERT INTO public.profiles (id, email, name)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'name', email) as name
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 7. インデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON public.profiles(created_at);
CREATE INDEX IF NOT EXISTS profiles_updated_at_idx ON public.profiles(updated_at);

-- 8. 更新時刻を自動更新するFunction
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. 更新時刻自動更新のTrigger
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 10. 統計情報の確認
SELECT 
    COUNT(*) as total_profiles,
    COUNT(DISTINCT id) as unique_users,
    MIN(created_at) as oldest_member,
    MAX(created_at) as newest_member
FROM public.profiles;

-- ======================================
-- Dashboard統計の更新Function（オプション）
-- ======================================

-- メンバー数を自動的にdashboard_statsに反映
CREATE OR REPLACE FUNCTION public.update_member_count_in_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.dashboard_stats
    SET 
        total_members = (SELECT COUNT(*) FROM public.profiles),
        updated_at = NOW()
    WHERE id = 1;
    
    -- dashboard_statsレコードが存在しない場合は作成
    IF NOT FOUND THEN
        INSERT INTO public.dashboard_stats (id, total_members)
        VALUES (1, (SELECT COUNT(*) FROM public.profiles));
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profilesテーブルの変更時にメンバー数を更新
DROP TRIGGER IF EXISTS update_member_count_trigger ON public.profiles;
CREATE TRIGGER update_member_count_trigger
    AFTER INSERT OR DELETE ON public.profiles
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.update_member_count_in_stats();