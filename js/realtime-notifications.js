/**
 * Realtime Notifications
 * Supabaseリアルタイム通知システム
 */

(function() {
    'use strict';

    class RealtimeNotifications {
        constructor() {
            this.subscription = null;
            this.notifications = [];
            this.unreadCount = 0;
            this.isInitialized = false;
            this.notificationSound = null;
            this.userId = null;
            
            this.init();
        }

        async init() {
            try {
                // ユーザー認証チェック
                const { data: { user } } = await window.supabase.auth.getUser();
                if (!user) {
                    console.log('[RealtimeNotifications] User not authenticated');
                    return;
                }

                this.userId = user.id;
                
                // 通知音の準備
                this.prepareNotificationSound();
                
                // 既存の通知を取得
                await this.loadExistingNotifications();
                
                // リアルタイム接続を開始
                this.subscribeToNotifications();
                
                // UI要素の初期化
                this.initializeUI();
                
                // ブラウザ通知の権限をリクエスト
                this.requestNotificationPermission();
                
                this.isInitialized = true;
                console.log('[RealtimeNotifications] Initialized');
                
            } catch (error) {
                console.error('[RealtimeNotifications] Initialization error:', error);
            }
        }

        /**
         * 既存の通知を読み込む
         */
        async loadExistingNotifications() {
            try {
                const { data, error } = await window.supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', this.userId)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (error) throw error;

                this.notifications = data || [];
                this.updateUnreadCount();
                this.updateNotificationBadges();

            } catch (error) {
                console.error('[RealtimeNotifications] Error loading notifications:', error);
            }
        }

        /**
         * リアルタイム通知を購読
         */
        subscribeToNotifications() {
            // 既存のサブスクリプションをクリーンアップ
            if (this.subscription) {
                this.subscription.unsubscribe();
            }

            // 新しいサブスクリプションを作成
            this.subscription = window.supabase
                .channel('notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${this.userId}`
                    },
                    (payload) => {
                        console.log('[RealtimeNotifications] New notification:', payload);
                        this.handleNewNotification(payload.new);
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${this.userId}`
                    },
                    (payload) => {
                        this.handleNotificationUpdate(payload.new);
                    }
                )
                .subscribe();
        }

        /**
         * 新しい通知を処理
         */
        handleNewNotification(notification) {
            // 通知を配列の先頭に追加
            this.notifications.unshift(notification);
            
            // 未読カウントを更新
            this.updateUnreadCount();
            this.updateNotificationBadges();
            
            // 通知音を再生
            this.playNotificationSound();
            
            // ブラウザ通知を表示
            this.showBrowserNotification(notification);
            
            // トースト通知を表示
            this.showToastNotification(notification);
            
            // イベントを発火
            this.dispatchNotificationEvent('new', notification);
        }

        /**
         * 通知の更新を処理
         */
        handleNotificationUpdate(updatedNotification) {
            const index = this.notifications.findIndex(n => n.id === updatedNotification.id);
            if (index !== -1) {
                this.notifications[index] = updatedNotification;
                this.updateUnreadCount();
                this.updateNotificationBadges();
            }
        }

        /**
         * 未読カウントを更新
         */
        updateUnreadCount() {
            this.unreadCount = this.notifications.filter(n => !n.read).length;
        }

        /**
         * 通知バッジを更新
         */
        updateNotificationBadges() {
            // ヘッダーの通知バッジ
            const badges = document.querySelectorAll('.notification-badge');
            badges.forEach(badge => {
                if (this.unreadCount > 0) {
                    badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                    badge.style.display = 'block';
                } else {
                    badge.style.display = 'none';
                }
            });

            // ドキュメントタイトルを更新
            this.updateDocumentTitle();
        }

        /**
         * ドキュメントタイトルを更新
         */
        updateDocumentTitle() {
            const baseTitle = document.title.replace(/^\(\d+\) /, '');
            if (this.unreadCount > 0) {
                document.title = `(${this.unreadCount}) ${baseTitle}`;
            } else {
                document.title = baseTitle;
            }
        }

        /**
         * 通知音を準備
         */
        prepareNotificationSound() {
            try {
                this.notificationSound = new Audio('data:audio/wav;base64,UklGRuIBAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YXEBAAAAAAEAAgADAAQABQAGAAcACAAPAA4ADQAMAAsACgAJAAMABAAFAAYABwAIAAkACgALAAwADQAOAA8ADwAOAA0ADAALAAoACQAIAAcABgAFAAQAAwACAA==');
                this.notificationSound.volume = 0.3;
            } catch (error) {
                console.log('[RealtimeNotifications] Could not create notification sound');
            }
        }

        /**
         * 通知音を再生
         */
        playNotificationSound() {
            if (this.notificationSound && !document.hidden) {
                try {
                    this.notificationSound.play().catch(() => {
                        // 自動再生がブロックされた場合は無視
                    });
                } catch (error) {
                    // エラーを無視
                }
            }
        }

        /**
         * ブラウザ通知の権限をリクエスト
         */
        async requestNotificationPermission() {
            if ('Notification' in window && Notification.permission === 'default') {
                try {
                    const permission = await Notification.requestPermission();
                    console.log('[RealtimeNotifications] Notification permission:', permission);
                } catch (error) {
                    console.log('[RealtimeNotifications] Could not request notification permission');
                }
            }
        }

        /**
         * ブラウザ通知を表示
         */
        showBrowserNotification(notification) {
            if ('Notification' in window && 
                Notification.permission === 'granted' && 
                document.hidden) {
                
                try {
                    const browserNotification = new Notification(notification.title, {
                        body: notification.message,
                        icon: '/assets/icon-192.png',
                        badge: '/assets/icon-72.png',
                        tag: notification.id,
                        requireInteraction: false,
                        silent: false
                    });

                    browserNotification.onclick = () => {
                        window.focus();
                        this.handleNotificationClick(notification);
                        browserNotification.close();
                    };

                    // 5秒後に自動的に閉じる
                    setTimeout(() => browserNotification.close(), 5000);
                    
                } catch (error) {
                    console.log('[RealtimeNotifications] Could not show browser notification');
                }
            }
        }

        /**
         * トースト通知を表示
         */
        showToastNotification(notification) {
            const toast = document.createElement('div');
            toast.className = 'notification-toast';
            toast.innerHTML = `
                <div class="notification-toast-content">
                    <div class="notification-toast-icon">
                        ${this.getNotificationIcon(notification.type)}
                    </div>
                    <div class="notification-toast-body">
                        <div class="notification-toast-title">${this.escapeHtml(notification.title)}</div>
                        ${notification.message ? `<div class="notification-toast-message">${this.escapeHtml(notification.message)}</div>` : ''}
                    </div>
                    <button class="notification-toast-close" aria-label="閉じる">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;

            document.body.appendChild(toast);

            // クリックイベント
            toast.addEventListener('click', (e) => {
                if (!e.target.closest('.notification-toast-close')) {
                    this.handleNotificationClick(notification);
                }
                toast.remove();
            });

            // 閉じるボタン
            toast.querySelector('.notification-toast-close').addEventListener('click', (e) => {
                e.stopPropagation();
                toast.remove();
            });

            // アニメーション
            requestAnimationFrame(() => {
                toast.classList.add('show');
            });

            // 5秒後に自動的に消す
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 5000);
        }

        /**
         * 通知クリック時の処理
         */
        handleNotificationClick(notification) {
            // 通知を既読にする
            this.markAsRead(notification.id);

            // タイプに応じて適切なページへ遷移
            switch (notification.type) {
                case 'message':
                    if (notification.data?.sender_id) {
                        window.location.href = `messages.html?user=${notification.data.sender_id}`;
                    } else {
                        window.location.href = 'messages.html';
                    }
                    break;
                case 'connection_request':
                case 'connection_accepted':
                    window.location.href = 'members.html';
                    break;
                case 'event_reminder':
                case 'event_cancelled':
                case 'event_updated':
                    if (notification.data?.event_id) {
                        window.location.href = `events.html#event-${notification.data.event_id}`;
                    } else {
                        window.location.href = 'events.html';
                    }
                    break;
                default:
                    window.location.href = 'notifications.html';
            }
        }

        /**
         * 通知を既読にする
         */
        async markAsRead(notificationId) {
            try {
                const { error } = await window.supabase
                    .from('notifications')
                    .update({ read: true })
                    .eq('id', notificationId);

                if (error) throw error;

                // ローカルの状態も更新
                const notification = this.notifications.find(n => n.id === notificationId);
                if (notification) {
                    notification.read = true;
                    this.updateUnreadCount();
                    this.updateNotificationBadges();
                }

            } catch (error) {
                console.error('[RealtimeNotifications] Error marking as read:', error);
            }
        }

        /**
         * すべての通知を既読にする
         */
        async markAllAsRead() {
            try {
                const unreadIds = this.notifications
                    .filter(n => !n.read)
                    .map(n => n.id);

                if (unreadIds.length === 0) return;

                const { error } = await window.supabase
                    .from('notifications')
                    .update({ read: true })
                    .in('id', unreadIds);

                if (error) throw error;

                // ローカルの状態も更新
                this.notifications.forEach(n => {
                    if (!n.read) n.read = true;
                });
                this.updateUnreadCount();
                this.updateNotificationBadges();

            } catch (error) {
                console.error('[RealtimeNotifications] Error marking all as read:', error);
            }
        }

        /**
         * 通知アイコンを取得
         */
        getNotificationIcon(type) {
            const icons = {
                message: '<i class="fas fa-envelope"></i>',
                connection_request: '<i class="fas fa-user-plus"></i>',
                connection_accepted: '<i class="fas fa-check-circle"></i>',
                event_reminder: '<i class="fas fa-calendar-alt"></i>',
                event_cancelled: '<i class="fas fa-calendar-times"></i>',
                event_updated: '<i class="fas fa-calendar-check"></i>',
                system: '<i class="fas fa-info-circle"></i>',
                announcement: '<i class="fas fa-bullhorn"></i>'
            };
            return icons[type] || '<i class="fas fa-bell"></i>';
        }

        /**
         * UI要素を初期化
         */
        initializeUI() {
            // 通知ボタンにクリックイベントを追加
            const notificationBtns = document.querySelectorAll('.notification-btn');
            notificationBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.location.href = 'notifications.html';
                });
            });
        }

        /**
         * 通知イベントを発火
         */
        dispatchNotificationEvent(type, notification) {
            const event = new CustomEvent('notification', {
                detail: { type, notification }
            });
            window.dispatchEvent(event);
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
         * クリーンアップ
         */
        destroy() {
            if (this.subscription) {
                this.subscription.unsubscribe();
            }
        }
    }

    // グローバルに公開
    window.RealtimeNotifications = RealtimeNotifications;

    // DOMContentLoaded時に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.realtimeNotifications = new RealtimeNotifications();
        });
    } else {
        window.realtimeNotifications = new RealtimeNotifications();
    }

})();