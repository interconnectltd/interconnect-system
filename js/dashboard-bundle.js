/**
 * Dashboard Bundle
 * ダッシュボード関連のJavaScriptファイルを統合
 * 
 * 含まれるモジュール:
 * - 初期ローディング
 * - データ処理
 * - 統計計算
 * - UI更新
 * - イベント処理
 * - モーダル管理
 */

(function() {
    'use strict';

    // ===================================
    // 初期ローディング
    // ===================================
    class DashboardLoader {
        constructor() {
            this.modules = new Map();
            this.loadOrder = [
                'stats',
                'events',
                'activities',
                'charts',
                'ui'
            ];
        }

        async init() {
            // console.log('[DashboardLoader] Initializing...');
            
            // 各モジュールを順番に初期化
            for (const moduleName of this.loadOrder) {
                await this.loadModule(moduleName);
            }
            
            // console.log('[DashboardLoader] All modules loaded');
        }

        async loadModule(name) {
            try {
                switch (name) {
                    case 'stats':
                        this.modules.set('stats', new DashboardStats());
                        break;
                    case 'events':
                        this.modules.set('events', new DashboardEvents());
                        break;
                    case 'activities':
                        this.modules.set('activities', new DashboardActivities());
                        break;
                    case 'charts':
                        if (window.DashboardCharts) {
                            // 既存のチャートモジュールを使用
                            this.modules.set('charts', window.dashboardCharts);
                        }
                        break;
                    case 'ui':
                        this.modules.set('ui', new DashboardUI());
                        break;
                }
            } catch (error) {
                console.error(`[DashboardLoader] Error loading module ${name}:`, error);
            }
        }

        getModule(name) {
            return this.modules.get(name);
        }
    }

    // ===================================
    // 統計管理
    // ===================================
    class DashboardStats {
        constructor() {
            this.stats = {
                totalMembers: 0,
                monthlyEvents: 0,
                matchingSuccess: 0
            };
            this.init();
        }

        async init() {
            await this.loadStats();
            this.updateUI();
        }

        async loadStats() {
            try {
                if (!window.supabase) return;

                // メンバー数を取得
                const { count: memberCount } = await window.supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true });
                
                this.stats.totalMembers = memberCount || 1234;

                // 今月のイベント数を取得
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                
                const { data: events } = await window.supabase
                    .from('events')
                    .select('*')
                    .gte('event_date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`)
                    .lte('event_date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-31`);
                
                this.stats.monthlyEvents = events?.length || 15;

                // その他の統計はダミーデータ
                this.stats.matchingSuccess = 89;

            } catch (error) {
                console.error('[DashboardStats] Error loading stats:', error);
            }
        }

        updateUI() {
            // 統計値を更新
            const statElements = {
                totalMembers: document.querySelector('.stat-card:nth-child(1) .stat-value'),
                monthlyEvents: document.querySelector('.stat-card:nth-child(2) .stat-value'),
                matchingSuccess: document.querySelector('.stat-card:nth-child(3) .stat-value')
            };

            Object.entries(statElements).forEach(([key, element]) => {
                if (element) {
                    element.textContent = this.stats[key].toLocaleString();
                }
            });
        }
    }

    // ===================================
    // イベント管理
    // ===================================
    class DashboardEvents {
        constructor() {
            this.events = [];
            this.init();
        }

        async init() {
            await this.loadEvents();
            this.setupEventListeners();
        }

        async loadEvents() {
            try {
                if (!window.supabase) return;

                const { data: events } = await window.supabase
                    .from('events')
                    .select('*')
                    .eq('is_public', true)
                    .eq('is_cancelled', false)
                    .gte('event_date', new Date().toISOString())
                    .order('event_date', { ascending: true })
                    .limit(5);

                this.events = events || [];
                this.renderEvents();

            } catch (error) {
                console.error('[DashboardEvents] Error loading events:', error);
                this.loadDummyEvents();
            }
        }

        loadDummyEvents() {
            this.events = [
                {
                    id: 1,
                    title: '経営戦略セミナー',
                    event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    start_time: '14:00',
                    event_type: 'online'
                },
                {
                    id: 2,
                    title: '交流ランチ会',
                    event_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                    start_time: '12:00',
                    location: '東京・丸の内'
                }
            ];
            this.renderEvents();
        }

        renderEvents() {
            const container = document.querySelector('.event-list');
            if (!container) return;

            container.innerHTML = this.events.map(event => {
                const date = new Date(event.event_date);
                return `
                    <div class="event-item" data-event-id="${event.id}">
                        <div class="event-date">
                            <div class="date">${date.getDate()}</div>
                            <div class="month">${date.getMonth() + 1}月</div>
                        </div>
                        <div class="event-details">
                            <h4>${this.escapeHtml(event.title)}</h4>
                            <p>${event.start_time}〜 ${event.event_type === 'online' ? 'オンライン開催' : event.location || ''}</p>
                            <button class="btn-small btn-primary" onclick="dashboardBundle.showEventDetails(${event.id})">詳細を見る</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        setupEventListeners() {
            // イベント詳細モーダルの設定
            document.addEventListener('click', (e) => {
                if (e.target.matches('.event-item button')) {
                    const eventId = e.target.closest('.event-item').dataset.eventId;
                    this.showEventDetails(eventId);
                }
            });
        }

        showEventDetails(eventId) {
            const event = this.events.find(e => e.id == eventId);
            if (!event) return;

            // モーダル表示（既存のモーダル機能を使用）
            if (window.dashboardUI && window.dashboardUI.showEventModal) {
                window.dashboardUI.showEventModal(event);
            }
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    // ===================================
    // アクティビティ管理
    // ===================================
    class DashboardActivities {
        constructor() {
            this.activities = [];
            this.init();
        }

        async init() {
            await this.loadActivities();
        }

        async loadActivities() {
            // activity-event-filter.jsの機能を使用
            if (window.activityEventFilter) {
                return; // 既存の実装を使用
            }

            // フォールバック
            this.renderDummyActivities();
        }

        renderDummyActivities() {
            const container = document.querySelector('.activity-list');
            if (!container) return;

            const activities = [
                { icon: 'fa-user-plus', title: '山田太郎さんがコミュニティに参加しました', time: '2時間前' },
                { icon: 'fa-calendar-check', title: '月例ネットワーキング会が成功裏に終了', time: '5時間前' },
                { icon: 'fa-handshake', title: '3件の新しいビジネスマッチングが成立', time: '昨日' }
            ];

            container.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas ${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p>${activity.title}</p>
                        <span class="activity-time">${activity.time}</span>
                    </div>
                </div>
            `).join('');
        }
    }

    // ===================================
    // UI管理
    // ===================================
    class DashboardUI {
        constructor() {
            this.init();
        }

        init() {
            this.setupEventModal();
            this.setupSidebarToggle();
        }

        setupEventModal() {
            // 既存のモーダル機能を統合
            this.modalOverlay = document.querySelector('.modal-overlay');
            this.modal = document.getElementById('eventDetailModal');
        }

        showEventModal(event) {
            if (!this.modal) return;

            const modalTitle = document.getElementById('modalEventTitle');
            const modalBody = document.getElementById('modalEventBody');

            if (modalTitle) modalTitle.textContent = event.title;
            if (modalBody) {
                modalBody.innerHTML = `
                    <p><strong>日時:</strong> ${new Date(event.event_date).toLocaleDateString('ja-JP')} ${event.start_time}〜</p>
                    <p><strong>形式:</strong> ${event.event_type === 'online' ? 'オンライン' : 'オフライン'}</p>
                    ${event.description ? `<p><strong>説明:</strong> ${event.description}</p>` : ''}
                `;
            }

            this.modal.classList.add('show');
        }

        closeEventModal() {
            if (this.modal) {
                this.modal.classList.remove('show');
            }
        }

        setupSidebarToggle() {
            const toggle = document.querySelector('.sidebar-toggle');
            const sidebar = document.querySelector('.sidebar');
            
            if (toggle && sidebar) {
                toggle.addEventListener('click', () => {
                    sidebar.classList.toggle('collapsed');
                });
            }
        }
    }

    // ===================================
    // バンドルの初期化
    // ===================================
    class DashboardBundle {
        constructor() {
            this.loader = new DashboardLoader();
            this.init();
        }

        async init() {
            // console.log('[DashboardBundle] Initializing...');
            await this.loader.init();
            
            // グローバルメソッドを公開
            this.exposeMethods();
        }

        exposeMethods() {
            // 外部から呼び出せるメソッドを公開
            window.dashboardBundle = {
                showEventDetails: (eventId) => {
                    const events = this.loader.getModule('events');
                    if (events) events.showEventDetails(eventId);
                },
                closeEventModal: () => {
                    const ui = this.loader.getModule('ui');
                    if (ui) ui.closeEventModal();
                },
                refreshStats: async () => {
                    const stats = this.loader.getModule('stats');
                    if (stats) await stats.loadStats();
                }
            };
        }
    }

    // DOMContentLoaded時に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new DashboardBundle();
        });
    } else {
        new DashboardBundle();
    }

})();