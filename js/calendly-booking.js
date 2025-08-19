// Calendly予約システムハンドラー（TimeRex代替案）
class CalendlyBooking {
  constructor() {
    // Calendlyの予約ページURL（後で実際のURLに置き換え）
    this.calendlyUrl = 'https://calendly.com/interconnect-consultation/30min';
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
      
      // Calendlyの埋め込みモーダルを表示
      if (window.Calendly) {
        this.showCalendlyModal(referralCode);
      } else {
        // Calendly SDKが読み込まれていない場合は直接開く
        const bookingUrl = `${this.calendlyUrl}?a1=${referralCode}`;
        window.open(bookingUrl, '_blank');
        
        if (typeof showNotification !== 'undefined') {
          showNotification('予約ページを開いています...', 'info');
        }
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
      // console.log('紹介コード（URL）:', urlRef);
      return urlRef;
    }
    
    const sessionRef = sessionStorage.getItem('referralCode');
    if (sessionRef) {
      // console.log('紹介コード（セッション）:', sessionRef);
      return sessionRef;
    }
    
    const localRef = localStorage.getItem('referralCode');
    if (localRef) {
      // console.log('紹介コード（ローカル）:', localRef);
      return localRef;
    }
    
    // console.log('紹介コード（直接アクセス）');
    return 'DIRECT';
  }
  
  showCalendlyModal(referralCode) {
    // Calendlyのポップアップウィジェットを表示
    Calendly.initPopupWidget({
      url: this.calendlyUrl,
      prefill: {
        customAnswers: {
          a1: referralCode // 紹介コードをカスタム回答として渡す
        }
      },
      utm: {
        utmSource: 'interconnect',
        utmMedium: 'web',
        utmCampaign: 'consultation'
      }
    });
    
    if (typeof showNotification !== 'undefined') {
      showNotification('予約フォームを表示しています...', 'info');
    }
  }
  
  async recordBookingIntent(referralCode) {
    // Supabaseが利用可能な場合は予約意図を記録
    if (window.supabaseClient) {
      try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        
        if (user) {
          const { error } = await window.supabase
            .from('booking_intents')
            .insert({
              user_id: user.id,
              referral_code: referralCode,
              booking_method: 'calendly',
              created_at: new Date().toISOString()
            });
          
          if (error) {
            console.error('予約意図の記録エラー:', error);
          } else {
            // console.log('予約意図を記録しました');
          }
        }
      } catch (error) {
        console.error('予約意図記録エラー:', error);
      }
    }
  }
}

// Calendly SDKを動的に読み込む
function loadCalendlySDK() {
  if (!document.getElementById('calendly-sdk')) {
    const script = document.createElement('script');
    script.id = 'calendly-sdk';
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.head.appendChild(script);
    
    // Calendly用のCSSも読み込む
    const link = document.createElement('link');
    link.href = 'https://assets.calendly.com/assets/external/widget.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  // Calendly SDKを読み込む
  loadCalendlySDK();
  
  // 予約ハンドラーを初期化
  window.calendlyBooking = new CalendlyBooking();
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