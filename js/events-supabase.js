/**
 * Events Supabase Integration
 * イベントデータのSupabase連携
 */

(function() {
    'use strict';

    class EventsSupabase {
        constructor() {
            this.currentFilter = 'upcoming';
            this.activeFilters = new Set(['all']);
            this.searchQuery = '';
            this.sortOrder = 'date_asc';
            this.eventsCache = new Map();
            this.participantsCache = new Map();
            this.cacheExpiry = 5 * 60 * 1000; // 5分
            this.allEvents = [];
            this.init();
        }

        init() {
            // supabaseReadyイベントを待ってから初期化
            if (window.supabaseClient) {
                this.setupEventListeners();
                this.loadEvents();
                this.loadPastEvents();
            } else {
                // Supabaseクライアントがまだ初期化されていない場合は待機
                document.addEventListener('supabaseReady', () => {
                    // console.log('[EventsSupabase] Supabase client ready, initializing...');
                    this.setupEventListeners();
                    this.loadEvents();
                    this.loadPastEvents();
                });
            }
        }

        setupEventListeners() {
            // フィルターボタンのイベントリスナー
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('filter-btn')) {
                    this.handleFilterChange(e.target);
                }
            });

            // 検索機能
            const searchInput = document.getElementById('eventSearchInput');
            if (searchInput) {
                let searchTimeout;
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.searchQuery = e.target.value.trim();
                        this.applyFiltersAndSearch();
                    }, 300); // 300ms debounce
                });
            }

            // ソート機能
            const sortSelect = document.getElementById('eventSortSelect');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    this.sortOrder = e.target.value;
                    this.applyFiltersAndSearch();
                });
            }
        }

        /**
         * イベントデータを読み込む
         */
        async loadEvents() {
            try {
                this.showLoading();

                // キャッシュチェック
                const cacheKey = `events-${this.currentFilter}`;
                const cached = this.eventsCache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
                    this.renderEvents(cached.data);
                    return;
                }

                // Supabaseからイベントを取得
                const now = new Date().toISOString();
                let query = window.supabaseClient
                    .from('event_items')
                    .select('*')
                    .eq('is_public', true)
                    .eq('is_cancelled', false)
                    .order('event_date', { ascending: true });

                if (this.currentFilter === 'upcoming') {
                    query = query.gte('event_date', now);
                } else if (this.currentFilter === 'past') {
                    query = query.lt('event_date', now);
                }

                const { data: events, error } = await query;

                if (error) {
                    console.error('[EventsSupabase] Error loading events:', error);
                    this.showError('イベントの読み込みに失敗しました');
                    return;
                }

                // キャッシュに保存
                this.eventsCache.set(cacheKey, {
                    data: events,
                    timestamp: Date.now()
                });

                // 各イベントの参加者数を取得
                await this.loadParticipantCounts(events);

                // 全イベントを保存
                this.allEvents = events || [];

                // フィルターと検索を適用
                this.applyFiltersAndSearch();

            } catch (error) {
                console.error('[EventsSupabase] Error:', error);
                this.showError('エラーが発生しました');
            }
        }

        /**
         * 参加者数を取得
         */
        async loadParticipantCounts(events) {
            if (!events || events.length === 0) return;

            const eventIds = events.map(e => e.id);
            
            try {
                // 一括で参加者数を取得
                const { data: participants, error } = await window.supabaseClient
                    .from('event_participants')
                    .select('event_id')
                    .in('event_id', eventIds)
                    .in('status', ['registered', 'confirmed']);

                if (!error && participants) {
                    // イベントごとの参加者数をカウント
                    const counts = {};
                    participants.forEach(p => {
                        counts[p.event_id] = (counts[p.event_id] || 0) + 1;
                    });

                    // イベントデータに参加者数を追加
                    events.forEach(event => {
                        event.participant_count = counts[event.id] || 0;
                    });
                }
            } catch (error) {
                console.error('[EventsSupabase] Error loading participant counts:', error);
            }
        }

        /**
         * イベントをレンダリング
         */
        renderEvents(events) {
            const container = document.querySelector('.events-grid');
            if (!container) return;

            // 検索結果の件数を表示
            this.updateResultCount(events.length);

            if (!events || events.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-calendar-alt"></i>
                        <h3>イベントがありません</h3>
                        <p>${this.searchQuery ? '検索条件に一致するイベントが見つかりませんでした' : '現在表示できるイベントはありません'}</p>
                    </div>
                `;
                return;
            }

            const eventsHTML = events.map(event => this.createEventCard(event)).join('');
            container.innerHTML = eventsHTML;

            // イベントカードにクリックイベントを追加
            this.attachCardEventListeners();
        }

        /**
         * 検索結果件数を更新
         */
        updateResultCount(count) {
            // 既存の結果カウントを探すか作成
            let countElement = document.querySelector('.search-result-count');
            if (!countElement) {
                countElement = document.createElement('div');
                countElement.className = 'search-result-count';
                const section = document.querySelector('.events-section');
                if (section) {
                    section.insertBefore(countElement, section.querySelector('.events-grid'));
                }
            }

            if (this.searchQuery || !this.activeFilters.has('all')) {
                countElement.textContent = `${count}件のイベントが見つかりました`;
                countElement.style.display = 'block';
            } else {
                countElement.style.display = 'none';
            }
        }

        /**
         * イベントカードを作成
         */
        createEventCard(event) {
            const eventDate = new Date(event.event_date);
            const dateStr = this.formatEventDate(eventDate, event.start_time, event.end_time);
            const isOnline = event.event_type === 'online';
            const isHybrid = event.event_type === 'hybrid';
            const location = isOnline ? event.online_url || 'オンライン' : event.location || '場所未定';
            const badgeClass = isOnline ? '' : 'event-badge-offline';
            const badgeText = isHybrid ? 'ハイブリッド' : (isOnline ? 'オンライン' : '対面');
            
            // 残席計算
            const participantCount = event.participant_count || 0;
            const maxParticipants = event.max_participants || '∞';
            const remainingSeats = maxParticipants === '∞' ? '∞' : Math.max(0, maxParticipants - participantCount);
            const isFull = maxParticipants !== '∞' && remainingSeats === 0;
            const isNearlyFull = maxParticipants !== '∞' && remainingSeats > 0 && remainingSeats <= 5;

            // 価格表示
            const priceText = event.price > 0 ? `${event.price.toLocaleString()}円` : '無料';

            // ボタンの状態
            let buttonHTML = '';
            if (isFull) {
                buttonHTML = '<button class="btn btn-secondary btn-block" disabled>満席</button>';
            } else if (isNearlyFull) {
                buttonHTML = '<button class="btn btn-outline btn-block">満席間近</button>';
            } else {
                buttonHTML = '<button class="btn btn-primary btn-block">参加申込</button>';
            }

            return `
                <div class="event-card" data-event-id="${event.id}">
                    <div class="event-image">
                        <img src="${event.image_url || 'assets/user-placeholder.svg'}" alt="${event.title}">
                        <div class="event-badge ${badgeClass}">${badgeText}</div>
                    </div>
                    <div class="event-content">
                        <div class="event-date-tag">
                            <i class="fas fa-calendar"></i>
                            <span>${dateStr}</span>
                        </div>
                        <h3 class="event-title">${this.escapeHtml(event.title)}</h3>
                        <p class="event-description">
                            ${this.escapeHtml(event.description || 'イベントの詳細情報はまだ登録されていません。')}
                        </p>
                        <div class="event-meta">
                            <div class="meta-item">
                                ${isOnline ? '<i class="fas fa-globe"></i>' : '<i class="fas fa-map-marker-alt"></i>'}
                                <span>${this.escapeHtml(this.truncateText(location, 20))}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-users"></i>
                                <span>参加者：${participantCount}/${maxParticipants}名</span>
                            </div>
                            <div class="meta-item">
                                ${event.price > 0 ? '<i class="fas fa-yen-sign"></i>' : '<i class="fas fa-tag"></i>'}
                                <span>${priceText}</span>
                            </div>
                        </div>
                        <div class="event-footer">
                            ${buttonHTML}
                        </div>
                    </div>
                </div>
            `;
        }

        /**
         * イベントカードにイベントリスナーを追加
         */
        attachCardEventListeners() {
            const cards = document.querySelectorAll('.event-card');
            cards.forEach(card => {
                // カード全体のクリックでモーダルを開く
                card.addEventListener('click', (e) => {
                    // ボタンクリックは除外
                    if (!e.target.closest('button')) {
                        const eventId = card.dataset.eventId;
                        // console.log('[EventsSupabase] Card clicked, eventId:', eventId);
                        // console.log('[EventsSupabase] window.eventModal exists?', !!window.eventModal);
                        if (eventId && window.eventModal) {
                            // console.log('[EventsSupabase] Calling eventModal.show()');
                            window.eventModal.show(eventId);
                        } else {
                            console.error('[EventsSupabase] Missing eventId or eventModal');
                        }
                    }
                });

                // 参加申込ボタン
                const button = card.querySelector('.btn-primary, .btn-outline');
                if (button) {
                    button.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const eventId = card.dataset.eventId;
                        this.handleEventRegistration(eventId, button);
                    });
                }
            });
        }

        /**
         * イベント参加申込処理
         */
        async handleEventRegistration(eventId, button) {
            try {
                // ユーザー認証チェック
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                if (!user) {
                    // alert('ログインが必要です');
                    if (window.showError) {
                        showError('ログインが必要です');
                    }
                    window.location.href = 'login.html';
                    return;
                }

                // ボタンを無効化
                button.disabled = true;
                const originalText = button.innerHTML;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 処理中...';

                // 既に参加登録しているかチェック
                const { data: existing } = await window.supabaseClient
                    .from('event_participants')
                    .select('id, status')
                    .eq('event_id', eventId)
                    .eq('user_id', user.id)
                    .single();

                if (existing) {
                    if (existing.status === 'cancelled') {
                        // キャンセル済みの場合は再登録
                        const { error: updateError } = await window.supabaseClient
                            .from('event_participants')
                            .update({ 
                                status: 'registered',
                                registration_date: new Date().toISOString()
                            })
                            .eq('id', existing.id);

                        if (updateError) throw updateError;
                    } else {
                        // alert('既に参加登録済みです');
                        if (window.showInfo) {
                            showInfo('既に参加登録済みです');
                        }
                        button.innerHTML = originalText;
                        button.disabled = false;
                        return;
                    }
                } else {
                    // 新規登録
                    const { error: insertError } = await window.supabaseClient
                        .from('event_participants')
                        .insert({
                            event_id: eventId,
                            user_id: user.id,
                            status: 'registered'
                        });

                    if (insertError) throw insertError;
                }

                // 成功通知
                button.innerHTML = '<i class="fas fa-check"></i> 申込完了';
                button.classList.remove('btn-primary', 'btn-outline');
                button.classList.add('btn-success');

                // イベントを再読み込み
                setTimeout(() => {
                    this.loadEvents();
                }, 2000);

            } catch (error) {
                console.error('[EventsSupabase] Registration error:', error);
                // alert('申込処理中にエラーが発生しました');
                if (window.showError) {
                    showError('申込処理中にエラーが発生しました');
                }
                button.innerHTML = originalText;
                button.disabled = false;
            }
        }

        /**
         * 日付フォーマット
         */
        formatEventDate(date, startTime, endTime) {
            const dateStr = date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                weekday: 'short'
            });

            if (startTime && endTime) {
                return `${dateStr} ${startTime.slice(0, 5)}-${endTime.slice(0, 5)}`;
            } else if (startTime) {
                return `${dateStr} ${startTime.slice(0, 5)}〜`;
            }
            return dateStr;
        }

        /**
         * テキストをトランケート
         */
        truncateText(text, maxLength) {
            if (!text || text.length <= maxLength) return text;
            return text.slice(0, maxLength) + '...';
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

        /**
         * ローディング表示
         */
        showLoading() {
            const container = document.querySelector('.events-grid');
            if (!container) return;

            container.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin fa-3x"></i>
                    <p>イベントを読み込んでいます...</p>
                </div>
            `;
        }

        /**
         * エラー表示
         */
        showError(message) {
            const container = document.querySelector('.events-grid');
            if (!container) return;

            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle fa-3x"></i>
                    <h3>エラー</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="window.eventsSupabase.loadEvents()">
                        再読み込み
                    </button>
                </div>
            `;
        }

        /**
         * フィルター変更処理
         */
        handleFilterChange(button) {
            const filter = button.dataset.filter;
            
            // すべてのフィルターボタンから active クラスを削除
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 新しいフィルターセットを作成
            this.activeFilters.clear();
            
            if (filter === 'all') {
                this.activeFilters.add('all');
                button.classList.add('active');
            } else {
                // 複数フィルターの選択を許可
                if (button.classList.contains('active')) {
                    button.classList.remove('active');
                } else {
                    button.classList.add('active');
                }
                
                // アクティブなフィルターを収集
                document.querySelectorAll('.filter-btn.active').forEach(btn => {
                    if (btn.dataset.filter !== 'all') {
                        this.activeFilters.add(btn.dataset.filter);
                    }
                });
                
                // フィルターが何もない場合は「すべて」を選択
                if (this.activeFilters.size === 0) {
                    this.activeFilters.add('all');
                    document.querySelector('[data-filter="all"]').classList.add('active');
                }
            }
            
            this.applyFiltersAndSearch();
        }

        /**
         * フィルターと検索を適用
         */
        applyFiltersAndSearch() {
            let filteredEvents = [...this.allEvents];
            
            // フィルター適用
            if (!this.activeFilters.has('all')) {
                filteredEvents = filteredEvents.filter(event => {
                    let matchesType = true;
                    let matchesPrice = true;
                    
                    // オンライン/オフラインフィルター
                    const hasTypeFilter = this.activeFilters.has('online') || this.activeFilters.has('offline');
                    if (hasTypeFilter) {
                        matchesType = false;
                        if (this.activeFilters.has('online') && (event.event_type === 'online' || event.event_type === 'hybrid')) {
                            matchesType = true;
                        }
                        if (this.activeFilters.has('offline') && (event.event_type === 'offline' || event.event_type === 'hybrid')) {
                            matchesType = true;
                        }
                    }
                    
                    // 無料/有料フィルター
                    const hasPriceFilter = this.activeFilters.has('free') || this.activeFilters.has('paid');
                    if (hasPriceFilter) {
                        matchesPrice = false;
                        if (this.activeFilters.has('free') && event.price === 0) matchesPrice = true;
                        if (this.activeFilters.has('paid') && event.price > 0) matchesPrice = true;
                    }
                    
                    return matchesType && matchesPrice;
                });
            }
            
            // 検索フィルター適用
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                filteredEvents = filteredEvents.filter(event => {
                    return (
                        event.title?.toLowerCase().includes(query) ||
                        event.description?.toLowerCase().includes(query) ||
                        event.location?.toLowerCase().includes(query) ||
                        event.organizer_name?.toLowerCase().includes(query) ||
                        event.tags?.some(tag => tag.toLowerCase().includes(query))
                    );
                });
            }
            
            // ソート適用
            filteredEvents = this.sortEvents(filteredEvents);
            
            // レンダリング
            this.renderEvents(filteredEvents);
        }

        /**
         * イベントをソート
         */
        sortEvents(events) {
            const sorted = [...events];
            
            switch (this.sortOrder) {
                case 'date_asc':
                    sorted.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
                    break;
                case 'date_desc':
                    sorted.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
                    break;
                case 'popular':
                    sorted.sort((a, b) => (b.participant_count || 0) - (a.participant_count || 0));
                    break;
                case 'price_asc':
                    sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
                    break;
                case 'price_desc':
                    sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
                    break;
            }
            
            return sorted;
        }

        /**
         * 過去のイベントを読み込む
         */
        async loadPastEvents() {
            try {
                const container = document.querySelector('.past-events-list');
                if (!container) return;

                // ローディング表示
                container.innerHTML = `
                    <div class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>過去のイベントを読み込んでいます...</span>
                    </div>
                `;

                // Supabaseから過去のイベントを取得
                const now = new Date().toISOString();
                const { data: events, error } = await window.supabaseClient
                    .from('event_items')
                    .select('*')
                    .eq('is_public', true)
                    .lt('event_date', now)
                    .order('event_date', { ascending: false })
                    .limit(5);

                if (error) {
                    console.error('[EventsSupabase] Error loading past events:', error);
                    container.innerHTML = '<p class="error-message">過去のイベントの読み込みに失敗しました</p>';
                    return;
                }

                if (!events || events.length === 0) {
                    container.innerHTML = '<p class="empty-message">過去のイベントはまだありません</p>';
                    return;
                }

                // 過去のイベントをレンダリング
                const pastEventsHTML = events.map(event => {
                    const eventDate = new Date(event.event_date);
                    const dateNum = eventDate.getDate();
                    const month = eventDate.getMonth() + 1;
                    const location = event.event_type === 'online' ? 'オンライン' : (event.location || '');

                    return `
                        <div class="past-event-item" data-event-id="${event.id}">
                            <div class="past-event-date">
                                <span class="date">${dateNum}</span>
                                <span class="month">${month}月</span>
                            </div>
                            <div class="past-event-info">
                                <h4>${this.escapeHtml(event.title)}</h4>
                                <p>参加者：${event.participant_count || 0}名${location ? ' | ' + this.escapeHtml(location) : ''}</p>
                            </div>
                            <div class="past-event-action">
                                <button class="btn btn-text" onclick="window.eventModal.show('${event.id}')">
                                    詳細を見る
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');

                container.innerHTML = pastEventsHTML;

                // 参加者数を取得
                await this.loadPastEventParticipants(events);

            } catch (error) {
                console.error('[EventsSupabase] Error loading past events:', error);
            }
        }

        /**
         * 過去のイベントの参加者数を取得
         */
        async loadPastEventParticipants(events) {
            if (!events || events.length === 0) return;

            const eventIds = events.map(e => e.id);
            
            try {
                const { data: participants } = await window.supabaseClient
                    .from('event_participants')
                    .select('event_id')
                    .in('event_id', eventIds)
                    .in('status', ['registered', 'confirmed']);

                if (participants) {
                    const counts = {};
                    participants.forEach(p => {
                        counts[p.event_id] = (counts[p.event_id] || 0) + 1;
                    });

                    // DOMを更新
                    events.forEach(event => {
                        const count = counts[event.id] || 0;
                        const eventItem = document.querySelector(`[data-event-id="${event.id}"] .past-event-info p`);
                        if (eventItem) {
                            const location = event.event_type === 'online' ? 'オンライン' : (event.location || '');
                            eventItem.textContent = `参加者：${count}名${location ? ' | ' + location : ''}`;
                        }
                    });
                }
            } catch (error) {
                console.error('[EventsSupabase] Error loading past event participants:', error);
            }
        }
    }

    // グローバルに公開
    window.EventsSupabase = EventsSupabase;
    window.eventsSupabase = new EventsSupabase();

    // console.log('[EventsSupabase] Module loaded');

})();