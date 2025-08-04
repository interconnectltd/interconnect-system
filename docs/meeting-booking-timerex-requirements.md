# INTERCONNECT 面談予約システム要件定義書（TimeRex最適化版）

## 1. システム概要

### 1.1 プロジェクト概要
- **システム名**: INTERCONNECT TimeRex連携予約システム
- **目的**: 紹介リンク経由のユーザーがTimeRexを使用して簡単に面談予約を行えるシステム
- **主要機能**: 
  - TimeRex APIによる日程調整
  - 紹介コードの自動連携
  - Webhook経由でのポイント付与
  - シンプルな予約フロー

### 1.2 システム構成
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   フロントエンド   │ ←→ │    Supabase     │ ←→ │   TimeRex API   │
│  (HTML/JS/CSS)   │     │ Edge Functions   │     │  (日程調整)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         ↓                       ↓                       ↓
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  紹介リンク管理   │     │  Webhook受信     │     │  メール通知      │
│   (既存実装)     │     │  ポイント付与     │     │  (TimeRex標準)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 2. TimeRex連携仕様

### 2.1 OAuth認証フロー

```javascript
// TimeRex OAuth設定
const TIMEREX_CONFIG = {
  clientId: process.env.TIMEREX_CLIENT_ID,
  clientSecret: process.env.TIMEREX_CLIENT_SECRET,
  redirectUri: 'https://interconnect-auto.netlify.app/api/timerex/callback',
  scope: 'read write webhook'
};
```

### 2.2 予約ページ設定

```javascript
// TimeRexで作成する予約ページの設定
const bookingPageConfig = {
  // 基本設定
  title: "INTERCONNECT 無料相談予約",
  description: "ビジネスに関する無料相談を承ります",
  duration: 30, // 30分枠
  
  // スタッフ設定（TimeRex管理画面で設定）
  staffMembers: [
    {
      name: "山田太郎",
      title: "シニアコンサルタント",
      expertise: ["起業支援", "資金調達", "マーケティング"]
    },
    {
      name: "鈴木花子",
      title: "ビジネスアドバイザー",
      expertise: ["事業計画", "人材育成", "組織開発"]
    }
  ],
  
  // 営業時間
  businessHours: {
    monday: { start: "09:00", end: "18:00" },
    tuesday: { start: "09:00", end: "18:00" },
    wednesday: { start: "09:00", end: "18:00" },
    thursday: { start: "09:00", end: "18:00" },
    friday: { start: "09:00", end: "18:00" },
    saturday: null, // 休業
    sunday: null    // 休業
  },
  
  // カスタムフィールド（重要）
  customFields: [
    {
      id: "referral_code",
      type: "hidden",
      required: true
    },
    {
      id: "consultation_type",
      type: "select",
      label: "相談内容",
      required: true,
      options: [
        "起業・創業相談",
        "資金調達相談",
        "マーケティング相談",
        "人材・組織相談",
        "その他"
      ]
    },
    {
      id: "consultation_details",
      type: "textarea",
      label: "相談内容の詳細",
      required: false,
      placeholder: "具体的な相談内容をご記入ください"
    }
  ]
};
```

## 3. 実装詳細

### 3.1 予約ボタンの実装

```html
<!-- dashboard.html / referral.html に追加 -->
<button id="book-meeting-btn" class="btn btn-primary">
  <i class="fas fa-calendar-check"></i> 無料相談を予約する
</button>
```

```javascript
// booking-handler.js
document.getElementById('book-meeting-btn').addEventListener('click', async () => {
  // 紹介コードを取得
  const referralCode = getReferralCodeFromSession();
  
  // TimeRex予約URLを生成
  const bookingUrl = await generateTimeRexBookingUrl(referralCode);
  
  // 新しいウィンドウで予約ページを開く
  window.open(bookingUrl, '_blank', 'width=600,height=800');
});

async function generateTimeRexBookingUrl(referralCode) {
  const response = await fetch('/api/booking/create-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getAuthToken()}`
    },
    body: JSON.stringify({
      referralCode: referralCode,
      userId: getCurrentUserId()
    })
  });
  
  const { bookingUrl } = await response.json();
  return bookingUrl;
}
```

### 3.2 Supabase Edge Function

```typescript
// supabase/functions/booking-session/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TIMEREX_API_URL = 'https://api.timerex.jp/v1'
const TIMEREX_API_KEY = Deno.env.get('TIMEREX_API_KEY')

