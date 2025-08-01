/**
 * Hero Absolute Fix
 * 最終的な絶対修正
 */

(function() {
    'use strict';
    
    console.log('[HeroAbsoluteFix] 最終修正開始');
    
    // 斜めの::after要素を削除
    function removeSkewedAfter() {
        const style = document.createElement('style');
        style.textContent = `
            .hero::after {
                display: none !important;
                content: none !important;
            }
        `;
        document.head.appendChild(style);
        
        // 既存の::after要素も削除（念のため）
        const hero = document.querySelector('.hero');
        if (hero) {
            const computedStyle = window.getComputedStyle(hero, '::after');
            if (computedStyle && computedStyle.content !== 'none') {
                console.log('[HeroAbsoluteFix] ::after要素を削除');
            }
        }
    }
    
    // ヒーローコンテンツを強制的に中央配置
    function forceCenter() {
        const heroContent = document.querySelector('.hero-content');
        if (!heroContent) return;
        
        // すべてのスタイルをリセットして中央配置
        heroContent.style.cssText = `
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 100% !important;
            max-width: 1200px !important;
            padding: 0 20px !important;
            text-align: center !important;
            z-index: 2 !important;
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
            min-height: unset !important;
            align-items: unset !important;
            justify-content: unset !important;
        `;
        
        console.log('[HeroAbsoluteFix] hero-contentを中央配置');
    }
    
    // すべての要素を表示
    function showAllElements() {
        const selectors = [
            '.section-badge',
            '.hero-title',
            '.hero-subtitle',
            '.hero-buttons',
            '.hero-buttons .btn'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                // transformをリセット（ボタンのホバー以外）
                if (!selector.includes('.btn') || !el.matches(':hover')) {
                    el.style.transform = 'none';
                }
                el.style.opacity = '1';
                el.style.visibility = 'visible';
                
                // displayを適切に設定
                if (selector === '.hero-buttons') {
                    el.style.display = 'flex';
                } else if (selector.includes('.btn')) {
                    el.style.display = 'inline-flex';
                } else if (selector === '.section-badge') {
                    el.style.display = 'inline-block';
                } else {
                    el.style.display = 'block';
                }
            });
        });
    }
    
    // CSSルールを直接修正
    function modifyCSSRules() {
        const styleSheets = Array.from(document.styleSheets);
        
        styleSheets.forEach(sheet => {
            try {
                const rules = Array.from(sheet.cssRules || []);
                rules.forEach(rule => {
                    // .hero-contentのルールを修正
                    if (rule.selectorText === '.hero-content') {
                        rule.style.position = 'absolute';
                        rule.style.top = '50%';
                        rule.style.left = '50%';
                        rule.style.transform = 'translate(-50%, -50%)';
                        rule.style.display = 'block';
                        rule.style.padding = '0 20px';
                        rule.style.minHeight = 'unset';
                        console.log('[HeroAbsoluteFix] CSSルール修正: .hero-content');
                    }
                    
                    // .heroのflexを無効化
                    if (rule.selectorText === '.hero') {
                        rule.style.display = 'block';
                        rule.style.alignItems = 'unset';
                        rule.style.justifyContent = 'unset';
                        console.log('[HeroAbsoluteFix] CSSルール修正: .hero');
                    }
                    
                    // ::afterルールを無効化
                    if (rule.selectorText === '.hero::after') {
                        rule.style.display = 'none';
                        rule.style.content = 'none';
                        console.log('[HeroAbsoluteFix] CSSルール修正: .hero::after');
                    }
                });
            } catch (e) {
                // CORSエラーは無視
            }
        });
    }
    
    // 継続的な監視と修正
    function continuousEnforcement() {
        setInterval(() => {
            const heroContent = document.querySelector('.hero-content');
            if (heroContent) {
                const computed = window.getComputedStyle(heroContent);
                
                // 位置が正しくない場合は修正
                if (computed.position !== 'absolute' || 
                    computed.top !== '50%' || 
                    computed.left !== '50%' ||
                    !computed.transform.includes('translate(-50%, -50%)')) {
                    forceCenter();
                }
                
                // paddingが大きすぎる場合は修正
                const paddingTop = parseFloat(computed.paddingTop);
                if (paddingTop > 30) {
                    heroContent.style.paddingTop = '0';
                    heroContent.style.paddingBottom = '0';
                    console.log('[HeroAbsoluteFix] 余分なpaddingを削除');
                }
            }
            
            // その他の要素も確認
            showAllElements();
        }, 100);
    }
    
    // 初期化
    function init() {
        // 即座に実行
        removeSkewedAfter();
        forceCenter();
        showAllElements();
        modifyCSSRules();
        
        // DOM準備完了時
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                removeSkewedAfter();
                forceCenter();
                showAllElements();
                modifyCSSRules();
                continuousEnforcement();
            });
        } else {
            continuousEnforcement();
        }
        
        // 複数のタイミングで実行
        [0, 100, 300, 500, 1000, 2000].forEach(delay => {
            setTimeout(() => {
                removeSkewedAfter();
                forceCenter();
                showAllElements();
                modifyCSSRules();
            }, delay);
        });
    }
    
    // 即座に実行
    init();
    
    console.log('[HeroAbsoluteFix] 初期化完了');
    
})();