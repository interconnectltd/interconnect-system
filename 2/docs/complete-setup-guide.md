# 🚀 INTERCONNECT TimeRex統合システム 完全セットアップガイド

## 📋 セットアップ順序（重要！）

**この順番で必ず実行してください：**
1. Supabaseデータベース設定
2. Supabase Edge Functions デプロイ
3. TimeRex アカウント・予約ページ作成
4. Netlify環境変数設定
5. netlify.toml更新
6. 動作テスト

---

## 🗄️ STEP 1: Supabaseデータベース設定

### 1.1 Supabase管理画面にアクセス
1. https://supabase.com にアクセス
2. プロジェクトを選択
3. 左メニュー「SQL Editor」をクリック

### 1.2 データベーステーブルを作成
以下の順番でSQLを実行：

#### ① 予約システム用テーブル作成
```sql
-- sql/create-booking-tables.sql の内容をコピペして実行
```

**実行手順：**
1. `sql/create-booking-tables.sql`ファイルを開く
2. 全内容をコピー
3. Supabase SQL Editorに貼り付け
4. 「RUN」ボタンクリック
5. ✅ 成功メッセージを確認

#### ② 紹介追跡テーブル作成
```sql
-- sql/referral-tracking-tables.sql の内容をコピペして実行
```

**実行手順：**
1. `sql/referral-tracking-tables.sql`ファイルを開く
2. 全内容をコピー
3. 新しいクエリとして実行
4. ✅ 成功確認

### 1.3 テーブル作成確認
以下のクエリで確認：

```sql
-- 作成されたテーブル一覧確認
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'booking_sessions', 
    'bookings', 
    'notifications',
    'point_transactions',
    'referral_clicks',
    'invitations'
);
```

**期待結果：** 6つのテーブルが表示される

---

## ⚡ STEP 2: Supabase Edge Functions デプロイ

### 2.1 Supabase CLI インストール（初回のみ）
```bash
# macOS
brew install supabase/tap/supabase

# Windows (PowerShell)
iwr -useb https://raw.githubusercontent.com/supabase/cli/main/install.ps1 | iex

# Linux
curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh
```

### 2.2 プロジェクトにログイン
```bash
# Supabaseにログイン
supabase login

# プロジェクトにリンク
supabase link --project-ref YOUR_PROJECT_REF
```

**YOUR_PROJECT_REF を取得：**
1. Supabase管理画面 → Settings → General
2. 「Reference ID」をコピー（例：abcdefghijklmnop）

### 2.3 Edge Functions デプロイ
```bash
# プロジェクトフォルダに移動
cd /path/to/INTERCONNECT_project

# 両方のFunctionをデプロイ
supabase functions deploy timerex-webhook
supabase functions deploy timerex-booking
```

### 2.4 環境変数設定
```bash
# TimeRex API キー設定
supabase secrets set TIMEREX_API_KEY=7nxFkWUcjmbEXpXAoeP5TujgbH7Zrk7p8nbAmMYcAfoCdM6RgnI2qK6lSEpZaGAp

# TimeRex予約ページID設定
supabase secrets set TIMEREX_BOOKING_PAGE_ID=interconnect-consultation

# Webhook用シークレットキー（任意の強いパスワード）
supabase secrets set TIMEREX_WEBHOOK_SECRET=your-super-secret-webhook-key-here
```

### 2.5 デプロイ確認
```bash
# Function一覧確認
supabase functions list

# ログ確認
supabase functions logs timerex-webhook
supabase functions logs timerex-booking
```

---

## 📅 STEP 3: TimeRex設定

### 3.1 TimeRexアカウント作成
1. https://timerex.jp にアクセス
2. 「新規登録」をクリック
3. アカウント作成（フリープランでOK）

### 3.2 予約ページ作成

#### ① 基本設定
1. TimeRex管理画面にログイン
2. 「予約ページ」→「新規作成」をクリック
3. 以下を設定：

```
ページ名: INTERCONNECT 無料相談予約
URL: interconnect-consultation  ← 重要！この名前を使用
説明: ビジネスに関する無料相談を承ります
予約時間: 30分
バッファ時間: 15分
```

#### ② 営業時間設定
```
月曜日: 09:00 - 18:00
火曜日: 09:00 - 18:00
水曜日: 09:00 - 18:00
木曜日: 09:00 - 18:00
金曜日: 09:00 - 18:00
土曜日: 休業
日曜日: 休業
```

#### ③ カスタムフィールド設定（重要！）
以下を**必ず**設定：

**フィールド1:**
```
フィールドID: referral_code
フィールド名: 紹介コード
タイプ: 非表示
必須: はい
デフォルト値: DIRECT
```

**フィールド2:**
```
フィールドID: user_id
フィールド名: ユーザーID
タイプ: 非表示
必須: いいえ
```

