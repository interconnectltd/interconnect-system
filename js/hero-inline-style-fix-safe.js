/**
 * Hero Inline Style Fix Safe Version
 * インラインスタイルによるサイズ変更を防ぐ（パフォーマンス改善版）
 */

(function() {
    'use strict';
    
    console.log('[HeroInlineStyleFixSafe] 初期化開始');
    
    // 元のサイズ定義
    const FIXED_SIZES = {
        badge: {
            fontSize: '0.875rem',
            padding: '0.5rem 1.5rem'
        },
        button: {
            fontSize: '1.125rem',
            padding: '1rem 2.5rem'
        }
    };
    
    let isProcessing = false;
    
    // インラインスタイルをクリーンアップ（最適化版）
    function cleanInlineStyles() {
        if (isProcessing) return;
        isProcessing = true;
        
        try {
            // section-badgeの処理
            const badges = document.querySelectorAll('.section-badge:not(.hero-badge-fixed)');
            badges.forEach(badge => {
                const style = badge.getAttribute('style');
                if (style && (style.includes('font-size') || style.includes('padding'))) {
                    badge.removeAttribute('style');
                    badge.classList.add('hero-badge-fixed');
                }
            });
            
            // ボタンの処理
            const buttons = document.querySelectorAll('.hero-buttons .btn:not(.hero-button-fixed)');
            buttons.forEach(button => {
                const style = button.getAttribute('style');
                if (style && (style.includes('font-size') || style.includes('padding'))) {
                    // transitionだけ残す
                    const hasTransition = style.includes('transition');
                    button.removeAttribute('style');
                    if (hasTransition) {
                        button.style.transition = 'opacity 1s ease-out, transform 1s ease-out';
                    }
                    button.classList.add('hero-button-fixed');
                }
            });
        } finally {
            isProcessing = false;
        }
    }
    
    // CSSを追加
    const style = document.createElement('style');
    style.textContent = `
        /* 固定サイズクラス */
        .hero-badge-fixed {
            font-size: ${FIXED_SIZES.badge.fontSize} !important;
            padding: ${FIXED_SIZES.badge.padding} !important;
        }
        
        .hero-button-fixed {
            font-size: ${FIXED_SIZES.button.fontSize} !important;
            padding: ${FIXED_SIZES.button.padding} !important;
        }
        
        /* アイコンのサイズ */
        .hero-button-fixed i {
            font-size: 1.125rem !important;
            margin-right: 0.5rem !important;
        }
        
        /* モバイル対応 */
        @media (max-width: 768px) {
            .hero-badge-fixed {
                font-size: 0.75rem !important;
                padding: 0.375rem 1rem !important;
            }
            
            .hero-button-fixed {
                font-size: 1rem !important;
                padding: 0.875rem 2rem !important;
            }
        }
    `;
    document.head.appendChild(style);
    
    // 初期化
    function init() {
        cleanInlineStyles();
        
        // アニメーション完了後に一度だけチェック
        setTimeout(cleanInlineStyles, 2000);
        setTimeout(cleanInlineStyles, 5000);
    }
    
    // DOMContentLoadedで実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // ページ読み込み完了後に最終チェック
    window.addEventListener('load', () => {
        setTimeout(cleanInlineStyles, 1000);
    });
    
    console.log('[HeroInlineStyleFixSafe] 初期化完了');
    
})();