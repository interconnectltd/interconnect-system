/**
 * Dashboard Stats Debug
 * 全統計のデバッグとテスト
 */

(function() {
    'use strict';

    window.dashboardStatsDebug = {
        /**
         * 全統計を確認
         */
        async checkAllStats() {
            console.log('===== ダッシュボード統計デバッグ =====');
            
            // メンバー数
            if (window.dashboardMemberCounter) {
                console.log('\n--- メンバー統計 ---');
                const memberCount = await window.dashboardMemberCounter.getTotalMembers();
                console.log('総メンバー数:', memberCount);
            }
            
            // イベント統計
            if (window.dashboardEventCalculator) {
                console.log('\n--- イベント統計 ---');
                const eventStats = await window.dashboardEventCalculator.calculateEventStats();
                console.log('イベント統計:', eventStats);
            }
            
            // マッチング統計
            if (window.dashboardMatchingCalculator) {
                console.log('\n--- マッチング統計 ---');
                const matchingStats = await window.dashboardMatchingCalculator.calculateMatchingStats();
                console.log('マッチング統計:', matchingStats);
            }
            
            // メッセージ統計
            if (window.dashboardMessageCalculator) {
                console.log('\n--- メッセージ統計 ---');
                const messageStats = await window.dashboardMessageCalculator.calculateMessageStats();
                console.log('メッセージ統計:', messageStats);
            }
            
            console.log('\n===== デバッグ終了 =====');
        },

        /**
         * テーブル構造を確認
         */
        async checkTableStructures() {
            console.log('===== テーブル構造確認 =====');
            
            const tables = ['events', 'matchings', 'messages', 'profiles', 'user_activities'];
            
            for (const table of tables) {
                console.log(`\n--- ${table}テーブル ---`);
                
                try {
                    const { data, error } = await window.supabase
                        .from(table)
                        .select('*')
                        .limit(1);
                    
                    if (error) {
                        console.error(`エラー:`, error.message);
                    } else if (data && data.length > 0) {
                        console.log('カラム:', Object.keys(data[0]));
                        console.log('サンプルデータ:', data[0]);
                    } else {
                        console.log('テーブルは空です');
                    }
                } catch (err) {
                    console.error('予期しないエラー:', err);
                }
            }
            
            console.log('\n===== 確認終了 =====');
        },

        /**
         * 統計の更新をテスト
         */
        async testStatUpdate() {
            console.log('===== 統計更新テスト =====');
            
            if (window.dashboardUpdater) {
                console.log('統計を更新中...');
                await window.dashboardUpdater.updateDashboard();
                console.log('更新完了！');
            } else {
                console.error('dashboardUpdaterが読み込まれていません');
            }
        },

        /**
         * キャッシュをクリア
         */
        clearAllCaches() {
            console.log('===== キャッシュクリア =====');
            
            // 各計算機のキャッシュをクリア
            if (window.dashboardMemberCounter) {
                window.dashboardMemberCounter.clearCache();
                console.log('メンバーカウンターのキャッシュをクリア');
            }
            
            if (window.dashboardEventCalculator) {
                window.dashboardEventCalculator.cache.clear();
                console.log('イベント計算機のキャッシュをクリア');
            }
            
            if (window.dashboardMatchingCalculator) {
                window.dashboardMatchingCalculator.cache.clear();
                console.log('マッチング計算機のキャッシュをクリア');
            }
            
            if (window.dashboardMessageCalculator) {
                window.dashboardMessageCalculator.cache.clear();
                console.log('メッセージ計算機のキャッシュをクリア');
            }
            
            console.log('すべてのキャッシュをクリアしました');
        },

        /**
         * 統計カードの現在の値を確認
         */
        checkCurrentCardValues() {
            console.log('===== 現在の統計カード値 =====');
            
            const cards = document.querySelectorAll('.stat-card');
            cards.forEach((card, index) => {
                const label = card.querySelector('.stat-label')?.textContent;
                const value = card.querySelector('.stat-value')?.textContent;
                const change = card.querySelector('.stat-change span')?.textContent;
                const changeClass = card.querySelector('.stat-change')?.className;
                
                console.log(`\nカード${index + 1}: ${label}`);
                console.log('  値:', value);
                console.log('  変化:', change);
                console.log('  クラス:', changeClass);
            });
        },

        /**
         * 完全なリフレッシュ
         */
        async fullRefresh() {
            console.log('===== 完全リフレッシュ開始 =====');
            
            // キャッシュクリア
            this.clearAllCaches();
            
            // 強制更新
            if (window.dashboardUpdater) {
                await window.dashboardUpdater.forceRefresh();
            }
            
            console.log('完全リフレッシュ完了');
        }
    };

    // コンソールで使用できるようにする
    console.log('ダッシュボード統計デバッグツールが利用可能です:');
    console.log('- dashboardStatsDebug.checkAllStats() : 全統計を確認');
    console.log('- dashboardStatsDebug.checkTableStructures() : テーブル構造確認');
    console.log('- dashboardStatsDebug.testStatUpdate() : 統計更新テスト');
    console.log('- dashboardStatsDebug.clearAllCaches() : キャッシュクリア');
    console.log('- dashboardStatsDebug.checkCurrentCardValues() : 現在のカード値確認');
    console.log('- dashboardStatsDebug.fullRefresh() : 完全リフレッシュ');

})();