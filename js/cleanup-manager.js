/**
 * Cleanup Manager - メモリリークを防ぐためのイベントリスナー管理
 */

(function() {
    'use strict';
    
    // グローバルなクリーンアップマネージャー
    window.CleanupManager = {
        listeners: new Map(),
        intervals: new Map(),
        timeouts: new Map(),
        
        /**
         * イベントリスナーを追加（自動的に追跡）
         */
        addEventListener: function(element, event, handler, options) {
            if (!element || !event || !handler) {
                console.error('Invalid parameters for addEventListener');
                return;
            }
            
            const key = `${element.tagName || 'window'}_${element.id || 'no-id'}_${event}`;
            
            // 既存のリスナーがある場合は削除
            if (this.listeners.has(key)) {
                const existing = this.listeners.get(key);
                element.removeEventListener(existing.event, existing.handler, existing.options);
            }
            
            // 新しいリスナーを追加
            element.addEventListener(event, handler, options);
            
            // 追跡用に保存
            this.listeners.set(key, {
                element: element,
                event: event,
                handler: handler,
                options: options
            });
        },
        
        /**
         * setIntervalの安全なラッパー
         */
        setInterval: function(callback, delay, id) {
            if (!id) {
                id = 'interval_' + Date.now() + '_' + Math.random();
            }
            
            // 既存のインターバルをクリア
            if (this.intervals.has(id)) {
                clearInterval(this.intervals.get(id));
            }
            
            const intervalId = setInterval(callback, delay);
            this.intervals.set(id, intervalId);
            
            return intervalId;
        },
        
        /**
         * setTimeoutの安全なラッパー
         */
        setTimeout: function(callback, delay, id) {
            if (!id) {
                id = 'timeout_' + Date.now() + '_' + Math.random();
            }
            
            // 既存のタイムアウトをクリア
            if (this.timeouts.has(id)) {
                clearTimeout(this.timeouts.get(id));
            }
            
            const timeoutId = setTimeout(() => {
                callback();
                this.timeouts.delete(id);
            }, delay);
            
            this.timeouts.set(id, timeoutId);
            
            return timeoutId;
        },
        
        /**
         * 特定の要素に関連するすべてのリスナーを削除
         */
        removeElementListeners: function(element) {
            const keysToRemove = [];
            
            this.listeners.forEach((listener, key) => {
                if (listener.element === element) {
                    element.removeEventListener(listener.event, listener.handler, listener.options);
                    keysToRemove.push(key);
                }
            });
            
            keysToRemove.forEach(key => this.listeners.delete(key));
        },
        
        /**
         * すべてのインターバルをクリア
         */
        clearAllIntervals: function() {
            this.intervals.forEach(intervalId => clearInterval(intervalId));
            this.intervals.clear();
        },
        
        /**
         * すべてのタイムアウトをクリア
         */
        clearAllTimeouts: function() {
            this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
            this.timeouts.clear();
        },
        
        /**
         * すべてをクリーンアップ
         */
        cleanupAll: function() {
            // すべてのイベントリスナーを削除
            this.listeners.forEach(listener => {
                try {
                    listener.element.removeEventListener(listener.event, listener.handler, listener.options);
                } catch (e) {
                    console.error('Error removing event listener:', e);
                }
            });
            this.listeners.clear();
            
            // すべてのインターバルとタイムアウトをクリア
            this.clearAllIntervals();
            this.clearAllTimeouts();
            
            console.log('All cleanup completed');
        }
    };
    
    // ページアンロード時に自動クリーンアップ
    window.addEventListener('beforeunload', function() {
        window.CleanupManager.cleanupAll();
    });
    
    // ページ遷移時の自動クリーンアップ（SPA対応）
    if (window.history && window.history.pushState) {
        const originalPushState = window.history.pushState;
        window.history.pushState = function() {
            window.CleanupManager.cleanupAll();
            return originalPushState.apply(window.history, arguments);
        };
    }
    
})();