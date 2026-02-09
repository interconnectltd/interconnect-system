# INTERCONNECT Project

## 概要
INTERCONNECTは、メンバー管理、通知、ダッシュボード機能を備えたWebアプリケーションです。

## 技術スタック
- **フロントエンド**: HTML, CSS, JavaScript
- **バックエンド**: Supabase (PostgreSQL, Authentication, Realtime)
- **ホスティング**: Netlify
- **CI/CD**: GitHub Actions

## セットアップ手順

### 1. リポジトリのクローン
```bash
git clone https://github.com/YOUR_USERNAME/INTERCONNECT.git
cd INTERCONNECT
```

### 2. 環境変数の設定
`.env.example`を`.env`にコピーして、必要な値を設定してください：
```bash
cp .env.example .env
```

### 3. Supabaseの設定
1. [Supabase](https://supabase.com)でプロジェクトを作成
2. `supabase/seed.sql`のSQLを実行してデータベースを初期化
3. 環境変数にSupabaseのURLとキーを設定

### 4. Netlifyへのデプロイ
1. [Netlify](https://netlify.com)でサイトを作成
2. GitHubリポジトリと連携
3. 環境変数を設定
4. デプロイを実行

## ディレクトリ構造
```
INTERCONNECT_project/
├── assets/          # 画像、アイコンなどの静的ファイル
├── config/          # 設定ファイル
├── css/             # スタイルシート
├── includes/        # 共通コンポーネント
├── js/              # JavaScriptファイル
├── netlify/         # Netlify Functions
├── supabase/        # Supabaseの設定とマイグレーション
├── tests/           # テストファイル
├── index.html       # メインページ
├── dashboard.html   # ダッシュボード
├── members.html     # メンバー管理
├── admin.html       # 管理者ページ
└── netlify.toml     # Netlify設定

```

## 主な機能
- ユーザー認証（Supabase Auth）
- メンバー管理
- リアルタイム通知
- ダッシュボード
- 管理者機能

## 開発
### ローカルでの実行
```bash
# Netlify CLIのインストール
npm install -g netlify-cli

# ローカルサーバーの起動
netlify dev
```

### GitHubへのプッシュ
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

## ライセンス
このプロジェクトはMITライセンスの下で公開されています。// Force redeploy at Thu Jul 24 10:25:51 JST 2025
