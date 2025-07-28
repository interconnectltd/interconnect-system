/**
 * Messages Notification Manager
 * メッセージ通知管理
 */

(function() {
    'use strict';

    console.log('[MessagesNotification] 初期化開始...');

    class MessagesNotificationManager {
        constructor() {
            this.notificationPermission = Notification.permission;
            this.soundEnabled = true;
            this.desktopEnabled = true;
            this.unreadCount = 0;
            this.originalTitle = document.title;
            this.titleInterval = null;
            
            this.init();
        }

        async init() {
            // 通知権限の確認
            await this.checkPermission();
            
            // 設定の読み込み
            this.loadSettings();
            
            // ページ可視性の監視
            this.setupVisibilityListener();
            
            // 通知音の準備
            this.prepareNotificationSound();
        }

        /**
         * 通知権限を確認
         */
        async checkPermission() {
            if (!('Notification' in window)) {
                console.warn('[MessagesNotification] このブラウザは通知をサポートしていません');
                this.desktopEnabled = false;
                return;
            }

            if (this.notificationPermission === 'default') {
                // 権限をリクエスト
                const permission = await Notification.requestPermission();
                this.notificationPermission = permission;
            }

            this.desktopEnabled = this.notificationPermission === 'granted';
        }

        /**
         * 設定を読み込む
         */
        loadSettings() {
            try {
                const settings = localStorage.getItem('messageNotificationSettings');
                if (settings) {
                    const parsed = JSON.parse(settings);
                    this.soundEnabled = parsed.soundEnabled ?? true;
                    this.desktopEnabled = parsed.desktopEnabled ?? true;
                }
            } catch (error) {
                console.error('[MessagesNotification] 設定の読み込みエラー:', error);
            }
        }

        /**
         * 設定を保存
         */
        saveSettings() {
            try {
                const settings = {
                    soundEnabled: this.soundEnabled,
                    desktopEnabled: this.desktopEnabled
                };
                localStorage.setItem('messageNotificationSettings', JSON.stringify(settings));
            } catch (error) {
                console.error('[MessagesNotification] 設定の保存エラー:', error);
            }
        }

        /**
         * ページ可視性の監視
         */
        setupVisibilityListener() {
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    // ページが表示されたらタイトルをリセット
                    this.resetTitle();
                }
            });

            // ウィンドウフォーカスの監視
            window.addEventListener('focus', () => {
                this.resetTitle();
                this.unreadCount = 0;
            });
        }

        /**
         * 通知音の準備
         */
        prepareNotificationSound() {
            // 通知音のオーディオ要素を作成
            this.notificationSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmHAg8k9n1unEiBC13yO/eizEIHWq+8+OWT');
            this.notificationSound.volume = 0.5;
        }

        /**
         * 新着メッセージの通知
         */
        async notifyNewMessage(message, sender) {
            // ページが表示されている場合は通知しない
            if (!document.hidden && document.hasFocus()) {
                return;
            }

            // 未読数を増やす
            this.unreadCount++;
            this.updateTitle();

            // 通知音を再生
            if (this.soundEnabled) {
                this.playNotificationSound();
            }

            // デスクトップ通知を表示
            if (this.desktopEnabled && this.notificationPermission === 'granted') {
                this.showDesktopNotification(message, sender);
            }
        }

        /**
         * 通知音を再生
         */
        playNotificationSound() {
            try {
                this.notificationSound.currentTime = 0;
                this.notificationSound.play().catch(error => {
                    console.log('[MessagesNotification] 通知音の再生に失敗:', error);
                });
            } catch (error) {
                console.error('[MessagesNotification] 通知音エラー:', error);
            }
        }

        /**
         * デスクトップ通知を表示
         */
        showDesktopNotification(message, sender) {
            const notification = new Notification(sender.name, {
                body: message.content,
                icon: sender.avatar || 'assets/user-placeholder.svg',
                tag: `message-${message.id}`,
                requireInteraction: false,
                silent: !this.soundEnabled
            });

            // クリック時の処理
            notification.onclick = () => {
                window.focus();
                
                // 該当のチャットルームを開く
                if (window.messagesSupabaseManager) {
                    window.messagesSupabaseManager.selectChatRoom(message.room_id);
                }
                
                notification.close();
            };

            // 自動で閉じる
            setTimeout(() => {
                notification.close();
            }, 5000);
        }

        /**
         * タイトルを更新
         */
        updateTitle() {
            if (this.unreadCount > 0) {
                // タイトルを点滅させる
                if (!this.titleInterval) {
                    let showCount = true;
                    this.titleInterval = setInterval(() => {
                        if (showCount) {
                            document.title = `(${this.unreadCount}) ${this.originalTitle}`;
                        } else {
                            document.title = this.originalTitle;
                        }
                        showCount = !showCount;
                    }, 1000);
                }
            } else {
                this.resetTitle();
            }
        }

        /**
         * タイトルをリセット
         */
        resetTitle() {
            if (this.titleInterval) {
                clearInterval(this.titleInterval);
                this.titleInterval = null;
            }
            document.title = this.originalTitle;
        }

        /**
         * 通知設定を切り替え
         */
        toggleSoundNotification() {
            this.soundEnabled = !this.soundEnabled;
            this.saveSettings();
            return this.soundEnabled;
        }

        /**
         * デスクトップ通知を切り替え
         */
        async toggleDesktopNotification() {
            if (!('Notification' in window)) {
                window.messagesUIManager?.showError('このブラウザは通知をサポートしていません');
                return false;
            }

            if (this.notificationPermission === 'denied') {
                window.messagesUIManager?.showError('通知がブロックされています。ブラウザの設定から許可してください。');
                return false;
            }

            if (this.notificationPermission === 'default') {
                await this.checkPermission();
            }

            this.desktopEnabled = !this.desktopEnabled;
            this.saveSettings();
            return this.desktopEnabled;
        }

        /**
         * バッジを更新（チャットリストの未読数）
         */
        updateChatBadge(roomId, count) {
            const chatItem = document.querySelector(`[data-room-id="${roomId}"]`);
            if (!chatItem) return;

            let badge = chatItem.querySelector('.unread-count');
            
            if (count > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'unread-count';
                    chatItem.querySelector('.chat-meta').appendChild(badge);
                }
                badge.textContent = count > 99 ? '99+' : count;
            } else if (badge) {
                badge.remove();
            }
        }

        /**
         * 総未読数を更新
         */
        updateTotalUnreadCount() {
            let totalUnread = 0;
            
            document.querySelectorAll('.unread-count').forEach(badge => {
                const count = parseInt(badge.textContent) || 0;
                totalUnread += count;
            });

            // サイドバーのバッジを更新
            const sidebarBadge = document.querySelector('.sidebar-link.active .badge');
            if (sidebarBadge) {
                if (totalUnread > 0) {
                    sidebarBadge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                    sidebarBadge.style.display = '';
                } else {
                    sidebarBadge.style.display = 'none';
                }
            }

            // モバイルナビゲーションのバッジも更新
            const mobileBadge = document.querySelector('.mobile-nav-link.active .badge');
            if (mobileBadge) {
                if (totalUnread > 0) {
                    mobileBadge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                    mobileBadge.style.display = '';
                } else {
                    mobileBadge.style.display = 'none';
                }
            }

            return totalUnread;
        }

        /**
         * 通知をテスト
         */
        testNotification() {
            const testMessage = {
                id: 'test-' + Date.now(),
                content: 'これはテスト通知です',
                room_id: 'test-room'
            };

            const testSender = {
                name: 'システム',
                avatar: 'assets/user-placeholder.svg'
            };

            this.notifyNewMessage(testMessage, testSender);
        }

        /**
         * 通知設定パネルを表示
         */
        showNotificationSettings() {
            const modal = document.createElement('div');
            modal.className = 'notification-settings-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>通知設定</h3>
                        <button class="btn-icon" onclick="this.closest('.notification-settings-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="setting-item">
                            <label class="toggle-switch">
                                <input type="checkbox" id="soundToggle" ${this.soundEnabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                            <div class="setting-info">
                                <div class="setting-label">通知音</div>
                                <div class="setting-desc">新着メッセージ時に音を鳴らす</div>
                            </div>
                        </div>
                        <div class="setting-item">
                            <label class="toggle-switch">
                                <input type="checkbox" id="desktopToggle" ${this.desktopEnabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                            <div class="setting-info">
                                <div class="setting-label">デスクトップ通知</div>
                                <div class="setting-desc">デスクトップに通知を表示</div>
                            </div>
                        </div>
                        <button class="btn btn-outline" onclick="window.messagesNotificationManager.testNotification()">
                            <i class="fas fa-bell"></i> 通知をテスト
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // イベントリスナーを設定
            modal.querySelector('#soundToggle').addEventListener('change', (e) => {
                this.soundEnabled = e.target.checked;
                this.saveSettings();
            });

            modal.querySelector('#desktopToggle').addEventListener('change', async (e) => {
                const enabled = await this.toggleDesktopNotification();
                e.target.checked = enabled;
            });

            // モーダル外クリックで閉じる
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }
    }

    // スタイルを追加
    const style = document.createElement('style');
    style.textContent = `
        /* 通知設定モーダル */
        .notification-settings-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }

        .notification-settings-modal .modal-content {
            background: white;
            border-radius: var(--radius-lg);
            max-width: 400px;
            width: 90%;
        }

        .notification-settings-modal .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--space-lg);
            border-bottom: 1px solid var(--border-color);
        }

        .notification-settings-modal .modal-body {
            padding: var(--space-lg);
        }

        .setting-item {
            display: flex;
            align-items: center;
            gap: var(--space-md);
            margin-bottom: var(--space-lg);
        }

        .setting-info {
            flex: 1;
        }

        .setting-label {
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: var(--space-xs);
        }

        .setting-desc {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        /* トグルスイッチ */
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 34px;
        }

        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }

        .toggle-switch input:checked + .toggle-slider {
            background-color: var(--primary-color);
        }

        .toggle-switch input:checked + .toggle-slider:before {
            transform: translateX(20px);
        }
    `;
    document.head.appendChild(style);

    // 初期化
    window.messagesNotificationManager = new MessagesNotificationManager();

})();