/**
 * Notifications Actions Fix
 * 通知ページのアクションボタンを完全に機能させる
 */

(function() {
    'use strict';

    console.log('[NotificationActionsFix] アクションボタン修正を適用...');

    class NotificationActionsFixManager {
        constructor() {
            this.init();
        }

        init() {
            // DOMが完全に読み込まれるのを待つ
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.fixAllActions());
            } else {
                this.fixAllActions();
            }

            // 動的に追加される要素にも対応
            this.observeNewNotifications();
        }

        /**
         * すべてのアクションを修正
         */
        fixAllActions() {
            console.log('[NotificationActionsFix] アクションボタンを修正中...');

            // 既存のonclick属性を持つボタンを全て取得
            const buttonsWithAlert = document.querySelectorAll('button[onclick*="alert"]');
            
            buttonsWithAlert.forEach(button => {
                const onclickText = button.getAttribute('onclick');
                console.log('[NotificationActionsFix] 修正対象ボタン:', onclickText);

                // カレンダーに追加ボタン
                if (onclickText.includes('カレンダーに追加')) {
                    this.fixCalendarButton(button);
                }
                // キャンセル待ちボタン
                else if (onclickText.includes('キャンセル待ち')) {
                    this.fixWaitlistButton(button);
                }
                // その他の準備中機能
                else {
                    this.fixGenericButton(button);
                }
            });

            // 静的HTMLのアクションボタンも修正
            this.fixStaticActionButtons();
        }

        /**
         * カレンダーに追加ボタンを修正
         */
        fixCalendarButton(button) {
            button.removeAttribute('onclick');
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // イベントIDを取得（親要素から探す）
                const notificationItem = button.closest('.notification-item-full');
                let eventId = null;
                
                if (notificationItem) {
                    // アクションボタンからイベントIDを探す
                    const eventLink = notificationItem.querySelector('a[href*="events.html"]');
                    if (eventLink) {
                        const href = eventLink.getAttribute('href');
                        eventId = new URLSearchParams(href.split('?')[1]).get('id');
                    }
                }

                if (eventId) {
                    await this.addEventToCalendar(eventId);
                } else {
                    // イベントIDが見つからない場合はデフォルトの処理
                    await this.addEventToCalendar('default');
                }
            });
        }

        /**
         * キャンセル待ちボタンを修正
         */
        fixWaitlistButton(button) {
            button.removeAttribute('onclick');
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // イベントIDを取得
                const notificationItem = button.closest('.notification-item-full');
                let eventId = null;
                
                if (notificationItem) {
                    const eventLink = notificationItem.querySelector('a[href*="events.html"]');
                    if (eventLink) {
                        const href = eventLink.getAttribute('href');
                        eventId = new URLSearchParams(href.split('?')[1]).get('id');
                    }
                }

                if (eventId) {
                    await this.joinWaitlist(eventId);
                } else {
                    this.showInfoMessage('イベント情報が見つかりません');
                }
            });
        }

        /**
         * その他のボタンを修正
         */
        fixGenericButton(button) {
            const originalOnclick = button.getAttribute('onclick');
            button.removeAttribute('onclick');
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                
                // 元のアラートメッセージを取得
                const match = originalOnclick.match(/alert\(['"](.+?)['"]\)/);
                if (match) {
                    const message = match[1];
                    this.showInfoMessage(message);
                }
            });
        }

        /**
         * 静的HTMLのアクションボタンを修正
         */
        fixStaticActionButtons() {
            // 通知ページ内の全てのアクションエリアを確認
            const notificationActions = document.querySelectorAll('.notification-actions');
            
            notificationActions.forEach(actionsContainer => {
                const buttons = actionsContainer.querySelectorAll('.btn');
                
                buttons.forEach(button => {
                    // href属性がない、または#のボタンを修正
                    if (!button.getAttribute('href') || button.getAttribute('href') === '#') {
                        const buttonText = button.textContent.trim();
                        
                        if (buttonText.includes('カレンダー')) {
                            this.makeCalendarButtonFunctional(button);
                        }
                        else if (buttonText.includes('連絡先')) {
                            this.makeContactButtonFunctional(button);
                        }
                    }
                });
            });
        }

        /**
         * カレンダーボタンを機能的にする
         */
        makeCalendarButtonFunctional(button) {
            if (!button.hasAttribute('data-fixed')) {
                button.setAttribute('data-fixed', 'true');
                button.style.cursor = 'pointer';
                
                button.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const notificationItem = button.closest('.notification-item-full');
                    const eventId = notificationItem ? notificationItem.dataset.actionId : null;
                    
                    await this.addEventToCalendar(eventId || 'default');
                });
            }
        }

        /**
         * 連絡先ボタンを機能的にする
         */
        makeContactButtonFunctional(button) {
            if (!button.hasAttribute('data-fixed')) {
                button.setAttribute('data-fixed', 'true');
                button.style.cursor = 'pointer';
                
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // メッセージページへ遷移
                    window.location.href = 'messages.html';
                });
            }
        }

        /**
         * イベントをカレンダーに追加
         */
        async addEventToCalendar(eventId) {
            console.log('[NotificationActionsFix] カレンダーに追加:', eventId);

            try {
                let eventData = null;

                // Supabaseからイベント情報を取得
                if (window.supabase && eventId !== 'default') {
                    const { data, error } = await window.supabase
                        .from('events')
                        .select('*')
                        .eq('id', eventId)
                        .single();

                    if (!error && data) {
                        eventData = data;
                    }
                }

                // デフォルトのイベントデータ
                if (!eventData) {
                    const notificationItem = document.querySelector(`[data-action-id="${eventId}"]`);
                    const title = notificationItem ? 
                        notificationItem.querySelector('.notification-title')?.textContent : 
                        'イベント';

                    eventData = {
                        title: title || 'イベント',
                        start_date: new Date().toISOString().split('T')[0],
                        time: '14:00〜16:00',
                        location: 'オンライン',
                        description: 'INTERCONNECTイベント'
                    };
                }

                // カレンダーURLを生成
                const calendarUrl = this.generateCalendarUrl(eventData);
                
                // 新しいタブで開く
                window.open(calendarUrl, '_blank');
                
                // 成功メッセージ
                this.showSuccessMessage('カレンダーが開きました');

            } catch (error) {
                console.error('[NotificationActionsFix] エラー:', error);
                this.showErrorMessage('カレンダーの追加に失敗しました');
            }
        }

        /**
         * キャンセル待ちリストに登録
         */
        async joinWaitlist(eventId) {
            console.log('[NotificationActionsFix] キャンセル待ち登録:', eventId);

            try {
                // ローディング表示
                this.showLoadingMessage('キャンセル待ちリストに登録中...');

                if (window.supabase) {
                    const userId = await this.getCurrentUserId();
                    if (!userId) {
                        throw new Error('ログインが必要です');
                    }

                    // event_waitlistテーブルに登録（存在する場合）
                    const { error } = await window.supabase
                        .from('event_waitlist')
                        .insert({
                            event_id: eventId,
                            user_id: userId,
                            registered_at: new Date().toISOString(),
                            status: 'waiting'
                        });

                    if (error && error.code !== '42P01') { // テーブルが存在しない以外のエラー
                        throw error;
                    }

                    // user_activitiesに記録
                    await window.supabase
                        .from('user_activities')
                        .insert({
                            user_id: userId,
                            activity_type: 'event_waitlist',
                            activity_detail: 'イベントのキャンセル待ちリストに登録しました',
                            related_id: eventId,
                            created_at: new Date().toISOString()
                        });
                }

                // 成功メッセージ
                this.showSuccessMessage('キャンセル待ちリストに登録しました');

            } catch (error) {
                console.error('[NotificationActionsFix] エラー:', error);
                this.showErrorMessage(error.message || 'キャンセル待ち登録に失敗しました');
            }
        }

        /**
         * カレンダーURLを生成
         */
        generateCalendarUrl(eventData) {
            // Googleカレンダー用のURL生成
            const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
            
            // タイトル
            const title = encodeURIComponent(eventData.title || 'イベント');
            
            // 日時の処理
            const startDate = new Date(eventData.start_date || new Date());
            const timeMatch = (eventData.time || '').match(/(\d{1,2}):(\d{2})/);
            
            if (timeMatch) {
                startDate.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]));
            }
            
            // 終了時間（開始から2時間後と仮定）
            const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
            
            // フォーマット（YYYYMMDDTHHmmssZ）
            const formatDate = (date) => {
                return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
            };
            
            const dates = `${formatDate(startDate)}/${formatDate(endDate)}`;
            
            // 詳細
            const details = encodeURIComponent(
                eventData.description || 
                `INTERCONNECTイベント\n\n場所: ${eventData.location || '未定'}`
            );
            
            // 場所
            const location = encodeURIComponent(eventData.location || 'オンライン');
            
            return `${baseUrl}&text=${title}&dates=${dates}&details=${details}&location=${location}`;
        }

        /**
         * 新しい通知を監視
         */
        observeNewNotifications() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.classList?.contains('notification-item-full')) {
                            // 新しい通知が追加されたら、そのアクションボタンを修正
                            setTimeout(() => {
                                this.fixAllActions();
                            }, 100);
                        }
                    });
                });
            });

            const notificationsPage = document.querySelector('.notifications-page');
            if (notificationsPage) {
                observer.observe(notificationsPage, {
                    childList: true,
                    subtree: true
                });
            }
        }

        /**
         * ユーザーIDを取得
         */
        async getCurrentUserId() {
            try {
                if (window.supabase) {
                    const { data: { user } } = await window.supabase.auth.getUser();
                    if (user) return user.id;
                }

                const userData = localStorage.getItem('user_data');
                if (userData) {
                    const parsed = JSON.parse(userData);
                    return parsed.id || parsed.user_id;
                }

                return null;
            } catch (error) {
                console.error('[NotificationActionsFix] ユーザーID取得エラー:', error);
                return null;
            }
        }

        /**
         * メッセージ表示メソッド
         */
        showSuccessMessage(message) {
            this.showMessage(message, 'success', 'fa-check-circle');
        }

        showErrorMessage(message) {
            this.showMessage(message, 'error', 'fa-exclamation-circle');
        }

        showInfoMessage(message) {
            this.showMessage(message, 'info', 'fa-info-circle');
        }

        showLoadingMessage(message) {
            this.showMessage(message, 'loading', 'fa-spinner fa-spin');
        }

        showMessage(message, type, icon) {
            // 既存のメッセージを削除
            const existing = document.querySelector('.action-message');
            if (existing) existing.remove();

            const messageEl = document.createElement('div');
            messageEl.className = `action-message ${type}`;
            messageEl.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${message}</span>
            `;

            document.body.appendChild(messageEl);

            setTimeout(() => messageEl.classList.add('show'), 10);

            if (type !== 'loading') {
                setTimeout(() => {
                    messageEl.classList.remove('show');
                    setTimeout(() => messageEl.remove(), 300);
                }, 3000);
            }
        }
    }

    // スタイルを追加
    const style = document.createElement('style');
    style.textContent = `
        /* アクションメッセージ */
        .action-message {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-20px);
            background: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius-md);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 10000;
            min-width: 250px;
            justify-content: center;
        }

        .action-message.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        .action-message.success {
            background: #4CAF50;
            color: white;
        }

        .action-message.error {
            background: #f44336;
            color: white;
        }

        .action-message.info {
            background: #2196F3;
            color: white;
        }

        .action-message.loading {
            background: #FF9800;
            color: white;
        }

        .action-message i {
            font-size: 1.25rem;
        }

        /* 修正されたボタンのスタイル */
        button[data-fixed="true"] {
            position: relative;
            overflow: hidden;
        }

        button[data-fixed="true"]:after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }

        button[data-fixed="true"]:active:after {
            width: 300px;
            height: 300px;
        }
    `;
    document.head.appendChild(style);

    // 初期化
    window.notificationActionsFixManager = new NotificationActionsFixManager();

})();