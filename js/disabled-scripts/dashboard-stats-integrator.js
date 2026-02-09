/**
 * Dashboard Stats Integrator
 * 全ての統計計算を統合して適用
 */

(function() {
    'use strict';

    class DashboardStatsIntegrator {
        constructor() {
            this.initialized = false;
        }

        /**
         * 統計の統合計算と適用
         */
        async integrateAllStats() {
            // console.log('[StatsIntegrator] 全統計を統合計算中...');

            try {
                // 各計算モジュールから統計を取得
                const [eventStats, matchingStats, messageStats] = await Promise.all([
                    this.getEventStats(),
                    this.getMatchingStats(),
                    this.getMessageStats()
                ]);

                // 統計を統合
                const integratedStats = {
                    // イベント統計
                    monthly_events: eventStats.monthly_events,
                    event_increase: eventStats.event_increase,
                    event_change_text: eventStats.event_change_text,
                    event_change_type: eventStats.event_change_type,
                    
                    // マッチング統計
                    matching_success: matchingStats.matching_success,
                    matching_change_text: matchingStats.matching_change_text,
                    matching_change_type: matchingStats.matching_change_type,
                    
                    // メッセージ統計
                    unread_messages: messageStats.unread_messages,
                    message_change_text: messageStats.message_change_text,
                    message_change_type: messageStats.message_change_type,
                    
                    // メンバー統計（既存のままでOK）
                    total_members: 0,
                    member_growth_percentage: 12,
                    
                    // タイムスタンプ
                    calculated_at: new Date().toISOString()
                };

                // UIを直接更新
                this.updateUI(integratedStats);
                
                return integratedStats;

            } catch (error) {
                console.error('[StatsIntegrator] エラー:', error);
                return null;
            }
        }

        /**
         * イベント統計を取得
         */
        async getEventStats() {
            if (window.dashboardEventCalculator) {
                return await window.dashboardEventCalculator.calculateEventStats();
            }
            return {
                monthly_events: 0,
                event_increase: 0,
                event_change_text: 'データなし',
                event_change_type: 'neutral'
            };
        }

        /**
         * マッチング統計を取得
         */
        async getMatchingStats() {
            if (window.dashboardMatchingCalculator) {
                return await window.dashboardMatchingCalculator.calculateMatchingStats();
            }
            return {
                matching_success: 0,
                matching_change_text: 'データなし',
                matching_change_type: 'neutral'
            };
        }

        /**
         * メッセージ統計を取得
         */
        async getMessageStats() {
            if (window.dashboardMessageCalculator) {
                return await window.dashboardMessageCalculator.calculateMessageStats();
            }
            return {
                unread_messages: 0,
                message_change_text: 'データなし',
                message_change_type: 'neutral'
            };
        }

        /**
         * UIを直接更新
         */
        updateUI(stats) {
            // console.log('[StatsIntegrator] UIを更新中...', stats);

            // 統計カードを取得
            const statCards = document.querySelectorAll('.stats-container .stat-card');
            
            // カード2: イベント
            if (statCards[1]) {
                this.updateStatCard(statCards[1], {
                    value: stats.monthly_events,
                    changeText: stats.event_change_text,
                    changeType: stats.event_change_type
                });
            }
            
            // カード3: マッチング
            if (statCards[2]) {
                this.updateStatCard(statCards[2], {
                    value: stats.matching_success,
                    changeText: stats.matching_change_text,
                    changeType: stats.matching_change_type
                });
            }
            
            // カード4: メッセージ
            if (statCards[3]) {
                this.updateStatCard(statCards[3], {
                    value: stats.unread_messages,
                    changeText: stats.message_change_text,
                    changeType: stats.message_change_type
                });
            }
        }

        /**
         * 個別のカードを更新
         */
        updateStatCard(card, data) {
            const statValue = card.querySelector('.stat-value');
            const changeSpan = card.querySelector('.stat-change span');
            const changeContainer = card.querySelector('.stat-change');
            const changeIcon = changeContainer?.querySelector('i');
            
            if (statValue) {
                statValue.textContent = data.value;
            }
            
            if (changeSpan) {
                changeSpan.textContent = data.changeText;
            }
            
            if (changeContainer) {
                changeContainer.className = `stat-change ${data.changeType}`;
                
                // アイコンも更新
                if (changeIcon) {
                    // メッセージの場合は矢印を逆にする（減少がポジティブ）
                    const isMessage = card.querySelector('.fa-envelope');
                    if (isMessage && data.changeType !== 'neutral') {
                        if (data.changeType === 'positive') {
                            changeIcon.className = 'fas fa-arrow-down';
                        } else {
                            changeIcon.className = 'fas fa-arrow-up';
                        }
                    } else {
                        // 通常のカード
                        if (data.changeType === 'positive') {
                            changeIcon.className = 'fas fa-arrow-up';
                        } else if (data.changeType === 'negative') {
                            changeIcon.className = 'fas fa-arrow-down';
                        } else {
                            changeIcon.className = 'fas fa-minus';
                        }
                    }
                }
            }
        }

        /**
         * 初期化と定期更新
         */
        init() {
            if (this.initialized) return;
            
            // console.log('[StatsIntegrator] 初期化中...');
            
            // ページ読み込み後に実行
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.startIntegration();
                });
            } else {
                this.startIntegration();
            }
            
            this.initialized = true;
        }

        /**
         * 統合処理を開始
         */
        startIntegration() {
            // 初回実行
            setTimeout(() => {
                this.integrateAllStats();
            }, 2000); // 他のモジュールが読み込まれるのを待つ
            
            // 30秒ごとに更新（メモリリーク対策）
            this.updateInterval = setInterval(() => {
                this.integrateAllStats();
            }, 30000);
            
            // ページ離脱時にクリーンアップ
            window.addEventListener('beforeunload', () => {
                if (this.updateInterval) {
                    clearInterval(this.updateInterval);
                }
            });
        }
    }

    // グローバルに公開
    window.dashboardStatsIntegrator = new DashboardStatsIntegrator();
    
    // 自動初期化
    window.dashboardStatsIntegrator.init();
    
    // console.log('[StatsIntegrator] モジュールが読み込まれました');
    // console.log('手動で統計を更新するには: dashboardStatsIntegrator.integrateAllStats()');

})();