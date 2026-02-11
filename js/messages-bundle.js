// ============================================================
// Section: messages-external-contacts.js
// ============================================================
/**
 * Messages External Contacts
 * 外部連絡先情報の管理と表示
 */

(function() {
    'use strict';

    // console.log('[MessagesExternalContacts] 初期化開始...');

    class MessagesExternalContactsManager {
        constructor() {
            this.connections = [];
            this.init();
        }

        async init() {
            await this.loadRecentConnections();
            this.setupEventListeners();
        }

        /**
         * 最近のコネクションを読み込む
         */
        async loadRecentConnections() {
            const connectionsList = document.getElementById('connectionsList');
            if (!connectionsList) return;

            try {
                // Supabase接続確認
                if (window.supabaseClient) {
                    await this.loadFromSupabase();
                } else {
                    this.connections = [];
                }

                this.renderConnections();
            } catch (error) {
                console.error('[MessagesExternalContacts] データ読み込みエラー:', error);
                this.showError();
            }
        }

        /**
         * Supabaseからデータを読み込む
         */
        async loadFromSupabase() {
            try {
                // 現在のユーザーを取得
                const user = await window.safeGetUser();
                if (!user) {
                    this.connections = [];
                    return;
                }

                // 最近のマッチングまたはイベント参加者を取得
                const { data: recentConnections, error } = await window.supabase
                    .from('user_activities')
                    .select('*')
                    .eq('user_id', user.id)
                    .in('activity_type', ['matching_success', 'event_participation'])
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (error) throw error;

                // related_idからプロフィール情報を別クエリで取得（FKなし）
                const relatedIds = recentConnections
                    .map(a => a.related_id)
                    .filter(Boolean);

                let profilesMap = {};
                if (relatedIds.length > 0) {
                    const { data: profiles } = await window.supabase
                        .from('user_profiles')
                        .select('id, full_name, company, email, line_id, line_qr_url, phone, avatar_url')
                        .in('id', relatedIds);
                    if (profiles) {
                        profiles.forEach(p => { profilesMap[p.id] = p; });
                    }
                }

                this.connections = recentConnections.map(activity => {
                    const profile = profilesMap[activity.related_id] || {};
                    return {
                        id: activity.related_id,
                        name: profile.full_name || 'ユーザー',
                        company: profile.company || '',
                        email: profile.email || '',
                        line_id: profile.line_id || '',
                        line_qr: profile.line_qr_url || '',
                        phone: profile.phone || '',
                        avatar: profile.avatar_url || 'assets/user-placeholder.svg'
                    };
                });

            } catch (error) {
                console.error('[MessagesExternalContacts] Supabaseエラー:', error);
                this.connections = [];
            }
        }

        // loadDummyData() 削除済み — 実データのみ使用

        /**
         * コネクションをレンダリング
         */
        renderConnections() {
            const connectionsList = document.getElementById('connectionsList');
            if (!connectionsList) return;

            if (this.connections.length === 0) {
                connectionsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>まだコネクションがありません</p>
                    </div>
                `;
                return;
            }

            connectionsList.innerHTML = this.connections.map(connection => `
                <div class="connection-item" data-connection-id="${connection.id}">
                    <img src="${connection.avatar}" alt="${connection.name}" class="connection-avatar">
                    <div class="connection-info">
                        <h4>${this.escapeHtml(connection.name)}</h4>
                        <p>${this.escapeHtml(connection.company)}</p>
                    </div>
                    <div class="connection-actions">
                        <button class="btn btn-small btn-outline" onclick="window.messagesExternalContacts.showContactDetails(${connection.id})">
                            <i class="fas fa-address-card"></i>
                            連絡先を見る
                        </button>
                    </div>
                </div>
            `).join('');
        }

        /**
         * 連絡先詳細を表示
         */
        showContactDetails(connectionId) {
            const connection = this.connections.find(c => c.id == connectionId);
            if (!connection) return;

            // モーダルを作成
            const modal = document.createElement('div');
            modal.className = 'contact-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>連絡先情報</h3>
                        <button class="btn-icon" onclick="this.closest('.contact-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="contact-profile">
                            <img src="${connection.avatar}" alt="${connection.name}">
                            <h4>${this.escapeHtml(connection.name)}</h4>
                            <p>${this.escapeHtml(connection.company)}</p>
                        </div>

                        <div class="contact-details">
                            ${connection.email ? `
                                <div class="contact-item">
                                    <i class="fas fa-envelope"></i>
                                    <div>
                                        <label>メール</label>
                                        <a href="mailto:${connection.email}">${this.escapeHtml(connection.email)}</a>
                                    </div>
                                </div>
                            ` : ''}

                            ${connection.line_id ? `
                                <div class="contact-item">
                                    <i class="fab fa-line"></i>
                                    <div>
                                        <label>LINE ID</label>
                                        <p>${this.escapeHtml(connection.line_id)}</p>
                                        ${connection.line_qr ? `
                                            <button class="btn btn-small btn-primary" onclick="window.messagesExternalContacts.showQRCode('${window.escapeAttr(connection.line_qr)}', '${window.escapeAttr(connection.name)}')">
                                                <i class="fas fa-qrcode"></i>
                                                QRコードを表示
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            ` : ''}

                            ${connection.phone ? `
                                <div class="contact-item">
                                    <i class="fas fa-phone"></i>
                                    <div>
                                        <label>電話番号</label>
                                        <a href="tel:${connection.phone}">${this.escapeHtml(connection.phone)}</a>
                                    </div>
                                </div>
                            ` : ''}
                        </div>

                        ${!connection.email && !connection.line_id && !connection.phone ? `
                            <div class="empty-contact">
                                <i class="fas fa-info-circle"></i>
                                <p>連絡先情報が登録されていません</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // モーダル外クリックで閉じる
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }

        /**
         * QRコードを表示
         */
        showQRCode(qrUrl, name) {
            // 既存のモーダルを閉じる
            const existingModal = document.querySelector('.contact-modal');
            if (existingModal) existingModal.remove();

            const qrSection = document.getElementById('qrCodeSection');
            const qrImage = document.getElementById('qrCodeImage');
            const qrName = document.getElementById('qrCodeName');

            if (qrSection && qrImage && qrName) {
                qrImage.src = qrUrl;
                qrName.textContent = `${name}さんのLINE QRコード`;
                qrSection.style.display = 'block';

                // スムーズスクロール
                qrSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        /**
         * エラー表示
         */
        showError() {
            const connectionsList = document.getElementById('connectionsList');
            if (connectionsList) {
                connectionsList.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>データの読み込みに失敗しました</p>
                        <button class="btn btn-small btn-primary" onclick="window.messagesExternalContacts.reload()">
                            再読み込み
                        </button>
                    </div>
                `;
            }
        }

        /**
         * 再読み込み
         */
        async reload() {
            await this.loadRecentConnections();
        }

        /**
         * HTMLエスケープ
         */
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }

        /**
         * イベントリスナーを設定
         */
        setupEventListeners() {
            // プロフィールボタンのクリックイベント
            document.addEventListener('click', (e) => {
                if (e.target.closest('.btn[href*="profile.html"]')) {
                    // プロフィールページへの遷移処理
                    const connectionItem = e.target.closest('.connection-item');
                    if (connectionItem) {
                        const connectionId = connectionItem.dataset.connectionId;
                        // プロフィールページにIDを渡す
                        window.location.href = `profile.html?user=${connectionId}`;
                    }
                }
            });
        }
    }

    // スタイルを追加
    const style = document.createElement('style');
    style.textContent = `
        /* ローディングスピナー */
        .loading-spinner {
            text-align: center;
            padding: 2rem;
            color: var(--text-secondary);
        }

        .loading-spinner i {
            font-size: 2rem;
            margin-bottom: 1rem;
        }

        /* QRコードセクション */
        .qr-code-section {
            background: white;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-sm);
            padding: var(--space-xl);
            margin-top: var(--space-xl);
            text-align: center;
        }

        .qr-code-display {
            max-width: 400px;
            margin: 0 auto;
        }

        .qr-code-display img {
            width: 100%;
            max-width: 300px;
            height: auto;
            margin: var(--space-lg) 0;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: var(--space-md);
            background: white;
        }

        .qr-code-name {
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: var(--space-lg);
        }

        /* 連絡先モーダル */
        .contact-modal {
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
            padding: var(--space-lg);
        }

        .contact-modal .modal-content {
            background: white;
            border-radius: var(--radius-lg);
            max-width: 500px;
            width: 100%;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .contact-modal .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--space-lg);
            border-bottom: 1px solid var(--border-color);
        }

        .contact-modal .modal-header h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0;
        }

        .contact-modal .modal-body {
            padding: var(--space-lg);
            overflow-y: auto;
        }

        .contact-profile {
            text-align: center;
            margin-bottom: var(--space-xl);
        }

        .contact-profile img {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            margin-bottom: var(--space-md);
        }

        .contact-profile h4 {
            font-size: 1.125rem;
            font-weight: 600;
            margin-bottom: var(--space-xs);
        }

        .contact-profile p {
            color: var(--text-secondary);
        }

        .contact-details {
            display: flex;
            flex-direction: column;
            gap: var(--space-lg);
        }

        .contact-item {
            display: flex;
            gap: var(--space-md);
            align-items: flex-start;
        }

        .contact-item i {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-secondary);
            border-radius: var(--radius-md);
            font-size: 1.125rem;
            color: var(--primary-color);
            flex-shrink: 0;
        }

        .contact-item label {
            display: block;
            font-size: 0.875rem;
            color: var(--text-secondary);
            margin-bottom: var(--space-xs);
        }

        .contact-item p,
        .contact-item a {
            margin: 0;
            color: var(--text-primary);
            word-break: break-all;
        }

        .contact-item a:hover {
            color: var(--primary-color);
        }

        .contact-item .btn {
            margin-top: var(--space-sm);
        }

        .empty-contact {
            text-align: center;
            padding: var(--space-xl);
            color: var(--text-secondary);
        }

        .empty-contact i {
            font-size: 2rem;
            margin-bottom: var(--space-md);
            opacity: 0.5;
        }

        /* エラー状態 */
        .error-state {
            text-align: center;
            padding: var(--space-xl);
            color: var(--danger-color);
        }

        .error-state i {
            font-size: 2rem;
            margin-bottom: var(--space-md);
        }

        /* レスポンシブ対応 */
        @media (max-width: 768px) {
            .contact-modal {
                padding: var(--space-md);
            }

            .contact-modal .modal-content {
                margin: 0;
            }

            .qr-code-display img {
                max-width: 250px;
            }
        }
    `;
    document.head.appendChild(style);

    // グローバル関数
    window.closeQRCode = function() {
        const qrSection = document.getElementById('qrCodeSection');
        if (qrSection) {
            qrSection.style.display = 'none';
        }
    };

    // 初期化
    window.messagesExternalContacts = new MessagesExternalContactsManager();

})();

