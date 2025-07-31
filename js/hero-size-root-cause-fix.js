/**
 * Hero Size Root Cause Fix
 * ヒーローセクションのサイズ問題の根本原因を修正
 * JavaScriptによる動的スタイル適用を監視・無効化
 */

(function() {
    'use strict';
    
    console.log('[HeroSizeRootCauseFix] 初期化開始');
    
    // 元のサイズ定義
    const ORIGINAL_SIZES = {
        badge: {
            fontSize: '0.875rem', // 14px
            padding: '0.5rem 1.5rem'
        },
        button: {
            fontSize: '1.125rem', // 18px
            padding: '1rem 2.5rem'
        }
    };
    
    // MutationObserverでスタイル変更を監視
    function protectElements() {
        // section-badge要素を保護
        const badges = document.querySelectorAll('.section-badge, .hero .section-badge, .hero-content .section-badge');
        badges.forEach(badge => {
            // インラインスタイルを削除
            badge.style.removeProperty('font-size');
            badge.style.removeProperty('padding');
            
            // MutationObserverで監視
            const observer = new MutationObserver(() => {
                if (badge.style.fontSize !== ORIGINAL_SIZES.badge.fontSize) {
                    console.log('[HeroSizeRootCauseFix] section-badgeのサイズ変更を検出、元に戻します');
                    badge.style.fontSize = ORIGINAL_SIZES.badge.fontSize;
                    badge.style.padding = ORIGINAL_SIZES.badge.padding;
                }
            });
            
            observer.observe(badge, {
                attributes: true,
                attributeFilter: ['style']
            });
        });
        
        // ボタン要素を保護
        const buttons = document.querySelectorAll('.hero-buttons .btn, .hero-buttons .btn-primary, .hero-buttons .btn-outline, .hero-buttons .btn-lg');
        buttons.forEach(button => {
            // インラインスタイルを削除
            button.style.removeProperty('font-size');
            button.style.removeProperty('padding');
            
            // MutationObserverで監視
            const observer = new MutationObserver(() => {
                if (button.style.fontSize !== ORIGINAL_SIZES.button.fontSize) {
                    console.log('[HeroSizeRootCauseFix] ボタンのサイズ変更を検出、元に戻します');
                    button.style.fontSize = ORIGINAL_SIZES.button.fontSize;
                    button.style.padding = ORIGINAL_SIZES.button.padding;
                }
            });
            
            observer.observe(button, {
                attributes: true,
                attributeFilter: ['style']
            });
        });
    }
    
    // アニメーション関数をオーバーライド
    const originalAnimate = Element.prototype.animate;
    Element.prototype.animate = function(keyframes, options) {
        // section-badgeやボタンのサイズ変更を含むアニメーションを検出
        if (this.classList.contains('section-badge') || 
            this.closest('.hero-buttons') ||
            this.classList.contains('btn')) {
            
            // keyframesからfont-sizeとpaddingを削除
            const filteredKeyframes = keyframes.map(frame => {
                const newFrame = {...frame};
                delete newFrame.fontSize;
                delete newFrame.padding;
                return newFrame;
            });
            
            console.log('[HeroSizeRootCauseFix] サイズ変更アニメーションをフィルタリング');
            return originalAnimate.call(this, filteredKeyframes, options);
        }
        
        return originalAnimate.call(this, keyframes, options);
    };
    
    // fadeIn系の関数をオーバーライド
    const originalFadeIn = window.fadeIn;
    if (originalFadeIn) {
        window.fadeIn = function(element, ...args) {
            const result = originalFadeIn.call(this, element, ...args);
            
            // fadeIn後にサイズを復元
            if (element && (element.classList.contains('section-badge') || element.closest('.hero-buttons'))) {
                setTimeout(() => {
                    protectElements();
                }, 100);
            }
            
            return result;
        };
    }
    
    // 強制的なCSS適用
    const style = document.createElement('style');
    style.textContent = `
        /* 最高優先度でサイズを固定 */
        .section-badge,
        .hero .section-badge,
        .hero-content .section-badge,
        span.section-badge,
        [class*="section-badge"] {
            font-size: ${ORIGINAL_SIZES.badge.fontSize} !important;
            padding: ${ORIGINAL_SIZES.badge.padding} !important;
        }
        
        .hero-buttons .btn,
        .hero-buttons .btn-primary,
        .hero-buttons .btn-outline,
        .hero-buttons .btn-lg,
        .hero-buttons a[class*="btn"] {
            font-size: ${ORIGINAL_SIZES.button.fontSize} !important;
            padding: ${ORIGINAL_SIZES.button.padding} !important;
        }
        
        /* アニメーション中もサイズを維持 */
        * {
            transition-property: opacity, transform, visibility !important;
        }
    `;
    document.head.appendChild(style);
    
    // DOMContentLoadedで初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', protectElements);
    } else {
        protectElements();
    }
    
    // 定期的にチェック（念のため）
    setInterval(protectElements, 1000);
    
    console.log('[HeroSizeRootCauseFix] 初期化完了');
    
})();