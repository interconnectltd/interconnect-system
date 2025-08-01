/**
 * Hero Stop All Conflicts
 * すべての競合を完全に停止し、シンプルなCSSのみで解決
 */

(function() {
    'use strict';
    
    console.log('[HeroStopConflicts] すべての競合を停止');
    
    // すべてのsetIntervalを停止
    let intervalId = window.setInterval(function() {}, 0);
    while (intervalId--) {
        window.clearInterval(intervalId);
    }
    
    // すべてのsetTimeoutを停止
    let timeoutId = window.setTimeout(function() {}, 0);
    while (timeoutId--) {
        window.clearTimeout(timeoutId);
    }
    
    // アニメーションフレームをキャンセル
    if (window.cancelAnimationFrame) {
        let rafId = 10000;
        while (rafId--) {
            try {
                window.cancelAnimationFrame(rafId);
            } catch (e) {}
        }
    }
    
    // 他のスクリプトの関数を無効化
    const scriptsToDisable = [
        'centerHeroContent',
        'ensureAllVisible',
        'setupContinuousMonitoring',
        'forceCorrectPosition',
        'fixHeroContent',
        'animateHeroTitle',
        'typewriter'
    ];
    
    scriptsToDisable.forEach(funcName => {
        if (window[funcName]) {
            window[funcName] = function() {
                console.log(`[HeroStopConflicts] ${funcName}を無効化`);
            };
        }
        
        // グローバルオブジェクト内も探す
        ['HeroFinalCenterFix', 'PerfectAnimator', 'HomepagePerfectFinal'].forEach(obj => {
            if (window[obj] && window[obj][funcName]) {
                window[obj][funcName] = function() {
                    console.log(`[HeroStopConflicts] ${obj}.${funcName}を無効化`);
                };
            }
        });
    });
    
    // MutationObserverをすべて停止
    const originalMO = window.MutationObserver;
    window.MutationObserver = function() {
        return {
            observe: function() {},
            disconnect: function() {},
            takeRecords: function() { return []; }
        };
    };
    
    // ResizeObserverも停止
    const originalRO = window.ResizeObserver;
    window.ResizeObserver = function() {
        return {
            observe: function() {},
            disconnect: function() {},
            unobserve: function() {}
        };
    };
    
    // 一度だけ正しいスタイルを適用
    function applyFinalStyles() {
        const heroContent = document.querySelector('.hero-content');
        if (!heroContent) return;
        
        // すべてのインラインスタイルを削除
        heroContent.removeAttribute('style');
        
        // シンプルなCSSクラスを追加
        heroContent.classList.add('hero-content-final');
        
        // 子要素もクリーンアップ
        const elements = heroContent.querySelectorAll('*');
        elements.forEach(el => {
            el.style.opacity = '';
            el.style.transform = '';
            el.style.visibility = '';
            el.style.animation = '';
            el.style.transition = '';
        });
        
        console.log('[HeroStopConflicts] 最終スタイル適用完了');
    }
    
    // DOMContentLoadedを待つ
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyFinalStyles);
    } else {
        applyFinalStyles();
    }
    
})();