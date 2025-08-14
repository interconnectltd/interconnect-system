/**
 * Error Prevention Utilities
 * エラーを防ぐための共通ユーティリティ
 */

(function() {
    'use strict';

    // グローバルエラーハンドラー
    window.addEventListener('error', function(event) {
        console.error('Global error caught:', event.error);
        console.error('Error message:', event.message);
        console.error('Error filename:', event.filename);
        console.error('Error line:', event.lineno);
        console.error('Error column:', event.colno);
        console.error('Full event:', event);
        // エラーを記録するが、ユーザーには表示しない
        event.preventDefault();
    });

    // Promiseの未処理エラーをキャッチ
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        event.preventDefault();
    });

    // 安全なDOM要素取得
    window.safeQuerySelector = function(selector, parent = document) {
        try {
            return parent.querySelector(selector);
        } catch (e) {
            console.error('Invalid selector:', selector);
            return null;
        }
    };

    // 安全な複数要素取得
    window.safeQuerySelectorAll = function(selector, parent = document) {
        try {
            return Array.from(parent.querySelectorAll(selector));
        } catch (e) {
            console.error('Invalid selector:', selector);
            return [];
        }
    };

    // 安全なJSON parse
    window.safeJSONParse = function(str, defaultValue = null) {
        try {
            return JSON.parse(str);
        } catch (e) {
            return defaultValue;
        }
    };

    // 安全なイベントリスナー追加（自動クリーンアップ付き）
    const eventListeners = new WeakMap();
    
    window.safeAddEventListener = function(element, event, handler, options) {
        if (!element || typeof element.addEventListener !== 'function') {
            console.warn('Invalid element for event listener');
            return null;
        }

        // ラッパー関数でエラーハンドリング
        const safeHandler = function(e) {
            try {
                handler.call(this, e);
            } catch (error) {
                console.error('Error in event handler:', error);
            }
        };

        element.addEventListener(event, safeHandler, options);

        // クリーンアップ用に記録
        if (!eventListeners.has(element)) {
            eventListeners.set(element, []);
        }
        eventListeners.get(element).push({ event, handler: safeHandler, options });

        // クリーンアップ関数を返す
        return function() {
            element.removeEventListener(event, safeHandler, options);
        };
    };

    // 安全なsetTimeout
    window.safeSetTimeout = function(callback, delay) {
        return setTimeout(function() {
            try {
                callback();
            } catch (error) {
                console.error('Error in setTimeout callback:', error);
            }
        }, delay);
    };

    // 安全なsetInterval
    const intervals = new Set();
    
    window.safeSetInterval = function(callback, delay) {
        const intervalId = setInterval(function() {
            try {
                callback();
            } catch (error) {
                console.error('Error in setInterval callback:', error);
                clearInterval(intervalId);
                intervals.delete(intervalId);
            }
        }, delay);
        
        intervals.add(intervalId);
        return intervalId;
    };

    // ページ離脱時のクリーンアップ
    window.addEventListener('beforeunload', function() {
        // すべてのインターバルをクリア
        intervals.forEach(id => clearInterval(id));
        intervals.clear();
    });

    // 安全なHTML挿入（XSS対策）
    window.safeSetHTML = function(element, html) {
        if (!element) return;
        
        // 危険なタグやイベントハンドラーを除去
        const cleanHTML = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
            .replace(/javascript:/gi, '');
        
        element.innerHTML = cleanHTML;
    };

    // 安全な属性設定
    window.safeSetAttribute = function(element, attribute, value) {
        if (!element || typeof element.setAttribute !== 'function') return;
        
        // 危険な属性をチェック
        const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover'];
        if (dangerousAttrs.includes(attribute.toLowerCase())) {
            console.warn('Dangerous attribute blocked:', attribute);
            return;
        }
        
        element.setAttribute(attribute, value);
    };

    // デバウンス関数（パフォーマンス改善）
    window.debounce = function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                try {
                    func(...args);
                } catch (error) {
                    console.error('Error in debounced function:', error);
                }
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    // スロットル関数（パフォーマンス改善）
    window.throttle = function(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                try {
                    func.apply(this, args);
                } catch (error) {
                    console.error('Error in throttled function:', error);
                }
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };

})();