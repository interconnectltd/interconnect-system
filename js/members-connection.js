/**
 * Members Connection Management
 * メンバーコネクション管理
 */

(function() {
    'use strict';

    console.log('[MembersConnection] 初期化開始...');

    class MembersConnectionManager {
        constructor() {
            this.currentUserId = null;
            this.connections = new Map();
            this.pendingRequests = new Set();
            this.init();
        }

        async init() {
            try {
                // 認証状態を確認
                if (window.supabase) {
                    const { data: { user } } = await window.supabase.auth.getUser();
                    if (user) {
                        this.currentUserId = user.id;
                        await this.loadConnections();
                        this.setupEventListeners();
                        this.setupRealtimeSubscription();
                    }
                }
            } catch (error) {
                console.error('[MembersConnection] 初期化エラー:', error);
            }
        }

        /**
         * 既存のコネクションを読み込む
         */
        async loadConnections() {
            if (!window.supabase) return;

            try {
                // 承認済みコネクション
                const { data: accepted } = await window.supabase
                    .from('connections')
                    .select('*')
                    .or(`user_id.eq.${this.currentUserId},connected_id.eq.${this.currentUserId}`)
                    .eq('status', 'accepted');

                // ペンディングリクエスト
                const { data: pending } = await window.supabase
                    .from('connections')
                    .select('*')
                    .or(`user_id.eq.${this.currentUserId},connected_id.eq.${this.currentUserId}`)
                    .eq('status', 'pending');

                // コネクション情報を整理
                accepted?.forEach(conn => {
                    const connectedId = conn.user_id === this.currentUserId ? 
                        conn.connected_id : conn.user_id;
                    this.connections.set(connectedId, 'connected');
                });

                pending?.forEach(conn => {
                    const connectedId = conn.user_id === this.currentUserId ? 
                        conn.connected_id : conn.user_id;
                    const status = conn.user_id === this.currentUserId ? 
                        'pending_sent' : 'pending_received';
                    this.connections.set(connectedId, status);
                    
                    if (status === 'pending_sent') {
                        this.pendingRequests.add(connectedId);
                    }
                });

                // UIを更新
                this.updateAllConnectionButtons();

            } catch (error) {
                console.error('[MembersConnection] コネクション読み込みエラー:', error);
            }
        }

        /**
         * イベントリスナーを設定
         */
        setupEventListeners() {
            // コネクトボタンのクリックイベント
            document.addEventListener('click', async (e) => {
                const connectBtn = e.target.closest('.connect-btn');
                if (connectBtn) {
                    e.preventDefault();
                    const memberId = connectBtn.dataset.memberId;
                    const memberName = connectBtn.dataset.memberName;
                    await this.handleConnectClick(memberId, memberName, connectBtn);
                }
            });
        }

        /**
         * コネクトボタンクリックを処理
         */
        async handleConnectClick(memberId, memberName, button) {
            if (!this.currentUserId || !window.supabase) {
                this.showLoginPrompt();
                return;
            }

            // 既にコネクト済みまたはペンディングの場合
            const status = this.connections.get(memberId);
            if (status === 'connected') {
                this.showMessage('既にコネクトしています', 'info');
                return;
            }
            if (status === 'pending_sent') {
                this.showMessage('既に申請を送信済みです', 'info');
                return;
            }
            if (status === 'pending_received') {
                // 受信した申請を承認
                await this.acceptConnection(memberId, memberName);
                return;
            }

            // 新規コネクト申請
            await this.sendConnectionRequest(memberId, memberName, button);
        }

        /**
         * コネクト申請を送信
         */
        async sendConnectionRequest(memberId, memberName, button) {
            try {
                // ボタンを無効化
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 送信中...';

                // 重複チェック
                const { data: existing } = await window.supabase
                    .from('connections')
                    .select('id, status')
                    .or(`and(user_id.eq.${this.currentUserId},connected_id.eq.${memberId}),and(user_id.eq.${memberId},connected_id.eq.${this.currentUserId})`)
                    .single();

                if (existing) {
                    throw new Error('既にコネクション申請済みです');
                }

                // コネクションレコードを作成
                const { data, error } = await window.supabase
                    .from('connections')
                    .insert({
                        user_id: this.currentUserId,
                        connected_id: memberId,
                        status: 'pending',
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (error) {
                    // Supabaseエラーの詳細を解析
                    if (error.code === '23505') { // 重複エラー
                        throw new Error('既にコネクション申請済みです');
                    } else if (error.code === '23503') { // 外部キー制約エラー
                        throw new Error('ユーザーが見つかりません');
                    }
                    throw error;
                }

                // 通知を作成
                await this.createNotification(memberId, memberName, 'connection_request');

                // 状態を更新
                this.connections.set(memberId, 'pending_sent');
                this.pendingRequests.add(memberId);

                // UIを更新
                this.updateConnectionButton(memberId, 'pending_sent');
                this.showMessage(`${memberName}さんにコネクト申請を送信しました`, 'success');

            } catch (error) {
                console.error('[MembersConnection] 申請送信エラー:', error);
                this.showMessage('申請の送信に失敗しました', 'error');
                
                // ボタンを元に戻す
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-plus"></i> <span class="btn-text">コネクト</span>';
            }
        }

        /**
         * コネクション申請を承認
         */
        async acceptConnection(memberId, memberName) {
            try {
                // コネクションステータスを更新
                const { error } = await window.supabase
                    .from('connections')
                    .update({ status: 'accepted' })
                    .or(`user_id.eq.${memberId},connected_id.eq.${memberId}`)
                    .or(`user_id.eq.${this.currentUserId},connected_id.eq.${this.currentUserId}`);

                if (error) throw error;

                // 通知を作成
                await this.createNotification(memberId, memberName, 'connection_accepted');

                // 状態を更新
                this.connections.set(memberId, 'connected');
                this.updateConnectionButton(memberId, 'connected');
                
                this.showMessage(`${memberName}さんとコネクトしました`, 'success');

            } catch (error) {
                console.error('[MembersConnection] 承認エラー:', error);
                this.showMessage('承認に失敗しました', 'error');
            }
        }

        /**
         * 通知を作成
         */
        async createNotification(recipientId, memberName, type) {
            if (!window.supabase) return;

            try {
                const messages = {
                    connection_request: `${memberName}さんからコネクト申請が届きました`,
                    connection_accepted: `${memberName}さんがコネクト申請を承認しました`
                };

                await window.supabase
                    .from('notifications')
                    .insert({
                        user_id: recipientId,
                        type: type,
                        title: type === 'connection_request' ? 'コネクト申請' : 'コネクト承認',
                        message: messages[type],
                        related_id: this.currentUserId,
                        is_read: false,
                        created_at: new Date().toISOString()
                    });

            } catch (error) {
                console.error('[MembersConnection] 通知作成エラー:', error);
            }
        }

        /**
         * コネクションボタンを更新
         */
        updateConnectionButton(memberId, status) {
            const button = document.querySelector(`.connect-btn[data-member-id="${memberId}"]`);
            if (!button) return;

            switch (status) {
                case 'connected':
                    button.disabled = true;
                    button.className = 'btn btn-success btn-small';
                    button.innerHTML = '<i class="fas fa-check"></i> <span class="btn-text">コネクト済み</span>';
                    break;
                    
                case 'pending_sent':
                    button.disabled = true;
                    button.className = 'btn btn-secondary btn-small';
                    button.innerHTML = '<i class="fas fa-clock"></i> <span class="btn-text">申請中</span>';
                    break;
                    
                case 'pending_received':
                    button.disabled = false;
                    button.className = 'btn btn-primary btn-small';
                    button.innerHTML = '<i class="fas fa-user-plus"></i> <span class="btn-text">承認する</span>';
                    break;
                    
                default:
                    button.disabled = false;
                    button.className = 'btn btn-outline btn-small connect-btn';
                    button.innerHTML = '<i class="fas fa-plus"></i> <span class="btn-text">コネクト</span>';
            }
        }

        /**
         * 全てのコネクションボタンを更新
         */
        updateAllConnectionButtons() {
            this.connections.forEach((status, memberId) => {
                this.updateConnectionButton(memberId, status);
            });
        }

        /**
         * リアルタイム購読を設定
         */
        setupRealtimeSubscription() {
            if (!window.supabase) return;

            // コネクションの変更を監視
            this.connectionsSubscription = window.supabase
                .channel('connections_changes')
                .on('postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'connections',
                        filter: `user_id=eq.${this.currentUserId}`
                    },
                    (payload) => this.handleConnectionChange(payload)
                )
                .on('postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'connections',
                        filter: `connected_id=eq.${this.currentUserId}`
                    },
                    (payload) => this.handleConnectionChange(payload)
                )
                .subscribe();
        }

        /**
         * コネクション変更を処理
         */
        handleConnectionChange(payload) {
            console.log('[MembersConnection] コネクション変更:', payload);
            
            // コネクション情報を再読み込み
            this.loadConnections();
        }

        /**
         * メッセージを表示
         */
        showMessage(message, type = 'info') {
            // トーストメッセージを作成
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check-circle' : 
                                  type === 'error' ? 'exclamation-circle' : 
                                  'info-circle'}"></i>
                ${message}
            `;
            
            document.body.appendChild(toast);
            
            // アニメーション
            setTimeout(() => toast.classList.add('show'), 10);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        /**
         * ログインプロンプトを表示
         */
        showLoginPrompt() {
            this.showMessage('コネクトするにはログインが必要です', 'info');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        }

        /**
         * クリーンアップ
         */
        cleanup() {
            if (this.connectionsSubscription) {
                window.supabase.removeChannel(this.connectionsSubscription);
            }
        }
    }

    // スタイルを追加
    const style = document.createElement('style');
    style.textContent = `
        /* トーストメッセージ */
        .toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s ease;
            z-index: 10000;
            max-width: 350px;
        }

        .toast.show {
            opacity: 1;
            transform: translateY(0);
        }

        .toast i {
            font-size: 1.25rem;
        }

        .toast-success {
            border-left: 4px solid var(--success-color);
        }

        .toast-success i {
            color: var(--success-color);
        }

        .toast-error {
            border-left: 4px solid var(--danger-color);
        }

        .toast-error i {
            color: var(--danger-color);
        }

        .toast-info {
            border-left: 4px solid var(--primary-color);
        }

        .toast-info i {
            color: var(--primary-color);
        }

        /* ボタンスタイル */
        .btn-success {
            background: var(--success-color) !important;
            border-color: var(--success-color) !important;
            color: white !important;
            cursor: default !important;
        }

        .btn-secondary {
            background: var(--text-secondary) !important;
            border-color: var(--text-secondary) !important;
            color: white !important;
            cursor: default !important;
        }

        /* モバイル対応 */
        @media (max-width: 768px) {
            .toast {
                right: 10px;
                left: 10px;
                max-width: none;
            }
        }
    `;
    document.head.appendChild(style);

    // グローバルインスタンス
    window.membersConnection = new MembersConnectionManager();

    // ページ離脱時のクリーンアップ
    window.addEventListener('beforeunload', () => {
        if (window.membersConnection) {
            window.membersConnection.cleanup();
        }
    });

    console.log('[MembersConnection] 初期化完了');
})();