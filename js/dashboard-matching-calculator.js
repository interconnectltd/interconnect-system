/**
 * Dashboard Matching Calculator
 * マッチング統計の正確な計算
 */

(function() {
    'use strict';

    class DashboardMatchingCalculator {
        constructor() {
            this.cache = new Map();
            this.cacheTTL = 30000; // 30秒
        }

        /**
         * マッチング統計を計算
         */
        async calculateMatchingStats() {
            console.log('[MatchingCalculator] マッチング統計を計算中...');
            
            try {
                // 今月と先月のマッチング数を並行で取得
                const [currentMonthMatches, lastMonthMatches] = await Promise.all([
                    this.getMonthlyMatchingCount(0),  // 今月
                    this.getMonthlyMatchingCount(-1)   // 先月
                ]);

                // 総マッチング成功数も取得
                const totalMatches = await this.getTotalMatchingCount();

                // 増減率を計算
                let matchingIncreasePercentage = 0;
                if (lastMonthMatches > 0) {
                    matchingIncreasePercentage = Math.round(((currentMonthMatches - lastMonthMatches) / lastMonthMatches) * 100);
                } else if (currentMonthMatches > 0) {
                    matchingIncreasePercentage = 100;
                }

                // 増減の表示テキストを生成
                let changeType = 'neutral';
                if (matchingIncreasePercentage > 0) {
                    changeType = 'positive';
                } else if (matchingIncreasePercentage < 0) {
                    changeType = 'negative';
                }

                const stats = {
                    matching_success: totalMatches,
                    monthly_matches: currentMonthMatches,
                    last_month_matches: lastMonthMatches,
                    matching_increase_percentage: Math.abs(matchingIncreasePercentage),
                    matching_change_type: changeType,
                    matching_change_text: `${Math.abs(matchingIncreasePercentage)}% ${matchingIncreasePercentage >= 0 ? '増加' : '減少'}`,
                    calculated_at: new Date().toISOString()
                };

                console.log('[MatchingCalculator] 計算結果:', stats);
                return stats;

            } catch (error) {
                console.error('[MatchingCalculator] エラー:', error);
                return {
                    matching_success: 0,
                    monthly_matches: 0,
                    matching_increase_percentage: 0,
                    matching_change_type: 'neutral',
                    matching_change_text: 'データなし'
                };
            }
        }

        /**
         * 総マッチング成功数を取得
         */
        async getTotalMatchingCount() {
            const cacheKey = 'total_matching_count';
            
            // キャッシュチェック
            const cached = this.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
                return cached.value;
            }

            try {
                // まずmatchingsテーブルを試す
                let { count, error } = await window.supabase
                    .from('matchings')
                    .select('*', { count: 'exact', head: true })
                    .or('status.eq.success,status.eq.completed,status.is.null');

                if (error) {
                    console.log('[MatchingCalculator] matchingsテーブルが存在しません。user_activitiesから取得...');
                    
                    // user_activitiesから取得
                    const result = await window.supabase
                        .from('user_activities')
                        .select('*', { count: 'exact', head: true })
                        .in('activity_type', ['matching_success', 'matching']);
                    
                    count = result.count;
                    error = result.error;
                }

                const matchingCount = count || 0;
                
                // キャッシュに保存
                this.cache.set(cacheKey, {
                    value: matchingCount,
                    timestamp: Date.now()
                });

                return matchingCount;

            } catch (error) {
                console.error('[MatchingCalculator] getTotalMatchingCount エラー:', error);
                return 0;
            }
        }

        /**
         * 特定月のマッチング数を取得
         */
        async getMonthlyMatchingCount(monthOffset = 0) {
            const cacheKey = `matching_month_${monthOffset}`;
            
            // キャッシュチェック
            const cached = this.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
                return cached.value;
            }

            try {
                const now = new Date();
                const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
                const nextMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);
                
                // 月の開始日と終了日
                const startDate = this.formatDate(targetMonth);
                const endDate = this.formatDate(new Date(nextMonth - 1));
                
                console.log(`[MatchingCalculator] ${monthOffset === 0 ? '今月' : '先月'}のマッチングを取得: ${startDate} ~ ${endDate}`);

                // まずmatchingsテーブルを試す
                let { count, error } = await window.supabase
                    .from('matchings')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', startDate)
                    .lte('created_at', endDate)
                    .or('status.eq.success,status.eq.completed,status.is.null');

                if (error) {
                    // user_activitiesから取得
                    const result = await window.supabase
                        .from('user_activities')
                        .select('*', { count: 'exact', head: true })
                        .in('activity_type', ['matching_success', 'matching'])
                        .gte('created_at', startDate)
                        .lte('created_at', endDate);
                    
                    count = result.count;
                    error = result.error;
                }

                const matchingCount = count || 0;
                
                // キャッシュに保存
                this.cache.set(cacheKey, {
                    value: matchingCount,
                    timestamp: Date.now()
                });

                console.log(`[MatchingCalculator] ${monthOffset === 0 ? '今月' : '先月'}のマッチング数: ${matchingCount}`);
                return matchingCount;

            } catch (error) {
                console.error('[MatchingCalculator] getMonthlyMatchingCount エラー:', error);
                return 0;
            }
        }

        /**
         * 日付をYYYY-MM-DD形式にフォーマット
         */
        formatDate(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        /**
         * マッチングテーブルの構造を確認
         */
        async checkMatchingTableStructure() {
            try {
                // matchingsテーブル
                const { data: matchingData, error: matchingError } = await window.supabase
                    .from('matchings')
                    .select('*')
                    .limit(1);

                if (!matchingError && matchingData && matchingData.length > 0) {
                    console.log('[MatchingCalculator] matchingsテーブルの構造:', Object.keys(matchingData[0]));
                } else {
                    console.log('[MatchingCalculator] matchingsテーブルが存在しないか空です');
                }

                // user_activitiesのマッチング関連データ
                const { data: activityData } = await window.supabase
                    .from('user_activities')
                    .select('*')
                    .in('activity_type', ['matching_success', 'matching'])
                    .limit(5);

                if (activityData && activityData.length > 0) {
                    console.log('[MatchingCalculator] user_activitiesのマッチングデータ:', activityData);
                }

            } catch (error) {
                console.error('[MatchingCalculator] テーブル構造確認エラー:', error);
            }
        }
    }

    // グローバルに公開
    window.dashboardMatchingCalculator = new DashboardMatchingCalculator();

    // DashboardUIと統合
    if (window.dashboardUI) {
        const originalUpdateStatCards = window.dashboardUI.updateStatCards;
        
        window.dashboardUI.updateStatCards = async function(stats) {
            try {
                // マッチング統計を計算
                const matchingStats = await window.dashboardMatchingCalculator.calculateMatchingStats();
                
                // 統計をマージ
                const enhancedStats = {
                    ...stats,
                    matching_success: matchingStats.matching_success,
                    matching_increase_percentage: matchingStats.matching_increase_percentage,
                    matching_change_text: matchingStats.matching_change_text,
                    matching_change_type: matchingStats.matching_change_type
                };

                // マッチングカード専用の更新
                const matchingCard = document.querySelector('.stats-container .stat-card:nth-child(3)');
                if (matchingCard) {
                    const statValue = matchingCard.querySelector('.stat-value');
                    const changeSpan = matchingCard.querySelector('.stat-change span');
                    const changeContainer = matchingCard.querySelector('.stat-change');
                    const changeIcon = changeContainer?.querySelector('i');
                    
                    if (statValue) {
                        statValue.textContent = matchingStats.matching_success;
                    }
                    
                    if (changeSpan) {
                        changeSpan.textContent = matchingStats.matching_change_text;
                    }
                    
                    if (changeContainer) {
                        changeContainer.className = `stat-change ${matchingStats.matching_change_type}`;
                        
                        // アイコンも更新
                        if (changeIcon) {
                            if (matchingStats.matching_change_type === 'positive') {
                                changeIcon.className = 'fas fa-arrow-up';
                            } else if (matchingStats.matching_change_type === 'negative') {
                                changeIcon.className = 'fas fa-arrow-down';
                            } else {
                                changeIcon.className = 'fas fa-minus';
                            }
                        }
                    }
                }

                // 元の関数を呼び出し
                return originalUpdateStatCards.call(this, enhancedStats);
                
            } catch (error) {
                console.error('[MatchingCalculator] updateStatCards エラー:', error);
                return originalUpdateStatCards.call(this, stats);
            }
        }.bind(window.dashboardUI);
    }

    console.log('[MatchingCalculator] モジュールが読み込まれました');

})();