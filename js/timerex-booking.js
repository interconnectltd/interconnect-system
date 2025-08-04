// TimeRex予約システムハンドラー
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
      // 現在のユーザー情報を取得（ログインしていない場合はゲストとして処理）
      const { data: { user } } = await window.supabaseClient.auth.getUser().catch(() => ({ data: { user: null } }));
      
      // 紹介コードを取得
      const referralCode = this.getReferralCode();
      
      let bookingUrl;
      
      // ログインユーザーの場合はEdge Functionを使用
      if (user && window.supabaseClient) {
        try {
          showNotification('予約ページを準備中...', 'info');
          
          const response = await window.supabaseClient.functions.invoke('timerex-booking', {
            body: {
              referralCode: referralCode,
              userId: user.id,
              userEmail: user.email,
              userName: user.user_metadata?.name || user.user_metadata?.full_name || ''
            }
          });
          
          if (response.error) {
            console.error('Edge Function error:', response.error);
            throw new Error('予約セッションの作成に失敗しました');
          }
          
          bookingUrl = response.data.bookingUrl;
          console.log('Edge Function成功:', response.data);
          
        } catch (edgeFunctionError) {
          console.error('Edge Function失敗、フォールバックを使用:', edgeFunctionError);
          // フォールバック：直接TimeRexのURLを使用
          bookingUrl = this.buildFallbackUrl(user, referralCode);
        }
      } else {
        // ゲストユーザーまたはログイン機能が利用できない場合
        bookingUrl = this.buildFallbackUrl(null, referralCode);
      }
      
      // ポップアップで開く
      const popup = window.open(
        bookingUrl, 
        'timerex-booking',
        'width=600,height=700,left=100,top=100'
      );
      
      if (!popup) {
        showNotification('ポップアップがブロックされました。ブラウザの設定を確認してください。', 'error');
        return;
      }
      
      // 予約完了を監視
      this.watchBookingCompletion(popup);
      
    } catch (error) {
      console.error('予約エラー:', error);
      showNotification('予約ページを開けませんでした', 'error');
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
  
  buildFallbackUrl(user, referralCode) {
    // フォールバック用のTimeRex URLを生成
    const params = new URLSearchParams({
      // 基本情報（ユーザーがいる場合のみ）
      name: user?.user_metadata?.name || user?.user_metadata?.full_name || '',
      email: user?.email || '',
      
      // カスタムフィールド（TimeRexで設定したフィールドID）
      'custom_referral_code': referralCode,
      'custom_user_id': user?.id || '',
      
      // その他のメタデータ
      source: 'interconnect',
      timestamp: new Date().toISOString()
    });
    
    // TimeRex予約ページのURL
    const url = `${this.baseUrl}/book/${this.pageId}?${params.toString()}`;
    console.log('フォールバック予約URL:', url);
    return url;
  }
  
  watchBookingCompletion(popup) {
    // postMessageで予約完了を受信
    const messageHandler = (event) => {
      // TimeRexからのメッセージのみ処理
      if (event.origin !== this.baseUrl) return;
      
      console.log('TimeRexからのメッセージ:', event.data);
      
      if (event.data.type === 'booking_completed') {
        this.handleBookingCompleted(event.data);
        window.removeEventListener('message', messageHandler);
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // ポップアップが閉じられた場合の処理
    const checkClosed = setInterval(() => {
      if (popup && popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        console.log('予約ウィンドウが閉じられました');
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
      type: data.consultationType || '無料相談',
      referralCode: data.customFields?.referral_code || 'DIRECT',
      createdAt: new Date().toISOString()
    };
    
    // 最新の予約を保存
    localStorage.setItem('latestBooking', JSON.stringify(booking));
    
    // 予約履歴に追加
    const bookingHistory = JSON.parse(localStorage.getItem('bookingHistory') || '[]');
    bookingHistory.unshift(booking);
    // 最大10件まで保存
    if (bookingHistory.length > 10) {
      bookingHistory.pop();
    }
    localStorage.setItem('bookingHistory', JSON.stringify(bookingHistory));
    
    // 予約確認モーダルを表示
    this.showBookingConfirmation(booking);
    
    // ダッシュボードの場合は予約情報を更新
    if (window.location.pathname.includes('dashboard')) {
      this.updateDashboardBookingInfo(booking);
    }
  }
  
  showBookingConfirmation(booking) {
    // 既存のモーダルがあれば削除
    const existingModal = document.querySelector('.booking-confirmation-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'booking-confirmation-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="fas fa-check-circle"></i> 予約が完了しました</h3>
          <button class="close-btn" onclick="this.closest('.booking-confirmation-modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="booking-details">
          <div class="detail-row">
            <i class="fas fa-calendar"></i>
            <div>
              <strong>日時:</strong>
              <p>${booking.date} ${booking.time}</p>
            </div>
          </div>
          
          <div class="detail-row">
            <i class="fas fa-user-tie"></i>
            <div>
              <strong>担当:</strong>
              <p>${booking.staff}</p>
            </div>
          </div>
          
          <div class="detail-row">
            <i class="fas fa-comments"></i>
            <div>
              <strong>相談内容:</strong>
              <p>${booking.type}</p>
            </div>
          </div>
          
          ${booking.referralCode !== 'DIRECT' ? `
          <div class="detail-row">
            <i class="fas fa-link"></i>
            <div>
              <strong>紹介コード:</strong>
              <p>${booking.referralCode}</p>
            </div>
          </div>
          ` : ''}
        </div>
        
        <div class="note">
          <i class="fas fa-info-circle"></i>
          <p>
            予約確認メールをお送りしました。<br>
            当日はメールに記載のURLからご参加ください。
          </p>
        </div>
        
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="this.closest('.booking-confirmation-modal').remove()">
            閉じる
          </button>
          <button class="btn btn-primary" onclick="window.timeRexBooking.addToCalendar('${booking.date}', '${booking.time}', '${booking.staff}')">
            <i class="fas fa-calendar-plus"></i>
            カレンダーに追加
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // モーダルの外側をクリックで閉じる
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
  
  updateDashboardBookingInfo(booking) {
    // ダッシュボードに予約情報セクションがあれば更新
    const bookingSection = document.querySelector('.latest-booking-info');
    if (bookingSection) {
      bookingSection.innerHTML = `
        <h4>次回の予約</h4>
        <div class="booking-card">
          <p><i class="fas fa-calendar"></i> ${booking.date} ${booking.time}</p>
          <p><i class="fas fa-user-tie"></i> ${booking.staff}</p>
          <p><i class="fas fa-comments"></i> ${booking.type}</p>
        </div>
      `;
    }
  }
  
  addToCalendar(date, time, staff) {
    // Googleカレンダーに追加するためのURL生成
    const startDateTime = new Date(`${date} ${time}`);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // 30分後
    
    const event = {
      text: `INTERCONNECT 面談 - ${staff}`,
      dates: `${this.formatDateForGoogle(startDateTime)}/${this.formatDateForGoogle(endDateTime)}`,
      details: `INTERCONNECTの無料相談です。オンラインで実施します。`,
      location: 'オンライン（Google Meet）'
    };
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.text)}&dates=${event.dates}&details=${encodeURIComponent(event.details)}&location=${encodeURIComponent(event.location)}`;
    
    window.open(googleCalendarUrl, '_blank');
  }
  
  formatDateForGoogle(date) {
    // GoogleカレンダーのフォーマットYYYYMMDDTHHMMSS
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = '00';
    
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
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