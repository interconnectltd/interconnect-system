/**
 * カレンダー連携機能
 * 
 * 機能:
 * - イベントのカレンダー表示
 * - Googleカレンダー連携
 * - iCalエクスポート
 * - イベントリマインダー
 */

(function() {
    'use strict';

    // console.log('[CalendarIntegration] カレンダー連携機能初期化');

    // グローバル変数
    let currentUserId = null;
    let calendarInstance = null;
    let events = [];

    // 初期化
    async function initialize() {
        // console.log('[CalendarIntegration] 初期化開始');

        // Supabaseの準備を待つ
        await window.waitForSupabase();

        // 現在のユーザーを取得
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            console.error('[CalendarIntegration] ユーザーが認証されていません');
            return;
        }

        currentUserId = user.id;
        // console.log('[CalendarIntegration] ユーザーID:', currentUserId);

        // カレンダー要素が存在する場合のみ初期化
        const calendarEl = document.getElementById('calendar');
        if (calendarEl) {
            initializeCalendar(calendarEl);
            await loadEvents();
        }

        // イベントリスナーの設定
        setupEventListeners();
    }

    // カレンダーの初期化（FullCalendar使用）
    function initializeCalendar(calendarEl) {
        // FullCalendarライブラリが読み込まれているか確認
        if (typeof FullCalendar === 'undefined') {
            console.error('[CalendarIntegration] FullCalendarライブラリが読み込まれていません');
            return;
        }

        calendarInstance = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'ja',
            height: 'auto',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listMonth'
            },
            buttonText: {
                today: '今日',
                month: '月',
                week: '週',
                list: 'リスト'
            },
            events: [],
            eventClick: handleEventClick,
            dateClick: function(info) {
                // handleDateClick関数を安全に呼び出す
                if (typeof handleDateClick === 'function') {
                    handleDateClick(info);
                }
            },
            eventDisplay: 'block',
            eventColor: '#4a90e2',
            eventTextColor: '#ffffff',
            dayMaxEvents: 3,
            moreLinkText: '他 {0} 件',
            noEventsText: 'イベントはありません'
        });

        calendarInstance.render();
    }

    // イベントリスナーの設定
    function setupEventListeners() {
        // カレンダー表示ボタン
        const showCalendarBtn = document.getElementById('show-calendar-view');
        if (showCalendarBtn) {
            showCalendarBtn.addEventListener('click', () => {
                const calendarSection = document.getElementById('calendar-view');
                if (calendarSection) {
                    calendarSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // カレンダーがまだ初期化されていない場合は初期化
                    if (!calendarInstance) {
                        const calendarEl = document.getElementById('calendar');
                        if (calendarEl) {
                            initializeCalendar(calendarEl);
                            loadEvents();
                        }
                    }
                }
            });
        }

        // Googleカレンダー連携ボタン
        const googleSyncBtn = document.getElementById('google-calendar-sync');
        if (googleSyncBtn) {
            googleSyncBtn.addEventListener('click', syncWithGoogleCalendar);
        }

        // iCalエクスポートボタン
        const exportBtn = document.getElementById('export-calendar');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportToICal);
        }

        // ビュー切り替えボタン
        document.querySelectorAll('[data-calendar-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.calendarView;
                if (calendarInstance) {
                    calendarInstance.changeView(view);
                }
            });
        });
    }

    // イベントの読み込み
    async function loadEvents() {
        try {
            // まず参加しているイベントIDを取得
            const { data: participations, error: participationError } = await window.supabaseClient
                .from('event_participants')
                .select('event_id, status')
                .eq('user_id', currentUserId)
                .in('status', ['registered', 'confirmed']);

            if (participationError) throw participationError;

            if (!participations || participations.length === 0) {
                events = [];
                if (calendarInstance) {
                    calendarInstance.removeAllEvents();
                }
                return;
            }

            // イベントIDの配列を作成
            const eventIds = participations.map(p => p.event_id);

            // イベント詳細を別途取得
            const { data: eventItems, error: eventError } = await window.supabaseClient
                .from('event_items')
                .select(`
                    id,
                    title,
                    description,
                    event_date,
                    start_time,
                    end_time,
                    location,
                    event_type,
                    online_url,
                    organizer_id
                `)
                .in('id', eventIds);

            if (eventError) throw eventError;

            // 参加状態とイベント情報をマージ
            events = (eventItems || []).map(event => {
                const participation = participations.find(p => p.event_id === event.id);
                const startDateTime = combineDateTime(event.event_date, event.start_time);
                const endDateTime = combineDateTime(event.event_date, event.end_time);

                return {
                    id: event.id,
                    title: event.title,
                    start: startDateTime,
                    end: endDateTime,
                    description: event.description,
                    location: event.event_type === 'online' ? 'オンライン' : event.location,
                    extendedProps: {
                        isOnline: event.event_type === 'online' || event.event_type === 'hybrid',
                        meetingUrl: event.online_url,
                        organizerId: event.organizer_id,
                        attendanceStatus: participation ? participation.status : 'registered'
                    }
                };
            });

            // カレンダーにイベントを追加
            if (calendarInstance) {
                calendarInstance.removeAllEvents();
                calendarInstance.addEventSource(events);
            }

        } catch (error) {
            console.error('[CalendarIntegration] イベント読み込みエラー:', error);
            showError('イベントの読み込みに失敗しました');
        }
    }

    // 日付と時刻を結合
    function combineDateTime(date, time) {
        if (!date || !time) return null;
        return `${date}T${time}`;
    }

    // イベントクリック処理
    function handleEventClick(info) {
        const event = info.event;
        showEventModal(event);
    }

    // ユーティリティ関数：日付フォーマット
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
    }

    // ユーティリティ関数：時刻フォーマット
    function formatTime(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ユーティリティ関数：HTMLエスケープ
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 日付クリック処理
    function handleDateClick(info) {
        try {
            // 新規イベント作成モーダルを表示
            // TODO: イベント作成機能は別途実装予定
            // console.log('[CalendarIntegration] 日付クリック:', info.dateStr);
            
            // イベント作成モーダルを表示（存在する場合）
            if (typeof window.showCreateEventModal === 'function') {
                window.showCreateEventModal(info.dateStr);
            } else {
                // モーダルが存在しない場合は、トースト通知で案内
                if (window.showToast) {
                    window.showToast(`${info.dateStr} のイベント作成機能は準備中です`, 'info');
                }
                // 暫定処理：イベントページへ遷移（confirm使用せず）
                // window.location.href = `events.html?action=create&date=${info.dateStr}`;
            }
        } catch (error) {
            console.error('[CalendarIntegration] 日付クリックエラー:', error);
            if (window.showToast) {
                window.showToast('エラーが発生しました', 'error');
            }
        }
    }

    // イベント詳細モーダル表示
    function showEventModal(event) {
        // 既存のモーダルがあれば削除
        const existingModal = document.querySelector('.calendar-event-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal calendar-event-modal';
        
        // モーダルコンテンツを構築
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        // ヘッダー
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        
        const title = document.createElement('h2');
        title.textContent = event.title;
        modalHeader.appendChild(title);
        
        const closeButton = document.createElement('button');
        closeButton.className = 'close-button';
        closeButton.innerHTML = '<i class="fas fa-times"></i>';
        
        // イベントリスナーをクリーンアップ関数付きで追加
        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
            }, 300); // アニメーション完了を待つ
        };
        
        closeButton.addEventListener('click', closeModal);
        modalHeader.appendChild(closeButton);
        
        modalContent.appendChild(modalHeader);
        
        // ボディ
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        modalBody.innerHTML = `
            <div class="event-info">
                <div class="info-item">
                    <i class="fas fa-calendar"></i>
                    <span>${escapeHtml(formatDate(event.start))}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-clock"></i>
                    <span>${escapeHtml(formatTime(event.start))} - ${escapeHtml(formatTime(event.end))}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${escapeHtml(event.extendedProps.location || 'オンライン')}</span>
                </div>
                ${event.extendedProps.isOnline && event.extendedProps.meetingUrl ? `
                    <div class="info-item">
                        <i class="fas fa-video"></i>
                        <a href="${escapeHtml(event.extendedProps.meetingUrl)}" target="_blank">ミーティングリンク</a>
                    </div>
                ` : ''}
            </div>
            ${event.extendedProps.description ? `
                <div class="event-description">
                    <h4>詳細</h4>
                    <p>${escapeHtml(event.extendedProps.description)}</p>
                </div>
            ` : ''}
        `;
        modalContent.appendChild(modalBody);
        
        // フッター
        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        
        const googleBtn = document.createElement('button');
        googleBtn.className = 'btn btn-outline';
        googleBtn.innerHTML = '<i class="fab fa-google"></i> Googleカレンダーに追加';
        googleBtn.addEventListener('click', () => {
            window.CalendarIntegration.addToGoogleCalendar(event.id);
        });
        modalFooter.appendChild(googleBtn);
        
        const detailBtn = document.createElement('button');
        detailBtn.className = 'btn btn-primary';
        detailBtn.innerHTML = '<i class="fas fa-info-circle"></i> 詳細を見る';
        detailBtn.addEventListener('click', () => {
            window.location.href = `events.html?id=${event.id}`;
        });
        modalFooter.appendChild(detailBtn);
        
        modalContent.appendChild(modalFooter);
        modal.appendChild(modalContent);
        
        document.body.appendChild(modal);
        modal.classList.add('active');
        
        // ESCキーでモーダルを閉じる
        const handleEscKey = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscKey);
            }
        };
        document.addEventListener('keydown', handleEscKey);
        
        // モーダル外クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
                document.removeEventListener('keydown', handleEscKey);
            }
        });
    }

    // Googleカレンダー連携
    async function syncWithGoogleCalendar() {
        try {
            // Google Calendar APIの初期化
            if (!window.gapi) {
                showError('Google APIが読み込まれていません');
                return;
            }

            // 認証
            await gapi.load('client:auth2');
            
            // Google Calendar API設定
            // 注意: 本番環境では環境変数またはサーバー側で管理すること
            const GOOGLE_API_KEY = window.GOOGLE_CALENDAR_API_KEY || '';
            const GOOGLE_CLIENT_ID = window.GOOGLE_CALENDAR_CLIENT_ID || '';
            
            if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID) {
                showError('Google Calendar連携が設定されていません');
                console.warn('[CalendarIntegration] Google API credentials not configured');
                return;
            }
            
            await gapi.client.init({
                apiKey: GOOGLE_API_KEY,
                clientId: GOOGLE_CLIENT_ID,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                scope: 'https://www.googleapis.com/auth/calendar.events'
            });

            // サインイン
            const googleAuth = gapi.auth2.getAuthInstance();
            if (!googleAuth.isSignedIn.get()) {
                await googleAuth.signIn();
            }

            // イベントを同期
            for (const event of events) {
                await addEventToGoogleCalendar(event);
            }

            showSuccess('Googleカレンダーとの同期が完了しました');

        } catch (error) {
            console.error('[CalendarIntegration] Google連携エラー:', error);
            showError('Googleカレンダーとの連携に失敗しました');
        }
    }

    // Googleカレンダーにイベント追加
    async function addEventToGoogleCalendar(event) {
        const googleEvent = {
            summary: event.title,
            description: event.description,
            start: {
                dateTime: event.start,
                timeZone: 'Asia/Tokyo'
            },
            end: {
                dateTime: event.end,
                timeZone: 'Asia/Tokyo'
            },
            location: event.extendedProps.location
        };

        if (event.extendedProps.isOnline && event.extendedProps.meetingUrl) {
            googleEvent.description += `\n\nミーティングURL: ${event.extendedProps.meetingUrl}`;
        }

        const request = gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource: googleEvent
        });

        await request.execute();
    }

    // 単一イベントをGoogleカレンダーに追加（URLスキーム使用）
    function addToGoogleCalendar(eventId) {
        const event = events.find(e => e.id === eventId);
        if (!event) return;

        const startDate = new Date(event.start).toISOString().replace(/-|:|\.\d\d\d/g, '');
        const endDate = new Date(event.end).toISOString().replace(/-|:|\.\d\d\d/g, '');
        
        const details = encodeURIComponent(event.description || '');
        const location = encodeURIComponent(event.extendedProps.location || '');
        const title = encodeURIComponent(event.title);

        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;
        
        window.open(url, '_blank');
    }

    // iCalエクスポート
    function exportToICal() {
        if (events.length === 0) {
            showError('エクスポートするイベントがありません');
            return;
        }

        let icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//INTERCONNECT//Event Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

        events.forEach(event => {
            const uid = `${event.id}@interconnect.com`;
            const dtstart = formatICalDate(new Date(event.start));
            const dtend = formatICalDate(new Date(event.end));
            const created = formatICalDate(new Date());

            icalContent += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${created}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${event.title}
DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}
LOCATION:${event.extendedProps.location || 'オンライン'}
STATUS:CONFIRMED
END:VEVENT
`;
        });

        icalContent += 'END:VCALENDAR';

        // ダウンロード
        const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'interconnect-events.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        showSuccess('カレンダーファイルをエクスポートしました');
    }

    // iCal日付フォーマット
    function formatICalDate(date) {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    }

    // 日付フォーマット
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
    }

    // 時刻フォーマット
    function formatTime(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ユーティリティ関数
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // グローバルAPIとして公開
    window.CalendarIntegration = {
        initialize,
        syncWithGoogleCalendar,
        exportToICal,
        addToGoogleCalendar,
        refresh: loadEvents
    };

    // 初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();