/**
 * Hero Complete Fix
 * すべてのヒーロー関連の問題を完全に修正
 */

(function() {
    'use strict';
    
    console.log('[HeroCompleteFix] 完全修正開始');
    
    // 他のスクリプトがヒーロー要素を変更するのを防ぐ
    function protectHeroElements() {
        const heroElements = [
            '.hero',
            '.hero-content', 
            '.hero-title',
            '.hero-subtitle',
            '.section-badge',
            '.hero-buttons',
            '.hero-buttons .btn'
        ];
        
        heroElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                // 既存のスタイルを削除
                if (el.hasAttribute('style')) {
                    el.removeAttribute('style');
                }
                
                // setAttributeをオーバーライド
                const originalSetAttribute = el.setAttribute;
                el.setAttribute = function(name, value) {
                    if (name === 'style') {
                        console.warn(`[HeroCompleteFix] ${selector}へのstyle属性の設定をブロック`);
                        return;
                    }
                    originalSetAttribute.call(this, name, value);
                };
                
                // styleプロパティへの直接アクセスをブロック
                Object.defineProperty(el, 'style', {
                    get: function() {
                        return {
                            setProperty: () => {},
                            removeProperty: () => {},
                            opacity: '',
                            transform: '',
                            transition: ''
                        };
                    },
                    set: function() {
                        console.warn(`[HeroCompleteFix] ${selector}のstyleプロパティへのアクセスをブロック`);
                    }
                });
            });
        });
    }
    
    // 特定のスクリプトの影響を無効化
    function disableConflictingScripts() {
        // homepage-loading-integration.jsなどの影響を無効化
        const originalQuerySelector = document.querySelector;
        const originalQuerySelectorAll = document.querySelectorAll;
        
        document.querySelector = function(selector) {
            // ヒーロー要素へのアクセスを監視
            if (selector && (
                selector.includes('.hero-title') ||
                selector.includes('.hero-subtitle') ||
                selector.includes('.hero-buttons') ||
                selector.includes('.section-badge')
            )) {
                // transformやopacityを設定しようとするスクリプトを検出
                const stack = new Error().stack;
                if (stack && (
                    stack.includes('homepage-loading') ||
                    stack.includes('homepage-all-conflicts') ||
                    stack.includes('scroll-fade')
                )) {
                    console.warn(`[HeroCompleteFix] ${selector}への不正なアクセスをブロック`);
                    return null;
                }
            }
            return originalQuerySelector.call(this, selector);
        };
    }
    
    // 定期的にスタイルをクリーンアップ
    function continuousCleanup() {
        setInterval(() => {
            const heroContent = document.querySelector('.hero-content');
            const sectionBadge = document.querySelector('.section-badge');
            const heroTitle = document.querySelector('.hero-title');
            const heroSubtitle = document.querySelector('.hero-subtitle');
            const heroButtons = document.querySelector('.hero-buttons');
            
            // スタイル属性を削除
            [heroContent, sectionBadge, heroTitle, heroSubtitle, heroButtons].forEach(el => {
                if (el && el.hasAttribute('style')) {
                    el.removeAttribute('style');
                }
            });
            
            // ボタンのスタイルも削除
            const buttons = document.querySelectorAll('.hero-buttons .btn');
            buttons.forEach(btn => {
                if (btn.hasAttribute('style')) {
                    btn.removeAttribute('style');
                }
            });
        }, 100); // 100msごとにチェック
    }
    
    // 初期化
    function init() {
        // DOM読み込み完了を待つ
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                protectHeroElements();
                disableConflictingScripts();
                continuousCleanup();
            });
        } else {
            protectHeroElements();
            disableConflictingScripts();
            continuousCleanup();
        }
    }
    
    // 即座に実行
    init();
    
    console.log('[HeroCompleteFix] 初期化完了 - 継続的な監視を開始');
    
})();