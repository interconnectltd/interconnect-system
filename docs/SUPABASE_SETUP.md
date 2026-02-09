# Supabaseデータベース初期化手順

## 必要な手順

### 1. Supabase Service Keyの取得と設定

1. [Supabase](https://app.supabase.com)にログイン
2. プロジェクト「whyoqhhzwtlxprhizmor」を選択
3. Settings → API に移動
4. **service_role** キーをコピー（anon keyではない方）
5. 以下のコマンドで設定：

```bash
netlify env:set SUPABASE_SERVICE_KEY "取得したservice_roleキー"
```

### 2. LINE DevelopersでコールバックURLを設定

1. [LINE Developers](https://developers.line.biz/console/)にログイン
2. Channel ID: 2007688616のチャネルを選択
3. 「LINE Login設定」タブ
4. コールバックURLに以下を追加：
   - https://interconnect-auto-test.netlify.app/line-callback.html
   - http://localhost:8888/line-callback.html

### 3. Supabaseデータベースの初期化

1. [Supabase](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. SQL Editor に移動
4. 以下のSQLを実行：

```sql
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

-- トリガー関数：更新時刻を自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーの作成
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- インデックスの作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id ON profiles(line_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
```

### 4. 再デプロイ

環境変数の変更を反映するため、再デプロイします：

```bash
netlify deploy --trigger
```

## 設定確認

### 環境変数の確認
```bash
netlify env:list
```

### 現在設定済みの環境変数
- ✅ LINE_CHANNEL_ID
- ✅ LINE_CHANNEL_SECRET  
- ✅ SUPABASE_URL
- ✅ SUPABASE_ANON_KEY
- ✅ ALLOWED_ORIGINS
- ✅ ALLOWED_DOMAINS
- ❌ SUPABASE_SERVICE_KEY（要設定）

## トラブルシューティング

### LINEログインエラーの場合
1. Channel IDが正しいか確認（2007688616）
2. コールバックURLが正しく設定されているか確認
3. ブラウザのコンソールでエラーを確認

### Supabaseエラーの場合
1. Service Keyが正しく設定されているか確認
2. データベーステーブルが作成されているか確認
3. Netlify Functionsのログを確認

### 確認方法
```bash
# Netlify Functionsのログを確認
netlify functions:logs
```