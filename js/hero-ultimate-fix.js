/**
 * Hero Ultimate Fix
 * 最終手段：すべての問題を力技で解決
 */

(function() {
    'use strict';
    
    console.log('[HeroUltimateFix] 究極の修正開始');
    
    // ステップ1: main.jsとhomepage-perfect-final.jsの実行を阻止
    window.initializeApp = function() {
        console.log('[HeroUltimateFix] initializeAppを無効化');
    };
    
    if (window.HomepagePerfectFinal) {
        Object.keys(window.HomepagePerfectFinal).forEach(key => {
            if (typeof window.HomepagePerfectFinal[key] === 'object') {
                Object.keys(window.HomepagePerfectFinal[key]).forEach(method => {
                    window.HomepagePerfectFinal[key][method] = function() {
                        console.log(`[HeroUltimateFix] ${key}.${method}を無効化`);
                    };
                });
            }
        });
    }
    
    // ステップ2: CSSを強制的に注入
    function injectCriticalCSS() {
        const style = document.createElement('style');
        style.id = 'hero-ultimate-css';
        style.textContent = `
            /* すべてを上書き */
            .hero {
                position: relative !important;
                width: 100% !important;
                height: 100vh !important;
                overflow: hidden !important;
                display: block !important;
            }
            
            .hero-content {
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                -webkit-transform: translate(-50%, -50%) !important;
                -moz-transform: translate(-50%, -50%) !important;
                -ms-transform: translate(-50%, -50%) !important;
                -o-transform: translate(-50%, -50%) !important;
                width: 100% !important;
                max-width: 1200px !important;
                padding: 0 20px !important;
                text-align: center !important;
                z-index: 9999 !important;
                display: block !important;
                opacity: 1 !important;
                visibility: visible !important;
            }
            
            /* display: blockを強制 */
            .section-badge,
            .hero-title,
            .hero-subtitle,
            .hero-buttons {
                display: block !important;
                opacity: 1 !important;
                visibility: visible !important;
                transform: none !important;
            }
            
            .section-badge {
                display: inline-block !important;
            }
            
            .hero-buttons {
                display: flex !important;
                justify-content: center !important;
                gap: 16px !important;
            }
            
            .hero-buttons .btn {
                display: inline-flex !important;
                opacity: 1 !important;
                transform: none !important;
            }
            
            /* ::afterを無効化 */
            .hero::after {
                display: none !important;
                content: none !important;
            }
        `;
        
        // 最初に挿入
        if (document.head.firstChild) {
            document.head.insertBefore(style, document.head.firstChild);
        } else {
            document.head.appendChild(style);
        }
    }
    
    // ステップ3: DOM操作を監視して阻止
    const originalQuerySelector = document.querySelector;
    document.querySelector = function(selector) {
        const element = originalQuerySelector.call(this, selector);
        
        if (element && selector === '.hero-content') {
            // hero-contentへのアクセスを監視
            return new Proxy(element, {
                get(target, prop) {
                    if (prop === 'style') {
                        return new Proxy(target.style, {
                            set(styleTarget, styleProp, value) {
                                if (styleProp === 'transform' && value !== 'translate(-50%, -50%)') {
                                    console.warn(`[HeroUltimateFix] transform設定をブロック: ${value}`);
                                    return true;
                                }
                                return Reflect.set(styleTarget, styleProp, value);
                            }
                        });
                    }
                    return target[prop];
                }
            });
        }
        
        return element;
    };
    
    // ステップ4: 強制的に正しい位置に設定
    function forceCorrectPosition() {
        const heroContent = originalQuerySelector.call(document, '.hero-content');
        if (!heroContent) return;
        
        // すべてのスタイルをリセット
        heroContent.removeAttribute('style');
        
        // 正しいスタイルを適用
        const styles = {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            maxWidth: '1200px',
            padding: '0 20px',
            textAlign: 'center',
            zIndex: '9999',
            display: 'block',
            opacity: '1',
            visibility: 'visible'
        };
        
        Object.assign(heroContent.style, styles);
        
        // 重要なプロパティを定義不可にする
        ['transform', 'position', 'top', 'left'].forEach(prop => {
            try {
                Object.defineProperty(heroContent.style, prop, {
                    value: styles[prop],
                    writable: false,
                    configurable: false
                });
            } catch (e) {
                // エラーは無視
            }
        });
    }
    
    // ステップ5: レンダリングループで強制
    function renderLoop() {
        forceCorrectPosition();
        requestAnimationFrame(renderLoop);
    }
    
    // ステップ6: 初期化
    function init() {
        console.log('[HeroUltimateFix] 初期化中...');
        
        // CSSを即座に注入
        injectCriticalCSS();
        
        // DOMContentLoadedを待つ
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                forceCorrectPosition();
                renderLoop();
            });
        } else {
            forceCorrectPosition();
            renderLoop();
        }
        
        // 複数のタイミングで実行
        [0, 100, 500, 1000, 2000].forEach(delay => {
            setTimeout(() => {
                injectCriticalCSS();
                forceCorrectPosition();
            }, delay);
        });
    }
    
    // 即座に実行
    init();
    
    console.log('[HeroUltimateFix] 初期化完了');
    
})();