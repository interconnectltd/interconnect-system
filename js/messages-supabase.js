/**
 * Messages Supabase Integration
 * メッセージ機能のSupabase連携
 */

(function() {
    'use strict';

    console.log('[MessagesSupabase] 初期化開始...');

    class MessagesSupabaseManager {
        constructor() {
            this.userId = null;
            this.currentRoomId = null;
            this.chatRooms = [];
            this.messages = [];
            this.init();
        }

        async init() {
            // Supabaseクライアントの確認
            if (!window.supabase) {
                console.error('[MessagesSupabase] Supabaseクライアントが見つかりません');
                return;
            }

            // ユーザー情報を取得
            await this.getCurrentUser();
            
            if (!this.userId) {
                console.error('[MessagesSupabase] ユーザーが認証されていません');
                this.showAuthRequired();
                return;
            }

            // テーブルの存在確認と作成
            await this.ensureTablesExist();

            // チャットルーム一覧を取得
            await this.loadChatRooms();

            // URLパラメータからチャットルームを選択
            this.selectRoomFromUrl();

            // イベントリスナーを設定
            this.setupEventListeners();
        }

        /**
         * 現在のユーザー情報を取得
         */
        async getCurrentUser() {
            try {
                const { data: { user } } = await window.supabase.auth.getUser();
                if (user) {
                    this.userId = user.id;
                    console.log('[MessagesSupabase] ユーザーID:', this.userId);
                }
            } catch (error) {
                console.error('[MessagesSupabase] ユーザー情報取得エラー:', error);
            }
        }

        /**
         * 必要なテーブルの存在確認（ダミーデータで代替）
         */
        async ensureTablesExist() {
            // 実際のプロダクションではSupabaseダッシュボードでテーブルを作成
            console.log('[MessagesSupabase] テーブル確認をスキップ（ダミーデータ使用）');
            
            // ダミーデータの設定
            this.useDummyData = true;
            
            if (this.useDummyData) {
                this.setupDummyData();
            }
        }

        /**
         * ダミーデータの設定
         */
        setupDummyData() {
            // ダミーユーザー
            this.dummyUsers = [
                { id: 'user1', name: '山田 太郎', company: '株式会社テックイノベーション', avatar: 'assets/user-placeholder.svg' },
                { id: 'user2', name: '佐藤 花子', company: 'グローバルコマース株式会社', avatar: 'assets/user-placeholder.svg' },
                { id: 'user3', name: '鈴木 一郎', company: 'フィンテックソリューションズ', avatar: 'assets/user-placeholder.svg' }
            ];

            // ダミーチャットルーム
            this.dummyChatRooms = [
                {
                    id: 'room1',
                    type: 'direct',
                    participants: [this.userId, 'user1'],
                    last_message: {
                        content: 'こんにちは！プロジェクトの件で...',
                        created_at: new Date().toISOString(),
                        sender_id: 'user1'
                    },
                    unread_count: 2
                },
                {
                    id: 'room2',
                    type: 'direct',
                    participants: [this.userId, 'user2'],
                    last_message: {
                        content: 'ありがとうございます',
                        created_at: new Date(Date.now() - 86400000).toISOString(),
                        sender_id: 'user2'
                    },
                    unread_count: 0
                },
                {
                    id: 'room3',
                    type: 'direct',
                    participants: [this.userId, 'user3'],
                    last_message: {
                        content: '了解しました',
                        created_at: new Date(Date.now() - 172800000).toISOString(),
                        sender_id: this.userId
                    },
                    unread_count: 0
                }
            ];

            // ダミーメッセージ
            this.dummyMessages = {
                'room1': [
                    {
                        id: 'msg1',
                        room_id: 'room1',
                        sender_id: 'user1',
                        content: 'こんにちは！プロジェクトの件でご相談があります。',
                        created_at: new Date(Date.now() - 3600000).toISOString(),
                        is_read: true
                    },
                    {
                        id: 'msg2',
                        room_id: 'room1',
                        sender_id: this.userId,
                        content: 'こんにちは！どのような件でしょうか？',
                        created_at: new Date(Date.now() - 3500000).toISOString(),
                        is_read: true
                    },
                    {
                        id: 'msg3',
                        room_id: 'room1',
                        sender_id: 'user1',
                        content: '新しいプロジェクトの提案書について、ご意見をいただきたいです。',
                        created_at: new Date(Date.now() - 3400000).toISOString(),
                        is_read: false
                    },
                    {
                        id: 'msg4',
                        room_id: 'room1',
                        sender_id: 'user1',
                        content: 'お時間のあるときに確認していただけますでしょうか？',
                        created_at: new Date(Date.now() - 3300000).toISOString(),
                        is_read: false
                    }
                ],
                'room2': [
                    {
                        id: 'msg5',
                        room_id: 'room2',
                        sender_id: this.userId,
                        content: '先日はお時間いただきありがとうございました。',
                        created_at: new Date(Date.now() - 90000000).toISOString(),
                        is_read: true
                    },
                    {
                        id: 'msg6',
                        room_id: 'room2',
                        sender_id: 'user2',
                        content: 'ありがとうございます',
                        created_at: new Date(Date.now() - 86400000).toISOString(),
                        is_read: true
                    }
                ],
                'room3': [
                    {
                        id: 'msg7',
                        room_id: 'room3',
                        sender_id: 'user3',
                        content: '資料を送らせていただきました。',
                        created_at: new Date(Date.now() - 180000000).toISOString(),
                        is_read: true
                    },
                    {
                        id: 'msg8',
                        room_id: 'room3',
                        sender_id: this.userId,
                        content: '了解しました',
                        created_at: new Date(Date.now() - 172800000).toISOString(),
                        is_read: true
                    }
                ]
            };
        }

        /**
         * チャットルーム一覧を取得
         */
        async loadChatRooms() {
            try {
                if (this.useDummyData) {
                    // ダミーデータを使用
                    this.chatRooms = this.dummyChatRooms;
                } else {
                    // Supabaseから取得
                    const { data, error } = await window.supabase
                        .from('chat_participants')
                        .select(`
                            room_id,
                            chat_rooms (
                                id,
                                name,
                                type,
                                updated_at
                            )
                        `)
                        .eq('user_id', this.userId);

                    if (error) throw error;
                    
                    // チャットルームごとに最新メッセージを取得
                    for (const participant of data) {
                        const room = participant.chat_rooms;
                        
                        // 最新メッセージを取得
                        const { data: messages } = await window.supabase
                            .from('messages')
                            .select('*')
                            .eq('room_id', room.id)
                            .order('created_at', { ascending: false })
                            .limit(1);

                        room.last_message = messages?.[0] || null;

                        // 未読数を取得
                        const { count } = await window.supabase
                            .from('messages')
                            .select('*', { count: 'exact', head: true })
                            .eq('room_id', room.id)
                            .gt('created_at', participant.last_read_at || '1970-01-01');

                        room.unread_count = count || 0;
                    }

                    this.chatRooms = data.map(p => p.chat_rooms);
                }

                // UIに反映
                this.renderChatList();

            } catch (error) {
                console.error('[MessagesSupabase] チャットルーム取得エラー:', error);
                this.showError('チャットルームの読み込みに失敗しました');
            }
        }

        /**
         * チャットリストをレンダリング
         */
        renderChatList() {
            const chatList = document.getElementById('chatList');
            if (!chatList) return;

            chatList.innerHTML = '';

            for (const room of this.chatRooms) {
                const otherUserId = room.participants?.find(id => id !== this.userId);
                const otherUser = this.getUserInfo(otherUserId);
                
                const chatItem = document.createElement('div');
                chatItem.className = 'chat-item';
                chatItem.dataset.roomId = room.id;
                
                const lastMessageTime = room.last_message 
                    ? this.formatMessageTime(room.last_message.created_at)
                    : '';

                chatItem.innerHTML = `
                    <img src="${otherUser.avatar}" alt="${otherUser.name}" class="chat-avatar">
                    <div class="chat-info">
                        <div class="chat-name">${otherUser.name}</div>
                        <div class="chat-last-message">${room.last_message?.content || 'メッセージなし'}</div>
                    </div>
                    <div class="chat-meta">
                        <div class="chat-time">${lastMessageTime}</div>
                        ${room.unread_count > 0 ? `<span class="unread-count">${room.unread_count}</span>` : ''}
                    </div>
                `;

                chatItem.addEventListener('click', () => this.selectChatRoom(room.id));
                chatList.appendChild(chatItem);
            }
        }

        /**
         * ユーザー情報を取得
         */
        getUserInfo(userId) {
            if (this.useDummyData) {
                return this.dummyUsers.find(u => u.id === userId) || {
                    id: userId,
                    name: 'Unknown User',
                    avatar: 'assets/user-placeholder.svg'
                };
            }
            
            // 実際のプロダクションではSupabaseから取得
            return {
                id: userId,
                name: 'ユーザー',
                avatar: 'assets/user-placeholder.svg'
            };
        }

        /**
         * メッセージ時刻をフォーマット
         */
        formatMessageTime(timestamp) {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;

            if (diff < 86400000) { // 24時間以内
                return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
            } else if (diff < 172800000) { // 48時間以内
                return '昨日';
            } else {
                return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
            }
        }

        /**
         * チャットルームを選択
         */
        async selectChatRoom(roomId) {
            this.currentRoomId = roomId;
            
            // UIを更新
            document.querySelectorAll('.chat-item').forEach(item => {
                item.classList.toggle('active', item.dataset.roomId === roomId);
            });

            // チャットエリアを表示
            document.getElementById('chatEmptyState').style.display = 'none';
            document.querySelector('.chat-area').style.display = 'flex';

            // モバイルの場合はチャットエリアを表示
            if (window.innerWidth <= 768) {
                document.querySelector('.chat-sidebar').classList.add('hidden');
                document.querySelector('.chat-area').classList.add('active');
            }

            // メッセージを読み込む
            await this.loadMessages(roomId);

            // 既読状態を更新
            await this.markMessagesAsRead(roomId);

            // チャットヘッダーを更新
            this.updateChatHeader(roomId);
        }

        /**
         * メッセージを読み込む
         */
        async loadMessages(roomId) {
            try {
                const messagesArea = document.getElementById('messagesArea');
                messagesArea.innerHTML = '<div class="chat-loading"><i class="fas fa-spinner fa-spin"></i></div>';

                if (this.useDummyData) {
                    // ダミーデータを使用
                    this.messages = this.dummyMessages[roomId] || [];
                } else {
                    // Supabaseから取得
                    const { data, error } = await window.supabase
                        .from('messages')
                        .select('*')
                        .eq('room_id', roomId)
                        .order('created_at', { ascending: true });

                    if (error) throw error;
                    this.messages = data;
                }

                // メッセージをレンダリング
                this.renderMessages();

            } catch (error) {
                console.error('[MessagesSupabase] メッセージ取得エラー:', error);
                this.showError('メッセージの読み込みに失敗しました');
            }
        }

        /**
         * メッセージをレンダリング
         */
        renderMessages() {
            const messagesArea = document.getElementById('messagesArea');
            messagesArea.innerHTML = '';

            let currentDate = null;

            for (const message of this.messages) {
                // 日付区切りを追加
                const messageDate = new Date(message.created_at).toDateString();
                if (messageDate !== currentDate) {
                    currentDate = messageDate;
                    messagesArea.appendChild(this.createDateDivider(message.created_at));
                }

                // メッセージを追加
                messagesArea.appendChild(this.createMessageElement(message));
            }

            // 最下部にスクロール
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }

        /**
         * 日付区切りを作成
         */
        createDateDivider(timestamp) {
            const divider = document.createElement('div');
            divider.className = 'message-date-divider';
            
            const date = new Date(timestamp);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            let dateText;
            if (date.toDateString() === today.toDateString()) {
                dateText = '今日';
            } else if (date.toDateString() === yesterday.toDateString()) {
                dateText = '昨日';
            } else {
                dateText = date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
            }

            divider.innerHTML = `<span>${dateText}</span>`;
            return divider;
        }

        /**
         * メッセージ要素を作成
         */
        createMessageElement(message) {
            const isOwn = message.sender_id === this.userId;
            const sender = this.getUserInfo(message.sender_id);

            const messageEl = document.createElement('div');
            messageEl.className = `message ${isOwn ? 'sent' : 'received'}`;
            messageEl.dataset.messageId = message.id;

            const time = new Date(message.created_at).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit'
            });

            messageEl.innerHTML = `
                ${!isOwn ? `<img src="${sender.avatar}" alt="${sender.name}" class="message-avatar">` : ''}
                <div class="message-content">
                    <div class="message-bubble">
                        <p>${this.escapeHtml(message.content)}</p>
                    </div>
                    <div class="message-time">
                        ${time}
                        ${isOwn ? `<i class="fas fa-check-double ${message.is_read ? 'read' : ''}"></i>` : ''}
                    </div>
                </div>
            `;

            return messageEl;
        }

        /**
         * HTMLエスケープ
         */
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        /**
         * メッセージを既読にする
         */
        async markMessagesAsRead(roomId) {
            try {
                if (!this.useDummyData) {
                    // 最終既読時刻を更新
                    await window.supabase
                        .from('chat_participants')
                        .update({ last_read_at: new Date().toISOString() })
                        .eq('room_id', roomId)
                        .eq('user_id', this.userId);
                }

                // UIの未読数を更新
                const chatItem = document.querySelector(`[data-room-id="${roomId}"]`);
                if (chatItem) {
                    const unreadBadge = chatItem.querySelector('.unread-count');
                    if (unreadBadge) unreadBadge.remove();
                }

            } catch (error) {
                console.error('[MessagesSupabase] 既読更新エラー:', error);
            }
        }

        /**
         * チャットヘッダーを更新
         */
        updateChatHeader(roomId) {
            const room = this.chatRooms.find(r => r.id === roomId);
            if (!room) return;

            const otherUserId = room.participants?.find(id => id !== this.userId);
            const otherUser = this.getUserInfo(otherUserId);

            document.querySelector('.chat-header-avatar').src = otherUser.avatar;
            document.querySelector('.chat-header-avatar').alt = otherUser.name;
            document.querySelector('.chat-header-name').textContent = otherUser.name;
        }

        /**
         * メッセージを送信
         */
        async sendMessage(content, type = 'text', fileUrl = null) {
            if (!this.currentRoomId) return;

            try {
                const message = {
                    id: `msg_${Date.now()}`,
                    room_id: this.currentRoomId,
                    sender_id: this.userId,
                    content: content,
                    type: type,
                    file_url: fileUrl,
                    created_at: new Date().toISOString()
                };

                if (this.useDummyData) {
                    // ダミーデータに追加
                    if (!this.dummyMessages[this.currentRoomId]) {
                        this.dummyMessages[this.currentRoomId] = [];
                    }
                    this.dummyMessages[this.currentRoomId].push(message);
                    this.messages.push(message);
                    
                    // UIに追加
                    const messagesArea = document.getElementById('messagesArea');
                    messagesArea.appendChild(this.createMessageElement(message));
                    messagesArea.scrollTop = messagesArea.scrollHeight;

                    // チャットリストを更新
                    const room = this.chatRooms.find(r => r.id === this.currentRoomId);
                    if (room) {
                        room.last_message = message;
                        room.updated_at = message.created_at;
                        this.renderChatList();
                    }
                } else {
                    // Supabaseに送信
                    const { data, error } = await window.supabase
                        .from('messages')
                        .insert(message)
                        .select()
                        .single();

                    if (error) throw error;

                    // チャットルームの更新時刻を更新
                    await window.supabase
                        .from('chat_rooms')
                        .update({ updated_at: new Date().toISOString() })
                        .eq('id', this.currentRoomId);
                }

                // 入力欄をクリア
                document.getElementById('messageInput').value = '';

                return message;

            } catch (error) {
                console.error('[MessagesSupabase] メッセージ送信エラー:', error);
                this.showError('メッセージの送信に失敗しました');
                throw error;
            }
        }

        /**
         * チャットルームを作成（新規チャット）
         */
        async createChatRoom(otherUserId) {
            try {
                // 既存のチャットルームを確認
                const existingRoom = this.chatRooms.find(room => 
                    room.type === 'direct' && 
                    room.participants?.includes(otherUserId)
                );

                if (existingRoom) {
                    this.selectChatRoom(existingRoom.id);
                    return existingRoom;
                }

                if (this.useDummyData) {
                    // ダミーデータ用の新規ルーム
                    const newRoom = {
                        id: `room_${Date.now()}`,
                        type: 'direct',
                        participants: [this.userId, otherUserId],
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    this.dummyChatRooms.push(newRoom);
                    this.dummyMessages[newRoom.id] = [];
                    
                    await this.loadChatRooms();
                    this.selectChatRoom(newRoom.id);
                    
                    return newRoom;
                } else {
                    // Supabaseに新規ルームを作成
                    const { data: room, error: roomError } = await window.supabase
                        .from('chat_rooms')
                        .insert({ type: 'direct' })
                        .select()
                        .single();

                    if (roomError) throw roomError;

                    // 参加者を追加
                    const participants = [
                        { room_id: room.id, user_id: this.userId },
                        { room_id: room.id, user_id: otherUserId }
                    ];

                    const { error: participantsError } = await window.supabase
                        .from('chat_participants')
                        .insert(participants);

                    if (participantsError) throw participantsError;

                    await this.loadChatRooms();
                    this.selectChatRoom(room.id);
                    
                    return room;
                }

            } catch (error) {
                console.error('[MessagesSupabase] チャットルーム作成エラー:', error);
                this.showError('チャットルームの作成に失敗しました');
                throw error;
            }
        }

        /**
         * URLパラメータからチャットルームを選択
         */
        selectRoomFromUrl() {
            const params = new URLSearchParams(window.location.search);
            const roomId = params.get('room');
            const userId = params.get('user');

            if (roomId && this.chatRooms.find(r => r.id === roomId)) {
                this.selectChatRoom(roomId);
            } else if (userId) {
                // 新規チャットを開始
                this.createChatRoom(userId);
            }
        }

        /**
         * イベントリスナーを設定
         */
        setupEventListeners() {
            // チャット検索
            const chatSearch = document.getElementById('chatSearch');
            if (chatSearch) {
                chatSearch.addEventListener('input', (e) => this.filterChats(e.target.value));
            }
        }

        /**
         * チャットをフィルタリング
         */
        filterChats(query) {
            const items = document.querySelectorAll('.chat-item');
            const lowerQuery = query.toLowerCase();

            items.forEach(item => {
                const name = item.querySelector('.chat-name').textContent.toLowerCase();
                const message = item.querySelector('.chat-last-message').textContent.toLowerCase();
                
                if (name.includes(lowerQuery) || message.includes(lowerQuery)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        }

        /**
         * エラーを表示
         */
        showError(message) {
            console.error('[MessagesSupabase]', message);
            // TODO: UIにエラーメッセージを表示
        }

        /**
         * 認証が必要なメッセージを表示
         */
        showAuthRequired() {
            const container = document.querySelector('.messages-container');
            if (container) {
                container.innerHTML = `
                    <div class="chat-empty-state">
                        <i class="fas fa-lock"></i>
                        <h3>ログインが必要です</h3>
                        <p>メッセージ機能を使用するにはログインしてください。</p>
                        <button class="btn btn-primary" onclick="window.location.href='login.html'">
                            ログインページへ
                        </button>
                    </div>
                `;
            }
        }
    }

    // 初期化
    window.messagesSupabaseManager = new MessagesSupabaseManager();

})();