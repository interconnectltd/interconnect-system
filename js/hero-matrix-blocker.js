/**
 * Hero Matrix Blocker - Simplified
 * シンプルなアプローチでmatrix変換を防ぐ
 */

(function() {
    'use strict';
    
    console.log('[HeroMatrixBlocker] シンプル版初期化');
    
    // hero-contentを定期的に修正
    function fixHeroContent() {
        const heroContent = document.querySelector('.hero-content');
        if (!heroContent) return;
        
        // 現在のtransformをチェック
        const currentTransform = heroContent.style.transform;
        if (currentTransform && currentTransform !== 'translate(-50%, -50%)') {
            console.log('[HeroMatrixBlocker] transform修正:', currentTransform, '→ translate(-50%, -50%)');
            heroContent.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
        }
        
        // positionとその他の重要なスタイルも確認
        const styles = {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            maxWidth: '1200px',
            textAlign: 'center',
            zIndex: '10',
            display: 'block',
            opacity: '1',
            visibility: 'visible'
        };
        
        Object.keys(styles).forEach(prop => {
            if (heroContent.style[prop] !== styles[prop]) {
                heroContent.style.setProperty(prop, styles[prop], 'important');
            }
        });
    }
    
    // MutationObserverで変更を監視
    function observeChanges() {
        const heroContent = document.querySelector('.hero-content');
        if (!heroContent) return;
        
        const observer = new MutationObserver(() => {
            fixHeroContent();
        });
        
        observer.observe(heroContent, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }
    
    // 初期化
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                fixHeroContent();
                observeChanges();
                
                // 定期的にチェック（より頻度を下げる）
                setInterval(fixHeroContent, 500);
            });
        } else {
            fixHeroContent();
            observeChanges();
            
            // 定期的にチェック（より頻度を下げる）
            setInterval(fixHeroContent, 500);
        }
    }
    
    // 即座に実行
    init();
    
})();