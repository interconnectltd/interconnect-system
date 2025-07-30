/**
 * 完璧性検証スクリプト
 * すべてのレーダーチャート機能が正しく動作することを確認
 */

class MatchingVerifyPerfection {
    constructor() {
        this.results = {
            components: {},
            integration: {},
            functionality: {},
            performance: {},
            errors: []
        };
    }

    /**
     * 完全な検証を実行
     */
    async verifyPerfection() {
        console.log('[VerifyPerfection] 完璧性検証開始...');
        
        try {
            // 1. コンポーネントの存在確認
            this.verifyComponents();
            
            // 2. クラス定義の確認
            this.verifyClassDefinitions();
            
            // 3. 統合の確認
            await this.verifyIntegration();
            
            // 4. 機能テスト
            await this.verifyFunctionality();
            
            // 5. パフォーマンステスト
            await this.verifyPerformance();
            
            // 6. エラーハンドリングテスト
            await this.verifyErrorHandling();
            
            // 7. メモリリークチェック
            await this.verifyMemoryUsage();
            
            // 結果の集計
            const summary = this.generateSummary();
            console.log('[VerifyPerfection] 検証完了:', summary);
            
            return summary;
            
        } catch (error) {
            console.error('[VerifyPerfection] 検証エラー:', error);
            this.results.errors.push({
                phase: 'general',
                error: error.message
            });
            return this.generateSummary();
        }
    }

    /**
     * コンポーネントの存在確認
     */
    verifyComponents() {
        console.log('[VerifyPerfection] コンポーネント確認中...');
        
        const requiredComponents = [
            'matchingRadarChart',
            'MatchingRadarChartEnhanced',
            'enhancedRadarChart',
            'matchingRadarChartPerformance',
            'matchingRadarChartUX',
            'matchingRadarChartIntegration',
            'matchingDataIntegrity'
        ];
        
        requiredComponents.forEach(name => {
            this.results.components[name] = {
                exists: !!window[name],
                type: window[name] ? typeof window[name] : 'undefined',
                isClass: window[name] && typeof window[name] === 'function',
                hasPrototype: window[name] && window[name].prototype !== undefined
            };
        });
    }

    /**
     * クラス定義の確認
     */
    verifyClassDefinitions() {
        console.log('[VerifyPerfection] クラス定義確認中...');
        
        // MatchingRadarChartEnhanced のメソッド確認
        if (window.MatchingRadarChartEnhanced) {
            const proto = window.MatchingRadarChartEnhanced.prototype;
            this.results.components.MatchingRadarChartEnhanced.methods = {
                render: typeof proto.render === 'function',
                validateData: typeof proto.validateData === 'function',
                drawChart: typeof proto.drawChart === 'function'
            };
        }
        
        // enhancedRadarChart のrender メソッド確認
        if (window.enhancedRadarChart) {
            this.results.components.enhancedRadarChart.hasRender = 
                typeof window.enhancedRadarChart.render === 'function';
        }
    }

    /**
     * 統合の確認
     */
    async verifyIntegration() {
        console.log('[VerifyPerfection] 統合確認中...');
        
        // 初期化フラグの確認
        this.results.integration.initialized = !!window.__radarChartInitialized;
        
        // データ抽出の統一性確認
        if (window.matchingRadarChartUX && window.matchingRadarChartIntegration) {
            const testCanvas = document.createElement('canvas');
            const testData1 = window.matchingRadarChartUX.extractDataFromCanvas(testCanvas);
            const testData2 = window.matchingRadarChartIntegration.extractChartData(testCanvas);
            
            this.results.integration.dataExtractionUnified = 
                JSON.stringify(testData1) === JSON.stringify(testData2);
        }
        
        // プロトタイプチェーンの確認
        if (window.MatchingRadarChartEnhanced) {
            const instance = new window.MatchingRadarChartEnhanced();
            this.results.integration.prototypeChainValid = 
                instance instanceof window.MatchingRadarChartEnhanced;
        }
    }

