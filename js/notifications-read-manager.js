/**
 * Notifications Read/Unread Manager
 * Step 2: 既読/未読管理機能の実装
 */

(function() {
    'use strict';

    console.log('[NotificationReadManager] 既読/未読管理を初期化...');

    class NotificationReadManager {
        constructor() {
            this.useActivityTable = false;
            this.init();
        }

        async init() {
            // Supabaseマネージャーの初期化を待つ
            await this.waitForSupabaseManager();
            
            // イベントリスナーを設定
            this.setupEventListeners();
            
            // 既読/未読のUI拡張
            this.enhanceReadUnreadUI();
        }

        /**
         * Supabaseマネージャーの初期化を待つ
         */
        async waitForSupabaseManager() {
            let attempts = 0;
            while (!window.notificationSupabaseManager && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (window.notificationSupabaseManager) {
                this.useActivityTable = window.notificationSupabaseManager.useActivityTable;
                console.log('[NotificationReadManager] Supabaseマネージャー検出:', this.useActivityTable ? 'user_activities' : 'notifications');
            }
        }

        /**
         * イベントリスナーを設定
         */
        setupEventListeners() {
            // 通知アイテムのクリックで既読にする
            document.addEventListener('click', (e) => {
                // 通知ページの通知アイテム
                const notificationItem = e.target.closest('.notification-item-full');
                if (notificationItem && notificationItem.classList.contains('unread')) {
                    // ボタンやリンク以外のクリックの場合のみ
                    if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('input')) {
                        const notificationId = notificationItem.dataset.id;
                        this.markAsRead(notificationId, notificationItem);
                    }
                }

                // ドロップダウンの通知アイテム
                const dropdownItem = e.target.closest('.notification-item');
                if (dropdownItem && dropdownItem.classList.contains('unread')) {
                    const notificationId = dropdownItem.dataset.id;
                    this.markAsRead(notificationId, dropdownItem);
                }
            });

            // 「すべて既読にする」ボタン
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('mark-all-read') || e.target.closest('.mark-all-read')) {
                    e.preventDefault();
                    this.markAllAsRead();
                }
            });
        }

        /**
         * UI拡張
         */
        enhanceReadUnreadUI() {
            // 通知ページに「すべて既読にする」ボタンを追加
            const notificationsPage = document.querySelector('.notifications-page');
            if (notificationsPage) {
                this.addMarkAllReadButton();
            }
        }

        /**
         * 「すべて既読にする」ボタンを追加
         */
        addMarkAllReadButton() {
            const filtersContainer = document.querySelector('.notifications-filters');
            if (filtersContainer && !document.getElementById('markAllReadPageBtn')) {
                const markAllButton = document.createElement('button');
                markAllButton.id = 'markAllReadPageBtn';
                markAllButton.className = 'btn btn-outline mark-all-read';
                markAllButton.innerHTML = '<i class="fas fa-check-double"></i> すべて既読にする';
                markAllButton.style.marginLeft = 'auto';
                
                filtersContainer.appendChild(markAllButton);
            }
        }

        /**
         * 個別の通知を既読にする
         */
        async markAsRead(notificationId, element) {
            console.log('[NotificationReadManager] 既読にする:', notificationId);

            // UIを即座に更新
            if (element) {
                element.classList.remove('unread');
                element.classList.add('read-transition');
            }

            // グローバルの通知配列を更新
            if (window.notifications) {
                const notification = window.notifications.find(n => n.id == notificationId);
                if (notification) {
                    notification.unread = false;
                }
            }

            // バッジを更新
            this.updateNotificationBadge();

            // Supabaseを更新
            if (window.supabase) {
                try {
                    const userId = await this.getCurrentUserId();
                    if (!userId) return;

                    if (this.useActivityTable) {
                        // user_activitiesテーブルを更新
                        const { error } = await window.supabase
                            .from('user_activities')
                            .update({ 
                                is_read: true,
                                read_at: new Date().toISOString()
                            })
                            .eq('id', notificationId)
                            .eq('user_id', userId);

                        if (error) {
                            console.error('[NotificationReadManager] 既読更新エラー:', error);
                        }
                    } else {
                        // notificationsテーブルを更新
                        const { error } = await window.supabase
                            .from('notifications')
                            .update({ 
                                is_read: true,
                                read_at: new Date().toISOString()
                            })
                            .eq('id', notificationId)
                            .eq('user_id', userId);

                        if (error) {
                            console.error('[NotificationReadManager] 既読更新エラー:', error);
                        }
                    }

                    console.log('[NotificationReadManager] 既読更新完了');
                } catch (error) {
                    console.error('[NotificationReadManager] エラー:', error);
                }
            }
        }

        /**
         * すべての通知を既読にする
         */
        async markAllAsRead() {
            console.log('[NotificationReadManager] すべて既読にする');

            if (!confirm('すべての通知を既読にしますか？')) {
                return;
            }

            // UIを即座に更新
            document.querySelectorAll('.notification-item.unread, .notification-item-full.unread').forEach(element => {
                element.classList.remove('unread');
                element.classList.add('read-transition');
            });

            // グローバルの通知配列を更新
            if (window.notifications) {
                window.notifications.forEach(notification => {
                    notification.unread = false;
                });
            }

            // バッジを更新
            this.updateNotificationBadge();

            // Supabaseを更新
            if (window.supabase) {
                try {
                    const userId = await this.getCurrentUserId();
                    if (!userId) return;

                    const readAt = new Date().toISOString();

                    if (this.useActivityTable) {
                        // user_activitiesテーブルを更新
                        const { error } = await window.supabase
                            .from('user_activities')
                            .update({ 
                                is_read: true,
                                read_at: readAt
                            })
                            .eq('user_id', userId)
                            .or('is_read.is.null,is_read.eq.false');

                        if (error) {
                            console.error('[NotificationReadManager] 一括既読エラー:', error);
                        }
                    } else {
                        // notificationsテーブルを更新
                        const { error } = await window.supabase
                            .from('notifications')
                            .update({ 
                                is_read: true,
                                read_at: readAt
                            })
                            .eq('user_id', userId)
                            .eq('is_read', false);

                        if (error) {
                            console.error('[NotificationReadManager] 一括既読エラー:', error);
                        }
                    }

                    console.log('[NotificationReadManager] 一括既読完了');
                    
                    // 成功メッセージ
                    this.showSuccessMessage('すべての通知を既読にしました');
                } catch (error) {
                    console.error('[NotificationReadManager] エラー:', error);
                }
            }
        }

        /**
         * バッジを更新
         */
        updateNotificationBadge() {
            const unreadCount = window.notifications ? window.notifications.filter(n => n.unread).length : 0;
            const badges = document.querySelectorAll('.notification-badge');
            
            badges.forEach(badge => {
                badge.textContent = unreadCount;
                badge.style.display = unreadCount > 0 ? 'flex' : 'none';
            });

            console.log('[NotificationReadManager] バッジ更新:', unreadCount);
        }

        /**
         * 現在のユーザーIDを取得
         */
        async getCurrentUserId() {
            if (window.notificationSupabaseManager) {
                return window.notificationSupabaseManager.userId;
            }

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

                return 'test-user-id';
            } catch (error) {
                console.error('[NotificationReadManager] ユーザーID取得エラー:', error);
                return null;
            }
        }

        /**
         * 成功メッセージを表示
         */
        showSuccessMessage(message) {
            const notification = document.createElement('div');
            notification.className = 'success-notification';
            notification.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    }

    // スタイルを追加
    const style = document.createElement('style');
    style.textContent = `
        /* 既読アニメーション */
        .read-transition {
            transition: background-color 0.3s ease, border-color 0.3s ease;
        }

        /* 成功メッセージ */
        .success-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius-md);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
            z-index: 10000;
        }

        .success-notification.show {
            opacity: 1;
            transform: translateY(0);
        }

        .success-notification i {
            font-size: 1.25rem;
        }

        /* 既読にするボタン */
        #markAllReadPageBtn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        /* モバイル対応 */
        @media (max-width: 768px) {
            .success-notification {
                left: 20px;
                right: 20px;
            }
            
            #markAllReadPageBtn {
                width: 100%;
                margin-top: 1rem;
                justify-content: center;
            }
        }
    `;
    document.head.appendChild(style);

    // 初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.notificationReadManager = new NotificationReadManager();
        });
    } else {
        setTimeout(() => {
            window.notificationReadManager = new NotificationReadManager();
        }, 1500);
    }

})();