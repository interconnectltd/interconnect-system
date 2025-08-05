// TimeRex予約システムハンドラー（URL長さ問題修正版）
class TimeRexBooking {
  constructor() {
    this.baseUrl = 'https://timerex.jp';
    this.pageId = 'interconnect-consultation'; // TimeRexで作成する予約ページID
    this.initializeBookingButton();
  }
  
  initializeBookingButton() {
    // ダッシュボードの予約ボタン
    const dashboardBtn = document.getElementById('book-consultation-btn');
    if (dashboardBtn) {
      dashboardBtn.addEventListener('click', () => this.startBooking());
    }
    
    // 紹介ページの予約ボタン（IDを修正）
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
      
      // URLパラメータを最小限に
      const params = new URLSearchParams();
      
      // 紹介コードのみを含める（短い形式で）
      if (referralCode && referralCode !== 'DIRECT') {
        params.set('ref', referralCode);
      }
      
      // TimeRex予約ページのシンプルなURL
      const bookingUrl = `${this.baseUrl}/book/${this.pageId}${params.toString() ? '?' + params.toString() : ''}`;
      
      console.log('簡略化された予約URL:', bookingUrl);
      
      // Edge Functionを使わずに直接開く
      this.openBookingWindow(bookingUrl);
      
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
    return 'DIRECT'; // 直接アクセスの場合
  }
  
  openBookingWindow(bookingUrl) {
    // 新しいタブで開く（シンプルに）
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
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  window.timeRexBooking = new TimeRexBooking();
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