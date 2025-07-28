-- ======================================
-- Connectionsテーブルの作成（修正版）
-- メンバー間のコネクション管理
-- ======================================

-- まず既存のprofilesテーブルの構造を確認
SELECT COUNT(*) as profile_count FROM public.profiles;

-- 1. connectionsテーブルを作成
CREATE TABLE IF NOT EXISTS public.connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    connected_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message TEXT, -- 申請時のメッセージ
    
    -- 同じユーザー同士の重複を防ぐ
    UNIQUE(user_id, connected_id),
    
    -- 自分自身とのコネクションを防ぐ
    CHECK (user_id != connected_id)
);

-- 2. RLS（Row Level Security）を有効化
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- 3. ポリシーを作成

-- 既存のポリシーを削除（エラー回避のため）
DROP POLICY IF EXISTS "Users can view own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can create own connection requests" ON public.connections;
DROP POLICY IF EXISTS "Users can update own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can delete own connection requests" ON public.connections;

-- ユーザーは自分に関連するコネクションのみ表示可能
CREATE POLICY "Users can view own connections" 
ON public.connections 
FOR SELECT 
USING (
    auth.uid() = user_id OR 
    auth.uid() = connected_id OR
    auth.role() = 'service_role'
);

-- ユーザーは自分発信のコネクション申請のみ作成可能
CREATE POLICY "Users can create own connection requests" 
ON public.connections 
FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR
    auth.role() = 'service_role'
);

-- ユーザーは自分に関連するコネクションのみ更新可能（承認・拒否用）
CREATE POLICY "Users can update own connections" 
ON public.connections 
FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    auth.uid() = connected_id OR
    auth.role() = 'service_role'
);

-- ユーザーは自分発信のコネクションのみ削除可能
CREATE POLICY "Users can delete own connection requests" 
ON public.connections 
FOR DELETE 
USING (
    auth.uid() = user_id OR
    auth.role() = 'service_role'
);

-- 4. インデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS connections_user_id_idx ON public.connections(user_id);
CREATE INDEX IF NOT EXISTS connections_connected_id_idx ON public.connections(connected_id);
CREATE INDEX IF NOT EXISTS connections_status_idx ON public.connections(status);
CREATE INDEX IF NOT EXISTS connections_created_at_idx ON public.connections(created_at);

-- 複合インデックス（よく使われるクエリのため）
CREATE INDEX IF NOT EXISTS connections_user_status_idx ON public.connections(user_id, status);
CREATE INDEX IF NOT EXISTS connections_connected_status_idx ON public.connections(connected_id, status);

-- 5. 更新時刻を自動更新するFunction（既に存在する場合はスキップ）
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 更新時刻を自動更新するTrigger
DROP TRIGGER IF EXISTS update_connections_updated_at ON public.connections;
CREATE TRIGGER update_connections_updated_at
    BEFORE UPDATE ON public.connections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 7. サンプルコネクションデータを挿入（既存のプロフィールがある場合のみ）
DO $$
DECLARE
    user1_id UUID;
    user2_id UUID;
    user3_id UUID;
BEGIN
    -- 既存のプロフィールIDを取得（最初の3つ）
    SELECT id INTO user1_id FROM public.profiles ORDER BY created_at LIMIT 1;
    SELECT id INTO user2_id FROM public.profiles ORDER BY created_at OFFSET 1 LIMIT 1;
    SELECT id INTO user3_id FROM public.profiles ORDER BY created_at OFFSET 2 LIMIT 1;
    
    -- サンプルコネクションを作成（プロフィールが存在する場合のみ）
    IF user1_id IS NOT NULL AND user2_id IS NOT NULL THEN
        INSERT INTO public.connections (user_id, connected_id, status, created_at, message)
        VALUES 
        (user1_id, user2_id, 'accepted', NOW() - INTERVAL '1 day', 'お疲れ様です。ぜひコネクトさせてください。')
        ON CONFLICT (user_id, connected_id) DO NOTHING;
    END IF;
    
    IF user1_id IS NOT NULL AND user3_id IS NOT NULL THEN
        INSERT INTO public.connections (user_id, connected_id, status, created_at, message)
        VALUES 
        (user1_id, user3_id, 'pending', NOW() - INTERVAL '2 hours', '技術について情報交換させていただければ幸いです。')
        ON CONFLICT (user_id, connected_id) DO NOTHING;
    END IF;
    
    RAISE NOTICE 'サンプルコネクションデータの挿入を試みました';
END $$;

-- 8. 統計確認
SELECT 
    status,
    COUNT(*) as count
FROM public.connections
GROUP BY status
ORDER BY 
    CASE status 
        WHEN 'accepted' THEN 1
        WHEN 'pending' THEN 2
        WHEN 'rejected' THEN 3
        WHEN 'blocked' THEN 4
    END;

-- 9. ビューを作成（使いやすさのため）
CREATE OR REPLACE VIEW public.user_connections AS
SELECT 
    c.id,
    c.user_id,
    c.connected_id,
    c.status,
    c.created_at,
    c.updated_at,
    c.message,
    p1.full_name as user_name,
    p1.company as user_company,
    p1.avatar_url as user_avatar,
    p2.full_name as connected_name,
    p2.company as connected_company,
    p2.avatar_url as connected_avatar
FROM public.connections c
LEFT JOIN public.profiles p1 ON c.user_id = p1.id
LEFT JOIN public.profiles p2 ON c.connected_id = p2.id;

-- 10. テーブル構造の確認
SELECT 
    table_name,
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name IN ('profiles', 'connections')
ORDER BY 
    table_name, ordinal_position;