/**
 * Messages Viewing History
 * 最近のコネクション → 閲覧履歴に変更
 */

(function() {
    'use strict';
    
    console.log('[ViewingHistory] 閲覧履歴機能を初期化');
    
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
            
            // チャットを開いたときに履歴に追加するようにイベントを監視
            const originalOpenChat = window.openChat;
            if (originalOpenChat) {
                window.openChat = (userId) => {
                    // 元の関数を実行
                    originalOpenChat(userId);
                    
                    // ユーザー情報を取得して履歴に追加
                    const userElement = document.querySelector(`[data-user-id="${userId}"]`);
                    if (userElement) {
                        const userName = userElement.querySelector('.chat-name')?.textContent || 
                                       userElement.querySelector('.connection-name')?.textContent || 
                                       'Unknown User';
                        const avatarUrl = userElement.querySelector('img')?.src;
                        
                        this.addToHistory(userId, userName, avatarUrl);
                    }
                };
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