/**
 * Dashboard Matching Calculator Fix
 * マッチングテーブルの404エラーを修正
 */

(function() {
    'use strict';

    // 既存のgetMonthlyMatchingCountメソッドを上書き
    if (window.dashboardMatchingCalculator) {
        window.dashboardMatchingCalculator.getMonthlyMatchingCount = async function(monthOffset = 0) {
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

                let count = 0;

                // まずmatchingsテーブルを試す
                try {
                    const { count: matchingCount, error } = await window.supabase
                        .from('matchings')
                        .select('*', { count: 'exact', head: true })
                        .gte('created_at', startDate)
                        .lte('created_at', endDate);
                    
                    if (!error) {
                        count = matchingCount || 0;
                        console.log(`[MatchingCalculator] matchingsテーブルから取得: ${count}`);
                    } else {
                        throw error;
                    }
                } catch (error) {
                    console.log('[MatchingCalculator] matchingsテーブルが存在しない、user_activitiesを使用');
                    
                    // user_activitiesテーブルにフォールバック
                    const { count: activityCount, error: activityError } = await window.supabase
                        .from('user_activities')
                        .select('*', { count: 'exact', head: true })
                        .eq('activity_type', 'matching')
                        .gte('created_at', startDate)
                        .lte('created_at', endDate);
                    
                    if (!activityError) {
                        count = activityCount || 0;
                        console.log(`[MatchingCalculator] user_activitiesから取得: ${count}`);
                    } else {
                        // それでも失敗した場合はプロフィール交換をカウント
                        const { count: exchangeCount, error: exchangeError } = await window.supabase
                            .from('user_activities')
                            .select('*', { count: 'exact', head: true })
                            .eq('activity_type', 'profile_exchange')
                            .gte('created_at', startDate)
                            .lte('created_at', endDate);
                        
                        if (!exchangeError) {
                            count = exchangeCount || 0;
                            console.log(`[MatchingCalculator] profile_exchangeから取得: ${count}`);
                        }
                    }
                }
                
                // キャッシュに保存
                this.cache.set(cacheKey, {
                    value: count,
                    timestamp: Date.now()
                });

                console.log(`[MatchingCalculator] ${monthOffset === 0 ? '今月' : '先月'}のマッチング数: ${count}`);
                return count;

            } catch (error) {
                console.error('[MatchingCalculator] getMonthlyMatchingCount エラー:', error);
                return 0;
            }
        }.bind(window.dashboardMatchingCalculator);
    }

    console.log('[MatchingCalculatorFix] 自動フォールバック機能を適用しました');

})();