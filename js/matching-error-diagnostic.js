// ==========================================
// マッチングエラー診断ツール
// ==========================================

(function() {
    'use strict';
    
    console.log('[ErrorDiagnostic] エラー診断ツール起動');
    
    const diagnoseAllIssues = async () => {
        const report = {
            timestamp: new Date().toISOString(),
            errors: [],
            warnings: [],
            conflicts: [],
            recommendations: []
        };
        
        // 1. 現在読み込まれているマッチング関連スクリプト
        const matchingScripts = Array.from(document.scripts)
            .filter(script => script.src.includes('matching'))
            .map(script => script.src.split('/').pop());
        
        console.log('[ErrorDiagnostic] 読み込まれているマッチング関連スクリプト:', matchingScripts);
        report.loadedScripts = matchingScripts;
        
        // 2. グローバル変数の競合チェック
        const globalMatchingVars = Object.keys(window).filter(key => 
            key.toLowerCase().includes('matching') || 
            key.toLowerCase().includes('radar')
        );
        
        console.log('[ErrorDiagnostic] マッチング関連グローバル変数:', globalMatchingVars);
        report.globalVariables = globalMatchingVars;
        
        // 3. 重複定義チェック
        const duplicates = [];
        if (window.MatchingRadarChart && window.matchingRadarChart) {
            duplicates.push('RadarChart: 複数の定義が存在');
        }
        if (window.matchingSupabase && window.MatchingSupabase) {
            duplicates.push('MatchingSupabase: 複数の定義が存在');
        }
        
        if (duplicates.length > 0) {
            report.conflicts = duplicates;
            console.warn('[ErrorDiagnostic] 重複定義:', duplicates);
        }
        
        // 4. エラーの原因特定
        try {
            // calculateMatchingScores のエラーチェック
            if (window.matchingSupabase && window.matchingSupabase.calculateMatchingScores) {
                const testProfile = { id: 'test', name: 'Test User' };
                const testCurrent = { id: 'current', name: 'Current User' };
                
                try {
                    window.matchingSupabase.calculateMatchingScores([testProfile], testCurrent);
                } catch (e) {
                    report.errors.push({
                        location: 'calculateMatchingScores',
                        error: e.message,
                        cause: 'titleプロパティが未定義'
                    });
                }
            }
        } catch (e) {
            report.errors.push({
                location: 'エラーチェック中',
                error: e.message
            });
        }
        
        // 5. DOM要素チェック
        const requiredElements = [
            'matching-container',
            'matching-grid'
        ];
        
        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                report.warnings.push(`必須要素が見つかりません: #${id}`);
            }
        });
        
        // 6. レーダーチャート競合の詳細調査
        const radarChartImplementations = [];
        
        if (window.MatchingRadarChart) {
            radarChartImplementations.push('MatchingRadarChart (クラス)');
        }
        if (window.matchingRadarChart) {
            radarChartImplementations.push('matchingRadarChart (インスタンス)');
        }
        if (window.matchingRadarChartEnhanced) {
            radarChartImplementations.push('matchingRadarChartEnhanced');
        }
        
        if (radarChartImplementations.length > 1) {
            report.conflicts.push({
                type: 'RadarChart実装の競合',
                implementations: radarChartImplementations
            });
        }
        
        // 7. 推奨事項
        report.recommendations = [
            '1. matching-supabase.js の calculateMatchingScores で title プロパティのnullチェックを追加',
            '2. レーダーチャートの実装を1つに統一',
            '3. 重複する初期化処理を削除',
            '4. エラーハンドリングの強化'
        ];
        
        return report;
    };
    
    // 自動修復関数
    const autoFix = () => {
        console.log('[ErrorDiagnostic] 自動修復開始');
        
        // 1. calculateMatchingScores のパッチ
        if (window.matchingSupabase && window.matchingSupabase.calculateMatchingScores) {
            const original = window.matchingSupabase.calculateMatchingScores;
            window.matchingSupabase.calculateMatchingScores = function(profiles, currentUser) {
                // プロファイルのバリデーション
                const validProfiles = profiles.map(profile => ({
                    ...profile,
                    title: profile.title || '',
                    company: profile.company || '',
                    skills: profile.skills || [],
                    interests: profile.interests || [],
                    location: profile.location || '',
                    industry: profile.industry || ''
                }));
                
                const validCurrentUser = currentUser ? {
                    ...currentUser,
                    title: currentUser.title || '',
                    company: currentUser.company || '',
                    skills: currentUser.skills || [],
                    interests: currentUser.interests || [],
                    location: currentUser.location || '',
                    industry: currentUser.industry || ''
                } : null;
                
                return original.call(this, validProfiles, validCurrentUser);
            };
            console.log('[ErrorDiagnostic] calculateMatchingScores パッチ適用完了');
        }
        
        // 2. レーダーチャートの統一
        if (window.MatchingRadarChart && !window.matchingRadarChart) {
            window.matchingRadarChart = window.MatchingRadarChart;
            console.log('[ErrorDiagnostic] レーダーチャート統一完了');
        }
        
        // 3. 必要な要素の作成
        if (!document.getElementById('matching-container')) {
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                const container = document.createElement('div');
                container.id = 'matching-container';
                
                // 既存のmatching-gridの前に挿入
                const existingGrid = mainContent.querySelector('.matching-grid');
                if (existingGrid) {
                    mainContent.insertBefore(container, existingGrid);
                } else {
                    mainContent.appendChild(container);
                }
                console.log('[ErrorDiagnostic] matching-container 作成完了');
            }
        }
        
        // 4. 重複イベントリスナーの削除
        const cleanupDuplicateListeners = () => {
            // 新しいイベントリスナーを追加する前に、古いものを削除
            const oldListeners = window.matchingEventListeners || [];
            oldListeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
            window.matchingEventListeners = [];
        };
        
        cleanupDuplicateListeners();
        console.log('[ErrorDiagnostic] 重複イベントリスナー削除完了');
        
        // 5. 初期化の再実行
        if (window.fullImplementation && window.fullImplementation.update) {
            setTimeout(() => {
                window.fullImplementation.update();
                console.log('[ErrorDiagnostic] マッチング表示更新完了');
            }, 1000);
        }
    };
    
    // グローバル関数として公開
    window.matchingErrorDiagnostic = {
        diagnose: diagnoseAllIssues,
        autoFix: autoFix,
        showReport: async () => {
            const report = await diagnoseAllIssues();
            console.log('=== マッチングエラー診断レポート ===');
            console.log(report);
            
            // HTMLレポート生成
            const reportHTML = `
                <div style="
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    max-width: 800px;
                    max-height: 80vh;
                    overflow-y: auto;
                    z-index: 10000;
                ">
                    <h2>マッチングエラー診断レポート</h2>
                    <p>生成日時: ${report.timestamp}</p>
                    
                    <h3>エラー (${report.errors.length}件)</h3>
                    ${report.errors.map(error => `
                        <div style="background: #fee; padding: 10px; margin: 5px 0; border-radius: 5px;">
                            <strong>${error.location}:</strong> ${error.error}
                            ${error.cause ? `<br>原因: ${error.cause}` : ''}
                        </div>
                    `).join('')}
                    
                    <h3>警告 (${report.warnings.length}件)</h3>
                    ${report.warnings.map(warning => `
                        <div style="background: #ffeaa7; padding: 10px; margin: 5px 0; border-radius: 5px;">
                            ${warning}
                        </div>
                    `).join('')}
                    
                    <h3>競合 (${report.conflicts.length}件)</h3>
                    ${report.conflicts.map(conflict => `
                        <div style="background: #dfe6e9; padding: 10px; margin: 5px 0; border-radius: 5px;">
                            ${typeof conflict === 'string' ? conflict : JSON.stringify(conflict, null, 2)}
                        </div>
                    `).join('')}
                    
                    <h3>推奨事項</h3>
                    <ul>
                        ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                    
                    <div style="margin-top: 20px; text-align: center;">
                        <button onclick="window.matchingErrorDiagnostic.autoFix(); this.parentElement.parentElement.remove();" 
                                style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            自動修復を実行
                        </button>
                        <button onclick="this.parentElement.parentElement.remove();" 
                                style="padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
                            閉じる
                        </button>
                    </div>
                </div>
            `;
            
            const reportDiv = document.createElement('div');
            reportDiv.innerHTML = reportHTML;
            document.body.appendChild(reportDiv);
        }
    };
    
    // 自動実行
    console.log('[ErrorDiagnostic] 診断コマンド:');
    console.log('- matchingErrorDiagnostic.diagnose() - 診断実行');
    console.log('- matchingErrorDiagnostic.autoFix() - 自動修復');
    console.log('- matchingErrorDiagnostic.showReport() - レポート表示');
    
    // ページ読み込み後に自動診断
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            const report = await diagnoseAllIssues();
            if (report.errors.length > 0) {
                console.error('[ErrorDiagnostic] エラーが検出されました。自動修復を推奨します。');
                console.log('実行: matchingErrorDiagnostic.autoFix()');
            }
        });
    }
    
})();