/**
 * Hero Simple - 最小限の実装
 */

(function() {
    'use strict';
    
    // すぐに表示
    document.addEventListener('DOMContentLoaded', function() {
        // loading-completeクラスを即座に追加
        document.body.classList.add('loading-complete');
        
        // ヒーローコンテンツを確実に表示
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            heroContent.style.opacity = '1';
            heroContent.style.visibility = 'visible';
        }
        
        // すべての子要素も表示
        const elements = document.querySelectorAll('.section-badge, .hero-title, .hero-subtitle, .hero-buttons, .hero-buttons .btn');
        elements.forEach(el => {
            el.style.opacity = '1';
            el.style.visibility = 'visible';
        });
    });
})();