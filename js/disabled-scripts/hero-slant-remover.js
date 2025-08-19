/**
 * Hero Slant Line Remover
 * 斜め線を動的に削除
 */

document.addEventListener('DOMContentLoaded', function() {
    // スタイルシートに直接ルールを追加
    const style = document.createElement('style');
    style.textContent = `
        .hero::after,
        .hero::before {
            display: none !important;
            content: none !important;
            visibility: hidden !important;
            background: transparent !important;
        }
    `;
    document.head.appendChild(style);
    
    // 既存のスタイルシートから斜め線のルールを削除
    for (let sheet of document.styleSheets) {
        try {
            const rules = sheet.cssRules || sheet.rules;
            for (let i = rules.length - 1; i >= 0; i--) {
                const rule = rules[i];
                if (rule.selectorText && 
                    (rule.selectorText.includes('.hero::after') || 
                     rule.selectorText.includes('.hero::before'))) {
                    if (rule.style.background && rule.style.background.includes('white')) {
                        sheet.deleteRule(i);
                    }
                }
            }
        } catch (e) {
            // クロスオリジンのスタイルシートはスキップ
        }
    }
    
    // DOMの監視
    const observer = new MutationObserver(function(mutations) {
        const hero = document.querySelector('.hero');
        if (hero) {
            // インラインスタイルで強制的に削除
            const afterStyle = window.getComputedStyle(hero, '::after');
            if (afterStyle.background && afterStyle.background.includes('white')) {
                style.textContent += `
                    .hero::after {
                        display: none !important;
                    }
                `;
            }
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});