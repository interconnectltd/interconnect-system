/**
 * Matching Conflict Final Resolution
 * すべての競合コードを完全に解決
 */

(function() {
    'use strict';
    
    console.log('[ConflictResolution] 競合解決開始');
    
    // 競合する可能性のあるグローバル変数をすべてリスト
    const conflictingGlobals = [
        // マッチング関連の基本関数
        'loadProfiles',
        'displayProfiles',
        'calculateScore',
        'calculatePerfectScore',
        'viewProfile',
        'connectProfile',
        'showDetailedReport',
        'handleSearch',
        
        // レーダーチャート関連
        'PerfectRadarChart',
        'RadarChart',
        'createRadarChart',
        'initRadarCharts',
        'updateRadarChart',
        
        // AI スコアリング関連
        'calculateAIScore',
        'calculateLLMScore',
        'analyzeMinutes',
        'getMatchingScore',
        
        // データ管理関連
        'profileCache',
        'matchingProfiles',
        'currentProfiles',
        'profilesData',
        
        // 設定関連
        'matchingConfig',
        'MATCHING_CONFIG',
        'CONFIG',
        
        // その他のユーティリティ
        'initializeMatching',
        'setupMatching',
        'matchingReady'
    ];
    
    // 競合解決のための統一インターフェース
    const UnifiedMatching = {
        // 正式な実装への参照を保持
        official: {},
        
        // 競合を検出して記録
        detectConflicts() {
            const conflicts = [];
            
            conflictingGlobals.forEach(name => {
                if (window[name]) {
                    conflicts.push({
                        name,
                        type: typeof window[name],
                        source: this.getSourceInfo(window[name])
                    });
                }
            });
            
            if (conflicts.length > 0) {
                console.log('[ConflictResolution] 検出された競合:', conflicts);
            }
            
            return conflicts;
        },
        
        // 関数のソース情報を取得
        getSourceInfo(fn) {
            if (typeof fn !== 'function') return 'not a function';
            
            const fnString = fn.toString();
            
            // 既知のスクリプトパターンを検索
            const patterns = {
                'perfect-integration': /PerfectIntegration|MPI/,
                'error-fix': /ErrorFix|showDetailedReport/,
                'ultimate-fix': /UltimateFix/,
                'ai-scoring': /AIScoring|LLMAnalyzer/,
                'radar-chart': /RadarChart|chartConfig/,
                'supabase': /supabase\.from/,
                'loading-fix': /LoadingFix/,
                'card-display': /CardDisplay|forceDisplay/
            };
            
            for (const [name, pattern] of Object.entries(patterns)) {
                if (pattern.test(fnString)) {
                    return name;
                }
            }
            
            return 'unknown';
        },
        
        // 競合を解決
        resolveConflicts() {
            console.log('[ConflictResolution] 競合解決実行');
            
            // 1. matching-perfect-integration.js の実装を正式版として採用
            if (window.MPI) {
                this.official.loadProfiles = window.MPI.loadProfiles.bind(window.MPI);
                this.official.displayProfiles = window.displayProfiles;
                this.official.calculateScore = window.calculatePerfectScore;
            }
            
            // 2. エラー修正の実装を統合
            if (window.showDetailedReport) {
                this.official.showDetailedReport = window.showDetailedReport;
            }
            
            // 3. 設定を統一
            this.official.CONFIG = window.CONFIG || {
                DEBUG: false,
                CACHE_DURATION: 300000,
                MAX_PROFILES: 50,
                BATCH_SIZE: 10
            };
            
            // 4. グローバル関数を正式版で上書き
            this.applyOfficialImplementations();
            
            // 5. 重複イベントリスナーを削除
            this.removeDuplicateListeners();
            
            // 6. 競合する初期化を防止
            this.preventDuplicateInit();
        },
        
        // 正式な実装を適用
        applyOfficialImplementations() {
            // loadProfiles
            if (this.official.loadProfiles) {
                const originalLoad = window.loadProfiles;
                window.loadProfiles = async function() {
                    console.log('[ConflictResolution] 統一されたloadProfiles実行');
                    
                    // ローディングアニメーションとの統合
                    if (window.MatchingLoader) {
                        window.MatchingLoader.show();
                    }
                    
                    try {
                        // 正式な実装を実行
                        await UnifiedMatching.official.loadProfiles();
                        
                        // 成功時の処理
                        if (window.MatchingLoader) {
                            window.MatchingLoader.completeProgress();
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                        
                    } catch (error) {
                        console.error('[ConflictResolution] loadProfiles エラー:', error);
                        
                        // フォールバック処理
                        if (originalLoad && originalLoad !== window.loadProfiles) {
                            await originalLoad.call(window);
                        }
                        
                    } finally {
                        if (window.MatchingLoader) {
                            window.MatchingLoader.hide();
                        }
                    }
                };
            }
            
            // displayProfiles
            if (this.official.displayProfiles) {
                window.displayProfiles = (profiles) => {
                    console.log('[ConflictResolution] 統一されたdisplayProfiles実行');
                    
                    // nullチェック
                    if (!profiles || !Array.isArray(profiles)) {
                        console.warn('[ConflictResolution] 無効なプロファイルデータ');
                        return;
                    }
                    
                    // 正式な実装を実行
                    this.official.displayProfiles(profiles);
                    
                    // カード表示の確認
                    setTimeout(() => {
                        const cards = document.querySelectorAll('.matching-card');
                        console.log('[ConflictResolution] 表示されたカード数:', cards.length);
                    }, 100);
                };
            }
            
            // その他の関数も同様に統一
            if (this.official.calculateScore) {
                window.calculateScore = this.official.calculateScore;
                window.calculatePerfectScore = this.official.calculateScore;
            }
            
            if (this.official.showDetailedReport) {
                window.showDetailedReport = this.official.showDetailedReport;
            }
            
            // CONFIG を統一
            window.CONFIG = this.official.CONFIG;
        },
        
        // 重複イベントリスナーを削除
        removeDuplicateListeners() {
            // DOMContentLoaded の重複を防ぐ
            const listeners = window._domContentLoadedListeners || [];
            
            // 新しいaddEventListenerをラップ
            const originalAddEventListener = EventTarget.prototype.addEventListener;
            EventTarget.prototype.addEventListener = function(type, listener, options) {
                if (type === 'DOMContentLoaded' && this === document) {
                    const listenerString = listener.toString();
                    
                    // 既に登録されているかチェック
                    const isDuplicate = listeners.some(l => 
                        l.toString().includes(listenerString.substring(0, 100))
                    );
                    
                    if (isDuplicate) {
                        console.log('[ConflictResolution] 重複イベントリスナーをスキップ');
                        return;
                    }
                    
                    listeners.push(listener);
                }
                
                return originalAddEventListener.call(this, type, listener, options);
            };
            
            window._domContentLoadedListeners = listeners;
        },
        
        // 重複初期化を防止
        preventDuplicateInit() {
            // 初期化フラグ
            window._matchingInitialized = window._matchingInitialized || false;
            
            // 初期化関数をラップ
            const initFunctions = [
                'initializeMatching',
                'setupMatching',
                'matchingReady'
            ];
            
            initFunctions.forEach(fnName => {
                if (window[fnName]) {
                    const original = window[fnName];
                    window[fnName] = function() {
                        if (window._matchingInitialized) {
                            console.log('[ConflictResolution] 重複初期化を防止:', fnName);
                            return Promise.resolve();
                        }
                        
                        window._matchingInitialized = true;
                        return original.apply(this, arguments);
                    };
                }
            });
        }
    };
    
    // 競合解決を実行
    UnifiedMatching.detectConflicts();
    UnifiedMatching.resolveConflicts();
    
    // グローバルに公開（デバッグ用）
    window.UnifiedMatching = UnifiedMatching;
    
    // ページ読み込み完了時に再度チェック
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[ConflictResolution] DOM読み込み完了後の再チェック');
            UnifiedMatching.detectConflicts();
            UnifiedMatching.resolveConflicts();
        });
    }
    
    console.log('[ConflictResolution] 競合解決完了');
    
})();