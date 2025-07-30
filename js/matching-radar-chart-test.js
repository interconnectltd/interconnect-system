/**
 * レーダーチャート統合テストスイート
 * すべての機能が正しく動作することを検証
 */

class MatchingRadarChartTest {
    constructor() {
        this.testResults = [];
        this.testCases = [];
        this.setupTestCases();
    }

    /**
     * テストケースの設定
     */
    setupTestCases() {
        this.testCases = [
            {
                name: 'データ抽出機能',
                test: () => this.testDataExtraction()
            },
            {
                name: 'レンダリング機能',
                test: () => this.testRendering()
            },
            {
                name: 'パフォーマンス最適化',
                test: () => this.testPerformance()
            },
            {
                name: 'インタラクション機能',
                test: () => this.testInteraction()
            },
            {
                name: 'データ整合性',
                test: () => this.testDataIntegrity()
            },
            {
                name: 'エラーハンドリング',
                test: () => this.testErrorHandling()
            },
            {
                name: 'アクセシビリティ',
                test: () => this.testAccessibility()
            },
            {
                name: 'メモリ管理',
                test: () => this.testMemoryManagement()
            }
        ];
    }

    /**
     * すべてのテストを実行
     */
    async runAllTests() {
        console.log('[RadarChartTest] テストスイート開始');
        this.testResults = [];

        for (const testCase of this.testCases) {
            const result = await this.runTest(testCase);
            this.testResults.push(result);
        }

        const summary = this.generateSummary();
        console.log('[RadarChartTest] テスト完了:', summary);
        
        // 詳細レポートの生成
        if (summary.failed > 0) {
            this.showDetailedReport();
        }

        return summary;
    }

    /**
     * 個別テストの実行
     */
    async runTest(testCase) {
        const startTime = performance.now();
        const result = {
            name: testCase.name,
            passed: false,
            duration: 0,
            details: {},
            errors: []
        };

        try {
            console.log(`[RadarChartTest] ${testCase.name} 実行中...`);
            const testResult = await testCase.test();
            
            result.passed = testResult.passed;
            result.details = testResult.details || {};
            result.errors = testResult.errors || [];
            
        } catch (error) {
            result.passed = false;
            result.errors.push({
                message: error.message,
                stack: error.stack
            });
        }

        result.duration = performance.now() - startTime;
        return result;
    }

    /**
     * データ抽出機能のテスト
     */
    async testDataExtraction() {
        const results = {
            passed: true,
            details: {},
            errors: []
        };

        try {
            // テスト用のモックデータを作成
            const mockCard = this.createMockCard();
            const mockCanvas = mockCard.querySelector('canvas');
            
            // 統合システムのデータ抽出をテスト
            const integration = window.matchingRadarChartIntegration;
            const extractedData = integration.extractChartData(mockCanvas);
            
            // データ検証
            const expectedKeys = ['businessSynergy', 'solutionMatch', 'businessTrends', 
                                 'growthPhaseMatch', 'urgencyAlignment', 'resourceComplement'];
            
            for (const key of expectedKeys) {
                if (!(key in extractedData)) {
                    results.passed = false;
                    results.errors.push({
                        message: `Missing key: ${key}`
                    });
                }
                
                if (typeof extractedData[key] !== 'number') {
                    results.passed = false;
                    results.errors.push({
                        message: `Invalid type for ${key}: ${typeof extractedData[key]}`
                    });
                }
            }
            
            results.details.extractedData = extractedData;
            
        } catch (error) {
            results.passed = false;
            results.errors.push({
                message: `Data extraction failed: ${error.message}`
            });
        }

        return results;
    }

    /**
     * レンダリング機能のテスト
     */
    async testRendering() {
        const results = {
            passed: true,
            details: {},
            errors: []
        };

        try {
            // テスト用コンテナを作成
            const testContainer = document.createElement('div');
            testContainer.className = 'radar-chart-container';
            testContainer.style.width = '200px';
            testContainer.style.height = '200px';
            document.body.appendChild(testContainer);

            // テストデータ
            const testData = {
                businessSynergy: 85,
                solutionMatch: 70,
                businessTrends: 90,
                growthPhaseMatch: 75,
                urgencyAlignment: 60,
                resourceComplement: 80
            };

            // レンダリング実行
            const enhancedChart = new window.MatchingRadarChartEnhanced();
            enhancedChart.render(testContainer, testData);

            // レンダリング結果の検証
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const canvas = testContainer.querySelector('canvas');
            if (!canvas) {
                results.passed = false;
                results.errors.push({
                    message: 'Canvas element not found after rendering'
                });
            }

            // アクセシビリティ属性の確認
            if (canvas && !canvas.getAttribute('aria-label')) {
                results.passed = false;
                results.errors.push({
                    message: 'Missing aria-label attribute'
                });
            }

            results.details.rendered = !!canvas;
            results.details.hasAccessibility = !!(canvas?.getAttribute('aria-label'));

            // クリーンアップ
            document.body.removeChild(testContainer);

        } catch (error) {
            results.passed = false;
            results.errors.push({
                message: `Rendering test failed: ${error.message}`
            });
        }

        return results;
    }

