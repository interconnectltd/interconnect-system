/**
 * Matching Perfect Test
 * 完璧な統合のテストスクリプト
 */

(function() {
    'use strict';
    
    console.log('[PerfectTest] 🧪 マッチングページのテストを開始');
    
    // 5秒後にステータスチェック
    setTimeout(() => {
        console.log('[PerfectTest] === ステータスチェック ===');
        
        // 1. matchingPerfectIntegrationの存在確認
        if (window.matchingPerfectIntegration) {
            console.log('[PerfectTest] ✅ matchingPerfectIntegration が存在');
            const status = window.matchingPerfectIntegration.getStatus();
            console.log('[PerfectTest] ステータス:', status);
        } else {
            console.error('[PerfectTest] ❌ matchingPerfectIntegration が見つかりません');
        }
        
        // 2. 無効化されたスクリプトのチェック
        const disabledScripts = [
            'matchingCompleteFix',
            'matchingEmergencyFix',
            'matchingErrorDiagnostic',
            'matchingPerfectDisplay',
            'matchingFixAllIssues'
        ];
        
        console.log('[PerfectTest] === 無効化チェック ===');
        disabledScripts.forEach(name => {
            if (window[name]) {
                if (window[name]._disabled) {
                    console.log(`[PerfectTest] ✅ ${name} は無効化されています`);
                } else {
                    console.error(`[PerfectTest] ❌ ${name} はまだ有効です`);
                }
            } else {
                console.log(`[PerfectTest] ✅ ${name} は存在しません（OK）`);
            }
        });
        
        // 3. DOM要素のチェック
        console.log('[PerfectTest] === DOM要素チェック ===');
        const container = document.getElementById('matching-container');
        if (container) {
            console.log('[PerfectTest] ✅ matching-container が存在');
            const cards = container.querySelectorAll('.matching-card');
            console.log(`[PerfectTest] マッチングカード数: ${cards.length}`);
            
            if (cards.length > 0) {
                // 最初のカードの詳細を確認
                const firstCard = cards[0];
                console.log('[PerfectTest] 最初のカードの詳細:');
                console.log('- スコア:', firstCard.querySelector('.score-badge')?.textContent);
                console.log('- 名前:', firstCard.querySelector('h3')?.textContent);
                console.log('- レーダーチャート:', firstCard.querySelector('canvas') ? '存在' : '不在');
                console.log('- ボタン数:', firstCard.querySelectorAll('button').length);
            }
        } else {
            console.error('[PerfectTest] ❌ matching-container が見つかりません');
        }
        
        // 4. エラーログの確認
        if (window.matchingPerfectIntegration?.errors?.length > 0) {
            console.error('[PerfectTest] ⚠️ エラーが記録されています:');
            window.matchingPerfectIntegration.errors.forEach((err, i) => {
                console.error(`[PerfectTest] エラー${i + 1}:`, err);
            });
        } else {
            console.log('[PerfectTest] ✅ エラーなし');
        }
        
        // 5. パフォーマンスメトリクス
        if (window.matchingPerfectIntegration?.performanceMetrics) {
            console.log('[PerfectTest] === パフォーマンス ===');
            const metrics = window.matchingPerfectIntegration.performanceMetrics;
            console.log(`- プロファイル読み込み: ${metrics.profileLoadTime?.toFixed(2)}ms`);
            console.log(`- レンダリング: ${metrics.renderTime?.toFixed(2)}ms`);
            console.log(`- チャートレンダリング: ${metrics.chartRenderTime?.toFixed(2)}ms`);
        }
        
        console.log('[PerfectTest] 🏁 テスト完了');
        
    }, 5000);
    
    // 手動初期化のヘルパー
    window.testMatchingInit = function() {
        console.log('[PerfectTest] 手動初期化を実行');
        if (window.matchingPerfectIntegration) {
            window.matchingPerfectIntegration.init();
        } else {
            console.error('[PerfectTest] matchingPerfectIntegration が見つかりません');
        }
    };
    
    console.log('[PerfectTest] テストスクリプト準備完了');
    console.log('手動初期化: testMatchingInit()');
    
})();