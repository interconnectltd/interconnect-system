# INTERCONNECT 環境変数設定ガイド

## 必要な環境変数

### 1. Supabase関連

#### ローカル開発用（`.env`ファイル）
```
SUPABASE_URL=https://whyoqhhzwtlxprhizmor.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here
```

#### Supabaseから取得方法
1. [Supabaseダッシュボード](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. Settings → API に移動
4. 以下をコピー：
   - `Project URL` → `SUPABASE_URL`
   - `anon public` → `SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_KEY`（バックエンド用）

### 2. LINE Login関連

#### 必要な情報
```
LINE_CHANNEL_ID=2007688616
LINE_CHANNEL_SECRET=your_channel_secret_here
```

#### LINE Developersから取得方法
1. [LINE Developers](https://developers.line.biz/console/)にログイン
2. プロバイダーとチャネルを選択
3. Basic settings タブから：
   - `Channel ID` → `LINE_CHANNEL_ID`
   - `Channel secret` → `LINE_CHANNEL_SECRET`

### 3. Netlify環境変数設定

#### Netlifyダッシュボードでの設定
1. [Netlify](https://app.netlify.com)にログイン
2. サイトを選択
3. Site settings → Environment variables に移動
4. 以下を追加：

```
SUPABASE_URL=https://whyoqhhzwtlxprhizmor.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here
LINE_CHANNEL_ID=2007688616
LINE_CHANNEL_SECRET=your_channel_secret_here
URL=https://your-site-name.netlify.app
```

#### 重要な注意事項
- `SUPABASE_ANON_KEY`はフロントエンド用（公開可能）
- `SUPABASE_SERVICE_KEY`はバックエンド用（秘密にする）
- `LINE_CHANNEL_SECRET`は絶対に公開しない

## セキュリティベストプラクティス

### 1. フロントエンドコード
- `SUPABASE_ANON_KEY`のみ使用
- `LINE_CHANNEL_ID`のみ使用
- シークレットキーは絶対に含めない

### 2. バックエンドコード（Netlify Functions）
- 環境変数から`SUPABASE_SERVICE_KEY`を読み込む
- `LINE_CHANNEL_SECRET`を使用してトークンを検証

### 3. Git管理
- `.env`ファイルは`.gitignore`に追加
- 環境変数の値をコミットしない
- サンプルファイル`.env.example`を用意

## テスト方法

### 1. ローカル環境
```bash
# Netlify CLIをインストール
npm install -g netlify-cli

# ローカルで環境変数を読み込んで実行
netlify dev
```

### 2. 環境変数の確認
```javascript
// テスト用コード
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
console.log('LINE_CHANNEL_ID:', process.env.LINE_CHANNEL_ID ? 'Set' : 'Not set');
```

## トラブルシューティング

### 環境変数が読み込めない場合
1. Netlifyの環境変数設定を確認
2. デプロイを再実行
3. Netlify Functionsのログを確認

### LINEログインが失敗する場合
1. Redirect URIが正しいか確認
2. Channel IDとSecretが一致しているか確認
3. LINE Developersコンソールで設定を確認

### Supabase接続エラー
1. URLとキーが正しいか確認
2. Supabaseプロジェクトがアクティブか確認
3. RLSポリシーを確認

## 次のステップ

1. 本番環境用の環境変数を設定
2. ステージング環境を別途作成
3. 環境ごとに異なる値を管理
4. シークレット管理ツールの導入を検討