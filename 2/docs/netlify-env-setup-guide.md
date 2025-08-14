# Netlify環境変数設定手順書

## 1. Supabaseプロジェクト情報の取得

### 1.1 SupabaseダッシュボードへアクセスI
1. https://supabase.com にログイン
2. 使用するプロジェクトを選択
3. 左メニュー「Settings」→「API」をクリック

### 1.2 必要な情報をコピー
以下の情報をコピーして保存：

- **Project URL**: `https://YOUR_PROJECT_REF.supabase.co`
- **Anon/Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`（長い文字列）
- **Project Reference ID**: URLの`YOUR_PROJECT_REF`の部分

## 2. Netlify環境変数の設定

### 2.1 Netlifyダッシュボードへアクセス
1. https://app.netlify.com にログイン
2. INTERCONNECTプロジェクトのサイトを選択
3. 「Site settings」をクリック

### 2.2 環境変数の追加
1. 左メニュー「Environment variables」をクリック
2. 「Add a variable」ボタンをクリック
3. 以下の環境変数を1つずつ追加：

#### 必須の環境変数

| Key | Value | 説明 |
|-----|-------|------|
| `SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` | SupabaseプロジェクトのURL |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase Anon Key |
| `NEXT_PUBLIC_TIMEREX_PAGE_ID` | `interconnect-consultation` | TimeRex予約ページID |

#### 追加推奨の環境変数（将来の拡張用）

| Key | Value | 説明 |
|-----|-------|------|
| `SITE_URL` | `https://interconnect-auto.netlify.app` | サイトのURL |
| `NODE_VERSION` | `18` | Node.jsバージョン |

### 2.3 環境変数の保存
1. 各変数を入力後、「Create variable」をクリック
2. すべての変数を追加したら完了

## 3. netlify.tomlの更新

### 3.1 プロジェクトIDの置き換え
1. プロジェクトルートの`netlify.toml`ファイルを開く
2. `YOUR_SUPABASE_PROJECT_REF`を実際のProject Reference IDに置き換える

**変更前:**
```toml
[[redirects]]
  from = "/api/timerex-webhook"
  to = "https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/timerex-webhook"
  status = 200
  force = true

[[redirects]]
  from = "/api/timerex-booking"
  to = "https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/timerex-booking"
  status = 200
  force = true
```

**変更後（例）:**
```toml
[[redirects]]
  from = "/api/timerex-webhook"
  to = "https://abcdefghijklmnop.supabase.co/functions/v1/timerex-webhook"
  status = 200
  force = true

[[redirects]]
  from = "/api/timerex-booking"
  to = "https://abcdefghijklmnop.supabase.co/functions/v1/timerex-booking"
  status = 200
  force = true
```

### 3.2 変更のコミット・プッシュ
```bash
git add netlify.toml
git commit -m "netlify.toml: SupabaseプロジェクトIDを設定"
git push origin main
```

## 4. デプロイの確認

### 4.1 自動デプロイの確認
1. Netlifyダッシュボードに戻る
2. 「Deploys」タブをクリック
3. 最新のデプロイが「Published」になることを確認

### 4.2 環境変数の反映確認
1. デプロイが完了したら、サイトにアクセス
2. ブラウザの開発者ツール（F12）を開く
3. Consoleタブで以下を実行：

```javascript
// 環境変数が反映されているか確認（フロントエンドでは見えない）
console.log('Site URL:', window.location.origin);
```

## 5. ローカル開発環境の設定

### 5.1 .envファイルの作成
プロジェクトルートに`.env`ファイルを作成：

```bash
# Supabase
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# TimeRex
NEXT_PUBLIC_TIMEREX_PAGE_ID=interconnect-consultation

# Site
SITE_URL=http://localhost:8888
```

### 5.2 .gitignoreの確認
`.env`ファイルが`.gitignore`に含まれていることを確認：

```gitignore
# Environment variables
.env
.env.local
.env.production
```

## 6. トラブルシューティング

### 環境変数が反映されない場合
1. **Clear cache and deploy**を実行
   - Netlifyダッシュボード → Deploys → Trigger deploy → Clear cache and deploy
2. ブラウザのキャッシュをクリア
3. 環境変数のキー名が正確か確認

### デプロイエラーの場合
1. Deploy logを確認
2. 環境変数の値に特殊文字が含まれていないか確認
3. 値の前後に余分なスペースがないか確認

### APIリクエストが失敗する場合
1. netlify.tomlのURLが正しいか確認
2. Supabase Edge Functionsがデプロイされているか確認
3. CORSエラーが出ていないか確認

## 7. TimeRex Webhook設定の統合

### 7.1 TimeRex管理画面での設定
1. TimeRexダッシュボードにログイン
2. 「設定」→「API」→「Webhook」タブ
3. 以下のURLを設定：
   ```
   https://interconnect-auto.netlify.app/api/timerex-webhook
   ```
4. シークレットキーを生成して設定（後でSupabaseにも設定）

### 7.2 Supabase Edge Functionsへの環境変数設定
```bash
# TimeRex API関連の環境変数をSupabaseに設定
supabase secrets set TIMEREX_API_KEY=YOUR_TIMEREX_API_KEY
supabase secrets set TIMEREX_BOOKING_PAGE_ID=interconnect-consultation
supabase secrets set TIMEREX_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
```

## 8. セキュリティの注意事項

- **SUPABASE_ANON_KEY**は公開可能なキーです（Row Level Securityで保護）
- **Service Role Key**は絶対に公開しないでください
- **TIMEREX_WEBHOOK_SECRET**は強力なランダム文字列を使用
- 環境変数の値を誤ってコミットしないよう注意
- 定期的にAPIキーをローテーションすることを推奨

## 9. 動作確認手順

### 9.1 環境変数の確認
1. Netlifyダッシュボード → Site settings → Environment variables
2. すべての必須環境変数が設定されていることを確認

### 9.2 APIエンドポイントのテスト
```bash
# ローカルでテスト（curlコマンド）
curl -X POST https://interconnect-auto.netlify.app/api/timerex-booking \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 9.3 TimeRex連携テスト
1. 実際に予約ページにアクセス
2. テスト予約を作成
3. Supabaseダッシュボードで予約データが保存されていることを確認

## 10. 確認チェックリスト

### Netlify側の設定
- [ ] SUPABASE_URLが正しく設定されている
- [ ] SUPABASE_ANON_KEYが正しく設定されている
- [ ] NEXT_PUBLIC_TIMEREX_PAGE_IDが設定されている
- [ ] netlify.tomlのProject IDが置き換えられている
- [ ] 変更がGitHubにプッシュされている
- [ ] Netlifyで新しいデプロイが成功している

### Supabase側の設定
- [ ] Edge Functionsがデプロイされている
- [ ] TIMEREX_API_KEYが設定されている
- [ ] TIMEREX_WEBHOOK_SECRETが設定されている
- [ ] データベーステーブルが作成されている

### TimeRex側の設定
- [ ] 予約ページが作成されている
- [ ] Webhook URLが設定されている
- [ ] カスタムフィールドが正しく設定されている

### ローカル環境
- [ ] .envファイルが作成されている
- [ ] .envファイルが.gitignoreに含まれている

すべてのチェックが完了したら、TimeRex統合の設定は完了です！