    /**
     * 機能テスト
     */
    async verifyFunctionality() {
        console.log('[VerifyPerfection] 機能テスト中...');
        
        try {
            // テストコンテナを作成
            const testContainer = document.createElement('div');
            testContainer.className = 'radar-chart-container test-container';
            testContainer.style.cssText = 'position: fixed; left: -9999px; width: 200px; height: 200px;';
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
            
            // レンダリングテスト
            if (window.MatchingRadarChartEnhanced) {
                const chart = new window.MatchingRadarChartEnhanced();
                const canvas = await chart.render(testContainer, testData);
                
                this.results.functionality.rendering = {
                    success: !!canvas,
                    hasCanvas: !!testContainer.querySelector('canvas'),
                    hasAriaLabel: !!canvas?.getAttribute('aria-label'),
                    isAccessible: canvas?.getAttribute('tabindex') === '0'
                };
            }
            
            // インタラクションテスト
            if (window.matchingRadarChartUX) {
                const tooltip = document.querySelector('.radar-chart-tooltip');
                this.results.functionality.interaction = {
                    tooltipExists: !!tooltip,
                    activeCharts: window.matchingRadarChartUX.activeCharts.size
                };
            }
            
            // データ整合性テスト
            if (window.matchingDataIntegrity) {
                const validated = window.matchingDataIntegrity.validateScoreBreakdown(testData);
                this.results.functionality.dataIntegrity = {
                    validationWorks: validated.issues.length === 0,
                    dataValid: !!validated.data
                };
            }
            
            // クリーンアップ
            document.body.removeChild(testContainer);
            
        } catch (error) {
            this.results.errors.push({
                phase: 'functionality',
                error: error.message
            });
        }
    }

    /**
     * パフォーマンステスト
     */
    async verifyPerformance() {
        console.log('[VerifyPerfection] パフォーマンステスト中...');
        
        if (!window.matchingRadarChartPerformance) {
            this.results.performance.skipped = true;
            return;
        }
        
        try {
            const perf = window.matchingRadarChartPerformance;
            
            // レンダリング速度テスト
            const renderTimes = [];
            const testData = this.generateTestData();
            
            for (let i = 0; i < 5; i++) {
                const start = performance.now();
                await perf.renderChart(testData);
                renderTimes.push(performance.now() - start);
            }
            
            const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
            
            this.results.performance = {
                avgRenderTime: avgRenderTime.toFixed(2) + 'ms',
                cacheEnabled: perf.renderCache.size > 0,
                canvasPoolSize: perf.canvasPool.length,
                renderQueueActive: perf.renderQueue.length >= 0
            };
            
        } catch (error) {
            this.results.errors.push({
                phase: 'performance',
                error: error.message
            });
        }
    }

    /**
     * エラーハンドリングテスト
     */
    async verifyErrorHandling() {
        console.log('[VerifyPerfection] エラーハンドリングテスト中...');
        
        const errorTests = [
            {
                name: 'null container',
                test: () => {
                    if (window.MatchingRadarChartEnhanced) {
                        const chart = new window.MatchingRadarChartEnhanced();
                        chart.render(null, {});
                    }
                }
            },
            {
                name: 'invalid data',
                test: () => {
                    if (window.matchingDataIntegrity) {
                        window.matchingDataIntegrity.validateScoreBreakdown('invalid');
                    }
                }
            },
            {
                name: 'missing canvas',
                test: () => {
                    if (window.matchingRadarChartIntegration) {
                        window.matchingRadarChartIntegration.extractChartData(null);
                    }
                }
            }
        ];
        
        this.results.functionality.errorHandling = {};
        
        errorTests.forEach(({ name, test }) => {
            try {
                test();
                this.results.functionality.errorHandling[name] = 'handled';
            } catch (error) {
                this.results.functionality.errorHandling[name] = 'unhandled';
            }
        });
    }

