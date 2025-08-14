# TimeRex統合システム環境変数設定ガイド

## 🔧 必須環境変数

### Supabase環境変数
```bash
# Supabase基本設定
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# TimeRex API設定
TIMEREX_API_KEY=7nxFkWUcjmbEXpXAoeP5TujgbH7Zrk7p8nbAmMYcAfoCdM6RgnI2qK6lSEpZaGAp
TIMEREX_BOOKING_PAGE_ID=interconnect-consultation
TIMEREX_WEBHOOK_SECRET=your_webhook_secret_key
```

### Netlify設定
```bash
# netlify.tomlの設定で以下を置き換え
YOUR_SUPABASE_PROJECT_REF → 実際のSupabaseプロジェクトID
```

## 📋 設定手順

### 1. Supabase設定

#### 1.1 Edge Functions設定
```bash
# Supabase CLIでデプロイ
supabase functions deploy timerex-webhook
supabase functions deploy timerex-booking

# 環境変数を設定
supabase secrets set TIMEREX_API_KEY=7nxFkWUcjmbEXpXAoeP5TujgbH7Zrk7p8nbAmMYcAfoCdM6RgnI2qK6lSEpZaGAp
supabase secrets set TIMEREX_BOOKING_PAGE_ID=interconnect-consultation
supabase secrets set TIMEREX_WEBHOOK_SECRET=your_webhook_secret_here
```

#### 1.2 データベース設定
```sql
-- 以下のSQLファイルを順番に実行
1. sql/create-booking-tables.sql
2. sql/referral-tracking-tables.sql
```

### 2. TimeRex設定

#### 2.1 予約ページ作成
1. TimeRex管理画面にログイン
2. 「予約ページ」→「新規作成」
3. ページID: `interconnect-consultation`
4. カスタムフィールド設定:
   ```
   フィールド1:
   - ID: referral_code
   - タイプ: 非表示
   - 必須: はい
   
   フィールド2:
   - ID: user_id
   - タイプ: 非表示
   - 必須: いいえ
   
   フィールド3:
   - ID: consultation_type
   - タイプ: 選択式
   - ラベル: 相談内容
   - 選択肢:
     - 起業・創業相談
     - 資金調達相談
     - マーケティング相談
     - 人材・組織相談
     - その他
   ```

#### 2.2 Webhook設定
1. TimeRex管理画面 → 「API設定」
2. Webhook URL: `https://interconnect-auto.netlify.app/api/timerex-webhook`
3. 送信イベント:
   - ✅ 予約作成時 (booking.created)
   - ✅ 予約完了時 (booking.completed)
   - ✅ 予約キャンセル時 (booking.cancelled)
4. シークレットキー: 任意の文字列（TIMEREX_WEBHOOK_SECRETと同じ値）

### 3. Netlify設定

#### 3.1 環境変数設定
Netlify管理画面 → Site settings → Environment variables で以下を設定:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

#### 3.2 netlify.toml更新
```toml
# netlify.tomlの以下の部分を実際の値に置き換え
YOUR_SUPABASE_PROJECT_REF → 実際のSupabaseプロジェクトID

例:
from: to = "https://abcdefghijklmnop.supabase.co/functions/v1/timerex-webhook"
to: to = "https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/timerex-webhook"
```

### 4. フロントエンド設定

#### 4.1 必要なスクリプト読み込み
全てのページで以下を読み込み:
```html
<script src="js/referral-tracking.js"></script>
<script src="js/timerex-booking.js"></script>
```

#### 4.2 ボタンID統一
- ダッシュボード: `book-consultation-btn`
- 紹介ページ: `book-referral-btn`

## 🧪 テスト方法

### 1. 基本機能テスト
```bash
# 1. 紹介リンクでアクセス
https://interconnect-auto.netlify.app/invite/TEST123

# 2. 予約ボタンクリック
# 3. TimeRex予約ページが開くことを確認
# 4. 予約完了
# 5. ポイント付与されることを確認
```

### 2. Edge Function テスト
```javascript
// ブラウザコンソールで実行
const response = await supabaseClient.functions.invoke('timerex-booking', {
  body: {
    referralCode: 'TEST123',
    userId: 'test-user-id',
    userEmail: 'test@example.com',
    userName: 'テストユーザー'
  }
});
console.log(response);
```

### 3. Webhook テスト
```bash
# TimeRexで実際に予約を作成し、Webhook が送信されることを確認
# Supabase Edge Functions ログで受信を確認
```

## 🚨 トラブルシューティング

### よくある問題

#### 1. Edge Function が呼べない
- netlify.toml の設定確認
- Supabase プロジェクトIDが正しいか確認
- CORS設定確認

#### 2. Webhook が受信されない
- TimeRex側のWebhook URL設定確認
- シークレットキーの一致確認
- SSL証明書の確認

#### 3. ポイントが付与されない
- データベースのRLSポリシー確認
- add_referral_points関数の実行ログ確認
- 紹介コードとユーザーIDの関連付け確認

### ログ確認方法
```bash
# Supabase Edge Functions ログ
supabase functions logs timerex-webhook
supabase functions logs timerex-booking

# Netlify Functions ログ
netlify functions:logs
```

## 📈 監視・メトリクス

### 重要な指標
- 紹介リンククリック数
- 予約作成数
- 予約完了数
- ポイント付与数
- エラー発生率

### 統計確認クエリ
```sql
-- 紹介統計を確認
SELECT * FROM referral_statistics;

-- 予約統計を確認
SELECT * FROM booking_stats;
```