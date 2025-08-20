/**
 * プロフィールモーダル優先制御
 * profile-detail-modal.jsのイベントハンドラを優先させる
 */

(function() {
    'use strict';
    
    // DOMContentLoadedの後で実行
    function setupModalPriority() {
        // matching-unified.jsのイベントを無効化する
        const container = document.getElementById('matching-container');
        if (container) {
            // 既存のイベントリスナーを削除
            const newContainer = container.cloneNode(true);
            container.parentNode.replaceChild(newContainer, container);
            
            // 新しいイベントリスナーを追加（モーダル以外の処理のみ）
            newContainer.addEventListener('click', function(e) {
                // プロフィールボタンは処理しない（profile-detail-modal.jsに任せる）
                if (e.target.classList.contains('view-profile-btn') || 
                    e.target.closest('.view-profile-btn') ||
                    e.target.classList.contains('btn-profile') ||
                    e.target.closest('.btn-profile') ||
                    e.target.classList.contains('btn-view') ||
                    e.target.closest('.btn-view')) {
                    // profile-detail-modal.jsに処理を委譲
                    return;
                }
                
                // コネクトボタンの処理
                const connectBtn = e.target.closest('.connect-btn');
                if (connectBtn) {
                    e.preventDefault();
                    const userId = connectBtn.dataset.userId;
                    if (userId && window.sendConnectRequest) {
                        window.sendConnectRequest(userId);
                    }
                    return;
                }
                
                // ブックマークボタンの処理
                const bookmarkBtn = e.target.closest('.bookmark-btn');
                if (bookmarkBtn) {
                    e.preventDefault();
                    const userId = bookmarkBtn.dataset.userId;
                    if (userId && window.toggleBookmark) {
                        window.toggleBookmark(userId);
                    }
                    return;
                }
            });
        }
        
        // ProfileDetailModalが確実に初期化されるまで待つ
        let retryCount = 0;
        const checkModal = setInterval(() => {
            if (window.profileDetailModal) {
                clearInterval(checkModal);
                console.log('[ProfileModalPriority] ProfileDetailModalが初期化されました');
                
                // グローバル関数として公開（互換性のため）
                window.showProfileModal = async function(userId) {
                    if (window.profileDetailModal && window.profileDetailModal.show) {
                        await window.profileDetailModal.show(userId);
                    }
                };
            } else if (retryCount++ > 50) {
                clearInterval(checkModal);
                console.warn('[ProfileModalPriority] ProfileDetailModalの初期化タイムアウト');
            }
        }, 100);
    }
    
    // ページ読み込み完了後に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupModalPriority);
    } else {
        // 既に読み込み済みの場合は少し遅延させて実行
        setTimeout(setupModalPriority, 100);
    }
    
})();