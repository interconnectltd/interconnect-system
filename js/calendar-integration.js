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

    console.log('[CalendarIntegration] カレンダー連携機能初期化');

    // グローバル変数
    let currentUserId = null;
    let calendarInstance = null;
    let events = [];

    // 初期化
    async function initialize() {
        console.log('[CalendarIntegration] 初期化開始');

        // Supabaseの準備を待つ
        await window.waitForSupabase();

        // 現在のユーザーを取得
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            console.error('[CalendarIntegration] ユーザーが認証されていません');
            return;
        }

        currentUserId = user.id;
        console.log('[CalendarIntegration] ユーザーID:', currentUserId);

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
            dateClick: handleDateClick,
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
            // 自分が参加するイベントを取得
            const { data: participations, error: participationError } = await window.supabaseClient
                .from('event_participants')
                .select(`
                    event_id,
                    attendance_status,
                    events(
                        id,
                        title,
                        description,
                        event_date,
                        start_time,
                        end_time,
                        location,
                        is_online,
                        meeting_url,
                        organizer_id
                    )
                `)
                .eq('user_id', currentUserId)
                .eq('attendance_status', 'registered');

            if (participationError) throw participationError;

            // イベントをカレンダー形式に変換
            events = (participations || []).map(p => {
                const event = p.events;
                const startDateTime = combineDateTime(event.event_date, event.start_time);
                const endDateTime = combineDateTime(event.event_date, event.end_time);

                return {
                    id: event.id,
                    title: event.title,
                    start: startDateTime,
                    end: endDateTime,
                    description: event.description,
                    location: event.is_online ? 'オンライン' : event.location,
                    extendedProps: {
                        isOnline: event.is_online,
                        meetingUrl: event.meeting_url,
                        organizerId: event.organizer_id
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

    // 日付クリック処理
    function handleDateClick(info) {
        // 新規イベント作成モーダルを表示
        showCreateEventModal(info.dateStr);
    }

    // イベント詳細モーダル表示
    function showEventModal(event) {
        const modal = document.createElement('div');
        modal.className = 'modal calendar-event-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${escapeHtml(event.title)}</h2>
                    <button class="close-button" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="event-info">
                        <div class="info-item">
                            <i class="fas fa-calendar"></i>
                            <span>${formatDate(event.start)}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-clock"></i>
                            <span>${formatTime(event.start)} - ${formatTime(event.end)}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${event.extendedProps.location || 'オンライン'}</span>
                        </div>
                        ${event.extendedProps.isOnline && event.extendedProps.meetingUrl ? `
                            <div class="info-item">
                                <i class="fas fa-video"></i>
                                <a href="${event.extendedProps.meetingUrl}" target="_blank">ミーティングリンク</a>
                            </div>
                        ` : ''}
                    </div>
                    ${event.extendedProps.description ? `
                        <div class="event-description">
                            <h4>詳細</h4>
                            <p>${escapeHtml(event.extendedProps.description)}</p>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="window.CalendarIntegration.addToGoogleCalendar('${event.id}')">
                        <i class="fab fa-google"></i> Googleカレンダーに追加
                    </button>
                    <button class="btn btn-primary" onclick="window.location.href='events.html?id=${event.id}'">
                        <i class="fas fa-info-circle"></i> 詳細を見る
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('active');
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
            await gapi.client.init({
                apiKey: 'YOUR_API_KEY', // 実際のAPIキーに置き換え
                clientId: 'YOUR_CLIENT_ID', // 実際のクライアントIDに置き換え
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