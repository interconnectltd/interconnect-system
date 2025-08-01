/**
 * Hero Matrix Blocker
 * matrix変換を完全にブロックし、translate(-50%, -50%)を維持
 */

(function() {
    'use strict';
    
    console.log('[HeroMatrixBlocker] 初期化開始');
    
    // オリジナルのgetComputedStyleを保存
    const originalGetComputedStyle = window.getComputedStyle;
    
    // CSSStyleDeclarationのtransformプロパティをオーバーライド
    function overrideTransformProperty() {
        const originalDescriptor = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'transform');
        
        Object.defineProperty(CSSStyleDeclaration.prototype, 'transform', {
            get: function() {
                const value = originalDescriptor.get.call(this);
                
                // hero-contentの場合は常にtranslate(-50%, -50%)を返す
                if (this._element && this._element.classList && this._element.classList.contains('hero-content')) {
                    return 'translate(-50%, -50%)';
                }
                
                return value;
            },
            set: function(value) {
                // hero-contentへのtransform設定をインターセプト
                if (this._element && this._element.classList && this._element.classList.contains('hero-content')) {
                    console.log(`[HeroMatrixBlocker] transform設定をブロック: ${value}`);
                    // translate(-50%, -50%)以外は無視
                    if (value !== 'translate(-50%, -50%)') {
                        console.warn('[HeroMatrixBlocker] 不正なtransform値を拒否:', value);
                        value = 'translate(-50%, -50%)';
                    }
                }
                
                return originalDescriptor.set.call(this, value);
            },
            configurable: true
        });
    }
    
    // getComputedStyleをオーバーライド
    window.getComputedStyle = function(element, pseudoElt) {
        const style = originalGetComputedStyle.call(this, element, pseudoElt);
        
        // hero-contentの場合
        if (element.classList && element.classList.contains('hero-content')) {
            // transformプロパティを監視
            const originalTransform = style.transform;
            
            // matrix値を検出した場合、エラーとスタックトレースを出力
            if (originalTransform && originalTransform.includes('matrix')) {
                console.error(`[HeroMatrixBlocker] matrix値検出！`, originalTransform);
                console.trace();
                
                // Proxyでtransformプロパティをオーバーライド
                return new Proxy(style, {
                    get(target, prop) {
                        if (prop === 'transform') {
                            return 'translate(-50%, -50%)';
                        }
                        return target[prop];
                    }
                });
            }
        }
        
        return style;
    };
    
    // すべてのstyle要素とlink要素を監視
    function monitorStylesheets() {
        const checkStyleRule = (rule) => {
            if (rule.selectorText && rule.selectorText.includes('.hero-content')) {
                if (rule.style.transform && rule.style.transform !== 'translate(-50%, -50%)') {
                    console.warn(`[HeroMatrixBlocker] 不正なCSSルール検出: ${rule.selectorText} { transform: ${rule.style.transform} }`);
                    rule.style.transform = 'translate(-50%, -50%)';
                }
            }
        };
        
        // 既存のスタイルシートをチェック
        Array.from(document.styleSheets).forEach(sheet => {
            try {
                Array.from(sheet.cssRules || []).forEach(checkStyleRule);
            } catch (e) {
                // CORS エラーは無視
            }
        });
        
        // 新しいスタイル要素を監視
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === 'STYLE' || node.tagName === 'LINK') {
                        setTimeout(() => {
                            try {
                                if (node.sheet && node.sheet.cssRules) {
                                    Array.from(node.sheet.cssRules).forEach(checkStyleRule);
                                }
                            } catch (e) {
                                // CORS エラーは無視
                            }
                        }, 100);
                    }
                });
            });
        });
        
        observer.observe(document.head, { childList: true });
    }
    
    // hero-contentを強制的に修正
    function forceCorrectTransform() {
        const heroContent = document.querySelector('.hero-content');
        if (!heroContent) return;
        
        // styleオブジェクトに要素の参照を追加
        if (heroContent.style) {
            heroContent.style._element = heroContent;
        }
        
        // 現在の値をチェック
        const computed = window.getComputedStyle(heroContent);
        const currentTransform = computed.transform;
        
        if (currentTransform && currentTransform.includes('matrix')) {
            console.error(`[HeroMatrixBlocker] matrix値を修正: ${currentTransform} → translate(-50%, -50%)`);
            heroContent.style.transform = 'translate(-50%, -50%)';
        }
        
        // インラインスタイルを監視
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const newTransform = heroContent.style.transform;
                    if (newTransform && newTransform !== 'translate(-50%, -50%)') {
                        console.warn(`[HeroMatrixBlocker] インラインtransform変更を検出: ${newTransform}`);
                        console.trace();
                        heroContent.style.transform = 'translate(-50%, -50%)';
                    }
                }
            });
        });
        
        observer.observe(heroContent, {
            attributes: true,
            attributeFilter: ['style']
        });
    }
    
    // requestAnimationFrameをオーバーライド
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = function(callback) {
        return originalRAF.call(this, function() {
            const result = callback.apply(this, arguments);
            
            // 各フレームでhero-contentをチェック
            const heroContent = document.querySelector('.hero-content');
            if (heroContent && heroContent.style.transform !== 'translate(-50%, -50%)') {
                heroContent.style.transform = 'translate(-50%, -50%)';
            }
            
            return result;
        });
    };
    
    // 初期化
    function init() {
        overrideTransformProperty();
        monitorStylesheets();
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                forceCorrectTransform();
                
                // 定期的にチェック
                setInterval(forceCorrectTransform, 50);
            });
        } else {
            forceCorrectTransform();
            
            // 定期的にチェック
            setInterval(forceCorrectTransform, 50);
        }
    }
    
    // 即座に実行
    init();
    
    console.log('[HeroMatrixBlocker] 初期化完了 - matrix値を監視中');
    
})();