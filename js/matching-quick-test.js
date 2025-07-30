/**
 * レーダーチャートシステムのクイックテスト
 * コンソールから簡単に実行できるテストコマンド
 */

window.quickTest = {
    /**
     * 基本的な動作確認
     */
    async basic() {
        console.log('=== 基本動作テスト開始 ===');
        
        // 1. コンポーネントの存在確認
        const components = [
            'matchingRadarChart',
            'MatchingRadarChartEnhanced',
            'matchingRadarChartPerformance',
            'matchingRadarChartUX',
            'matchingRadarChartIntegration'
        ];
        
        console.log('コンポーネント確認:');
        components.forEach(name => {
            console.log(`  ${name}: ${window[name] ? '✅' : '❌'}`);
        });
        
        // 2. レンダリングテスト
        console.log('\nレンダリングテスト:');
        try {
            const testContainer = document.createElement('div');
            testContainer.className = 'radar-chart-container';
            testContainer.style.width = '200px';
            testContainer.style.height = '200px';
            
            const testData = {
                businessSynergy: 85,
                solutionMatch: 70,
                businessTrends: 90,
                growthPhaseMatch: 75,
                urgencyAlignment: 60,
                resourceComplement: 80
            };
            
            if (window.MatchingRadarChartEnhanced) {
                const chart = new window.MatchingRadarChartEnhanced();
                const result = chart.render(testContainer, testData);
                console.log('  レンダリング: ✅');
                console.log('  Canvas生成:', !!testContainer.querySelector('canvas') ? '✅' : '❌');
            } else {
                console.log('  レンダリング: ❌ (MatchingRadarChartEnhanced not found)');
            }
        } catch (error) {
            console.log('  レンダリング: ❌', error.message);
        }
        
        console.log('=== テスト完了 ===');
    },
    
    /**
     * データフローの確認
     */
    async dataFlow() {
        console.log('=== データフローテスト ===');
        
        // マッチングカードの確認
        const cards = document.querySelectorAll('.matching-card');
        console.log(`マッチングカード数: ${cards.length}`);
        
        if (cards.length > 0) {
            const firstCard = cards[0];
            const container = firstCard.querySelector('.radar-chart-container');
            
            if (container) {
                console.log('レーダーチャートコンテナ: ✅');
                const canvas = container.querySelector('canvas');
                console.log('Canvas要素:', canvas ? '✅' : '❌');
                
                if (firstCard.radarChartData) {
                    console.log('データ添付: ✅');
                    console.log('データ内容:', firstCard.radarChartData);
                } else {
                    console.log('データ添付: ❌');
                }
            } else {
                console.log('レーダーチャートコンテナ: ❌');
            }
        }
        
        console.log('=== テスト完了 ===');
    },
    
    /**
     * エラーチェック
     */
    async errors() {
        console.log('=== エラーチェック ===');
        
        if (window.matchingRadarChartIntegration) {
            const errors = window.matchingRadarChartIntegration.errors;
            console.log(`エラー数: ${errors.length}`);
            
            if (errors.length > 0) {
                console.log('最新のエラー:');
                errors.slice(-5).forEach((err, i) => {
                    console.log(`  ${i + 1}. ${err.context}: ${err.message}`);
                });
            }
            
            // レポート生成
            const report = window.matchingRadarChartIntegration.generateReport();
            console.log('\n統合レポート:', report);
        } else {
            console.log('Integration component not found');
        }
        
        console.log('=== チェック完了 ===');
    },
    
    /**
     * レーダーチャートを手動で追加
     */
    async addChart() {
        console.log('=== レーダーチャートを手動追加 ===');
        
        const cards = document.querySelectorAll('.matching-card');
        if (cards.length === 0) {
            console.log('マッチングカードが見つかりません');
            return;
        }
        
        const testData = {
            businessSynergy: 85,
            solutionMatch: 70,
            businessTrends: 90,
            growthPhaseMatch: 75,
            urgencyAlignment: 60,
            resourceComplement: 80
        };
        
        cards.forEach((card, index) => {
            // 既存のコンテナを探す
            let container = card.querySelector('.radar-chart-container');
            
            if (!container) {
                // コンテナを作成
                container = document.createElement('div');
                container.className = 'radar-chart-container';
                container.style.cssText = 'width: 200px; height: 200px; margin: 10px auto;';
                
                // タグの後に挿入
                const tags = card.querySelector('.matching-tags');
                if (tags && tags.nextSibling) {
                    tags.parentNode.insertBefore(container, tags.nextSibling);
                } else {
                    card.appendChild(container);
                }
            }
            
            // チャートを描画
            if (window.MatchingRadarChartEnhanced) {
                try {
                    const chart = new window.MatchingRadarChartEnhanced();
                    chart.render(container, testData);
                    console.log(`  カード${index + 1}: ✅`);
                } catch (error) {
                    console.log(`  カード${index + 1}: ❌ ${error.message}`);
                }
            }
        });
        
        console.log('=== 追加完了 ===');
    },
    
    /**
     * 完全な検証
     */
    async verify() {
        if (window.matchingVerifyPerfection) {
            const result = await window.matchingVerifyPerfection.verifyPerfection();
            return result;
        } else {
            console.log('Verification system not found');
        }
    },
    
    /**
     * パフォーマンステスト
     */
    async performance() {
        if (window.matchingRadarChartTest) {
            await window.matchingRadarChartTest.runAllTests();
        } else {
            console.log('Test system not found');
        }
    }
};

console.log('=== クイックテストコマンド ===');
console.log('quickTest.basic()     - 基本動作確認');
console.log('quickTest.dataFlow()  - データフロー確認');
console.log('quickTest.errors()    - エラーチェック');
console.log('quickTest.addChart()  - チャートを手動追加');
console.log('quickTest.verify()    - 完全な検証');
console.log('quickTest.performance() - パフォーマンステスト');