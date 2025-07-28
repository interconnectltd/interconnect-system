/**
 * Messages Input Handler
 * メッセージ入力処理
 */

(function() {
    'use strict';

    console.log('[MessagesInput] 初期化開始...');

    class MessagesInputHandler {
        constructor() {
            this.messageInput = document.getElementById('messageInput');
            this.sendBtn = document.getElementById('sendBtn');
            this.isComposing = false;
            this.lastTypingTime = 0;
            this.typingInterval = null;
            
            this.init();
        }

        init() {
            if (!this.messageInput || !this.sendBtn) {
                console.error('[MessagesInput] 必要な要素が見つかりません');
                return;
            }

            this.setupEventListeners();
            this.setupAutoResize();
        }

        /**
         * イベントリスナーを設定
         */
        setupEventListeners() {
            // テキスト入力
            this.messageInput.addEventListener('input', () => {
                this.handleInput();
            });

            // キーボードイベント
            this.messageInput.addEventListener('keydown', (e) => {
                this.handleKeyDown(e);
            });

            // IME（日本語入力）の対応
            this.messageInput.addEventListener('compositionstart', () => {
                this.isComposing = true;
            });

            this.messageInput.addEventListener('compositionend', () => {
                this.isComposing = false;
            });

            // 送信ボタン
            this.sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });

            // ペースト処理
            this.messageInput.addEventListener('paste', (e) => {
                this.handlePaste(e);
            });
        }

        /**
         * 入力処理
         */
        handleInput() {
            // 送信ボタンの有効/無効を切り替え
            const hasContent = this.messageInput.value.trim().length > 0;
            this.sendBtn.disabled = !hasContent;

            // タイピングインジケーターを送信
            this.sendTypingIndicator();

            // 自動リサイズ
            this.autoResize();
        }

        /**
         * キーボード入力処理
         */
        handleKeyDown(e) {
            // Enter キーで送信（Shift + Enter は改行）
            if (e.key === 'Enter' && !e.shiftKey && !this.isComposing) {
                e.preventDefault();
                this.sendMessage();
            }
        }

        /**
         * メッセージ送信
         */
        async sendMessage() {
            const content = this.messageInput.value.trim();
            if (!content) return;

            // 現在のチャットルームを確認
            if (!window.messagesSupabaseManager?.currentRoomId) {
                window.messagesUIManager?.showError('チャットルームが選択されていません');
                return;
            }

            // 送信ボタンを無効化
            this.sendBtn.disabled = true;
            const originalContent = this.messageInput.value;

            try {
                // 入力欄をクリア
                this.messageInput.value = '';
                this.autoResize();

                // メッセージを送信
                await window.messagesSupabaseManager.sendMessage(content);

                // タイピング停止を送信
                this.stopTypingIndicator();

            } catch (error) {
                console.error('[MessagesInput] 送信エラー:', error);
                
                // エラー時は入力内容を復元
                this.messageInput.value = originalContent;
                this.autoResize();
                
                window.messagesUIManager?.showError('メッセージの送信に失敗しました');
            } finally {
                // 送信ボタンを再度有効化
                this.sendBtn.disabled = this.messageInput.value.trim().length === 0;
            }
        }

        /**
         * ペースト処理
         */
        async handlePaste(e) {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let item of items) {
                // 画像の場合
                if (item.type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                        await this.handleImagePaste(file);
                    }
                }
            }
        }

        /**
         * 画像ペースト処理
         */
        async handleImagePaste(file) {
            // ファイルアップロードマネージャーに処理を委託
            if (window.messagesFileUploadManager) {
                await window.messagesFileUploadManager.uploadFile(file);
            } else {
                window.messagesUIManager?.showError('画像のアップロード機能は準備中です');
            }
        }

        /**
         * 自動リサイズの設定
         */
        setupAutoResize() {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.overflowY = 'hidden';
            this.autoResize();
        }

        /**
         * テキストエリアの高さを自動調整
         */
        autoResize() {
            this.messageInput.style.height = 'auto';
            const newHeight = Math.min(this.messageInput.scrollHeight, 120);
            this.messageInput.style.height = newHeight + 'px';
            
            // スクロールが必要な場合は表示
            if (this.messageInput.scrollHeight > 120) {
                this.messageInput.style.overflowY = 'auto';
            } else {
                this.messageInput.style.overflowY = 'hidden';
            }
        }

        /**
         * タイピングインジケーターを送信
         */
        sendTypingIndicator() {
            const now = Date.now();
            
            // 前回の送信から1秒以上経過している場合のみ送信
            if (now - this.lastTypingTime > 1000) {
                this.lastTypingTime = now;
                
                if (window.messagesRealtimeManager && window.messagesSupabaseManager?.currentRoomId) {
                    window.messagesRealtimeManager.sendTypingIndicator(
                        window.messagesSupabaseManager.currentRoomId
                    );
                }
            }
        }

        /**
         * タイピング停止を送信
         */
        stopTypingIndicator() {
            if (window.messagesRealtimeManager && window.messagesSupabaseManager?.currentRoomId) {
                window.messagesRealtimeManager.sendTypingStop(
                    window.messagesSupabaseManager.currentRoomId
                );
            }
        }

        /**
         * メッセージ入力のショートカット
         */
        setupShortcuts() {
            // Ctrl/Cmd + B で太字
            // Ctrl/Cmd + I で斜体
            // Ctrl/Cmd + U で下線
            // これらは将来的にリッチテキストエディタを実装する際に使用
        }

        /**
         * 入力内容を検証
         */
        validateMessage(content) {
            // 空白のみの場合
            if (!content.trim()) {
                return false;
            }

            // 最大文字数チェック
            if (content.length > 1000) {
                window.messagesUIManager?.showError('メッセージは1000文字以内で入力してください');
                return false;
            }

            return true;
        }

        /**
         * メッセージのフォーマット
         */
        formatMessage(content) {
            // URLの自動リンク化
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            content = content.replace(urlRegex, (url) => {
                return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
            });

            // 改行をbrタグに変換
            content = content.replace(/\n/g, '<br>');

            return content;
        }

        /**
         * 定型文の挿入
         */
        insertTemplate(template) {
            const start = this.messageInput.selectionStart;
            const end = this.messageInput.selectionEnd;
            const text = this.messageInput.value;

            this.messageInput.value = text.substring(0, start) + template + text.substring(end);
            
            // カーソル位置を調整
            const newPosition = start + template.length;
            this.messageInput.setSelectionRange(newPosition, newPosition);
            
            // イベントを発火
            this.messageInput.dispatchEvent(new Event('input'));
            this.messageInput.focus();
        }

        /**
         * メンション機能（将来実装）
         */
        setupMentions() {
            // @を入力した時にユーザーリストを表示
            // ユーザーを選択すると@usernameが挿入される
        }

        /**
         * コマンド機能（将来実装）
         */
        setupCommands() {
            // /を入力した時にコマンドリストを表示
            // 例: /gif, /file, /code など
        }
    }

    // 初期化
    window.messagesInputHandler = new MessagesInputHandler();

})();