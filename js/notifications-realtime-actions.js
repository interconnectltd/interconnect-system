/**
 * Notifications Realtime and Actions
 * 通知アクションボタンとリアルタイム更新の実装
 */

(function() {
    'use strict';

    console.log('[NotificationActions] 通知アクションとリアルタイム機能を初期化...');

    class NotificationActionsManager {
        constructor() {
            this.realtimeChannel = null;
            this.init();
        }

        async init() {
            console.log('[NotificationActions] 初期化開始');
            
            // マネージャーの初期化を待つ
            await this.waitForManagers();
            
            // アクションボタンのイベントリスナーを設定
            this.setupActionListeners();
            
            // リアルタイム更新を設定
            this.setupRealtimeUpdates();
            
            // 通知ページのアクションボタンを有効化
            this.activateNotificationActions();
        }

        /**
         * マネージャーの初期化を待つ
         */
        async waitForManagers() {
            let attempts = 0;
            while (!window.notificationSupabaseManager && attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            console.log('[NotificationActions] マネージャー検出完了');
        }

        /**
         * アクションボタンのイベントリスナーを設定
         */
        setupActionListeners() {
            // 通知ページのアクションボタン
            document.addEventListener('click', async (e) => {
                // イベント詳細を見る
                if (e.target.matches('.notification-actions .btn[href*="events.html"]')) {
                    e.preventDefault();
                    const href = e.target.getAttribute('href');
                    const eventId = new URLSearchParams(href.split('?')[1]).get('id');
                    
                    if (eventId) {
                        console.log('[NotificationActions] イベント詳細へ遷移:', eventId);
                        // イベントIDをセッションストレージに保存
                        sessionStorage.setItem('viewEventId', eventId);
                        window.location.href = 'events.html';
                    }
                }

                // メッセージを送る
                if (e.target.matches('.notification-actions .btn[href*="messages.html"]')) {
                    e.preventDefault();
                    const href = e.target.getAttribute('href');
                    const userId = new URLSearchParams(href.split('?')[1]).get('user');
                    
                    if (userId) {
                        console.log('[NotificationActions] メッセージ画面へ遷移:', userId);
                        sessionStorage.setItem('messageToUserId', userId);
                        window.location.href = 'messages.html';
                    }
                }

                // プロフィールを見る
                if (e.target.matches('.notification-actions .btn[href*="members.html"]')) {
                    e.preventDefault();
                    const href = e.target.getAttribute('href');
                    const userId = new URLSearchParams(href.split('?')[1]).get('id');
                    
                    if (userId) {
                        console.log('[NotificationActions] プロフィール画面へ遷移:', userId);
                        sessionStorage.setItem('viewProfileId', userId);
                        window.location.href = 'members.html';
                    }
                }

                // カレンダーに追加
                if (e.target.matches('.btn[onclick*="addToCalendar"]')) {
                    e.preventDefault();
                    const eventId = e.target.getAttribute('onclick').match(/'([^']+)'/)[1];
                    this.addToCalendar(eventId);
                }
            });
        }

        /**
         * 通知ページのアクションボタンを有効化
         */
        activateNotificationActions() {
            // すべてのアクションボタンを確認
            const actionButtons = document.querySelectorAll('.notification-actions .btn');
            console.log('[NotificationActions] アクションボタン数:', actionButtons.length);

            actionButtons.forEach(button => {
                // href属性がある場合は、実際のリンクとして機能させる
                if (button.getAttribute('href') && button.getAttribute('href') !== '#') {
                    button.style.cursor = 'pointer';
                    
                    // onclickがある場合は削除（hrefを優先）
                    if (button.hasAttribute('onclick')) {
                        button.removeAttribute('onclick');
                    }
                }
            });
        }

        /**
         * カレンダーに追加
         */
        async addToCalendar(eventId) {
            console.log('[NotificationActions] カレンダーに追加:', eventId);

            try {
                // イベント情報を取得
                let eventData = null;
                
                if (window.supabase) {
                    const { data, error } = await window.supabase
                        .from('events')
                        .select('*')
                        .eq('id', eventId)
                        .single();

                    if (!error && data) {
                        eventData = data;
                    }
                }

                if (!eventData) {
                    // ダミーデータ
                    eventData = {
                        title: 'サンプルイベント',
                        start_date: new Date().toISOString().split('T')[0],
                        time: '14:00〜16:00',
                        location: 'オンライン開催',
                        description: 'イベントの詳細情報'
                    };
                }

                // Googleカレンダーに追加するURLを生成
                const startDate = new Date(eventData.start_date);
                const title = encodeURIComponent(eventData.title);
                const details = encodeURIComponent(eventData.description || '');
                const location = encodeURIComponent(eventData.location || '');
                
                // 時刻を解析（例: "14:00〜16:00"）
                const timeMatch = (eventData.time || '').match(/(\d{1,2}):(\d{2})/);
                if (timeMatch) {
                    startDate.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]));
                }

                const startDateStr = startDate.toISOString().replace(/-|:|\.\d{3}/g, '');
                const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2時間後
                const endDateStr = endDate.toISOString().replace(/-|:|\.\d{3}/g, '');

                const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateStr}/${endDateStr}&details=${details}&location=${location}`;

                // 新しいタブで開く
                window.open(googleCalendarUrl, '_blank');

                // 成功メッセージ
                this.showSuccessMessage('カレンダーが開きました');

            } catch (error) {
                console.error('[NotificationActions] カレンダー追加エラー:', error);
                this.showErrorMessage('カレンダーの追加に失敗しました');
            }
        }

        /**
         * リアルタイム更新を設定
         */
        setupRealtimeUpdates() {
            if (!window.supabase || !window.notificationSupabaseManager) return;

            const userId = window.notificationSupabaseManager.userId;
            if (!userId) return;

            console.log('[NotificationActions] リアルタイム更新を設定');

            // 既存のチャンネルがあれば削除
            if (this.realtimeChannel) {
                window.supabase.removeChannel(this.realtimeChannel);
            }

            // 使用するテーブル名
            const tableName = window.notificationSupabaseManager.useActivityTable 
                ? 'user_activities' 
                : 'notifications';

            // リアルタイムサブスクリプション
            this.realtimeChannel = window.supabase
                .channel('notifications_realtime')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: tableName,
                    filter: `user_id=eq.${userId}`
                }, (payload) => {
                    console.log('[NotificationActions] 新しい通知:', payload);
                    this.handleNewNotification(payload.new);
                })
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: tableName,
                    filter: `user_id=eq.${userId}`
                }, (payload) => {
                    console.log('[NotificationActions] 通知更新:', payload);
                    this.handleNotificationUpdate(payload.new);
                })
                .on('postgres_changes', {
                    event: 'DELETE',
                    schema: 'public',
                    table: tableName,
                    filter: `user_id=eq.${userId}`
                }, (payload) => {
                    console.log('[NotificationActions] 通知削除:', payload);
                    this.handleNotificationDelete(payload.old);
                })
                .subscribe();
        }

        /**
         * 新しい通知を処理
         */
        async handleNewNotification(notification) {
            // 通知音を再生
            this.playNotificationSound();

            // デスクトップ通知を表示
            this.showDesktopNotification(notification);

            // 通知データを再読み込み
            if (window.notificationSupabaseManager) {
                await window.notificationSupabaseManager.replaceNotificationData();
            }

            // フィルターを再適用
            if (window.notificationFilterManager) {
                window.notificationFilterManager.applyFilters();
            }

            // 新着通知アニメーション
            setTimeout(() => {
                const newElement = document.querySelector(`[data-id="${notification.id}"]`);
                if (newElement) {
                    newElement.classList.add('new-notification');
                    setTimeout(() => {
                        newElement.classList.remove('new-notification');
                    }, 3000);
                }
            }, 100);
        }

        /**
         * 通知の更新を処理
         */
        handleNotificationUpdate(notification) {
            // 既読状態の更新など
            const element = document.querySelector(`[data-id="${notification.id}"]`);
            if (element) {
                if (notification.is_read) {
                    element.classList.remove('unread');
                } else {
                    element.classList.add('unread');
                }
            }

            // バッジを更新
            if (window.notificationReadManager) {
                window.notificationReadManager.updateNotificationBadge();
            }
        }

        /**
         * 通知の削除を処理
         */
        handleNotificationDelete(notification) {
            // UIから削除
            const element = document.querySelector(`[data-id="${notification.id}"]`);
            if (element) {
                element.remove();
            }

            // 配列から削除
            if (window.notifications) {
                const index = window.notifications.findIndex(n => n.id === notification.id);
                if (index !== -1) {
                    window.notifications.splice(index, 1);
                }
            }

            // バッジを更新
            if (window.notificationReadManager) {
                window.notificationReadManager.updateNotificationBadge();
            }
        }

        /**
         * 通知音を再生
         */
        playNotificationSound() {
            try {
                // 通知音のオーディオ要素を作成
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmHAg8k9n1unEiBC13yO/eizEIHWq+8+OWT');
                audio.volume = 0.5;
                audio.play().catch(error => {
                    console.log('[NotificationActions] 通知音の再生に失敗:', error);
                });
            } catch (error) {
                console.error('[NotificationActions] 通知音エラー:', error);
            }
        }

        /**
         * デスクトップ通知を表示
         */
        async showDesktopNotification(notification) {
            // 通知権限を確認
            if (!("Notification" in window)) {
                console.log('[NotificationActions] ブラウザが通知をサポートしていません');
                return;
            }

            if (Notification.permission === "granted") {
                this.createDesktopNotification(notification);
            } else if (Notification.permission !== "denied") {
                const permission = await Notification.requestPermission();
                if (permission === "granted") {
                    this.createDesktopNotification(notification);
                }
            }
        }

        /**
         * デスクトップ通知を作成
         */
        createDesktopNotification(notificationData) {
            const title = notificationData.title || notificationData.activity_detail || '新しい通知';
            const options = {
                body: notificationData.message || '',
                icon: '/assets/logo.png',
                badge: '/assets/badge.png',
                tag: notificationData.id,
                requireInteraction: false,
                silent: false
            };

            const notification = new Notification(title, options);

            // クリック時の処理
            notification.onclick = () => {
                window.focus();
                
                // 通知ページに遷移
                if (window.location.pathname !== '/notifications.html') {
                    window.location.href = '/notifications.html';
                }
                
                notification.close();
            };

            // 5秒後に自動で閉じる
            setTimeout(() => {
                notification.close();
            }, 5000);
        }

        /**
         * メッセージ表示
         */
        showSuccessMessage(message) {
            if (window.notificationDeleteManager) {
                window.notificationDeleteManager.showSuccessMessage(message);
            }
        }

        showErrorMessage(message) {
            if (window.notificationDeleteManager) {
                window.notificationDeleteManager.showErrorMessage(message);
            }
        }
    }

    // スタイルを追加
    const style = document.createElement('style');
    style.textContent = `
        /* 新着通知アニメーション */
        .new-notification {
            animation: newNotificationPulse 1s ease-in-out 3;
            background: rgba(0, 102, 255, 0.1);
        }

        @keyframes newNotificationPulse {
            0% {
                background: rgba(0, 102, 255, 0.1);
                transform: scale(1);
            }
            50% {
                background: rgba(0, 102, 255, 0.2);
                transform: scale(1.01);
            }
            100% {
                background: rgba(0, 102, 255, 0.1);
                transform: scale(1);
            }
        }

        /* アクションボタンのホバー効果 */
        .notification-actions .btn {
            transition: all 0.2s ease;
        }

        .notification-actions .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
    `;
    document.head.appendChild(style);

    // 初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.notificationActionsManager = new NotificationActionsManager();
        });
    } else {
        setTimeout(() => {
            window.notificationActionsManager = new NotificationActionsManager();
        }, 3000);
    }

})();