/**
 * Global Error Handler - アプリケーション全体のエラーハンドリング
 */

(function() {
    'use strict';
    
    // エラーログを保存する配列（デバッグ用）
    const errorLog = [];
    const maxErrorLogSize = 100;
    
    /**
     * エラーをログに記録
     */
    function logError(error, context) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            message: error.message || 'Unknown error',
            stack: error.stack || 'No stack trace',
            context: context || 'Unknown context',
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // コンソールに出力
        console.error('🚨 Error logged:', errorEntry);
        
        // ログ配列に追加（サイズ制限あり）
        errorLog.push(errorEntry);
        if (errorLog.length > maxErrorLogSize) {
            errorLog.shift();
        }
        
        // LocalStorageに最新のエラーを保存（デバッグ用）
        try {
            if (typeof Storage !== 'undefined') {
                localStorage.setItem('lastError', JSON.stringify(errorEntry));
            }
        } catch (e) {
            // ストレージエラーは無視
        }
    }
    
    /**
     * ユーザーにエラーを通知
     */
    function notifyUser(message, type = 'error') {
        // 既存のトースト機能を使用
        if (window.InterConnect && window.InterConnect.Registration && window.InterConnect.Registration.showToast) {
            window.InterConnect.Registration.showToast(message, type);
        } else {
            // フォールバック：シンプルなアラート
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'error' ? '#ef4444' : '#10b981'};
                color: white;
                padding: 16px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 9999;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 14px;
                animation: slideIn 0.3s ease;
            `;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (document.contains(notification)) {
                        notification.remove();
                    }
                }, 300);
            }, 5000);
        }
    }
    
    /**
     * グローバルエラーハンドラー
     */
    window.addEventListener('error', function(event) {
        const error = {
            message: event.message,
            stack: event.error ? event.error.stack : 'No stack trace',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        };
        
        logError(error, 'Global error handler');
        
        // 特定のエラーパターンに基づいてユーザーに通知
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            notifyUser('ネットワークエラーが発生しました。接続を確認してください。', 'error');
        } else if (error.message.includes('localStorage') || error.message.includes('sessionStorage')) {
            notifyUser('ストレージエラーが発生しました。ブラウザの設定を確認してください。', 'error');
        } else if (error.message.includes('Supabase')) {
            notifyUser('認証エラーが発生しました。もう一度お試しください。', 'error');
        }
        
        // デフォルトのエラー処理を防ぐ
        event.preventDefault();
    });
    
    /**
     * Promiseの未処理エラーハンドラー
     */
    window.addEventListener('unhandledrejection', function(event) {
        const error = {
            message: event.reason ? (event.reason.message || event.reason) : 'Unknown promise rejection',
            stack: event.reason && event.reason.stack ? event.reason.stack : 'No stack trace'
        };
        
        logError(error, 'Unhandled promise rejection');
        
        // Promiseエラーの場合もユーザーに通知
        if (error.message.includes('fetch')) {
            notifyUser('データの取得に失敗しました。もう一度お試しください。', 'error');
        }
        
        // デフォルトのエラー処理を防ぐ
        event.preventDefault();
    });
    
    /**
     * カスタムエラーハンドリング関数
     */
    window.handleError = function(error, context, userMessage) {
        logError(error, context);
        
        if (userMessage) {
            notifyUser(userMessage, 'error');
        }
    };
    
    /**
     * try-catchブロック用のヘルパー関数
     */
    window.safeExecute = async function(fn, context, userErrorMessage) {
        try {
            return await fn();
        } catch (error) {
            window.handleError(error, context, userErrorMessage);
            return null;
        }
    };
    
    /**
     * エラーログを取得する関数（デバッグ用）
     */
    window.getErrorLog = function() {
        return errorLog;
    };
    
    /**
     * エラーログをクリアする関数
     */
    window.clearErrorLog = function() {
        errorLog.length = 0;
        try {
            if (typeof Storage !== 'undefined') {
                localStorage.removeItem('lastError');
            }
        } catch (e) {
            // ストレージエラーは無視
        }
    };
    
    // CSS アニメーションを追加
    const style = document.createElement('style');
    style.textContent = `
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
    `;
    document.head.appendChild(style);
    
    // console.log('✅ Global error handler initialized');
    
})();