**フィールド3:**
```
フィールドID: consultation_type
フィールド名: 相談内容
タイプ: 選択式
必須: はい
選択肢:
- 起業・創業相談
- 資金調達相談
- マーケティング相談
- 人材・組織相談
- その他
```

### 3.3 Webhook設定

#### ① API設定画面にアクセス
1. TimeRex管理画面 → 「設定」 → 「API」
2. 「Webhook」タブをクリック

#### ② Webhook URL設定
```
Webhook URL: https://interconnect-auto.netlify.app/api/timerex-webhook
```

#### ③ 送信イベント設定
以下にチェックを入れる：
- ✅ 予約作成時 (booking.created)
- ✅ 予約完了時 (booking.completed) 
- ✅ 予約キャンセル時 (booking.cancelled)

#### ④ シークレットキー設定
```
シークレットキー: your-super-secret-webhook-key-here
```
**※ STEP 2.4で設定したTIMEREX_WEBHOOK_SECRETと同じ値**

---

## 🌐 STEP 4: Netlify設定

### 4.1 環境変数設定
1. Netlify管理画面にアクセス
2. サイトを選択
3. 「Site settings」→「Environment variables」
4. 以下を追加：

```bash
# Supabase接続情報
SUPABASE_URL = https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# TimeRex情報（フロントエンド用）
NEXT_PUBLIC_TIMEREX_PAGE_ID = interconnect-consultation
```

**値の取得方法：**
- Supabase管理画面 → Settings → API
- URL と anon/public key をコピー

### 4.2 netlify.toml更新

#### ① YOUR_SUPABASE_PROJECT_REF を置き換え
`netlify.toml`ファイルの以下を修正：

**変更前：**
```toml
to = "https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/timerex-webhook"
```

**変更後：**
```toml
to = "https://abcdefghijklmnop.supabase.co/functions/v1/timerex-webhook"
```

#### ② 完全なnetlify.toml例
```toml
[build]
  publish = "."
  command = "npm install --prefix netlify/functions"

[build.environment]
  NODE_VERSION = "18"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[plugins]]
  package = "@netlify/plugin-functions-install-core"

[[headers]]
  for = "/.netlify/functions/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Headers = "Content-Type"
    Access-Control-Allow-Methods = "POST, OPTIONS"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"

# 紹介リンクのリダイレクト
[[redirects]]
  from = "/invite/*"
  to = "/index.html"
  status = 200

# TimeRex Webhook受信（実際のプロジェクトIDに置き換え）
[[redirects]]
  from = "/api/timerex-webhook"
  to = "https://abcdefghijklmnop.supabase.co/functions/v1/timerex-webhook"
  status = 200
  force = true
  headers = {X-Forwarded-Host = "interconnect-auto.netlify.app"}

# TimeRex予約セッション作成API（実際のプロジェクトIDに置き換え）
[[redirects]]
  from = "/api/timerex-booking"
  to = "https://abcdefghijklmnop.supabase.co/functions/v1/timerex-booking"
  status = 200
  force = true
  headers = {X-Forwarded-Host = "interconnect-auto.netlify.app"}
```

---

## 🧪 STEP 5: 動作テスト

### 5.1 基本機能テスト

#### ① 紹介リンクテスト
1. ブラウザで以下にアクセス：
```
https://interconnect-auto.netlify.app/invite/TEST123
```

2. 開発者ツールを開く（F12）
3. コンソールタブで以下を実行：
```javascript
console.log('紹介コード:', sessionStorage.getItem('referralCode'));
```
4. ✅ "TEST123" と表示されることを確認

#### ② 予約ボタンテスト（ゲストユーザー）
1. `index.html` にアクセス
2. 「無料相談を予約」ボタンをクリック
3. ✅ TimeRexの予約ページがポップアップで開く
4. ✅ URLに `custom_referral_code=TEST123` が含まれている

#### ③ 予約ボタンテスト（ログインユーザー）
1. アカウントでログイン
2. ダッシュボードの予約ボタンをクリック
3. 開発者ツールのNetworkタブを確認
4. ✅ `timerex-booking` Edge Functionが呼ばれている

### 5.2 Edge Function テスト

#### ① 直接テスト
ブラウザコンソールで実行：

```javascript
// Supabaseクライアントが利用可能か確認
console.log('Supabase Client:', window.supabaseClient);

// Edge Function呼び出しテスト
const testBooking = async () => {
  try {
    const response = await window.supabaseClient.functions.invoke('timerex-booking', {
      body: {
        referralCode: 'TEST123',
        userId: 'test-user-id',
        userEmail: 'test@example.com',
        userName: 'テストユーザー'
      }
    });
    console.log('Edge Function レスポンス:', response);
  } catch (error) {
    console.error('Edge Function エラー:', error);
  }
};

testBooking();
```

