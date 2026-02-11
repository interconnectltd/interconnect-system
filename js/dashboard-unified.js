// ============================================================
// Section: dashboard-bundle.js
// ============================================================
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
                    .from('user_profiles')
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

    // ===================================
    // dashboard-final-fixes.jsから救出したコード
    // ===================================
    class DashboardFinalFixes {
        static fixEventsDateField() {
            // dashboard-realtimeのloadUpcomingEventsを修正（拡張版）
            if (window.dashboardRealtimeCalculator) {
                const originalLoadUpcomingEvents = window.dashboardRealtimeCalculator.loadUpcomingEvents;

                window.dashboardRealtimeCalculator.loadUpcomingEvents = async function() {
                    try {
                        const now = new Date();
                        const dateStr = now.toISOString().split('T')[0];

                        // start_dateを使用（スキーマ検出結果より）
                        const { data: events, error } = await window.supabase
                            .from('events')
                            .select('*')
                            .gte('start_date', dateStr)
                            .order('start_date', { ascending: true })
                            .limit(5);

                        if (error) {
                            console.error('[FinalFixes] イベント取得エラー:', error);
                            // デフォルトイベントを返す
                            return [{
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
                        }

                        // イベントデータの形式を調整
                        return (events || []).map(event => ({
                            ...event,
                            event_date: event.start_date || event.created_at,
                            time: event.time || '時間未定',
                            location: event.location || (event.is_online ? 'オンライン' : '場所未定')
                        }));

                    } catch (error) {
                        console.error('[FinalFixes] loadUpcomingEvents エラー:', error);
                        return this.defaultData.upcomingEvents;
                    }
                };
            }
        }

        static fixMatchingsQueries() {
            // matchingsテーブル404エラーの追加修正
            if (window.dashboardMatchingCalculator) {
                const originalGetSuccessfulMatches = window.dashboardMatchingCalculator.getSuccessfulMatches;

                window.dashboardMatchingCalculator.getSuccessfulMatches = async function() {
                    try {
                        // matchingsテーブルが存在しないため、user_activitiesを使用
                        const { count, error } = await window.supabase
                            .from('user_activities')
                            .select('*', { count: 'exact', head: true })
                            .in('activity_type', ['matching', 'profile_exchange', 'connection']);

                        if (error) {
                            console.error('[FinalFixes] マッチング取得エラー:', error);
                            return 0;
                        }

                        return count || 0;

                    } catch (error) {
                        console.error('[FinalFixes] getSuccessfulMatches エラー:', error);
                        return 0;
                    }
                };
            }
        }

        static applyAllFixes() {
            // すべての修正を適用
            setTimeout(() => {
                this.fixEventsDateField();
                this.fixMatchingsQueries();
            }, 100);
        }
    }

    // DOMContentLoaded時に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new DashboardBundle();
            DashboardFinalFixes.applyAllFixes();
        });
    } else {
        new DashboardBundle();
        DashboardFinalFixes.applyAllFixes();
    }

})();

// ============================================================
// Section: dashboard-event-fix.js
// ============================================================
/**
 * ダッシュボードイベントクエリ修正
 * eventsテーブルのカラム名問題を解決
 */

(function() {
    'use strict';

    // console.log('[DashboardEventFix] イベントクエリ修正スクリプト読み込み');

    // 元のfetchEventsメソッドを安全に拡張
    if (window.DashboardEvents && window.DashboardEvents.prototype) {
        const originalFetchEvents = window.DashboardEvents.prototype.fetchEvents;
        window.DashboardEvents.prototype.fetchEvents = async function() {
            try {
                if (!window.supabase && !window.supabaseClient) {
                    // console.log('[DashboardEventFix] Supabaseクライアントが利用できません');
                    return;
                }

                const client = window.supabase || window.supabaseClient;

                // まずテーブル構造を確認
                const { data: sampleData, error: sampleError } = await client
                    .from('events')
                    .select('*')
                    .limit(1);

                if (sampleError) {
                    console.error('[DashboardEventFix] eventsテーブル確認エラー:', sampleError);
                    this.loadDummyEvents();
                    return;
                }

                // 利用可能な日付カラムを特定
                let dateColumn = null;
                if (sampleData && sampleData.length > 0) {
                    const columns = Object.keys(sampleData[0]);
                    const possibleDateColumns = ['event_date', 'start_date', 'date', 'created_at'];

                    for (const col of possibleDateColumns) {
                        if (columns.includes(col)) {
                            dateColumn = col;
                            break;
                        }
                    }
                }

                if (!dateColumn) {
                    // console.log('[DashboardEventFix] 日付カラムが見つかりません');
                    this.loadDummyEvents();
                    return;
                }

                // console.log('[DashboardEventFix] 使用する日付カラム:', dateColumn);

                // イベントを取得
                const { data: events, error } = await client
                    .from('events')
                    .select('*')
                    .eq('is_public', true)
                    .eq('is_cancelled', false)
                    .gte(dateColumn, new Date().toISOString())
                    .order(dateColumn, { ascending: true })
                    .limit(5);

                if (error) {
                    console.error('[DashboardEventFix] イベント取得エラー:', error);
                    this.loadDummyEvents();
                    return;
                }

                this.events = events || [];
                this.renderEvents();
                // console.log('[DashboardEventFix] イベント取得成功:', this.events.length);

            } catch (error) {
                console.error('[DashboardEventFix] Error loading events:', error);
                this.loadDummyEvents();
            }
        };
    }

    // DashboardCalculatorの修正（安全に拡張）
    if (window.DashboardCalculator && window.DashboardCalculator.prototype) {
        const originalCalculate = window.DashboardCalculator.prototype.calculateStats;

        window.DashboardCalculator.prototype.calculateStats = async function() {
            try {
                if (!window.supabase && !window.supabaseClient) {
                    // console.log('[DashboardEventFix] Calculatorで使用: ダミーデータ');
                    this.setDummyStats();
                    return;
                }

                const client = window.supabase || window.supabaseClient;

                // メンバー数の取得
                const { count: memberCount } = await client
                    .from('user_profiles')
                    .select('*', { count: 'exact', head: true });

                this.stats.totalMembers = memberCount || 1234;

                // イベント数の取得（カラム名を動的に決定）
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();

                // まずサンプルデータで利用可能なカラムを確認
                const { data: sampleData } = await client
                    .from('events')
                    .select('*')
                    .limit(1);

                let dateColumn = 'created_at'; // デフォルト
                if (sampleData && sampleData.length > 0) {
                    const columns = Object.keys(sampleData[0]);
                    const possibleDateColumns = ['event_date', 'start_date', 'date'];

                    for (const col of possibleDateColumns) {
                        if (columns.includes(col)) {
                            dateColumn = col;
                            break;
                        }
                    }
                }

                const { data: events } = await client
                    .from('events')
                    .select('*')
                    .gte(dateColumn, `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`)
                    .lte(dateColumn, `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-31`);

                this.stats.monthlyEvents = events?.length || 15;

                // その他の統計
                this.stats.matchingSuccess = 89;

                this.updateStats();

            } catch (error) {
                console.error('[DashboardEventFix] 統計計算エラー:', error);
                this.setDummyStats();
            }
        };
    }

    // console.log('[DashboardEventFix] 修正適用完了');

})();

