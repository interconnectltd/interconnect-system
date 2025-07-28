/**
 * Notifications Delete System
 * Step 4: 通知の削除機能の実装
 */

(function() {
    'use strict';

    console.log('[NotificationDelete] 削除機能を初期化...');

    class NotificationDeleteManager {
        constructor() {
            this.useActivityTable = false;
            this.selectedNotifications = new Set();
            this.deleteInProgress = false;
            this.init();
        }

        async init() {
            console.log('[NotificationDelete] 初期化開始');
            
            // Supabaseマネージャーの初期化を待つ
            await this.waitForManagers();
            
            // 削除UIを作成
            this.createDeleteUI();
            
            // イベントリスナーを設定
            this.setupEventListeners();
        }

        /**
         * マネージャーの初期化を待つ
         */
        async waitForManagers() {
            let attempts = 0;
            while ((!window.notificationSupabaseManager || !window.notifications) && attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (window.notificationSupabaseManager) {
                this.useActivityTable = window.notificationSupabaseManager.useActivityTable;
            }
            
            console.log('[NotificationDelete] マネージャー検出完了');
        }

        /**
         * 削除UIを作成
         */
        createDeleteUI() {
            // 各通知アイテムに削除ボタンを追加
            this.addDeleteButtons();
            
            // 一括操作ツールバーを追加
            this.createBatchActionToolbar();
        }

        /**
         * 削除ボタンを追加
         */
        addDeleteButtons() {
            const notificationItems = document.querySelectorAll('.notification-item-full');
            
            notificationItems.forEach(item => {
                if (!item.querySelector('.notification-delete-btn')) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'notification-delete-btn';
                    deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                    deleteBtn.title = '削除';
                    
                    // チェックボックスも追加
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'notification-checkbox';
                    checkbox.value = item.dataset.id;
                    
                    const checkboxWrapper = document.createElement('div');
                    checkboxWrapper.className = 'notification-checkbox-wrapper';
                    checkboxWrapper.appendChild(checkbox);
                    
                    // 通知の先頭に追加
                    item.insertBefore(checkboxWrapper, item.firstChild);
                    
                    // 削除ボタンを追加
                    const detailsSection = item.querySelector('.notification-details');
                    if (detailsSection) {
                        const actionsWrapper = document.createElement('div');
                        actionsWrapper.className = 'notification-item-actions';
                        actionsWrapper.appendChild(deleteBtn);
                        detailsSection.appendChild(actionsWrapper);
                    }
                }
            });
        }

        /**
         * 一括操作ツールバーを作成
         */
        createBatchActionToolbar() {
            const notificationsPage = document.querySelector('.notifications-page');
            if (!notificationsPage || document.getElementById('batchActionToolbar')) return;

            const toolbar = document.createElement('div');
            toolbar.id = 'batchActionToolbar';
            toolbar.className = 'batch-action-toolbar';
            toolbar.innerHTML = `
                <div class="batch-action-left">
                    <label class="select-all-wrapper">
                        <input type="checkbox" id="selectAllCheckbox">
                        <span>すべて選択</span>
                    </label>
                    <span class="selected-count" id="selectedCount">0件選択</span>
                </div>
                <div class="batch-action-right">
                    <button class="btn btn-outline btn-sm" id="batchMarkReadBtn">
                        <i class="fas fa-check"></i> 既読にする
                    </button>
                    <button class="btn btn-outline btn-sm danger" id="batchDeleteBtn">
                        <i class="fas fa-trash"></i> 削除
                    </button>
                </div>
            `;

            // フィルターの後に挿入
            const filters = notificationsPage.querySelector('.notifications-filters');
            if (filters) {
                filters.parentNode.insertBefore(toolbar, filters.nextSibling);
            }
        }

        /**
         * イベントリスナーを設定
         */
        setupEventListeners() {
            // 個別削除ボタン
            document.addEventListener('click', async (e) => {
                if (e.target.closest('.notification-delete-btn')) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const button = e.target.closest('.notification-delete-btn');
                    const item = button.closest('.notification-item-full');
                    
                    if (item) {
                        const notificationId = item.dataset.id;
                        await this.deleteNotification(notificationId, item);
                    }
                }
            });

            // チェックボックス
            document.addEventListener('change', (e) => {
                if (e.target.classList.contains('notification-checkbox')) {
                    const notificationId = e.target.value;
                    
                    if (e.target.checked) {
                        this.selectedNotifications.add(notificationId);
                    } else {
                        this.selectedNotifications.delete(notificationId);
                    }
                    
                    this.updateSelectedCount();
                }
            });

            // 全選択チェックボックス
            const selectAllCheckbox = document.getElementById('selectAllCheckbox');
            if (selectAllCheckbox) {
                selectAllCheckbox.addEventListener('change', (e) => {
                    const checkboxes = document.querySelectorAll('.notification-checkbox');
                    
                    checkboxes.forEach(checkbox => {
                        checkbox.checked = e.target.checked;
                        
                        if (e.target.checked) {
                            this.selectedNotifications.add(checkbox.value);
                        } else {
                            this.selectedNotifications.delete(checkbox.value);
                        }
                    });
                    
                    this.updateSelectedCount();
                });
            }

            // 一括削除ボタン
            const batchDeleteBtn = document.getElementById('batchDeleteBtn');
            if (batchDeleteBtn) {
                batchDeleteBtn.addEventListener('click', () => {
                    this.batchDelete();
                });
            }

            // 一括既読ボタン
            const batchMarkReadBtn = document.getElementById('batchMarkReadBtn');
            if (batchMarkReadBtn) {
                batchMarkReadBtn.addEventListener('click', () => {
                    this.batchMarkAsRead();
                });
            }
        }

        /**
         * 個別の通知を削除
         */
        async deleteNotification(notificationId, element) {
            console.log('[NotificationDelete] 削除:', notificationId);

            // 確認ダイアログ
            const confirmed = await this.showConfirmDialog('この通知を削除しますか？');
            if (!confirmed) return;

            // 削除中の表示
            if (element) {
                element.classList.add('deleting');
            }

            try {
                // Supabaseから削除
                if (window.supabase) {
                    const userId = await this.getCurrentUserId();
                    if (!userId) throw new Error('ユーザーIDが取得できません');

                    let error;
                    if (this.useActivityTable) {
                        ({ error } = await window.supabase
                            .from('user_activities')
                            .delete()
                            .eq('id', notificationId)
                            .eq('user_id', userId));
                    } else {
                        ({ error } = await window.supabase
                            .from('notifications')
                            .delete()
                            .eq('id', notificationId)
                            .eq('user_id', userId));
                    }

                    if (error) throw error;
                }

                // 配列から削除
                if (window.notifications) {
                    const index = window.notifications.findIndex(n => n.id == notificationId);
                    if (index !== -1) {
                        window.notifications.splice(index, 1);
                    }
                }

                // UIから削除（アニメーション付き）
                if (element) {
                    await this.animateDelete(element);
                }

                // バッジを更新
                this.updateNotificationBadge();
                
                // 成功メッセージ
                this.showSuccessMessage('通知を削除しました');

            } catch (error) {
                console.error('[NotificationDelete] 削除エラー:', error);
                
                // エラー時は元に戻す
                if (element) {
                    element.classList.remove('deleting');
                }
                
                this.showErrorMessage('削除に失敗しました');
            }
        }

        /**
         * 一括削除
         */
        async batchDelete() {
            if (this.selectedNotifications.size === 0) {
                this.showWarningMessage('通知を選択してください');
                return;
            }

            const count = this.selectedNotifications.size;
            const confirmed = await this.showConfirmDialog(`${count}件の通知を削除しますか？`);
            if (!confirmed) return;

            this.deleteInProgress = true;
            
            // プログレスバーを表示
            const progressBar = this.createProgressBar();
            let completed = 0;

            try {
                // 選択された通知を削除
                for (const notificationId of this.selectedNotifications) {
                    const element = document.querySelector(`[data-id="${notificationId}"]`);
                    
                    if (element) {
                        element.classList.add('deleting');
                    }

                    // Supabaseから削除
                    if (window.supabase) {
                        const userId = await this.getCurrentUserId();
                        if (userId) {
                            if (this.useActivityTable) {
                                await window.supabase
                                    .from('user_activities')
                                    .delete()
                                    .eq('id', notificationId)
                                    .eq('user_id', userId);
                            } else {
                                await window.supabase
                                    .from('notifications')
                                    .delete()
                                    .eq('id', notificationId)
                                    .eq('user_id', userId);
                            }
                        }
                    }

                    // 配列から削除
                    if (window.notifications) {
                        const index = window.notifications.findIndex(n => n.id == notificationId);
                        if (index !== -1) {
                            window.notifications.splice(index, 1);
                        }
                    }

                    // UIから削除
                    if (element) {
                        await this.animateDelete(element);
                    }

                    completed++;
                    this.updateProgressBar(progressBar, (completed / count) * 100);
                }

                // 選択をクリア
                this.selectedNotifications.clear();
                this.updateSelectedCount();
                
                // バッジを更新
                this.updateNotificationBadge();
                
                // 成功メッセージ
                this.showSuccessMessage(`${count}件の通知を削除しました`);

            } catch (error) {
                console.error('[NotificationDelete] 一括削除エラー:', error);
                this.showErrorMessage('一部の通知の削除に失敗しました');
            } finally {
                this.deleteInProgress = false;
                this.removeProgressBar(progressBar);
                
                // 全選択チェックボックスをリセット
                const selectAllCheckbox = document.getElementById('selectAllCheckbox');
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = false;
                }
            }
        }

        /**
         * 一括既読
         */
        async batchMarkAsRead() {
            if (this.selectedNotifications.size === 0) {
                this.showWarningMessage('通知を選択してください');
                return;
            }

            const count = this.selectedNotifications.size;
            
            try {
                // 選択された通知を既読にする
                for (const notificationId of this.selectedNotifications) {
                    if (window.notificationReadManager) {
                        const element = document.querySelector(`[data-id="${notificationId}"]`);
                        await window.notificationReadManager.markAsRead(notificationId, element);
                    }
                }

                // 選択をクリア
                this.selectedNotifications.clear();
                this.updateSelectedCount();
                
                // 成功メッセージ
                this.showSuccessMessage(`${count}件の通知を既読にしました`);

                // 全選択チェックボックスをリセット
                const selectAllCheckbox = document.getElementById('selectAllCheckbox');
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = false;
                }

            } catch (error) {
                console.error('[NotificationDelete] 一括既読エラー:', error);
                this.showErrorMessage('一部の通知の既読処理に失敗しました');
            }
        }

        /**
         * 削除アニメーション
         */
        async animateDelete(element) {
            return new Promise(resolve => {
                element.style.transition = 'all 0.3s ease-out';
                element.style.transform = 'translateX(100%)';
                element.style.opacity = '0';
                
                setTimeout(() => {
                    element.remove();
                    
                    // グループが空になったら非表示
                    document.querySelectorAll('.notifications-group').forEach(group => {
                        const items = group.querySelectorAll('.notification-item-full');
                        if (items.length === 0) {
                            group.style.display = 'none';
                        }
                    });
                    
                    resolve();
                }, 300);
            });
        }

        /**
         * 選択数を更新
         */
        updateSelectedCount() {
            const count = this.selectedNotifications.size;
            const selectedCount = document.getElementById('selectedCount');
            
            if (selectedCount) {
                selectedCount.textContent = `${count}件選択`;
            }

            // ツールバーの表示/非表示
            const toolbar = document.getElementById('batchActionToolbar');
            if (toolbar) {
                toolbar.classList.toggle('active', count > 0);
            }
        }

        /**
         * 確認ダイアログを表示
         */
        async showConfirmDialog(message) {
            return new Promise(resolve => {
                const dialog = document.createElement('div');
                dialog.className = 'confirm-dialog-overlay';
                dialog.innerHTML = `
                    <div class="confirm-dialog">
                        <div class="confirm-dialog-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h3>確認</h3>
                        <p>${message}</p>
                        <div class="confirm-dialog-buttons">
                            <button class="btn btn-outline" onclick="this.closest('.confirm-dialog-overlay').remove(); window.__confirmResult = false;">
                                キャンセル
                            </button>
                            <button class="btn btn-primary danger" onclick="this.closest('.confirm-dialog-overlay').remove(); window.__confirmResult = true;">
                                削除
                            </button>
                        </div>
                    </div>
                `;

                document.body.appendChild(dialog);

                // ボタンクリックを待つ
                const checkResult = setInterval(() => {
                    if (window.__confirmResult !== undefined) {
                        clearInterval(checkResult);
                        const result = window.__confirmResult;
                        delete window.__confirmResult;
                        resolve(result);
                    }
                }, 50);
            });
        }

        /**
         * プログレスバーを作成
         */
        createProgressBar() {
            const progressBar = document.createElement('div');
            progressBar.className = 'delete-progress-bar';
            progressBar.innerHTML = `
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: 0%"></div>
                </div>
                <span class="progress-bar-text">削除中...</span>
            `;

            document.body.appendChild(progressBar);
            return progressBar;
        }

        /**
         * プログレスバーを更新
         */
        updateProgressBar(progressBar, percentage) {
            const fill = progressBar.querySelector('.progress-bar-fill');
            if (fill) {
                fill.style.width = `${percentage}%`;
            }
        }

        /**
         * プログレスバーを削除
         */
        removeProgressBar(progressBar) {
            if (progressBar) {
                progressBar.classList.add('fade-out');
                setTimeout(() => progressBar.remove(), 300);
            }
        }

        /**
         * 各種メッセージ表示
         */
        showSuccessMessage(message) {
            this.showMessage(message, 'success');
        }

        showErrorMessage(message) {
            this.showMessage(message, 'error');
        }

        showWarningMessage(message) {
            this.showMessage(message, 'warning');
        }

        showMessage(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `message-notification ${type}`;
            
            const icons = {
                success: 'fa-check-circle',
                error: 'fa-exclamation-circle',
                warning: 'fa-exclamation-triangle',
                info: 'fa-info-circle'
            };
            
            notification.innerHTML = `
                <i class="fas ${icons[type]}"></i>
                <span>${message}</span>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => notification.classList.add('show'), 10);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        /**
         * バッジを更新
         */
        updateNotificationBadge() {
            const unreadCount = window.notifications ? window.notifications.filter(n => n.unread).length : 0;
            const badges = document.querySelectorAll('.notification-badge');
            
            badges.forEach(badge => {
                badge.textContent = unreadCount;
                badge.style.display = unreadCount > 0 ? 'flex' : 'none';
            });
        }

        /**
         * 現在のユーザーIDを取得
         */
        async getCurrentUserId() {
            if (window.notificationSupabaseManager) {
                return window.notificationSupabaseManager.userId;
            }

            try {
                if (window.supabase) {
                    const { data: { user } } = await window.supabase.auth.getUser();
                    if (user) return user.id;
                }

                const userData = localStorage.getItem('user_data');
                if (userData) {
                    const parsed = JSON.parse(userData);
                    return parsed.id || parsed.user_id;
                }

                return 'test-user-id';
            } catch (error) {
                console.error('[NotificationDelete] ユーザーID取得エラー:', error);
                return null;
            }
        }
    }

    // スタイルを追加
    const style = document.createElement('style');
    style.textContent = `
        /* 削除ボタン */
        .notification-delete-btn {
            background: none;
            border: none;
            padding: var(--space-xs);
            cursor: pointer;
            color: var(--text-secondary);
            font-size: 0.875rem;
            transition: var(--transition-base);
            opacity: 0.7;
        }

        .notification-delete-btn:hover {
            color: var(--danger-color);
            opacity: 1;
        }

        .notification-item-actions {
            position: absolute;
            top: var(--space-lg);
            right: var(--space-lg);
        }

        /* チェックボックス */
        .notification-checkbox-wrapper {
            position: absolute;
            left: var(--space-md);
            top: 50%;
            transform: translateY(-50%);
            display: none;
        }

        .batch-mode .notification-checkbox-wrapper {
            display: block;
        }

        .batch-mode .notification-item-full {
            padding-left: calc(var(--space-xl) + 24px);
        }

        /* 一括操作ツールバー */
        .batch-action-toolbar {
            background: white;
            border-radius: var(--radius-lg);
            padding: var(--space-md) var(--space-lg);
            margin-bottom: var(--space-lg);
            box-shadow: var(--shadow-sm);
            display: none;
            justify-content: space-between;
            align-items: center;
        }

        .batch-action-toolbar.active {
            display: flex;
        }

        .batch-action-left {
            display: flex;
            align-items: center;
            gap: var(--space-lg);
        }

        .select-all-wrapper {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            cursor: pointer;
        }

        .selected-count {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .batch-action-right {
            display: flex;
            gap: var(--space-sm);
        }

        /* 削除アニメーション */
        .notification-item-full.deleting {
            pointer-events: none;
            opacity: 0.5;
        }

        /* 確認ダイアログ */
        .confirm-dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease;
        }

        .confirm-dialog {
            background: white;
            border-radius: var(--radius-lg);
            padding: var(--space-xl);
            max-width: 400px;
            width: 90%;
            text-align: center;
            animation: slideUp 0.3s ease;
        }

        .confirm-dialog-icon {
            font-size: 3rem;
            color: var(--warning-color);
            margin-bottom: var(--space-md);
        }

        .confirm-dialog h3 {
            font-size: 1.25rem;
            margin-bottom: var(--space-sm);
        }

        .confirm-dialog p {
            color: var(--text-secondary);
            margin-bottom: var(--space-lg);
        }

        .confirm-dialog-buttons {
            display: flex;
            gap: var(--space-sm);
            justify-content: center;
        }

        /* プログレスバー */
        .delete-progress-bar {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            min-width: 300px;
        }

        .progress-bar-container {
            height: 8px;
            background: var(--bg-secondary);
            border-radius: var(--radius-full);
            overflow: hidden;
            margin-bottom: var(--space-sm);
        }

        .progress-bar-fill {
            height: 100%;
            background: var(--primary-color);
            transition: width 0.3s ease;
        }

        .progress-bar-text {
            display: block;
            text-align: center;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        /* メッセージ通知 */
        .message-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            color: var(--text-primary);
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
            border-left: 4px solid;
        }

        .message-notification.show {
            opacity: 1;
            transform: translateY(0);
        }

        .message-notification.success {
            border-color: var(--success-color);
        }

        .message-notification.success i {
            color: var(--success-color);
        }

        .message-notification.error {
            border-color: var(--danger-color);
        }

        .message-notification.error i {
            color: var(--danger-color);
        }

        .message-notification.warning {
            border-color: var(--warning-color);
        }

        .message-notification.warning i {
            color: var(--warning-color);
        }

        .message-notification i {
            font-size: 1.25rem;
        }

        /* 危険ボタン */
        .btn.danger,
        .btn-outline.danger {
            background: var(--danger-color);
            border-color: var(--danger-color);
            color: white;
        }

        .btn-outline.danger {
            background: transparent;
            color: var(--danger-color);
        }

        .btn.danger:hover,
        .btn-outline.danger:hover {
            background: #dc2626;
            border-color: #dc2626;
            color: white;
        }

        /* アニメーション */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .fade-out {
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        /* モバイル対応 */
        @media (max-width: 768px) {
            .batch-action-toolbar {
                flex-direction: column;
                gap: var(--space-md);
            }

            .batch-action-left,
            .batch-action-right {
                width: 100%;
                justify-content: center;
            }

            .message-notification {
                left: 20px;
                right: 20px;
            }
        }
    `;
    document.head.appendChild(style);

    // バッチモードを有効にする
    const notificationsPage = document.querySelector('.notifications-page');
    if (notificationsPage) {
        notificationsPage.classList.add('batch-mode');
    }

    // 初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.notificationDeleteManager = new NotificationDeleteManager();
        });
    } else {
        setTimeout(() => {
            window.notificationDeleteManager = new NotificationDeleteManager();
        }, 2500);
    }

})();