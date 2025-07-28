-- ======================================
-- シンプルなメンバーページセットアップ（修正版）
-- PostgreSQL/Supabase対応
-- ======================================

-- 1. 基本的な列の追加（一つずつ実行）
ALTER TABLE public.active_users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.active_users ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.active_users ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.active_users ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE public.active_users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE public.active_users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- 2. データの初期化
UPDATE public.active_users 
SET full_name = name 
WHERE full_name IS NULL AND name IS NOT NULL;

-- 3. サンプルスキルの設定（サブクエリを使用）
UPDATE public.active_users
SET skills = ARRAY['ビジネス', 'コミュニケーション']
WHERE id IN (
    SELECT id 
    FROM public.active_users
    WHERE (skills IS NULL OR array_length(skills, 1) = 0)
    AND is_active = true
    ORDER BY created_at DESC
    LIMIT 10
);

-- 4. 一部のユーザーをオンラインに設定
UPDATE public.active_users
SET is_online = true
WHERE id IN (
    SELECT id 
    FROM public.active_users 
    WHERE is_active = true 
    ORDER BY last_login_at DESC NULLS LAST
    LIMIT 5
);

-- 5. より詳細なサンプルスキルを設定（オプション）
DO $$
DECLARE
    user_record RECORD;
    sample_skills TEXT[][] := ARRAY[
        ARRAY['IT', 'AI', 'DX推進'],
        ARRAY['マーケティング', 'EC', 'グローバル'],
        ARRAY['開発', 'クラウド', 'DevOps'],
        ARRAY['人材開発', '採用', '組織開発'],
        ARRAY['営業戦略', 'BtoB', 'CRM'],
        ARRAY['財務', '経理', 'コンプライアンス'],
        ARRAY['プロジェクト管理', 'アジャイル', 'スクラム'],
        ARRAY['データ分析', 'BI', '統計'],
        ARRAY['デザイン', 'UI/UX', 'ブランディング'],
        ARRAY['コンサルティング', '戦略立案', '業務改善']
    ];
    counter INTEGER := 0;
BEGIN
    -- アクティブユーザーの最初の10人にスキルを設定
    FOR user_record IN 
        SELECT id 
        FROM public.active_users 
        WHERE is_active = true 
        AND (skills IS NULL OR array_length(skills, 1) = 0)
        ORDER BY created_at
        LIMIT 10
    LOOP
        counter := counter + 1;
        
        UPDATE public.active_users
        SET skills = sample_skills[counter]
        WHERE id = user_record.id;
    END LOOP;
    
    RAISE NOTICE 'Updated % users with varied skills', counter;
END $$;

-- 6. 役職（title）の設定（positionから推測）
UPDATE public.active_users
SET title = 
    CASE 
        WHEN position ILIKE '%CEO%' OR position ILIKE '%代表%' THEN '最高経営責任者'
        WHEN position ILIKE '%CTO%' OR position ILIKE '%技術%' THEN '最高技術責任者'
        WHEN position ILIKE '%CFO%' OR position ILIKE '%財務%' THEN '最高財務責任者'
        WHEN position ILIKE '%部長%' OR position ILIKE '%Director%' THEN '部門責任者'
        WHEN position ILIKE '%マネージャー%' OR position ILIKE '%Manager%' THEN 'マネージャー'
        WHEN position ILIKE '%リーダー%' OR position ILIKE '%Lead%' THEN 'チームリーダー'
        ELSE 'メンバー'
    END
WHERE title IS NULL AND position IS NOT NULL;

-- 7. 結果の確認
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active THEN 1 END) as active_users,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as with_full_name,
    COUNT(CASE WHEN skills IS NOT NULL AND array_length(skills, 1) > 0 THEN 1 END) as with_skills,
    COUNT(CASE WHEN is_online THEN 1 END) as online_now,
    COUNT(CASE WHEN title IS NOT NULL THEN 1 END) as with_title
FROM public.active_users;

-- 8. サンプルデータの表示（最初の10件）
SELECT 
    id,
    COALESCE(full_name, name) as display_name,
    company,
    position,
    title,
    industry,
    skills,
    is_online,
    connection_count
FROM public.active_users
WHERE is_active = true
ORDER BY is_online DESC, created_at DESC
LIMIT 10;