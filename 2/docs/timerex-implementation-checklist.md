# TimeRex実装チェックリスト

## 🚀 クイックスタートガイド

### Step 1: TimeRexアカウント設定（30分）

1. **アカウント作成**
   ```
   https://timerex.jp/signup
   → メールアドレスで登録
   → フリープランを選択
   ```

2. **API認証情報取得**
   ```
   設定 → API → 新規アプリケーション作成
   - アプリ名: INTERCONNECT
   - リダイレクトURI: https://interconnect-auto.netlify.app/api/timerex/callback
   - 権限: read, write, webhook
   ```

3. **環境変数設定**
   ```env
   TIMEREX_CLIENT_ID=your_client_id
   TIMEREX_CLIENT_SECRET=your_client_secret
   TIMEREX_WEBHOOK_SECRET=your_webhook_secret
   ```

### Step 2: 予約ページ作成（30分）

1. **TimeRex管理画面で予約ページ作成**
   ```
   予約ページ → 新規作成
   ```

2. **基本設定**
   - ページ名: INTERCONNECT無料相談
   - URL: interconnect-consultation
   - 予約時間: 30分
   - バッファ時間: 15分

3. **カスタムフィールド追加**
   ```
   フィールド1:
   - ID: referral_code
   - タイプ: 非表示
   - 必須: はい
   
   フィールド2:
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

### Step 3: コード実装

#### 3.1 予約ボタン追加
```html
<!-- dashboard.htmlの適切な場所に追加 -->
<div class="booking-section">
  <button id="book-consultation" class="btn btn-primary">
    <i class="fas fa-calendar-check"></i>
    無料相談を予約する
  </button>
</div>
```

#### 3.2 JavaScript実装
```javascript
// js/timerex-booking.js
class TimeRexBooking {
  constructor() {
    this.baseUrl = 'https://timerex.jp';
    this.pageId = 'interconnect-consultation';
    this.initializeBookingButton();
  }
  
  initializeBookingButton() {
    const bookBtn = document.getElementById('book-consultation');
    if (bookBtn) {
      bookBtn.addEventListener('click', () => this.startBooking());
    }
  }
  
  async startBooking() {
    try {
      // 現在のユーザー情報を取得
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        showNotification('ログインが必要です', 'error');
        return;
      }
      
      // 紹介コードを取得（セッションまたはURLパラメータから）
      const referralCode = this.getReferralCode();
      
      // TimeRex予約URLを構築
      const bookingUrl = this.buildBookingUrl(user, referralCode);
      
      // ポップアップで開く
      const popup = window.open(
        bookingUrl, 
        'timerex-booking',
        'width=600,height=700,left=100,top=100'
      );
      
      // 予約完了を監視
      this.watchBookingCompletion(popup);
      
    } catch (error) {
      console.error('予約エラー:', error);
      showNotification('予約ページを開けませんでした', 'error');
    }
  }
  
  getReferralCode() {
    // 優先順位: URLパラメータ → セッション → デフォルト
    const urlParams = new URLSearchParams(window.location.search);
    const urlRef = urlParams.get('ref');
    if (urlRef) return urlRef;
    
    const sessionRef = sessionStorage.getItem('referralCode');
    if (sessionRef) return sessionRef;
    
    return 'DIRECT'; // 直接アクセスの場合
  }
  
  buildBookingUrl(user, referralCode) {
    const params = new URLSearchParams({
      name: user.user_metadata?.name || '',
      email: user.email,
      referral_code: referralCode,
      user_id: user.id
    });
    
    return `${this.baseUrl}/book/${this.pageId}?${params.toString()}`;
  }
  
  watchBookingCompletion(popup) {
    // postMessageで予約完了を受信
    const messageHandler = (event) => {
      if (event.origin !== this.baseUrl) return;
      
      if (event.data.type === 'booking_completed') {
        this.handleBookingCompleted(event.data);
        window.removeEventListener('message', messageHandler);
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // ポップアップが閉じられた場合の処理
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
      }
    }, 1000);
  }
  
  async handleBookingCompleted(data) {
    console.log('予約完了:', data);
    
    // 予約完了通知
    showNotification('予約が完了しました！確認メールをご確認ください。', 'success');
    
    // ローカルに予約情報を保存
    const booking = {
      id: data.bookingId,
      date: data.scheduledDate,
      time: data.scheduledTime,
      staff: data.staffName,
      type: data.consultationType
    };
    
    localStorage.setItem('latestBooking', JSON.stringify(booking));
    
    // 予約確認モーダルを表示
    this.showBookingConfirmation(booking);
  }
  
  showBookingConfirmation(booking) {
    const modal = document.createElement('div');
    modal.className = 'booking-confirmation-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3><i class="fas fa-check-circle"></i> 予約が完了しました</h3>
        <div class="booking-details">
          <p><strong>日時:</strong> ${booking.date} ${booking.time}</p>
          <p><strong>担当:</strong> ${booking.staff}</p>
          <p><strong>相談内容:</strong> ${booking.type}</p>
        </div>
        <p class="note">
          予約確認メールをお送りしました。<br>
          当日はメールに記載のURLからご参加ください。
        </p>
        <button class="btn btn-primary" onclick="this.closest('.booking-confirmation-modal').remove()">
          閉じる
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  window.timeRexBooking = new TimeRexBooking();
});
```

#### 3.3 Supabase Edge Function（Webhook受信）
```typescript
// supabase/functions/timerex-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

