/**
 * Messages Typing Indicator
 * タイピングインジケーター管理
 */

(function() {
    'use strict';

    console.log('[MessagesTyping] 初期化開始...');

    class MessagesTypingManager {
        constructor() {
            this.typingUsers = new Map(); // ユーザーID -> タイムアウトID
            this.typingElement = document.getElementById('typingIndicator');
            this.typingTimeout = 10000; // 10秒でタイムアウト
            this.init();
        }

        init() {
            if (!this.typingElement) {
                console.warn('[MessagesTyping] タイピングインジケーター要素が見つかりません');
                return;
            }

            // 初期状態は非表示
            this.hideTypingIndicator();
        }

        /**
         * タイピング中のユーザーを追加
         */
        addTypingUser(userId) {
            // 既存のタイムアウトをクリア
            if (this.typingUsers.has(userId)) {
                clearTimeout(this.typingUsers.get(userId));
            }

            // 新しいタイムアウトを設定
            const timeoutId = setTimeout(() => {
                this.removeTypingUser(userId);
            }, this.typingTimeout);

            this.typingUsers.set(userId, timeoutId);
            this.updateTypingDisplay();
        }

        /**
         * タイピングを停止したユーザーを削除
         */
        removeTypingUser(userId) {
            if (this.typingUsers.has(userId)) {
                clearTimeout(this.typingUsers.get(userId));
                this.typingUsers.delete(userId);
                this.updateTypingDisplay();
            }
        }

        /**
         * タイピング表示を更新
         */
        updateTypingDisplay() {
            if (this.typingUsers.size === 0) {
                this.hideTypingIndicator();
                return;
            }

            // タイピング中のユーザー情報を取得
            const typingUserIds = Array.from(this.typingUsers.keys());
            const typingUserInfo = this.getTypingUsersInfo(typingUserIds);

            if (typingUserInfo.length > 0) {
                this.showTypingIndicator(typingUserInfo);
            }
        }

        /**
         * タイピング中のユーザー情報を取得
         */
        getTypingUsersInfo(userIds) {
            const users = [];
            
            for (const userId of userIds) {
                if (window.messagesSupabaseManager) {
                    const userInfo = window.messagesSupabaseManager.getUserInfo(userId);
                    if (userInfo) {
                        users.push(userInfo);
                    }
                }
            }

            return users;
        }

        /**
         * タイピングインジケーターを表示
         */
        showTypingIndicator(users) {
            if (!this.typingElement) return;

            // 最初のユーザーのアバターを表示
            const avatarEl = this.typingElement.querySelector('.message-avatar');
            if (avatarEl && users[0]) {
                avatarEl.src = users[0].avatar;
                avatarEl.alt = users[0].name;
            }

            // テキストを更新
            let typingText = '';
            if (users.length === 1) {
                typingText = `${users[0].name}が入力中...`;
            } else if (users.length === 2) {
                typingText = `${users[0].name}と${users[1].name}が入力中...`;
            } else {
                typingText = `${users[0].name}他${users.length - 1}名が入力中...`;
            }

            // カスタムテキストを追加（オプション）
            this.addTypingText(typingText);

            // 表示
            this.typingElement.style.display = 'flex';
            
            // アニメーション
            this.typingElement.style.opacity = '0';
            this.typingElement.style.transform = 'translateY(10px)';
            
            requestAnimationFrame(() => {
                this.typingElement.style.transition = 'all 0.3s ease';
                this.typingElement.style.opacity = '1';
                this.typingElement.style.transform = 'translateY(0)';
            });

            // メッセージエリアの最下部にスクロール
            this.scrollToBottom();
        }

        /**
         * タイピングインジケーターを非表示
         */
        hideTypingIndicator() {
            if (!this.typingElement) return;

            this.typingElement.style.transition = 'all 0.3s ease';
            this.typingElement.style.opacity = '0';
            this.typingElement.style.transform = 'translateY(10px)';

            setTimeout(() => {
                this.typingElement.style.display = 'none';
                this.removeTypingText();
            }, 300);
        }

        /**
         * タイピングテキストを追加
         */
        addTypingText(text) {
            // 既存のテキスト要素を削除
            this.removeTypingText();

            // 新しいテキスト要素を作成
            const textEl = document.createElement('div');
            textEl.className = 'typing-text';
            textEl.textContent = text;
            
            // スタイルを設定
            textEl.style.fontSize = '0.875rem';
            textEl.style.color = 'var(--text-secondary)';
            textEl.style.marginLeft = '0.5rem';
            
            // typing-dotsの後に追加
            const dotsEl = this.typingElement.querySelector('.typing-dots');
            if (dotsEl && dotsEl.parentNode) {
                dotsEl.parentNode.insertBefore(textEl, dotsEl.nextSibling);
            }
        }

        /**
         * タイピングテキストを削除
         */
        removeTypingText() {
            const textEl = this.typingElement?.querySelector('.typing-text');
            if (textEl) {
                textEl.remove();
            }
        }

        /**
         * メッセージエリアの最下部にスクロール
         */
        scrollToBottom() {
            const messagesArea = document.getElementById('messagesArea');
            if (messagesArea) {
                // 現在のスクロール位置を確認
                const { scrollTop, scrollHeight, clientHeight } = messagesArea;
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

                // 最下部付近にいる場合のみスクロール
                if (isNearBottom) {
                    messagesArea.scrollTo({
                        top: messagesArea.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }
        }

        /**
         * すべてのタイピング状態をクリア
         */
        clearAllTyping() {
            this.typingUsers.forEach((timeoutId) => {
                clearTimeout(timeoutId);
            });
            this.typingUsers.clear();
            this.hideTypingIndicator();
        }

        /**
         * 現在のチャットルームのタイピング状態をクリア
         */
        clearRoomTyping() {
            this.clearAllTyping();
        }

        /**
         * タイピングアニメーションを強化
         */
        enhanceTypingAnimation() {
            const dots = this.typingElement?.querySelectorAll('.typing-dots span');
            if (!dots || dots.length === 0) return;

            // より滑らかなアニメーション
            dots.forEach((dot, index) => {
                dot.style.animationDelay = `${index * 0.15}s`;
                dot.style.animationDuration = '1.4s';
            });
        }
    }

    // 初期化
    window.messagesTypingManager = new MessagesTypingManager();

    // ページ離脱時のクリーンアップ
    window.addEventListener('beforeunload', () => {
        if (window.messagesTypingManager) {
            window.messagesTypingManager.clearAllTyping();
        }
    });

})();