serve(async (req) => {
  const { referralCode, userId } = await req.json()
  
  // TimeRexの予約セッションを作成
  const sessionResponse = await fetch(`${TIMEREX_API_URL}/booking-sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TIMEREX_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      bookingPageId: Deno.env.get('TIMEREX_BOOKING_PAGE_ID'),
      customFields: {
        referral_code: referralCode
      },
      metadata: {
        userId: userId,
        source: 'interconnect'
      }
    })
  })
  
  const session = await sessionResponse.json()
  
  // セッション情報をDBに保存
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  )
  
  await supabase.from('booking_sessions').insert({
    session_id: session.id,
    user_id: userId,
    referral_code: referralCode,
    status: 'pending',
    created_at: new Date().toISOString()
  })
  
  return new Response(
    JSON.stringify({ bookingUrl: session.bookingUrl }),
    { headers: { "Content-Type": "application/json" } }
  )
})
```

### 3.3 Webhook処理

```typescript
// supabase/functions/timerex-webhook/index.ts
serve(async (req) => {
  // TimeRexからのWebhook署名を検証
  const signature = req.headers.get('X-TimeRex-Signature')
  if (!verifyWebhookSignature(req.body, signature)) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const event = await req.json()
  
  switch (event.type) {
    case 'booking.created':
      await handleBookingCreated(event.data)
      break
    case 'booking.cancelled':
      await handleBookingCancelled(event.data)
      break
    case 'booking.completed':
      await handleBookingCompleted(event.data)
      break
  }
  
  return new Response('OK', { status: 200 })
})

async function handleBookingCreated(booking) {
  const supabase = createClient(...)
  
  // 予約情報を保存
  await supabase.from('bookings').insert({
    id: booking.id,
    session_id: booking.sessionId,
    user_email: booking.customerEmail,
    staff_name: booking.staffName,
    scheduled_at: booking.scheduledAt,
    referral_code: booking.customFields.referral_code,
    consultation_type: booking.customFields.consultation_type,
    status: 'confirmed'
  })
  
  // 紹介者への通知
  const referrer = await getReferrerByCode(booking.customFields.referral_code)
  if (referrer) {
    await notifyReferrer(referrer.id, {
      type: 'booking_created',
      referredUserEmail: booking.customerEmail,
      scheduledAt: booking.scheduledAt
    })
  }
}

async function handleBookingCompleted(booking) {
  // 面談完了後のポイント付与
  const referrer = await getReferrerByCode(booking.customFields.referral_code)
  if (referrer) {
    await awardPoints(referrer.id, 1000, 'referral_meeting_completed')
  }
}
```

## 4. データベース設計（簡略化版）

### 4.1 必要なテーブル

```sql
-- 予約セッション管理
CREATE TABLE booking_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(255) UNIQUE NOT NULL, -- TimeRexのセッションID
  user_id UUID REFERENCES auth.users(id),
  referral_code VARCHAR(20),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 予約情報（TimeRexから同期）
CREATE TABLE bookings (
  id VARCHAR(255) PRIMARY KEY, -- TimeRexの予約ID
  session_id VARCHAR(255) REFERENCES booking_sessions(session_id),
  user_email VARCHAR(255) NOT NULL,
  staff_name VARCHAR(255),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  referral_code VARCHAR(20),
  consultation_type VARCHAR(100),
  consultation_details TEXT,
  status VARCHAR(50) DEFAULT 'confirmed',
  meeting_url TEXT, -- TimeRexが生成するオンライン会議URL
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 既存のinvitationsテーブルと連携
ALTER TABLE invitations 
ADD COLUMN booking_id VARCHAR(255) REFERENCES bookings(id);
```

## 5. UI/UX実装

### 5.1 予約ボタンの配置

```html
<!-- ダッシュボード -->
<div class="quick-actions">
  <button class="action-btn book-meeting">
    <i class="fas fa-calendar-check"></i>
    <span>無料相談を予約</span>
    <small>30分のオンライン相談</small>
  </button>
</div>

<!-- 紹介ページ -->
<div class="referral-cta">
  <h3>紹介した方も特典があります！</h3>
  <p>紹介した方が面談を完了すると、1,000ポイントを獲得できます。</p>
  <button class="btn btn-primary book-meeting">
    <i class="fas fa-calendar-plus"></i>
    まずは自分が相談してみる
  </button>
</div>
```

### 5.2 予約確認画面

```javascript
// 予約完了後の処理
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://timerex.jp') return;
  
  if (event.data.type === 'booking_completed') {
    // 予約完了モーダルを表示
    showBookingConfirmation({
      date: event.data.scheduledAt,
      staff: event.data.staffName,
      meetingUrl: event.data.meetingUrl
    });
    
    // 予約情報をローカルに保存
    saveBookingToLocal(event.data);
  }
});
```

## 6. 実装スケジュール

### Phase 1: TimeRex設定（3日）
- [ ] TimeRexアカウント作成・API取得
- [ ] 予約ページの作成・カスタマイズ
- [ ] Webhook URLの設定

### Phase 2: 基本実装（1週間）
- [ ] 予約ボタンのUI実装
- [ ] Edge Functionsの実装
- [ ] Webhook受信処理

### Phase 3: 連携テスト（3日）
- [ ] 紹介コードの受け渡しテスト
- [ ] ポイント付与の動作確認
- [ ] エラーハンドリング

### Phase 4: 本番デプロイ（2日）
- [ ] 本番環境の設定
- [ ] スタッフトレーニング
- [ ] 運用マニュアル作成

## 7. コスト

### 初期費用
- TimeRex: **0円**（フリープラン）
- 開発工数: 約2週間

### 運用費用（月額）
- TimeRex: **0円**（月100件まで無料）
- 将来的な拡張時: **750円/月**（ベーシックプラン）

## 8. メリット

1. **開発期間の大幅短縮**
   - 複雑な日程調整ロジック不要
   - UIも提供される

2. **安定性**
   - TimeRexが日程調整を管理
   - タイムゾーン問題も自動解決

3. **拡張性**
   - 必要に応じて有料プランへ
   - APIで機能追加可能

## 9. 制限事項と対策

### フリープランの制限
- API連携: 1つまで → **INTERCONNECTのみなら問題なし**
- 月間予約数: 100件まで → **初期は十分、超えたら有料プランへ**
- カスタムフィールド: 3つまで → **必要最小限で設計済み**

### 対策
- 予約数が増えたら自動的にベーシックプランへアップグレード
- 将来的により高度な機能が必要になったら、Google Calendar APIへの移行を検討

---

この要件定義書に基づいて実装することで、2週間以内に安定した面談予約システムを構築できます。