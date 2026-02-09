# Supabase Dashboard テーブル作成ガイド

## 📋 必要なテーブル

1. **dashboard_stats** - ダッシュボード統計情報
2. **user_activities** - ユーザーアクティビティログ
3. **events** - イベント情報
4. **messages** - メッセージ

## 🚀 セットアップ手順

### Step 1: Supabaseにログイン

1. [Supabase Dashboard](https://app.supabase.com) にアクセス
2. プロジェクト「whyoqhhzwtlxprhizmor」を選択

### Step 2: SQL Editorを開く

1. 左サイドバーから「SQL Editor」をクリック
2. 「New query」をクリック

### Step 3: テーブル作成SQLを実行

以下のSQLを**順番に**実行してください：

#### 1. dashboard_stats テーブル

```sql
-- Dashboard統計テーブル
CREATE TABLE IF NOT EXISTS public.dashboard_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_members INTEGER DEFAULT 0,
    monthly_events INTEGER DEFAULT 0,
    matching_success INTEGER DEFAULT 0,
    unread_messages INTEGER DEFAULT 0,
    member_growth_percentage DECIMAL(5,2) DEFAULT 0,
    event_increase INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE public.dashboard_stats ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー（認証済みユーザー）
CREATE POLICY "Enable read for authenticated users" ON public.dashboard_stats
    FOR SELECT USING (auth.role() = 'authenticated');

-- 書き込みポリシー（認証済みユーザー）
CREATE POLICY "Enable insert for authenticated users" ON public.dashboard_stats
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.dashboard_stats
    FOR UPDATE USING (auth.role() = 'authenticated');
```

#### 2. user_activities テーブル

```sql
-- ユーザーアクティビティテーブル
CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー（公開または自分のアクティビティ）
CREATE POLICY "Public activities are viewable by everyone" ON public.user_activities
    FOR SELECT USING (is_public = true OR user_id = auth.uid());

-- 書き込みポリシー（自分のアクティビティのみ）
CREATE POLICY "Users can insert own activities" ON public.user_activities
    FOR INSERT WITH CHECK (user_id = auth.uid());
```

#### 3. events テーブル

```sql
-- イベントテーブル
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE,
    start_date TIMESTAMPTZ,
    time VARCHAR(100),
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー（認証済みユーザー）
CREATE POLICY "Events are viewable by authenticated users" ON public.events
    FOR SELECT USING (auth.role() = 'authenticated');

-- 書き込みポリシー（認証済みユーザー）
CREATE POLICY "Authenticated users can create events" ON public.events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

#### 4. messages テーブル

```sql
-- メッセージテーブル
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー（送信者または受信者）
CREATE POLICY "Users can view own messages" ON public.messages
    FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- 書き込みポリシー（送信者として）
CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());
```

### Step 4: 初期データを挿入

```sql
-- 初期統計データ
INSERT INTO public.dashboard_stats (
    total_members,
    monthly_events,
    matching_success,
    unread_messages,
    member_growth_percentage,
    event_increase
) VALUES (
    1, 0, 0, 0, 0.0, 0
) ON CONFLICT DO NOTHING;
```

### Step 5: 確認

1. デバッグツールにアクセス：
   ```
   https://interconnect-auto-test.netlify.app/debug-dashboard.html
   ```

2. 「Check All Tables」をクリックして、全てのテーブルが「OK」と表示されることを確認

## ⚠️ トラブルシューティング

### エラー: "permission denied"
- RLSポリシーが正しく設定されていません
- 上記のCREATE POLICY文を再実行してください

### エラー: "column does not exist"
- テーブル構造が異なる可能性があります
- debug-dashboard.htmlでテーブル構造を確認してください

### 401 Unauthorized
- ログインが必要です
- debug-dashboard.htmlで「Test Login」をクリックしてログインしてください

## 📝 注意事項

- すべてのテーブルは`public`スキーマに作成されます
- RLS（Row Level Security）が有効になっているため、適切な認証が必要です
- 初回実行時はエラーが出る場合がありますが、2回目の実行で成功することがあります