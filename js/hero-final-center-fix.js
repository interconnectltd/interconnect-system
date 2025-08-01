/**
 * Hero Final Center Fix
 * ヒーローコンテンツを画面の垂直中央に確実に配置
 */

(function() {
    'use strict';
    
    console.log('[HeroFinalCenterFix] 初期化開始');
    
    // ヒーローコンテンツを中央に配置
    function centerHeroContent() {
        const heroContent = document.querySelector('.hero-content');
        if (!heroContent) return;
        
        // インラインスタイルを削除
        heroContent.removeAttribute('style');
        
        // 正しい中央配置スタイルを適用
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
        `;
        
        console.log('[HeroFinalCenterFix] hero-contentを中央に配置');
    }
    
    // その他の要素の可視性を確保
    function ensureAllVisible() {
        const elements = [
            '.section-badge',
            '.hero-title',
            '.hero-subtitle',
            '.hero-buttons',
            '.hero-buttons .btn'
        ];
        
        elements.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) {
                // transformとopacityを削除
                const currentStyle = el.getAttribute('style') || '';
                const cleanedStyle = currentStyle
                    .replace(/transform\s*:\s*[^;]+;?/gi, '')
                    .replace(/opacity\s*:\s*[^;]+;?/gi, '')
                    .replace(/transition\s*:\s*[^;]+;?/gi, '')
                    .trim();
                
                if (cleanedStyle) {
                    el.setAttribute('style', cleanedStyle);
                } else {
                    el.removeAttribute('style');
                }
                
                // 可視性を確保
                el.style.opacity = '1';
                el.style.visibility = 'visible';
            }
        });
    }
    
    // 継続的な監視と修正
    function setupContinuousMonitoring() {
        // 50ms毎にチェック（より頻繁に）
        setInterval(() => {
            const heroContent = document.querySelector('.hero-content');
            if (heroContent) {
                const currentTransform = heroContent.style.transform;
                // 正しいtransform値でない場合は修正
                if (currentTransform !== 'translate(-50%, -50%)') {
                    centerHeroContent();
                }
            }
            
            // 他の要素も確認
            ensureAllVisible();
        }, 50);
    }
    
    // ResizeObserverで画面サイズ変更を検知
    function setupResizeObserver() {
        const heroContent = document.querySelector('.hero-content');
        if (!heroContent) return;
        
        const resizeObserver = new ResizeObserver(() => {
            centerHeroContent();
        });
        
        resizeObserver.observe(heroContent);
    }
    
    // 初期化
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    centerHeroContent();
                    ensureAllVisible();
                    setupContinuousMonitoring();
                    setupResizeObserver();
                }, 0);
            });
        } else {
            setTimeout(() => {
                centerHeroContent();
                ensureAllVisible();
                setupContinuousMonitoring();
                setupResizeObserver();
            }, 0);
        }
        
        // 複数のタイミングで実行
        [100, 300, 500, 1000, 2000, 3000].forEach(delay => {
            setTimeout(() => {
                centerHeroContent();
                ensureAllVisible();
            }, delay);
        });
    }
    
    // 即座に実行
    init();
    
    // グローバルに公開（デバッグ用）
    window.HeroFinalCenterFix = {
        centerHeroContent,
        ensureAllVisible
    };
    
    console.log('[HeroFinalCenterFix] 初期化完了');
    
})();