// ==========================================
// マッチング機能のクリーンアップ
// 不要なスクリプトの特定と削除推奨
// ==========================================

(function() {
    'use strict';
    
    console.log('[Cleanup] マッチング機能のクリーンアップ開始');
    
    // 削除を推奨するスクリプト
    const deprecatedScripts = [
        'matching-init-fix.js',
        'matching-force-load.js',
        'matching-test-mode.js',
        'matching-data-validation-test.js',
        'matching-radar-chart-test.js',
        'matching-verify-perfection.js',
        'matching-quick-test.js',
        'matching-manual-test.js',
        'matching-test-data-generator.js',
        'matching-initialization-fix.js',
        'test-matching-functionality.js',
        'matching-test-data.js',
        'matching-emergency-fix.js',
        'matching-complete-fix.js',
        'matching-error-diagnostic.js',
        'matching-fix-all-issues.js'
    ];
    
    // 統合すべきスクリプト
    const scriptsToConsolidate = {
        'core': [
            'matching-config.js',
            'matching.js',
            'matching-supabase.js',
            'matching-supabase-optimized.js'
        ],
        'ui': [
            'matching-ux-improvements.js',
            'matching-loading-fix.js',
            'matching-buttons-fix.js'
        ],
        'radar': [
            'matching-radar-chart.js',
            'matching-radar-chart-enhanced.js',
            'matching-radar-chart-fix.js',
            'matching-radar-chart-performance.js',
            'matching-radar-chart-ux.js',
            'matching-radar-chart-integration.js'
        ],
        'ai': [
            'matching-ai-scoring-simple.js',
            'matching-ai-minutes-based.js',
            'matching-ai-llm-analyzer.js',
            'matching-ai-llm-integration.js',
            'matching-ai-integration.js'
        ],
        'final': [
            'matching-display-override.js',
            'matching-realistic-scoring.js',
            'matching-final-complete.js'
        ]
    };
    
    // 現在読み込まれているスクリプトの分析
    const analyzeLoadedScripts = () => {
        const allScripts = Array.from(document.scripts)
            .filter(s => s.src.includes('matching'))
            .map(s => s.src.split('/').pop());
        
        const analysis = {
            total: allScripts.length,
            deprecated: [],
            necessary: [],
            unknown: []
        };
        
        allScripts.forEach(script => {
            if (deprecatedScripts.includes(script)) {
                analysis.deprecated.push(script);
            } else if (Object.values(scriptsToConsolidate).flat().includes(script)) {
                analysis.necessary.push(script);
            } else {
                analysis.unknown.push(script);
            }
        });
        
        return analysis;
    };
    
    // 推奨される最小構成
    const getRecommendedConfiguration = () => {
        return {
            essential: [
                'matching-config.js',
                'matching-supabase-optimized.js',
                'matching-display-override.js',
                'matching-realistic-scoring.js',
                'matching-final-complete.js',
                'matching-conflict-resolver.js'
            ],
            optional: [
                'matching-ai-llm-integration.js', // LLM統合が必要な場合
                'matching-data-integrity.js', // データ整合性チェックが必要な場合
                'matching-data-migration.js' // データ移行が必要な場合
            ]
        };
    };
    
    // クリーンアップレポートの生成
    const generateCleanupReport = () => {
        const analysis = analyzeLoadedScripts();
        const recommended = getRecommendedConfiguration();
        
        const report = `
=== マッチング機能クリーンアップレポート ===

現在の状況:
- 総スクリプト数: ${analysis.total}
- 削除推奨: ${analysis.deprecated.length}個
- 必要: ${analysis.necessary.length}個
- 不明: ${analysis.unknown.length}個

削除推奨スクリプト:
${analysis.deprecated.map(s => '  - ' + s).join('\n') || '  なし'}

推奨構成（必須）:
${recommended.essential.map(s => '  - ' + s).join('\n')}

推奨構成（オプション）:
${recommended.optional.map(s => '  - ' + s).join('\n')}

推奨アクション:
1. matching.htmlから削除推奨スクリプトの<script>タグを削除
2. 重複する機能のスクリプトを統合
3. matching-conflict-resolver.jsを最後に読み込む
        `;
        
        return report;
    };
    
    // HTMLから不要なスクリプトタグを削除する関数（実行は手動）
    const generateCleanHTML = () => {
        const currentScripts = Array.from(document.scripts)
            .filter(s => s.src.includes('/js/matching'))
            .map(s => s.outerHTML);
        
        const recommended = getRecommendedConfiguration();
        const cleanScripts = recommended.essential.map(script => 
            `    <script src="js/${script}"></script>`
        ).join('\n');
        
        console.log('=== 推奨されるscriptタグ構成 ===');
        console.log(cleanScripts);
        
        return cleanScripts;
    };
    
    // グローバル公開
    window.matchingCleanup = {
        analyze: analyzeLoadedScripts,
        report: () => {
            const report = generateCleanupReport();
            console.log(report);
            return report;
        },
        getCleanHTML: generateCleanHTML,
        deprecated: deprecatedScripts,
        recommended: getRecommendedConfiguration()
    };
    
    // 自動レポート表示
    setTimeout(() => {
        console.log('[Cleanup] クリーンアップ分析完了');
        console.log('レポート表示: matchingCleanup.report()');
        console.log('推奨HTML: matchingCleanup.getCleanHTML()');
    }, 1000);
    
})();