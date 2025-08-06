// Google Calendar予約システムハンドラー（TimeRex代替案）
class GoogleCalendarBooking {
  constructor() {
    this.calendarId = 'interconnect.consultation@gmail.com'; // INTERCONNECTの相談用カレンダー
    this.initializeBookingButton();
  }
  
  initializeBookingButton() {
    // ダッシュボードの予約ボタン
    const dashboardBtn = document.getElementById('book-consultation-btn');
    if (dashboardBtn) {
      dashboardBtn.addEventListener('click', () => this.startBooking());
    }
    
    // 紹介ページの予約ボタン
    const referralBtn = document.getElementById('book-referral-btn');
    if (referralBtn) {
      referralBtn.addEventListener('click', () => this.startBooking());
    }
    
    // 予約ページの予約ボタン
    const bookingPageBtn = document.getElementById('open-booking-btn');
    if (bookingPageBtn) {
      bookingPageBtn.addEventListener('click', () => this.startBooking());
    }
    
    // 旧IDとの互換性も保持
    const oldReferralBtn = document.getElementById('book-consultation-btn');
    if (oldReferralBtn && !document.getElementById('book-referral-btn')) {
      oldReferralBtn.addEventListener('click', () => this.startBooking());
    }
  }
  
  async startBooking() {
    try {
      // 紹介コードを取得
      const referralCode = this.getReferralCode();
      
      // Google Calendarの予約リンクを生成
      const bookingUrl = this.createGoogleCalendarUrl(referralCode);
      
      // 新しいタブで開く
      const newTab = window.open(bookingUrl, '_blank');
      
      if (!newTab) {
        if (typeof showNotification !== 'undefined') {
          showNotification('ポップアップがブロックされました。ブラウザの設定を確認してください。', 'error');
        }
        // フォールバック：現在のウィンドウで開く
        window.location.href = bookingUrl;
        return;
      }
      
      if (typeof showNotification !== 'undefined') {
        showNotification('予約ページを開いています...', 'info');
      }
      
      // データベースに予約意図を記録
      this.recordBookingIntent(referralCode);
      
    } catch (error) {
      console.error('予約エラー:', error);
      if (typeof showNotification !== 'undefined') {
        showNotification('予約ページを開けませんでした', 'error');
      }
    }
  }
  
  getReferralCode() {
    // 優先順位: URLパラメータ → セッション → ローカルストレージ → デフォルト
    const urlParams = new URLSearchParams(window.location.search);
    const urlRef = urlParams.get('ref');
    if (urlRef) {
      console.log('紹介コード（URL）:', urlRef);
      return urlRef;
    }
    
    const sessionRef = sessionStorage.getItem('referralCode');
    if (sessionRef) {
      console.log('紹介コード（セッション）:', sessionRef);
      return sessionRef;
    }
    
    const localRef = localStorage.getItem('referralCode');
    if (localRef) {
      console.log('紹介コード（ローカル）:', localRef);
      return localRef;
    }
    
    console.log('紹介コード（直接アクセス）');
    return 'DIRECT';
  }
  
  createGoogleCalendarUrl(referralCode) {
    // 現在の日時から1週間後を提案
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    startDate.setHours(10, 0, 0, 0); // 午前10時に設定
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 30); // 30分間
    
    // イベントの詳細
    const eventDetails = {
      text: 'INTERCONNECT 無料相談',
      dates: `${this.formatDateForGoogle(startDate)}/${this.formatDateForGoogle(endDate)}`,
      details: `INTERCONNECTの無料相談です。

ビジネスに関するご相談を承ります：
- 起業・創業相談
- 資金調達相談
- マーケティング相談
- 人材・組織相談
- 業務改善・DX相談

紹介コード: ${referralCode}

※実際の日時は調整させていただきます。
※オンライン（Google Meet）での実施となります。`,
      location: 'オンライン（Google Meet）',
      // ゲストを自動的に追加（相談担当者のメール）
      add: this.calendarId
    };
    
    // Google CalendarのURLを構築
    const baseUrl = 'https://calendar.google.com/calendar/render';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: eventDetails.text,
      dates: eventDetails.dates,
      details: eventDetails.details,
      location: eventDetails.location,
      add: eventDetails.add
    });
    
    return `${baseUrl}?${params.toString()}`;
  }
  
  formatDateForGoogle(date) {
    // GoogleカレンダーのフォーマットYYYYMMDDTHHMMSSZ (UTC)
    const utcDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    const year = utcDate.getFullYear();
    const month = String(utcDate.getMonth() + 1).padStart(2, '0');
    const day = String(utcDate.getDate()).padStart(2, '0');
    const hours = String(utcDate.getHours()).padStart(2, '0');
    const minutes = String(utcDate.getMinutes()).padStart(2, '0');
    const seconds = '00';
    
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }
  
  async recordBookingIntent(referralCode) {
    // Supabaseが利用可能な場合は予約意図を記録
    if (window.supabaseClient) {
      try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        
        if (user) {
          const { error } = await window.supabaseClient
            .from('booking_intents')
            .insert({
              user_id: user.id,
              referral_code: referralCode,
              booking_method: 'google_calendar',
              created_at: new Date().toISOString()
            });
          
          if (error) {
            console.error('予約意図の記録エラー:', error);
          } else {
            console.log('予約意図を記録しました');
          }
        }
      } catch (error) {
        console.error('予約意図記録エラー:', error);
      }
    }
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  window.googleCalendarBooking = new GoogleCalendarBooking();
});

// 通知表示関数（既存の関数がない場合の実装）
if (typeof showNotification === 'undefined') {
  window.showNotification = function(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // アニメーション
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // 自動的に削除
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  };
}