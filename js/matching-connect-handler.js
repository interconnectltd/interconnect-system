// ==========================================
// マッチングページのコネクト申請ハンドラー
// ==========================================

(function() {
    'use strict';
    
    console.log('[ConnectHandler] 初期化開始');
    
    // コネクト申請機能
    const sendConnectRequest = async (profileId, button, originalText) => {
        try {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) {
                showNotification('ログインが必要です', 'error');
                return;
            }
            
            // 既存のコネクションをチェック
            const { data: existing } = await window.supabase
                .from('connections')
                .select('*')
                .eq('user_id', user.id)
                .eq('connected_user_id', profileId)
                .single();
            
            if (existing) {
                if (existing.status === 'pending') {
                    showNotification('既にコネクト申請を送信済みです（承認待ち）', 'info');
                } else if (existing.status === 'accepted') {
                    showNotification('既にコネクト済みです', 'info');
                } else {
                    showNotification('コネクト申請の状態: ' + existing.status, 'info');
                }
                return;
            }
            
            // ローディング表示
            if (button) {
                originalText = originalText || button.textContent;
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 送信中...';
            }
            
            // コネクト申請を送信
            const { error } = await window.supabase
                .from('connections')
                .insert({
                    user_id: user.id,
                    connected_user_id: profileId,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
            
            if (error) throw error;
            
            // 成功通知
            if (button) {
                button.innerHTML = '<i class="fas fa-check"></i> 申請済み';
                button.classList.add('btn-success');
            }
            
            // 通知を表示
            showNotification('コネクト申請を送信しました！', 'success');
            
        } catch (error) {
            console.error('[ConnectHandler] コネクト申請エラー:', error);
            
            // エラー通知
            showNotification('コネクト申請の送信に失敗しました', 'error');
            
            // ボタンを元に戻す
            if (button) {
                button.disabled = false;
                button.innerHTML = originalText || 'コネクト申請';
            }
        }
    };
    
    // 通知表示
    const showNotification = (message, type = 'info') => {
        // 既存の通知を削除
        const existingNotification = document.querySelector('.connect-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // 新しい通知を作成
        const notification = document.createElement('div');
        notification.className = `connect-notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 10001;
            animation: slideIn 0.3s ease;
        `;
        
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // 3秒後に自動的に削除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    };
    
    // イベントリスナー設定
    document.addEventListener('click', async (e) => {
        // コネクト申請ボタンのクリック（ボタン内のアイコンがクリックされた場合も考慮）
        const button = e.target.closest('.btn-connect');
        if (button || e.target.classList.contains('btn-connect') || 
            (e.target.textContent && e.target.textContent.includes('コネクト申請'))) {
            
            e.preventDefault();
            e.stopPropagation();
            
            // クリックされた要素から最も近いボタンを取得
            const targetButton = button || e.target;
            
            // プロファイルIDを取得
            let profileId = targetButton.dataset.profileId;
            
            if (!profileId) {
                // カードから取得を試みる
                const card = targetButton.closest('[data-profile-id]');
                if (card) {
                    profileId = card.dataset.profileId;
                }
            }
            
            console.log('[ConnectHandler] プロファイルID:', profileId);
            
            if (profileId && profileId !== 'undefined') {
                // ボタンの参照を保存
                const originalText = targetButton.textContent;
                await sendConnectRequest(profileId, targetButton, originalText);
            } else {
                console.error('[ConnectHandler] プロファイルIDが見つかりません', targetButton);
                showNotification('エラー: プロファイル情報が見つかりません', 'error');
            }
        }
    });
    
    // スタイルを追加
    if (!document.getElementById('connect-handler-styles')) {
        const styles = document.createElement('style');
        styles.id = 'connect-handler-styles';
        styles.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            .btn-success {
                background: #4caf50 !important;
                cursor: default !important;
            }
            
            .btn-success:hover {
                background: #4caf50 !important;
                transform: none !important;
            }
            
            .override-btn:disabled {
                opacity: 0.7;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(styles);
    }
    
    // グローバル公開
    window.connectHandler = {
        sendConnect: sendConnectRequest,
        showNotification: showNotification
    };
    
    console.log('[ConnectHandler] 初期化完了');
    
})();