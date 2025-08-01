/**
 * Hero Inline Style Fix
 * インラインスタイルによるサイズ変更を完全に防ぐ
 */

(function() {
    'use strict';
    
    console.log('[HeroInlineStyleFix] 初期化開始');
    
    // 元のサイズ定義（絶対に変更させない）
    const FIXED_SIZES = {
        badge: {
            fontSize: '0.875rem', // 14px
            padding: '0.5rem 1.5rem',
            width: 'auto',
            height: 'auto'
        },
        button: {
            fontSize: '1.125rem', // 18px  
            padding: '1rem 2.5rem',
            width: 'auto',
            height: 'auto'
        }
    };
    
    // インラインスタイルを削除してCSSクラスを適用
    function cleanInlineStyles() {
        // section-badgeの処理
        const badges = document.querySelectorAll('.section-badge');
        badges.forEach(badge => {
            // すべてのスタイル属性を削除
            badge.removeAttribute('style');
            
            // 固定クラスを追加
            badge.classList.add('hero-badge-fixed');
        });
        
        // ボタンの処理
        const buttons = document.querySelectorAll('.hero-buttons .btn, .hero-buttons a[href*="#"]');
        buttons.forEach(button => {
            // スタイル属性から不要なものを削除
            if (button.style) {
                // transitionプロパティ以外を削除
                const transition = button.style.transition;
                button.removeAttribute('style');
                if (transition && !transition.includes('font-size') && !transition.includes('padding')) {
                    button.style.transition = 'opacity 1s ease-out, transform 1s ease-out';
                }
            }
            
            // 固定クラスを追加
            button.classList.add('hero-button-fixed');
        });
    }
    
    // MutationObserverで変更を監視
    function setupObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const target = mutation.target;
                    
                    // section-badgeの場合
                    if (target.classList.contains('section-badge')) {
                        const currentStyle = target.getAttribute('style');
                        if (currentStyle && (currentStyle.includes('font-size') || currentStyle.includes('padding'))) {
                            console.log('[HeroInlineStyleFix] section-badgeのスタイル変更を検出、修正します');
                            
                            // スタイルを解析して必要な部分だけ残す
                            const styles = currentStyle.split(';').filter(s => s.trim());
                            const allowedStyles = styles.filter(s => {
                                const prop = s.split(':')[0].trim();
                                return prop !== 'font-size' && prop !== 'padding' && prop !== 'width' && prop !== 'height';
                            });
                            
                            target.setAttribute('style', allowedStyles.join(';'));
                        }
                    }
                    
                    // ボタンの場合
                    if (target.closest('.hero-buttons')) {
                        const currentStyle = target.getAttribute('style');
                        if (currentStyle && (currentStyle.includes('font-size') || currentStyle.includes('padding'))) {
                            console.log('[HeroInlineStyleFix] ボタンのスタイル変更を検出、修正します');
                            
                            // スタイルを解析して必要な部分だけ残す
                            const styles = currentStyle.split(';').filter(s => s.trim());
                            const allowedStyles = styles.filter(s => {
                                const prop = s.split(':')[0].trim();
                                return prop !== 'font-size' && prop !== 'padding' && prop !== 'width' && prop !== 'height';
                            });
                            
                            target.setAttribute('style', allowedStyles.join(';'));
                        }
                    }
                }
            });
        });
        
        // 監視対象を設定
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            observer.observe(heroContent, {
                attributes: true,
                attributeFilter: ['style'],
                subtree: true
            });
        }
    }
    
    // CSSを追加（最高優先度）
    const style = document.createElement('style');
    style.textContent = `
        /* 固定サイズクラス */
        .hero-badge-fixed,
        .section-badge.hero-badge-fixed,
        span.section-badge.hero-badge-fixed {
            font-size: ${FIXED_SIZES.badge.fontSize} !important;
            padding: ${FIXED_SIZES.badge.padding} !important;
            width: ${FIXED_SIZES.badge.width} !important;
            height: ${FIXED_SIZES.badge.height} !important;
            max-width: none !important;
            min-width: auto !important;
            display: inline-block !important;
            box-sizing: border-box !important;
        }
        
        .hero-button-fixed,
        .hero-buttons .btn.hero-button-fixed,
        .hero-buttons a.hero-button-fixed {
            font-size: ${FIXED_SIZES.button.fontSize} !important;
            padding: ${FIXED_SIZES.button.padding} !important;
            width: ${FIXED_SIZES.button.width} !important;
            height: ${FIXED_SIZES.button.height} !important;
            max-width: none !important;
            min-width: auto !important;
            display: inline-block !important;
            box-sizing: border-box !important;
        }
        
        /* transitionからサイズ関連を除外 */
        .hero-badge-fixed,
        .hero-button-fixed {
            transition-property: opacity, transform, visibility, color, background-color !important;
        }
        
        /* アイコンのサイズも固定 */
        .hero-button-fixed i,
        .hero-buttons .btn i {
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
        setupObserver();
        
        // 定期的にチェック（アニメーション後の変更に対応）
        setInterval(cleanInlineStyles, 500);
    }
    
    // DOMContentLoadedとload両方で実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // ページ読み込み完了後も再実行
    window.addEventListener('load', () => {
        setTimeout(init, 100);
    });
    
    console.log('[HeroInlineStyleFix] 初期化完了');
    
})();