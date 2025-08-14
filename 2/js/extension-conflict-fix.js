/**
 * Chrome拡張機能の競合エラーを抑制
 * "Unchecked runtime.lastError" エラーを防ぐ
 */

(function() {
    'use strict';

    // Chrome拡張機能のメッセージエラーをキャッチ
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
        // エラーを静かに処理
        const checkLastError = () => {
            if (chrome.runtime.lastError) {
                // エラーをログに記録せずに処理
                void chrome.runtime.lastError;
            }
        };

        // 定期的にエラーをチェック
        setInterval(checkLastError, 1000);
    }

    // パスワードマネージャーの自動入力との競合を防ぐ
    document.addEventListener('DOMContentLoaded', function() {
        // パスワードフィールドに autocomplete 属性を設定
        const passwordFields = document.querySelectorAll('input[type="password"]');
        passwordFields.forEach(field => {
            if (!field.hasAttribute('autocomplete')) {
                field.setAttribute('autocomplete', 'current-password');
            }
        });

        // 新しいパスワードフィールドには別の属性を設定
        const newPasswordFields = document.querySelectorAll('#new-password, #confirm-password');
        newPasswordFields.forEach(field => {
            field.setAttribute('autocomplete', 'new-password');
        });

        // フォームの自動入力を適切に処理
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            // 拡張機能との競合を避けるため、フォーム送信を遅延
            form.addEventListener('submit', function(e) {
                // 拡張機能がフォームを処理する時間を与える
                const originalSubmit = form.submit;
                form.submit = function() {
                    setTimeout(() => {
                        originalSubmit.call(form);
                    }, 100);
                };
            });
        });
    });

    // 拡張機能のポートエラーを処理
    window.addEventListener('error', function(event) {
        if (event.message && event.message.includes('Extension context invalidated')) {
            event.preventDefault();
            return true;
        }
    });

    // 非同期エラーも処理
    window.addEventListener('unhandledrejection', function(event) {
        if (event.reason && event.reason.message && 
            (event.reason.message.includes('Extension context') || 
             event.reason.message.includes('message port closed'))) {
            event.preventDefault();
            return true;
        }
    });

})();