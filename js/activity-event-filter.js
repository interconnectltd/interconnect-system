/**
 * Activity & Event Filter
 * ダッシュボードのアクティビティとイベントのフィルタリング機能
 */

(function() {
    'use strict';

    class ActivityEventFilter {
        constructor() {
            this.activities = [];
            this.events = [];
            this.activityFilters = {
                type: 'all',
                timeRange: 'all'
            };
            this.eventFilters = {
                type: 'all',
                timeRange: 'upcoming'
            };
            
            this.init();
        }

        async init() {
            // フィルターUI を作成
            this.createFilterUI();
            
            // データを読み込む
            await this.loadActivities();
            await this.loadEvents();
            
            // イベントリスナーを設定
            this.setupEventListeners();
            
            console.log('[ActivityEventFilter] Initialized');
        }

        /**
         * フィルターUIを作成
         */
        createFilterUI() {
            // アクティビティフィルター
            const activityCard = document.querySelector('.recent-activity').closest('.content-card');
            if (activityCard) {
                const filterContainer = document.createElement('div');
                filterContainer.className = 'activity-filters';
                filterContainer.innerHTML = `
                    <select class="filter-select" id="activityTypeFilter">
                        <option value="all">すべてのアクティビティ</option>
                        <option value="member_joined">新規メンバー</option>
                        <option value="event_completed">イベント完了</option>
                        <option value="matching_success">マッチング成立</option>
                        <option value="message_sent">メッセージ</option>
                        <option value="connection_made">接続</option>
                    </select>
                    <select class="filter-select" id="activityTimeFilter">
                        <option value="all">全期間</option>
                        <option value="today">今日</option>
                        <option value="week">今週</option>
                        <option value="month">今月</option>
                    </select>
                `;
                
                const cardHeader = activityCard.querySelector('.card-header');
                cardHeader.appendChild(filterContainer);
            }

            // イベントフィルター
            const eventCard = document.querySelector('.event-list').closest('.content-card');
            if (eventCard) {
                const filterContainer = document.createElement('div');
                filterContainer.className = 'event-filters';
                filterContainer.innerHTML = `
                    <select class="filter-select" id="eventTypeFilter">
                        <option value="all">すべてのイベント</option>
                        <option value="online">オンライン</option>
                        <option value="offline">オフライン</option>
                        <option value="hybrid">ハイブリッド</option>
                    </select>
                    <select class="filter-select" id="eventTimeFilter">
                        <option value="upcoming">今後</option>
                        <option value="today">今日</option>
                        <option value="week">今週</option>
                        <option value="month">今月</option>
                        <option value="past">過去</option>
                    </select>
                `;
                
                const cardHeader = eventCard.querySelector('.card-header');
                const calendarBtn = cardHeader.querySelector('.btn-text');
                cardHeader.insertBefore(filterContainer, calendarBtn);
            }
        }

        /**
         * アクティビティを読み込む
         */
        async loadActivities() {
            try {
                // 実際のアクティビティデータを読み込む
                // 現在はダミーデータを使用
                this.activities = [
                    {
                        id: 1,
                        type: 'member_joined',
                        title: '山田太郎さんがコミュニティに参加しました',
                        user: '山田太郎',
                        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                        icon: 'fa-user-plus'
                    },
                    {
                        id: 2,
                        type: 'event_completed',
                        title: '月例ネットワーキング会が成功裏に終了',
                        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
                        icon: 'fa-calendar-check'
                    },
                    {
                        id: 3,
                        type: 'matching_success',
                        title: '3件の新しいビジネスマッチングが成立',
                        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
                        icon: 'fa-handshake'
                    },
                    {
                        id: 4,
                        type: 'message_sent',
                        title: '鈴木花子さんからメッセージが届きました',
                        user: '鈴木花子',
                        timestamp: new Date(Date.now() - 30 * 60 * 1000),
                        icon: 'fa-envelope'
                    },
                    {
                        id: 5,
                        type: 'connection_made',
                        title: '田中次郎さんとつながりました',
                        user: '田中次郎',
                        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                        icon: 'fa-link'
                    }
                ];

                // Supabaseからリアルタイムでアクティビティを取得する場合
                /*
                const { data, error } = await window.supabase
                    .from('activities')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (!error && data) {
                    this.activities = data;
                }
                */

                this.renderActivities();
            } catch (error) {
                console.error('[ActivityEventFilter] Error loading activities:', error);
            }
        }

        /**
         * イベントを読み込む
         */
        async loadEvents() {
            try {
                if (window.supabase) {
                    const { data, error } = await window.supabase
                        .from('events')
                        .select('*')
                        .eq('is_public', true)
                        .eq('is_cancelled', false)
                        .order('event_date', { ascending: true });

                    if (!error && data) {
                        this.events = data;
                        this.renderEvents();
                    }
                } else {
                    // フォールバック：ダミーデータ
                    this.events = [
                        {
                            id: 1,
                            title: 'DX推進セミナー',
                            event_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                            event_type: 'online',
                            participant_count: 15
                        },
                        {
                            id: 2,
                            title: 'ビジネス交流会',
                            event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                            event_type: 'offline',
                            participant_count: 8
                        }
                    ];
                    this.renderEvents();
                }
            } catch (error) {
                console.error('[ActivityEventFilter] Error loading events:', error);
            }
        }

        /**
         * イベントリスナーを設定
         */
        setupEventListeners() {
            // アクティビティフィルター
            const activityTypeFilter = document.getElementById('activityTypeFilter');
            const activityTimeFilter = document.getElementById('activityTimeFilter');
            
            if (activityTypeFilter) {
                activityTypeFilter.addEventListener('change', (e) => {
                    this.activityFilters.type = e.target.value;
                    this.renderActivities();
                });
            }
            
            if (activityTimeFilter) {
                activityTimeFilter.addEventListener('change', (e) => {
                    this.activityFilters.timeRange = e.target.value;
                    this.renderActivities();
                });
            }

            // イベントフィルター
            const eventTypeFilter = document.getElementById('eventTypeFilter');
            const eventTimeFilter = document.getElementById('eventTimeFilter');
            
            if (eventTypeFilter) {
                eventTypeFilter.addEventListener('change', (e) => {
                    this.eventFilters.type = e.target.value;
                    this.renderEvents();
                });
            }
            
            if (eventTimeFilter) {
                eventTimeFilter.addEventListener('change', (e) => {
                    this.eventFilters.timeRange = e.target.value;
                    this.renderEvents();
                });
            }
        }

        /**
         * アクティビティをレンダリング
         */
        renderActivities() {
            const container = document.querySelector('.recent-activity');
            if (!container) return;

            // フィルタリング
            let filteredActivities = this.filterActivities(this.activities);

            if (filteredActivities.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>アクティビティがありません</p>
                    </div>
                `;
                return;
            }

            // レンダリング
            container.innerHTML = filteredActivities.map(activity => `
                <div class="activity-item" data-type="${activity.type}">
                    <div class="activity-icon">
                        <i class="fas ${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p>${this.escapeHtml(activity.title)}</p>
                        <span class="activity-time">${this.formatTimeAgo(activity.timestamp)}</span>
                    </div>
                </div>
            `).join('');
        }

        /**
         * イベントをレンダリング
         */
        renderEvents() {
            const container = document.querySelector('.event-list');
            if (!container) return;

            // フィルタリング
            let filteredEvents = this.filterEvents(this.events);

            if (filteredEvents.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-calendar-alt"></i>
                        <p>イベントがありません</p>
                    </div>
                `;
                return;
            }

            // レンダリング
            container.innerHTML = filteredEvents.slice(0, 5).map(event => {
                const eventDate = new Date(event.event_date);
                const dateStr = eventDate.toLocaleDateString('ja-JP', {
                    month: 'numeric',
                    day: 'numeric',
                    weekday: 'short'
                });

                return `
                    <div class="event-item" data-event-id="${event.id}">
                        <div class="event-date">
                            <span class="date">${eventDate.getDate()}</span>
                            <span class="month">${eventDate.getMonth() + 1}月</span>
                        </div>
                        <div class="event-info">
                            <h4>${this.escapeHtml(event.title)}</h4>
                            <p class="event-meta">
                                <span><i class="fas fa-users"></i> ${event.participant_count || 0}名参加</span>
                                ${event.event_type === 'online' ? '<span><i class="fas fa-globe"></i> オンライン</span>' : ''}
                            </p>
                        </div>
                    </div>
                `;
            }).join('');

            // クリックイベントを追加
            container.querySelectorAll('.event-item').forEach(item => {
                item.addEventListener('click', () => {
                    const eventId = item.dataset.eventId;
                    if (window.eventModal) {
                        window.eventModal.show(eventId);
                    } else {
                        window.location.href = `events.html#event-${eventId}`;
                    }
                });
            });
        }

        /**
         * アクティビティをフィルタリング
         */
        filterActivities(activities) {
            return activities.filter(activity => {
                // タイプフィルター
                if (this.activityFilters.type !== 'all' && activity.type !== this.activityFilters.type) {
                    return false;
                }

                // 時間範囲フィルター
                if (this.activityFilters.timeRange !== 'all') {
                    const now = new Date();
                    const activityDate = new Date(activity.timestamp);
                    
                    switch (this.activityFilters.timeRange) {
                        case 'today':
                            if (activityDate.toDateString() !== now.toDateString()) return false;
                            break;
                        case 'week':
                            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                            if (activityDate < weekAgo) return false;
                            break;
                        case 'month':
                            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                            if (activityDate < monthAgo) return false;
                            break;
                    }
                }

                return true;
            });
        }

        /**
         * イベントをフィルタリング
         */
        filterEvents(events) {
            return events.filter(event => {
                // タイプフィルター
                if (this.eventFilters.type !== 'all' && event.event_type !== this.eventFilters.type) {
                    return false;
                }

                // 時間範囲フィルター
                const now = new Date();
                const eventDate = new Date(event.event_date);
                
                switch (this.eventFilters.timeRange) {
                    case 'upcoming':
                        if (eventDate < now) return false;
                        break;
                    case 'today':
                        if (eventDate.toDateString() !== now.toDateString()) return false;
                        break;
                    case 'week':
                        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                        if (eventDate < now || eventDate > weekFromNow) return false;
                        break;
                    case 'month':
                        const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                        if (eventDate < now || eventDate > monthFromNow) return false;
                        break;
                    case 'past':
                        if (eventDate >= now) return false;
                        break;
                }

                return true;
            });
        }

        /**
         * 時間を相対表示にフォーマット
         */
        formatTimeAgo(date) {
            const now = new Date();
            const diff = now - date;
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (seconds < 60) return 'たった今';
            if (minutes < 60) return `${minutes}分前`;
            if (hours < 24) return `${hours}時間前`;
            if (days < 7) return `${days}日前`;
            
            return date.toLocaleDateString('ja-JP');
        }

        /**
         * HTMLエスケープ
         */
        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    // グローバルに公開
    window.ActivityEventFilter = ActivityEventFilter;

    // DOMContentLoaded時に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.activityEventFilter = new ActivityEventFilter();
        });
    } else {
        window.activityEventFilter = new ActivityEventFilter();
    }

})();