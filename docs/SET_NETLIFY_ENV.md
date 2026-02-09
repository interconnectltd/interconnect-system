# Netlify環境変数設定コマンド

## 必要な情報が揃いました！

### 設定する環境変数
- LINE_CHANNEL_ID: 2007688616
- LINE_CHANNEL_SECRET: 12e4b8c5e7904bb66be6006f8fd741ac
- SUPABASE_URL: https://whyoqhhzwtlxprhizmor.supabase.co
- SUPABASE_SERVICE_KEY: (Supabaseダッシュボードから取得が必要)

## 設定方法

### 方法1: Netlify CLIを使用（推奨）

```bash
# 1. Netlifyにログイン
netlify login

# 2. サイトをリンク
netlify link

# 3. 環境変数を設定
netlify env:set LINE_CHANNEL_ID "2007688616"
netlify env:set LINE_CHANNEL_SECRET "12e4b8c5e7904bb66be6006f8fd741ac"
netlify env:set SUPABASE_URL "https://whyoqhhzwtlxprhizmor.supabase.co"
netlify env:set SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeW9xaGh6d3RseHByaGl6bW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjMyNzUsImV4cCI6MjA2NzA5OTI3NX0.HI03HObR6GkTmYh4Adm_DRkUOAssA8P1dhqzCH-mLrw"

# 4. Supabase Service Keyを設定（取得後）
# netlify env:set SUPABASE_SERVICE_KEY "your-service-key"

# 5. 環境変数を確認
netlify env:list
```

### 方法2: Netlifyダッシュボードで手動設定

1. [Netlify](https://app.netlify.com)にログイン
2. サイトを選択
3. Site settings → Environment variables
4. 「Add a variable」をクリック
5. 以下を追加：

| Key | Value |
|-----|-------|
| LINE_CHANNEL_ID | 2007688616 |
| LINE_CHANNEL_SECRET | 12e4b8c5e7904bb66be6006f8fd741ac |
| SUPABASE_URL | https://whyoqhhzwtlxprhizmor.supabase.co |
| SUPABASE_ANON_KEY | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |
| SUPABASE_SERVICE_KEY | (Supabaseから取得) |
| URL | https://interconnect-sigma.netlify.app |
| ALLOWED_ORIGINS | https://interconnect-sigma.netlify.app |
| ALLOWED_DOMAINS | interconnect-sigma.netlify.app,localhost |

## Supabase Service Keyの取得

1. [Supabase](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. Settings → API
4. **service_role** のキーをコピー（anon keyではない方）

## 設定後の確認

1. Netlifyで再デプロイ
2. ブラウザでサイトを更新
3. LINEログインボタンをクリック
4. LINEの認証画面が表示されれば成功！

## LINE Developersでの設定確認

[LINE Developers](https://developers.line.biz/console/)で以下を確認：

1. Channel ID: 2007688616のチャネルを選択
2. 「LINE Login設定」タブ
3. コールバックURLに以下が登録されているか確認：
   - https://interconnect-sigma.netlify.app/line-callback.html
   - http://localhost:8888/line-callback.html