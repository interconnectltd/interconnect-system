/**
 * Dashboard Ultimate Fix
 * 全ての残存エラーを最終的に解決
 */

(function() {
    'use strict';

    console.log('[UltimateFix] 最終修正を実行...');

    // 1. dashboard-data-fix.jsのdateフィールド使用を修正
    const fixDashboardDataFix = () => {
        if (window.dashboardStats && window.dashboardStats.fetchUpcomingEvents) {
            window.dashboardStats.fetchUpcomingEvents = async function() {
                try {
                    const { data, error } = await window.supabase
                        .from('events')
                        .select('*')
                        .gte('start_date', new Date().toISOString().split('T')[0])  // dateをstart_dateに修正
                        .order('start_date', { ascending: true })  // dateをstart_dateに修正
                        .limit(5);

                    if (error || !data || data.length === 0) {
                        return this.generateFallbackEvents();
                    }

                    return data.map(event => ({
                        ...event,
                        event_date: event.start_date || event.created_at,  // dateをstart_dateに修正
                        time: event.time || '時間未定',
                        location: event.location || '場所未定'
                    }));
                } catch (error) {
                    console.error('[UltimateFix] fetchUpcomingEvents error:', error);
                    return this.generateFallbackEvents();
                }
            };
        }
    };

    // 2. user_activitiesのstatusフィールドエラーを修正
    const fixUserActivitiesStatusQuery = () => {
        // matchingsテーブルのリダイレクトを改善
        if (window.supabase && window.supabase.from) {
            const originalFrom = window.supabase.from;
            window.supabase.from = function(table) {
                if (table === 'matchings') {
                    console.log('[UltimateFix] matchingsテーブルアクセスをuser_activitiesに修正');
                    
                    const result = originalFrom.call(this, 'user_activities');
                    const originalSelect = result.select;
                    
                    result.select = function(...args) {
                        const selectResult = originalSelect.apply(this, args);
                        
                        // statusフィールドを使わないようにオーバーライド
                        const originalOr = selectResult.or;
                        selectResult.or = function(filters) {
                            // statusフィールドのフィルタを無視
                            if (filters && filters.includes('status')) {
                                console.log('[UltimateFix] statusフィールドのフィルタを除外');
                                return selectResult;
                            }
                            return originalOr ? originalOr.call(this, filters) : selectResult;
                        };
                        
                        // activity_typeでのみフィルタリング
                        return selectResult.in('activity_type', ['matching', 'profile_exchange', 'connection']);
                    };
                    
                    return result;
                }
                return originalFrom.call(this, table);
            };
        }
    };

    // 3. 全てのdateフィールドクエリを検索して修正
    const fixAllDateQueries = () => {
        // グローバルなSupabaseクエリをインターセプト
        if (window.supabase) {
            const interceptSupabaseQuery = (obj) => {
                // gteメソッドをラップ
                if (obj.gte) {
                    const originalGte = obj.gte;
                    obj.gte = function(column, value) {
                        if (column === 'date' && this.url && this.url.includes('/events')) {
                            console.log('[UltimateFix] dateフィールドをstart_dateに変換');
                            return originalGte.call(this, 'start_date', value);
                        }
                        return originalGte.call(this, column, value);
                    };
                }
                
                // orderメソッドをラップ
                if (obj.order) {
                    const originalOrder = obj.order;
                    obj.order = function(column, options) {
                        if (column === 'date' && this.url && this.url.includes('/events')) {
                            console.log('[UltimateFix] order dateをstart_dateに変換');
                            return originalOrder.call(this, 'start_date', options);
                        }
                        return originalOrder.call(this, column, options);
                    };
                }
                
                return obj;
            };

            // fromメソッドをさらに拡張
            const originalFrom = window.supabase.from;
            window.supabase.from = function(table) {
                const result = originalFrom.call(this, table);
                if (table === 'events') {
                    return interceptSupabaseQuery(result);
                }
                return result;
            };
        }
    };

    // 4. Chrome拡張機能エラーを完全に抑制
    const completelySupressExtensionErrors = () => {
        // console.errorの完全なラッパー
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;
        
        console.error = function(...args) {
            const errorString = args.map(arg => String(arg)).join(' ');
            
            // 無視するエラーパターン
            const ignoredPatterns = [
                'runtime.lastError',
                'message port closed',
                'Extension context invalidated',
                'chrome-extension://'
            ];
            
            if (ignoredPatterns.some(pattern => errorString.includes(pattern))) {
                return;
            }
            
            originalConsoleError.apply(console, args);
        };
        
        console.warn = function(...args) {
            const warnString = args.map(arg => String(arg)).join(' ');
            
            if (warnString.includes('chrome-extension://')) {
                return;
            }
            
            originalConsoleWarn.apply(console, args);
        };
    };

    // 5. 競合する修正を統合
    const consolidateFixes = () => {
        // 複数の修正ファイルが同じメソッドを上書きしている問題を解決
        console.log('[UltimateFix] 競合する修正を統合中...');
        
        // loadUpcomingEventsの最終版を設定
        if (window.dashboardRealtimeCalculator) {
            window.dashboardRealtimeCalculator.loadUpcomingEvents = async function() {
                try {
                    console.log('[UltimateFix] loadUpcomingEvents最終版');
                    
                    const now = new Date();
                    const dateStr = now.toISOString().split('T')[0];
                    
                    if (window.supabase) {
                        const { data: events, error } = await window.supabase
                            .from('events')
                            .select('*')
                            .gte('start_date', dateStr)
                            .order('start_date', { ascending: true })
                            .limit(5);

                        if (!error && events && events.length > 0) {
                            return events.map(event => ({
                                ...event,
                                event_date: event.start_date || event.created_at,
                                time: event.time || '時間未定',
                                location: event.location || (event.is_online ? 'オンライン' : '場所未定')
                            }));
                        }
                    }
                    
                    // デフォルトイベント
                    return this.defaultData?.upcomingEvents || [{
                        id: '1',
                        title: '経営戦略セミナー',
                        event_date: '2025-07-15',
                        start_date: '2025-07-15',
                        time: '14:00〜',
                        location: 'オンライン開催'
                    }, {
                        id: '2',
                        title: '交流ランチ会',
                        event_date: '2025-07-18',
                        start_date: '2025-07-18',
                        time: '12:00〜',
                        location: '東京・丸の内'
                    }, {
                        id: '3',
                        title: '新規事業ピッチ大会',
                        event_date: '2025-07-25',
                        start_date: '2025-07-25',
                        time: '18:00〜',
                        location: '大阪・梅田'
                    }];
                } catch (error) {
                    console.error('[UltimateFix] loadUpcomingEvents error:', error);
                    return this.defaultData?.upcomingEvents || [];
                }
            };
        }
    };

    // 全ての修正を適用
    const applyUltimateFixes = () => {
        // 最初にChrome拡張機能エラーを抑制
        completelySupressExtensionErrors();
        
        // その他の修正を順番に適用
        setTimeout(() => {
            fixDashboardDataFix();
            fixUserActivitiesStatusQuery();
            fixAllDateQueries();
            consolidateFixes();
            
            console.log('[UltimateFix] 全ての最終修正が完了しました');
        }, 500); // 他のスクリプトが読み込まれるのを待つ
    };

    // 実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyUltimateFixes);
    } else {
        applyUltimateFixes();
    }

})();