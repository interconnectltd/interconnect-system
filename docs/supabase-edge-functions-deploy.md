# Supabase Edge Functions デプロイ手順書

## 前提条件
- Supabase CLIがインストールされていること
- Supabaseプロジェクトが作成されていること
- プロジェクトのReference IDを取得済みであること

## 1. Supabase CLIのインストール（未インストールの場合）

### macOS
```bash
brew install supabase/tap/supabase
```

### Windows (PowerShell管理者権限で実行)
```powershell
iwr -useb https://raw.githubusercontent.com/supabase/cli/main/install.ps1 | iex
```

### Linux
```bash
curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh
```

## 2. Supabaseプロジェクトへのログインとリンク

```bash
# Supabaseにログイン
supabase login

# プロジェクトディレクトリに移動
cd /home/ooxmichaelxoo/INTERCONNECT_project

# プロジェクトとリンク
supabase link --project-ref YOUR_PROJECT_REF
```

**YOUR_PROJECT_REFの取得方法:**
1. Supabase管理画面にログイン
2. Settings → General
3. "Reference ID"をコピー（例：abcdefghijklmnop）

## 3. Edge Functionsのデプロイ

### 3.1 timerex-booking関数のデプロイ
```bash
supabase functions deploy timerex-booking
```

### 3.2 timerex-webhook関数のデプロイ
```bash
supabase functions deploy timerex-webhook
```

## 4. 環境変数の設定

```bash
# TimeRex API キー
supabase secrets set TIMEREX_API_KEY=7nxFkWUcjmbEXpXAoeP5TujgbH7Zrk7p8nbAmMYcAfoCdM6RgnI2qK6lSEpZaGAp

# TimeRex予約ページID
supabase secrets set TIMEREX_BOOKING_PAGE_ID=interconnect-consultation

# Webhook用シークレットキー（任意の強いパスワードを生成）
supabase secrets set TIMEREX_WEBHOOK_SECRET=your-super-secret-webhook-key-here
```

**注意:** `TIMEREX_WEBHOOK_SECRET`は任意の強いパスワードを設定してください。
例：`openssl rand -base64 32`で生成できます。

## 5. デプロイの確認

### 5.1 Functions一覧確認
```bash
supabase functions list
```

期待される出力:
```
┌──────────────────┬────────────┬──────────────────────┐
│ NAME             │ VERSION    │ CREATED AT           │
├──────────────────┼────────────┼──────────────────────┤
│ timerex-booking  │ v1        │ 2024-01-XX XX:XX:XX │
│ timerex-webhook  │ v1        │ 2024-01-XX XX:XX:XX │
└──────────────────┴────────────┴──────────────────────┘
```

### 5.2 ログ確認
```bash
# timerex-bookingのログ
supabase functions logs timerex-booking

# timerex-webhookのログ
supabase functions logs timerex-webhook

# リアルタイムログ監視
supabase functions logs timerex-booking --follow
```

## 6. Edge Function URLの取得

デプロイ後のEdge Function URLは以下の形式になります：

- timerex-booking: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/timerex-booking`
- timerex-webhook: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/timerex-webhook`

## 7. トラブルシューティング

### エラー: "Function not found"
```bash
# 関数ディレクトリの確認
ls -la supabase/functions/

# 関数が存在することを確認してから再デプロイ
supabase functions deploy timerex-booking --debug
```

### エラー: "Authentication failed"
```bash
# 再度ログイン
supabase login

# プロジェクトのリンクを再確認
supabase projects list
```

### エラー: "Deploy failed"
```bash
# デバッグモードで実行
supabase functions deploy timerex-booking --debug

# TypeScriptのエラーチェック
cd supabase/functions/timerex-booking
deno check index.ts
```

## 8. 次のステップ

Edge Functionsのデプロイが完了したら：

1. **netlify.toml**の`YOUR_SUPABASE_PROJECT_REF`を実際のReference IDに置き換える
2. TimeRexアカウントを作成し、予約ページを設定
3. Netlifyの環境変数を設定
4. 動作テストを実施

## 補足：ローカルテスト

デプロイ前にローカルでテストする場合：

```bash
# ローカルでSupabaseを起動
supabase start

# 関数をローカルで実行
supabase functions serve timerex-booking

# 別ターミナルでテスト
curl -i --location --request POST 'http://localhost:54321/functions/v1/timerex-booking' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"referralCode":"TEST123","userId":"test-user","userEmail":"test@example.com","userName":"テストユーザー"}'
```