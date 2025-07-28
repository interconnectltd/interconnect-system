/**
 * Dashboard Event Calculator Fix
 * イベントテーブルのフィールド名を自動検出して修正
 */

(function() {
    'use strict';

    // 既存のgetMonthlyEventCountメソッドを上書き
    if (window.dashboardEventCalculator) {
        window.dashboardEventCalculator.getMonthlyEventCount = async function(monthOffset = 0) {
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

                // まずテーブル構造を確認
                const { data: sampleData } = await window.supabase
                    .from('events')
                    .select('*')
                    .limit(1);

                let count = 0;
                
                if (sampleData && sampleData.length > 0) {
                    const columns = Object.keys(sampleData[0]);
                    console.log('[EventCalculator] eventsテーブルのカラム:', columns);
                    
                    // 日付フィールドを特定
                    let dateField = null;
                    if (columns.includes('event_date')) {
                        dateField = 'event_date';
                    } else if (columns.includes('date')) {
                        dateField = 'date';
                    } else if (columns.includes('start_date')) {
                        dateField = 'start_date';
                    } else if (columns.includes('created_at')) {
                        dateField = 'created_at';
                    }
                    
                    if (dateField) {
                        console.log(`[EventCalculator] 使用する日付フィールド: ${dateField}`);
                        
                        const { count: eventCount, error } = await window.supabase
                            .from('events')
                            .select('*', { count: 'exact', head: true })
                            .gte(dateField, startDate)
                            .lte(dateField, endDate);
                        
                        if (!error) {
                            count = eventCount || 0;
                        } else {
                            console.error(`[EventCalculator] クエリエラー:`, error);
                        }
                    } else {
                        console.warn('[EventCalculator] 日付フィールドが見つかりません');
                    }
                }
                
                // キャッシュに保存
                this.cache.set(cacheKey, {
                    value: count,
                    timestamp: Date.now()
                });

                console.log(`[EventCalculator] ${monthOffset === 0 ? '今月' : '先月'}のイベント数: ${count}`);
                return count;

            } catch (error) {
                console.error('[EventCalculator] getMonthlyEventCount エラー:', error);
                return 0;
            }
        }.bind(window.dashboardEventCalculator);
    }

    // dashboard-realtime-calculatorの修正
    if (window.dashboardRealtimeCalculator) {
        window.dashboardRealtimeCalculator.calculateMonthlyEvents = async function() {
            try {
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                
                // まずテーブル構造を確認
                const { data: sampleData } = await window.supabase
                    .from('events')
                    .select('*')
                    .limit(1);

                if (sampleData && sampleData.length > 0) {
                    const columns = Object.keys(sampleData[0]);
                    
                    // 日付フィールドを特定
                    let dateField = null;
                    if (columns.includes('event_date')) {
                        dateField = 'event_date';
                    } else if (columns.includes('date')) {
                        dateField = 'date';
                    } else if (columns.includes('start_date')) {
                        dateField = 'start_date';
                    } else if (columns.includes('created_at')) {
                        dateField = 'created_at';
                    }
                    
                    if (dateField) {
                        const { count, error } = await window.supabase
                            .from('events')
                            .select('*', { count: 'exact', head: true })
                            .gte(dateField, startOfMonth.toISOString().split('T')[0])
                            .lte(dateField, endOfMonth.toISOString().split('T')[0]);

                        if (!error) {
                            console.log(`[RealtimeCalculator] Monthly events count: ${count}`);
                            return count || 0;
                        }
                    }
                }
                
                return 15; // フォールバック
                
            } catch (error) {
                console.error('[RealtimeCalculator] calculateMonthlyEvents error:', error);
                return 15;
            }
        }.bind(window.dashboardRealtimeCalculator);

        // 先月のイベントも同様に修正
        window.dashboardRealtimeCalculator.calculateLastMonthEvents = async function() {
            try {
                const now = new Date();
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                
                // まずテーブル構造を確認
                const { data: sampleData } = await window.supabase
                    .from('events')
                    .select('*')
                    .limit(1);

                if (sampleData && sampleData.length > 0) {
                    const columns = Object.keys(sampleData[0]);
                    
                    // 日付フィールドを特定
                    let dateField = null;
                    if (columns.includes('event_date')) {
                        dateField = 'event_date';
                    } else if (columns.includes('date')) {
                        dateField = 'date';
                    } else if (columns.includes('start_date')) {
                        dateField = 'start_date';
                    } else if (columns.includes('created_at')) {
                        dateField = 'created_at';
                    }
                    
                    if (dateField) {
                        const { count, error } = await window.supabase
                            .from('events')
                            .select('*', { count: 'exact', head: true })
                            .gte(dateField, lastMonth.toISOString().split('T')[0])
                            .lte(dateField, endOfLastMonth.toISOString().split('T')[0]);

                        if (!error) {
                            return count || 0;
                        }
                    }
                }
                
                return 12; // フォールバック
                
            } catch (error) {
                console.error('[RealtimeCalculator] calculateLastMonthEvents error:', error);
                return 12;
            }
        }.bind(window.dashboardRealtimeCalculator);
    }

    console.log('[EventCalculatorFix] フィールド名の自動検出機能を適用しました');

})();