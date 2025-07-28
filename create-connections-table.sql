-- ======================================
-- Connectionsテーブルの作成
-- メンバー間のコネクション管理
-- ======================================

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

-- ユーザーは自分に関連するコネクションのみ表示可能
CREATE POLICY "Users can view own connections" 
ON public.connections 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = connected_id);

-- ユーザーは自分発信のコネクション申請のみ作成可能
CREATE POLICY "Users can create own connection requests" 
ON public.connections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分に関連するコネクションのみ更新可能（承認・拒否用）
CREATE POLICY "Users can update own connections" 
ON public.connections 
FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = connected_id);

-- ユーザーは自分発信のコネクションのみ削除可能
CREATE POLICY "Users can delete own connection requests" 
ON public.connections 
FOR DELETE 
USING (auth.uid() = user_id);

-- 4. インデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS connections_user_id_idx ON public.connections(user_id);
CREATE INDEX IF NOT EXISTS connections_connected_id_idx ON public.connections(connected_id);
CREATE INDEX IF NOT EXISTS connections_status_idx ON public.connections(status);
CREATE INDEX IF NOT EXISTS connections_created_at_idx ON public.connections(created_at);

-- 複合インデックス（よく使われるクエリのため）
CREATE INDEX IF NOT EXISTS connections_user_status_idx ON public.connections(user_id, status);
CREATE INDEX IF NOT EXISTS connections_connected_status_idx ON public.connections(connected_id, status);

-- 5. 更新時刻を自動更新するTrigger
DROP TRIGGER IF EXISTS update_connections_updated_at ON public.connections;
CREATE TRIGGER update_connections_updated_at
    BEFORE UPDATE ON public.connections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 6. コネクション統計を更新するFunction
CREATE OR REPLACE FUNCTION public.update_connection_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- dashboard_statsのconnection_countを更新
    UPDATE public.dashboard_stats
    SET 
        total_connections = (
            SELECT COUNT(*) 
            FROM public.connections 
            WHERE status = 'accepted'
        ),
        updated_at = NOW()
    WHERE id = 1;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. コネクション変更時に統計を更新するTrigger
DROP TRIGGER IF EXISTS update_connection_stats_trigger ON public.connections;
CREATE TRIGGER update_connection_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.connections
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.update_connection_stats();

-- 8. サンプルコネクションデータを挿入（テスト用）
DO $$
DECLARE
    user1_id UUID;
    user2_id UUID;
    user3_id UUID;
    user4_id UUID;
    user5_id UUID;
BEGIN
    -- 既存のプロフィールIDを取得
    SELECT id INTO user1_id FROM public.profiles WHERE full_name = '山田太郎' LIMIT 1;
    SELECT id INTO user2_id FROM public.profiles WHERE full_name = '佐藤花子' LIMIT 1;
    SELECT id INTO user3_id FROM public.profiles WHERE full_name = '高橋健一' LIMIT 1;
    SELECT id INTO user4_id FROM public.profiles WHERE full_name = '伊藤美咲' LIMIT 1;
    SELECT id INTO user5_id FROM public.profiles WHERE full_name = '渡辺裕太' LIMIT 1;
    
    -- サンプルコネクションを作成
    IF user1_id IS NOT NULL AND user2_id IS NOT NULL THEN
        INSERT INTO public.connections (user_id, connected_id, status, created_at, message)
        VALUES 
        (user1_id, user2_id, 'accepted', NOW() - INTERVAL '1 day', 'お疲れ様です。ぜひコネクトさせてください。'),
        (user1_id, user3_id, 'accepted', NOW() - INTERVAL '3 days', 'テクノロジー分野で協力できればと思います。'),
        (user2_id, user4_id, 'accepted', NOW() - INTERVAL '1 week', 'マーケティングについて情報交換しませんか？');
        
        -- ペンディング申請も作成
        IF user5_id IS NOT NULL THEN
            INSERT INTO public.connections (user_id, connected_id, status, created_at, message)
            VALUES 
            (user1_id, user5_id, 'pending', NOW() - INTERVAL '2 hours', '営業戦略について学びたいです。');
        END IF;
    END IF;
    
    RAISE NOTICE 'サンプルコネクションデータを挿入しました';
END $$;

-- 9. 統計確認
SELECT 
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/86400)::INTEGER as avg_days_old
FROM public.connections
GROUP BY status
ORDER BY 
    CASE status 
        WHEN 'accepted' THEN 1
        WHEN 'pending' THEN 2
        WHEN 'rejected' THEN 3
        WHEN 'blocked' THEN 4
    END;

-- 10. ビューを作成（使いやすさのため）
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
JOIN public.profiles p1 ON c.user_id = p1.id
JOIN public.profiles p2 ON c.connected_id = p2.id;