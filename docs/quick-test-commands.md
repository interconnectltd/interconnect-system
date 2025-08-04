# 🧪 クイックテストコマンド集

## ブラウザコンソールで実行するテストコマンド

### 1. 紹介コード確認
```javascript
// 現在の紹介コードを確認
console.log('Session紹介コード:', sessionStorage.getItem('referralCode'));
console.log('Local紹介コード:', localStorage.getItem('referralCode'));
console.log('現在の紹介コード:', window.getReferralCode?.() || 'function not found');
```

### 2. Supabaseクライアント確認
```javascript
// Supabaseクライアントの状態確認
console.log('Supabase Client:', window.supabaseClient);
console.log('Auth State:', window.supabaseClient?.auth.getUser());
```

### 3. Edge Function直接テスト
```javascript
// TimeRex予約セッション作成テスト
const testEdgeFunction = async () => {
  try {
    console.log('Edge Function テスト開始...');
    const response = await window.supabaseClient.functions.invoke('timerex-booking', {
      body: {
        referralCode: 'TEST123',
        userId: 'test-user-id',
        userEmail: 'test@example.com',
        userName: 'テストユーザー'
      }
    });
    console.log('✅ Edge Function 成功:', response);
    return response;
  } catch (error) {
    console.error('❌ Edge Function エラー:', error);
    return error;
  }
};

testEdgeFunction();
```

### 4. 予約ボタン動作確認
```javascript
// 予約システムの状態確認
console.log('TimeRex Booking System:', window.timeRexBooking);

// 手動で予約プロセス開始
if (window.timeRexBooking) {
  window.timeRexBooking.startBooking();
} else {
  console.error('TimeRex Booking System が初期化されていません');
}
```

### 5. 紹介追跡システム確認
```javascript
// 紹介追跡システムの状態
console.log('Referral Tracker:', window.referralTracker);

// 現在のページで紹介コード処理
if (window.referralTracker) {
  window.referralTracker.processReferralCode();
}

// 紹介データをクリア（テスト用）
// window.referralTracker?.clearReferralData();
```

---

## SQLクエリ（Supabase SQL Editorで実行）

### 1. テーブル確認
```sql
-- 全テーブル一覧
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### 2. 予約データ確認
```sql
-- 最新の予約5件
SELECT * FROM bookings 
ORDER BY created_at DESC 
LIMIT 5;

-- 予約統計
SELECT 
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN referral_code != 'DIRECT' THEN 1 END) as referred_count
FROM bookings 
GROUP BY status;
```

### 3. 紹介データ確認
```sql
-- 紹介リンクと統計
SELECT * FROM referral_statistics 
ORDER BY link_created_at DESC;

-- 最新の紹介クリック
SELECT * FROM referral_clicks 
ORDER BY clicked_at DESC 
LIMIT 10;

-- 紹介による登録
SELECT * FROM invitations 
WHERE invite_code != 'DIRECT' 
ORDER BY created_at DESC;
```

### 4. ポイント取引確認
```sql
-- 最新のポイント取引
SELECT 
  pt.*,
  p.email as user_email,
  p.referral_points as current_points
FROM point_transactions pt
LEFT JOIN profiles p ON p.id = pt.user_id
ORDER BY pt.created_at DESC 
LIMIT 10;
```

### 5. 通知確認
```sql
-- 最新の通知
SELECT 
  n.*,
  p.email as user_email
FROM notifications n
LEFT JOIN profiles p ON p.id = n.user_id
ORDER BY n.created_at DESC 
LIMIT 10;
```

---

## Bash/Terminalコマンド

### 1. Supabase Functions管理
```bash
# Function一覧
supabase functions list

# 特定のFunctionのログ監視
supabase functions logs timerex-webhook --follow
supabase functions logs timerex-booking --follow

# Functionの再デプロイ
supabase functions deploy timerex-webhook
supabase functions deploy timerex-booking

# 環境変数確認
supabase secrets list

# 環境変数設定
supabase secrets set TIMEREX_API_KEY=your_api_key_here
```

### 2. Netlify Functions確認
```bash
# Netlify Functions ログ
netlify functions:logs