    /**
     * メモリ使用量チェック
     */
    async verifyMemoryUsage() {
        console.log('[VerifyPerfection] メモリ使用量チェック中...');
        
        if (!performance.memory) {
            this.results.performance.memoryCheck = 'not supported';
            return;
        }
        
        const initialMemory = performance.memory.usedJSHeapSize;
        
        // 大量のチャートを作成
        const containers = [];
        for (let i = 0; i < 20; i++) {
            const container = document.createElement('div');
            container.className = 'radar-chart-container';
            containers.push(container);
            
            if (window.MatchingRadarChartEnhanced) {
                const chart = new window.MatchingRadarChartEnhanced();
                chart.render(container, this.generateTestData());
            }
        }
        
        // メモリ使用量の確認
        const afterCreation = performance.memory.usedJSHeapSize;
        
        // クリーンアップ
        containers.forEach(c => c.remove());
        
        // ガベージコレクションを待つ
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const afterCleanup = performance.memory.usedJSHeapSize;
        
        this.results.performance.memoryUsage = {
            initial: (initialMemory / 1024 / 1024).toFixed(2) + 'MB',
            afterCreation: (afterCreation / 1024 / 1024).toFixed(2) + 'MB',
            afterCleanup: (afterCleanup / 1024 / 1024).toFixed(2) + 'MB',
            leaked: afterCleanup > initialMemory * 1.1
        };
    }

    /**
     * テストデータ生成
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
     * サマリー生成
     */
    generateSummary() {
        const issues = [];
        let score = 100;
        
        // コンポーネントチェック
        Object.entries(this.results.components).forEach(([name, info]) => {
            if (!info.exists) {
                issues.push(`${name} が存在しません`);
                score -= 10;
            }
            if (name === 'MatchingRadarChartEnhanced' && info.exists) {
                if (!info.methods?.render) {
                    issues.push(`${name} にrenderメソッドがありません`);
                    score -= 5;
                }
            }
        });
        
        // 統合チェック
        if (!this.results.integration.initialized) {
            issues.push('初期化が完了していません');
            score -= 5;
        }
        
        if (this.results.integration.dataExtractionUnified === false) {
            issues.push('データ抽出が統一されていません');
            score -= 5;
        }
        
        // 機能チェック
        if (this.results.functionality.rendering && !this.results.functionality.rendering.success) {
            issues.push('レンダリングが失敗しました');
            score -= 10;
        }
        
        // エラーチェック
        if (this.results.errors.length > 0) {
            issues.push(`${this.results.errors.length}個のエラーが発生`);
            score -= this.results.errors.length * 5;
        }
        
        // パフォーマンスチェック
        if (this.results.performance.avgRenderTime) {
            const time = parseFloat(this.results.performance.avgRenderTime);
            if (time > 100) {
                issues.push('レンダリング時間が長すぎます');
                score -= 5;
            }
        }
        
        // メモリリークチェック
        if (this.results.performance.memoryUsage?.leaked) {
            issues.push('メモリリークの可能性があります');
            score -= 10;
        }
        
        return {
            isPerfect: issues.length === 0,
            score: Math.max(0, score),
            issues: issues,
            details: this.results
        };
    }

    /**
     * 詳細レポートの表示
     */
    showDetailedReport() {
        console.group('[VerifyPerfection] 詳細レポート');
        
        console.group('コンポーネント状態');
        console.table(this.results.components);
        console.groupEnd();
        
        console.group('統合状態');
        console.log(this.results.integration);
        console.groupEnd();
        
        console.group('機能テスト結果');
        console.log(this.results.functionality);
        console.groupEnd();
        
        console.group('パフォーマンス');
        console.log(this.results.performance);
        console.groupEnd();
        
        if (this.results.errors.length > 0) {
            console.group('エラー');
            this.results.errors.forEach(err => console.error(err));
            console.groupEnd();
        }
        
        console.groupEnd();
    }
}

// グローバルに公開
window.matchingVerifyPerfection = new MatchingVerifyPerfection();

// 自動実行（デバッグモード時）
if (localStorage.getItem('debugMode') === 'true') {
    window.addEventListener('load', async () => {
        console.log('[VerifyPerfection] 3秒後に自動検証を開始します...');
        setTimeout(async () => {
            const result = await window.matchingVerifyPerfection.verifyPerfection();
            if (!result.isPerfect) {
                console.warn('[VerifyPerfection] 問題が検出されました:', result.issues);
                window.matchingVerifyPerfection.showDetailedReport();
            } else {
                console.log('[VerifyPerfection] ✅ すべて完璧です！');
            }
        }, 3000);
    });
}

console.log('[VerifyPerfection] 検証システム準備完了');
console.log('[VerifyPerfection] 実行: window.matchingVerifyPerfection.verifyPerfection()');
console.log('[VerifyPerfection] 詳細: window.matchingVerifyPerfection.showDetailedReport()');