/**
 * Notifications Filter System
 * Step 3: 通知のフィルタリング機能の実装
 */

(function() {
    'use strict';

    console.log('[NotificationFilter] フィルタリング機能を初期化...');

    class NotificationFilterManager {
        constructor() {
            this.filters = {
                type: 'all',
                status: 'all',
                dateRange: null,
                keyword: ''
            };
            this.filteredNotifications = [];
            this.init();
        }

        async init() {
            console.log('[NotificationFilter] 初期化開始');
            
            // Supabaseマネージャーの初期化を待つ
            await this.waitForManagers();
            
            // フィルターUIを作成
            this.createFilterUI();
            
            // イベントリスナーを設定
            this.setupEventListeners();
            
            // 初期フィルタリングを実行
            this.applyFilters();
        }

        /**
         * マネージャーの初期化を待つ
         */
        async waitForManagers() {
            let attempts = 0;
            while ((!window.notificationSupabaseManager || !window.notifications) && attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            console.log('[NotificationFilter] マネージャー検出完了');
        }

        /**
         * フィルターUIを作成
         */
        createFilterUI() {
            const notificationsPage = document.querySelector('.notifications-page');
            if (!notificationsPage) return;

            // 既存のフィルターの後に詳細フィルターを追加
            const existingFilters = notificationsPage.querySelector('.notifications-filters');
            if (existingFilters && !document.getElementById('advancedFilters')) {
                const advancedFilters = document.createElement('div');
                advancedFilters.id = 'advancedFilters';
                advancedFilters.className = 'advanced-filters';
                advancedFilters.innerHTML = `
                    <div class="filter-row">
                        <!-- ステータスフィルター -->
                        <div class="filter-group">
                            <label for="statusFilter">表示:</label>
                            <select id="statusFilter" class="filter-select">
                                <option value="all">すべて</option>
                                <option value="unread">未読のみ</option>
                                <option value="read">既読のみ</option>
                            </select>
                        </div>

                        <!-- 日付範囲フィルター -->
                        <div class="filter-group">
                            <label for="dateRangeFilter">期間:</label>
                            <select id="dateRangeFilter" class="filter-select">
                                <option value="all">すべて</option>
                                <option value="today">今日</option>
                                <option value="yesterday">昨日</option>
                                <option value="week">今週</option>
                                <option value="month">今月</option>
                                <option value="custom">期間指定...</option>
                            </select>
                        </div>

                        <!-- カスタム日付範囲（非表示） -->
                        <div class="filter-group custom-date-range" style="display: none;">
                            <input type="date" id="dateFrom" class="filter-input" placeholder="開始日">
                            <span>〜</span>
                            <input type="date" id="dateTo" class="filter-input" placeholder="終了日">
                        </div>

                        <!-- キーワード検索 -->
                        <div class="filter-group search-group">
                            <label for="keywordFilter">
                                <i class="fas fa-search"></i>
                            </label>
                            <input type="text" id="keywordFilter" class="filter-input" placeholder="キーワードで検索...">
                        </div>

                        <!-- フィルターリセット -->
                        <button id="resetFilters" class="btn-icon" title="フィルターをリセット">
                            <i class="fas fa-undo"></i>
                        </button>
                    </div>

                    <!-- フィルター結果情報 -->
                    <div class="filter-info" id="filterInfo" style="display: none;">
                        <span class="filter-count">0件の通知が見つかりました</span>
                        <span class="filter-tags" id="filterTags"></span>
                    </div>
                `;

                existingFilters.parentNode.insertBefore(advancedFilters, existingFilters.nextSibling);
                console.log('[NotificationFilter] フィルターUI作成完了');
            }
        }

        /**
         * イベントリスナーを設定
         */
        setupEventListeners() {
            // タイプフィルター（既存のボタン）
            document.addEventListener('click', (e) => {
                if (e.target.matches('.filter-btn[data-filter]')) {
                    const filterType = e.target.dataset.filter;
                    this.filters.type = filterType;
                    
                    // アクティブ状態を更新
                    document.querySelectorAll('.filter-btn').forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.filter === filterType);
                    });
                    
                    this.applyFilters();
                }
            });

            // ステータスフィルター
            const statusFilter = document.getElementById('statusFilter');
            if (statusFilter) {
                statusFilter.addEventListener('change', (e) => {
                    this.filters.status = e.target.value;
                    this.applyFilters();
                });
            }

            // 日付範囲フィルター
            const dateRangeFilter = document.getElementById('dateRangeFilter');
            if (dateRangeFilter) {
                dateRangeFilter.addEventListener('change', (e) => {
                    const value = e.target.value;
                    const customDateRange = document.querySelector('.custom-date-range');
                    
                    if (value === 'custom') {
                        customDateRange.style.display = 'flex';
                    } else {
                        customDateRange.style.display = 'none';
                        this.filters.dateRange = value;
                        this.applyFilters();
                    }
                });
            }

            // カスタム日付範囲
            const dateFrom = document.getElementById('dateFrom');
            const dateTo = document.getElementById('dateTo');
            if (dateFrom && dateTo) {
                const handleDateChange = () => {
                    if (dateFrom.value && dateTo.value) {
                        this.filters.dateRange = {
                            from: new Date(dateFrom.value),
                            to: new Date(dateTo.value)
                        };
                        this.applyFilters();
                    }
                };
                
                dateFrom.addEventListener('change', handleDateChange);
                dateTo.addEventListener('change', handleDateChange);
            }

            // キーワード検索（リアルタイム）
            const keywordFilter = document.getElementById('keywordFilter');
            if (keywordFilter) {
                let searchTimeout;
                keywordFilter.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.filters.keyword = e.target.value.trim();
                        this.applyFilters();
                    }, 300); // 300ms のデバウンス
                });
            }

            // フィルターリセット
            const resetButton = document.getElementById('resetFilters');
            if (resetButton) {
                resetButton.addEventListener('click', () => {
                    this.resetFilters();
                });
            }
        }

        /**
         * フィルターを適用
         */
        applyFilters() {
            console.log('[NotificationFilter] フィルター適用:', this.filters);

            if (!window.notifications) {
                console.error('[NotificationFilter] 通知データがありません');
                return;
            }

            // フィルタリング処理
            this.filteredNotifications = window.notifications.filter(notification => {
                // タイプフィルター
                if (this.filters.type !== 'all' && notification.type !== this.filters.type) {
                    return false;
                }

                // ステータスフィルター
                if (this.filters.status === 'unread' && !notification.unread) {
                    return false;
                }
                if (this.filters.status === 'read' && notification.unread) {
                    return false;
                }

                // 日付範囲フィルター
                if (this.filters.dateRange && this.filters.dateRange !== 'all') {
                    const notificationDate = new Date(notification.created_at || Date.now());
                    
                    if (!this.isInDateRange(notificationDate, this.filters.dateRange)) {
                        return false;
                    }
                }

                // キーワード検索
                if (this.filters.keyword) {
                    const searchText = this.filters.keyword.toLowerCase();
                    const title = (notification.title || '').toLowerCase();
                    const message = (notification.message || '').toLowerCase();
                    
                    if (!title.includes(searchText) && !message.includes(searchText)) {
                        return false;
                    }
                }

                return true;
            });

            // フィルター結果を表示
            this.displayFilteredNotifications();
            
            // フィルター情報を更新
            this.updateFilterInfo();
        }

        /**
         * 日付範囲チェック
         */
        isInDateRange(date, range) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            switch (range) {
                case 'today':
                    return date >= today;
                
                case 'yesterday':
                    return date >= yesterday && date < today;
                
                case 'week':
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return date >= weekAgo;
                
                case 'month':
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return date >= monthAgo;
                
                default:
                    if (typeof range === 'object' && range.from && range.to) {
                        return date >= range.from && date <= range.to;
                    }
                    return true;
            }
        }

        /**
         * フィルター結果を表示
         */
        displayFilteredNotifications() {
            // 既存の通知グループを全て非表示
            document.querySelectorAll('.notifications-group').forEach(group => {
                group.style.display = 'none';
            });

            // フィルターされた通知を表示
            this.filteredNotifications.forEach(notification => {
                const element = document.querySelector(`[data-id="${notification.id}"]`);
                if (element) {
                    const group = element.closest('.notifications-group');
                    if (group) {
                        group.style.display = 'block';
                        element.style.display = 'flex';
                    }
                }
            });

            // 各グループ内の表示されている通知をチェック
            document.querySelectorAll('.notifications-group').forEach(group => {
                const visibleItems = group.querySelectorAll('.notification-item-full[style*="display: flex"]');
                if (visibleItems.length === 0) {
                    group.style.display = 'none';
                }
            });

            // 結果が0件の場合
            if (this.filteredNotifications.length === 0) {
                this.showNoResultsMessage();
            } else {
                this.hideNoResultsMessage();
            }
        }

        /**
         * フィルター情報を更新
         */
        updateFilterInfo() {
            const filterInfo = document.getElementById('filterInfo');
            if (!filterInfo) return;

            const count = this.filteredNotifications.length;
            const filterCount = filterInfo.querySelector('.filter-count');
            
            if (filterCount) {
                filterCount.textContent = `${count}件の通知が見つかりました`;
            }

            // フィルタータグを表示
            const filterTags = [];
            
            if (this.filters.type !== 'all') {
                const typeLabels = {
                    'event': 'イベント',
                    'message': 'メッセージ',
                    'match': 'マッチング',
                    'system': 'システム'
                };
                filterTags.push(typeLabels[this.filters.type] || this.filters.type);
            }

            if (this.filters.status !== 'all') {
                filterTags.push(this.filters.status === 'unread' ? '未読' : '既読');
            }

            if (this.filters.keyword) {
                filterTags.push(`"${this.filters.keyword}"`);
            }

            const filterTagsElement = document.getElementById('filterTags');
            if (filterTagsElement) {
                filterTagsElement.innerHTML = filterTags.map(tag => 
                    `<span class="filter-tag">${tag}</span>`
                ).join('');
            }

            // フィルターが適用されている場合のみ表示
            filterInfo.style.display = filterTags.length > 0 ? 'flex' : 'none';
        }

        /**
         * 結果なしメッセージを表示
         */
        showNoResultsMessage() {
            let noResultsElement = document.getElementById('noResultsMessage');
            
            if (!noResultsElement) {
                noResultsElement = document.createElement('div');
                noResultsElement.id = 'noResultsMessage';
                noResultsElement.className = 'no-results-message';
                noResultsElement.innerHTML = `
                    <i class="fas fa-search"></i>
                    <h3>通知が見つかりません</h3>
                    <p>フィルター条件を変更してお試しください</p>
                    <button class="btn btn-outline" onclick="notificationFilterManager.resetFilters()">
                        フィルターをリセット
                    </button>
                `;
                
                const notificationsPage = document.querySelector('.notifications-page');
                if (notificationsPage) {
                    notificationsPage.appendChild(noResultsElement);
                }
            }
            
            noResultsElement.style.display = 'flex';
        }

        /**
         * 結果なしメッセージを非表示
         */
        hideNoResultsMessage() {
            const noResultsElement = document.getElementById('noResultsMessage');
            if (noResultsElement) {
                noResultsElement.style.display = 'none';
            }
        }

        /**
         * フィルターをリセット
         */
        resetFilters() {
            console.log('[NotificationFilter] フィルターリセット');

            // フィルター値をリセット
            this.filters = {
                type: 'all',
                status: 'all',
                dateRange: null,
                keyword: ''
            };

            // UIをリセット
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === 'all');
            });

            const statusFilter = document.getElementById('statusFilter');
            if (statusFilter) statusFilter.value = 'all';

            const dateRangeFilter = document.getElementById('dateRangeFilter');
            if (dateRangeFilter) dateRangeFilter.value = 'all';

            const keywordFilter = document.getElementById('keywordFilter');
            if (keywordFilter) keywordFilter.value = '';

            const customDateRange = document.querySelector('.custom-date-range');
            if (customDateRange) customDateRange.style.display = 'none';

            // フィルターを再適用
            this.applyFilters();
        }
    }

    // スタイルを追加
    const style = document.createElement('style');
    style.textContent = `
        /* 詳細フィルター */
        .advanced-filters {
            background: white;
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin-bottom: var(--space-lg);
            box-shadow: var(--shadow-sm);
        }

        .filter-row {
            display: flex;
            gap: var(--space-lg);
            align-items: center;
            flex-wrap: wrap;
        }

        .filter-group {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .filter-group label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            white-space: nowrap;
        }

        .filter-select,
        .filter-input {
            padding: var(--space-xs) var(--space-md);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            font-size: 0.875rem;
            background: white;
            transition: var(--transition-base);
            min-width: 120px;
        }

        .filter-select:focus,
        .filter-input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.1);
        }

        .search-group {
            flex: 1;
            max-width: 300px;
        }

        .search-group .filter-input {
            width: 100%;
            padding-left: 2.5rem;
        }

        .search-group label {
            position: absolute;
            left: 1rem;
            color: var(--text-secondary);
        }

        .custom-date-range {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        /* フィルター情報 */
        .filter-info {
            margin-top: var(--space-md);
            display: flex;
            align-items: center;
            gap: var(--space-md);
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .filter-tag {
            background: var(--primary-light);
            color: var(--primary-color);
            padding: var(--space-xs) var(--space-sm);
            border-radius: var(--radius-full);
            font-size: 0.75rem;
            font-weight: 500;
        }

        /* 結果なしメッセージ */
        .no-results-message {
            text-align: center;
            padding: var(--space-3xl);
            color: var(--text-secondary);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--space-md);
        }

        .no-results-message i {
            font-size: 3rem;
            opacity: 0.3;
        }

        .no-results-message h3 {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
        }

        .no-results-message p {
            margin: 0;
        }

        /* モバイル対応 */
        @media (max-width: 768px) {
            .filter-row {
                flex-direction: column;
                align-items: stretch;
            }

            .filter-group {
                width: 100%;
            }

            .filter-select,
            .filter-input {
                width: 100%;
            }

            .search-group {
                max-width: none;
            }

            #resetFilters {
                width: 100%;
                justify-content: center;
            }
        }
    `;
    document.head.appendChild(style);

    // 初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.notificationFilterManager = new NotificationFilterManager();
        });
    } else {
        setTimeout(() => {
            window.notificationFilterManager = new NotificationFilterManager();
        }, 2000);
    }

})();