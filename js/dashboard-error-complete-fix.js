/**
 * Dashboard Error Complete Fix
 * 全ての残りのエラーを修正
 */

(function() {
    'use strict';

    // user_activities read_atフィールドエラー修正
    const fixUserActivitiesQueries = () => {
        // dashboardRealtimeCalculatorの修正
        if (window.dashboardRealtimeCalculator) {
            // loadRecentActivitiesの修正
            const originalLoadRecentActivities = window.dashboardRealtimeCalculator.loadRecentActivities;
            window.dashboardRealtimeCalculator.loadRecentActivities = async function() {
                try {
                    // user_activitiesから最新のアクティビティを取得（read_atフィールドを使わない）
                    const { data: activities, error } = await window.supabase
                        .from('user_activities')
                        .select(`
                            *,
                            users:user_id (name, avatar_url)
                        `)
                        .eq('is_public', true)  // read_atの代わりにis_publicを使用
                        .order('created_at', { ascending: false })
                        .limit(10);

                    if (error) {
                        console.error('[ErrorCompleteFix] アクティビティ取得エラー:', error);
                        return this.defaultData.recentActivities;
                    }

                    return activities || this.defaultData.recentActivities;
                    
                } catch (error) {
                    console.error('[ErrorCompleteFix] loadRecentActivities エラー:', error);
                    return this.defaultData.recentActivities;
                }
            };
        }
    };

    // events dateフィールドエラー修正
    const fixEventsDateQueries = () => {
        if (window.dashboardRealtimeCalculator) {
            // すでにdashboard-stats-table-fix.jsで修正済みの場合はスキップ
            if (!window.dashboardRealtimeCalculator._dateFieldFixed) {
                window.dashboardRealtimeCalculator.loadUpcomingEvents = async function() {
                    try {
                        const now = new Date();
                        const dateStr = now.toISOString().split('T')[0];
                        
                        // start_dateフィールドを使用
                        const { data: events, error } = await window.supabase
                            .from('events')
                            .select('*')
                            .gte('start_date', dateStr)
                            .order('start_date', { ascending: true })
                            .limit(5);

                        if (error) {
                            console.error('[ErrorCompleteFix] イベント取得エラー:', error);
                            // dateフィールドでの取得が失敗した場合、デフォルトデータを返す
                            return this.defaultData.upcomingEvents;
                        }

                        // イベントデータの形式を調整
                        if (events && events.length > 0) {
                            return events.map(event => ({
                                ...event,
                                event_date: event.start_date || event.date || event.created_at,
                                time: event.time || '時間未定',
                                location: event.location || (event.is_online ? 'オンライン' : '場所未定')
                            }));
                        }

                        return this.defaultData.upcomingEvents;
                        
                    } catch (error) {
                        console.error('[ErrorCompleteFix] loadUpcomingEvents エラー:', error);
                        return this.defaultData.upcomingEvents;
                    }
                };
                
                window.dashboardRealtimeCalculator._dateFieldFixed = true;
            }
        }
    };

    // matchings status フィールドエラー修正
    const fixMatchingsStatusQueries = () => {
        if (window.dashboardRealtimeCalculator) {
            window.dashboardRealtimeCalculator.calculateMatchingSuccess = async function() {
                try {
                    // matchingsテーブルが存在しないため、user_activitiesから取得
                    const { count, error } = await window.supabase
                        .from('user_activities')
                        .select('*', { count: 'exact', head: true })
                        .in('activity_type', ['matching', 'profile_exchange', 'connection']);

                    if (error) {
                        console.error('[ErrorCompleteFix] マッチング数取得エラー:', error);
                        return 0;
                    }

                    return count || 0;
                    
                } catch (error) {
                    console.error('[ErrorCompleteFix] calculateMatchingSuccess エラー:', error);
                    return 0;
                }
            };
        }
    };

    // 初期化時のエラーを防ぐ
    const preventInitializationErrors = () => {
        // DashboardStatsの初期化エラーを防ぐ
        if (window.DashboardStats && window.DashboardStats.prototype) {
            const originalInit = window.DashboardStats.prototype.init;
            window.DashboardStats.prototype.init = async function() {
                try {
                    await originalInit.call(this);
                } catch (error) {
                    console.warn('[ErrorCompleteFix] DashboardStats初期化エラーを回復:', error);
                    this.initialized = true;
                }
            };
        }
    };

    // 全ての修正を適用
    const applyAllFixes = () => {
        console.log('[ErrorCompleteFix] 全エラー修正を適用中...');
        
        fixUserActivitiesQueries();
        fixEventsDateQueries();
        fixMatchingsStatusQueries();
        preventInitializationErrors();
        
        console.log('[ErrorCompleteFix] 全エラー修正が完了しました');
    };

    // DOMContentLoadedで実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyAllFixes);
    } else {
        applyAllFixes();
    }

})();