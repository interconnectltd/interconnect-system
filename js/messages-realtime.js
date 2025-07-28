/**
 * Messages Realtime
 * リアルタイムメッセージング機能
 */

(function() {
    'use strict';

    console.log('[MessagesRealtime] 初期化開始...');

    class MessagesRealtimeManager {
        constructor() {
            this.channels = new Map();
            this.typingTimeouts = new Map();
            this.init();
        }

        async init() {
            // Supabaseマネージャーを待機
            await this.waitForSupabaseManager();
            
            if (!window.supabase || !window.messagesSupabaseManager) {
                console.error('[MessagesRealtime] 依存関係が見つかりません');
                return;
            }

            this.supabaseManager = window.messagesSupabaseManager;
            this.setupRealtimeSubscriptions();
        }

        /**
         * Supabaseマネージャーの初期化を待機
         */
        async waitForSupabaseManager() {
            let attempts = 0;
            while (!window.messagesSupabaseManager && attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
        }

        /**
         * リアルタイムサブスクリプションを設定
         */
        setupRealtimeSubscriptions() {
            // ユーザーのすべてのチャットルームを監視
            this.subscribeToUserMessages();
            
            // 新規チャットルームの監視
            this.subscribeToNewChatRooms();
            
            // オンラインステータスの監視
            this.setupPresence();
        }

        /**
         * ユーザーのメッセージを監視
         */
        subscribeToUserMessages() {
            if (!this.supabaseManager.userId) return;

            const channel = window.supabase
                .channel('user-messages')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                }, (payload) => {
                    this.handleNewMessage(payload.new);
                })
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages'
                }, (payload) => {
                    this.handleMessageUpdate(payload.new);
                })
                .on('postgres_changes', {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'messages'
                }, (payload) => {
                    this.handleMessageDelete(payload.old);
                })
                .subscribe();

            this.channels.set('user-messages', channel);
        }

        /**
         * 新規チャットルームを監視
         */
        subscribeToNewChatRooms() {
            if (!this.supabaseManager.userId) return;

            const channel = window.supabase
                .channel('user-chat-rooms')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_participants',
                    filter: `user_id=eq.${this.supabaseManager.userId}`
                }, async (payload) => {
                    // 新しいチャットルームに参加
                    await this.supabaseManager.loadChatRooms();
                })
                .subscribe();

            this.channels.set('user-chat-rooms', channel);
        }

        /**
         * プレゼンス（オンライン状態）を設定
         */
        setupPresence() {
            if (!this.supabaseManager.userId) return;

            const presenceChannel = window.supabase.channel('presence-messages');
            
            presenceChannel
                .on('presence', { event: 'sync' }, () => {
                    const state = presenceChannel.presenceState();
                    this.updateOnlineStatus(state);
                })
                .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                    console.log('[MessagesRealtime] ユーザーがオンラインに:', key);
                })
                .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                    console.log('[MessagesRealtime] ユーザーがオフラインに:', key);
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await presenceChannel.track({
                            user_id: this.supabaseManager.userId,
                            online_at: new Date().toISOString()
                        });
                    }
                });

            this.channels.set('presence-messages', presenceChannel);
        }

        /**
         * 新しいメッセージを処理
         */
        async handleNewMessage(message) {
            console.log('[MessagesRealtime] 新しいメッセージ:', message);

            // ダミーデータモードの場合はスキップ
            if (this.supabaseManager.useDummyData) return;

            // 現在のチャットルームのメッセージの場合
            if (message.room_id === this.supabaseManager.currentRoomId) {
                // 自分が送信したメッセージでない場合のみ追加
                if (message.sender_id !== this.supabaseManager.userId) {
                    this.addMessageToUI(message);
                    
                    // 既読にする
                    await this.supabaseManager.markMessagesAsRead(message.room_id);
                }
            } else {
                // 他のチャットルームのメッセージ
                this.updateChatListWithNewMessage(message);
                
                // 通知を表示
                this.showNewMessageNotification(message);
            }

            // タイピング表示を消す
            this.hideTypingIndicator(message.sender_id);
        }

        /**
         * メッセージをUIに追加
         */
        addMessageToUI(message) {
            const messagesArea = document.getElementById('messagesArea');
            if (!messagesArea) return;

            // 日付区切りが必要か確認
            const messages = messagesArea.querySelectorAll('.message');
            const lastMessage = messages[messages.length - 1];
            
            if (lastMessage) {
                const lastMessageDate = new Date(lastMessage.dataset.timestamp).toDateString();
                const newMessageDate = new Date(message.created_at).toDateString();
                
                if (lastMessageDate !== newMessageDate) {
                    messagesArea.appendChild(this.supabaseManager.createDateDivider(message.created_at));
                }
            }

            // メッセージを追加
            const messageEl = this.supabaseManager.createMessageElement(message);
            messagesArea.appendChild(messageEl);

            // アニメーション
            messageEl.style.opacity = '0';
            messageEl.style.transform = 'translateY(20px)';
            setTimeout(() => {
                messageEl.style.transition = 'all 0.3s ease';
                messageEl.style.opacity = '1';
                messageEl.style.transform = 'translateY(0)';
            }, 10);

            // 最下部にスクロール
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }

        /**
         * チャットリストを新しいメッセージで更新
         */
        updateChatListWithNewMessage(message) {
            const chatItem = document.querySelector(`[data-room-id="${message.room_id}"]`);
            if (!chatItem) return;

            // 最新メッセージを更新
            const lastMessageEl = chatItem.querySelector('.chat-last-message');
            if (lastMessageEl) {
                lastMessageEl.textContent = message.content;
            }

            // 時刻を更新
            const timeEl = chatItem.querySelector('.chat-time');
            if (timeEl) {
                timeEl.textContent = this.supabaseManager.formatMessageTime(message.created_at);
            }

            // 未読数を増やす
            let unreadEl = chatItem.querySelector('.unread-count');
            if (!unreadEl) {
                unreadEl = document.createElement('span');
                unreadEl.className = 'unread-count';
                chatItem.querySelector('.chat-meta').appendChild(unreadEl);
            }
            
            const currentCount = parseInt(unreadEl.textContent || '0');
            unreadEl.textContent = currentCount + 1;

            // リストの先頭に移動
            chatItem.parentElement.prepend(chatItem);
        }

        /**
         * 新着メッセージ通知を表示
         */
        showNewMessageNotification(message) {
            // 通知権限を確認
            if (Notification.permission !== 'granted') return;

            const sender = this.supabaseManager.getUserInfo(message.sender_id);
            
            const notification = new Notification(`${sender.name}`, {
                body: message.content,
                icon: sender.avatar,
                tag: message.room_id,
                requireInteraction: false
            });

            notification.onclick = () => {
                window.focus();
                this.supabaseManager.selectChatRoom(message.room_id);
                notification.close();
            };

            // 通知音を再生
            this.playNotificationSound();
        }

        /**
         * 通知音を再生
         */
        playNotificationSound() {
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmHAg8k9n1unEiBC13yO/eizEIHWq+8+OWT');
                audio.volume = 0.5;
                audio.play().catch(e => console.log('通知音の再生に失敗:', e));
            } catch (error) {
                console.error('[MessagesRealtime] 通知音エラー:', error);
            }
        }

        /**
         * メッセージの更新を処理
         */
        handleMessageUpdate(message) {
            const messageEl = document.querySelector(`[data-message-id="${message.id}"]`);
            if (!messageEl) return;

            // メッセージ内容を更新
            const bubble = messageEl.querySelector('.message-bubble p');
            if (bubble) {
                bubble.textContent = message.content;
            }

            // 編集済みマークを追加
            if (message.is_edited && !messageEl.querySelector('.edited-mark')) {
                const time = messageEl.querySelector('.message-time');
                if (time) {
                    const editedMark = document.createElement('span');
                    editedMark.className = 'edited-mark';
                    editedMark.textContent = '（編集済み）';
                    time.appendChild(editedMark);
                }
            }
        }

        /**
         * メッセージの削除を処理
         */
        handleMessageDelete(message) {
            const messageEl = document.querySelector(`[data-message-id="${message.id}"]`);
            if (messageEl) {
                messageEl.style.transition = 'all 0.3s ease';
                messageEl.style.opacity = '0';
                messageEl.style.transform = 'translateX(-20px)';
                setTimeout(() => messageEl.remove(), 300);
            }
        }

        /**
         * タイピング状態を送信
         */
        sendTypingIndicator(roomId) {
            if (this.supabaseManager.useDummyData) {
                // ダミーモードではローカルで表示
                return;
            }

            const channel = this.getOrCreateRoomChannel(roomId);
            if (!channel) return;

            channel.send({
                type: 'broadcast',
                event: 'typing',
                payload: {
                    user_id: this.supabaseManager.userId,
                    room_id: roomId
                }
            });

            // タイムアウトをリセット
            this.resetTypingTimeout(roomId);
        }

        /**
         * タイピングタイムアウトをリセット
         */
        resetTypingTimeout(roomId) {
            const existingTimeout = this.typingTimeouts.get(roomId);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
            }

            const timeout = setTimeout(() => {
                this.sendTypingStop(roomId);
            }, 3000);

            this.typingTimeouts.set(roomId, timeout);
        }

        /**
         * タイピング停止を送信
         */
        sendTypingStop(roomId) {
            const channel = this.channels.get(`room-${roomId}`);
            if (!channel) return;

            channel.send({
                type: 'broadcast',
                event: 'typing-stop',
                payload: {
                    user_id: this.supabaseManager.userId,
                    room_id: roomId
                }
            });

            this.typingTimeouts.delete(roomId);
        }

        /**
         * ルーム専用チャンネルを取得または作成
         */
        getOrCreateRoomChannel(roomId) {
            const channelKey = `room-${roomId}`;
            let channel = this.channels.get(channelKey);

            if (!channel) {
                channel = window.supabase
                    .channel(channelKey)
                    .on('broadcast', { event: 'typing' }, (payload) => {
                        if (payload.payload.user_id !== this.supabaseManager.userId) {
                            this.showTypingIndicator(payload.payload.user_id);
                        }
                    })
                    .on('broadcast', { event: 'typing-stop' }, (payload) => {
                        if (payload.payload.user_id !== this.supabaseManager.userId) {
                            this.hideTypingIndicator(payload.payload.user_id);
                        }
                    })
                    .subscribe();

                this.channels.set(channelKey, channel);
            }

            return channel;
        }

        /**
         * タイピングインジケーターを表示
         */
        showTypingIndicator(userId) {
            const typingEl = document.getElementById('typingIndicator');
            if (!typingEl) return;

            const user = this.supabaseManager.getUserInfo(userId);
            typingEl.querySelector('.message-avatar').src = user.avatar;
            typingEl.querySelector('.message-avatar').alt = user.name;
            typingEl.style.display = 'flex';

            // 10秒後に自動で非表示
            setTimeout(() => {
                this.hideTypingIndicator(userId);
            }, 10000);
        }

        /**
         * タイピングインジケーターを非表示
         */
        hideTypingIndicator(userId) {
            const typingEl = document.getElementById('typingIndicator');
            if (typingEl) {
                typingEl.style.display = 'none';
            }
        }

        /**
         * オンライン状態を更新
         */
        updateOnlineStatus(presenceState) {
            // オンラインユーザーのリストを作成
            const onlineUsers = new Set();
            
            Object.keys(presenceState).forEach(key => {
                const presences = presenceState[key];
                presences.forEach(presence => {
                    if (presence.user_id) {
                        onlineUsers.add(presence.user_id);
                    }
                });
            });

            // チャットヘッダーのステータスを更新
            const statusEl = document.querySelector('.chat-header-status');
            if (statusEl && this.supabaseManager.currentRoomId) {
                const room = this.supabaseManager.chatRooms.find(r => r.id === this.supabaseManager.currentRoomId);
                if (room) {
                    const otherUserId = room.participants?.find(id => id !== this.supabaseManager.userId);
                    if (otherUserId && onlineUsers.has(otherUserId)) {
                        statusEl.innerHTML = '<span class="status-indicator online"></span>オンライン';
                    } else {
                        statusEl.innerHTML = '<span class="status-indicator"></span>オフライン';
                    }
                }
            }
        }

        /**
         * クリーンアップ
         */
        cleanup() {
            // すべてのチャンネルを解除
            this.channels.forEach((channel, key) => {
                window.supabase.removeChannel(channel);
            });
            this.channels.clear();

            // タイピングタイムアウトをクリア
            this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
            this.typingTimeouts.clear();
        }
    }

    // 初期化
    setTimeout(() => {
        window.messagesRealtimeManager = new MessagesRealtimeManager();
    }, 100);

    // ページ離脱時のクリーンアップ
    window.addEventListener('beforeunload', () => {
        if (window.messagesRealtimeManager) {
            window.messagesRealtimeManager.cleanup();
        }
    });

})();