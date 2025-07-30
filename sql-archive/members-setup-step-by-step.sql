-- ======================================
-- メンバーページセットアップ（ステップバイステップ）
-- エラーを一つずつ確実に解決
-- ======================================

-- ステップ1: user_profilesテーブルの現在の構造を確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ステップ2: 必要な列を一つずつ追加（エラーが出ても続行）
DO $$
BEGIN
    -- full_name列を追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' 
                   AND column_name = 'full_name') THEN
        ALTER TABLE public.user_profiles ADD COLUMN full_name TEXT;
        RAISE NOTICE 'full_name列を追加しました';
    ELSE
        RAISE NOTICE 'full_name列は既に存在します';
    END IF;

    -- skills列を追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' 
                   AND column_name = 'skills') THEN
        ALTER TABLE public.user_profiles ADD COLUMN skills TEXT[];
        RAISE NOTICE 'skills列を追加しました';
    ELSE
        RAISE NOTICE 'skills列は既に存在します';
    END IF;

    -- is_online列を追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' 
                   AND column_name = 'is_online') THEN
        ALTER TABLE public.user_profiles ADD COLUMN is_online BOOLEAN DEFAULT false;
        RAISE NOTICE 'is_online列を追加しました';
    ELSE
        RAISE NOTICE 'is_online列は既に存在します';
    END IF;

    -- connection_count列を追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' 
                   AND column_name = 'connection_count') THEN
        ALTER TABLE public.user_profiles ADD COLUMN connection_count INTEGER DEFAULT 0;
        RAISE NOTICE 'connection_count列を追加しました';
    ELSE
        RAISE NOTICE 'connection_count列は既に存在します';
    END IF;
END $$;

-- ステップ3: データの初期化
-- full_nameを設定
UPDATE public.user_profiles 
SET full_name = name 
WHERE full_name IS NULL AND name IS NOT NULL;

-- ステップ4: 基本的なスキルを設定（エラーを避けるため、シンプルに）
UPDATE public.user_profiles
SET skills = ARRAY['ビジネス']::TEXT[]
WHERE skills IS NULL
AND id IN (
    SELECT id FROM public.user_profiles 
    WHERE is_active = true 
    LIMIT 5
);

-- ステップ5: オンラインステータスを設定
UPDATE public.user_profiles
SET is_online = true
WHERE id IN (
    SELECT id FROM public.user_profiles 
    WHERE is_active = true 
    AND last_login_at IS NOT NULL
    ORDER BY last_login_at DESC
    LIMIT 3
);

-- ステップ6: コネクション数を計算して更新
WITH connection_counts AS (
    SELECT 
        user_id,
        COUNT(*) as conn_count
    FROM (
        SELECT requester_id as user_id FROM connections WHERE status = 'accepted'
        UNION ALL
        SELECT receiver_id as user_id FROM connections WHERE status = 'accepted'
    ) all_conn
    GROUP BY user_id
)
UPDATE public.user_profiles up
SET connection_count = COALESCE(cc.conn_count, 0)
FROM connection_counts cc
WHERE up.id = cc.user_id;

-- デフォルト値を設定（コネクションがないユーザー）
UPDATE public.user_profiles
SET connection_count = 0
WHERE connection_count IS NULL;

-- ステップ7: 結果を確認
SELECT 
    'Setup Complete' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as with_full_name,
    COUNT(CASE WHEN skills IS NOT NULL AND array_length(skills, 1) > 0 THEN 1 END) as with_skills,
    COUNT(CASE WHEN is_online THEN 1 END) as online_users,
    COUNT(CASE WHEN connection_count > 0 THEN 1 END) as users_with_connections
FROM public.user_profiles
WHERE is_active = true;

-- ステップ8: サンプルデータを表示
SELECT 
    id,
    name,
    full_name,
    company,
    position,
    skills,
    is_online,
    connection_count
FROM public.user_profiles
WHERE is_active = true
ORDER BY is_online DESC, connection_count DESC
LIMIT 5;