/**
 * データ整合性のテストスイート
 * 開発環境でのデータ検証
 */

class MatchingDataValidationTest {
    constructor() {
        this.testResults = [];
        this.testCases = this.defineTestCases();
    }

    /**
     * テストケースの定義
     */
    defineTestCases() {
        return [
            {
                name: '正常な新形式データ',
                data: {
                    businessSynergy: 85,
                    solutionMatch: 70,
                    businessTrends: 90,
                    growthPhaseMatch: 75,
                    urgencyAlignment: 60,
                    resourceComplement: 80
                },
                expected: {
                    hasIssues: false,
                    issueCount: 0
                }
            },
            {
                name: '範囲外の値を含むデータ',
                data: {
                    businessSynergy: 150,
                    solutionMatch: -20,
                    businessTrends: 90,
                    growthPhaseMatch: 75,
                    urgencyAlignment: 60,
                    resourceComplement: 80
                },
                expected: {
                    hasIssues: true,
                    issueCount: 2,
                    issueTypes: ['out_of_range']
                }
            },
            {
                name: '欠損値を含むデータ',
                data: {
                    businessSynergy: 85,
                    solutionMatch: null,
                    businessTrends: undefined,
                    growthPhaseMatch: 75,
                    urgencyAlignment: 60
                    // resourceComplement が欠損
                },
                expected: {
                    hasIssues: true,
                    issueCount: 3,
                    issueTypes: ['missing_value']
                }
            },
            {
                name: '旧形式データ',
                data: {
                    commonTopics: 80,
                    communicationStyle: 70,
                    emotionalSync: 85,
                    activityOverlap: 65,
                    profileMatch: 90
                },
                expected: {
                    hasIssues: true,
                    issueCount: 1,
                    issueTypes: ['format_conversion'],
                    converted: true
                }
            },
            {
                name: '混在形式データ',
                data: {
                    businessSynergy: 85,
                    commonTopics: 80,
                    solutionMatch: 70,
                    communicationStyle: 70
                },
                expected: {
                    hasIssues: false,
                    mixed: true
                }
            },
            {
                name: '不正な型のデータ',
                data: {
                    businessSynergy: "85",
                    solutionMatch: true,
                    businessTrends: [90],
                    growthPhaseMatch: {},
                    urgencyAlignment: 60,
                    resourceComplement: 80
                },
                expected: {
                    hasIssues: true,
                    issueCount: 4,
                    issueTypes: ['invalid_type']
                }
            }
        ];
    }

    /**
     * すべてのテストを実行
     */
    async runAllTests() {
        console.log('[ValidationTest] データ検証テストを開始します...');
        this.testResults = [];

        for (const testCase of this.testCases) {
            const result = await this.runTest(testCase);
            this.testResults.push(result);
        }

        const summary = this.generateSummary();
        console.log('[ValidationTest] テスト完了:', summary);
        return summary;
    }

