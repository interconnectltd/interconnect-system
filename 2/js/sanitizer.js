/**
 * HTML Sanitizer - XSS攻撃を防ぐためのサニタイズ関数
 */

(function() {
    'use strict';

    // HTMLをエスケープする関数
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // 安全なHTMLタグのホワイトリスト
    const ALLOWED_TAGS = ['b', 'i', 'em', 'strong', 'span', 'br', 'p', 'div', 'a'];
    const ALLOWED_ATTRS = {
        'a': ['href', 'title', 'target', 'rel'],
        'span': ['class'],
        'div': ['class'],
        'p': ['class']
    };

    // シンプルなHTMLサニタイザー
    function sanitizeHtml(html) {
        if (typeof html !== 'string') return '';
        
        // 基本的なエスケープ
        let cleaned = html;
        
        // スクリプトタグを完全に削除
        cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // イベントハンドラを削除
        cleaned = cleaned.replace(/javascript:/gi, ''); // javascript: URLを削除
        
        return cleaned;
    }

    // DOMベースのサニタイザー（より安全）
    function sanitizeNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return document.createTextNode(node.textContent);
        }
        
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return null;
        }
        
        const tagName = node.tagName.toLowerCase();
        
        if (!ALLOWED_TAGS.includes(tagName)) {
            return null;
        }
        
        const newNode = document.createElement(tagName);
        
        // 許可された属性のみコピー
        if (ALLOWED_ATTRS[tagName]) {
            ALLOWED_ATTRS[tagName].forEach(attr => {
                if (node.hasAttribute(attr)) {
                    let value = node.getAttribute(attr);
                    
                    // href属性の場合、安全なURLのみ許可
                    if (attr === 'href') {
                        if (value.startsWith('http://') || 
                            value.startsWith('https://') || 
                            value.startsWith('#') ||
                            value.startsWith('/')) {
                            newNode.setAttribute(attr, value);
                        }
                    } else {
                        newNode.setAttribute(attr, value);
                    }
                }
            });
        }
        
        // 子ノードを再帰的にサニタイズ
        for (let child of node.childNodes) {
            const sanitizedChild = sanitizeNode(child);
            if (sanitizedChild) {
                newNode.appendChild(sanitizedChild);
            }
        }
        
        return newNode;
    }

    // 安全なinnerHTML設定関数
    function setInnerHTML(element, html) {
        if (!element) return;
        
        // 一時的なコンテナでパース
        const temp = document.createElement('div');
        temp.innerHTML = sanitizeHtml(html);
        
        // サニタイズされたノードを作成
        element.innerHTML = '';
        for (let child of temp.childNodes) {
            const sanitized = sanitizeNode(child);
            if (sanitized) {
                element.appendChild(sanitized);
            }
        }
    }

    // グローバルに公開
    window.INTERCONNECT = window.INTERCONNECT || {};
    window.INTERCONNECT.sanitizer = {
        escapeHtml: escapeHtml,
        sanitizeHtml: sanitizeHtml,
        setInnerHTML: setInnerHTML
    };

})();