    /**
     * パフォーマンステスト
     */
    async testPerformance() {
        const results = {
            passed: true,
            details: {},
            errors: []
        };

        try {
            const performance = window.matchingRadarChartPerformance;
            if (!performance) {
                throw new Error('Performance module not found');
            }

            // レンダリング時間の測定
            const renderTimes = [];
            const testData = this.generateTestData();

            for (let i = 0; i < 10; i++) {
                const start = window.performance.now();
                const canvas = await performance.renderChart(testData);
                const duration = window.performance.now() - start;
                renderTimes.push(duration);
            }

            const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
            results.details.avgRenderTime = avgRenderTime.toFixed(2) + 'ms';

            // パフォーマンス基準（100ms以下）
            if (avgRenderTime > 100) {
                results.passed = false;
                results.errors.push({
                    message: `Average render time too high: ${avgRenderTime.toFixed(2)}ms`
                });
            }

            // キャッシュ効率のテスト
            const cacheMetrics = performance.metrics;
            if (cacheMetrics.cacheHits + cacheMetrics.cacheMisses > 0) {
                const hitRate = cacheMetrics.cacheHits / 
                    (cacheMetrics.cacheHits + cacheMetrics.cacheMisses) * 100;
                results.details.cacheHitRate = hitRate.toFixed(1) + '%';
            }

            // メモリプールの確認
            results.details.canvasPoolSize = performance.canvasPool.length;

        } catch (error) {
            results.passed = false;
            results.errors.push({
                message: `Performance test failed: ${error.message}`
            });
        }

        return results;
    }

    /**
     * インタラクション機能のテスト
     */
    async testInteraction() {
        const results = {
            passed: true,
            details: {},
            errors: []
        };

        try {
            const ux = window.matchingRadarChartUX;
            if (!ux) {
                throw new Error('UX module not found');
            }

            // ツールチップ要素の確認
            const tooltip = document.querySelector('.radar-chart-tooltip');
            if (!tooltip) {
                results.passed = false;
                results.errors.push({
                    message: 'Tooltip element not found'
                });
            }

            // フルスクリーン要素の確認
            const fullscreenElements = document.querySelectorAll('.radar-chart-fullscreen');
            results.details.fullscreenSupport = fullscreenElements.length > 0;

            // タッチサポートの確認
            results.details.touchSupport = ux.isTouchDevice;

            // アクティブチャートの数
            results.details.activeCharts = ux.activeCharts.size;

        } catch (error) {
            results.passed = false;
            results.errors.push({
                message: `Interaction test failed: ${error.message}`
            });
        }

        return results;
    }

    /**
     * データ整合性のテスト
     */
    async testDataIntegrity() {
        const results = {
            passed: true,
            details: {},
            errors: []
        };

        try {
            const integrity = window.matchingDataIntegrity;
            if (!integrity) {
                throw new Error('Data integrity module not found');
            }

            // 様々なデータ形式でテスト
            const testCases = [
                {
                    name: '正常なデータ',
                    data: this.generateTestData(),
                    shouldPass: true
                },
                {
                    name: '範囲外のデータ',
                    data: { businessSynergy: 150, solutionMatch: -20 },
                    shouldPass: false
                },
                {
                    name: '旧形式データ',
                    data: { commonTopics: 80, communicationStyle: 70 },
                    shouldPass: true // 変換されるべき
                }
            ];

            for (const testCase of testCases) {
                const validated = integrity.validateScoreBreakdown(testCase.data);
                
                if (testCase.shouldPass && validated.issues.length > 0) {
                    results.details[testCase.name] = 'Unexpected validation issues';
                } else if (!testCase.shouldPass && validated.issues.length === 0) {
                    results.passed = false;
                    results.errors.push({
                        message: `${testCase.name}: Expected validation to fail`
                    });
                }
            }

            // 変換機能のテスト
            const oldData = { commonTopics: 80, emotionalSync: 90 };
            const converted = integrity.convertOldToNew(oldData);
            
            if (!converted.businessSynergy || !converted.growthPhaseMatch) {
                results.passed = false;
                results.errors.push({
                    message: 'Data conversion failed'
                });
            }

            results.details.conversionTested = true;

        } catch (error) {
            results.passed = false;
            results.errors.push({
                message: `Data integrity test failed: ${error.message}`
            });
        }

        return results;
    }

