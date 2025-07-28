/**
 * Dashboard Event Calculator
 * イベント統計の正確な計算
 */

(function() {
    'use strict';

    class DashboardEventCalculator {
        constructor() {
            this.cache = new Map();
            this.cacheTTL = 30000; // 30秒
        }

        /**
         * イベント統計を計算
         */
        async calculateEventStats() {
            console.log('[EventCalculator] イベント統計を計算中...');
            
            try {
                // 今月と先月のイベント数を並行で取得
                const [currentMonthEvents, lastMonthEvents] = await Promise.all([
                    this.getMonthlyEventCount(0),  // 今月
                    this.getMonthlyEventCount(-1)   // 先月
                ]);

                // イベント増減数
                const eventIncrease = currentMonthEvents - lastMonthEvents;
                
                // 増減率を計算
                let eventIncreasePercentage = 0;
                if (lastMonthEvents > 0) {
                    eventIncreasePercentage = Math.round((eventIncrease / lastMonthEvents) * 100);
                } else if (currentMonthEvents > 0) {
                    eventIncreasePercentage = 100; // 先月0で今月イベントがある場合は100%増
                }

                // 増減の表示テキストを生成
                let eventChangeText = '';
                let changeType = 'neutral';
                
                if (eventIncrease > 0) {
                    eventChangeText = `${eventIncrease}イベント増加`;
                    changeType = 'positive';
                } else if (eventIncrease < 0) {
                    eventChangeText = `${Math.abs(eventIncrease)}イベント減少`;
                    changeType = 'negative';
                } else {
                    eventChangeText = '変化なし';
                    changeType = 'neutral';
                }

                const stats = {
                    monthly_events: currentMonthEvents,
                    last_month_events: lastMonthEvents,
                    event_increase: eventIncrease,
                    event_increase_percentage: eventIncreasePercentage,
                    event_change_text: eventChangeText,
                    event_change_type: changeType,
                    calculated_at: new Date().toISOString()
                };

                console.log('[EventCalculator] 計算結果:', stats);
                return stats;

            } catch (error) {
                console.error('[EventCalculator] エラー:', error);
                return {
                    monthly_events: 0,
                    last_month_events: 0,
                    event_increase: 0,
                    event_increase_percentage: 0,
                    event_change_text: 'エラー',
                    event_change_type: 'neutral'
                };
            }
        }

        /**
         * 特定月のイベント数を取得
         * @param {number} monthOffset - 0は今月、-1は先月
         */
        async getMonthlyEventCount(monthOffset = 0) {
            const cacheKey = `events_month_${monthOffset}`;
            
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
                
                console.log(`[EventCalculator] ${monthOffset === 0 ? '今月' : '先月'}のイベントを取得: ${startDate} ~ ${endDate}`);

                // まずevent_dateフィールドで試す
                let { count, error } = await window.supabase
                    .from('events')
                    .select('*', { count: 'exact', head: true })
                    .gte('event_date', startDate)
                    .lte('event_date', endDate);

                // event_dateがエラーの場合、dateフィールドで試す
                if (error && error.message.includes('event_date')) {
                    console.log('[EventCalculator] event_dateフィールドが存在しません。dateフィールドで再試行...');
                    
                    const result = await window.supabase
                        .from('events')
                        .select('*', { count: 'exact', head: true })
                        .gte('date', startDate)
                        .lte('date', endDate);
                    
                    count = result.count;
                    error = result.error;
                }

                if (error) {
                    console.error(`[EventCalculator] イベント取得エラー:`, error);
                    return 0;
                }

                const eventCount = count || 0;
                
                // キャッシュに保存
                this.cache.set(cacheKey, {
                    value: eventCount,
                    timestamp: Date.now()
                });

                console.log(`[EventCalculator] ${monthOffset === 0 ? '今月' : '先月'}のイベント数: ${eventCount}`);
                return eventCount;

            } catch (error) {
                console.error('[EventCalculator] getMonthlyEventCount エラー:', error);
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
         * イベントテーブルの構造を確認
         */
        async checkEventTableStructure() {
            try {
                const { data, error } = await window.supabase
                    .from('events')
                    .select('*')
                    .limit(1);

                if (!error && data && data.length > 0) {
                    const columns = Object.keys(data[0]);
                    console.log('[EventCalculator] イベントテーブルのカラム:', columns);
                    
                    return {
                        hasEventDate: columns.includes('event_date'),
                        hasDate: columns.includes('date'),
                        columns: columns
                    };
                }

                return null;
            } catch (error) {
                console.error('[EventCalculator] テーブル構造確認エラー:', error);
                return null;
            }
        }
    }

    // グローバルに公開
    window.dashboardEventCalculator = new DashboardEventCalculator();

    // DashboardUIと統合
    if (window.dashboardUI) {
        const originalUpdateStatCards = window.dashboardUI.updateStatCards;
        
        window.dashboardUI.updateStatCards = async function(stats) {
            try {
                // イベント統計を計算
                const eventStats = await window.dashboardEventCalculator.calculateEventStats();
                
                // 統計をマージ
                const enhancedStats = {
                    ...stats,
                    monthly_events: eventStats.monthly_events,
                    event_increase: eventStats.event_increase,
                    event_change_text: eventStats.event_change_text,
                    event_change_type: eventStats.event_change_type
                };

                // イベントカード専用の更新
                const eventCard = document.querySelector('.stats-container .stat-card:nth-child(2)');
                if (eventCard) {
                    const statValue = eventCard.querySelector('.stat-value');
                    const changeSpan = eventCard.querySelector('.stat-change span');
                    const changeContainer = eventCard.querySelector('.stat-change');
                    
                    if (statValue) {
                        statValue.textContent = eventStats.monthly_events;
                    }
                    
                    if (changeSpan) {
                        changeSpan.textContent = eventStats.event_change_text;
                    }
                    
                    if (changeContainer) {
                        changeContainer.className = `stat-change ${eventStats.event_change_type}`;
                    }
                }

                // 元の関数を呼び出し
                return originalUpdateStatCards.call(this, enhancedStats);
                
            } catch (error) {
                console.error('[EventCalculator] updateStatCards エラー:', error);
                return originalUpdateStatCards.call(this, stats);
            }
        }.bind(window.dashboardUI);
    }

    console.log('[EventCalculator] モジュールが読み込まれました');

})();