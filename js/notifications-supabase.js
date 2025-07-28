/**
 * Notifications Supabase Integration
 * Step 1: Supabase連携の実装
 */

(function() {
    'use strict';

    console.log('[NotificationSupabase] Supabase連携を初期化...');

    class NotificationSupabaseManager {
        constructor() {
            this.notifications = [];
            this.userId = null;
            this.useActivityTable = false;
            this.init();
        }

        async init() {
            console.log('[NotificationSupabase] 初期化開始');
            
            // ユーザーIDを取得
            this.userId = await this.getCurrentUserId();
            if (!this.userId) {
                console.error('[NotificationSupabase] ユーザーIDが取得できません');
                return;
            }

            // テーブル構造を確認
            await this.checkTableStructure();

            // 既存の通知データを置き換え
            this.replaceNotificationData();
        }

        /**
         * 現在のユーザーIDを取得
         */
        async getCurrentUserId() {
            try {
                // Supabaseの認証から取得
                if (window.supabase) {
                    const { data: { user } } = await window.supabase.auth.getUser();
                    if (user) return user.id;
                }

                // ローカルストレージから取得
                const userData = localStorage.getItem('user_data');
                if (userData) {
                    const parsed = JSON.parse(userData);
                    return parsed.id || parsed.user_id;
                }

                // デフォルトユーザーID（テスト用）
                return 'test-user-id';
            } catch (error) {
                console.error('[NotificationSupabase] ユーザーID取得エラー:', error);
                return null;
            }
        }

        /**
         * テーブル構造を確認
         */
        async checkTableStructure() {
            if (!window.supabase) {
                console.log('[NotificationSupabase] Supabaseクライアントが利用できません');
                return;
            }

            try {
                // notificationsテーブルの存在確認
                const { data, error } = await window.supabase
                    .from('notifications')
                    .select('*')
                    .limit(1);

                if (error && error.code === '42P01') {
                    console.log('[NotificationSupabase] notificationsテーブルが存在しません。user_activitiesを使用します。');
                    this.useActivityTable = true;
                    
                    // user_activitiesの構造を確認
                    const { data: columns } = await window.supabase.rpc('get_table_columns', {
                        table_name: 'user_activities'
                    });
                    
                    console.log('[NotificationSupabase] user_activitiesのカラム:', columns);
                } else {
                    console.log('[NotificationSupabase] notificationsテーブルを使用します。');
                    this.useActivityTable = false;
                }
            } catch (error) {
                console.error('[NotificationSupabase] テーブル確認エラー:', error);
                this.useActivityTable = true;
            }
        }

        /**
         * 通知データを取得
         */
        async fetchNotifications() {
            console.log('[NotificationSupabase] 通知データを取得中...');

            if (!window.supabase) {
                return this.getDummyNotifications();
            }

            try {
                let data, error;

                if (this.useActivityTable) {
                    // user_activitiesテーブルから取得
                    ({ data, error } = await window.supabase
                        .from('user_activities')
                        .select('*')
                        .eq('user_id', this.userId)
                        .order('created_at', { ascending: false })
                        .limit(50));
                } else {
                    // notificationsテーブルから取得
                    ({ data, error } = await window.supabase
                        .from('notifications')
                        .select('*')
                        .eq('user_id', this.userId)
                        .order('created_at', { ascending: false })
                        .limit(50));
                }

                if (error) {
                    console.error('[NotificationSupabase] データ取得エラー:', error);
                    return this.getDummyNotifications();
                }

                if (data && data.length > 0) {
                    console.log('[NotificationSupabase] 取得した通知数:', data.length);
                    return this.formatNotifications(data);
                } else {
                    console.log('[NotificationSupabase] 通知データがありません。ダミーデータを使用します。');
                    return this.getDummyNotifications();
                }

            } catch (error) {
                console.error('[NotificationSupabase] fetchNotifications エラー:', error);
                return this.getDummyNotifications();
            }
        }

        /**
         * 通知データをフォーマット
         */
        formatNotifications(data) {
            return data.map(item => {
                if (this.useActivityTable) {
                    // user_activitiesのデータを通知形式に変換
                    const typeMap = {
                        'event_participation': { type: 'event', icon: 'fa-calendar-alt' },
                        'event_created': { type: 'event', icon: 'fa-calendar-plus' },
                        'event_reminder': { type: 'event', icon: 'fa-calendar-check' },
                        'matching': { type: 'match', icon: 'fa-handshake' },
                        'profile_view': { type: 'match', icon: 'fa-eye' },
                        'connection_request': { type: 'match', icon: 'fa-user-plus' },
                        'message_received': { type: 'message', icon: 'fa-envelope' },
                        'user_registered': { type: 'system', icon: 'fa-user-plus' },
                        'system_update': { type: 'system', icon: 'fa-bell' }
                    };

                    const notifType = typeMap[item.activity_type] || { type: 'system', icon: 'fa-bell' };
                    
                    return {
                        id: item.id,
                        type: notifType.type,
                        title: this.generateTitle(item),
                        time: this.getTimeAgo(item.created_at),
                        icon: notifType.icon,
                        unread: !item.is_read,
                        message: item.activity_detail || '',
                        action_type: item.activity_type,
                        action_id: item.related_id,
                        created_at: item.created_at
                    };
                } else {
                    // notificationsテーブルのデータをそのまま使用
                    return {
                        id: item.id,
                        type: item.type || 'system',
                        title: item.title,
                        time: this.getTimeAgo(item.created_at),
                        icon: this.getIconForType(item.type),
                        unread: !item.is_read,
                        message: item.message || '',
                        action_type: item.action_type,
                        action_id: item.action_id,
                        created_at: item.created_at
                    };
                }
            });
        }

        /**
         * アクティビティからタイトルを生成
         */
        generateTitle(activity) {
            const templates = {
                'event_participation': 'イベントに参加登録しました',
                'event_created': '新しいイベントが作成されました',
                'event_reminder': 'イベントのリマインダー',
                'matching': '新しいマッチングがあります',
                'profile_view': 'プロフィールが閲覧されました',
                'connection_request': 'コネクションリクエストがあります',
                'message_received': '新しいメッセージが届きました',
                'user_registered': '新規ユーザーが登録しました',
                'system_update': 'システムからのお知らせ'
            };

            return activity.activity_detail || templates[activity.activity_type] || 'お知らせ';
        }

        /**
         * タイプに応じたアイコンを取得
         */
        getIconForType(type) {
            const iconMap = {
                'event': 'fa-calendar-alt',
                'message': 'fa-envelope',
                'match': 'fa-handshake',
                'system': 'fa-bell'
            };
            return iconMap[type] || 'fa-bell';
        }

        /**
         * 経過時間を取得
         */
        getTimeAgo(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            
            if (minutes < 60) {
                return `${minutes}分前`;
            } else if (hours < 24) {
                return `${hours}時間前`;
            } else if (days < 7) {
                return `${days}日前`;
            } else {
                return date.toLocaleDateString('ja-JP');
            }
        }

        /**
         * ダミー通知データ
         */
        getDummyNotifications() {
            return [
                {
                    id: 1,
                    type: 'event',
                    title: '「DX推進セミナー：AIを活用した業務効率化」の参加申込を受け付けました',
                    time: '2時間前',
                    icon: 'fa-calendar-alt',
                    unread: true,
                    message: '2024年2月15日（木）14:00-16:00に開催予定のセミナーへの参加申込が完了しました。',
                    action_type: 'view_event',
                    action_id: 'e1'
                },
                {
                    id: 2,
                    type: 'match',
                    title: '新しいマッチング候補が見つかりました',
                    time: '4時間前',
                    icon: 'fa-handshake',
                    unread: true,
                    message: 'あなたのビジネスプロフィールに基づいて、3名の新しいマッチング候補が見つかりました。',
                    action_type: 'view_matches'
                },
                {
                    id: 3,
                    type: 'message',
                    title: '山田太郎さんがあなたのプロフィールを閲覧しました',
                    time: '6時間前',
                    icon: 'fa-envelope',
                    unread: false,
                    message: '株式会社テックイノベーションの山田太郎さんがあなたのプロフィールに興味を持っています。',
                    action_type: 'view_profile',
                    action_id: 'u123'
                }
            ];
        }

        /**
         * 既存の通知データを置き換え
         */
        async replaceNotificationData() {
            // 既存のnotifications配列を書き換える
            if (window.notifications) {
                console.log('[NotificationSupabase] 既存の通知データを置き換え中...');
                
                const newNotifications = await this.fetchNotifications();
                
                // グローバルのnotifications配列を更新
                window.notifications.length = 0;
                window.notifications.push(...newNotifications);
                
                console.log('[NotificationSupabase] 通知データを置き換えました:', window.notifications.length);
                
                // UIを更新
                this.updateNotificationUI();
            }
        }

        /**
         * UIを更新
         */
        updateNotificationUI() {
            // バッジを更新
            const unreadCount = window.notifications.filter(n => n.unread).length;
            const badges = document.querySelectorAll('.notification-badge');
            
            badges.forEach(badge => {
                badge.textContent = unreadCount;
                badge.style.display = unreadCount > 0 ? 'flex' : 'none';
            });

            // ドロップダウンが開いている場合は再描画
            const activeDropdown = document.querySelector('.notification-dropdown.show');
            if (activeDropdown) {
                // initNotifications関数を再実行してドロップダウンを更新
                if (window.initNotifications) {
                    window.initNotifications();
                }
            }

            console.log('[NotificationSupabase] UI更新完了');
        }
    }

    // DOMContentLoaded後に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.notificationSupabaseManager = new NotificationSupabaseManager();
        });
    } else {
        // 少し遅延させて既存の初期化が完了するのを待つ
        setTimeout(() => {
            window.notificationSupabaseManager = new NotificationSupabaseManager();
        }, 1000);
    }

})();