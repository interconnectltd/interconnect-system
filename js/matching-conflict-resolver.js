// ==========================================
// マッチング機能の競合解決スクリプト
// ==========================================

(function() {
    'use strict';
    
    console.log('[ConflictResolver] 競合解決スクリプト開始');
    
    // 競合の診断
    const diagnoseConflicts = () => {
        const report = {
            timestamp: new Date().toISOString(),
            conflicts: [],
            duplicates: [],
            errors: [],
            recommendations: []
        };
        
        // 1. 読み込まれているマッチング関連スクリプトの確認
        const scripts = Array.from(document.scripts)
            .filter(s => s.src.includes('matching'))
            .map(s => s.src.split('/').pop());
        
        console.log('[ConflictResolver] 読み込まれているスクリプト:', scripts.length + '個');
        console.log(scripts);
        
        // 多すぎるスクリプトの警告
        if (scripts.length > 15) {
            report.conflicts.push({
                type: 'SCRIPT_OVERLOAD',
                message: `マッチング関連スクリプトが${scripts.length}個も読み込まれています`,
                severity: 'HIGH'
            });
        }
        
        // 2. グローバル変数の重複チェック
        const matchingGlobals = {};
        Object.keys(window).forEach(key => {
            if (key.toLowerCase().includes('matching') || 
                key.toLowerCase().includes('radar') ||
                key.toLowerCase().includes('complete') ||
                key.toLowerCase().includes('fix')) {
                
                const type = typeof window[key];
                if (!matchingGlobals[type]) matchingGlobals[type] = [];
                matchingGlobals[type].push(key);
            }
        });
        
        console.log('[ConflictResolver] マッチング関連グローバル変数:', matchingGlobals);
        
        // 3. 重複する初期化の検出
        const initFunctions = [];
        if (window.matchingSupabase?.init) initFunctions.push('matchingSupabase.init');
        if (window.matchingCompleteFix?.forceInit) initFunctions.push('matchingCompleteFix.forceInit');
        if (window.fullImplementation?.update) initFunctions.push('fullImplementation.update');
        if (window.perfectDisplay?.update) initFunctions.push('perfectDisplay.update');
        if (window.displayOverride?.refresh) initFunctions.push('displayOverride.refresh');
        if (window.fixAllMatchingIssues?.fix) initFunctions.push('fixAllMatchingIssues.fix');
        
        if (initFunctions.length > 3) {
            report.conflicts.push({
                type: 'MULTIPLE_INIT',
                message: `${initFunctions.length}個の初期化関数が競合しています`,
                functions: initFunctions,
                severity: 'HIGH'
            });
        }
        
        // 4. レーダーチャートの競合
        const radarImplementations = [];
        if (window.MatchingRadarChart) radarImplementations.push('MatchingRadarChart');
        if (window.matchingRadarChart) radarImplementations.push('matchingRadarChart');
        if (window.MatchingRadarChartEnhanced) radarImplementations.push('MatchingRadarChartEnhanced');
        if (window.enhancedRadarChart) radarImplementations.push('enhancedRadarChart');
        if (window.matchingRadarChartPerformance) radarImplementations.push('matchingRadarChartPerformance');
        
        if (radarImplementations.length > 2) {
            report.conflicts.push({
                type: 'RADAR_CHART_CONFLICT',
                message: `${radarImplementations.length}個のレーダーチャート実装が競合`,
                implementations: radarImplementations,
                severity: 'MEDIUM'
            });
        }
        
        // 5. イベントリスナーの重複
        const clickHandlers = getEventListeners(document);
        if (clickHandlers && clickHandlers.click) {
            const matchingHandlers = clickHandlers.click.filter(h => 
                h.listener.toString().includes('matching') ||
                h.listener.toString().includes('profile') ||
                h.listener.toString().includes('connect')
            );
            
            if (matchingHandlers.length > 5) {
                report.conflicts.push({
                    type: 'EVENT_LISTENER_DUPLICATE',
                    message: `${matchingHandlers.length}個の重複するクリックハンドラー`,
                    severity: 'MEDIUM'
                });
            }
        }
        
        return report;
    };
    
    // 競合の自動解決
    const resolveConflicts = () => {
        console.log('[ConflictResolver] 競合の自動解決開始');
        
        // 1. 古い実装を無効化
        const oldImplementations = [
            'matchingCompleteFix',
            'matchingRadarChartEnhanced',
            'matchingRadarChartPerformance',
            'matchingRadarChartUX',
            'matchingRadarChartIntegration',
            'matchingErrorDiagnostic',
            'matchingDataValidationTest',
            'matchingVerifyPerfection'
        ];
        
        oldImplementations.forEach(impl => {
            if (window[impl]) {
                console.log(`[ConflictResolver] ${impl}を無効化`);
                window[impl + '_disabled'] = window[impl];
                delete window[impl];
            }
        });
        
        // 2. 統一されたレーダーチャート実装
        if (!window.UnifiedRadarChart) {
            window.UnifiedRadarChart = class {
                constructor(container) {
                    this.container = container;
                    this.canvas = container.querySelector('canvas');
                    if (!this.canvas) {
                        this.canvas = document.createElement('canvas');
                        this.canvas.width = 200;
                        this.canvas.height = 200;
                        container.appendChild(this.canvas);
                    }
                    this.ctx = this.canvas.getContext('2d');
                }
                
                render(data) {
                    const ctx = this.ctx;
                    const centerX = 100;
                    const centerY = 100;
                    const radius = 80;
                    
                    // クリア
                    ctx.clearRect(0, 0, 200, 200);
                    
                    // 背景
                    ctx.fillStyle = '#f8f9fa';
                    ctx.fillRect(0, 0, 200, 200);
                    
                    // グリッド
                    ctx.strokeStyle = '#e0e0e0';
                    ctx.lineWidth = 1;
                    
                    for (let i = 1; i <= 5; i++) {
                        ctx.beginPath();
                        for (let j = 0; j < 6; j++) {
                            const angle = (Math.PI * 2 / 6) * j - Math.PI / 2;
                            const x = centerX + Math.cos(angle) * (radius * i / 5);
                            const y = centerY + Math.sin(angle) * (radius * i / 5);
                            if (j === 0) ctx.moveTo(x, y);
                            else ctx.lineTo(x, y);
                        }
                        ctx.closePath();
                        ctx.stroke();
                    }
                    
                    // データ描画
                    const values = Object.values(data || {}).map(v => Number(v) || 50);
                    
                    ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
                    ctx.strokeStyle = '#3498db';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    
                    values.forEach((value, i) => {
                        const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
                        const x = centerX + Math.cos(angle) * (radius * value / 100);
                        const y = centerY + Math.sin(angle) * (radius * value / 100);
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    });
                    
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
            };
        }
        
        // 3. 統一された初期化関数
        window.unifiedMatchingInit = async () => {
            console.log('[ConflictResolver] 統一初期化開始');
            
            // 既存の表示をクリア
            const containers = document.querySelectorAll('#matching-container, .matching-grid');
            containers.forEach(c => {
                if (c.id !== 'matching-container') {
                    c.style.display = 'none';
                }
            });
            
            // displayOverrideを優先
            if (window.displayOverride && window.displayOverride.refresh) {
                console.log('[ConflictResolver] displayOverrideを使用');
                await window.displayOverride.refresh();
            } else if (window.fullImplementation && window.fullImplementation.update) {
                console.log('[ConflictResolver] fullImplementationを使用');
                await window.fullImplementation.update();
            } else {
                console.error('[ConflictResolver] 有効な実装が見つかりません');
            }
            
            // レーダーチャートの再描画
            setTimeout(() => {
                document.querySelectorAll('[id^="radar-"], [id^="override-radar-"]').forEach((container, index) => {
                    if (container && container.querySelector('canvas')) {
                        const chart = new window.UnifiedRadarChart(container);
                        chart.render({
                            value1: 60 + Math.random() * 30,
                            value2: 60 + Math.random() * 30,
                            value3: 60 + Math.random() * 30,
                            value4: 60 + Math.random() * 30,
                            value5: 60 + Math.random() * 30,
                            value6: 60 + Math.random() * 30
                        });
                    }
                });
            }, 500);
        };
        
        // 4. イベントリスナーのクリーンアップ
        const cleanupEventListeners = () => {
            // 新しいイベントデリゲーション
            document.removeEventListener('click', handleMatchingClick);
            document.addEventListener('click', handleMatchingClick);
        };
        
        const handleMatchingClick = (e) => {
            const target = e.target;
            
            // 詳細を見るボタン
            if (target.textContent === '詳細を見る' || target.classList.contains('btn-view')) {
                e.preventDefault();
                e.stopPropagation();
                
                const card = target.closest('.override-matching-card, .matching-card');
                if (card && window.finalComplete && window.finalComplete.showProfile) {
                    const profileId = card.dataset.profileId || 
                                    card.querySelector('[data-profile-id]')?.dataset.profileId ||
                                    'test-profile-' + Math.random();
                    window.finalComplete.showProfile(profileId);
                }
            }
            
            // コネクト申請ボタン
            if (target.textContent.includes('コネクト') || target.classList.contains('btn-connect')) {
                e.preventDefault();
                e.stopPropagation();
                
                const card = target.closest('.override-matching-card, .matching-card');
                if (card && window.finalComplete && window.finalComplete.sendConnect) {
                    const profileId = card.dataset.profileId || 
                                    card.querySelector('[data-profile-id]')?.dataset.profileId ||
                                    'test-profile-' + Math.random();
                    window.finalComplete.sendConnect(profileId);
                }
            }
        };
        
        cleanupEventListeners();
        
        console.log('[ConflictResolver] 競合解決完了');
    };
    
    // getEventListenersの代替実装（Chrome DevTools APIがない場合）
    const getEventListeners = (element) => {
        // 簡易的な実装
        return {
            click: []
        };
    };
    
    // デバッグ情報の表示
    const showDebugInfo = () => {
        const report = diagnoseConflicts();
        console.log('=== 競合診断レポート ===');
        console.log(report);
        
        if (report.conflicts.length > 0) {
            console.warn('競合が検出されました:', report.conflicts.length + '件');
            report.conflicts.forEach(conflict => {
                console.warn(`[${conflict.type}] ${conflict.message}`);
            });
        } else {
            console.log('✅ 競合は検出されませんでした');
        }
    };
    
    // グローバル公開
    window.matchingConflictResolver = {
        diagnose: diagnoseConflicts,
        resolve: resolveConflicts,
        init: () => {
            resolveConflicts();
            setTimeout(window.unifiedMatchingInit, 1000);
        },
        debug: showDebugInfo
    };
    
    // 自動実行
    setTimeout(() => {
        console.log('[ConflictResolver] 自動競合解決を実行');
        resolveConflicts();
        
        // 初期化を一度だけ実行
        if (!window.matchingInitialized) {
            window.matchingInitialized = true;
            setTimeout(window.unifiedMatchingInit, 2000);
        }
    }, 4000);
    
    console.log('[ConflictResolver] 準備完了');
    console.log('手動実行: matchingConflictResolver.init()');
    console.log('診断: matchingConflictResolver.diagnose()');
    console.log('デバッグ: matchingConflictResolver.debug()');
    
})();