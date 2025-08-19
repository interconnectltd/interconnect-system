/**
 * Homepage Instant Hide
 * インラインスタイルで即座にコンテンツを非表示
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
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.8s ease-out;
        }
        
        /* ローディング完了フラグ */
        body.loading-complete .hero-content,
        body.loading-complete .section-badge,
        body.loading-complete .hero-subtitle,
        body.loading-complete .hero-buttons,
        body.loading-complete .btn-primary,
        body.loading-complete .btn-outline {
            opacity: 1;
            visibility: visible;
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
                heroContent.style.opacity = '0';
                heroContent.style.visibility = 'hidden';
                
                // 子要素も非表示（!importantは使わない）
                heroContent.querySelectorAll('*').forEach(el => {
                    el.style.opacity = '0';
                    el.style.visibility = 'hidden';
                });
            }
        });
    }
    
    // loading-completeクラスが追加されたら表示を戻す
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'class' &&
                document.body.classList.contains('loading-complete')) {
                
                // instant-loading-completeクラスは不要（loading-completeで統一）
                
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
    
})();