// ============================================================
// Section: dashboard-stats-initializer.js
// ============================================================
/**
 * Dashboard Stats Initializer
 * ダッシュボードの統計情報を初期化時に「読み込み中」状態にする
 */

(function() {
    'use strict';

    class DashboardStatsInitializer {
        constructor() {
            this.initialized = false;
        }

        /**
         * 統計カードを初期化
         */
        init() {
            if (this.initialized) return;

            // console.log('[StatsInitializer] 統計カードを初期化中...');

            // 各統計カードを「読み込み中」状態に設定
            this.setLoadingState();

            this.initialized = true;
        }

        /**
         * 読み込み中状態を設定
         */
        setLoadingState() {
            // 総メンバー数カード
            const memberCard = document.querySelector('.stats-container .stat-card:nth-child(1)');
            if (memberCard) {
                const statValue = memberCard.querySelector('.stat-value');
                const changeSpan = memberCard.querySelector('.stat-change span');

                if (statValue) {
                    statValue.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    statValue.style.fontSize = '24px';
                }
                if (changeSpan) {
                    changeSpan.textContent = '計算中...';
                }
            }

            // 今月のイベントカード
            const eventCard = document.querySelector('.stats-container .stat-card:nth-child(2)');
            if (eventCard) {
                const statValue = eventCard.querySelector('.stat-value');
                const changeSpan = eventCard.querySelector('.stat-change span');

                if (statValue) {
                    statValue.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    statValue.style.fontSize = '24px';
                }
                if (changeSpan) {
                    changeSpan.textContent = '計算中...';
                }
            }

            // マッチング成功数カード
            const matchingCard = document.querySelector('.stats-container .stat-card:nth-child(3)');
            if (matchingCard) {
                const statValue = matchingCard.querySelector('.stat-value');
                const changeSpan = matchingCard.querySelector('.stat-change span');

                if (statValue) {
                    statValue.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    statValue.style.fontSize = '24px';
                }
                if (changeSpan) {
                    changeSpan.textContent = '計算中...';
                }
            }
        }

        /**
         * エラー状態を設定
         */
        setErrorState(cardIndex, message = 'エラー') {
            const card = document.querySelector(`.stats-container .stat-card:nth-child(${cardIndex})`);
            if (!card) return;

            const statValue = card.querySelector('.stat-value');
            const changeSpan = card.querySelector('.stat-change span');
            const changeContainer = card.querySelector('.stat-change');

            if (statValue) {
                statValue.innerHTML = '--';
                statValue.style.fontSize = '';
            }
            if (changeSpan) {
                changeSpan.textContent = message;
            }
            if (changeContainer) {
                changeContainer.className = 'stat-change neutral';
            }
        }

        /**
         * 統計値を設定（アニメーション付き）
         */
        setStatValue(cardIndex, value, changeText, changeType = 'neutral') {
            const card = document.querySelector(`.stats-container .stat-card:nth-child(${cardIndex})`);
            if (!card) return;

            const statValue = card.querySelector('.stat-value');
            const changeSpan = card.querySelector('.stat-change span');
            const changeContainer = card.querySelector('.stat-change');
            const changeIcon = changeContainer?.querySelector('i');

            if (statValue) {
                // 元のフォントサイズに戻す
                statValue.style.fontSize = '';

                // カウントアップアニメーション
                this.animateValue(statValue, 0, value, 1000);
            }

            if (changeSpan) {
                changeSpan.textContent = changeText;
            }

            if (changeContainer) {
                changeContainer.className = `stat-change ${changeType}`;

                // アイコンも更新
                if (changeIcon) {
                    if (changeType === 'positive') {
                        changeIcon.className = 'fas fa-arrow-up';
                    } else if (changeType === 'negative') {
                        changeIcon.className = 'fas fa-arrow-down';
                    } else {
                        changeIcon.className = 'fas fa-minus';
                    }
                }
            }
        }

        /**
         * 数値アニメーション
         */
        animateValue(element, start, end, duration) {
            const startTime = performance.now();
            const endTime = startTime + duration;

            const update = () => {
                const now = performance.now();
                const progress = Math.min((now - startTime) / duration, 1);

                // イージング関数（ease-out）
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const current = Math.floor(start + (end - start) * easeOut);

                element.textContent = this.formatNumber(current);

                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    element.textContent = this.formatNumber(end);
                }
            };

            requestAnimationFrame(update);
        }

        /**
         * 数値をフォーマット（3桁区切り）
         */
        formatNumber(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
    }

    // グローバルに公開
    window.dashboardStatsInitializer = new DashboardStatsInitializer();

    // 即座に初期化（DOMContentLoadedを待たない）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.dashboardStatsInitializer.init();
        });
    } else {
        // 既に読み込み済みの場合は少し遅延して実行
        setTimeout(() => {
            window.dashboardStatsInitializer.init();
        }, 10);
    }

    // console.log('[StatsInitializer] モジュールが読み込まれました');

})();

// ============================================================
// Section: dashboard-member-calculator.js
// ============================================================
/**
 * Dashboard Member Calculator
 * メンバー統計の正確な計算
 */

