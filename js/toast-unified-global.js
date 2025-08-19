/**
 * 統一トースト通知システム - グローバル版
 * 
 * 全ファイルで共通のshowToast関数を提供
 * 既存の重複定義を防ぐため、グローバルに一度だけ定義
 */

(function() {
    'use strict';

    // 既にshowToastが定義されている場合はスキップ
    if (window.showToast) {
        // console.log('[ToastUnified] showToast already defined, skipping');
        return;
    }

    // 統一Toast通知の実装
    window.showToast = function(message, type = 'info', duration = 3000) {
        // 既存のトーストを削除
        const existingToast = document.querySelector('.toast-notification, .toast.show, .toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} toast-notification`;
        
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
        
        // HTMLコンテンツを設定
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        // スタイルを設定
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 400px;
            font-size: 14px;
            line-height: 1.5;
        `;

        // タイプ別のスタイル
        const typeStyles = {
            success: 'border-left: 4px solid #10b981; color: #065f46;',
            error: 'border-left: 4px solid #ef4444; color: #991b1b;',
            warning: 'border-left: 4px solid #f59e0b; color: #92400e;',
            info: 'border-left: 4px solid #3b82f6; color: #1e40af;'
        };

        if (typeStyles[type]) {
            toast.style.cssText += typeStyles[type];
        }

        // アイコンのスタイル
        const iconElement = toast.querySelector('i');
        if (iconElement) {
            const iconColors = {
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            };
            iconElement.style.color = iconColors[type] || '#3b82f6';
            iconElement.style.fontSize = '20px';
        }
        
        document.body.appendChild(toast);

        // アニメーション
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });

        // 自動削除
        setTimeout(() => {
            toast.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, duration);

        return toast;
    };

    // showMessageのエイリアス（互換性のため）
    if (!window.showMessage) {
        window.showMessage = window.showToast;
    }

    // NotificationSystemに統合
    window.NotificationSystem = window.NotificationSystem || {};
    window.NotificationSystem.showToast = window.showToast;

    // console.log('[ToastUnified] Global showToast function initialized');
})();