# ローカル開発サーバー起動
netlify dev
```

### 3. Webhook テスト用cURL
```bash
# TimeRex Webhook受信テスト
curl -X POST https://interconnect-auto.netlify.app/api/timerex-webhook \
  -H "Content-Type: application/json" \
  -H "X-TimeRex-Signature: test-signature" \
  -d '{
    "type": "booking.created",
    "data": {
      "id": "test-booking-123",
      "customer": {
        "email": "test@example.com",
        "name": "テストユーザー"
      },
      "staff": {
        "name": "INTERCONNECT担当者"
      },
      "scheduledAt": "2024-01-20T10:00:00Z",
      "customFields": {
        "referral_code": "TEST123",
        "consultation_type": "起業・創業相談"
      }
    }
  }'

# 予約セッション作成テスト
curl -X POST https://interconnect-auto.netlify.app/api/timerex-booking \
  -H "Content-Type: application/json" \
  -d '{
    "referralCode": "TEST123",
    "userId": "test-user-id",
    "userEmail": "test@example.com",
    "userName": "テストユーザー"
  }'
```

---

## デバッグ用URLパラメータ

### 1. 紹介コード付きでアクセス
```
https://interconnect-auto.netlify.app/invite/TEST123
https://interconnect-auto.netlify.app/book-consultation.html?ref=TEST123
https://interconnect-auto.netlify.app/dashboard.html?ref=SPECIAL456
```

### 2. デバッグモード有効
```
https://interconnect-auto.netlify.app/dashboard.html?debug=true
https://interconnect-auto.netlify.app/referral.html?debug=true&ref=DEBUG789
```

---

## エラー診断チェックリスト

### ❌ 予約ボタンが動かない場合
```javascript
// 1. ボタン要素の確認
console.log('Dashboard Button:', document.getElementById('book-consultation-btn'));
console.log('Referral Button:', document.getElementById('book-referral-btn'));

// 2. イベントリスナーの確認
console.log('TimeRex Booking Instance:', window.timeRexBooking);

// 3. エラーの確認
window.addEventListener('error', (e) => {
  console.error('Global Error:', e.error);
});
```

### ❌ Edge Function エラーの場合
```javascript
// 詳細なエラー情報を取得
const debugEdgeFunction = async () => {
  try {
    const response = await fetch('https://interconnect-auto.netlify.app/api/timerex-booking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        referralCode: 'TEST123',
        userId: 'test-user-id',
        userEmail: 'test@example.com',
        userName: 'テストユーザー'
      })
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', [...response.headers.entries()]);
    
    const text = await response.text();
    console.log('Response Text:', text);
    
    try {
      const json = JSON.parse(text);
      console.log('Response JSON:', json);
    } catch (e) {
      console.log('Response is not JSON');
    }
  } catch (error) {
    console.error('Fetch Error:', error);
  }
};

debugEdgeFunction();
```

### ❌ 紹介コードが保存されない場合
```javascript
// セッションストレージの状態確認
console.log('SessionStorage 全体:', {...sessionStorage});
console.log('LocalStorage 全体:', {...localStorage});

// URLパラメータの確認
const urlParams = new URLSearchParams(window.location.search);
console.log('URL Parameters:', [...urlParams.entries()]);

// 手動で紹介コード設定
sessionStorage.setItem('referralCode', 'MANUAL_TEST');
localStorage.setItem('referralCode', 'MANUAL_TEST');
```

---

## 成功時の期待値

### ✅ 正常な動作時のコンソール出力例
```
紹介コード（URL）: TEST123
TimeRex Booking System: TimeRexBooking {baseUrl: "https://timerex.jp", pageId: "interconnect-consultation"}
Edge Function成功: {success: true, sessionId: "session_xyz", bookingUrl: "https://timerex.jp/book/interconnect-consultation?..."}
予約が完了しました: {bookingId: "booking_abc", scheduledDate: "2024-01-20", scheduledTime: "10:00"}
```

### ✅ データベースに正しく保存された場合
```sql
-- bookings テーブル
id: booking_abc
user_email: test@example.com
referral_code: TEST123
status: confirmed

-- notifications テーブル
type: booking_created
title: 紹介による予約が入りました
user_id: [referrer_id]

-- point_transactions テーブル
points: 1000
reason: referral_meeting_completed
referral_code: TEST123
```

この詳細ガイドで、システムの完全な動作確認とデバッグが可能です！