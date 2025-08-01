/**
 * Hero Ver.006 Restore
 * Ver.006と完全に一致させるための最終修正
 */

(function() {
    'use strict';
    
    console.log('[HeroVer006Restore] 初期化開始');
    
    // すべての競合スクリプトを無効化
    function disableAllConflicts() {
        // homepage-perfect-final.jsのfadeInElementsを無効化
        if (window.HomepagePerfectFinal && window.HomepagePerfectFinal.PerfectAnimator) {
            window.HomepagePerfectFinal.PerfectAnimator.fadeInElements = function() {
                console.log('[HeroVer006Restore] fadeInElementsを無効化');
            };
        }
        
        // 既存のMutationObserverを無効化
        const originalMutationObserver = window.MutationObserver;
        window.MutationObserver = function(callback) {
            const wrappedCallback = function(mutations, observer) {
                const filteredMutations = mutations.filter(mutation => {
                    const target = mutation.target;
                    // ヒーロー要素への変更をフィルタ
                    if (target && (
                        target.classList.contains('hero-content') ||
                        target.classList.contains('section-badge') ||
                        target.classList.contains('hero-title') ||
                        target.classList.contains('hero-subtitle') ||
                        target.classList.contains('hero-buttons') ||
                        target.classList.contains('btn')
                    )) {
                        return false;
                    }
                    return true;
                });
                
                if (filteredMutations.length > 0) {
                    callback(filteredMutations, observer);
                }
            };
            
            return new originalMutationObserver(wrappedCallback);
        };
        window.MutationObserver.prototype = originalMutationObserver.prototype;
    }
    
    // スタイルを完全にクリーンアップ
    function cleanupAllStyles() {
        const selectors = [
            '.hero',
            '.hero-content',
            '.section-badge',
            '.hero-title',
            '.hero-subtitle',
            '.hero-buttons',
            '.hero-buttons .btn',
            '.hero-video-container',
            '.hero-video',
            '.hero-overlay'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                // スタイル属性を削除
                if (el.hasAttribute('style')) {
                    el.removeAttribute('style');
                }
                
                // CSSアニメーションクラスを削除
                el.classList.remove('visible', 'animated', 'fadeIn', 'fadeInUp');
                
                // opacity, transform, transitionを強制リセット
                el.style.cssText = '';
            });
        });
        
        console.log('[HeroVer006Restore] すべてのスタイルをクリーンアップ');
    }
    
    // 特定の要素を確実に表示
    function ensureVisibility() {
        // セクションバッジ
        const badge = document.querySelector('.section-badge');
        if (badge) {
            badge.style.opacity = '1';
            badge.style.transform = 'none';
            badge.style.visibility = 'visible';
        }
        
        // タイトル
        const title = document.querySelector('.hero-title');
        if (title) {
            title.style.opacity = '1';
            title.style.transform = 'none';
            title.style.visibility = 'visible';
        }
        
        // サブタイトル
        const subtitle = document.querySelector('.hero-subtitle');
        if (subtitle) {
            subtitle.style.opacity = '1';
            subtitle.style.transform = 'none';
            subtitle.style.visibility = 'visible';
        }
        
        // ボタン
        const buttons = document.querySelector('.hero-buttons');
        if (buttons) {
            buttons.style.opacity = '1';
            buttons.style.transform = 'none';
            buttons.style.visibility = 'visible';
        }
        
        // 各ボタン
        const btnElements = document.querySelectorAll('.hero-buttons .btn');
        btnElements.forEach(btn => {
            btn.style.opacity = '1';
            btn.style.transform = 'none';
            btn.style.visibility = 'visible';
        });
    }
    
    // setTimeoutとsetIntervalをオーバーライド
    function overrideTimers() {
        const originalSetTimeout = window.setTimeout;
        const originalSetInterval = window.setInterval;
        
        window.setTimeout = function(callback, delay) {
            // ヒーロー要素に関するアニメーションをブロック
            if (callback && callback.toString().includes('translateY') || 
                callback.toString().includes('opacity') ||
                callback.toString().includes('hero-')) {
                console.log('[HeroVer006Restore] タイマーアニメーションをブロック');
                return -1;
            }
            return originalSetTimeout.apply(this, arguments);
        };
        
        window.setInterval = function(callback, delay) {
            // ヒーロー要素の定期的な変更をブロック
            if (callback && (callback.toString().includes('hero') || 
                callback.toString().includes('translateY'))) {
                console.log('[HeroVer006Restore] インターバルアニメーションをブロック');
                return -1;
            }
            return originalSetInterval.apply(this, arguments);
        };
    }
    
    // 継続的な監視
    function continuousMonitoring() {
        // 100ms毎にチェック
        setInterval(() => {
            const heroContent = document.querySelector('.hero-content');
            if (heroContent && heroContent.hasAttribute('style')) {
                heroContent.removeAttribute('style');
            }
            
            // 他の要素も確認
            const elements = document.querySelectorAll('.section-badge, .hero-title, .hero-subtitle, .hero-buttons, .hero-buttons .btn');
            elements.forEach(el => {
                if (el.hasAttribute('style')) {
                    const style = el.getAttribute('style');
                    if (style.includes('transform') || style.includes('opacity')) {
                        el.removeAttribute('style');
                        ensureVisibility();
                    }
                }
            });
        }, 100);
    }
    
    // 初期化
    function init() {
        // 競合を無効化
        disableAllConflicts();
        
        // タイマーをオーバーライド
        overrideTimers();
        
        // DOM準備完了時
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    cleanupAllStyles();
                    ensureVisibility();
                    continuousMonitoring();
                }, 100);
            });
        } else {
            setTimeout(() => {
                cleanupAllStyles();
                ensureVisibility();
                continuousMonitoring();
            }, 100);
        }
        
        // 念のため複数回実行
        [500, 1000, 2000, 3000, 5000].forEach(delay => {
            setTimeout(() => {
                cleanupAllStyles();
                ensureVisibility();
            }, delay);
        });
    }
    
    // 即座に実行
    init();
    
    console.log('[HeroVer006Restore] 初期化完了');
    
})();