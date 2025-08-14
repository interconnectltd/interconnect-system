/**
 * Safe DOM Utilities
 * XSS対策とDOM操作の安全性を確保
 */

(function() {
    'use strict';

    // HTMLサニタイズ用の要素
    const sanitizerDiv = document.createElement('div');

    // 危険なタグとイベントハンドラーのパターン
    const DANGEROUS_TAGS = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    const EVENT_HANDLERS = /on\w+\s*=\s*["'][^"']*["']/gi;
    const JAVASCRIPT_PROTOCOL = /javascript:/gi;
    const DATA_BINDING = /{{\s*[\w.]+\s*}}/g;

    // 安全なHTML設定（完全サニタイズ版）
    window.safeSetHTML = function(element, html) {
        if (!element) return;
        
        // nullやundefinedの場合は空文字列に
        if (html == null) {
            element.textContent = '';
            return;
        }

        // 文字列でない場合は文字列に変換
        const htmlString = String(html);

        // 危険な要素を除去
        let cleanHTML = htmlString
            .replace(DANGEROUS_TAGS, '')
            .replace(EVENT_HANDLERS, '')
            .replace(JAVASCRIPT_PROTOCOL, '')
            .replace(DATA_BINDING, '');

        // DOMParserを使用してさらに安全に
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(cleanHTML, 'text/html');
            
            // scriptタグを再度チェックして削除
            const scripts = doc.querySelectorAll('script');
            scripts.forEach(script => script.remove());
            
            // イベントハンドラー属性を持つ要素をクリーン
            const allElements = doc.querySelectorAll('*');
            allElements.forEach(el => {
                // on*属性を削除
                Array.from(el.attributes).forEach(attr => {
                    if (attr.name.startsWith('on')) {
                        el.removeAttribute(attr.name);
                    }
                });
            });

            element.innerHTML = doc.body.innerHTML;
        } catch (e) {
            // パースエラーの場合はテキストとして設定
            element.textContent = htmlString;
        }
    };

    // テキストのみを安全に設定
    window.safeSetText = function(element, text) {
        if (!element) return;
        element.textContent = text || '';
    };

    // 属性を安全に設定
    window.safeSetAttribute = function(element, attribute, value) {
        if (!element || !attribute) return;
        
        // 危険な属性をブロック
        const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur'];
        const attrLower = attribute.toLowerCase();
        
        if (dangerousAttrs.includes(attrLower)) {
            console.warn('Blocked dangerous attribute:', attribute);
            return;
        }
        
        // href属性の場合はjavascript:をブロック
        if (attrLower === 'href' && value && value.toString().toLowerCase().includes('javascript:')) {
            console.warn('Blocked javascript: protocol in href');
            return;
        }
        
        element.setAttribute(attribute, value);
    };

    // クラスを安全に追加
    window.safeAddClass = function(element, className) {
        if (!element || !className) return;
        
        // クラス名のサニタイズ（英数字、ハイフン、アンダースコアのみ許可）
        const safeClassName = className.replace(/[^a-zA-Z0-9-_\s]/g, '');
        if (safeClassName) {
            element.classList.add(safeClassName);
        }
    };

    // データ属性を安全に設定
    window.safeSetData = function(element, key, value) {
        if (!element || !key) return;
        
        // キーのサニタイズ
        const safeKey = key.replace(/[^a-zA-Z0-9-]/g, '');
        if (safeKey) {
            element.dataset[safeKey] = value || '';
        }
    };

    // URLを安全に設定
    window.safeSetURL = function(element, url) {
        if (!element || !url) return;
        
        try {
            // URLの検証
            const urlObj = new URL(url, window.location.origin);
            
            // 許可されたプロトコルのみ
            const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
            if (!allowedProtocols.includes(urlObj.protocol)) {
                console.warn('Blocked unsafe protocol:', urlObj.protocol);
                return;
            }
            
            if (element.tagName === 'A') {
                element.href = urlObj.href;
                // 外部リンクの場合はrel属性を設定
                if (urlObj.origin !== window.location.origin) {
                    element.rel = 'noopener noreferrer';
                    element.target = '_blank';
                }
            } else if (element.tagName === 'IMG' || element.tagName === 'IFRAME') {
                element.src = urlObj.href;
            }
        } catch (e) {
            console.error('Invalid URL:', url);
        }
    };

    // HTMLエスケープ
    window.escapeHTML = function(str) {
        if (str == null) return '';
        
        sanitizerDiv.textContent = String(str);
        return sanitizerDiv.innerHTML;
    };

    // テンプレートリテラル用の安全なHTML生成
    window.safeHTML = function(strings, ...values) {
        let result = strings[0];
        
        for (let i = 0; i < values.length; i++) {
            result += escapeHTML(values[i]) + strings[i + 1];
        }
        
        return result;
    };

    // 既存のinnerHTML使用箇所を警告
    if (window.DEBUG_MODE) {
        const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
        Object.defineProperty(Element.prototype, 'innerHTML', {
            set: function(value) {
                console.warn('Direct innerHTML usage detected. Consider using safeSetHTML instead.');
                console.trace();
                originalInnerHTML.set.call(this, value);
            },
            get: originalInnerHTML.get
        });
    }

})();