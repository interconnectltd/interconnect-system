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
        
        // ボタンのみ表示（テキストはタイプライター効果で表示）
        const buttons = document.querySelectorAll('.hero-buttons .btn');
        buttons.forEach(el => {
            el.style.opacity = '1';
            el.style.visibility = 'visible';
        });
    });
})();