    /**
     * エラーハンドリングのテスト
     */
    async testErrorHandling() {
        const results = {
            passed: true,
            details: {},
            errors: []
        };

        try {
            const integration = window.matchingRadarChartIntegration;
            
            // エラーログの初期カウント
            const initialErrorCount = integration.errors.length;
            
            // 意図的にエラーを発生させる
            try {
                integration.extractChartData(null);
            } catch (e) {
                // エラーは期待される
            }
            
            // エラーがログされているか確認
            const currentErrorCount = integration.errors.length;
            if (currentErrorCount <= initialErrorCount) {
                results.passed = false;
                results.errors.push({
                    message: 'Error not logged properly'
                });
            }
            
            results.details.errorLogging = true;
            results.details.totalErrors = currentErrorCount;

        } catch (error) {
            results.passed = false;
            results.errors.push({
                message: `Error handling test failed: ${error.message}`
            });
        }

        return results;
    }

    /**
     * アクセシビリティのテスト
     */
    async testAccessibility() {
        const results = {
            passed: true,
            details: {},
            errors: []
        };

        try {
            // テスト用のチャートを作成
            const container = this.createTestChart();
            const canvas = container.querySelector('canvas');
            
            // ARIA属性の確認
            const ariaLabel = canvas?.getAttribute('aria-label');
            if (!ariaLabel) {
                results.passed = false;
                results.errors.push({
                    message: 'Missing aria-label on canvas'
                });
            }
            
            // tabindexの確認
            const tabindex = canvas?.getAttribute('tabindex');
            if (tabindex !== '0') {
                results.passed = false;
                results.errors.push({
                    message: 'Canvas not keyboard accessible'
                });
            }
            
            // roleの確認
            const role = canvas?.getAttribute('role');
            if (role !== 'img') {
                results.passed = false;
                results.errors.push({
                    message: 'Incorrect role attribute'
                });
            }
            
            results.details.ariaLabel = !!ariaLabel;
            results.details.keyboardAccessible = tabindex === '0';
            results.details.correctRole = role === 'img';
            
            // クリーンアップ
            container.remove();

        } catch (error) {
            results.passed = false;
            results.errors.push({
                message: `Accessibility test failed: ${error.message}`
            });
        }

        return results;
    }

    /**
     * メモリ管理のテスト
     */
    async testMemoryManagement() {
        const results = {
            passed: true,
            details: {},
            errors: []
        };

        try {
            const integration = window.matchingRadarChartIntegration;
            const performance = window.matchingRadarChartPerformance;
            
            // 初期状態の記録
            const initialDataStoreSize = integration.dataStore.size;
            const initialPoolSize = performance?.canvasPool.length || 0;
            
            // 大量のデータを生成
            for (let i = 0; i < 50; i++) {
                const container = document.createElement('div');
                container.dataset.chartId = `test_${i}`;
                integration.dataStore.set(`test_${i}`, {
                    data: this.generateTestData(),
                    timestamp: Date.now() - (40 * 60 * 1000) // 40分前
                });
            }
            
            // メモリクリーンアップを強制実行
            integration.setupMemoryManagement();
            
            // 待機
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // クリーンアップ後の確認
            const finalDataStoreSize = integration.dataStore.size;
            
            results.details.initialSize = initialDataStoreSize;
            results.details.afterLoadSize = initialDataStoreSize + 50;
            results.details.afterCleanupSize = finalDataStoreSize;
            
            // メモリが適切に解放されているか
            if (finalDataStoreSize >= initialDataStoreSize + 50) {
                results.passed = false;
                results.errors.push({
                    message: 'Memory cleanup not working properly'
                });
            }

        } catch (error) {
            results.passed = false;
            results.errors.push({
                message: `Memory management test failed: ${error.message}`
            });
        }

        return results;
    }

    /**
     * モックカードの作成
     */
    createMockCard() {
        const card = document.createElement('div');
        card.className = 'matching-card';
        card.dataset.userId = '123';
        
        const container = document.createElement('div');
        container.className = 'radar-chart-container';
        
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);
        card.appendChild(container);
        
