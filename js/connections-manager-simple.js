/**
 * コネクション管理システム - シンプル版
 * 外部キー参照を使わずに実装
 */

(function() {
    'use strict';

    class ConnectionsManager {
        constructor() {
            this.currentUserId = null;
            this.connections = {
                received: [],
                sent: [],
                connected: [],
                rejected: []
            };
            this.itemsPerPage = 20;
            this.currentPage = {
                received: 1,
                sent: 1,
                connected: 1,
                rejected: 1
            };
            this.init();
        }
        
        // HTMLエスケープ処理（XSS対策）
        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        async init() {
            try {
                // Supabase初期化を待つ
                await window.waitForSupabase();
                
                // 現在のユーザーを取得
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                if (!user) {
                    window.location.href = 'login.html';
                    return;
                }
                
                this.currentUserId = user.id;
                
                // UIの初期化
                this.setupEventListeners();
                
                // データの読み込み（シンプル版）
                await this.loadAllConnectionsSimple();
                
                // リアルタイム更新の設定
                this.setupRealtimeSubscription();
                
            } catch (error) {
                console.error('[ConnectionsManager Simple] 初期化エラー:', error);
            }
        }

        setupEventListeners() {
            // タブ切り替え
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.switchTab(e.target.dataset.tab);
                });
            });
            
            // 検索機能
            const searchInput = document.getElementById('connectionSearch');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filterConnections(e.target.value);
                });
            }
            
            // ソート機能
            const sortSelect = document.getElementById('sortBy');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    this.sortConnections(e.target.value);
                });
            }
            
            // アクションボタンのイベント委譲（CSRF対策）
            document.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-action]');
                if (!btn) return;
                
                const action = btn.dataset.action;
                switch(action) {
                    case 'accept':
                        this.acceptConnection(btn.dataset.connectionId, btn.dataset.userId, btn.dataset.userName);
                        break;
                    case 'reject':
                        this.rejectConnection(btn.dataset.connectionId, btn.dataset.userId, btn.dataset.userName);
                        break;
                    case 'cancel':
                        this.cancelConnection(btn.dataset.connectionId);
                        break;
                    case 'view-profile':
                        // プロフィールモーダルを表示
                        this.showProfileModal(btn.dataset.userId);
                        break;
                    case 'message':
                        window.location.href = `messages.html?to=${btn.dataset.userId}`;
                        break;
                    case 'remove':
                        this.removeConnection(btn.dataset.connectionId, btn.dataset.userId, btn.dataset.userName);
                        break;
                    case 'reaccept':
                        this.reacceptConnection(btn.dataset.connectionId, btn.dataset.userId, btn.dataset.userName);
                        break;
                }
            });
        }

        switchTab(tabName) {
            // タブボタンの切り替え
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabName);
            });
            
            // コンテンツの切り替え
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.toggle('active', content.id === tabName);
            });
        }

        async loadAllConnectionsSimple() {
            try {
                console.log('[ConnectionsManager Simple] データ読み込み開始');
                
                // 1. connectionsテーブルのデータを取得（外部キー参照なし）
                const { data: allConnections, error: connError } = await window.supabaseClient
                    .from('connections')
                    .select('*')
                    .or(`user_id.eq.${this.currentUserId},connected_user_id.eq.${this.currentUserId}`);
                
                if (connError) {
                    console.error('[ConnectionsManager Simple] connections取得エラー:', connError);
                    console.error('[ConnectionsManager Simple] エラー詳細:', {
                        message: connError.message,
                        details: connError.details,
                        hint: connError.hint,
                        code: connError.code
                    });
                    
                    // エラー表示
                    document.querySelectorAll('.connection-list').forEach(list => {
                        list.innerHTML = `
                            <div class="empty-state">
                                <i class="fas fa-exclamation-triangle"></i>
                                <h3>データの読み込みに失敗しました</h3>
                                <p>${connError.message || 'connectionsテーブルが存在しない可能性があります'}</p>
                                <small>エラーコード: ${connError.code || 'unknown'}</small>
                            </div>
                        `;
                    });
                    
                    // テーブル存在チェック（デバッグ用）
                    console.log('[ConnectionsManager Simple] connectionsテーブルの存在を確認中...');
                    const { data: test } = await window.supabaseClient
                        .from('connections')
                        .select('id')
                        .limit(1);
                    if (test) {
                        console.log('[ConnectionsManager Simple] connectionsテーブルは存在し、アクセス可能です');
                    }
                    return;
                }
                
                console.log('[ConnectionsManager Simple] 取得したconnections:', allConnections);
                
                if (!allConnections || allConnections.length === 0) {
                    // console.log('[ConnectionsManager Simple] コネクションが存在しません');
                    this.updateUI();
                    return;
                }
                
                // 2. 関連するユーザーIDを収集
                const userIds = new Set();
                allConnections.forEach(conn => {
                    if (conn.user_id) userIds.add(conn.user_id);
                    if (conn.connected_user_id) userIds.add(conn.connected_user_id);
                });
                
                // 3. profilesテーブルから個別にユーザー情報を取得
                const profileMap = {};
                for (const userId of userIds) {
                    try {
                        const { data: profile, error: profileError } = await window.supabaseClient
                            .from('user_profiles')
                            .select('id, name, email, company, title, avatar_url')
                            .eq('id', userId)
                            .single();
                        
                        if (profile) {
                            profileMap[userId] = profile;
                        }
                        
                        if (profileError) {
                            console.warn(`[ConnectionsManager Simple] プロファイル取得エラー (${userId}):`, profileError);
                        }
                    } catch (err) {
                        console.warn(`[ConnectionsManager Simple] プロファイル取得例外 (${userId}):`, err);
                    }
                }
                
                console.log('[ConnectionsManager Simple] 取得したprofiles:', profileMap);
                
                // 4. connectionsとprofilesを結合してカテゴリ分け
                this.connections.received = [];
                this.connections.sent = [];
                this.connections.connected = [];
                this.connections.rejected = [];
                
                allConnections.forEach(conn => {
                    // 相手のユーザーを特定
                    if (conn.connected_user_id === this.currentUserId && conn.status === 'pending') {
                        // 受信した申請
                        conn.sender = profileMap[conn.user_id] || { 
                            id: conn.user_id,
                            name: '名前を取得中...', 
                            email: '',
                            company: '',
                            title: ''
                        };
                        this.connections.received.push(conn);
                    } else if (conn.user_id === this.currentUserId && conn.status === 'pending') {
                        // 送信した申請
                        conn.receiver = profileMap[conn.connected_user_id] || { 
                            id: conn.connected_user_id,
                            name: '名前を取得中...', 
                            email: '',
                            company: '',
                            title: ''
                        };
                        this.connections.sent.push(conn);
                    } else if (conn.status === 'accepted') {
                        // コネクト済み
                        conn.user = profileMap[conn.user_id] || { 
                            id: conn.user_id,
                            name: '名前を取得中...', 
                            email: '',
                            company: '',
                            title: ''
                        };
                        conn.connected_user = profileMap[conn.connected_user_id] || { 
                            id: conn.connected_user_id,
                            name: '名前を取得中...', 
                            email: '',
                            company: '',
                            title: ''
                        };
                        this.connections.connected.push(conn);
                    } else if (conn.status === 'rejected') {
                        // 拒否済み
                        conn.user = profileMap[conn.user_id] || { 
                            id: conn.user_id,
                            name: '名前を取得中...', 
                            email: '',
                            company: '',
                            title: ''
                        };
                        conn.connected_user = profileMap[conn.connected_user_id] || { 
                            id: conn.connected_user_id,
                            name: '名前を取得中...', 
                            email: '',
                            company: '',
                            title: ''
                        };
                        this.connections.rejected.push(conn);
                    }
                });
                
                // ソート
                this.connections.received.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                this.connections.sent.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                this.connections.connected.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                this.connections.rejected.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                
                console.log('[ConnectionsManager Simple] カテゴリ分け完了:', {
                    received: this.connections.received.length,
                    sent: this.connections.sent.length,
                    connected: this.connections.connected.length,
                    rejected: this.connections.rejected.length
                });

                // UIを更新
                this.updateUI();

            } catch (error) {
                console.error('[ConnectionsManager Simple] データ読み込みエラー:', error);
                console.error('[ConnectionsManager Simple] エラースタック:', error.stack);
            }
        }

        updateUI() {
            // 統計を更新
            this.updateStats();
            
            // 各タブのコンテンツを更新
            this.renderReceivedPending();
            this.renderSentPending();
            this.renderConnected();
            this.renderRejected();
        }

        updateStats() {
            // カウントを更新
            const connectedCount = document.getElementById('connectedCount');
            const pendingReceivedCount = document.getElementById('pendingReceivedCount');
            const pendingSentCount = document.getElementById('pendingSentCount');
            const rejectedCount = document.getElementById('rejectedCount');
            
            if (connectedCount) connectedCount.textContent = this.connections.connected.length;
            if (pendingReceivedCount) pendingReceivedCount.textContent = this.connections.received.length;
            if (pendingSentCount) pendingSentCount.textContent = this.connections.sent.length;
            if (rejectedCount) rejectedCount.textContent = this.connections.rejected.length;
            
            // バッジを更新
            const receivedBadge = document.getElementById('receivedBadge');
            const sentBadge = document.getElementById('sentBadge');
            const connectedBadge = document.getElementById('connectedBadge');
            const rejectedBadge = document.getElementById('rejectedBadge');
            
            if (receivedBadge) receivedBadge.textContent = this.connections.received.length;
            if (sentBadge) sentBadge.textContent = this.connections.sent.length;
            if (connectedBadge) connectedBadge.textContent = this.connections.connected.length;
            if (rejectedBadge) rejectedBadge.textContent = this.connections.rejected.length;
        }

        renderReceivedPending() {
            const container = document.getElementById('receivedList');
            if (!container) return;
            
            if (this.connections.received.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h3>承認待ちの申請はありません</h3>
                        <p>新しいコネクト申請が届くとここに表示されます</p>
                    </div>
                `;
                return;
            }
            
            // ページネーション計算
            const currentPage = this.currentPage.received || 1;
            const startIndex = (currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const pageItems = this.connections.received.slice(startIndex, endIndex);
            
            container.innerHTML = pageItems.map(conn => {
                const user = conn.sender;
                const position = user.title || '';
                return `
                    <div class="connection-item" data-connection-id="${conn.id}" data-date="${conn.created_at}">
                        <img src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=4A90E2&color=fff`}" 
                             alt="${user.name}" 
                             class="connection-avatar">
                        <div class="connection-info">
                            <div class="connection-name">${this.escapeHtml(user.name || '名前未設定')}</div>
                            <div class="connection-company">${this.escapeHtml(user.company || '')} ${this.escapeHtml(position)}</div>
                            <!-- messageカラムは存在しないため削除 -->
                            <div class="connection-time">${this.formatDate(conn.created_at)}</div>
                        </div>
                        <div class="connection-actions">
                            <button class="btn-accept" data-action="accept" data-connection-id="${conn.id}" data-user-id="${user.id}" data-user-name="${this.escapeHtml(user.name)}">
                                <i class="fas fa-check"></i> 承認
                            </button>
                            <button class="btn-reject" data-action="reject" data-connection-id="${conn.id}" data-user-id="${user.id}" data-user-name="${this.escapeHtml(user.name)}">
                                <i class="fas fa-times"></i> 拒否
                            </button>
                            <button class="btn-view-profile" data-action="view-profile" data-user-id="${user.id}">
                                <i class="fas fa-user"></i> プロフィール
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
            // ページネーションを追加
            container.innerHTML += this.renderPagination('received-pending', this.connections.received.length);
        }

        renderSentPending() {
            const container = document.getElementById('sentList');
            if (!container) return;
            
            if (this.connections.sent.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-paper-plane"></i>
                        <h3>申請中のコネクトはありません</h3>
                        <p>送信した申請がここに表示されます</p>
                        <button class="btn-find-connections" onclick="window.location.href='matching.html'">
                            新しいコネクションを探す
                        </button>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = this.connections.sent.map(conn => {
                const user = conn.receiver;
                const position = user.title || '';
                return `
                    <div class="connection-item" data-connection-id="${conn.id}">
                        <img src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=4A90E2&color=fff`}" 
                             alt="${user.name}" 
                             class="connection-avatar">
                        <div class="connection-info">
                            <div class="connection-name">${this.escapeHtml(user.name || '名前未設定')}</div>
                            <div class="connection-company">${this.escapeHtml(user.company || '')} ${this.escapeHtml(position)}</div>
                            <!-- messageカラムは存在しないため削除 -->
                            <div class="connection-time">申請日: ${this.formatDate(conn.created_at)}</div>
                        </div>
                        <div class="connection-actions">
                            <button class="btn-cancel" data-action="cancel" data-connection-id="${conn.id}">
                                <i class="fas fa-ban"></i> 取り消し
                            </button>
                            <button class="btn-view-profile" data-action="view-profile" data-user-id="${user.id}">
                                <i class="fas fa-user"></i> プロフィール
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        renderConnected() {
            const container = document.getElementById('connectedList');
            if (!container) return;
            
            if (this.connections.connected.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>コネクションがまだありません</h3>
                        <p>承認されたコネクションがここに表示されます</p>
                        <button class="btn-find-connections" onclick="window.location.href='matching.html'">
                            新しいコネクションを探す
                        </button>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = this.connections.connected.map(conn => {
                // 相手のユーザー情報を取得
                const user = conn.user_id === this.currentUserId ? conn.connected_user : conn.user;
                const position = user.title || '';
                return `
                    <div class="connection-item" data-connection-id="${conn.id}">
                        <img src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=4A90E2&color=fff`}" 
                             alt="${user.name}" 
                             class="connection-avatar">
                        <div class="connection-info">
                            <div class="connection-name">${this.escapeHtml(user.name || '名前未設定')}</div>
                            <div class="connection-company">${this.escapeHtml(user.company || '')} ${this.escapeHtml(position)}</div>
                            <div class="contact-info-card">
                                <div class="contact-info-item">
                                    <i class="fas fa-envelope"></i>
                                    <a href="mailto:${user.email}">${user.email}</a>
                                </div>
                            </div>
                            <div class="connection-time">コネクト日: ${this.formatDate(conn.updated_at)}</div>
                        </div>
                        <div class="connection-actions">
                            <button class="btn-message" data-action="message" data-user-id="${user.id}">
                                <i class="fas fa-envelope"></i> メッセージ
                            </button>
                            <button class="btn-view-profile" data-action="view-profile" data-user-id="${user.id}">
                                <i class="fas fa-user"></i> プロフィール
                            </button>
                            <button class="btn-remove" data-action="remove" data-connection-id="${conn.id}" data-user-id="${user.id}" data-user-name="${this.escapeHtml(user.name)}">
                                <i class="fas fa-user-slash"></i> 削除
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        renderRejected() {
            const container = document.getElementById('rejectedList');
            if (!container) return;
            
            if (this.connections.rejected.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-ban"></i>
                        <h3>拒否された申請はありません</h3>
                        <p>拒否またはキャンセルされた申請がここに表示されます</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = this.connections.rejected.map(conn => {
                const user = conn.user_id === this.currentUserId ? conn.connected_user : conn.user;
                const isSentByMe = conn.user_id === this.currentUserId;
                const position = user.title || '';
                return `
                    <div class="connection-item" data-connection-id="${conn.id}" data-date="${conn.updated_at}">
                        <img src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=adb5bd&color=fff`}" 
                             alt="${user.name}" 
                             class="connection-avatar" style="filter: grayscale(100%);">
                        <div class="connection-info">
                            <div class="connection-name">${this.escapeHtml(user.name || '名前未設定')}</div>
                            <div class="connection-company">${this.escapeHtml(user.company || '')} ${this.escapeHtml(position)}</div>
                            <div class="connection-time">
                                ${isSentByMe ? '申請を拒否されました' : '申請を拒否しました'}: 
                                ${this.formatDate(conn.updated_at)}
                            </div>
                        </div>
                        <div class="connection-actions">
                            ${!isSentByMe ? `
                                <button class="btn-reaccept" data-action="reaccept" data-connection-id="${conn.id}" data-user-id="${user.id}" data-user-name="${this.escapeHtml(user.name)}">
                                    <i class="fas fa-redo"></i> 再承認
                                </button>
                            ` : ''}
                            <button class="btn-view-profile" data-action="view-profile" data-user-id="${user.id}">
                                <i class="fas fa-user"></i> プロフィール
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        async acceptConnection(connectionId, userId, userName) {
            // 確認ダイアログ
            if (!confirm(`${userName}さんのコネクト申請を承認しますか？\n承認後は連絡先情報が相手に公開されます。`)) {
                return;
            }
            
            try {
                // コネクションを承認
                const { error } = await window.supabaseClient
                    .from('connections')
                    .update({ 
                        status: 'accepted',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', connectionId);

                if (error) throw error;

                // 承認通知を送信
                await window.supabaseClient
                    .from('notifications')
                    .insert({
                        user_id: userId,
                        type: 'connection_accepted',
                        title: 'コネクト承認',
                        message: `あなたのコネクト申請が承認されました`,
                        related_id: this.currentUserId,
                        is_read: false
                    });

                // UI更新
                await this.loadAllConnectionsSimple();
                
                // 成功メッセージ
                if (window.showToast) {
                    window.showToast(`${userName}さんとコネクトしました！`, 'success');
                }

            } catch (error) {
                console.error('[ConnectionsManager] 承認エラー:', error);
                if (window.showToast) {
                    window.showToast('承認に失敗しました', 'error');
                }
            }
        }

        async rejectConnection(connectionId, userId, userName) {
            // 確認ダイアログ
            if (!confirm(`${userName}さんのコネクト申請を拒否しますか？`)) {
                return;
            }
            
            try {
                // コネクションを拒否（削除ではなく更新）
                const { error } = await window.supabaseClient
                    .from('connections')
                    .update({ 
                        status: 'rejected',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', connectionId);

                if (error) throw error;

                // UI更新
                await this.loadAllConnectionsSimple();
                
                // 情報メッセージ
                if (window.showToast) {
                    window.showToast('コネクト申請を拒否しました', 'info');
                }

            } catch (error) {
                console.error('[ConnectionsManager] 拒否エラー:', error);
                if (window.showToast) {
                    window.showToast('拒否に失敗しました', 'error');
                }
            }
        }

        async cancelConnection(connectionId) {
            // 確認ダイアログ
            if (!confirm('このコネクト申請を取り消しますか？')) {
                return;
            }
            
            try {
                // 申請を取り消し（削除ではなく更新に変更）
                const { error } = await window.supabaseClient
                    .from('connections')
                    .update({
                        status: 'cancelled',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', connectionId);

                if (error) throw error;

                // UI更新
                await this.loadAllConnectionsSimple();
                
                // 情報メッセージ
                if (window.showToast) {
                    window.showToast('申請を取り消しました', 'info');
                }

            } catch (error) {
                console.error('[ConnectionsManager] 取り消しエラー:', error);
                if (window.showToast) {
                    window.showToast('取り消しに失敗しました', 'error');
                }
            }
        }
        
        async removeConnection(connectionId, userId, userName) {
            // 確認ダイアログ
            if (!confirm(`${userName}さんとのコネクションを削除しますか？\nこの操作は取り消せません。`)) {
                return;
            }
            
            try {
                // コネクションを削除（statusをremovedに更新）
                const { error } = await window.supabaseClient
                    .from('connections')
                    .update({
                        status: 'removed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', connectionId);

                if (error) throw error;

                // UI更新
                await this.loadAllConnectionsSimple();
                
                // 情報メッセージ
                if (window.showToast) {
                    window.showToast(`${userName}さんとのコネクションを削除しました`, 'info');
                }

            } catch (error) {
                console.error('[ConnectionsManager] 削除エラー:', error);
                if (window.showToast) {
                    window.showToast('削除に失敗しました', 'error');
                }
            }
        }
        
        async reacceptConnection(connectionId, userId, userName) {
            // 確認ダイアログ
            if (!confirm(`${userName}さんのコネクト申請を再承認しますか？`)) {
                return;
            }
            
            try {
                // コネクションを再承認（statusをacceptedに更新）
                const { error } = await window.supabaseClient
                    .from('connections')
                    .update({
                        status: 'accepted',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', connectionId);

                if (error) throw error;
                
                // 承認通知を送信
                await window.supabaseClient
                    .from('notifications')
                    .insert({
                        user_id: userId,
                        type: 'connection_reaccepted',
                        title: 'コネクト再承認',
                        message: `${userName}さんがあなたのコネクト申請を再承認しました`,
                        related_id: this.currentUserId,
                        is_read: false
                    });

                // UI更新
                await this.loadAllConnectionsSimple();
                
                // 成功メッセージ
                if (window.showToast) {
                    window.showToast(`${userName}さんとのコネクトを再承認しました！`, 'success');
                }

            } catch (error) {
                console.error('[ConnectionsManager] 再承認エラー:', error);
                if (window.showToast) {
                    window.showToast('再承認に失敗しました', 'error');
                }
            }
        }

        setupRealtimeSubscription() {
            // リアルタイム更新の購読（双方向の変更を検知）
            this.subscription = window.supabaseClient
                .channel('connections-changes')
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'connections',
                        filter: `user_id=eq.${this.currentUserId}`
                    }, 
                    () => {
                        this.loadAllConnectionsSimple();
                    }
                )
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'connections',
                        filter: `connected_user_id=eq.${this.currentUserId}`
                    }, 
                    () => {
                        this.loadAllConnectionsSimple();
                    }
                )
                .subscribe();
        }

        filterConnections(searchTerm) {
            const term = searchTerm.toLowerCase();
            const activeTab = document.querySelector('.tab-content.active').id;
            
            // 各タブのアイテムをフィルタリング
            const items = document.querySelectorAll(`#${activeTab} .connection-item`);
            items.forEach(item => {
                const name = item.querySelector('.connection-name')?.textContent.toLowerCase() || '';
                const company = item.querySelector('.connection-company')?.textContent.toLowerCase() || '';
                
                if (name.includes(term) || company.includes(term)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
            
            // 結果が0件の場合の表示
            const visibleItems = document.querySelectorAll(`#${activeTab} .connection-item:not([style*="display: none"])`);
            const container = document.querySelector(`#${activeTab} .connection-list`);
            const emptyState = container.querySelector('.empty-state');
            
            if (visibleItems.length === 0 && !emptyState) {
                // 検索結果なしの表示を追加
                const noResults = document.createElement('div');
                noResults.className = 'no-search-results';
                noResults.innerHTML = `
                    <i class="fas fa-search"></i>
                    <p>「${searchTerm}」に一致する結果はありません</p>
                `;
                container.appendChild(noResults);
            } else if (visibleItems.length > 0) {
                // 検索結果なし表示を削除
                const noResults = container.querySelector('.no-search-results');
                if (noResults) noResults.remove();
            }
        }
        
        sortConnections(sortBy) {
            const activeTab = document.querySelector('.tab-content.active').id;
            const container = document.querySelector(`#${activeTab} .connection-list`);
            const items = Array.from(container.querySelectorAll('.connection-item'));
            
            items.sort((a, b) => {
                switch(sortBy) {
                    case 'date-asc':
                        return new Date(a.dataset.date || 0) - new Date(b.dataset.date || 0);
                    case 'date-desc':
                        return new Date(b.dataset.date || 0) - new Date(a.dataset.date || 0);
                    case 'name-asc':
                        const nameA = a.querySelector('.connection-name')?.textContent || '';
                        const nameB = b.querySelector('.connection-name')?.textContent || '';
                        return nameA.localeCompare(nameB, 'ja');
                    case 'name-desc':
                        const nameC = a.querySelector('.connection-name')?.textContent || '';
                        const nameD = b.querySelector('.connection-name')?.textContent || '';
                        return nameD.localeCompare(nameC, 'ja');
                    case 'company-asc':
                        const companyA = a.querySelector('.connection-company')?.textContent || '';
                        const companyB = b.querySelector('.connection-company')?.textContent || '';
                        return companyA.localeCompare(companyB, 'ja');
                    case 'company-desc':
                        const companyC = a.querySelector('.connection-company')?.textContent || '';
                        const companyD = b.querySelector('.connection-company')?.textContent || '';
                        return companyD.localeCompare(companyC, 'ja');
                    default:
                        return 0;
                }
            });
            
            // 並べ替えたアイテムを再配置
            items.forEach(item => container.appendChild(item));
        }
        
        renderPagination(tabId, totalItems) {
            const totalPages = Math.ceil(totalItems / this.itemsPerPage);
            const currentPage = this.currentPage[tabId.replace('-pending', '').replace('received', 'received')] || 1;
            
            if (totalPages <= 1) return ''; // ページが1つの場合は表示しない
            
            let paginationHTML = '<div class="pagination">';
            
            // 前へボタン
            if (currentPage > 1) {
                paginationHTML += `<button class="page-btn" onclick="connectionsManager.changePage('${tabId}', ${currentPage - 1})">
                    <i class="fas fa-chevron-left"></i> 前へ
                </button>`;
            }
            
            // ページ番号
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, currentPage + 2);
            
            if (startPage > 1) {
                paginationHTML += `<button class="page-btn" onclick="connectionsManager.changePage('${tabId}', 1)">1</button>`;
                if (startPage > 2) paginationHTML += '<span class="page-dots">...</span>';
            }
            
            for (let i = startPage; i <= endPage; i++) {
                paginationHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" 
                    onclick="connectionsManager.changePage('${tabId}', ${i})">${i}</button>`;
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) paginationHTML += '<span class="page-dots">...</span>';
                paginationHTML += `<button class="page-btn" onclick="connectionsManager.changePage('${tabId}', ${totalPages})">${totalPages}</button>`;
            }
            
            // 次へボタン
            if (currentPage < totalPages) {
                paginationHTML += `<button class="page-btn" onclick="connectionsManager.changePage('${tabId}', ${currentPage + 1})">
                    次へ <i class="fas fa-chevron-right"></i>
                </button>`;
            }
            
            paginationHTML += '</div>';
            return paginationHTML;
        }
        
        changePage(tabId, page) {
            const key = tabId.replace('-pending', '').replace('received', 'received');
            this.currentPage[key] = page;
            
            // 該当するタブの再レンダリング
            switch(tabId) {
                case 'received-pending':
                    this.renderReceivedPending();
                    break;
                case 'sent-pending':
                    this.renderSentPending();
                    break;
                case 'connected':
                    this.renderConnected();
                    break;
                case 'rejected':
                    this.renderRejected();
                    break;
            }
        }
        
        formatDate(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor(diff / (1000 * 60));

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

        // プロフィールモーダル表示
        showProfileModal(userId) {
            // console.log('[ConnectionsManager] プロフィール表示:', userId);
            
            // プロフィールモーダル関数が利用可能か確認
            if (window.ProfileDetailModal && window.profileDetailModal) {
                // profile-detail-modal.jsのインスタンスを使用
                window.profileDetailModal.show(userId);
            } else if (window.showMemberProfileModal) {
                // members-profile-modal.jsの関数を使用
                window.showMemberProfileModal(userId);
            } else if (window.membersProfileModal) {
                // members-profile-modal.jsのインスタンスを使用
                window.membersProfileModal.show(userId);
            } else {
                // フォールバック: 従来のページ遷移
                console.warn('[ConnectionsManager] プロフィールモーダルが利用できません。ページ遷移します。');
                window.location.href = `profile.html?user=${userId}`;
            }
        }
    }

    // グローバルに公開（DOMContentLoaded後）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.connectionsManager = new ConnectionsManager();
        });
    } else {
        // 既に読み込み済みの場合は少し遅延させて実行
        setTimeout(() => {
            window.connectionsManager = new ConnectionsManager();
        }, 100);
    }

})();