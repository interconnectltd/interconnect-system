/**
 * Hero Conflict Eliminator
 * ヒーローセクションの競合を完全に排除
 */

(function() {
    'use strict';
    
    console.log('[HeroConflictEliminator] 初期化開始');
    
    // 競合を排除する関数
    function eliminateConflicts() {
        // hero-contentのインラインスタイルを削除
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            // スタイル属性を完全に削除
            heroContent.removeAttribute('style');
            
            // 正しいクラスのみ設定
            heroContent.className = 'hero-content';
            
            console.log('[HeroConflictEliminator] hero-contentのインラインスタイルを削除');
        }
        
        // セクションバッジの競合を修正
        const sectionBadge = document.querySelector('.section-badge');
        if (sectionBadge) {
            sectionBadge.removeAttribute('style');
            console.log('[HeroConflictEliminator] section-badgeのインラインスタイルを削除');
        }
        
        // ボタンの競合を修正
        const buttons = document.querySelectorAll('.hero-buttons .btn');
        buttons.forEach(btn => {
            btn.removeAttribute('style');
        });
        
        // ヒーロータイトルとサブタイトルの競合を修正
        const heroTitle = document.querySelector('.hero-title');
        const heroSubtitle = document.querySelector('.hero-subtitle');
        
        if (heroTitle) {
            heroTitle.removeAttribute('style');
        }
        
        if (heroSubtitle) {
            heroSubtitle.removeAttribute('style');
        }
        
        // 他のヒーロー関連要素のスタイルも削除
        const heroElements = document.querySelectorAll('.hero, .hero-video-container, .hero-video, .hero-overlay, .hero-buttons');
        heroElements.forEach(el => {
            if (el.hasAttribute('style')) {
                el.removeAttribute('style');
                console.log(`[HeroConflictEliminator] ${el.className}のインラインスタイルを削除`);
            }
        });
    }
    
    // MutationObserverで動的な変更を監視
    function setupObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const target = mutation.target;
                    if (target.matches('.hero-content, .section-badge, .hero-title, .hero-subtitle, .hero-buttons .btn')) {
                        console.log(`[HeroConflictEliminator] ${target.className}にスタイルが追加されたため削除`);
                        target.removeAttribute('style');
                    }
                }
            });
        });
        
        // 監視対象を設定
        const hero = document.querySelector('.hero');
        if (hero) {
            observer.observe(hero, {
                attributes: true,
                attributeFilter: ['style'],
                subtree: true
            });
        }
    }
    
    // 競合するCSSルールを無効化
    function disableConflictingRules() {
        const styleSheets = Array.from(document.styleSheets);
        
        styleSheets.forEach(sheet => {
            try {
                const rules = Array.from(sheet.cssRules || []);
                rules.forEach((rule, index) => {
                    // homepage-modern.cssとhomepage-complete.cssのヒーロー関連ルールを無効化
                    if (sheet.href && (sheet.href.includes('homepage-modern.css') || sheet.href.includes('homepage-complete.css'))) {
                        if (rule.selectorText && (
                            rule.selectorText.includes('.hero') ||
                            rule.selectorText.includes('.section-badge') ||
                            rule.selectorText.includes('.hero-content') ||
                            rule.selectorText.includes('.hero-title') ||
                            rule.selectorText.includes('.hero-subtitle') ||
                            rule.selectorText.includes('.hero-buttons')
                        )) {
                            // ルールを削除
                            sheet.deleteRule(index);
                            console.log(`[HeroConflictEliminator] 競合ルールを削除: ${rule.selectorText}`);
                        }
                    }
                });
            } catch (e) {
                // CORSエラーは無視
            }
        });
    }
    
    // 初期化
    function init() {
        // DOMが読み込まれたら実行
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                eliminateConflicts();
                setupObserver();
                disableConflictingRules();
            });
        } else {
            eliminateConflicts();
            setupObserver();
            disableConflictingRules();
        }
        
        // 念のため遅延実行も行う
        setTimeout(eliminateConflicts, 1000);
        setTimeout(eliminateConflicts, 3000);
        setTimeout(eliminateConflicts, 5000);
    }
    
    init();
    
    console.log('[HeroConflictEliminator] 初期化完了');
    
})();