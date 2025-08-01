/**
 * Animation Killer
 * 不要なアニメーションを完全に停止
 */

(function() {
    'use strict';
    
    console.log('[AnimationKiller] 初期化開始');
    
    function killAnimations() {
        // section-badgeのアニメーションを停止
        const badges = document.querySelectorAll('.section-badge, [class*="badge"]');
        badges.forEach(badge => {
            badge.style.animation = 'none';
            badge.style.animationPlayState = 'paused';
            badge.style.transform = 'none';
            
            // computedStyleでアニメーションが設定されているか確認
            const computed = window.getComputedStyle(badge);
            if (computed.animationName && computed.animationName !== 'none') {
                console.log('[AnimationKiller] アニメーションを検出:', computed.animationName);
                badge.style.setProperty('animation', 'none', 'important');
            }
        });
        
        // ヒーローセクション内のすべての要素
        const heroElements = document.querySelectorAll('.hero *, .hero-content *');
        heroElements.forEach(el => {
            const computed = window.getComputedStyle(el);
            if (computed.animationName && computed.animationName !== 'none') {
                el.style.setProperty('animation', 'none', 'important');
            }
        });
    }
    
    // MutationObserverで新しいアニメーションを監視
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const target = mutation.target;
                if (target.style.animation && target.style.animation !== 'none') {
                    if (target.classList.contains('section-badge') || 
                        target.closest('.hero') || 
                        target.classList.toString().includes('badge')) {
                        console.log('[AnimationKiller] 新しいアニメーションを停止');
                        target.style.animation = 'none';
                    }
                }
            }
        });
    });
    
    // 初期化
    function init() {
        killAnimations();
        
        // 監視開始
        const hero = document.querySelector('.hero');
        if (hero) {
            observer.observe(hero, {
                attributes: true,
                attributeFilter: ['style', 'class'],
                subtree: true
            });
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // 念のため定期的にチェック（最初の10秒間のみ）
    let checkCount = 0;
    const checkInterval = setInterval(() => {
        killAnimations();
        checkCount++;
        if (checkCount > 10) {
            clearInterval(checkInterval);
        }
    }, 1000);
    
    console.log('[AnimationKiller] 初期化完了');
    
})();