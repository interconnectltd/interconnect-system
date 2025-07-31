/**
 * Homepage Instant Hide Fix
 * MutationObserverエラーを修正
 */

(function() {
    'use strict';
    
    // 最速でスタイルを適用
    const style = document.createElement('style');
    style.textContent = `
        /* ローディング完了まですべて非表示 */
        .hero-content,
        .section-badge,
        .hero-subtitle,
        .hero-buttons,
        .btn-primary,
        .btn-outline {
            opacity: 0 !important;
            visibility: hidden !important;
            display: none !important;
        }
        
        /* ローディング完了フラグ */
        body.instant-loading-complete .hero-content,
        body.instant-loading-complete .section-badge,
        body.instant-loading-complete .hero-subtitle,
        body.instant-loading-complete .hero-buttons,
        body.instant-loading-complete .btn-primary,
        body.instant-loading-complete .btn-outline {
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
        }
    `;
    
    // 最初の要素として挿入
    if (document.head.firstChild) {
        document.head.insertBefore(style, document.head.firstChild);
    } else {
        document.head.appendChild(style);
    }
    
    // DOMContentLoadedで確実に非表示
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const heroContent = document.querySelector('.hero-content');
            if (heroContent && !document.body.classList.contains('loading-complete')) {
                heroContent.style.cssText = 'opacity: 0 !important; visibility: hidden !important;';
                
                // 子要素も非表示
                heroContent.querySelectorAll('*').forEach(el => {
                    el.style.cssText = 'opacity: 0 !important; visibility: hidden !important;';
                });
            }
        });
    }
    
    // document.bodyが存在することを確認してからobserverを設定
    function setupObserver() {
        if (!document.body) {
            setTimeout(setupObserver, 10);
            return;
        }
        
        // loading-completeクラスが追加されたら表示を戻す
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'class' &&
                    document.body.classList.contains('loading-complete')) {
                    
                    document.body.classList.add('instant-loading-complete');
                    
                    const heroContent = document.querySelector('.hero-content');
                    if (heroContent) {
                        heroContent.style.cssText = '';
                        heroContent.querySelectorAll('*').forEach(el => {
                            el.style.cssText = '';
                        });
                    }
                    
                    observer.disconnect();
                }
            });
        });
        
        observer.observe(document.body, { attributes: true });
    }
    
    // DOMContentLoadedを待つ
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupObserver);
    } else {
        setupObserver();
    }
    
})();