#### ② 期待される結果
```javascript
{
  data: {
    success: true,
    sessionId: "session_xxx",
    bookingUrl: "https://timerex.jp/book/interconnect-consultation?...",
    fallback: false  // または true
  }
}
```

### 5.3 Webhook テスト

#### ① TimeRexで実際に予約作成
1. TimeRex予約ページで実際に予約を作成
2. 予約完了まで進める

#### ② Webhook受信確認
```bash
# Supabase Edge Function ログ確認
supabase functions logs timerex-webhook --follow
```

#### ③ データベース確認
Supabase SQL Editorで実行：

```sql
-- 予約データが保存されているか確認
SELECT * FROM bookings ORDER BY created_at DESC LIMIT 5;

-- 通知データが作成されているか確認
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;

-- ポイント取引履歴確認
SELECT * FROM point_transactions ORDER BY created_at DESC LIMIT 5;
```

### 5.4 紹介コード自動適用テスト

#### ① 新規アカウント登録
1. 紹介リンクでアクセス: `/invite/TEST123`
2. 新規アカウント登録
3. 登録完了後、以下をSQL Editorで確認：

```sql
-- 紹介情報が記録されているか確認
SELECT * FROM invitations 
WHERE invite_code = 'TEST123' 
ORDER BY created_at DESC;

-- 紹介クリックが記録されているか確認
SELECT * FROM referral_clicks 
WHERE referral_code = 'TEST123' 
ORDER BY created_at DESC;
```

---

## 🚨 トラブルシューティング

### よくある問題と解決方法

#### 問題1: Edge Function が呼べない
**症状:** `supabaseClient.functions.invoke` でエラー
**確認点:**
1. netlify.toml の YOUR_SUPABASE_PROJECT_REF が正しいか
2. Supabase Edge Functions がデプロイされているか
3. 環境変数が正しく設定されているか

**解決方法:**
```bash
# 再デプロイ
supabase functions deploy timerex-booking

# ログ確認
supabase functions logs timerex-booking
```

#### 問題2: Webhook が受信されない
**症状:** TimeRexで予約してもデータベースに記録されない
**確認点:**
1. TimeRex Webhook URL が正しいか
2. シークレットキーが一致しているか
3. SSL証明書が有効か

**解決方法:**
```bash
# Webhook受信ログ確認
supabase functions logs timerex-webhook --follow

# テスト用Webhook送信
curl -X POST https://interconnect-auto.netlify.app/api/timerex-webhook \
  -H "Content-Type: application/json" \
  -H "X-TimeRex-Signature: test" \
  -d '{"type":"booking.created","data":{"id":"test123"}}'
```

#### 問題3: 紹介コードが適用されない
**症状:** 新規登録してもinvitationsテーブルに記録されない
**確認点:**
1. referral-tracking.js が読み込まれているか
2. セッションストレージに紹介コードが保存されているか

**解決方法:**
```javascript
// ブラウザコンソールで確認
console.log('Referral Tracker:', window.referralTracker);
console.log('Referral Code:', window.getReferralCode());
```

#### 問題4: 予約ボタンが動作しない
**症状:** ボタンをクリックしても何も起こらない
**確認点:**
1. ボタンIDが正しいか
2. timerex-booking.js が読み込まれているか
3. エラーがコンソールに出ていないか

**解決方法:**
```javascript
// ブラウザコンソールで確認
console.log('TimeRex Booking:', window.timeRexBooking);

// 手動でイベントリスナー確認
document.getElementById('book-consultation-btn')?.click();
```

---

## 📈 監視・メトリクス

### 重要な指標の確認方法

#### ① 紹介統計の確認
```sql
SELECT * FROM referral_statistics 
ORDER BY link_created_at DESC;
```

#### ② 予約統計の確認
```sql
SELECT * FROM booking_stats 
ORDER BY booking_date DESC;
```

#### ③ エラー監視
```bash
# 定期的にログ確認
supabase functions logs timerex-webhook --follow
supabase functions logs timerex-booking --follow
```

---

## ✅ セットアップ完了チェックリスト

- [ ] データベーステーブル作成完了
- [ ] Edge Functions デプロイ完了
- [ ] TimeRex 予約ページ作成完了
- [ ] TimeRex Webhook 設定完了
- [ ] Netlify 環境変数設定完了
- [ ] netlify.toml 更新完了
- [ ] 紹介リンクテスト成功
- [ ] 予約ボタンテスト成功
- [ ] Edge Function テスト成功
- [ ] Webhook受信テスト成功
- [ ] 紹介コード自動適用テスト成功

**全てにチェックが入れば、システムは完全に稼働可能です！** 🎉