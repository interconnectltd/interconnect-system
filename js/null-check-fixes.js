/**
 * Null Check Fixes
 * DOM要素の存在確認を追加
 */

(function() {
    'use strict';

    // 危険なdocument.querySelectorのオーバーライドは削除
    // 代わりに安全なヘルパー関数を提供
    
    // 安全な要素取得関数
    window.safeQuerySelector = function(selector, context = document) {
        try {
            const element = context.querySelector(selector);
            if (!element && window.DEBUG_MODE) {
                console.warn(`Element not found: ${selector}`);
            }
            return element;
        } catch (e) {
            if (window.DEBUG_MODE) {
                console.error(`Invalid selector: ${selector}`, e);
            }
            return null;
        }
    };

    // 安全な複数要素取得関数
    window.safeQuerySelectorAll = function(selector, context = document) {
        try {
            return context.querySelectorAll(selector);
        } catch (e) {
            if (window.DEBUG_MODE) {
                console.error(`Invalid selector: ${selector}`, e);
            }
            return [];
        }
    };

    // Element.prototypeの変更は危険なので削除
    // 代わりに安全なラッパー関数を提供

    // 共通のnullチェック関数
    window.checkElement = function(element, elementName = 'Element') {
        if (!element) {
            console.warn(`${elementName} not found`);
            return false;
        }
        return true;
    };

    // 複数要素のnullチェック
    window.checkElements = function(elements, elementName = 'Elements') {
        if (!elements || elements.length === 0) {
            console.warn(`${elementName} not found`);
            return false;
        }
        return true;
    };

    // 安全なaddEventListener - EventTarget.prototypeの上書きは危険なので無効化
    // const originalAddEventListener = EventTarget.prototype.addEventListener;
    // EventTarget.prototype.addEventListener = function(type, listener, options) {
    //     if (!this) {
    //         console.error('Cannot add event listener to null/undefined');
    //         return;
    //     }
    //     
    //     // リスナーをラップしてエラーをキャッチ
    //     const safeListener = function(event) {
    //         try {
    //             if (typeof listener === 'function') {
    //                 listener.call(this, event);
    //             } else if (listener && typeof listener.handleEvent === 'function') {
    //                 listener.handleEvent(event);
    //             }
    //         } catch (error) {
    //             console.error(`Error in ${type} event listener:`, error);
    //         }
    //     };
    //
    //     originalAddEventListener.call(this, type, safeListener, options);
    // };

    // LocalStorage/SessionStorageの安全なアクセス
    window.safeStorage = {
        getItem: function(key, storage = localStorage) {
            try {
                return storage.getItem(key);
            } catch (e) {
                console.error('Storage access error:', e);
                return null;
            }
        },
        
        setItem: function(key, value, storage = localStorage) {
            try {
                storage.setItem(key, value);
                return true;
            } catch (e) {
                console.error('Storage write error:', e);
                return false;
            }
        },
        
        removeItem: function(key, storage = localStorage) {
            try {
                storage.removeItem(key);
                return true;
            } catch (e) {
                console.error('Storage remove error:', e);
                return false;
            }
        },
        
        clear: function(storage = localStorage) {
            try {
                storage.clear();
                return true;
            } catch (e) {
                console.error('Storage clear error:', e);
                return false;
            }
        }
    };

    // JSONの安全なパース
    window.JSON.safeParse = function(text, reviver) {
        try {
            return JSON.parse(text, reviver);
        } catch (e) {
            console.error('JSON parse error:', e);
            return null;
        }
    };

    // JSONの安全な文字列化
    window.JSON.safeStringify = function(value, replacer, space) {
        try {
            return JSON.stringify(value, replacer, space);
        } catch (e) {
            console.error('JSON stringify error:', e);
            return '';
        }
    };

})();