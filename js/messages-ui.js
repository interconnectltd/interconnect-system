/**
 * Messages UI Manager
 * メッセージUIの管理
 */

(function() {
    'use strict';

    console.log('[MessagesUI] 初期化開始...');

    class MessagesUIManager {
        constructor() {
            this.isMobile = window.innerWidth <= 768;
            this.scrollThreshold = 100;
            this.init();
        }

        init() {
            this.setupEventListeners();
            this.setupResponsive();
            this.setupScrollBehavior();
            this.requestNotificationPermission();
        }

        /**
         * イベントリスナーを設定
         */
        setupEventListeners() {
            // 新規チャットボタン
            const newChatBtn = document.getElementById('newChatBtn');
            if (newChatBtn) {
                newChatBtn.addEventListener('click', () => this.showNewChatModal());
            }

            // モバイル戻るボタン
            const mobileBackBtn = document.getElementById('mobileBackBtn');
            if (mobileBackBtn) {
                mobileBackBtn.addEventListener('click', () => this.showChatList());
            }

            // モーダル閉じるボタン
            const modal = document.getElementById('newChatModal');
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeNewChatModal();
                    }
                });
            }

            // ユーザー検索
            const userSearch = document.getElementById('userSearch');
            if (userSearch) {
                userSearch.addEventListener('input', (e) => this.searchUsers(e.target.value));
            }

            // ファイル添付ボタン
            const attachBtn = document.getElementById('attachBtn');
            const fileInput = document.getElementById('fileInput');
            if (attachBtn && fileInput) {
                attachBtn.addEventListener('click', () => fileInput.click());
            }

            // 絵文字ボタン（将来実装）
            const emojiBtn = document.getElementById('emojiBtn');
            if (emojiBtn) {
                emojiBtn.addEventListener('click', () => this.showEmojiPicker());
            }

            // チャットヘッダーのアクションボタン
            this.setupHeaderActions();
        }

        /**
         * レスポンシブ対応
         */
        setupResponsive() {
            // ウィンドウリサイズ時の処理
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    const wasMobile = this.isMobile;
                    this.isMobile = window.innerWidth <= 768;
                    
                    if (wasMobile !== this.isMobile) {
                        this.handleResponsiveChange();
                    }
                }, 250);
            });

            // 初期状態の設定
            if (this.isMobile) {
                this.setupMobileView();
            }
        }

        /**
         * モバイルビューの設定
         */
        setupMobileView() {
            const chatSidebar = document.querySelector('.chat-sidebar');
            const chatArea = document.querySelector('.chat-area');
            const emptyState = document.getElementById('chatEmptyState');

            if (chatSidebar && chatArea && emptyState) {
                // 初期状態：チャットリストを表示
                chatSidebar.classList.remove('hidden');
                chatArea.classList.remove('active');
                emptyState.style.display = 'none';
            }
        }

        /**
         * レスポンシブ変更時の処理
         */
        handleResponsiveChange() {
            if (!this.isMobile) {
                // デスクトップビューに戻す
                const chatSidebar = document.querySelector('.chat-sidebar');
                const chatArea = document.querySelector('.chat-area');
                
                if (chatSidebar && chatArea) {
                    chatSidebar.classList.remove('hidden');
                    chatArea.classList.remove('active');
                }
            }
        }

        /**
         * チャットリストを表示（モバイル）
         */
        showChatList() {
            if (!this.isMobile) return;

            const chatSidebar = document.querySelector('.chat-sidebar');
            const chatArea = document.querySelector('.chat-area');
            
            if (chatSidebar && chatArea) {
                chatSidebar.classList.remove('hidden');
                chatArea.classList.remove('active');
            }
        }

        /**
         * 新規チャットモーダルを表示
         */
        showNewChatModal() {
            const modal = document.getElementById('newChatModal');
            if (modal) {
                modal.classList.add('show');
                this.loadUserList();
                
                // 検索フィールドにフォーカス
                setTimeout(() => {
                    const searchInput = document.getElementById('userSearch');
                    if (searchInput) searchInput.focus();
                }, 100);
            }
        }

        /**
         * 新規チャットモーダルを閉じる
         */
        closeNewChatModal() {
            const modal = document.getElementById('newChatModal');
            if (modal) {
                modal.classList.remove('show');
            }
        }

        /**
         * ユーザーリストを読み込む
         */
        async loadUserList() {
            const userList = document.getElementById('userList');
            if (!userList) return;

            userList.innerHTML = '<div class="chat-loading"><i class="fas fa-spinner fa-spin"></i> 読み込み中...</div>';

            try {
                let users = [];

                if (window.messagesSupabaseManager?.useDummyData) {
                    // ダミーデータを使用
                    users = window.messagesSupabaseManager.dummyUsers;
                } else if (window.supabase) {
                    // Supabaseから取得
                    const { data, error } = await window.supabase
                        .from('profiles')
                        .select('*')
                        .neq('id', window.messagesSupabaseManager?.userId);

                    if (error) throw error;
                    users = data;
                }

                this.renderUserList(users);

            } catch (error) {
                console.error('[MessagesUI] ユーザーリスト取得エラー:', error);
                userList.innerHTML = '<div class="chat-error"><i class="fas fa-exclamation-circle"></i> ユーザーの読み込みに失敗しました</div>';
            }
        }

        /**
         * ユーザーリストをレンダリング
         */
        renderUserList(users) {
            const userList = document.getElementById('userList');
            if (!userList) return;

            if (users.length === 0) {
                userList.innerHTML = '<div class="empty-state"><p>ユーザーが見つかりません</p></div>';
                return;
            }

            userList.innerHTML = users.map(user => `
                <div class="user-item" data-user-id="${user.id}">
                    <img src="${user.avatar || 'assets/user-placeholder.svg'}" alt="${user.name}">
                    <div class="user-item-info">
                        <div class="user-item-name">${user.name}</div>
                        <div class="user-item-company">${user.company || ''}</div>
                    </div>
                </div>
            `).join('');

            // クリックイベントを追加
            userList.querySelectorAll('.user-item').forEach(item => {
                item.addEventListener('click', () => this.startNewChat(item.dataset.userId));
            });
        }

        /**
         * ユーザーを検索
         */
        searchUsers(query) {
            const userItems = document.querySelectorAll('.user-item');
            const lowerQuery = query.toLowerCase();

            userItems.forEach(item => {
                const name = item.querySelector('.user-item-name').textContent.toLowerCase();
                const company = item.querySelector('.user-item-company').textContent.toLowerCase();
                
                if (name.includes(lowerQuery) || company.includes(lowerQuery)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        }

        /**
         * 新しいチャットを開始
         */
        async startNewChat(userId) {
            try {
                this.closeNewChatModal();
                
                if (window.messagesSupabaseManager) {
                    await window.messagesSupabaseManager.createChatRoom(userId);
                }
            } catch (error) {
                console.error('[MessagesUI] チャット開始エラー:', error);
                this.showError('チャットの開始に失敗しました');
            }
        }

        /**
         * スクロール動作の設定
         */
        setupScrollBehavior() {
            const messagesArea = document.getElementById('messagesArea');
            if (!messagesArea) return;

            let isScrolledToBottom = true;
            let scrollToBottomBtn = null;

            // スクロール位置の監視
            messagesArea.addEventListener('scroll', () => {
                const { scrollTop, scrollHeight, clientHeight } = messagesArea;
                isScrolledToBottom = scrollHeight - scrollTop - clientHeight < this.scrollThreshold;

                // スクロールボタンの表示/非表示
                if (!isScrolledToBottom && !scrollToBottomBtn) {
                    scrollToBottomBtn = this.createScrollToBottomButton();
                    messagesArea.parentElement.appendChild(scrollToBottomBtn);
                } else if (isScrolledToBottom && scrollToBottomBtn) {
                    scrollToBottomBtn.classList.remove('show');
                    setTimeout(() => {
                        scrollToBottomBtn?.remove();
                        scrollToBottomBtn = null;
                    }, 300);
                }
            });

            // 新しいメッセージが追加されたときの自動スクロール
            const observer = new MutationObserver(() => {
                if (isScrolledToBottom) {
                    messagesArea.scrollTop = messagesArea.scrollHeight;
                }
            });

            observer.observe(messagesArea, {
                childList: true,
                subtree: true
            });
        }

        /**
         * 最下部へスクロールボタンを作成
         */
        createScrollToBottomButton() {
            const button = document.createElement('button');
            button.className = 'scroll-to-bottom';
            button.innerHTML = '<i class="fas fa-chevron-down"></i>';
            button.setAttribute('aria-label', '最下部へスクロール');

            button.addEventListener('click', () => {
                const messagesArea = document.getElementById('messagesArea');
                if (messagesArea) {
                    messagesArea.scrollTo({
                        top: messagesArea.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            });

            setTimeout(() => button.classList.add('show'), 10);

            return button;
        }

        /**
         * ヘッダーアクションの設定
         */
        setupHeaderActions() {
            // 音声通話ボタン（将来実装）
            const phoneBtn = document.querySelector('.chat-header-actions button[aria-label="音声通話"]');
            if (phoneBtn) {
                phoneBtn.addEventListener('click', () => {
                    this.showFeatureNotAvailable('音声通話機能は準備中です');
                });
            }

            // ビデオ通話ボタン（将来実装）
            const videoBtn = document.querySelector('.chat-header-actions button[aria-label="ビデオ通話"]');
            if (videoBtn) {
                videoBtn.addEventListener('click', () => {
                    this.showFeatureNotAvailable('ビデオ通話機能は準備中です');
                });
            }

            // 情報ボタン
            const infoBtn = document.querySelector('.chat-header-actions button[aria-label="情報"]');
            if (infoBtn) {
                infoBtn.addEventListener('click', () => this.showChatInfo());
            }
        }

        /**
         * チャット情報を表示
         */
        showChatInfo() {
            // TODO: チャット情報パネルの実装
            this.showFeatureNotAvailable('チャット情報パネルは準備中です');
        }

        /**
         * 絵文字ピッカーを表示
         */
        showEmojiPicker() {
            // TODO: 絵文字ピッカーの実装
            this.showFeatureNotAvailable('絵文字機能は準備中です');
        }

        /**
         * 機能が利用できないメッセージを表示
         */
        showFeatureNotAvailable(message) {
            this.showToast(message, 'info');
        }

        /**
         * エラーメッセージを表示
         */
        showError(message) {
            this.showToast(message, 'error');
        }

        /**
         * トーストメッセージを表示
         */
        showToast(message, type = 'info') {
            const existingToast = document.querySelector('.toast-message');
            if (existingToast) existingToast.remove();

            const toast = document.createElement('div');
            toast.className = `toast-message ${type}`;
            toast.innerHTML = `
                <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            `;

            document.body.appendChild(toast);

            setTimeout(() => toast.classList.add('show'), 10);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        /**
         * 通知権限をリクエスト
         */
        async requestNotificationPermission() {
            if ('Notification' in window && Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                console.log('[MessagesUI] 通知権限:', permission);
            }
        }

        /**
         * メッセージ要素にコンテキストメニューを追加
         */
        addMessageContextMenu(messageEl) {
            messageEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showMessageContextMenu(e, messageEl);
            });

            // 長押しでもメニューを表示（モバイル対応）
            let longPressTimer;
            messageEl.addEventListener('touchstart', (e) => {
                longPressTimer = setTimeout(() => {
                    e.preventDefault();
                    this.showMessageContextMenu(e.touches[0], messageEl);
                }, 500);
            });

            messageEl.addEventListener('touchend', () => {
                clearTimeout(longPressTimer);
            });
        }

        /**
         * メッセージのコンテキストメニューを表示
         */
        showMessageContextMenu(event, messageEl) {
            // 既存のメニューを削除
            const existingMenu = document.querySelector('.message-context-menu');
            if (existingMenu) existingMenu.remove();

            const menu = document.createElement('div');
            menu.className = 'message-context-menu';
            
            const isOwnMessage = messageEl.classList.contains('sent');
            
            menu.innerHTML = `
                <div class="menu-item" data-action="copy">
                    <i class="fas fa-copy"></i> コピー
                </div>
                ${isOwnMessage ? `
                    <div class="menu-item" data-action="edit">
                        <i class="fas fa-edit"></i> 編集
                    </div>
                    <div class="menu-item" data-action="delete">
                        <i class="fas fa-trash"></i> 削除
                    </div>
                ` : ''}
                <div class="menu-item" data-action="reply">
                    <i class="fas fa-reply"></i> 返信
                </div>
            `;

            // 位置を設定
            menu.style.position = 'fixed';
            menu.style.left = `${event.clientX}px`;
            menu.style.top = `${event.clientY}px`;

            document.body.appendChild(menu);

            // メニューアイテムのクリックイベント
            menu.querySelectorAll('.menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    const action = item.dataset.action;
                    this.handleMessageAction(action, messageEl);
                    menu.remove();
                });
            });

            // メニュー外クリックで閉じる
            setTimeout(() => {
                document.addEventListener('click', function closeMenu() {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                });
            }, 100);
        }

        /**
         * メッセージアクションを処理
         */
        handleMessageAction(action, messageEl) {
            const messageId = messageEl.dataset.messageId;
            const messageText = messageEl.querySelector('.message-bubble p').textContent;

            switch (action) {
                case 'copy':
                    navigator.clipboard.writeText(messageText).then(() => {
                        this.showToast('メッセージをコピーしました', 'success');
                    });
                    break;
                case 'edit':
                    // TODO: メッセージ編集機能の実装
                    this.showFeatureNotAvailable('メッセージ編集機能は準備中です');
                    break;
                case 'delete':
                    // TODO: メッセージ削除機能の実装
                    this.showFeatureNotAvailable('メッセージ削除機能は準備中です');
                    break;
                case 'reply':
                    // TODO: 返信機能の実装
                    this.showFeatureNotAvailable('返信機能は準備中です');
                    break;
            }
        }
    }

    // スタイルを追加
    const style = document.createElement('style');
    style.textContent = `
        /* トーストメッセージ */
        .toast-message {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
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
            max-width: 400px;
        }

        .toast-message.show {
            opacity: 1;
            transform: translateY(0);
        }

        .toast-message.info {
            background: #2196F3;
            color: white;
        }

        .toast-message.error {
            background: #f44336;
            color: white;
        }

        .toast-message.success {
            background: #4CAF50;
            color: white;
        }

        /* コンテキストメニュー */
        .message-context-menu {
            background: white;
            border-radius: var(--radius-md);
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            padding: var(--space-xs);
            z-index: 1000;
            min-width: 150px;
        }

        .message-context-menu .menu-item {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-sm) var(--space-md);
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: background 0.2s ease;
        }

        .message-context-menu .menu-item:hover {
            background: var(--bg-secondary);
        }

        .message-context-menu .menu-item i {
            width: 16px;
            text-align: center;
            color: var(--text-secondary);
        }

        @media (max-width: 768px) {
            .toast-message {
                right: 10px;
                left: 10px;
                max-width: none;
            }
        }
    `;
    document.head.appendChild(style);

    // グローバル関数
    window.closeNewChatModal = function() {
        const modal = document.getElementById('newChatModal');
        if (modal) {
            modal.classList.remove('show');
        }
    };

    // 初期化
    window.messagesUIManager = new MessagesUIManager();

})();