(function() {
    'use strict';

    class DashboardMemberCalculator {
        constructor() {
            this.cache = new Map();
            this.cacheTTL = 30000; // 30秒
        }

        /**
         * メンバー統計を計算
         */
        async calculateMemberStats() {
            // console.log('[MemberCalculator] メンバー統計を計算中...');

            try {
                // 総メンバー数と先月の新規メンバー数を並行で取得
                const [totalMembers, lastMonthNewMembers, thisMonthNewMembers] = await Promise.all([
                    this.getTotalMemberCount(),
                    this.getMonthlyNewMembers(-1),  // 先月
                    this.getMonthlyNewMembers(0)     // 今月
                ]);

                // 前月比の計算
                let memberChangePercentage = 0;
                if (totalMembers > 0 && lastMonthNewMembers > 0) {
                    // 今月の新規メンバー数を先月と比較
                    memberChangePercentage = Math.round((thisMonthNewMembers / lastMonthNewMembers - 1) * 100);
                } else if (thisMonthNewMembers > 0) {
                    memberChangePercentage = 100;
                }

                // 変化のタイプを判定
                let changeType = 'neutral';
                if (memberChangePercentage > 0) {
                    changeType = 'positive';
                } else if (memberChangePercentage < 0) {
                    changeType = 'negative';
                }

                const stats = {
                    total_members: totalMembers,
                    new_members_this_month: thisMonthNewMembers,
                    new_members_last_month: lastMonthNewMembers,
                    member_change_percentage: Math.abs(memberChangePercentage),
                    member_change_type: changeType,
                    member_change_text: `${Math.abs(memberChangePercentage)}% 前月比`,
                    calculated_at: new Date().toISOString()
                };

                // console.log('[MemberCalculator] 計算結果:', stats);
                return stats;

            } catch (error) {
                console.error('[MemberCalculator] エラー:', error);
                return {
                    total_members: 0,
                    member_change_percentage: 0,
                    member_change_type: 'neutral',
                    member_change_text: 'エラー'
                };
            }
        }

        /**
         * 総メンバー数を取得
         */
        async getTotalMemberCount() {
            const cacheKey = 'total_members';

            // キャッシュチェック
            const cached = this.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
                return cached.value;
            }

            try {
                const { count, error } = await window.supabase
                    .from('user_profiles')
                    .select('*', { count: 'exact', head: true });

                if (error) {
                    console.error('[MemberCalculator] プロファイル取得エラー:', error);
                    return 0;
                }

                const memberCount = count || 0;

                // キャッシュに保存
                this.cache.set(cacheKey, {
                    value: memberCount,
                    timestamp: Date.now()
                });

                // console.log('[MemberCalculator] 総メンバー数:', memberCount);
                return memberCount;

            } catch (error) {
                console.error('[MemberCalculator] getTotalMemberCount エラー:', error);
                return 0;
            }
        }

        /**
         * 特定月の新規メンバー数を取得
         */
        async getMonthlyNewMembers(monthOffset = 0) {
            const cacheKey = `new_members_month_${monthOffset}`;

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

                // console.log(`[MemberCalculator] ${monthOffset === 0 ? '今月' : '先月'}の新規メンバーを取得: ${startDate} ~ ${endDate}`);

                const { count, error } = await window.supabase
                    .from('user_profiles')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', startDate)
                    .lte('created_at', endDate);

                if (error) {
                    console.error(`[MemberCalculator] 新規メンバー取得エラー:`, error);
                    return 0;
                }

                const newMemberCount = count || 0;

                // キャッシュに保存
                this.cache.set(cacheKey, {
                    value: newMemberCount,
                    timestamp: Date.now()
                });

                // console.log(`[MemberCalculator] ${monthOffset === 0 ? '今月' : '先月'}の新規メンバー数: ${newMemberCount}`);
                return newMemberCount;

            } catch (error) {
                console.error('[MemberCalculator] getMonthlyNewMembers エラー:', error);
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
    }

    // グローバルに公開
    window.dashboardMemberCalculator = new DashboardMemberCalculator();

    // DashboardUIと統合
    if (window.dashboardUI) {
        const originalUpdateStatCards = window.dashboardUI.updateStatCards;

        window.dashboardUI.updateStatCards = async function(stats) {
            try {
                // メンバー統計を計算
                const memberStats = await window.dashboardMemberCalculator.calculateMemberStats();

                // 統計をマージ
                const enhancedStats = {
                    ...stats,
                    total_members: memberStats.total_members,
                    member_change_percentage: memberStats.member_change_percentage,
                    member_change_text: memberStats.member_change_text,
                    member_change_type: memberStats.member_change_type
                };

                // メンバーカード専用の更新
                const memberCard = document.querySelector('.stats-container .stat-card:nth-child(1)');
                if (memberCard) {
                    const statValue = memberCard.querySelector('.stat-value');
                    const changeSpan = memberCard.querySelector('.stat-change span');
                    const changeContainer = memberCard.querySelector('.stat-change');
                    const changeIcon = changeContainer?.querySelector('i');

                    if (statValue) {
                        // アニメーション付きで値を設定
                        if (window.dashboardStatsInitializer) {
                            window.dashboardStatsInitializer.setStatValue(
                                1,
                                memberStats.total_members,
                                memberStats.member_change_text,
                                memberStats.member_change_type
                            );
                        } else {
                            statValue.textContent = memberStats.total_members.toLocaleString();
                        }
                    }

                    if (changeSpan) {
                        changeSpan.textContent = memberStats.member_change_text;
                    }

                    if (changeContainer) {
                        changeContainer.className = `stat-change ${memberStats.member_change_type}`;

                        // アイコンも更新
                        if (changeIcon) {
                            if (memberStats.member_change_type === 'positive') {
                                changeIcon.className = 'fas fa-arrow-up';
                            } else if (memberStats.member_change_type === 'negative') {
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
                console.error('[MemberCalculator] updateStatCards エラー:', error);
                return originalUpdateStatCards.call(this, stats);
            }
        }.bind(window.dashboardUI);
    }

    // console.log('[MemberCalculator] モジュールが読み込まれました');

})();

// ============================================================
// Section: dashboard-event-calculator.js
// ============================================================
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
            // console.log('[EventCalculator] イベント統計を計算中...');

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

                // console.log('[EventCalculator] 計算結果:', stats);
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

                // console.log(`[EventCalculator] ${monthOffset === 0 ? '今月' : '先月'}のイベントを取得: ${startDate} ~ ${endDate}`);

                // まずevent_dateフィールドで試す
                let { count, error } = await window.supabase
                    .from('events')
                    .select('*', { count: 'exact', head: true })
                    .gte('event_date', startDate)
                    .lte('event_date', endDate);

                // event_dateがエラーの場合、dateフィールドで試す
                if (error && error.message.includes('event_date')) {
                    // console.log('[EventCalculator] event_dateフィールドが存在しません。dateフィールドで再試行...');

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

                // console.log(`[EventCalculator] ${monthOffset === 0 ? '今月' : '先月'}のイベント数: ${eventCount}`);
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
                    // console.log('[EventCalculator] イベントテーブルのカラム:', columns);

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

    // console.log('[EventCalculator] モジュールが読み込まれました');

})();

// ============================================================
// Section: dashboard-matching-calculator.js
// ============================================================
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
            // console.log('[MatchingCalculator] マッチング統計を計算中...');

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

                // console.log('[MatchingCalculator] 計算結果:', stats);
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
                    // console.log('[MatchingCalculator] matchingsテーブルが存在しません。user_activitiesから取得...');

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

                // console.log(`[MatchingCalculator] ${monthOffset === 0 ? '今月' : '先月'}のマッチングを取得: ${startDate} ~ ${endDate}`);

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

                // console.log(`[MatchingCalculator] ${monthOffset === 0 ? '今月' : '先月'}のマッチング数: ${matchingCount}`);
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
                    // console.log('[MatchingCalculator] matchingsテーブルの構造:', Object.keys(matchingData[0]));
                } else {
                    // console.log('[MatchingCalculator] matchingsテーブルが存在しないか空です');
                }

                // user_activitiesのマッチング関連データ
                const { data: activityData } = await window.supabase
                    .from('user_activities')
                    .select('*')
                    .in('activity_type', ['matching_success', 'matching'])
                    .limit(5);

                if (activityData && activityData.length > 0) {
                    // console.log('[MatchingCalculator] user_activitiesのマッチングデータ:', activityData);
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

    // console.log('[MatchingCalculator] モジュールが読み込まれました');

})();

// ============================================================
// Section: dashboard-upcoming-events.js
// ============================================================
/**
 * Dashboard Upcoming Events
 * 今後のイベントをデータベースから動的に取得・表示
 */

(function() {
    'use strict';

    class DashboardUpcomingEvents {
        constructor() {
            this.container = null;
            this.eventCache = null;
            this.cacheTime = null;
            this.cacheTTL = 60000; // 1分間キャッシュ
        }

        /**
         * 初期化
         */
        init() {
            // console.log('[UpcomingEvents] 初期化開始');

            // コンテナを探す
            this.findContainer();

            if (this.container) {
                this.loadUpcomingEvents();

                // 定期的に更新（5分ごと）
                if (this.updateInterval) {
                    clearInterval(this.updateInterval);
                }
                this.updateInterval = setInterval(() => {
                    this.loadUpcomingEvents();
                }, 300000);
            }
        }

        /**
         * コンテナ要素を探す
         */
        findContainer() {
            // 「今後のイベント」セクションを探す
            const headers = document.querySelectorAll('.card-header h3');
            for (const header of headers) {
                if (header.textContent.includes('今後のイベント')) {
                    const card = header.closest('.content-card');
                    if (card) {
                        this.container = card.querySelector('.event-list');
                        // console.log('[UpcomingEvents] コンテナを発見');
                        break;
                    }
                }
            }

            if (!this.container) {
                console.warn('[UpcomingEvents] イベントリストコンテナが見つかりません');
            }
        }

        /**
         * 今後のイベントを読み込み
         */
        async loadUpcomingEvents() {
            // キャッシュチェック
            if (this.eventCache && this.cacheTime && (Date.now() - this.cacheTime) < this.cacheTTL) {
                // console.log('[UpcomingEvents] キャッシュからイベントを表示');
                this.displayEvents(this.eventCache);
                return;
            }

            // console.log('[UpcomingEvents] データベースからイベントを取得中...');

            try {
                const now = new Date().toISOString();

                // event_itemsテーブルから取得（参加者数も含めて）
                let { data: events, error } = await window.supabase
                    .from('event_items')
                    .select(`
                        *,
                        event_participants!left (
                            id,
                            status
                        )
                    `)
                    .gte('event_date', now)
                    .order('event_date', { ascending: true })
                    .limit(5);

                // event_itemsテーブルが存在しない場合、eventsテーブルで試す（後方互換性）
                if (error && (error.code === '42P01' || error.message.includes('event_items'))) {
                    // console.log('[UpcomingEvents] event_itemsテーブルが存在しません。eventsテーブルで再試行...');

                    const result = await window.supabase
                        .from('events')
                        .select('*')
                        .gte('event_date', now)
                        .order('event_date', { ascending: true })
                        .limit(5);

                    events = result.data;
                    error = result.error;
                }

                if (error) {
                    console.error('[UpcomingEvents] イベント取得エラー:', error);
                    this.showError();
                    return;
                }

                // console.log('[UpcomingEvents] 取得したイベント数:', events?.length || 0);

                // キャッシュに保存
                this.eventCache = events || [];
                this.cacheTime = Date.now();

                // イベントを表示
                this.displayEvents(events || []);

            } catch (error) {
                console.error('[UpcomingEvents] エラー:', error);
                this.showError();
            }
        }

        /**
         * イベントを表示
         */
        displayEvents(events) {
            if (!this.container) return;

            // コンテナをクリア
            this.container.innerHTML = '';

            if (!events || events.length === 0) {
                this.container.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px; color: #999;">
                        <i class="fas fa-calendar-times" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                        <p>今後のイベントはありません</p>
                    </div>
                `;
                return;
            }

            // イベントをHTML化
            const eventsHTML = events.map(event => this.createEventHTML(event)).join('');
            this.container.innerHTML = eventsHTML;

            // イベントハンドラーを設定
            this.attachEventHandlers();
        }

        /**
         * イベントのHTMLを作成
         */
        createEventHTML(event) {
            const eventDate = new Date(event.event_date || event.date);
            const day = eventDate.getDate();
            const month = eventDate.getMonth() + 1;
            const monthName = this.getMonthName(month);
            const time = this.formatTime(eventDate);

            // タイトルとロケーション
            const title = event.title || event.name || 'イベント';
            const location = event.location || 'オンライン開催';

            // 参加者数（event_participantsのリレーションから取得）
            const participantCount = event.event_participants?.length || event.participant_count || event.participants?.length || 0;

            return `
                <div class="event-item" data-event-id="${event.id}">
                    <div class="event-date">
                        <div class="date">${day}</div>
                        <div class="month">${monthName}</div>
                    </div>
                    <div class="event-details">
                        <h4>${this.escapeHtml(title)}</h4>
                        <p class="event-info">
                            <i class="fas fa-clock"></i> ${time}
                            <i class="fas fa-map-marker-alt" style="margin-left: 12px;"></i> ${this.escapeHtml(location)}
                        </p>
                        ${participantCount > 0 ? `
                            <p class="event-participants">
                                <i class="fas fa-users"></i> ${participantCount}名参加予定
                            </p>
                        ` : ''}
                        <button class="btn-small btn-primary event-detail-btn">詳細を見る</button>
                    </div>
                </div>
            `;
        }

        /**
         * イベントハンドラーを設定
         */
        attachEventHandlers() {
            // 詳細ボタンのクリックイベント
            const detailButtons = this.container.querySelectorAll('.event-detail-btn');
            detailButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const eventItem = e.target.closest('.event-item');
                    const eventId = eventItem?.dataset.eventId;

                    if (eventId) {
                        this.showEventDetail(eventId);
                    }
                });
            });
        }

        /**
         * イベント詳細を表示
         */
        async showEventDetail(eventId) {
            // console.log('[UpcomingEvents] イベント詳細を表示:', eventId);

            // event-detail-modal.jsの関数を呼び出し
            if (window.eventDetailModal && typeof window.eventDetailModal.show === 'function') {
                window.eventDetailModal.show(eventId);
            } else {
                // フォールバック: イベントページへ遷移
                window.location.href = `events.html#event-${eventId}`;
            }
        }

        /**
         * エラー表示
         */
        showError() {
            if (!this.container) return;

            this.container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>イベントの読み込みに失敗しました</p>
                    <button class="btn-small btn-secondary" onclick="window.dashboardUpcomingEvents.loadUpcomingEvents()">
                        再読み込み
                    </button>
                </div>
            `;
        }

        /**
         * 月名を取得
         */
        getMonthName(month) {
            const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月',
                              '7月', '8月', '9月', '10月', '11月', '12月'];
            return monthNames[month - 1] || `${month}月`;
        }

        /**
         * 時刻をフォーマット
         */
        formatTime(date) {
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
            return `${hours}:${minutesStr}〜`;
        }

        /**
         * HTMLエスケープ
         */
        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        /**
         * イベントテーブルの構造を確認（デバッグ用）
         */
        async checkEventTableStructure() {
            try {
                // event_itemsテーブルから確認
                let { data, error } = await window.supabase
                    .from('event_items')
                    .select('*')
                    .limit(1);

                // event_itemsが存在しない場合はeventsテーブルを確認
                if (error && (error.code === '42P01' || error.message.includes('event_items'))) {
                    const result = await window.supabase
                        .from('events')
                        .select('*')
                        .limit(1);
                    data = result.data;
                    error = result.error;
                }

                if (!error && data && data.length > 0) {
                    const columns = Object.keys(data[0]);
                    // console.log('[UpcomingEvents] イベントテーブルのカラム:', columns);
                    // console.log('[UpcomingEvents] サンプルデータ:', data[0]);
                }
            } catch (error) {
                console.error('[UpcomingEvents] テーブル構造確認エラー:', error);
            }
        }
    }

    // グローバルに公開
    window.dashboardUpcomingEvents = new DashboardUpcomingEvents();

    // DOMContentLoadedで初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.dashboardUpcomingEvents.init();
        });
    } else {
        // 既に読み込み済みの場合
        setTimeout(() => {
            window.dashboardUpcomingEvents.init();
        }, 100);
    }

    // console.log('[UpcomingEvents] モジュールが読み込まれました');

})();

// ============================================================
// Section: dashboard-fix-loading.js
// ============================================================
/**
 * Dashboard Loading Fix
 * ダッシュボードのローディング問題を修正
 */

(function() {
    'use strict';

    // console.log('[DashboardFix] ローディング修正開始');

    // Supabaseクライアントの初期化を待つ
    function waitForSupabase() {
        return new Promise((resolve) => {
            if (window.supabaseClient) {
                resolve();
                return;
            }

            // supabaseReadyイベントを待つ
            window.addEventListener('supabaseReady', () => {
                resolve();
            });

            // タイムアウト後も確認
            setTimeout(() => {
                if (window.supabaseClient) {
                    resolve();
                }
            }, 3000);
        });
    }

    // 統計データの初期化
    async function initializeStats() {
        await waitForSupabase();

        if (!window.supabase) {
            console.error('[DashboardFix] Supabaseが初期化されていません');
            showFallbackData();
            return;
        }

        try {
            // 統計を更新
            if (window.dashboardMemberCalculator) {
                const memberStats = await window.dashboardMemberCalculator.calculateMemberStats();
                updateMemberCard(memberStats);
            }

            if (window.dashboardEventCalculator) {
                const eventStats = await window.dashboardEventCalculator.calculateEventStats();
                updateEventCard(eventStats);
            }

            if (window.dashboardMatchingCalculator) {
                const matchingStats = await window.dashboardMatchingCalculator.calculateMatchingStats();
                updateMatchingCard(matchingStats);
            }

        } catch (error) {
            console.error('[DashboardFix] 統計更新エラー:', error);
            showFallbackData();
        }
    }

    // メンバーカードの更新
    function updateMemberCard(stats) {
        const card = document.querySelector('.stats-container .stat-card:nth-child(1)');
        if (!card) return;

        const statValue = card.querySelector('.stat-value');
        const changeSpan = card.querySelector('.stat-change span');
        const changeContainer = card.querySelector('.stat-change');

        if (statValue) {
            statValue.textContent = stats.total_members || '0';
        }

        if (changeSpan) {
            changeSpan.textContent = stats.member_change_text || '0% 前月比';
        }

        if (changeContainer) {
            changeContainer.className = `stat-change ${stats.member_change_type || 'neutral'}`;
            const icon = changeContainer.querySelector('i');
            if (icon) {
                if (stats.member_change_type === 'positive') {
                    icon.className = 'fas fa-arrow-up';
                } else if (stats.member_change_type === 'negative') {
                    icon.className = 'fas fa-arrow-down';
                } else {
                    icon.className = 'fas fa-minus';
                }
            }
        }
    }

    // イベントカードの更新
    function updateEventCard(stats) {
        const card = document.querySelector('.stats-container .stat-card:nth-child(2)');
        if (!card) return;

        const statValue = card.querySelector('.stat-value');
        const changeSpan = card.querySelector('.stat-change span');
        const changeContainer = card.querySelector('.stat-change');

        if (statValue) {
            statValue.textContent = stats.events_this_month || '0';
        }

        if (changeSpan) {
            changeSpan.textContent = `${stats.event_change_count || 0}イベント増加`;
        }

        if (changeContainer) {
            changeContainer.className = `stat-change ${stats.event_change_type || 'neutral'}`;
        }
    }

    // マッチングカードの更新
    function updateMatchingCard(stats) {
        const card = document.querySelector('.stats-container .stat-card:nth-child(3)');
        if (!card) return;

        const statValue = card.querySelector('.stat-value');
        const changeSpan = card.querySelector('.stat-change span');
        const changeContainer = card.querySelector('.stat-change');

        if (statValue) {
            statValue.textContent = stats.total_connections || '0';
        }

        if (changeSpan) {
            changeSpan.textContent = stats.change_percentage
                ? `${Math.abs(stats.change_percentage)}% ${stats.change_percentage > 0 ? '増加' : '減少'}`
                : '0% 変化なし';
        }

        if (changeContainer) {
            changeContainer.className = `stat-change ${stats.change_type || 'neutral'}`;
        }
    }

    // フォールバックデータの表示
    function showFallbackData() {
        // console.log('[DashboardFix] フォールバックデータを表示');

        // 統計カードにデフォルト値を設定
        const statCards = document.querySelectorAll('.stat-card');

        if (statCards[0]) {
            const value = statCards[0].querySelector('.stat-value');
            const change = statCards[0].querySelector('.stat-change span');
            if (value) value.textContent = '0';
            if (change) change.textContent = 'データ取得中...';
        }

        if (statCards[1]) {
            const value = statCards[1].querySelector('.stat-value');
            const change = statCards[1].querySelector('.stat-change span');
            if (value) value.textContent = '0';
            if (change) change.textContent = 'データ取得中...';
        }

        if (statCards[2]) {
            const value = statCards[2].querySelector('.stat-value');
            const change = statCards[2].querySelector('.stat-change span');
            if (value) value.textContent = '0';
            if (change) change.textContent = 'データ取得中...';
        }
    }

    // 今後のイベントの修正
    async function fixUpcomingEvents() {
        await waitForSupabase();

        if (!window.supabase) {
            console.error('[DashboardFix] Supabaseが利用できません');
            return;
        }

        // DashboardUpcomingEventsの再初期化
        if (window.dashboardUpcomingEvents) {
            try {
                await window.dashboardUpcomingEvents.loadUpcomingEvents();
            } catch (error) {
                console.error('[DashboardFix] イベント読み込みエラー:', error);

                // エラー時はダミーデータを表示
                const eventList = document.querySelector('.event-list');
                if (eventList) {
                    eventList.innerHTML = `
                        <div class="no-events" style="text-align: center; padding: 40px; color: #999;">
                            <i class="fas fa-calendar-times" style="font-size: 48px; margin-bottom: 16px;"></i>
                            <p>イベントデータを読み込めませんでした</p>
                        </div>
                    `;
                }
            }
        }
    }

    // リアルタイム通知の修正
    async function fixRealtimeNotifications() {
        await waitForSupabase();

        if (!window.supabase) {
            console.error('[DashboardFix] Supabaseが利用できません');
            return;
        }

        // RealtimeNotificationsの再初期化を試みる
        if (!window.realtimeNotifications && window.RealtimeNotifications) {
            try {
                window.realtimeNotifications = new window.RealtimeNotifications();
            } catch (error) {
                console.error('[DashboardFix] リアルタイム通知の初期化エラー:', error);
            }
        }
    }

    // 初期化
    function init() {
        // DOMContentLoadedを待つ
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        // console.log('[DashboardFix] 初期化開始');

        // 各修正を実行
        Promise.all([
            initializeStats(),
            fixUpcomingEvents(),
            fixRealtimeNotifications()
        ]).then(() => {
            // console.log('[DashboardFix] すべての修正が完了');
        }).catch(error => {
            console.error('[DashboardFix] 修正中にエラー:', error);
        });
    }

    // 開始
    init();

})();

// ============================================================
// Section: dashboard-charts.js
// ============================================================
/**
 * Dashboard Charts
 * ダッシュボードのデータビジュアライゼーション
 */

(function() {
    'use strict';

    class DashboardCharts {
        constructor() {
            this.charts = {};
            this.chartColors = {
                primary: '#2563eb',
                secondary: '#10b981',
                accent: '#f59e0b',
                danger: '#ef4444',
                gray: '#6b7280'
            };

            this.init();
        }

        async init() {
            // Chart.jsが読み込まれているか確認
            if (typeof Chart === 'undefined') {
                console.warn('[DashboardCharts] Chart.js not loaded. Loading from CDN...');
                await this.loadChartJS();
            }

            // チャートコンテナを作成
            this.createChartContainers();

            // データを読み込んでチャートを作成
            await this.loadDataAndCreateCharts();

            // console.log('[DashboardCharts] Initialized');
        }

        /**
         * Chart.jsを動的に読み込む
         */
        async loadChartJS() {
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }

        /**
         * チャートコンテナを作成
         */
        createChartContainers() {
            // 統計カードの後に新しいセクションを追加
            const mainContent = document.querySelector('.dashboard-content');
            if (!mainContent) return;

            const chartsSection = document.createElement('div');
            chartsSection.className = 'charts-section';
            chartsSection.innerHTML = `
                <div class="charts-grid">
                    <!-- メンバー成長チャート -->
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3>メンバー成長推移</h3>
                            <select class="chart-period-select" data-chart="memberGrowth">
                                <option value="week">過去1週間</option>
                                <option value="month" selected>過去1ヶ月</option>
                                <option value="year">過去1年</option>
                            </select>
                        </div>
                        <div class="chart-body">
                            <canvas id="memberGrowthChart"></canvas>
                        </div>
                    </div>

                    <!-- イベント参加率チャート -->
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3>イベント参加統計</h3>
                            <select class="chart-period-select" data-chart="eventStats">
                                <option value="week">今週</option>
                                <option value="month" selected>今月</option>
                                <option value="quarter">四半期</option>
                            </select>
                        </div>
                        <div class="chart-body">
                            <canvas id="eventStatsChart"></canvas>
                        </div>
                    </div>

                    <!-- 業界別分布チャート -->
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3>業界別メンバー分布</h3>
                        </div>
                        <div class="chart-body">
                            <canvas id="industryChart"></canvas>
                        </div>
                    </div>

                    <!-- アクティビティヒートマップ -->
                    <div class="chart-card chart-card-wide">
                        <div class="chart-header">
                            <h3>週間アクティビティ</h3>
                        </div>
                        <div class="chart-body">
                            <canvas id="activityHeatmapChart"></canvas>
                        </div>
                    </div>
                </div>
            `;

            // 統計カードの後に挿入
            const statsContainer = document.querySelector('.stats-container');
            if (statsContainer && statsContainer.parentNode) {
                statsContainer.parentNode.insertBefore(chartsSection, statsContainer.nextSibling);
            }

            // イベントリスナーを設定
            chartsSection.querySelectorAll('.chart-period-select').forEach(select => {
                select.addEventListener('change', (e) => {
                    this.handlePeriodChange(e.target.dataset.chart, e.target.value);
                });
            });
        }

        /**
         * データを読み込んでチャートを作成
         */
        async loadDataAndCreateCharts() {
            // メンバー成長チャート
            await this.createMemberGrowthChart();

            // イベント参加統計チャート
            await this.createEventStatsChart();

            // 業界別分布チャート
            await this.createIndustryChart();

            // アクティビティヒートマップ
            await this.createActivityHeatmapChart();
        }

        /**
         * メンバー成長チャートを作成
         */
        async createMemberGrowthChart() {
            const ctx = document.getElementById('memberGrowthChart');
            if (!ctx) return;

            // ローディング表示
            this.showChartLoading('memberGrowthChart');

            // データを取得
            const data = await this.fetchMemberGrowthData('month');

            this.charts.memberGrowth = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: '総メンバー数',
                        data: data.total,
                        borderColor: this.chartColors.primary,
                        backgroundColor: this.chartColors.primary + '20',
                        fill: true,
                        tension: 0.4
                    }, {
                        label: '新規メンバー',
                        data: data.new,
                        borderColor: this.chartColors.secondary,
                        backgroundColor: this.chartColors.secondary + '20',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: '#ddd',
                            borderWidth: 1
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }

        /**
         * イベント参加統計チャートを作成
         */
        async createEventStatsChart() {
            const ctx = document.getElementById('eventStatsChart');
            if (!ctx) return;

            // ローディング表示
            this.showChartLoading('eventStatsChart');

            // データを取得
            const data = await this.fetchEventStatsData('month');

            this.charts.eventStats = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'オンライン',
                        data: data.online,
                        backgroundColor: this.chartColors.primary,
                        borderRadius: 4
                    }, {
                        label: 'オフライン',
                        data: data.offline,
                        backgroundColor: this.chartColors.secondary,
                        borderRadius: 4
                    }, {
                        label: 'ハイブリッド',
                        data: data.hybrid,
                        backgroundColor: this.chartColors.accent,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            stacked: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            stacked: true,
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }

        /**
         * 業界別分布チャートを作成
         */
        async createIndustryChart() {
            const ctx = document.getElementById('industryChart');
            if (!ctx) return;

            // ローディング表示
            this.showChartLoading('industryChart');

            // データを取得
            const data = await this.fetchIndustryData();

            this.charts.industry = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: data.labels,
                    datasets: [{
                        data: data.values,
                        backgroundColor: [
                            this.chartColors.primary,
                            this.chartColors.secondary,
                            this.chartColors.accent,
                            this.chartColors.danger,
                            this.chartColors.gray
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: ${value}人 (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        /**
         * アクティビティヒートマップチャートを作成
         */
        async createActivityHeatmapChart() {
            const ctx = document.getElementById('activityHeatmapChart');
            if (!ctx) return;

            // ローディング表示
            this.showChartLoading('activityHeatmapChart');

            // データを取得
            const data = await this.fetchActivityHeatmapData();

            this.charts.activityHeatmap = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['月', '火', '水', '木', '金', '土', '日'],
                    datasets: data.datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                title: function(tooltipItems) {
                                    const item = tooltipItems[0];
                                    return `${item.label} ${item.dataset.label}時`;
                                },
                                label: function(context) {
                                    return `アクティビティ: ${context.parsed.y}件`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }

        /**
         * 期間変更を処理
         */
        handlePeriodChange(chartName, period) {
            switch (chartName) {
                case 'memberGrowth':
                    this.updateMemberGrowthChart(period);
                    break;
                case 'eventStats':
                    this.updateEventStatsChart(period);
                    break;
            }
        }

        /**
         * メンバー成長チャートを更新
         */
        async updateMemberGrowthChart(period) {
            const chart = this.charts.memberGrowth;
            if (!chart) return;

            this.showChartLoading('memberGrowthChart');
            const data = await this.fetchMemberGrowthData(period);
            chart.data.labels = data.labels;
            chart.data.datasets[0].data = data.total;
            chart.data.datasets[1].data = data.new;
            chart.update();
            this.hideChartLoading('memberGrowthChart');
        }

        /**
         * イベント統計チャートを更新
         */
        async updateEventStatsChart(period) {
            const chart = this.charts.eventStats;
            if (!chart) return;

            this.showChartLoading('eventStatsChart');
            const data = await this.fetchEventStatsData(period);
            chart.data.labels = data.labels;
            chart.data.datasets[0].data = data.online;
            chart.data.datasets[1].data = data.offline;
            chart.data.datasets[2].data = data.hybrid;
            chart.update();
            this.hideChartLoading('eventStatsChart');
        }

        /**
         * メンバー成長データを生成（ダミー）
         */
        generateMemberGrowthData(period) {
            const data = { labels: [], total: [], new: [] };
            let days = 30;

            switch (period) {
                case 'week':
                    days = 7;
                    break;
                case 'year':
                    days = 365;
                    break;
            }

            let total = 1000;
            const now = new Date();

            for (let i = days; i >= 0; i -= Math.max(1, Math.floor(days / 10))) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);

                const newMembers = Math.floor(Math.random() * 10) + 5;
                total += newMembers;

                data.labels.push(date.toLocaleDateString('ja-JP', {
                    month: 'numeric',
                    day: 'numeric'
                }));
                data.total.push(total);
                data.new.push(newMembers);
            }

            return data;
        }

        /**
         * イベント統計データを生成（ダミー）
         */
        generateEventStatsData(period) {
            const data = { labels: [], online: [], offline: [], hybrid: [] };
            let items = 4;

            switch (period) {
                case 'week':
                    data.labels = ['月', '火', '水', '木', '金', '土', '日'];
                    items = 7;
                    break;
                case 'month':
                    data.labels = ['第1週', '第2週', '第3週', '第4週'];
                    items = 4;
                    break;
                case 'quarter':
                    data.labels = ['1月', '2月', '3月'];
                    items = 3;
                    break;
            }

            for (let i = 0; i < items; i++) {
                data.online.push(Math.floor(Math.random() * 20) + 10);
                data.offline.push(Math.floor(Math.random() * 15) + 5);
                data.hybrid.push(Math.floor(Math.random() * 10) + 2);
            }

            return data;
        }

        /**
         * アクティビティヒートマップデータを生成（ダミー）
         */
        generateActivityHeatmapData() {
            const hours = Array.from({ length: 24 }, (_, i) => i);
            const datasets = hours.map(hour => ({
                label: hour.toString(),
                data: Array.from({ length: 7 }, () => Math.floor(Math.random() * 50)),
                backgroundColor: this.getHeatmapColor(hour),
                borderWidth: 0,
                barPercentage: 1,
                categoryPercentage: 1
            }));

            return { datasets };
        }

        /**
         * ヒートマップの色を取得
         */
        getHeatmapColor(hour) {
            // 活動時間帯に応じて色を変える
            if (hour >= 9 && hour <= 18) {
                return this.chartColors.primary + '80';
            } else if (hour >= 6 && hour < 9 || hour > 18 && hour <= 22) {
                return this.chartColors.secondary + '60';
            } else {
                return this.chartColors.gray + '30';
            }
        }

        /**
         * チャートのローディングを表示
         */
        showChartLoading(chartId) {
            const chartCard = document.getElementById(chartId)?.closest('.chart-card');
            if (!chartCard) return;

            let loading = chartCard.querySelector('.chart-loading');
            if (!loading) {
                loading = document.createElement('div');
                loading.className = 'chart-loading';
                loading.innerHTML = '<i class="fas fa-spinner"></i>';
                chartCard.querySelector('.chart-body').appendChild(loading);
            }
            loading.style.display = 'flex';
        }

        /**
         * チャートのローディングを非表示
         */
        hideChartLoading(chartId) {
            const chartCard = document.getElementById(chartId)?.closest('.chart-card');
            if (!chartCard) return;

            const loading = chartCard.querySelector('.chart-loading');
            if (loading) {
                loading.style.display = 'none';
            }
        }

        /**
         * メンバー成長データを取得
         */
        async fetchMemberGrowthData(period) {
            try {
                if (window.supabaseClient) {
                    // Supabaseからメンバー成長データを取得
                    const { data, error } = await window.supabase
                        .from('member_growth_stats')
                        .select('*')
                        .order('date', { ascending: true });

                    if (!error && data && data.length > 0) {
                        return this.processMemberGrowthData(data, period);
                    }
                }
            } catch (error) {
                console.error('[DashboardCharts] Error fetching member growth data:', error);
            }

            // フォールバックとしてダミーデータを使用
            return this.generateMemberGrowthData(period);
        }

        /**
         * メンバー成長データを処理
         */
        processMemberGrowthData(rawData, period) {
            const now = new Date();
            let startDate = new Date();

            switch (period) {
                case 'week':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    startDate.setDate(now.getDate() - 30);
                    break;
                case 'year':
                    startDate.setDate(now.getDate() - 365);
                    break;
            }

            const filteredData = rawData.filter(item => new Date(item.date) >= startDate);

            return {
                labels: filteredData.map(item => new Date(item.date).toLocaleDateString('ja-JP', {
                    month: 'numeric',
                    day: 'numeric'
                })),
                total: filteredData.map(item => item.total_members),
                new: filteredData.map(item => item.new_members)
            };
        }

        /**
         * イベント統計データを取得
         */
        async fetchEventStatsData(period) {
            try {
                if (window.supabaseClient) {
                    // Supabaseからイベント統計データを取得
                    const { data, error } = await window.supabase
                        .from('event_stats')
                        .select('*')
                        .order('week', { ascending: true });

                    if (!error && data && data.length > 0) {
                        return this.processEventStatsData(data, period);
                    }
                }
            } catch (error) {
                console.error('[DashboardCharts] Error fetching event stats data:', error);
            }

            // フォールバックとしてダミーデータを使用
            return this.generateEventStatsData(period);
        }

        /**
         * イベント統計データを処理
         */
        processEventStatsData(rawData, period) {
            // イベントタイプ別に集計
            const stats = {
                labels: [],
                online: [],
                offline: [],
                hybrid: []
            };

            // periodに応じてデータをグループ化
            // ここでは簡略化のため、生データをそのまま使用
            rawData.forEach(item => {
                const weekDate = new Date(item.week);
                const label = weekDate.toLocaleDateString('ja-JP', {
                    month: 'numeric',
                    day: 'numeric'
                });

                if (!stats.labels.includes(label)) {
                    stats.labels.push(label);
                    stats.online.push(0);
                    stats.offline.push(0);
                    stats.hybrid.push(0);
                }

                const index = stats.labels.indexOf(label);
                switch (item.event_type) {
                    case 'online':
                        stats.online[index] = item.event_count;
                        break;
                    case 'offline':
                        stats.offline[index] = item.event_count;
                        break;
                    case 'hybrid':
                        stats.hybrid[index] = item.event_count;
                        break;
                }
            });

            return stats;
        }

        /**
         * 業界別データを取得
         */
        async fetchIndustryData() {
            try {
                if (window.supabaseClient) {
                    // Supabaseから業界別分布データを取得
                    const { data, error } = await window.supabase
                        .from('industry_distribution')
                        .select('*')
                        .order('member_count', { ascending: false });

                    if (!error && data && data.length > 0) {
                        return {
                            labels: data.map(item => item.industry),
                            values: data.map(item => item.member_count)
                        };
                    }
                }
            } catch (error) {
                console.error('[DashboardCharts] Error fetching industry data:', error);
            }

            // フォールバックとしてダミーデータを使用
            return {
                labels: ['IT/テクノロジー', '金融', '製造業', 'サービス業', 'その他'],
                values: [35, 25, 20, 15, 5]
            };
        }

        /**
         * アクティビティヒートマップデータを取得
         */
        async fetchActivityHeatmapData() {
            try {
                if (window.supabaseClient) {
                    // 過去1週間のアクティビティを取得
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

                    const { data, error } = await window.supabase
                        .from('activities')
                        .select('created_at')
                        .gte('created_at', oneWeekAgo.toISOString())
                        .order('created_at', { ascending: true });

                    if (!error && data && data.length > 0) {
                        return this.processActivityHeatmapData(data);
                    }
                }
            } catch (error) {
                console.error('[DashboardCharts] Error fetching activity heatmap data:', error);
            }

            // フォールバックとしてダミーデータを使用
            return this.generateActivityHeatmapData();
        }

        /**
         * アクティビティヒートマップデータを処理
         */
        processActivityHeatmapData(activities) {
            // 時間別・曜日別に集計
            const heatmap = {};
            const days = ['月', '火', '水', '木', '金', '土', '日'];

            // 初期化
            for (let hour = 0; hour < 24; hour++) {
                heatmap[hour] = days.map(() => 0);
            }

            // アクティビティを集計
            activities.forEach(activity => {
                const date = new Date(activity.created_at);
                const hour = date.getHours();
                const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1; // 日曜日を0から6に
                heatmap[hour][dayIndex]++;
            });

            // Chart.js用のデータセットに変換
            const datasets = Object.keys(heatmap).map(hour => ({
                label: hour.toString(),
                data: heatmap[hour],
                backgroundColor: this.getHeatmapColor(parseInt(hour)),
                borderWidth: 0,
                barPercentage: 1,
                categoryPercentage: 1
            }));

            return { datasets };
        }
    }

    // グローバルに公開
    window.DashboardCharts = DashboardCharts;

    // DOMContentLoaded時に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.dashboardCharts = new DashboardCharts();
        });
    } else {
        window.dashboardCharts = new DashboardCharts();
    }

})();

// ============================================================
// Section: activity-event-filter.js
// ============================================================
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
            // DOM要素の存在確認
            if (!document.querySelector('.activity-list') && !document.querySelector('.event-list')) {
                console.warn('[ActivityEventFilter] Required DOM elements not found, skipping initialization');
                return;
            }

            // フィルターUI を作成
            this.createFilterUI();

            // データを読み込む
            await this.loadActivities();
            await this.loadEvents();

            // イベントリスナーを設定
            this.setupEventListeners();

            // console.log('[ActivityEventFilter] Initialized');
        }

        /**
         * フィルターUIを作成
         */
        createFilterUI() {
            // アクティビティフィルター
            const activityCard = document.querySelector('.activity-list')?.closest('.content-card');
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
            const eventCard = document.querySelector('.event-list')?.closest('.content-card');
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
                // ローディング表示
                const container = document.querySelector('.activity-list');
                if (container) {
                    container.innerHTML = '<div class="filter-loading"><i class="fas fa-spinner"></i></div>';
                }

                if (window.supabase && window.supabaseClient.from) {
                    // Supabaseからアクティビティを取得
                    const { data, error } = await window.supabase
                        .from('activities')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(50);

                    if (!error && data && data.length > 0) {
                        // データを変換
                        this.activities = data.map(activity => this.transformActivity(activity));
                    } else {
                        // データがない場合はダミーデータを使用
                        // console.log('[ActivityEventFilter] No activities found, using dummy data');
                        this.activities = this.getDummyActivities();
                    }
                } else {
                    // Supabaseが利用できない場合はダミーデータを使用
                    // console.log('[ActivityEventFilter] Supabase not available, using dummy data');
                    this.activities = this.getDummyActivities();
                }

                this.renderActivities();
            } catch (error) {
                console.error('[ActivityEventFilter] Error loading activities:', error);
                // エラー時はダミーデータを使用
                this.activities = this.getDummyActivities();
                this.renderActivities();
            }
        }

        /**
         * アクティビティデータを変換
         */
        transformActivity(activity) {
            const iconMap = {
                'member_joined': 'fa-user-plus',
                'event_completed': 'fa-calendar-check',
                'matching_success': 'fa-handshake',
                'message_sent': 'fa-envelope',
                'connection_made': 'fa-link',
                'profile_updated': 'fa-user-edit',
                'event_created': 'fa-calendar-plus'
            };

            return {
                id: activity.id,
                type: activity.type,
                title: activity.title,
                description: activity.description,
                user: activity.user_id,
                timestamp: new Date(activity.created_at),
                icon: iconMap[activity.type] || 'fa-bell',
                data: activity.data
            };
        }

        /**
         * ダミーアクティビティデータを取得
         */
        getDummyActivities() {
            return [
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
        }

        /**
         * イベントを読み込む
         */
        async loadEvents() {
            try {
                // ローディング表示
                const container = document.querySelector('.event-list');
                if (container) {
                    container.innerHTML = '<div class="filter-loading"><i class="fas fa-spinner"></i></div>';
                }

                if (window.supabase && window.supabaseClient.from) {
                    // イベントデータを取得
                    const { data: events, error } = await window.supabase
                        .from('event_items')
                        .select('*')
                        .eq('is_public', true)
                        .eq('is_cancelled', false)
                        .order('event_date', { ascending: true });

                    if (!error && events && events.length > 0) {
                        // 参加者数を取得
                        for (const event of events) {
                            const { count } = await window.supabase
                                .from('event_participants')
                                .select('*', { count: 'exact', head: true })
                                .eq('event_id', event.id)
                                .eq('status', 'registered');

                            event.participant_count = count || 0;
                        }

                        this.events = events;
                    } else {
                        // console.log('[ActivityEventFilter] No events found, using dummy data');
                        this.events = this.getDummyEvents();
                    }
                } else {
                    // console.log('[ActivityEventFilter] Supabase not available, using dummy data');
                    this.events = this.getDummyEvents();
                }

                this.renderEvents();
            } catch (error) {
                console.error('[ActivityEventFilter] Error loading events:', error);
                // エラー時はダミーデータを使用
                this.events = this.getDummyEvents();
                this.renderEvents();
            }
        }

        /**
         * ダミーイベントデータを取得
         */
        getDummyEvents() {
            return [
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
                },
                {
                    id: 3,
                    title: 'スタートアップピッチ',
                    event_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                    event_type: 'hybrid',
                    participant_count: 25
                }
            ];
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
            const container = document.querySelector('.activity-list');
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

                // イベントタイプのラベル
                const typeLabels = {
                    'online': '<span><i class="fas fa-globe"></i> オンライン</span>',
                    'offline': '<span><i class="fas fa-map-marker-alt"></i> オフライン</span>',
                    'hybrid': '<span><i class="fas fa-broadcast-tower"></i> ハイブリッド</span>'
                };

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
                                ${typeLabels[event.event_type] || ''}
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