serve(async (req) => {
  // 署名検証
  const signature = req.headers.get('X-TimeRex-Signature')
  const body = await req.text()
  
  const expectedSignature = createHmac('sha256', Deno.env.get('TIMEREX_WEBHOOK_SECRET'))
    .update(body)
    .digest('hex')
  
  if (signature !== expectedSignature) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const event = JSON.parse(body)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  )
  
  switch (event.type) {
    case 'booking.created':
      // 予約作成時の処理
      await handleBookingCreated(supabase, event.data)
      break
      
    case 'booking.completed':
      // 面談完了時の処理（ポイント付与）
      await handleBookingCompleted(supabase, event.data)
      break
      
    case 'booking.cancelled':
      // キャンセル時の処理
      await handleBookingCancelled(supabase, event.data)
      break
  }
  
  return new Response('OK', { status: 200 })
})

async function handleBookingCreated(supabase, booking) {
  // 予約情報を保存
  const { error } = await supabase.from('bookings').insert({
    timerex_id: booking.id,
    user_email: booking.customer.email,
    staff_name: booking.staff.name,
    scheduled_at: booking.scheduledAt,
    referral_code: booking.customFields.referral_code,
    consultation_type: booking.customFields.consultation_type,
    status: 'confirmed'
  })
  
  if (error) {
    console.error('予約保存エラー:', error)
    return
  }
  
  // 紹介者に通知
  if (booking.customFields.referral_code !== 'DIRECT') {
    await notifyReferrer(supabase, booking.customFields.referral_code, {
      type: 'booking_created',
      message: `${booking.customer.email}さんが面談を予約しました`
    })
  }
}

async function handleBookingCompleted(supabase, booking) {
  // 面談完了をマーク
  await supabase.from('bookings')
    .update({ 
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('timerex_id', booking.id)
  
  // 紹介ポイントを付与
  if (booking.customFields.referral_code !== 'DIRECT') {
    const { data: invitation } = await supabase
      .from('invitations')
      .select('inviter_id')
      .eq('invite_code', booking.customFields.referral_code)
      .single()
    
    if (invitation) {
      // 1000ポイント付与
      await supabase.rpc('add_referral_points', {
        user_id: invitation.inviter_id,
        points: 1000,
        reason: 'referral_meeting_completed'
      })
    }
  }
}
```

### Step 4: スタイル追加

```css
/* css/timerex-booking.css */
.booking-section {
  margin: 2rem 0;
  text-align: center;
}

#book-consultation {
  font-size: 1.1rem;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  color: white;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

#book-consultation:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

/* 予約確認モーダル */
.booking-confirmation-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.booking-confirmation-modal .modal-content {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.booking-confirmation-modal h3 {
  color: #10b981;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.booking-details {
  background: #f8fbff;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.booking-details p {
  margin: 0.5rem 0;
}

.note {
  color: #64748b;
  font-size: 0.9rem;
  margin: 1rem 0;
}
```

### Step 5: デプロイ前チェックリスト

- [ ] TimeRexでスタッフアカウント作成済み
- [ ] 営業時間・休日設定完了
- [ ] カスタムフィールド設定完了
- [ ] Webhook URL設定（Supabase Edge Function URL）
- [ ] 環境変数設定完了
- [ ] テスト予約実施
- [ ] ポイント付与動作確認

## トラブルシューティング

### よくある問題

1. **予約ページが開かない**
   - TimeRexのページIDが正しいか確認
   - ポップアップブロッカーを無効化

2. **Webhookが受信されない**
   - Webhook URLがhttpsか確認
   - 署名検証のシークレットキーを確認

3. **ポイントが付与されない**
   - referral_codeが正しく渡されているか確認
   - invitationsテーブルにデータがあるか確認

---

この実装により、2週間以内に完全に動作する予約システムが構築できます。