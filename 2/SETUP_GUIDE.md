# INTERCONNECT セットアップガイド

## 自動連携の設定手順

### 1. GitHub連携

#### リポジトリの作成
1. GitHubにログインして新しいリポジトリを作成
2. リポジトリ名: `INTERCONNECT`
3. プライベート/パブリックを選択

#### ローカルからのプッシュ
```bash
cd /home/ooxmichaelxoo/INTERCONNECT_project
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/INTERCONNECT.git
git push -u origin main
```

### 2. Supabase連携

#### プロジェクトの作成
1. [Supabase](https://supabase.com)にログイン
2. 「New Project」をクリック
3. プロジェクト名とパスワードを設定
4. リージョンを選択（東京推奨）

#### データベースの初期化
1. SQL Editorを開く
2. `supabase/seed.sql`の内容をコピー&ペースト
3. 実行してテーブルを作成

#### 環境変数の取得
1. Settings > API から以下を取得：
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`

### 3. Netlify連携

#### サイトの作成
1. [Netlify](https://netlify.com)にログイン
2. 「Add new site」→「Import an existing project」
3. GitHubと連携してINTERCONNECTリポジトリを選択

#### 環境変数の設定
Site settings > Environment variables で以下を設定：
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GITHUB_CLIENT_ID`（GitHub OAuth用）
- `GITHUB_CLIENT_SECRET`（GitHub OAuth用）

#### デプロイ設定
- Build command: （空欄）
- Publish directory: `.`
- 自動デプロイが有効になっていることを確認

### 4. GitHub Actions設定

#### シークレットの追加
GitHubリポジトリ > Settings > Secrets and variables > Actions：
- `NETLIFY_AUTH_TOKEN`: NetlifyのUser settings > Applications から取得
- `NETLIFY_SITE_ID`: Netlify Site settings > General から取得

### 5. 自動連携の確認

#### テスト手順
1. ローカルでファイルを変更
```bash
echo "<!-- Test update -->" >> index.html
git add .
git commit -m "Test auto-deployment"
git push
```

2. 確認項目：
   - GitHub Actionsが自動実行される
   - Netlifyに自動デプロイされる
   - サイトが更新される

## トラブルシューティング

### Netlifyデプロイが失敗する場合
- netlify.tomlの設定を確認
- 環境変数が正しく設定されているか確認

### Supabase接続エラー
- CORS設定を確認（Supabase Dashboard > Authentication > URL Configuration）
- APIキーが正しいか確認

### GitHub Actions失敗
- シークレットが正しく設定されているか確認
- ワークフローファイルの構文エラーをチェック

## 次のステップ

1. **カスタムドメインの設定**
   - Netlify > Domain settings でカスタムドメインを追加

2. **SSL証明書**
   - Netlifyが自動的にLet's Encrypt証明書を設定

3. **監視設定**
   - Netlify Analyticsを有効化
   - Supabaseのメトリクスを確認

4. **バックアップ**
   - Supabaseの自動バックアップを設定
   - GitHubのブランチ保護を設定