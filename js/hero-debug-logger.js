/**
 * Hero Debug Logger
 * ヒーロー要素の変更を超詳細にログ記録
 */

(function() {
    'use strict';
    
    console.log('%c[HeroDebugLogger] 開始', 'background: #ff0000; color: #ffffff; font-weight: bold;');
    
    // 監視対象の要素
    const targetSelectors = [
        '.hero',
        '.hero-content',
        '.section-badge',
        '.hero-title', 
        '.hero-subtitle',
        '.hero-buttons'
    ];
    
    // スタイル変更を記録
    function logStyleChange(element, property, oldValue, newValue, source) {
        console.log(`%c[StyleChange] ${element.className || element.tagName}`, 'color: #ff6600; font-weight: bold;');
        console.log(`  プロパティ: ${property}`);
        console.log(`  変更前: ${oldValue}`);
        console.log(`  変更後: ${newValue}`);
        console.log(`  発生源: ${source}`);
        console.trace();
    }
    
    // MutationObserverで監視
    function setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const target = mutation.target;
                    const oldStyle = mutation.oldValue || '';
                    const newStyle = target.getAttribute('style') || '';
                    
                    console.log(`%c[MutationObserver] スタイル変更検出: ${target.className}`, 'color: #0066ff; font-weight: bold;');
                    console.log(`  変更前: ${oldStyle}`);
                    console.log(`  変更後: ${newStyle}`);
                    
                    // 特定のプロパティの変更を検出
                    if (newStyle.includes('transform') || newStyle.includes('opacity') || newStyle.includes('display')) {
                        console.log('%c  ⚠️ 重要なプロパティが変更されました！', 'color: #ff0000; font-weight: bold;');
                    }
                }
            });
        });
        
        // 各要素を監視
        targetSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                observer.observe(element, {
                    attributes: true,
                    attributeOldValue: true,
                    attributeFilter: ['style', 'class']
                });
                console.log(`%c[Observer] ${selector} の監視開始`, 'color: #00ff00;');
            }
        });
    }
    
    // CSSStyleDeclarationをプロキシでラップ
    function wrapStyleProperty() {
        targetSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (!element) return;
            
            const originalStyle = element.style;
            const handler = {
                set(target, property, value) {
                    const oldValue = target[property];
                    console.log(`%c[StyleProxy] ${selector}.style.${property} = ${value}`, 'color: #ff00ff; font-weight: bold;');
                    
                    // 重要なプロパティの変更を警告
                    if (['transform', 'opacity', 'display', 'visibility'].includes(property)) {
                        console.warn(`%c⚠️ 重要: ${property}が変更されようとしています！`, 'background: #ff0000; color: #ffffff;');
                        console.trace();
                    }
                    
                    return Reflect.set(target, property, value);
                }
            };
            
            try {
                Object.defineProperty(element, 'style', {
                    get() {
                        return new Proxy(originalStyle, handler);
                    }
                });
            } catch (e) {
                console.log(`Proxyセットアップエラー: ${selector}`, e);
            }
        });
    }
    
    // setAttributeをオーバーライド
    function overrideSetAttribute() {
        const originalSetAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name, value) {
            if (name === 'style' && targetSelectors.some(sel => this.matches(sel))) {
                console.log(`%c[setAttribute] ${this.className}.setAttribute('style', '${value}')`, 'color: #9900ff; font-weight: bold;');
                console.trace();
            }
            return originalSetAttribute.call(this, name, value);
        };
    }
    
    // setTimeoutとsetIntervalを監視
    function monitorTimers() {
        const originalSetTimeout = window.setTimeout;
        const originalSetInterval = window.setInterval;
        
        window.setTimeout = function(callback, delay, ...args) {
            const callbackStr = callback.toString();
            if (callbackStr.includes('hero') || callbackStr.includes('transform') || callbackStr.includes('opacity')) {
                console.log(`%c[setTimeout] ヒーロー関連のタイマー設定 (${delay}ms)`, 'color: #ff9900; font-weight: bold;');
                console.log(`  コールバック: ${callbackStr.substring(0, 100)}...`);
            }
            return originalSetTimeout.call(this, callback, delay, ...args);
        };
        
        window.setInterval = function(callback, delay, ...args) {
            const callbackStr = callback.toString();
            if (callbackStr.includes('hero') || callbackStr.includes('transform') || callbackStr.includes('opacity')) {
                console.log(`%c[setInterval] ヒーロー関連のインターバル設定 (${delay}ms)`, 'color: #ff6600; font-weight: bold;');
                console.log(`  コールバック: ${callbackStr.substring(0, 100)}...`);
            }
            return originalSetInterval.call(this, callback, delay, ...args);
        };
    }
    
    // アニメーションAPIを監視
    function monitorAnimations() {
        if (Element.prototype.animate) {
            const originalAnimate = Element.prototype.animate;
            Element.prototype.animate = function(...args) {
                if (targetSelectors.some(sel => this.matches(sel))) {
                    console.log(`%c[Animation] ${this.className}.animate()`, 'color: #00ffff; font-weight: bold;');
                    console.log('  キーフレーム:', args[0]);
                    console.log('  オプション:', args[1]);
                }
                return originalAnimate.apply(this, args);
            };
        }
    }
    
    // 定期的な状態チェック
    function periodicCheck() {
        console.log('%c[定期チェック] ===== 現在の状態 =====', 'background: #333; color: #fff; font-weight: bold;');
        
        targetSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (!element) {
                console.log(`  ${selector}: 要素なし`);
                return;
            }
            
            const computed = window.getComputedStyle(element);
            const inline = element.getAttribute('style') || 'なし';
            
            console.log(`  ${selector}:`);
            console.log(`    インライン: ${inline}`);
            console.log(`    display: ${computed.display}`);
            console.log(`    opacity: ${computed.opacity}`);
            console.log(`    transform: ${computed.transform}`);
            console.log(`    visibility: ${computed.visibility}`);
            
            // 問題があれば警告
            if (computed.display === 'none' || computed.opacity === '0' || computed.visibility === 'hidden') {
                console.warn(`    ⚠️ 表示されていません！`);
            }
        });
        
        console.log('================================');
    }
    
    // 初期化
    function init() {
        console.log('%c[HeroDebugLogger] 初期化中...', 'background: #00ff00; color: #000; font-weight: bold;');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setupMutationObserver();
                wrapStyleProperty();
                overrideSetAttribute();
                monitorTimers();
                monitorAnimations();
                
                // 定期チェック開始
                setInterval(periodicCheck, 2000);
                
                // 初回チェック
                setTimeout(periodicCheck, 1000);
            });
        } else {
            setupMutationObserver();
            wrapStyleProperty();
            overrideSetAttribute();
            monitorTimers();
            monitorAnimations();
            
            // 定期チェック開始
            setInterval(periodicCheck, 2000);
            
            // 初回チェック
            setTimeout(periodicCheck, 1000);
        }
    }
    
    // 即座に実行
    init();
    
    // グローバルに公開
    window.heroDebugLogger = {
        check: periodicCheck,
        logEnabled: true
    };
    
    console.log('%c[HeroDebugLogger] セットアップ完了', 'background: #00ff00; color: #000; font-weight: bold;');
    console.log('手動チェック: window.heroDebugLogger.check()');
    
})();