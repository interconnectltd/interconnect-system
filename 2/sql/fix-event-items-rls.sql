-- event_itemsテーブルのRLS設定を修正
-- 実行方法: Supabase Dashboard > SQL Editor でこのスクリプトを実行

-- 1. 現在のRLS状態を確認
SELECT 
    schemaname,
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'event_items';

-- 2. 現在のポリシーを確認
SELECT * FROM pg_policies WHERE tablename = 'event_items';

-- 3. RLSを一時的に無効化（デバッグ用）
-- 注意: 本番環境では推奨されません
ALTER TABLE event_items DISABLE ROW LEVEL SECURITY;

-- 4. または、全員に読み取り権限を付与
DROP POLICY IF EXISTS "Allow public read access" ON event_items;
CREATE POLICY "Allow public read access" ON event_items
    FOR SELECT
    TO public
    USING (is_public = true);

-- 5. anonロールに明示的に権限を付与
DROP POLICY IF EXISTS "Allow anon read access" ON event_items;
CREATE POLICY "Allow anon read access" ON event_items
    FOR SELECT
    TO anon
    USING (true);  -- すべて読み取り可能

-- 6. データ存在確認
SELECT COUNT(*) as total_events FROM event_items;
SELECT COUNT(*) as public_events FROM event_items WHERE is_public = true;
SELECT COUNT(*) as active_events FROM event_items WHERE is_cancelled = false;

-- 7. サンプルデータが存在しない場合は挿入
DO $$
BEGIN
    -- データが存在しない場合のみ挿入
    IF NOT EXISTS (SELECT 1 FROM event_items LIMIT 1) THEN
        INSERT INTO event_items (
            id,
            title,
            description,
            event_type,
            event_date,
            start_time,
            end_time,
            location,
            online_url,
            max_participants,
            price,
            currency,
            organizer_id,
            organizer_name,
            category,
            tags,
            requirements,
            agenda,
            image_url,
            is_public,
            is_cancelled,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'テストイベント：RLS確認用',
            'このイベントはRLS設定を確認するためのテストイベントです。',
            'online',
            CURRENT_DATE + INTERVAL '7 days',
            '14:00:00'::time,  -- 明示的にtime型にキャスト
            '16:00:00'::time,  -- 明示的にtime型にキャスト
            NULL,
            'https://zoom.us/j/test',
            50,
            0,
            'JPY',
            NULL,  -- organizer_idをNULLに設定（外部キー制約回避）
            'INTERCONNECT運営',
            'seminar',
            ARRAY['テスト', 'RLS', 'デバッグ'],
            '特になし',
            'テスト用アジェンダ',
            '/assets/user-placeholder.svg',
            true,
            false,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'テストイベントを挿入しました';
    ELSE
        RAISE NOTICE 'イベントデータは既に存在します';
    END IF;
END $$;

-- 8. 結果確認
SELECT 
    id,
    title,
    event_date,
    is_public,
    is_cancelled
FROM event_items
ORDER BY created_at DESC
LIMIT 5;