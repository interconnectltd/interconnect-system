# INTERCONNECT クイックセットアップガイド

## 🚀 3ステップでデプロイ

### ステップ1: Netlify CLIをインストール
```bash
npm install -g netlify-cli
netlify login
```

### ステップ2: 環境変数を設定
```bash
./setup-netlify-env.sh
```

以下の情報を準備してください：
- **Supabase URL**: https://whyoqhhzwtlxprhizmor.supabase.co
- **Supabase Service Key**: Supabaseダッシュボード → Settings → API → service_role
- **LINE Channel ID**: 2007213003
- **LINE Channel Secret**: LINE Developers → Basic settings → Channel secret

### ステップ3: デプロイ
```bash
./deploy.sh
```

## 📝 その他の操作

### ローカルでテスト
```bash
./test-local.sh
```

### 手動で環境変数を設定
```bash
# Netlifyダッシュボードで設定
netlify open:admin

# Site settings → Environment variables に移動して以下を追加：
SUPABASE_URL=https://whyoqhhzwtlxprhizmor.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
LINE_CHANNEL_ID=2007213003
LINE_CHANNEL_SECRET=your-channel-secret
```

### Supabaseの設定
1. [Supabaseダッシュボード](https://app.supabase.com)にログイン
2. SQL Editorを開く
3. `supabase/seed.sql`の内容をコピー&ペースト
4. 実行

### LINE Developersの設定
1. [LINE Developers](https://developers.line.biz/console/)にログイン
2. チャネルを選択
3. LINE Login設定で以下を追加：
   - Callback URL: `https://your-site.netlify.app/line-callback.html`

## ❓ トラブルシューティング

### Netlify CLIエラー
```bash
# 再ログイン
netlify logout
netlify login

# サイトを再リンク
netlify unlink
netlify link
```

### 環境変数が反映されない
```bash
# 強制的に再デプロイ
netlify deploy --trigger
```

### LINEログインエラー
- Callback URLが正しいか確認
- Channel IDとSecretが一致しているか確認
- Webログインが有効になっているか確認

## 📞 サポート

問題が解決しない場合は、以下の情報を準備してください：
- エラーメッセージのスクリーンショット
- Netlifyのビルドログ
- ブラウザのコンソールエラー

準備ができたら、再度お声がけください！