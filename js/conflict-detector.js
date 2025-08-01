/**
 * Conflict Detector
 * 競合するスタイルを検出してログに記録
 */

(function() {
    'use strict';
    
    console.log('[ConflictDetector] 競合チェック開始');
    
    function checkConflicts() {
        const heroContent = document.querySelector('.hero-content');
        if (!heroContent) return;
        
        // computedStyleを取得
        const computed = window.getComputedStyle(heroContent);
        
        // 問題のあるスタイルをチェック
        const issues = [];
        
        // flex-directionチェック
        if (computed.flexDirection === 'row') {
            issues.push('hero-content が横並び (flex-direction: row) になっています');
        }
        
        // displayチェック
        if (computed.display !== 'flex' && computed.display !== 'block') {
            issues.push(`hero-content の display が異常です: ${computed.display}`);
        }
        
        // transformチェック
        if (computed.transform && computed.transform !== 'none') {
            issues.push(`不要な transform が適用されています: ${computed.transform}`);
        }
        
        // 子要素のチェック
        const children = heroContent.children;
        for (let child of children) {
            const childComputed = window.getComputedStyle(child);
            if (childComputed.display === 'inline' || childComputed.display === 'inline-block') {
                if (!child.classList.contains('btn') && !child.classList.contains('section-badge')) {
                    issues.push(`${child.className} が inline/inline-block になっています`);
                }
            }
        }
        
        // 問題があれば報告
        if (issues.length > 0) {
            console.warn('[ConflictDetector] 検出された問題:');
            issues.forEach(issue => console.warn('  - ' + issue));
        } else {
            console.log('[ConflictDetector] 競合は検出されませんでした');
        }
        
        // 適用されているスタイルシートを確認
        const styleSheets = Array.from(document.styleSheets);
        const heroStyles = [];
        
        styleSheets.forEach(sheet => {
            try {
                const rules = Array.from(sheet.cssRules || []);
                rules.forEach(rule => {
                    if (rule.selectorText && rule.selectorText.includes('hero')) {
                        heroStyles.push({
                            file: sheet.href || 'inline',
                            selector: rule.selectorText,
                            styles: rule.style.cssText
                        });
                    }
                });
            } catch (e) {
                // CORSエラーは無視
            }
        });
        
        console.log('[ConflictDetector] Hero関連のスタイル数:', heroStyles.length);
    }
    
    // 実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkConflicts);
    } else {
        checkConflicts();
    }
    
    // 3秒後にも再チェック
    setTimeout(checkConflicts, 3000);
    
})();