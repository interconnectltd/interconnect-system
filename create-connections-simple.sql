-- ======================================
-- Connectionsテーブルの作成（シンプル版）
-- エラーを最小限に抑えた安全な実装
-- ======================================

-- 1. 既存のconnectionsテーブルを確認（存在する場合はスキップ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'connections'
    ) THEN
        -- connectionsテーブルを作成
        CREATE TABLE public.connections (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            connected_id UUID NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            message TEXT,
            
            -- 制約
            UNIQUE(user_id, connected_id),
            CHECK (user_id != connected_id),
            CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked'))
        );
        
        RAISE NOTICE 'Connections table created successfully';
    ELSE
        RAISE NOTICE 'Connections table already exists';
    END IF;
END $$;

-- 2. 外部キー制約を別途追加（エラーを避けるため）
DO $$
BEGIN
    -- user_id の外部キー
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'connections_user_id_fkey'
    ) THEN
        ALTER TABLE public.connections 
        ADD CONSTRAINT connections_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- connected_id の外部キー
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'connections_connected_id_fkey'
    ) THEN
        ALTER TABLE public.connections 
        ADD CONSTRAINT connections_connected_id_fkey 
        FOREIGN KEY (connected_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Foreign key constraints might already exist or profiles table structure is different';
END $$;

-- 3. RLSを有効化
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- 4. 基本的なポリシーを作成（既存のものは削除）
DROP POLICY IF EXISTS "connections_select_policy" ON public.connections;
DROP POLICY IF EXISTS "connections_insert_policy" ON public.connections;
DROP POLICY IF EXISTS "connections_update_policy" ON public.connections;
DROP POLICY IF EXISTS "connections_delete_policy" ON public.connections;

-- 全ユーザーが全コネクションを閲覧可能（シンプル版）
CREATE POLICY "connections_select_policy" 
ON public.connections FOR SELECT 
USING (true);

-- 認証されたユーザーは新規作成可能
CREATE POLICY "connections_insert_policy" 
ON public.connections FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 認証されたユーザーは更新可能
CREATE POLICY "connections_update_policy" 
ON public.connections FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- 認証されたユーザーは削除可能
CREATE POLICY "connections_delete_policy" 
ON public.connections FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- 5. インデックスを作成
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON public.connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_connected_id ON public.connections(connected_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON public.connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_created_at ON public.connections(created_at DESC);

-- 6. 更新時刻の自動更新
CREATE OR REPLACE FUNCTION update_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_connections_updated_at ON public.connections;
CREATE TRIGGER trigger_update_connections_updated_at
BEFORE UPDATE ON public.connections
FOR EACH ROW
EXECUTE FUNCTION update_connections_updated_at();

-- 7. テスト用のサンプルデータ（エラーが出ても続行）
DO $$
DECLARE
    profile1 UUID;
    profile2 UUID;
BEGIN
    -- 最初の2つのプロフィールIDを取得
    SELECT id INTO profile1 FROM public.profiles ORDER BY created_at LIMIT 1;
    SELECT id INTO profile2 FROM public.profiles ORDER BY created_at OFFSET 1 LIMIT 1;
    
    -- プロフィールが存在する場合のみサンプルを挿入
    IF profile1 IS NOT NULL AND profile2 IS NOT NULL AND profile1 != profile2 THEN
        INSERT INTO public.connections (user_id, connected_id, status, message)
        VALUES (profile1, profile2, 'accepted', 'サンプルコネクション')
        ON CONFLICT (user_id, connected_id) DO NOTHING;
        
        RAISE NOTICE 'Sample connection created';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not create sample connection: %', SQLERRM;
END $$;

-- 8. 結果を確認
SELECT 
    'Profiles' as table_name,
    COUNT(*) as record_count
FROM public.profiles
UNION ALL
SELECT 
    'Connections' as table_name,
    COUNT(*) as record_count
FROM public.connections;

-- 9. コネクションの詳細を表示（最初の5件）
SELECT 
    c.id,
    c.status,
    c.created_at,
    p1.full_name as user_name,
    p2.full_name as connected_name
FROM public.connections c
LEFT JOIN public.profiles p1 ON c.user_id = p1.id
LEFT JOIN public.profiles p2 ON c.connected_id = p2.id
ORDER BY c.created_at DESC
LIMIT 5;