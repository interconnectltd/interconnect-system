/**
 * 本番環境準備チェックツール
 * アプリケーションの完璧性を確認
 */

(function() {
    'use strict';

    window.productionReadyCheck = {
        // チェック結果を格納
        results: {
            passed: [],
            warnings: [],
            errors: []
        },

        // 1. console.log削除チェック
        checkConsoleLogs: function() {
            const scripts = document.querySelectorAll('script[src]');
            const productionScripts = [
                'matching-config.js',
                'matching-supabase.js', 
                'matching-supabase-optimized.js',
                'matching-ux-improvements.js',
                'events-supabase.js',
                'profile-sync.js',
                'global-functions.js'
            ];

            let hasConsoleLogs = false;
            scripts.forEach(script => {
                const filename = script.src.split('/').pop();
                if (productionScripts.includes(filename)) {
                    // 実際のチェックはサーバーサイドで必要
                    // ここでは警告として記録
                    this.results.warnings.push(`${filename} - console.log確認が必要`);
                }
            });
        },

        // 2. エラーハンドリングチェック
        checkErrorHandling: function() {
            // グローバルエラーハンドラーの存在確認
            if (!window.onerror && !window.addEventListener('error')) {
                this.results.errors.push('グローバルエラーハンドラーが設定されていません');
            } else {
                this.results.passed.push('グローバルエラーハンドラー設定済み');
            }

            // Promiseエラーハンドラーの確認
            if (!window.addEventListener('unhandledrejection')) {
                this.results.warnings.push('未処理のPromiseエラーハンドラーが未設定');
            }
        },

        // 3. Supabase接続チェック
        checkSupabaseConnection: async function() {
            if (!window.supabase) {
                this.results.errors.push('Supabaseクライアントが初期化されていません');
                return;
            }

            try {
                const { data, error } = await window.supabase.auth.getSession();
                if (error) {
                    this.results.errors.push(`Supabase認証エラー: ${error.message}`);
                } else {
                    this.results.passed.push('Supabase接続正常');
                }
            } catch (e) {
                this.results.errors.push(`Supabase接続エラー: ${e.message}`);
            }
        },

        // 4. 必須テーブルの存在確認
        checkRequiredTables: async function() {
            const requiredTables = [
                'profiles',
                'connections',
                'event_items',
                'event_participants',
                'messages',
                'notifications',
                'activities'
            ];

            for (const table of requiredTables) {
                try {
                    const { data, error } = await window.supabase
                        .from(table)
                        .select('*')
                        .limit(1);
                    
                    if (error) {
                        this.results.errors.push(`テーブル ${table} アクセスエラー: ${error.message}`);
                    } else {
                        this.results.passed.push(`テーブル ${table} 確認OK`);
                    }
                } catch (e) {
                    this.results.errors.push(`テーブル ${table} 確認エラー: ${e.message}`);
                }
            }
        },

        // 5. UI要素の完全性チェック
        checkUIElements: function() {
            const requiredElements = {
                '.matching-grid': 'マッチンググリッド',
                '.matching-filters': 'フィルター',
                '.pagination': 'ページネーション',
                '.dashboard-header': 'ダッシュボードヘッダー',
                '.sidebar': 'サイドバー'
            };

            Object.entries(requiredElements).forEach(([selector, name]) => {
                const element = document.querySelector(selector);
                if (!element) {
                    this.results.warnings.push(`UI要素 ${name} (${selector}) が見つかりません`);
                } else {
                    this.results.passed.push(`UI要素 ${name} 確認OK`);
                }
            });
        },

        // 6. レスポンシブデザインチェック
        checkResponsiveness: function() {
            const viewport = document.querySelector('meta[name="viewport"]');
            if (!viewport) {
                this.results.errors.push('viewportメタタグが設定されていません');
            } else {
                this.results.passed.push('レスポンシブ設定確認OK');
            }

            // モバイル用CSSの確認
            const hasMatchingMobileFix = Array.from(document.styleSheets).some(sheet => {
                return sheet.href && sheet.href.includes('matching-mobile-fix.css');
            });

            if (hasMatchingMobileFix) {
                this.results.passed.push('モバイル対応CSS読み込み確認OK');
            } else {
                this.results.warnings.push('モバイル対応CSSが読み込まれていない可能性');
            }
        },

        // 7. セキュリティチェック
        checkSecurity: function() {
            // XSS対策の確認
            if (window.matchingSupabase && typeof window.matchingSupabase.escapeHtml === 'function') {
                this.results.passed.push('XSS対策関数実装確認OK');
            } else {
                this.results.errors.push('XSS対策関数が実装されていません');
            }

            // HTTPSチェック
            if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
                this.results.errors.push('HTTPSが使用されていません');
            } else {
                this.results.passed.push('HTTPS使用確認OK');
            }
        },

        // 8. パフォーマンスチェック
        checkPerformance: function() {
            // 画像の遅延読み込み
            const images = document.querySelectorAll('img');
            const lazyImages = Array.from(images).filter(img => img.loading === 'lazy');
            
            if (lazyImages.length === 0 && images.length > 10) {
                this.results.warnings.push('画像の遅延読み込みが設定されていません');
            }

            // JSファイルの数をチェック
            const scriptCount = document.querySelectorAll('script[src]').length;
            if (scriptCount > 30) {
                this.results.warnings.push(`JSファイルが多すぎます (${scriptCount}個) - バンドルを検討してください`);
            }
        },

        // 9. 設定ファイルチェック
        checkConfiguration: function() {
            if (window.MATCHING_CONFIG) {
                this.results.passed.push('マッチング設定ファイル読み込み確認OK');
                
                // サーバーサイドページネーションの確認
                if (window.MATCHING_CONFIG.USE_SERVER_PAGINATION) {
                    this.results.passed.push('サーバーサイドページネーション有効');
                }
            } else {
                this.results.errors.push('マッチング設定ファイルが読み込まれていません');
            }
        },

        // 10. 機能の動作確認
        checkFunctionality: async function() {
            // マッチング機能の初期化確認
            if (window.matchingSupabase) {
                this.results.passed.push('マッチング機能初期化確認OK');
                
                // 最適化版の確認
                if (typeof window.matchingSupabase.loadProfilesOptimized === 'function') {
                    this.results.passed.push('最適化版ページネーション実装確認OK');
                }
            } else {
                this.results.errors.push('マッチング機能が初期化されていません');
            }

            // イベント機能の確認
            if (window.eventsSupabase) {
                this.results.passed.push('イベント機能初期化確認OK');
            }

            // プロフィール同期の確認
            if (window.profileSync) {
                this.results.passed.push('プロフィール同期機能確認OK');
            }
        },

        // 全チェックを実行
        runAllChecks: async function() {
            // console.log('🔍 本番環境準備チェック開始...\n');
            
            this.results = {
                passed: [],
                warnings: [],
                errors: []
            };

            // 同期チェック
            this.checkConsoleLogs();
            this.checkErrorHandling();
            this.checkUIElements();
            this.checkResponsiveness();
            this.checkSecurity();
            this.checkPerformance();
            this.checkConfiguration();

            // 非同期チェック
            await this.checkSupabaseConnection();
            await this.checkRequiredTables();
            await this.checkFunctionality();

            // 結果表示
            this.displayResults();
        },

        // 結果表示
        displayResults: function() {
            // console.log('\n📊 チェック結果:\n');
            
            if (this.results.passed.length > 0) {
                // console.log('✅ 合格項目 (' + this.results.passed.length + '件):');
                this.results.passed.forEach(item => console.log('   ✓ ' + item));
            }

            if (this.results.warnings.length > 0) {
                // console.log('\n⚠️  警告項目 (' + this.results.warnings.length + '件):');
                this.results.warnings.forEach(item => console.log('   ⚠ ' + item));
            }

            if (this.results.errors.length > 0) {
                // console.log('\n❌ エラー項目 (' + this.results.errors.length + '件):');
                this.results.errors.forEach(item => console.log('   ✗ ' + item));
            }

            // サマリー
            const total = this.results.passed.length + this.results.warnings.length + this.results.errors.length;
            const score = Math.round((this.results.passed.length / total) * 100);
            
            // console.log('\n📈 スコア: ' + score + '% (' + this.results.passed.length + '/' + total + ')');
            
            if (this.results.errors.length === 0) {
                // console.log('\n🎉 エラーなし！本番環境への準備ができています。');
            } else {
                // console.log('\n⚠️  エラーを修正してから本番環境にデプロイしてください。');
            }

            return {
                passed: this.results.passed.length,
                warnings: this.results.warnings.length,
                errors: this.results.errors.length,
                score: score
            };
        }
    };

    // グローバルに公開
    // console.log('💡 本番環境チェックツール準備完了');
    // console.log('実行: productionReadyCheck.runAllChecks()');
    
})();