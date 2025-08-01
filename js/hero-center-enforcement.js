/**
 * Hero Center Enforcement
 * ヒーローコンテンツの中央配置を強制
 */

(function() {
    'use strict';
    
    console.log('[HeroCenterEnforcement] 初期化開始');
    
    function enforceCenter() {
        const heroContent = document.querySelector('.hero-content');
        const hero = document.querySelector('.hero');
        
        if (!heroContent || !hero) return;
        
        // 既存のtransformスタイルをクリア
        const existingStyle = heroContent.getAttribute('style');
        if (existingStyle && existingStyle.includes('transform') && !existingStyle.includes('translateY(-50%)')) {
            console.log('[HeroCenterEnforcement] 不正なtransformを検出、修正します');
            // transformだけを正しい値に置き換え
            heroContent.style.transform = 'translateY(-50%)';
            heroContent.style.top = '50%';
            heroContent.style.position = 'relative';
        }
        
        // heroセクションの設定を確認
        const heroStyles = window.getComputedStyle(hero);
        if (heroStyles.display !== 'flex' || heroStyles.alignItems !== 'center') {
            console.log('[HeroCenterEnforcement] heroセクションの配置を修正');
            hero.style.display = 'flex';
            hero.style.alignItems = 'center';
            hero.style.justifyContent = 'center';
            hero.style.minHeight = '100vh';
        }
    }
    
    // 初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enforceCenter);
    } else {
        enforceCenter();
    }
    
    // アニメーション後にも確認
    setTimeout(enforceCenter, 1000);
    setTimeout(enforceCenter, 3000);
    
    // ウィンドウリサイズ時にも確認
    window.addEventListener('resize', enforceCenter);
    
    console.log('[HeroCenterEnforcement] 初期化完了');
    
})();