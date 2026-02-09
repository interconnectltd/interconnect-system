/**
 * システムヘルスチェック
 * 全体の問題を検出して報告
 */

(function() {
    'use strict';
    
    class SystemHealthCheck {
        constructor() {
            this.issues = [];
            this.warnings = [];
            this.passed = [];
        }
        
        async runFullCheck() {
            console.log('=== システムヘルスチェック開始 ===');
            
            // 1. Supabase接続チェック
            await this.checkSupabase();
            
            // 2. 必要なテーブルチェック
            await this.checkTables();
            
            // 3. メモリリークチェック
            this.checkMemoryLeaks();
            
            // 4. グローバル関数チェック
            this.checkGlobalFunctions();
            
            // 5. 削除されたファイルの影響チェック
            this.checkDisabledFiles();
            
            // 6. パフォーマンスチェック
            this.checkPerformance();
            
            // レポート出力
            this.printReport();
        }
        
        async checkSupabase() {
            if (window.supabaseClient) {
                this.passed.push('✅ Supabaseクライアント: 初期化済み');
                
                try {
                    const { data: { user } } = await window.supabaseClient.auth.getUser();
                    if (user) {
                        this.passed.push(`✅ 認証: ${user.email}`);
                    } else {
                        this.warnings.push('⚠️ 認証: 未ログイン');
                    }
                } catch (e) {
                    this.issues.push(`❌ 認証エラー: ${e.message}`);
                }
            } else {
                this.issues.push('❌ Supabaseクライアント: 未初期化');
            }
            
            // 後方互換性チェック
            if (window.supabase) {
                this.passed.push('✅ window.supabase Proxy: 存在');
            } else {
                this.warnings.push('⚠️ window.supabase: 未定義（古いコードが動作しない可能性）');
            }
        }
        
        async checkTables() {
            const requiredTables = [
                'profiles',
                'connections',
                'events',
                'event_participants',
                'notifications',
                'user_activities',
                'messages'
            ];
            
            for (const table of requiredTables) {
                try {
                    const { data, error } = await window.supabaseClient
                        .from(table)
                        .select('*')
                        .limit(1);
                    
                    if (error) {
                        if (error.code === '42P01') {
                            this.issues.push(`❌ テーブル '${table}': 存在しない`);
                        } else {
                            this.warnings.push(`⚠️ テーブル '${table}': ${error.code}`);
                        }
                    } else {
                        this.passed.push(`✅ テーブル '${table}': アクセス可能`);
                    }
                } catch (e) {
                    this.issues.push(`❌ テーブル '${table}': 例外エラー`);
                }
            }
        }
        
        checkMemoryLeaks() {
            // setInterval without clearInterval
            const scripts = document.querySelectorAll('script');
            let setIntervalCount = 0;
            let clearIntervalCount = 0;
            
            scripts.forEach(script => {
                if (script.textContent) {
                    setIntervalCount += (script.textContent.match(/setInterval/g) || []).length;
                    clearIntervalCount += (script.textContent.match(/clearInterval/g) || []).length;
                }
            });
            
            if (setIntervalCount > clearIntervalCount) {
                this.warnings.push(`⚠️ メモリリークの可能性: setInterval(${setIntervalCount}) > clearInterval(${clearIntervalCount})`);
            } else {
                this.passed.push('✅ メモリリーク: 検出されず');
            }
        }
        
        checkGlobalFunctions() {
            const requiredFunctions = [
                'waitForSupabase',
                'forceLoadMatchingData',
                'debugMatching',
                'logout'
            ];
            
            requiredFunctions.forEach(func => {
                if (typeof window[func] === 'function') {
                    this.passed.push(`✅ グローバル関数 '${func}': 存在`);
                } else {
                    this.warnings.push(`⚠️ グローバル関数 '${func}': 未定義`);
                }
            });
            
            // 重要なインスタンス
            const instances = [
                'matchingSupabase',
                'connectionsManager',
                'dashboardStats'
            ];
            
            instances.forEach(instance => {
                if (window[instance]) {
                    this.passed.push(`✅ インスタンス '${instance}': 存在`);
                } else {
                    this.warnings.push(`⚠️ インスタンス '${instance}': 未定義`);
                }
            });
        }
        
        checkDisabledFiles() {
            // 削除されたファイルの数を報告
            const disabledCount = 113; // 実際の数
            this.warnings.push(`⚠️ 削除されたJSファイル: ${disabledCount}個`);
            
            // 重要な削除ファイル
            const criticalDisabled = [
                'matching-supabase.js',
                'matching-config.js',
                'matching-initialization-fix.js',
                'supabase-init-wait.js',
                'dashboard-final-fixes.js'
            ];
            
            criticalDisabled.forEach(file => {
                this.warnings.push(`⚠️ 削除された重要ファイル: ${file}`);
            });
        }
        
        checkPerformance() {
            // ページ読み込み時間
            if (window.performance && window.performance.timing) {
                const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
                
                if (loadTime > 0) {
                    if (loadTime < 3000) {
                        this.passed.push(`✅ ページ読み込み時間: ${loadTime}ms`);
                    } else {
                        this.warnings.push(`⚠️ ページ読み込み時間: ${loadTime}ms（遅い）`);
                    }
                }
            }
            
            // DOM要素数
            const domCount = document.querySelectorAll('*').length;
            if (domCount < 1500) {
                this.passed.push(`✅ DOM要素数: ${domCount}`);
            } else {
                this.warnings.push(`⚠️ DOM要素数: ${domCount}（多い）`);
            }
        }
        
        printReport() {
            console.log('\n=== ヘルスチェックレポート ===\n');
            
            console.log('🔴 重大な問題:', this.issues.length);
            this.issues.forEach(issue => console.log(issue));
            
            console.log('\n🟡 警告:', this.warnings.length);
            this.warnings.forEach(warning => console.log(warning));
            
            console.log('\n🟢 正常:', this.passed.length);
            this.passed.forEach(pass => console.log(pass));
            
            console.log('\n=== サマリー ===');
            console.log(`問題: ${this.issues.length} | 警告: ${this.warnings.length} | 正常: ${this.passed.length}`);
            
            const score = (this.passed.length / (this.issues.length + this.warnings.length + this.passed.length)) * 100;
            console.log(`ヘルススコア: ${score.toFixed(1)}%`);
            
            if (this.issues.length > 0) {
                console.log('\n💡 推奨アクション:');
                console.log('1. sql/fix-tables-for-matching.sql を実行してテーブルを作成');
                console.log('2. forceLoadMatchingData() を実行してデータを再読み込み');
                console.log('3. debugMatching() を実行して詳細を確認');
            }
        }
    }
    
    // グローバルに公開
    window.systemHealthCheck = new SystemHealthCheck();
    
    // コマンド
    window.runHealthCheck = async () => {
        await window.systemHealthCheck.runFullCheck();
    };
    
    console.log('[SystemHealthCheck] 初期化完了');
    console.log('ヘルスチェック実行: runHealthCheck()');
    
})();