// ============================================================
// Section: messages-viewing-history.js
// ============================================================
/**
 * Messages Viewing History
 * プロフィール・マッチング詳細の閲覧履歴
 */

(function() {
    'use strict';

    // console.log('[ViewingHistory] 閲覧履歴機能を初期化');

    // 閲覧履歴を管理
    const ViewingHistory = {
        maxHistory: 10, // 最大履歴数
        storageKey: 'message_viewing_history',

        // 履歴を取得
        getHistory() {
            const history = localStorage.getItem(this.storageKey);
            return history ? JSON.parse(history) : [];
        },

        // 履歴に追加
        addToHistory(userId, userName, avatarUrl) {
            let history = this.getHistory();

            // 既存の履歴から同じユーザーを削除
            history = history.filter(item => item.userId !== userId);

            // 新しい履歴を先頭に追加
            history.unshift({
                userId,
                userName,
                avatarUrl: avatarUrl || 'assets/user-placeholder.svg',
                viewedAt: new Date().toISOString()
            });

            // 最大数を超えたら古いものを削除
            if (history.length > this.maxHistory) {
                history = history.slice(0, this.maxHistory);
            }

            localStorage.setItem(this.storageKey, JSON.stringify(history));

            // UIを更新
            this.updateHistoryUI();
        },

        // UIを更新
        updateHistoryUI() {
            const connectionsList = document.querySelector('.connections-list');
            if (!connectionsList) return;

            const history = this.getHistory();

            if (history.length === 0) {
                connectionsList.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #999;">
                        <i class="fas fa-history" style="font-size: 48px; margin-bottom: 10px;"></i>
                        <p>まだ閲覧履歴がありません</p>
                    </div>
                `;
                return;
            }

            connectionsList.innerHTML = history.map(item => {
                const timeAgo = this.getTimeAgo(new Date(item.viewedAt));

                return `
                    <div class="connection-item" data-user-id="${item.userId}" style="cursor: pointer;">
                        <img src="${item.avatarUrl}" alt="${item.userName}"
                             onerror="this.src='assets/user-placeholder.svg'">
                        <div class="connection-info">
                            <span class="connection-name">${item.userName}</span>
                            <span class="connection-time">${timeAgo}</span>
                        </div>
                    </div>
                `;
            }).join('');

            // クリックイベントを設定
            connectionsList.querySelectorAll('.connection-item').forEach(item => {
                item.addEventListener('click', () => {
                    const userId = item.dataset.userId;
                    // メッセージを開く処理
                    if (window.openChat) {
                        window.openChat(userId);
                    }
                });
            });
        },

        // 相対時間を取得
        getTimeAgo(date) {
            const now = new Date();
            const diff = now - date;
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 0) return `${days}日前`;
            if (hours > 0) return `${hours}時間前`;
            if (minutes > 0) return `${minutes}分前`;
            return 'たった今';
        },

        // 初期化
        init() {
            // ページ読み込み時に履歴を表示
            this.updateHistoryUI();

            // プロフィール表示関数を監視
            const originalViewProfile = window.viewProfile;
            if (originalViewProfile) {
                window.viewProfile = (userId) => {
                    // 元の関数を実行
                    originalViewProfile(userId);

                    // ユーザー情報を取得して履歴に追加
                    this.saveUserToHistory(userId);
                };
            }

            // showDetailedReport関数を監視（マッチング詳細）
            const originalShowDetailedReport = window.showDetailedReport;
            if (originalShowDetailedReport) {
                window.showDetailedReport = (profileId) => {
                    // 元の関数を実行
                    originalShowDetailedReport(profileId);

                    // ユーザー情報を取得して履歴に追加
                    this.saveUserToHistory(profileId);
                };
            }

            // プロフィールボタンのクリックイベントも監視
            document.addEventListener('click', (e) => {
                // プロフィールボタンまたはマッチング詳細ボタンをクリックした場合
                if (e.target.closest('button[onclick*="viewProfile"]') ||
                    e.target.closest('a[href*="profile.html"]') ||
                    e.target.closest('button[onclick*="showDetailedReport"]')) {

                    // ユーザーカードを探す
                    const card = e.target.closest('.matching-card, .member-card, .chat-item');
                    if (card) {
                        const userId = card.dataset.profileId || card.dataset.userId;
                        if (userId) {
                            this.saveUserToHistory(userId);
                        }
                    }
                }
            });
        },

        // ユーザー情報を取得して履歴に保存
        saveUserToHistory(userId) {
            // ユーザー要素を探す
            const userElement = document.querySelector(`[data-profile-id="${userId}"], [data-user-id="${userId}"]`);
            if (userElement) {
                const userName = userElement.querySelector('.user-info h3')?.textContent ||
                               userElement.querySelector('.matching-card h3')?.textContent ||
                               userElement.querySelector('.member-name')?.textContent ||
                               userElement.querySelector('.chat-name')?.textContent ||
                               'Unknown User';
                const avatarUrl = userElement.querySelector('img')?.src;

                this.addToHistory(userId, userName, avatarUrl);
            } else {
                // 要素が見つからない場合は、グローバルデータから探す
                if (window.MPI && window.MPI.profiles) {
                    const profile = window.MPI.profiles.find(p => p.id === userId);
                    if (profile) {
                        this.addToHistory(userId, profile.display_name || 'Unknown User', profile.avatar_url);
                    }
                }
            }
        }
    };

    // DOMContentLoadedで初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            ViewingHistory.init();
        });
    } else {
        ViewingHistory.init();
    }

    // グローバルに公開
    window.ViewingHistory = ViewingHistory;

})();

// window.openChat をグローバルに公開（他ファイルから呼ばれる）
window.openChat = function(userId) {
    window.location.href = `messages.html?user=${encodeURIComponent(userId)}`;
};
