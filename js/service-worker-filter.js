/**
 * Service Workerログフィルター
 * Chrome拡張機能からのログスパムを削減
 */

(function() {
    'use strict';

    // Service Worker関連のコンソールメッセージをフィルタリング
    // console-history-logger.jsと競合しないように、既に上書きされている場合はスキップ
    if (console.log.name === 'log' && !window.__serviceWorkerFilterApplied) {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        const filterPatterns = [
            /Skipping cache for invalid URL scheme: chrome-extension/i,
            /Service Worker:/i,
            /SW:/i,
            /serviceWorker/i,
            /Failed to load resource.*chrome-extension/i,
            /chrome-extension:\/\//i
        ];

        function shouldFilter(args) {
            const message = args.map(arg => String(arg)).join(' ');
            return filterPatterns.some(pattern => pattern.test(message));
        }

        console.log = function(...args) {
            if (!shouldFilter(args)) {
                originalLog.apply(console, args);
            }
        };

        console.warn = function(...args) {
            if (!shouldFilter(args)) {
                originalWarn.apply(console, args);
            }
        };

        console.error = function(...args) {
            if (!shouldFilter(args)) {
                originalError.apply(console, args);
            }
        };

        // フィルターが適用されたことをマーク
        window.__serviceWorkerFilterApplied = true;
    }

    // Service Worker自体のログも制御
    if ('serviceWorker' in navigator) {
        const originalRegister = navigator.serviceWorker.register;
        navigator.serviceWorker.register = function(...args) {
            // Service Worker登録時のログを抑制
            return originalRegister.apply(navigator.serviceWorker, args)
                .then(registration => {
                    // 成功時のログを抑制
                    return registration;
                })
                .catch(error => {
                    // Chrome拡張機能関連のエラーは無視
                    if (!error.message.includes('chrome-extension')) {
                        throw error;
                    }
                });
        };
    }

    // console.log('[ServiceWorkerFilter] Chrome拡張機能ログフィルターが有効になりました');
})();