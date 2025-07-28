/**
 * Dashboard Modal Fix
 * モーダルの動作を修正
 */

(function() {
    'use strict';

    // モーダルのオーバーレイクリックで閉じる機能を追加
    document.addEventListener('DOMContentLoaded', () => {
        const modal = document.getElementById('eventDetailModal');
        if (!modal) return;

        // オーバーレイクリックで閉じる
        const overlay = modal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                if (window.dashboardUI && window.dashboardUI.closeEventModal) {
                    window.dashboardUI.closeEventModal();
                }
            });
        }

        // ESCキーで閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                if (window.dashboardUI && window.dashboardUI.closeEventModal) {
                    window.dashboardUI.closeEventModal();
                }
            }
        });

        console.log('[ModalFix] モーダル機能を拡張しました');
    });

})();