        // データを設定
        card.radarChartData = this.generateTestData();
        
        return card;
    }

    /**
     * テスト用チャートの作成
     */
    createTestChart() {
        const container = document.createElement('div');
        container.className = 'radar-chart-container';
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        document.body.appendChild(container);
        
        const data = this.generateTestData();
        const chart = new window.MatchingRadarChartEnhanced();
        chart.render(container, data);
        
        return container;
    }

    /**
     * テストデータの生成
     */
    generateTestData() {
        return {
            businessSynergy: Math.floor(Math.random() * 100),
            solutionMatch: Math.floor(Math.random() * 100),
            businessTrends: Math.floor(Math.random() * 100),
            growthPhaseMatch: Math.floor(Math.random() * 100),
            urgencyAlignment: Math.floor(Math.random() * 100),
            resourceComplement: Math.floor(Math.random() * 100)
        };
    }

    /**
     * サマリーの生成
     */
    generateSummary() {
        const total = this.testResults.length;
        const passed = this.testResults.filter(r => r.passed).length;
        const failed = total - passed;
        
        return {
            total,
            passed,
            failed,
            successRate: ((passed / total) * 100).toFixed(1) + '%',
            totalDuration: this.testResults.reduce((sum, r) => sum + r.duration, 0).toFixed(2) + 'ms'
        };
    }

    /**
     * 詳細レポートの表示
     */
    showDetailedReport() {
        console.group('[RadarChartTest] 失敗したテスト:');
        
        this.testResults.filter(r => !r.passed).forEach(result => {
            console.group(`❌ ${result.name}`);
            console.log('Duration:', result.duration.toFixed(2) + 'ms');
            console.log('Details:', result.details);
            console.log('Errors:', result.errors);
            console.groupEnd();
        });
        
        console.groupEnd();
    }

    /**
     * HTMLレポートの生成
     */
    generateHTMLReport() {
        const report = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>レーダーチャートテストレポート</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .summary { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .passed { color: #4caf50; }
        .failed { color: #f44336; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; font-weight: 600; }
        tr:hover { background: #f5f5f5; }
        .error { background: #ffebee; padding: 10px; border-radius: 4px; margin: 5px 0; }
        .details { font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h1>レーダーチャートテストレポート</h1>
        <div class="summary">
            <h2>サマリー</h2>
            <p>実行日時: ${new Date().toISOString()}</p>
            <p>テスト総数: ${this.testResults.length}</p>
            <p class="passed">成功: ${this.testResults.filter(r => r.passed).length}</p>
            <p class="failed">失敗: ${this.testResults.filter(r => !r.passed).length}</p>
            <p>成功率: ${this.generateSummary().successRate}</p>
            <p>総実行時間: ${this.generateSummary().totalDuration}</p>
        </div>
        
        <h2>テスト結果詳細</h2>
        <table>
            <tr>
                <th>テスト名</th>
                <th>結果</th>
                <th>実行時間</th>
                <th>詳細</th>
            </tr>
            ${this.testResults.map(result => `
                <tr>
                    <td>${result.name}</td>
                    <td class="${result.passed ? 'passed' : 'failed'}">
                        ${result.passed ? '✅ 成功' : '❌ 失敗'}
                    </td>
                    <td>${result.duration.toFixed(2)}ms</td>
                    <td class="details">
                        ${result.passed ? 
                            JSON.stringify(result.details) : 
                            result.errors.map(e => `<div class="error">${e.message}</div>`).join('')
                        }
                    </td>
                </tr>
            `).join('')}
        </table>
        
        <h2>統合システムレポート</h2>
        <pre>${JSON.stringify(window.matchingRadarChartIntegration?.generateReport() || {}, null, 2)}</pre>
    </div>
</body>
</html>`;

        const blob = new Blob([report], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    }
}

// グローバルに公開
window.matchingRadarChartTest = new MatchingRadarChartTest();

// 自動テスト実行（開発環境のみ）
if (localStorage.getItem('autoTest') === 'true') {
    window.addEventListener('load', async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const results = await window.matchingRadarChartTest.runAllTests();
        
        if (results.failed > 0) {
            console.error('[RadarChartTest] テストに失敗しました');
            window.matchingRadarChartTest.generateHTMLReport();
        }
    });
}

console.log('[RadarChartTest] テストスイート準備完了');
console.log('[RadarChartTest] 実行: window.matchingRadarChartTest.runAllTests()');
console.log('[RadarChartTest] HTMLレポート: window.matchingRadarChartTest.generateHTMLReport()');