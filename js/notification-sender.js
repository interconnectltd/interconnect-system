/**
 * Notification Sender
 * 通知を送信するためのヘルパー関数
 */

(function() {
    'use strict';

    class NotificationSender {
        /**
         * 新着メッセージ通知を送信
         */
        static async sendMessageNotification(recipientId, senderName, messagePreview) {
            try {
                const { data: { user } } = await window.supabase.auth.getUser();
                if (!user) return;

                const notification = {
                    user_id: recipientId,
                    type: 'message',
                    title: '新着メッセージ',
                    message: `${senderName}さんからメッセージが届きました`,
                    data: {
                        sender_id: user.id,
                        sender_name: senderName,
                        message_preview: messagePreview?.substring(0, 100)
                    }
                };

                const { error } = await window.supabase
                    .from('notifications')
                    .insert(notification);

                if (error) {
                    console.error('[NotificationSender] Error sending message notification:', error);
                }
            } catch (error) {
                console.error('[NotificationSender] Error:', error);
            }
        }

        /**
         * 接続リクエスト通知を送信
         */
        static async sendConnectionRequestNotification(recipientId, senderName) {
            try {
                const { data: { user } } = await window.supabase.auth.getUser();
                if (!user) return;

                const notification = {
                    user_id: recipientId,
                    type: 'connection_request',
                    title: '新しい接続リクエスト',
                    message: `${senderName}さんから接続リクエストが届きました`,
                    data: {
                        sender_id: user.id,
                        sender_name: senderName
                    }
                };

                const { error } = await window.supabase
                    .from('notifications')
                    .insert(notification);

                if (error) {
                    console.error('[NotificationSender] Error sending connection request notification:', error);
                }
            } catch (error) {
                console.error('[NotificationSender] Error:', error);
            }
        }

        /**
         * 接続承認通知を送信
         */
        static async sendConnectionAcceptedNotification(recipientId, accepterName) {
            try {
                const { data: { user } } = await window.supabase.auth.getUser();
                if (!user) return;

                const notification = {
                    user_id: recipientId,
                    type: 'connection_accepted',
                    title: '接続リクエストが承認されました',
                    message: `${accepterName}さんがあなたの接続リクエストを承認しました`,
                    data: {
                        accepter_id: user.id,
                        accepter_name: accepterName
                    }
                };

                const { error } = await window.supabase
                    .from('notifications')
                    .insert(notification);

                if (error) {
                    console.error('[NotificationSender] Error sending connection accepted notification:', error);
                }
            } catch (error) {
                console.error('[NotificationSender] Error:', error);
            }
        }

        /**
         * イベントリマインダー通知を送信（バッチ処理用）
         */
        static async sendEventReminders() {
            try {
                // 明日開催されるイベントを取得
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowStr = tomorrow.toISOString().split('T')[0];

                const { data: events, error: eventsError } = await window.supabase
                    .from('events')
                    .select('id, title, event_date, start_time')
                    .eq('event_date', tomorrowStr)
                    .eq('is_cancelled', false);

                if (eventsError) throw eventsError;

                // 各イベントの参加者に通知を送信
                for (const event of events) {
                    const { data: participants, error: participantsError } = await window.supabase
                        .from('event_participants')
                        .select('user_id')
                        .eq('event_id', event.id)
                        .in('status', ['registered', 'confirmed']);

                    if (participantsError) continue;

                    const notifications = participants.map(p => ({
                        user_id: p.user_id,
                        type: 'event_reminder',
                        title: 'イベントリマインダー',
                        message: `「${event.title}」が明日開催されます`,
                        data: {
                            event_id: event.id,
                            event_title: event.title,
                            event_date: event.event_date,
                            start_time: event.start_time
                        }
                    }));

                    if (notifications.length > 0) {
                        await window.supabase
                            .from('notifications')
                            .insert(notifications);
                    }
                }
            } catch (error) {
                console.error('[NotificationSender] Error sending event reminders:', error);
            }
        }

        /**
         * イベントキャンセル通知を送信
         */
        static async sendEventCancelledNotification(eventId, eventTitle, participantIds) {
            try {
                const notifications = participantIds.map(userId => ({
                    user_id: userId,
                    type: 'event_cancelled',
                    title: 'イベントがキャンセルされました',
                    message: `「${eventTitle}」はキャンセルされました`,
                    data: {
                        event_id: eventId,
                        event_title: eventTitle
                    }
                }));

                if (notifications.length > 0) {
                    const { error } = await window.supabase
                        .from('notifications')
                        .insert(notifications);

                    if (error) {
                        console.error('[NotificationSender] Error sending event cancelled notifications:', error);
                    }
                }
            } catch (error) {
                console.error('[NotificationSender] Error:', error);
            }
        }

        /**
         * イベント更新通知を送信
         */
        static async sendEventUpdatedNotification(eventId, eventTitle, participantIds, changes) {
            try {
                const changeMessages = [];
                if (changes.date) changeMessages.push('日時');
                if (changes.location) changeMessages.push('場所');
                if (changes.details) changeMessages.push('詳細');

                const changeText = changeMessages.join('、');

                const notifications = participantIds.map(userId => ({
                    user_id: userId,
                    type: 'event_updated',
                    title: 'イベント情報が更新されました',
                    message: `「${eventTitle}」の${changeText}が変更されました`,
                    data: {
                        event_id: eventId,
                        event_title: eventTitle,
                        changes: changes
                    }
                }));

                if (notifications.length > 0) {
                    const { error } = await window.supabase
                        .from('notifications')
                        .insert(notifications);

                    if (error) {
                        console.error('[NotificationSender] Error sending event updated notifications:', error);
                    }
                }
            } catch (error) {
                console.error('[NotificationSender] Error:', error);
            }
        }

        /**
         * システム通知を送信
         */
        static async sendSystemNotification(recipientId, title, message) {
            try {
                const notification = {
                    user_id: recipientId,
                    type: 'system',
                    title: title,
                    message: message,
                    data: {}
                };

                const { error } = await window.supabase
                    .from('notifications')
                    .insert(notification);

                if (error) {
                    console.error('[NotificationSender] Error sending system notification:', error);
                }
            } catch (error) {
                console.error('[NotificationSender] Error:', error);
            }
        }

        /**
         * アナウンスメント（全体通知）を送信
         */
        static async sendAnnouncement(title, message) {
            try {
                // すべてのアクティブユーザーを取得
                const { data: users, error: usersError } = await window.supabase
                    .from('user_profiles')
                    .select('id');

                if (usersError) throw usersError;

                const notifications = users.map(user => ({
                    user_id: user.id,
                    type: 'announcement',
                    title: title,
                    message: message,
                    data: {}
                }));

                if (notifications.length > 0) {
                    const { error } = await window.supabase
                        .from('notifications')
                        .insert(notifications);

                    if (error) {
                        console.error('[NotificationSender] Error sending announcement:', error);
                    }
                }
            } catch (error) {
                console.error('[NotificationSender] Error:', error);
            }
        }
    }

    // グローバルに公開
    window.NotificationSender = NotificationSender;

})();