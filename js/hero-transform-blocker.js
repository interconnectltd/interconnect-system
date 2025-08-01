/**
 * Hero Transform Blocker
 * すべてのtransform適用を完全にブロック
 */

(function() {
    'use strict';
    
    console.log('[HeroTransformBlocker] 初期化開始');
    
    // homepage-perfect-final.jsのfadeInElementsを無効化
    function disableFadeInElements() {
        // グローバルオブジェクトから無効化
        if (window.HomepagePerfectFinal && 
            window.HomepagePerfectFinal.PerfectAnimator) {
            window.HomepagePerfectFinal.PerfectAnimator.fadeInElements = function() {
                console.log('[HeroTransformBlocker] fadeInElementsを無効化');
                // セレクタの要素を即座に表示
                const elements = [
                    '.section-badge',
                    '.hero-buttons',
                    '.scroll-indicator'
                ];
                
                elements.forEach(selector => {
                    const el = document.querySelector(selector);
                    if (el) {
                        el.style.opacity = '1';
                        el.style.transform = 'none';
                        el.style.visibility = 'visible';
                    }
                });
            };
        }
        
        // ScrollEffectsも無効化
        if (window.HomepagePerfectFinal && 
            window.HomepagePerfectFinal.ScrollEffects) {
            window.HomepagePerfectFinal.ScrollEffects.init = function() {
                console.log('[HeroTransformBlocker] ScrollEffects.initを無効化');
            };
        }
    }
    
    // CSSStyleDeclarationのsetPropertyをオーバーライド
    function overrideStyleMethods() {
        const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
        CSSStyleDeclaration.prototype.setProperty = function(property, value, priority) {
            // transformプロパティをブロック
            if (property === 'transform' && this._parentElement) {
                const parent = this._parentElement;
                if (parent.matches('.section-badge, .hero-title, .hero-subtitle, .hero-buttons, .hero-buttons .btn')) {
                    console.log(`[HeroTransformBlocker] transform設定をブロック: ${parent.className}`);
                    return;
                }
            }
            return originalSetProperty.call(this, property, value, priority);
        };
        
        // styleプロパティに親要素の参照を追加
        const elements = document.querySelectorAll('.section-badge, .hero-title, .hero-subtitle, .hero-buttons, .hero-buttons .btn');
        elements.forEach(el => {
            if (el.style) {
                el.style._parentElement = el;
            }
        });
    }
    
    // transformを削除し続ける
    function removeAllTransforms() {
        const selectors = [
            '.hero-content',
            '.section-badge',
            '.hero-title',
            '.hero-subtitle',
            '.hero-buttons',
            '.hero-buttons .btn'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el.style.transform && el.style.transform !== 'none') {
                    console.log(`[HeroTransformBlocker] transform削除: ${selector}`);
                    el.style.transform = 'none';
                }
                
                // hero-contentの特別処理
                if (selector === '.hero-content') {
                    el.style.transform = 'translate(-50%, -50%)';
                }
            });
        });
    }
    
    // setTimeoutをインターセプト
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(callback, delay, ...args) {
        if (callback && typeof callback === 'function') {
            const callbackStr = callback.toString();
            // transformやtranslateYを含むコールバックをインターセプト
            if (callbackStr.includes('translateY') || 
                (callbackStr.includes('transform') && callbackStr.includes('hero'))) {
                console.log('[HeroTransformBlocker] transformアニメーションをブロック');
                // 代わりに即座に最終状態を適用
                return originalSetTimeout(() => {
                    const elements = document.querySelectorAll('.section-badge, .hero-buttons, .hero-title, .hero-subtitle');
                    elements.forEach(el => {
                        el.style.opacity = '1';
                        el.style.transform = 'none';
                        el.style.visibility = 'visible';
                    });
                }, 0);
            }
        }
        return originalSetTimeout.call(this, callback, delay, ...args);
    };
    
    // 初期化
    function init() {
        // 即座に実行
        disableFadeInElements();
        overrideStyleMethods();
        removeAllTransforms();
        
        // DOM準備完了時
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                disableFadeInElements();
                overrideStyleMethods();
                removeAllTransforms();
                
                // 継続的な監視
                setInterval(removeAllTransforms, 50);
            });
        } else {
            // 継続的な監視
            setInterval(removeAllTransforms, 50);
        }
        
        // 複数のタイミングで実行
        [0, 100, 300, 500, 1000, 2000].forEach(delay => {
            setTimeout(() => {
                disableFadeInElements();
                removeAllTransforms();
            }, delay);
        });
    }
    
    // 即座に実行
    init();
    
    console.log('[HeroTransformBlocker] 初期化完了');
    
})();