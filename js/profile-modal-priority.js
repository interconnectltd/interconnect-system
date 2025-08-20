/**
 * プロフィールモーダル優先制御
 * profile-detail-modal.jsのイベントハンドラを優先させる
 */

(function() {
    'use strict';
    
    // DOMContentLoadedの後で実行
    function setupModalPriority() {
        // matching-unified.jsのイベントと共存させる（置き換えない）
        const container = document.getElementById('matching-container');
        if (container) {
            // 既存のイベントリスナーは残したまま、優先度の高いリスナーを追加
            container.addEventListener('click', function(e) {
                // プロフィールボタンの場合、処理を続行させる
                // stopImmediatePropagationを削除して、他のイベントハンドラーも動作するようにする
                if (e.target.classList.contains('view-profile-btn') || 
                    e.target.closest('.view-profile-btn') ||
                    e.target.classList.contains('btn-profile') ||
                    e.target.closest('.btn-profile') ||
                    e.target.classList.contains('btn-view') ||
                    e.target.closest('.btn-view')) {
                    // 何もせず、イベントを通過させる
                    // 両方のハンドラー（matching-unified.jsとprofile-detail-modal.js）を動作させる
                    return;
                }
            }, true); // キャプチャフェーズで実行（優先度を上げる）
        }
        
        // ProfileDetailModalが確実に初期化されるまで待つ
        let retryCount = 0;
        const checkModal = setInterval(() => {
            if (window.profileDetailModal) {
                clearInterval(checkModal);
                // console.log('[ProfileModalPriority] ProfileDetailModalが初期化されました');
                
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