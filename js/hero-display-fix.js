/**
 * Hero Display Fix
 * display: none !important を強制的に解除
 */

(function() {
    'use strict';
    
    console.log('[HeroDisplayFix] 初期化開始');
    
    // すべてのdisplay: noneを解除
    function fixDisplay() {
        const selectors = [
            '.hero',
            '.hero-content',
            '.hero-content .container',
            '.section-badge',
            '.hero-title',
            '.hero-subtitle',
            '.hero-buttons',
            '.hero-buttons .btn',
            '.hero-buttons .btn-primary',
            '.hero-buttons .btn-outline-light',
            '.btn',
            '[class*="btn-"]'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                // display: noneを強制解除
                if (window.getComputedStyle(el).display === 'none') {
                    el.style.display = '';
                    el.style.setProperty('display', 'block', 'important');
                    
                    // 特定の要素に適切なdisplay値を設定
                    if (selector === '.hero-buttons') {
                        el.style.setProperty('display', 'flex', 'important');
                    } else if (selector.includes('.btn')) {
                        el.style.setProperty('display', 'inline-flex', 'important');
                    } else if (selector === '.section-badge') {
                        el.style.setProperty('display', 'inline-block', 'important');
                    }
                }
                
                // opacity と visibility も修正
                el.style.setProperty('opacity', '1', 'important');
                el.style.setProperty('visibility', 'visible', 'important');
            });
        });
        
        console.log('[HeroDisplayFix] display修正完了');
    }
    
    // loading-completeクラスを強制追加
    function forceLoadingComplete() {
        if (!document.body.classList.contains('loading-complete')) {
            document.body.classList.add('loading-complete');
            console.log('[HeroDisplayFix] loading-completeクラス追加');
        }
        if (!document.body.classList.contains('instant-loading-complete')) {
            document.body.classList.add('instant-loading-complete');
            console.log('[HeroDisplayFix] instant-loading-completeクラス追加');
        }
    }
    
    // 競合するスタイルシートのルールを無効化
    function disableConflictingRules() {
        const styleSheets = Array.from(document.styleSheets);
        
        styleSheets.forEach(sheet => {
            try {
                const rules = Array.from(sheet.cssRules || []);
                rules.forEach((rule, index) => {
                    if (rule.selectorText && rule.style) {
                        // display: noneを含むルールを探す
                        if (rule.style.display === 'none' && (
                            rule.selectorText.includes('hero') ||
                            rule.selectorText.includes('section-badge') ||
                            rule.selectorText.includes('btn')
                        )) {
                            // ルールを削除
                            try {
                                sheet.deleteRule(index);
                                console.log(`[HeroDisplayFix] 削除: ${rule.selectorText}`);
                            } catch (e) {
                                // 削除できない場合は上書き
                                rule.style.display = 'block';
                            }
                        }
                    }
                });
            } catch (e) {
                // CORSエラーは無視
            }
        });
    }
    
    // 継続的な監視
    function continuousMonitoring() {
        setInterval(() => {
            fixDisplay();
            forceLoadingComplete();
        }, 100);
    }
    
    // 初期化
    function init() {
        // 即座に実行
        forceLoadingComplete();
        fixDisplay();
        disableConflictingRules();
        
        // DOM準備完了時
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    forceLoadingComplete();
                    fixDisplay();
                    disableConflictingRules();
                    continuousMonitoring();
                }, 0);
            });
        } else {
            setTimeout(() => {
                forceLoadingComplete();
                fixDisplay();
                disableConflictingRules();
                continuousMonitoring();
            }, 0);
        }
        
        // 複数のタイミングで実行
        [100, 300, 500, 1000, 2000].forEach(delay => {
            setTimeout(() => {
                forceLoadingComplete();
                fixDisplay();
            }, delay);
        });
    }
    
    // 即座に実行
    init();
    
    console.log('[HeroDisplayFix] 初期化完了');
    
})();