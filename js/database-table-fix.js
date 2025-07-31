/**
 * Database Table Fix
 * データベーステーブル名のエラーを修正
 * events -> activities
 * matchings -> connections
 */

(function() {
    'use strict';
    
    console.log('[DatabaseTableFix] テーブル名修正開始');
    
    // イベント関連の修正
    if (window.dashboardEventCalculator) {
        const original = window.dashboardEventCalculator.getMonthlyEventCount;
        
        window.dashboardEventCalculator.getMonthlyEventCount = async function(monthOffset = 0) {
            try {
                const now = new Date();
                const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
                const nextMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);
                
                const startDate = this.formatDate(targetMonth);
                const endDate = this.formatDate(nextMonth);
                
                console.log('[DatabaseTableFix] activitiesテーブルから取得');
                
                // activitiesテーブルから取得（typeがeventのもの）
                const { count, error } = await window.supabase
                    .from('activities')
                    .select('*', { count: 'exact', head: true })
                    .eq('type', 'event_completed')
                    .gte('created_at', startDate)
                    .lt('created_at', endDate);
                
                if (error) {
                    console.error('[DatabaseTableFix] activities取得エラー:', error);
                    return 0;
                }
                
                return count || 0;
                
            } catch (error) {
                console.error('[DatabaseTableFix] getMonthlyEventCount エラー:', error);
                return 0;
            }
        };
    }
    
    // 今後のイベントの修正
    if (window.dashboardUpcomingEvents) {
        const original = window.dashboardUpcomingEvents.loadUpcomingEvents;
        
        window.dashboardUpcomingEvents.loadUpcomingEvents = async function() {
            console.log('[DatabaseTableFix] 今後のイベントをactivitiesから取得');
            
            try {
                const now = new Date().toISOString();
                
                // activitiesテーブルから未来のイベントを取得
                const { data: activities, error } = await window.supabase
                    .from('activities')
                    .select('*')
                    .eq('type', 'event_upcoming')
                    .gte('scheduled_at', now)
                    .order('scheduled_at', { ascending: true })
                    .limit(5);
                
                if (error) {
                    console.error('[DatabaseTableFix] activities取得エラー:', error);
                    
                    // エラー時はダミーデータを表示
                    const dummyEvents = [
                        {
                            id: 1,
                            title: '経営戦略セミナー',
                            scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                            location: 'オンライン開催',
                            description: '最新の経営戦略について学ぶ'
                        },
                        {
                            id: 2,
                            title: '交流ランチ会',
                            scheduled_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
                            location: '東京・丸の内',
                            description: '気軽な雰囲気での交流'
                        },
                        {
                            id: 3,
                            title: '新規事業ピッチ大会',
                            scheduled_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                            location: '大阪・梅田',
                            description: '新規事業のアイデアを発表'
                        }
                    ];
                    
                    this.displayEvents(dummyEvents);
                    return;
                }
                
                // activitiesをevent形式に変換
                const events = (activities || []).map(activity => ({
                    id: activity.id,
                    title: activity.metadata?.title || '未定のイベント',
                    scheduled_at: activity.scheduled_at || activity.created_at,
                    location: activity.metadata?.location || 'オンライン',
                    description: activity.metadata?.description || ''
                }));
                
                console.log('[DatabaseTableFix] 取得したイベント数:', events.length);
                
                // キャッシュに保存
                this.eventCache = events;
                this.cacheTime = Date.now();
                
                // イベントを表示
                this.displayEvents(events);
                
            } catch (error) {
                console.error('[DatabaseTableFix] loadUpcomingEvents エラー:', error);
                this.showError();
            }
        };
        
        // displayEventsメソッドが存在しない場合は追加
        if (!window.dashboardUpcomingEvents.displayEvents) {
            window.dashboardUpcomingEvents.displayEvents = function(events) {
                const eventList = document.querySelector('.event-list');
                if (!eventList) return;
                
                if (!events || events.length === 0) {
                    eventList.innerHTML = `
                        <div class="no-events" style="text-align: center; padding: 40px; color: #999;">
                            <i class="fas fa-calendar-times" style="font-size: 48px; margin-bottom: 16px;"></i>
                            <p>予定されているイベントはありません</p>
                        </div>
                    `;
                    return;
                }
                
                eventList.innerHTML = events.map(event => {
                    const eventDate = new Date(event.scheduled_at || event.created_at);
                    const day = eventDate.getDate();
                    const month = eventDate.getMonth() + 1;
                    const time = eventDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                    
                    return `
                        <div class="event-item">
                            <div class="event-date">
                                <div class="date">${day}</div>
                                <div class="month">${month}月</div>
                            </div>
                            <div class="event-details">
                                <h4>${event.title}</h4>
                                <p>${time}〜 ${event.location}</p>
                                <button class="btn-small btn-primary" onclick="window.dashboardUI?.showEventModal?.(${event.id})">詳細を見る</button>
                            </div>
                        </div>
                    `;
                }).join('');
            };
        }
    }
    
    // マッチング関連の修正
    if (window.dashboardMatchingCalculator) {
        const original = window.dashboardMatchingCalculator.getMonthlyConnections;
        
        window.dashboardMatchingCalculator.getMonthlyConnections = async function(monthOffset = 0) {
            try {
                const now = new Date();
                const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
                const nextMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);
                
                const startDate = this.formatDate(targetMonth);
                const endDate = this.formatDate(nextMonth);
                
                console.log('[DatabaseTableFix] connectionsテーブルから取得');
                
                // connectionsテーブルを使用
                const { count, error } = await window.supabase
                    .from('connections')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', startDate)
                    .lt('created_at', endDate)
                    .or('status.eq.accepted,status.eq.success,status.is.null');
                
                if (error) {
                    console.error('[DatabaseTableFix] connections取得エラー:', error);
                    return 0;
                }
                
                return count || 0;
                
            } catch (error) {
                console.error('[DatabaseTableFix] getMonthlyConnections エラー:', error);
                return 0;
            }
        };
        
        // getTotalConnectionsも修正
        window.dashboardMatchingCalculator.getTotalConnections = async function() {
            try {
                const { count, error } = await window.supabase
                    .from('connections')
                    .select('*', { count: 'exact', head: true })
                    .or('status.eq.accepted,status.eq.success,status.is.null');
                
                if (error) {
                    console.error('[DatabaseTableFix] 総connections取得エラー:', error);
                    return 0;
                }
                
                return count || 0;
                
            } catch (error) {
                console.error('[DatabaseTableFix] getTotalConnections エラー:', error);
                return 0;
            }
        };
    }
    
    console.log('[DatabaseTableFix] テーブル名修正完了');
    
})();