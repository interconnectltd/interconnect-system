/**
 * Hero Consolidated JavaScript
 * すべてのヒーロー関連スクリプトを統合
 * 最終版：競合を排除した単一ファイル
 */

(function() {
    'use strict';
    
    console.log('[HeroConsolidated] 初期化開始');
    
    // インラインスタイルのクリーンアップ
    function cleanInlineStyles() {
        const elements = document.querySelectorAll('.section-badge, .hero-buttons .btn, .hero-content');
        
        elements.forEach(element => {
            if (element.classList.contains('section-badge')) {
                // バッジのインラインスタイルを削除
                if (element.style.width && element.style.width !== 'auto') {
                    element.style.removeProperty('width');
                }
                if (element.style.padding) {
                    element.style.removeProperty('padding');
                }
                if (element.style.fontSize) {
                    element.style.removeProperty('fontSize');
                }
            }
            
            if (element.classList.contains('btn')) {
                // ボタンのインラインスタイルを削除
                if (element.style.padding) {
                    element.style.removeProperty('padding');
                }
                if (element.style.fontSize) {
                    element.style.removeProperty('fontSize');
                }
                if (element.style.minWidth) {
                    element.style.removeProperty('min-width');
                }
            }
            
            if (element.classList.contains('hero-content')) {
                // transformスタイルを削除
                if (element.style.transform) {
                    element.style.removeProperty('transform');
                    element.style.removeProperty('top');
                    element.style.removeProperty('left');
                    element.style.position = 'relative';
                }
            }
        });
    }
    
    // ヒーローセクションの中央配置を強制
    function enforceCenter() {
        const heroContent = document.querySelector('.hero-content');
        const hero = document.querySelector('.hero');
        
        if (!heroContent || !hero) return;
        
        // heroセクションの設定を確認
        const heroStyles = window.getComputedStyle(hero);
        if (heroStyles.display !== 'flex' || heroStyles.alignItems !== 'center') {
            hero.style.display = 'flex';
            hero.style.alignItems = 'center';
            hero.style.justifyContent = 'center';
            hero.style.minHeight = '100vh';
        }
    }
    
    // 競合チェック（開発用）
    function checkConflicts() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const heroContent = document.querySelector('.hero-content');
            if (!heroContent) return;
            
            const computed = window.getComputedStyle(heroContent);
            const issues = [];
            
            if (computed.flexDirection === 'row') {
                issues.push('hero-content が横並び (flex-direction: row) になっています');
            }
            
            if (computed.transform && computed.transform !== 'none') {
                issues.push(`不要な transform が適用されています: ${computed.transform}`);
            }
            
            if (issues.length > 0) {
                console.warn('[HeroConsolidated] 検出された問題:');
                issues.forEach(issue => console.warn('  - ' + issue));
            }
        }
    }
    
    // MutationObserverでスタイル変更を監視
    function observeStyleChanges() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    cleanInlineStyles();
                }
            });
        });
        
        // 監視対象を設定
        const targets = document.querySelectorAll('.section-badge, .hero-buttons .btn, .hero-content');
        targets.forEach(target => {
            observer.observe(target, {
                attributes: true,
                attributeFilter: ['style']
            });
        });
    }
    
    // 初期化
    function init() {
        cleanInlineStyles();
        enforceCenter();
        checkConflicts();
        observeStyleChanges();
        
        // 追加のタイミングでも実行
        setTimeout(() => {
            cleanInlineStyles();
            enforceCenter();
        }, 2000);
        
        setTimeout(() => {
            cleanInlineStyles();
            checkConflicts();
        }, 5000);
    }
    
    // DOMContentLoadedで初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // ウィンドウリサイズ時にも確認
    window.addEventListener('resize', enforceCenter);
    
    console.log('[HeroConsolidated] 初期化完了');
    
})();