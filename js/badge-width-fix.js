/**
 * Badge Width Fix
 * section-badgeの幅を文字に合わせて調整
 */

(function() {
    'use strict';
    
    console.log('[BadgeWidthFix] 初期化開始');
    
    function fixBadgeWidth() {
        const badges = document.querySelectorAll('.section-badge');
        badges.forEach(badge => {
            // インラインスタイルで幅が設定されている場合は削除
            if (badge.style.width || badge.style.minWidth || badge.style.maxWidth) {
                badge.style.removeProperty('width');
                badge.style.removeProperty('min-width');
                badge.style.removeProperty('max-width');
            }
            
            // 余分なパディングも調整
            const currentStyle = badge.getAttribute('style');
            if (currentStyle && currentStyle.includes('padding')) {
                // padding以外のスタイルを保持
                const styles = currentStyle.split(';').filter(s => {
                    const prop = s.split(':')[0].trim();
                    return prop !== 'padding' && prop !== 'padding-left' && prop !== 'padding-right';
                });
                badge.setAttribute('style', styles.join(';'));
            }
            
            // 固定クラスを追加
            badge.classList.add('badge-width-fixed');
        });
    }
    
    // CSSを追加
    const style = document.createElement('style');
    style.textContent = `
        .badge-width-fixed {
            width: auto !important;
            max-width: fit-content !important;
            min-width: auto !important;
            padding: 0.5rem 1.5rem !important;
            display: inline-block !important;
            box-sizing: border-box !important;
            white-space: nowrap !important;
        }
    `;
    document.head.appendChild(style);
    
    // 初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixBadgeWidth);
    } else {
        fixBadgeWidth();
    }
    
    // アニメーション後も確認
    setTimeout(fixBadgeWidth, 2000);
    setTimeout(fixBadgeWidth, 5000);
    
    console.log('[BadgeWidthFix] 初期化完了');
    
})();