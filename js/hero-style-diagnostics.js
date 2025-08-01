/**
 * Hero Style Diagnostics
 * ヒーロー要素のスタイル状態を診断
 */

(function() {
    'use strict';
    
    console.log('[HeroStyleDiagnostics] 診断開始');
    
    function diagnose() {
        const elements = {
            'hero': document.querySelector('.hero'),
            'hero-content': document.querySelector('.hero-content'),
            'section-badge': document.querySelector('.section-badge'),
            'hero-title': document.querySelector('.hero-title'),
            'hero-subtitle': document.querySelector('.hero-subtitle'),
            'hero-buttons': document.querySelector('.hero-buttons')
        };
        
        console.log('\n=== ヒーロー要素診断結果 ===');
        
        Object.entries(elements).forEach(([name, el]) => {
            if (!el) {
                console.warn(`❌ ${name}: 要素が見つかりません`);
                return;
            }
            
            const computed = window.getComputedStyle(el);
            const inline = el.getAttribute('style') || 'なし';
            
            console.log(`\n📍 ${name}:`);
            console.log(`  インラインスタイル: ${inline}`);
            console.log(`  display: ${computed.display}`);
            console.log(`  opacity: ${computed.opacity}`);
            console.log(`  visibility: ${computed.visibility}`);
            console.log(`  transform: ${computed.transform}`);
            console.log(`  position: ${computed.position}`);
            
            // 問題をチェック
            const issues = [];
            
            if (computed.display === 'none') {
                issues.push('display: noneになっています');
            }
            if (computed.opacity === '0') {
                issues.push('opacity: 0になっています');
            }
            if (computed.visibility === 'hidden') {
                issues.push('visibility: hiddenになっています');
            }
            if (computed.transform && computed.transform !== 'none' && name !== 'hero-content') {
                issues.push(`transformが適用されています: ${computed.transform}`);
            }
            
            if (issues.length > 0) {
                console.warn(`  ⚠️ 問題: ${issues.join(', ')}`);
            } else {
                console.log(`  ✅ 正常`);
            }
        });
        
        // body のクラスをチェック
        console.log('\n📍 body クラス:');
        console.log(`  loading-complete: ${document.body.classList.contains('loading-complete')}`);
        console.log(`  instant-loading-complete: ${document.body.classList.contains('instant-loading-complete')}`);
        
        // 読み込まれているスクリプトをチェック
        console.log('\n📍 読み込まれているスクリプト:');
        const scripts = Array.from(document.scripts);
        const heroScripts = scripts.filter(s => s.src && (
            s.src.includes('hero') || 
            s.src.includes('homepage-perfect') ||
            s.src.includes('homepage-loading')
        ));
        
        heroScripts.forEach(s => {
            const filename = s.src.split('/').pop();
            console.log(`  - ${filename}`);
        });
        
        console.log('\n=== 診断終了 ===\n');
    }
    
    // 初回診断
    setTimeout(diagnose, 1000);
    
    // コンソールから実行可能にする
    window.heroStyleDiagnostics = diagnose;
    
    console.log('[HeroStyleDiagnostics] コンソールから window.heroStyleDiagnostics() で診断を実行できます');
    
})();