    /**
     * 個別テストの実行
     */
    async runTest(testCase) {
        const startTime = performance.now();
        const integrity = window.matchingDataIntegrity;
        
        try {
            // データ検証
            const validated = integrity.validateScoreBreakdown(testCase.data);
            
            // 結果の検証
            const result = {
                name: testCase.name,
                passed: true,
                duration: 0,
                details: {}
            };

            // 期待値との比較
            if (testCase.expected.hasIssues !== (validated.issues.length > 0)) {
                result.passed = false;
                result.details.issueDetection = `期待: ${testCase.expected.hasIssues}, 実際: ${validated.issues.length > 0}`;
            }

            if (testCase.expected.issueCount !== undefined && 
                testCase.expected.issueCount !== validated.issues.length) {
                result.passed = false;
                result.details.issueCount = `期待: ${testCase.expected.issueCount}, 実際: ${validated.issues.length}`;
            }

            if (testCase.expected.issueTypes) {
                const actualTypes = validated.issues.map(issue => issue.type);
                const expectedTypes = testCase.expected.issueTypes;
                
                if (!this.arraysEqual(actualTypes.sort(), expectedTypes.sort())) {
                    result.passed = false;
                    result.details.issueTypes = `期待: ${expectedTypes.join(',')}, 実際: ${actualTypes.join(',')}`;
                }
            }

            // 変換後のデータ検証
            if (testCase.expected.converted) {
                const hasNewFormat = Object.keys(validated.data).some(key => 
                    ['businessSynergy', 'solutionMatch'].includes(key)
                );
                
                if (!hasNewFormat) {
                    result.passed = false;
                    result.details.conversion = '新形式への変換が行われませんでした';
                }
            }

            result.duration = performance.now() - startTime;
            result.validatedData = validated.data;
            result.issues = validated.issues;

            return result;

        } catch (error) {
            return {
                name: testCase.name,
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    /**
     * 配列の比較
     */
    arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    /**
     * パフォーマンステスト
     */
    async runPerformanceTest() {
        console.log('[ValidationTest] パフォーマンステストを開始します...');
        
        const iterations = 1000;
        const testData = {
            businessSynergy: 85,
            solutionMatch: 70,
            businessTrends: 90,
            growthPhaseMatch: 75,
            urgencyAlignment: 60,
            resourceComplement: 80
        };

        const integrity = window.matchingDataIntegrity;
        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
            integrity.validateScoreBreakdown(testData);
        }

        const duration = performance.now() - startTime;
        const avgTime = duration / iterations;

        console.log(`[ValidationTest] ${iterations}回の検証完了`);
        console.log(`[ValidationTest] 合計時間: ${duration.toFixed(2)}ms`);
        console.log(`[ValidationTest] 平均時間: ${avgTime.toFixed(4)}ms/回`);

        return {
            iterations,
            totalTime: duration,
            averageTime: avgTime,
            acceptable: avgTime < 1 // 1ms以下が目標
        };
    }

    /**
     * 統合テスト
     */
    async runIntegrationTest() {
        console.log('[ValidationTest] 統合テストを開始します...');
        
        // テストモードを有効化
        const originalTestMode = localStorage.getItem('testMode');
        localStorage.setItem('testMode', 'true');

        try {
            // テストデータを生成
            if (window.matchingTestData) {
                await window.matchingTestData.injectTestData();
            }

            // プロファイルを取得
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const profiles = window.matchingSupabase?.allProfiles || [];
            let validCount = 0;
            let invalidCount = 0;

            profiles.forEach(profile => {
                if (profile.scoreBreakdown) {
                    const validated = window.matchingDataIntegrity.validateScoreBreakdown(profile.scoreBreakdown);
                    if (validated.issues.length === 0) {
                        validCount++;
                    } else {
                        invalidCount++;
                    }
                }
            });

            console.log(`[ValidationTest] 統合テスト完了: ${validCount}件正常, ${invalidCount}件異常`);

            return {
                totalProfiles: profiles.length,
                validProfiles: validCount,
                invalidProfiles: invalidCount,
                success: invalidCount === 0
            };

        } finally {
            // テストモードを元に戻す
            if (originalTestMode) {
                localStorage.setItem('testMode', originalTestMode);
            } else {
                localStorage.removeItem('testMode');
            }
        }
    }

    /**
     * テスト結果のサマリー生成
     */
    generateSummary() {
        const total = this.testResults.length;
        const passed = this.testResults.filter(r => r.passed).length;
        const failed = total - passed;
        
        const summary = {
            total,
            passed,
            failed,
            successRate: ((passed / total) * 100).toFixed(1) + '%',
            results: this.testResults,
            failedTests: this.testResults.filter(r => !r.passed)
        };

        // コンソールに詳細を出力
        if (failed > 0) {
            console.error('[ValidationTest] 失敗したテスト:');
            summary.failedTests.forEach(test => {
                console.error(`  - ${test.name}:`, test.details || test.error);
            });
        }

        return summary;
    }

    /**
     * レポートの生成
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            environment: {
                userAgent: navigator.userAgent,
                localStorage: Object.keys(localStorage).length,
                matchingDataVersion: localStorage.getItem('matchingDataVersion')
            },
            testResults: this.testResults,
            summary: this.generateSummary()
        };

        // HTMLレポートの生成
        const html = this.generateHTMLReport(report);
        
        // 新しいウィンドウで表示
        const reportWindow = window.open('', 'ValidationReport', 'width=800,height=600');
        reportWindow.document.write(html);
        reportWindow.document.close();

        return report;
    }

    /**
     * HTMLレポートの生成
     */
    generateHTMLReport(report) {
        return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>データ検証レポート</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .summary { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .passed { color: green; }
        .failed { color: red; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        .details { font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <h1>データ検証レポート</h1>
    <div class="summary">
        <h2>サマリー</h2>
        <p>実行日時: ${report.timestamp}</p>
        <p>テスト総数: ${report.summary.total}</p>
        <p class="passed">成功: ${report.summary.passed}</p>
        <p class="failed">失敗: ${report.summary.failed}</p>
        <p>成功率: ${report.summary.successRate}</p>
    </div>
    
    <h2>テスト結果詳細</h2>
    <table>
        <tr>
            <th>テスト名</th>
            <th>結果</th>
            <th>実行時間</th>
            <th>詳細</th>
        </tr>
        ${report.testResults.map(result => `
            <tr>
                <td>${result.name}</td>
                <td class="${result.passed ? 'passed' : 'failed'}">
                    ${result.passed ? '成功' : '失敗'}
                </td>
                <td>${result.duration.toFixed(2)}ms</td>
                <td class="details">
                    ${result.error || JSON.stringify(result.details || result.issues || '')}
                </td>
            </tr>
        `).join('')}
    </table>
</body>
</html>
        `;
    }
}

// グローバルに公開
window.matchingDataValidationTest = new MatchingDataValidationTest();

// 開発者向けコマンド
console.log('[ValidationTest] データ検証テスト利用可能');
console.log('[ValidationTest] 全テスト実行: window.matchingDataValidationTest.runAllTests()');
console.log('[ValidationTest] パフォーマンステスト: window.matchingDataValidationTest.runPerformanceTest()');
console.log('[ValidationTest] 統合テスト: window.matchingDataValidationTest.runIntegrationTest()');
console.log('[ValidationTest] レポート生成: window.matchingDataValidationTest.generateReport()');