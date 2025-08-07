// 登録ページでの紹介コード処理
console.log('=== 登録ページ紹介コード処理 ===');

(function() {
    // 紹介コードを取得（優先順位: URL > Session > Cookie）
    let referralCode = null;
    
    // 1. URLパラメータから取得
    const urlParams = new URLSearchParams(window.location.search);
    const urlRef = urlParams.get('ref');
    
    // 2. セッションストレージから取得
    const sessionRef = sessionStorage.getItem('referral_code');
    
    // 3. Cookieから取得
    const cookieRef = getCookie('referral_code');
    
    // 優先順位で決定
    referralCode = urlRef || sessionRef || cookieRef;
    
    if (referralCode) {
        console.log('[Register] 紹介コード検出:', referralCode);
        
        // 隠しフィールドに設定
        const referralInput = document.getElementById('referral-code-input');
        if (referralInput) {
            referralInput.value = referralCode;
        } else {
            // 隠しフィールドを作成
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = 'referral-code-input';
            hiddenInput.name = 'referral_code';
            hiddenInput.value = referralCode;
            
            const form = document.getElementById('registerForm');
            if (form) {
                form.appendChild(hiddenInput);
            }
        }
        
        // 紹介情報を表示
        showReferralInfo(referralCode);
    }
})();

// Cookie取得関数
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// 紹介情報を表示
function showReferralInfo(code) {
    // 既存の情報があれば削除
    const existingInfo = document.getElementById('referral-info');
    if (existingInfo) {
        existingInfo.remove();
    }
    
    // 紹介情報HTML
    const infoHTML = `
        <div id="referral-info" class="referral-info">
            <i class="fas fa-gift"></i>
            <span>紹介コード適用中: <strong>${code}</strong></span>
            <small>登録完了で紹介者に特典が付与されます</small>
        </div>
    `;
    
    // フォームの上に挿入
    const form = document.getElementById('registerForm');
    if (form) {
        form.insertAdjacentHTML('beforebegin', infoHTML);
    }
    
    // スタイルを追加
    if (!document.getElementById('referral-info-styles')) {
        const styles = `
            <style id="referral-info-styles">
                .referral-info {
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                    color: white;
                    padding: 1rem 1.5rem;
                    border-radius: 12px;
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);
                    animation: slideIn 0.5s ease-out;
                }
                
                .referral-info i {
                    font-size: 1.5rem;
                    opacity: 0.9;
                }
                
                .referral-info strong {
                    font-weight: 600;
                    background: rgba(255, 255, 255, 0.2);
                    padding: 0.25rem 0.5rem;
                    border-radius: 6px;
                    font-family: monospace;
                }
                
                .referral-info small {
                    display: block;
                    opacity: 0.9;
                    font-size: 0.875rem;
                    margin-top: 0.25rem;
                }
                
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    }
}

// 登録処理を拡張
const originalRegister = window.register;
if (originalRegister) {
    window.register = async function(...args) {
        console.log('[Register] 登録処理開始（紹介コード付き）');
        
        // 紹介コードを取得
        const referralCode = document.getElementById('referral-code-input')?.value;
        
        if (referralCode) {
            console.log('[Register] 紹介コード:', referralCode);
            
            // 登録データに紹介コードを追加
            if (args[0] && typeof args[0] === 'object') {
                args[0].referral_code = referralCode;
            }
        }
        
        // 元の登録処理を実行
        const result = await originalRegister.apply(this, args);
        
        // 登録成功時に紹介関係を記録
        if (result && result.success && referralCode) {
            await recordReferralRegistration(referralCode, result.userId);
        }
        
        return result;
    };
}

// 紹介登録を記録
async function recordReferralRegistration(code, userId) {
    try {
        if (!window.supabaseClient) {
            console.error('[Register] supabaseClientが利用できません');
            return;
        }
        
        // invite_linksから紹介者情報を取得
        const { data: inviteLink, error: linkError } = await window.supabaseClient
            .from('invite_links')
            .select('id, created_by')
            .eq('link_code', code)
            .single();
        
        if (linkError || !inviteLink) {
            console.error('[Register] 紹介リンク取得エラー:', linkError);
            return;
        }
        
        // invitationsテーブルに記録
        const { error: invitationError } = await window.supabaseClient
            .from('invitations')
            .insert({
                inviter_id: inviteLink.created_by,
                invitee_email: null, // プライバシー保護
                invitation_code: code,
                status: 'registered',
                accepted_by: userId,
                accepted_at: new Date().toISOString(),
                invite_link_id: inviteLink.id
            });
        
        if (invitationError) {
            console.error('[Register] 招待記録エラー:', invitationError);
        } else {
            console.log('[Register] 紹介登録を記録しました');
            
            // 成功メッセージを表示
            showSuccessMessage('紹介コードが適用されました！');
        }
        
    } catch (error) {
        console.error('[Register] 紹介登録記録エラー:', error);
    }
}

// 成功メッセージを表示
function showSuccessMessage(message) {
    const messageHTML = `
        <div class="referral-success-message">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', messageHTML);
    
    // アニメーション後に削除
    setTimeout(() => {
        const messageEl = document.querySelector('.referral-success-message');
        if (messageEl) {
            messageEl.remove();
        }
    }, 3000);
    
    // スタイルを追加
    if (!document.getElementById('referral-success-styles')) {
        const styles = `
            <style id="referral-success-styles">
                .referral-success-message {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #10b981;
                    color: white;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                    animation: slideInRight 0.5s ease-out;
                    z-index: 9999;
                }
                
                .referral-success-message i {
                    font-size: 1.25rem;
                }
                
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(50px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    }
}

console.log('=== 登録ページ紹介コード処理準備完了 ===');