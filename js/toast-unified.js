/**
 * 統一トースト通知システム
 * 
 * notification-system-unified.jsに統合済み
 * このファイルは互換性のために残すが、内部実装は統一版を使用
 */

(function() {
    'use strict';

    // notification-system-unified.jsの実装を使用
    function showToast(message, type = 'info', duration = 3000) {
        // 統一版が読み込まれているか確認
        if (window.NotificationSystem && window.NotificationSystem.showToast) {
            return window.NotificationSystem.showToast(message, type, duration);
        }
        
        // フォールバック実装（統一版が読み込まれていない場合）
        // 既存のトーストをチェック
        const existingToast = document.querySelector('.toast.show');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // アイコンの設定
        let icon = 'info-circle';
        switch(type) {
            case 'success':
                icon = 'check-circle';
                break;
            case 'error':
                icon = 'exclamation-circle';
                break;
            case 'warning':
                icon = 'exclamation-triangle';
                break;
        }
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);

        // アニメーション
        setTimeout(() => toast.classList.add('show'), 100);
        
        // 自動削除
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // ショートカット関数
    function showSuccess(message, duration) {
        showToast(message, 'success', duration);
    }

    function showError(message, duration) {
        showToast(message, 'error', duration);
    }

    function showWarning(message, duration) {
        showToast(message, 'warning', duration);
    }

    function showInfo(message, duration) {
        showToast(message, 'info', duration);
    }

    // グローバルに公開
    window.showToast = showToast;
    window.showSuccess = showSuccess;
    window.showError = showError;
    window.showWarning = showWarning;
    window.showInfo = showInfo;

    console.log('[ToastUnified] 統一トースト通知システムが初期化されました');

})();