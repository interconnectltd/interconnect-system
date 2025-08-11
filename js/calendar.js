/**
 * カレンダー機能
 * イベントのカレンダー表示を管理
 */

(function() {
    'use strict';

    class EventCalendar {
        constructor() {
            this.currentDate = new Date();
            this.selectedDate = null;
            this.events = [];
            this.view = 'list'; // 'list' or 'calendar'
            this.container = null;
            
            this.init();
        }

        init() {
            // console.log('[Calendar] 初期化中...');
            
            // URLハッシュをチェック
            if (window.location.hash === '#calendar') {
                this.view = 'calendar';
                this.setupCalendarView();
            }
            
            // ハッシュ変更の監視
            window.addEventListener('hashchange', () => {
                if (window.location.hash === '#calendar') {
                    this.view = 'calendar';
                    this.setupCalendarView();
                } else {
                    this.view = 'list';
                    this.showListView();
                }
            });
        }

        /**
         * カレンダービューのセットアップ
         */
        async setupCalendarView() {
            // console.log('[Calendar] カレンダービューを設定中...');
            
            // コンテナを探す
            this.container = document.querySelector('.content-container');
            if (!this.container) {
                console.error('[Calendar] コンテナが見つかりません');
                return;
            }
            
            // ビュータブを追加
            this.addViewTabs();
            
            // カレンダーを表示
            await this.showCalendarView();
        }

        /**
         * ビュータブの追加
         */
        addViewTabs() {
            // 既存のタブがあるか確認
            if (document.querySelector('.view-tabs')) {
                this.updateViewTabs();
                return;
            }
            
            const tabsHTML = `
                <div class="view-tabs">
                    <button class="view-tab ${this.view === 'list' ? 'active' : ''}" data-view="list">
                        <i class="fas fa-list"></i> リスト表示
                    </button>
                    <button class="view-tab ${this.view === 'calendar' ? 'active' : ''}" data-view="calendar">
                        <i class="fas fa-calendar"></i> カレンダー表示
                    </button>
                </div>
            `;
            
            this.container.insertAdjacentHTML('afterbegin', tabsHTML);
            
            // タブクリックイベント
            document.querySelectorAll('.view-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const view = e.currentTarget.dataset.view;
                    if (view === 'calendar') {
                        window.location.hash = 'calendar';
                    } else {
                        window.location.hash = '';
                    }
                });
            });
        }

        /**
         * ビュータブの更新
         */
        updateViewTabs() {
            document.querySelectorAll('.view-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.view === this.view);
            });
        }

        /**
         * カレンダービューの表示
         */
        async showCalendarView() {
            // イベントデータを取得
            await this.fetchEvents();
            
            // 既存のコンテンツを非表示
            const sections = this.container.querySelectorAll('.events-section');
            sections.forEach(section => section.style.display = 'none');
            
            // カレンダーHTMLを生成
            const calendarHTML = this.generateCalendarHTML();
            
            // カレンダーを表示
            let calendarContainer = document.getElementById('calendarContainer');
            if (!calendarContainer) {
                calendarContainer = document.createElement('div');
                calendarContainer.id = 'calendarContainer';
                this.container.appendChild(calendarContainer);
            }
            
            calendarContainer.innerHTML = calendarHTML;
            calendarContainer.style.display = 'block';
            
            // イベントハンドラーを設定
            this.setupCalendarEvents();
        }

        /**
         * リストビューの表示
         */
        showListView() {
            // カレンダーを非表示
            const calendarContainer = document.getElementById('calendarContainer');
            if (calendarContainer) {
                calendarContainer.style.display = 'none';
            }
            
            // 既存のセクションを表示
            const sections = this.container.querySelectorAll('.events-section');
            sections.forEach(section => section.style.display = 'block');
            
            this.updateViewTabs();
        }

        /**
         * イベントデータの取得
         */
        async fetchEvents() {
            try {
                const { data, error } = await window.supabase
                    .from('events')
                    .select('*')
                    .order('event_date', { ascending: true });
                
                if (error) throw error;
                
                this.events = data || [];
                // console.log('[Calendar] イベントを取得しました:', this.events.length);
                
            } catch (error) {
                console.error('[Calendar] イベント取得エラー:', error);
                this.events = [];
            }
        }

        /**
         * カレンダーHTMLの生成
         */
        generateCalendarHTML() {
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();
            const monthName = this.getMonthName(month);
            
            return `
                <div class="calendar-container">
                    <div class="calendar-header">
                        <div class="calendar-nav">
                            <button id="prevMonth" title="前月">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <button id="nextMonth" title="翌月">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        <h2 class="calendar-title">${year}年 ${monthName}</h2>
                        <button class="calendar-today-btn" id="todayBtn">
                            今日
                        </button>
                    </div>
                    
                    <div class="calendar-grid">
                        ${this.generateWeekdayHeaders()}
                        ${this.generateCalendarCells(year, month)}
                    </div>
                    
                    <div class="calendar-event-list">
                        <div class="calendar-event-list-header">
                            <h3 class="calendar-event-list-title">
                                ${this.selectedDate ? this.formatDate(this.selectedDate) : '日付を選択してください'}
                            </h3>
                        </div>
                        <div class="calendar-event-items" id="selectedDateEvents">
                            ${this.generateSelectedDateEvents()}
                        </div>
                    </div>
                </div>
            `;
        }

        /**
         * 曜日ヘッダーの生成
         */
        generateWeekdayHeaders() {
            const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
            return weekdays.map((day, index) => {
                let className = 'calendar-weekday';
                if (index === 0) className += ' sunday';
                if (index === 6) className += ' saturday';
                return `<div class="${className}">${day}</div>`;
            }).join('');
        }

        /**
         * カレンダーセルの生成
         */
        generateCalendarCells(year, month) {
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const prevLastDay = new Date(year, month, 0);
            
            const startDay = firstDay.getDay();
            const totalDays = lastDay.getDate();
            const prevTotalDays = prevLastDay.getDate();
            
            const today = new Date();
            const cells = [];
            
            // 前月の日付
            for (let i = startDay - 1; i >= 0; i--) {
                const date = prevTotalDays - i;
                const cellDate = new Date(year, month - 1, date);
                cells.push(this.generateCalendarCell(cellDate, true));
            }
            
            // 当月の日付
            for (let date = 1; date <= totalDays; date++) {
                const cellDate = new Date(year, month, date);
                const isToday = this.isSameDate(cellDate, today);
                cells.push(this.generateCalendarCell(cellDate, false, isToday));
            }
            
            // 翌月の日付（6週分埋める）
            const remainingCells = 42 - cells.length;
            for (let date = 1; date <= remainingCells; date++) {
                const cellDate = new Date(year, month + 1, date);
                cells.push(this.generateCalendarCell(cellDate, true));
            }
            
            return cells.join('');
        }

        /**
         * カレンダーセルの生成
         */
        generateCalendarCell(date, isOtherMonth = false, isToday = false) {
            const dateStr = this.formatDateForComparison(date);
            const dayOfWeek = date.getDay();
            const events = this.getEventsForDate(date);
            
            let className = 'calendar-cell';
            if (isOtherMonth) className += ' other-month';
            if (isToday) className += ' today';
            if (this.selectedDate && this.isSameDate(date, this.selectedDate)) {
                className += ' selected';
            }
            if (dayOfWeek === 0) className += ' sunday';
            if (dayOfWeek === 6) className += ' saturday';
            
            const eventsHTML = this.generateCellEvents(events);
            
            return `
                <div class="${className}" data-date="${dateStr}">
                    <div class="calendar-date">${date.getDate()}</div>
                    ${eventsHTML}
                </div>
            `;
        }

        /**
         * セル内のイベント表示生成
         */
        generateCellEvents(events) {
            if (events.length === 0) return '';
            
            const maxDisplay = 3;
            const displayEvents = events.slice(0, maxDisplay);
            const remaining = events.length - maxDisplay;
            
            let html = '<div class="calendar-events">';
            
            displayEvents.forEach(event => {
                const eventClass = this.getEventClass(event);
                html += `<div class="calendar-event ${eventClass}" data-event-id="${event.id}">${event.title}</div>`;
            });
            
            if (remaining > 0) {
                html += `<div class="calendar-more">他${remaining}件</div>`;
            }
            
            html += '</div>';
            return html;
        }

        /**
         * 特定日のイベント取得
         */
        getEventsForDate(date) {
            const dateStr = this.formatDateForComparison(date);
            return this.events.filter(event => {
                const eventDate = new Date(event.event_date);
                return this.formatDateForComparison(eventDate) === dateStr;
            });
        }

        /**
         * 選択日のイベント表示生成
         */
        generateSelectedDateEvents() {
            if (!this.selectedDate) {
                return `
                    <div class="calendar-empty">
                        <i class="fas fa-calendar-day"></i>
                        <p>カレンダーから日付を選択してください</p>
                    </div>
                `;
            }
            
            const events = this.getEventsForDate(this.selectedDate);
            
            if (events.length === 0) {
                return `
                    <div class="calendar-empty">
                        <i class="fas fa-calendar-times"></i>
                        <p>この日のイベントはありません</p>
                    </div>
                `;
            }
            
            return events.map(event => `
                <div class="calendar-event-item" data-event-id="${event.id}">
                    <div class="calendar-event-time">
                        ${event.time || '時間未定'}
                    </div>
                    <div class="calendar-event-details">
                        <div class="calendar-event-title">${event.title}</div>
                        <div class="calendar-event-location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${event.location || '場所未定'}
                        </div>
                    </div>
                    <span class="calendar-event-badge">
                        ${this.getEventBadgeText(event)}
                    </span>
                </div>
            `).join('');
        }

        /**
         * カレンダーイベントのセットアップ
         */
        setupCalendarEvents() {
            // 前月・翌月ボタン
            document.getElementById('prevMonth')?.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.refreshCalendar();
            });
            
            document.getElementById('nextMonth')?.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.refreshCalendar();
            });
            
            // 今日ボタン
            document.getElementById('todayBtn')?.addEventListener('click', () => {
                this.currentDate = new Date();
                this.selectedDate = new Date();
                this.refreshCalendar();
            });
            
            // セルクリック
            document.querySelectorAll('.calendar-cell').forEach(cell => {
                cell.addEventListener('click', (e) => {
                    if (e.target.classList.contains('calendar-event')) {
                        // イベントクリック
                        const eventId = e.target.dataset.eventId;
                        this.showEventDetail(eventId);
                    } else {
                        // セルクリック
                        const dateStr = e.currentTarget.dataset.date;
                        this.selectedDate = new Date(dateStr);
                        this.refreshSelectedDate();
                    }
                });
            });
            
            // 選択日のイベントクリック
            document.querySelectorAll('.calendar-event-item').forEach(item => {
                item.addEventListener('click', () => {
                    const eventId = item.dataset.eventId;
                    this.showEventDetail(eventId);
                });
            });
        }

        /**
         * カレンダーの更新
         */
        refreshCalendar() {
            this.showCalendarView();
        }

        /**
         * 選択日の更新
         */
        refreshSelectedDate() {
            // セルの選択状態を更新
            document.querySelectorAll('.calendar-cell').forEach(cell => {
                const dateStr = cell.dataset.date;
                const cellDate = new Date(dateStr);
                cell.classList.toggle('selected', this.isSameDate(cellDate, this.selectedDate));
            });
            
            // イベントリストを更新
            const listHeader = document.querySelector('.calendar-event-list-title');
            if (listHeader) {
                listHeader.textContent = this.formatDate(this.selectedDate);
            }
            
            const eventItems = document.getElementById('selectedDateEvents');
            if (eventItems) {
                eventItems.innerHTML = this.generateSelectedDateEvents();
                
                // イベントクリックハンドラーを再設定
                eventItems.querySelectorAll('.calendar-event-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const eventId = item.dataset.eventId;
                        this.showEventDetail(eventId);
                    });
                });
            }
        }

        /**
         * イベント詳細の表示
         */
        showEventDetail(eventId) {
            if (window.eventModal) {
                window.eventModal.show(eventId);
            } else {
                // console.log('[Calendar] イベント詳細モーダルが利用できません');
                // フォールバック
                window.location.href = `events.html?id=${eventId}`;
            }
        }

        /**
         * ユーティリティメソッド
         */
        formatDateForComparison(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        formatDate(date) {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
            return `${year}年${month}月${day}日（${weekday}）`;
        }

        getMonthName(month) {
            const months = [
                '1月', '2月', '3月', '4月', '5月', '6月',
                '7月', '8月', '9月', '10月', '11月', '12月'
            ];
            return months[month];
        }

        isSameDate(date1, date2) {
            return date1.getFullYear() === date2.getFullYear() &&
                   date1.getMonth() === date2.getMonth() &&
                   date1.getDate() === date2.getDate();
        }

        getEventClass(event) {
            if (event.location?.includes('オンライン')) return 'online';
            if (event.max_participants && event.participants >= event.max_participants) return 'full';
            return 'offline';
        }

        getEventBadgeText(event) {
            if (event.location?.includes('オンライン')) return 'オンライン';
            if (event.max_participants && event.participants >= event.max_participants) return '満席';
            return '対面';
        }
    }

    // グローバルに公開
    window.EventCalendar = EventCalendar;
    window.eventCalendar = new EventCalendar();

    // console.log('[Calendar] モジュールがロードされました');

})();