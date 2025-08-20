/**
 * Event Listener Manager
 * イベントリスナーの重複を防ぎ、メモリリークを防ぐための統一管理システム
 */

(function() {
    'use strict';

    // イベントリスナーの追跡
    const eventRegistry = new WeakMap();
    const globalListeners = new Map();

    /**
     * 安全にイベントリスナーを追加（重複防止）
     * @param {Element} element - 要素
     * @param {string} event - イベント名
     * @param {Function} handler - ハンドラー関数
     * @param {Object} options - オプション
     * @returns {Function} 削除用の関数
     */
    function addSafeEventListener(element, event, handler, options = {}) {
        if (!element || !event || !handler) return null;

        // 要素ごとのリスナーマップを取得または作成
        let elementListeners = eventRegistry.get(element);
        if (!elementListeners) {
            elementListeners = new Map();
            eventRegistry.set(element, elementListeners);
        }

        // イベントごとのハンドラーセットを取得または作成
        const eventKey = `${event}_${options.capture ? 'capture' : 'bubble'}`;
        let handlers = elementListeners.get(eventKey);
        if (!handlers) {
            handlers = new Set();
            elementListeners.set(eventKey, handlers);
        }

        // 既に同じハンドラーが登録されている場合はスキップ
        if (handlers.has(handler)) {
            // console.log(`[EventManager] Duplicate listener prevented for ${event}`);
            return () => removeSafeEventListener(element, event, handler, options);
        }

        // ハンドラーを登録
        handlers.add(handler);
        element.addEventListener(event, handler, options);

        // 削除用の関数を返す
        return () => removeSafeEventListener(element, event, handler, options);
    }

    /**
     * 安全にイベントリスナーを削除
     */
    function removeSafeEventListener(element, event, handler, options = {}) {
        if (!element || !event || !handler) return;

        const elementListeners = eventRegistry.get(element);
        if (!elementListeners) return;

        const eventKey = `${event}_${options.capture ? 'capture' : 'bubble'}`;
        const handlers = elementListeners.get(eventKey);
        if (!handlers) return;

        if (handlers.has(handler)) {
            handlers.delete(handler);
            element.removeEventListener(event, handler, options);

            // ハンドラーセットが空になったらクリーンアップ
            if (handlers.size === 0) {
                elementListeners.delete(eventKey);
            }

            // 要素のリスナーマップが空になったらクリーンアップ
            if (elementListeners.size === 0) {
                eventRegistry.delete(element);
            }
        }
    }

    /**
     * 委譲イベントリスナーの追加（パフォーマンス最適化）
     */
    function addDelegatedListener(parentSelector, eventType, childSelector, handler) {
        const parent = typeof parentSelector === 'string' 
            ? document.querySelector(parentSelector) 
            : parentSelector;

        if (!parent) return null;

        const delegatedHandler = function(e) {
            const target = e.target.closest(childSelector);
            if (target && parent.contains(target)) {
                handler.call(target, e);
            }
        };

        // グローバルリスナーとして登録
        const key = `${parentSelector}_${eventType}_${childSelector}`;
        if (globalListeners.has(key)) {
            // console.log(`[EventManager] Delegated listener already exists for ${key}`);
            return globalListeners.get(key).remove;
        }

        const removeFunc = addSafeEventListener(parent, eventType, delegatedHandler);
        globalListeners.set(key, { handler: delegatedHandler, remove: removeFunc });

        return removeFunc;
    }

    /**
     * DOMContentLoadedの重複を防ぐ
     */
    let domReadyHandlers = [];
    let domReady = false;

    function onDOMReady(handler) {
        if (domReady || document.readyState === 'complete' || document.readyState === 'interactive') {
            // 既にDOMが準備できている場合は即座に実行
            setTimeout(handler, 0);
        } else {
            domReadyHandlers.push(handler);
        }
    }

    // DOMContentLoadedを一度だけ登録
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            domReady = true;
            domReadyHandlers.forEach(handler => {
                try {
                    handler();
                } catch (e) {
                    console.error('[EventManager] Error in DOMReady handler:', e);
                }
            });
            domReadyHandlers = [];
        }, { once: true });
    } else {
        domReady = true;
    }

    /**
     * ページアンロード時のクリーンアップ
     */
    window.addEventListener('beforeunload', function() {
        // グローバルリスナーをクリーンアップ
        globalListeners.forEach(listener => {
            if (listener.remove) {
                listener.remove();
            }
        });
        globalListeners.clear();
    }, { once: true });

    /**
     * ユーティリティ：一度だけ実行されるイベントリスナー
     */
    function addOnceListener(element, event, handler, options = {}) {
        const onceHandler = function(e) {
            handler.call(this, e);
            removeSafeEventListener(element, event, onceHandler, options);
        };
        return addSafeEventListener(element, event, onceHandler, options);
    }

    /**
     * デバウンス付きイベントリスナー
     */
    function addDebouncedListener(element, event, handler, delay = 300, options = {}) {
        let timeoutId;
        const debouncedHandler = function(e) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => handler.call(this, e), delay);
        };
        return addSafeEventListener(element, event, debouncedHandler, options);
    }

    /**
     * スロットル付きイベントリスナー
     */
    function addThrottledListener(element, event, handler, limit = 300, options = {}) {
        let inThrottle;
        const throttledHandler = function(e) {
            if (!inThrottle) {
                handler.call(this, e);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
        return addSafeEventListener(element, event, throttledHandler, options);
    }

    // グローバルAPI公開
    window.EventManager = {
        add: addSafeEventListener,
        remove: removeSafeEventListener,
        delegate: addDelegatedListener,
        once: addOnceListener,
        debounce: addDebouncedListener,
        throttle: addThrottledListener,
        onReady: onDOMReady
    };

    // EventTarget.prototypeの上書きは危険なので削除
    // グローバルな影響を避けるため、必要な要素に対して個別にイベントリスナーを管理する
    // これによりシステム全体への予期しない影響を防ぐ

    // console.log('[EventManager] Event listener management system initialized');
})();