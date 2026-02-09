// 紹介コード自動追跡・適用システム
class ReferralTracker {
  constructor() {
    this.init();
  }
  
  init() {
    // ページ読み込み時に紹介コードを処理
    this.processReferralCode();
    
    // アカウント登録時の処理を設定
    this.setupRegistrationHandler();
  }
  
  processReferralCode() {
    // URLパラメータから紹介コードを取得
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref') || urlParams.get('referral') || urlParams.get('invite');
    
    if (referralCode) {
      // console.log('紹介コード検出:', referralCode);
      
      // セッションストレージとローカルストレージの両方に保存
      sessionStorage.setItem('referralCode', referralCode);
      localStorage.setItem('referralCode', referralCode);
      localStorage.setItem('referralTimestamp', new Date().toISOString());
      
      // 紹介リンクの統計を記録
      this.trackReferralClick(referralCode);
      
      // 紹介元ページの情報も保存
      localStorage.setItem('referralSource', document.referrer || 'direct');
      localStorage.setItem('landingPage', window.location.href);
    }
  }
  
  async trackReferralClick(referralCode) {
    try {
      // Supabaseが利用可能な場合のみ記録
      if (window.supabaseClient) {
        const { error } = await window.supabaseClient
          .from('referral_clicks')
          .insert({
            referral_code: referralCode,
            clicked_at: new Date().toISOString(),
            user_agent: navigator.userAgent,
            referrer: document.referrer || null,
            landing_url: window.location.href
          });
        
        if (error) {
          console.error('紹介クリック記録エラー:', error);
        }
      }
    } catch (error) {
      console.error('紹介追跡エラー:', error);
    }
  }
  
  setupRegistrationHandler() {
    // アカウント登録完了後の処理
    if (window.supabaseClient) {
      window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await this.applyReferralToUser(session.user);
        }
      });
    }
  }
  
  async applyReferralToUser(user) {
    const referralCode = localStorage.getItem('referralCode');
    if (!referralCode || referralCode === 'DIRECT') {
      return;
    }
    
    try {
      // console.log('新規ユーザーに紹介コードを適用:', referralCode);
      
      // 紹介情報をinvitationsテーブルに記録
      const { error } = await window.supabaseClient
        .from('invitations')
        .insert({
          inviter_id: null, // 後でinvite_linksから取得して更新
          invitee_id: user.id,
          invitee_email: user.email,
          invite_code: referralCode,
          status: 'registered',
          registered_at: new Date().toISOString(),
          referral_data: {
            source: localStorage.getItem('referralSource'),
            landing_page: localStorage.getItem('landingPage'),
            timestamp: localStorage.getItem('referralTimestamp')
          }
        });
      
      if (error) {
        console.error('紹介情報記録エラー:', error);
        return;
      }
      
      // 紹介者IDを更新
      await this.updateInviterFromCode(referralCode, user.id);
      
      // 紹介者にポイント付与（登録完了時）
      await this.awardRegistrationPoints(referralCode);
      
      // 成功通知
      if (typeof showNotification === 'function') {
        showNotification('紹介コードが正常に適用されました', 'success');
      }
      
    } catch (error) {
      console.error('紹介適用エラー:', error);
    }
  }
  
  async updateInviterFromCode(referralCode, inviteeId) {
    try {
      // invite_linksから紹介者IDを取得
      const { data: linkData } = await window.supabaseClient
        .from('invite_links')
        .select('created_by')
        .eq('link_code', referralCode)
        .eq('is_active', true)
        .single();
      
      if (linkData) {
        // invitationsテーブルの紹介者IDを更新
        await window.supabaseClient
          .from('invitations')
          .update({ inviter_id: linkData.created_by })
          .eq('invitee_id', inviteeId)
          .eq('invite_code', referralCode);
      }
      
    } catch (error) {
      console.error('紹介者ID更新エラー:', error);
    }
  }
  
  async awardRegistrationPoints(referralCode) {
    try {
      // 登録完了で500ポイント付与
      const { error } = await window.supabaseClient.rpc('add_referral_points', {
        referral_code: referralCode,
        points: 500,
        reason: 'referral_registration_completed'
      });
      
      if (error) {
        console.error('登録ポイント付与エラー:', error);
      }
      
    } catch (error) {
      console.error('ポイント付与エラー:', error);
    }
  }
  
  // 現在の紹介コードを取得
  getCurrentReferralCode() {
    return sessionStorage.getItem('referralCode') || 
           localStorage.getItem('referralCode') || 
           'DIRECT';
  }
  
  // 紹介情報をクリア
  clearReferralData() {
    sessionStorage.removeItem('referralCode');
    localStorage.removeItem('referralCode');
    localStorage.removeItem('referralTimestamp');
    localStorage.removeItem('referralSource');
    localStorage.removeItem('landingPage');
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  window.referralTracker = new ReferralTracker();
});

// グローバル関数として公開
window.getReferralCode = () => {
  return window.referralTracker?.getCurrentReferralCode() || 'DIRECT';
};