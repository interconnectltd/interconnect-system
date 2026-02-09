# セキュリティに関する重要事項

## Supabase APIキーについて

### 現在の状況
- `js/supabase-client.js` にSupabase URLとanon keyがハードコードされています
- これらの値は**フロントエンドでの使用において安全**です

### なぜ安全なのか
1. **anon key（匿名キー）**は公開を前提としたキーです
2. Row Level Security (RLS) により、適切なアクセス制御が行われます
3. anon keyでは以下の操作のみ可能：
   - 公開データの読み取り
   - 認証後のユーザー自身のデータ操作

### 注意事項
- **service_role key（サービスロールキー）**は絶対にフロントエンドコードに含めない
- service_role keyはサーバーサイド（Netlify Functions等）でのみ使用

### 推奨される改善
1. **ビルド時の環境変数注入**
   ```javascript
   // Viteの場合
   const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
   const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
   ```

2. **Netlifyでの環境変数設定**
   - ビルド時に環境変数を注入することで、GitHubリポジトリにキーを含めない

## LINE Channel Secretについて

### 重要
- `LINE_CHANNEL_SECRET` は**絶対に公開してはいけません**
- 現在、Netlify Functions内でのみ使用（正しい実装）
- フロントエンドコードには含まれていません

## 環境変数の使い分け

### フロントエンド（公開可能）
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `LINE_CHANNEL_ID`

### バックエンド（秘匿必須）
- `SUPABASE_SERVICE_KEY`
- `LINE_CHANNEL_SECRET`

## 現在のセキュリティレベル
- **問題なし**: 現在の実装でセキュリティ上の重大な問題はありません
- **改善余地**: ビルドプロセスの導入により、より良い実装が可能