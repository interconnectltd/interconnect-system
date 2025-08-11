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
                setInterval(() => {
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
                
                // まずevent_dateフィールドで試す
                let { data: events, error } = await window.supabase
                    .from('events')
                    .select('*')
                    .gte('event_date', now)
                    .order('event_date', { ascending: true })
                    .limit(5);

                // event_dateがエラーの場合、dateフィールドで試す
                if (error && error.message.includes('event_date')) {
                    // console.log('[UpcomingEvents] event_dateフィールドが存在しません。dateフィールドで再試行...');
                    
                    const result = await window.supabase
                        .from('events')
                        .select('*')
                        .gte('date', now)
                        .order('date', { ascending: true })
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
            
            // 参加者数
            const participantCount = event.participant_count || event.participants?.length || 0;
            
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
                const { data, error } = await window.supabase
                    .from('events')
                    .select('*')
                    .limit(1);

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