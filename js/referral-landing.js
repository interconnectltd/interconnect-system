// 紹介リンクからのランディング処理
// console.log('=== 紹介リンク処理開始 ===');

(function() {
    // URLから紹介コードを取得
    const path = window.location.pathname;
    const referralMatch = path.match(/^\/invite\/([A-Z0-9]{4}-[A-Z0-9]{4})$/);
    
    if (referralMatch) {
        const referralCode = referralMatch[1];
        // console.log('[Referral] 紹介コード検出:', referralCode);
        
        // セッションストレージに保存
        sessionStorage.setItem('referral_code', referralCode);
        sessionStorage.setItem('referral_timestamp', new Date().toISOString());
        
        // Cookieにも保存（7日間有効）
        document.cookie = `referral_code=${referralCode}; path=/; max-age=${7 * 24 * 60 * 60}`;
        
        // 紹介リンクの使用履歴を記録
        recordReferralVisit(referralCode);
        
        // ホームページにリダイレクト（クエリパラメータ付き）
        window.location.href = `/?ref=${referralCode}`;
    } else {
        // クエリパラメータから紹介コードを確認
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        
        if (refCode) {
            // console.log('[Referral] クエリパラメータから紹介コード検出:', refCode);
            sessionStorage.setItem('referral_code', refCode);
            sessionStorage.setItem('referral_timestamp', new Date().toISOString());
            
            // 紹介バナーを表示
            showReferralBanner(refCode);
        }
    }
    
    // 紹介コードがある場合は、CTAボタンをカスタマイズ
    const referralCode = sessionStorage.getItem('referral_code');
    if (referralCode) {
        customizeCTAButtons(referralCode);
    }
})();

// 紹介リンクの訪問を記録
async function recordReferralVisit(code) {
    try {
        // Supabaseが初期化されるまで待つ
        await window.waitForSupabase();
        if (window.supabaseClient) {
            // invite_historyに記録
            const { error } = await window.supabaseClient
                .from('invite_history')
                .insert({
                    invite_link_id: await getInviteLinkId(code),
                    ip_address: null, // プライバシー保護のため記録しない
                    user_agent: navigator.userAgent
                });
            
            if (error) {
                console.error('[Referral] 訪問記録エラー:', error);
            }
        }
    } catch (error) {
        console.error('[Referral] 訪問記録エラー:', error);
    }
}

// 紹介コードからリンクIDを取得
async function getInviteLinkId(code) {
    try {
        const { data, error } = await window.supabaseClient
            .from('invite_links')
            .select('id')
            .eq('link_code', code)
            .single();
        
        if (error) throw error;
        return data?.id || null;
    } catch (error) {
        console.error('[Referral] リンクID取得エラー:', error);
        return null;
    }
}

// 紹介バナーを表示
function showReferralBanner(code) {
    // 既存のバナーがあれば削除
    const existingBanner = document.getElementById('referral-banner');
    if (existingBanner) {
        existingBanner.remove();
    }
    
    // バナーHTML
    const bannerHTML = `
        <div id="referral-banner" class="referral-banner">
            <div class="referral-banner-content">
                <i class="fas fa-gift"></i>
                <span>特別招待リンクから訪問いただきました！</span>
                <span class="referral-code">招待コード: ${code}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    // バナーを挿入
    document.body.insertAdjacentHTML('afterbegin', bannerHTML);
    
    // バナーのスタイルを追加
    if (!document.getElementById('referral-banner-styles')) {
        const styles = `
            <style id="referral-banner-styles">
                .referral-banner {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                    color: white;
                    padding: 1rem;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                    z-index: 9999;
                    animation: slideDown 0.5s ease-out;
                }
                
                .referral-banner-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                    font-size: 1rem;
                    font-weight: 500;
                }
                
                .referral-code {
                    background: rgba(255, 255, 255, 0.2);
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-family: monospace;
                }
                
                .close-btn {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 0.5rem;
                    margin-left: auto;
                    opacity: 0.8;
                    transition: opacity 0.2s;
                }
                
                .close-btn:hover {
                    opacity: 1;
                }
                
                @keyframes slideDown {
                    from {
                        transform: translateY(-100%);
                    }
                    to {
                        transform: translateY(0);
                    }
                }
                
                /* ヘッダーがある場合のスペース調整 */
                body.has-referral-banner {
                    padding-top: 60px;
                }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    }
    
    // bodyにクラスを追加
    document.body.classList.add('has-referral-banner');
}

// CTAボタンをカスタマイズ
function customizeCTAButtons(referralCode) {
    // 面談予約ボタンを探して紹介コードを追加
    const ctaButtons = document.querySelectorAll('a[href*="register"], a[href*="signup"], button[onclick*="register"]');
    
    ctaButtons.forEach(button => {
        if (button.tagName === 'A') {
            // リンクの場合
            const url = new URL(button.href, window.location.origin);
            url.searchParams.set('ref', referralCode);
            button.href = url.toString();
        } else if (button.tagName === 'BUTTON') {
            // ボタンの場合、onclickを修正
            const originalOnclick = button.getAttribute('onclick');
            if (originalOnclick) {
                button.setAttribute('onclick', `sessionStorage.setItem('referral_code', '${referralCode}'); ${originalOnclick}`);
            }
        }
    });
    
    // 「今すぐ始める」ボタンなどを探して更新
    document.querySelectorAll('.hero-cta, .cta-button, .start-button').forEach(button => {
        button.addEventListener('click', (e) => {
            // 紹介コードを確実に保持
            sessionStorage.setItem('referral_code', referralCode);
        });
    });
}

// 登録ページへの遷移時に紹介コードを渡す
window.goToRegister = function() {
    const referralCode = sessionStorage.getItem('referral_code');
    if (referralCode) {
        window.location.href = `/register.html?ref=${referralCode}`;
    } else {
        window.location.href = '/register.html';
    }
};

// console.log('=== 紹介リンク処理準備完了 ===');