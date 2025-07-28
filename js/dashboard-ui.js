/**
 * Dashboard UI Management
 * ダッシュボードのUI更新とエラーハンドリング
 */

(function() {
    'use strict';

    /**
     * ダッシュボードUI管理クラス
     */
    class DashboardUI {
        constructor() {
            this.loadingStates = new Set();
            this.animationDuration = 300;
        }

        /**
         * 通知バッジ更新
         */
        updateNotificationBadges(stats) {
            // 通知バッジ（ベルアイコン）
            const notificationBadges = document.querySelectorAll('.notification-badge');
            notificationBadges.forEach(badge => {
                const unreadCount = stats.unread_messages || 0;
                if (unreadCount > 0) {
                    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            });

            // メッセージバッジ（サイドバー）
            const messageBadges = document.querySelectorAll('.badge.message-badge');
            messageBadges.forEach(badge => {
                const unreadCount = stats.unread_messages || 0;
                if (unreadCount > 0) {
                    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            });
        }

        /**
         * 統計カード更新
         */
        updateStatCards(stats) {
            console.log('[DashboardUI] Updating stat cards with:', stats);

            // stats-container内のstat-cardを正確に選択
            const statCards = document.querySelectorAll('.stats-container .stat-card');
            console.log(`[DashboardUI] Found ${statCards.length} stat cards`);
            
            const statMappings = [
                {
                    element: statCards[0],
                    value: this.formatNumber(stats.total_members),
                    changeValue: `${stats.member_growth_percentage}% 前月比`,
                    changeType: stats.member_growth_percentage >= 0 ? 'positive' : 'negative'
                },
                {
                    element: statCards[1],
                    value: this.formatNumber(stats.monthly_events),
                    changeValue: `${stats.event_increase}イベント増加`,
                    changeType: stats.event_increase >= 0 ? 'positive' : 'negative'
                },
                {
                    element: statCards[2],
                    value: this.formatNumber(stats.matching_success),
                    changeValue: '23% 増加',
                    changeType: 'positive'
                },
                {
                    element: statCards[3],
                    value: this.formatNumber(stats.unread_messages),
                    changeValue: '5% 減少',
                    changeType: 'negative'
                }
            ];

            statMappings.forEach((mapping, index) => {
                if (!mapping.element) {
                    console.warn(`[DashboardUI] Stat card ${index} not found`);
                    return;
                }
                
                // stat-value要素を直接取得
                const statValueElement = mapping.element.querySelector('.stat-value');
                const changeElement = mapping.element.querySelector('.stat-change span');
                const changeContainer = mapping.element.querySelector('.stat-change');
                
                if (statValueElement) {
                    // 直接値を更新（アニメーション付き）
                    this.animateStatValueElement(statValueElement, mapping.value, () => {
                        // 変化量も更新
                        if (changeElement && changeContainer) {
                            changeElement.textContent = mapping.changeValue;
                            changeContainer.className = `stat-change ${mapping.changeType}`;
                        }
                    });
                } else {
                    console.warn(`[DashboardUI] stat-value element not found in card ${index}`);
                }
            });

            // 更新時刻を保存
            this.updateLastRefreshTime();
        }

        /**
         * 統計値のアニメーション更新（要素を直接受け取る）
         */
        animateStatValueElement(element, newValue, callback) {
            if (!element) {
                console.warn('[DashboardUI] Element is null');
                return;
            }

            const currentValue = parseInt(element.textContent.replace(/[^\d]/g, '')) || 0;
            const targetValue = parseInt(newValue.replace(/[^\d]/g, '')) || 0;

            // 同じ値の場合はアニメーションしない
            if (currentValue === targetValue) {
                if (callback) callback();
                return;
            }

            // カウントアップアニメーション
            const duration = this.animationDuration;
            const startTime = Date.now();
            const difference = targetValue - currentValue;

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // イージング関数（ease-out）
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const currentCount = Math.round(currentValue + (difference * easeOut));

                element.textContent = this.formatNumber(currentCount);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.textContent = newValue;
                    if (callback) callback();
                }
            };

            requestAnimationFrame(animate);
        }

        /**
         * 数値フォーマット
         */
        formatNumber(num) {
            if (num >= 1000) {
                return (num / 1000).toFixed(1).replace('.0', '') + 'k';
            }
            return num.toLocaleString();
        }

        /**
         * アクティビティリスト更新
         */
        renderActivities(activities) {
            console.log('[DashboardUI] Rendering activities:', activities);

            const container = document.querySelector('.activity-list');
            if (!container) {
                console.warn('[DashboardUI] Activity container not found');
                return;
            }

            // ローディング状態をクリア
            this.clearLoadingState(container);

            const html = activities.map(activity => {
                const timeAgo = this.formatTimeAgo(activity.created_at);
                const icon = this.getActivityIcon(activity.activity_type);
                const userName = activity.users?.name || 'ユーザー';

                return `
                    <div class="activity-item" data-activity-id="${activity.id}">
                        <div class="activity-icon">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="activity-content">
                            <p><strong>${userName}</strong>${activity.activity_data?.description || activity.description || activity.activity_type}</p>
                            <span class="activity-time">${timeAgo}</span>
                        </div>
                    </div>
                `;
            }).join('');

            // フェードイン効果でコンテンツを更新
            this.fadeInContent(container, html);
        }

        /**
         * アクティビティアイコン取得
         */
        getActivityIcon(activityType) {
            const iconMap = {
                'join': 'fa-user-plus',
                'event_created': 'fa-calendar-plus',
                'event_completed': 'fa-calendar-check',
                'matching': 'fa-handshake',
                'message': 'fa-envelope',
                'profile_update': 'fa-user-edit',
                'default': 'fa-info-circle'
            };

            return iconMap[activityType] || iconMap.default;
        }

        /**
         * イベントリスト更新
         */
        renderUpcomingEvents(events) {
            console.log('[DashboardUI] Rendering upcoming events:', events);

            const container = document.querySelector('.event-list');
            if (!container) {
                console.warn('[DashboardUI] Event container not found');
                return;
            }

            // ローディング状態をクリア
            this.clearLoadingState(container);

            const html = events.map(event => {
                const eventDate = new Date(event.event_date);
                const dateDisplay = {
                    date: eventDate.getDate(),
                    month: `${eventDate.getMonth() + 1}月`,
                    year: eventDate.getFullYear()
                };

                return `
                    <div class="event-item" data-event-id="${event.id}">
                        <div class="event-date">
                            <div class="date">${dateDisplay.date}</div>
                            <div class="month">${dateDisplay.month}</div>
                        </div>
                        <div class="event-details">
                            <h4>${event.title}</h4>
                            <p>${event.time || '時間未定'} ${event.location || '場所未定'}</p>
                            <button class="btn-small btn-primary" 
                                    onclick="window.dashboardUI.viewEventDetails('${event.id}')"
                                    data-event-id="${event.id}">
                                詳細を見る
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            // フェードイン効果でコンテンツを更新
            this.fadeInContent(container, html);
        }

        /**
         * 時間経過表示フォーマット
         */
        formatTimeAgo(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffMinutes < 1) {
                return 'たった今';
            } else if (diffMinutes < 60) {
                return `${diffMinutes}分前`;
            } else if (diffHours < 24) {
                return `${diffHours}時間前`;
            } else if (diffDays < 7) {
                return `${diffDays}日前`;
            } else {
                return date.toLocaleDateString('ja-JP', {
                    month: 'short',
                    day: 'numeric'
                });
            }
        }

        /**
         * フェードイン効果でコンテンツ更新
         */
        fadeInContent(container, html) {
            // フェードアウト
            container.style.opacity = '0.5';
            container.style.transition = `opacity ${this.animationDuration}ms ease`;

            setTimeout(() => {
                container.innerHTML = html;
                
                // フェードイン
                container.style.opacity = '1';
                
                // トランジション削除
                setTimeout(() => {
                    container.style.transition = '';
                }, this.animationDuration);
            }, this.animationDuration / 2);
        }

        /**
         * ローディング状態表示
         */
        showLoadingState(elementSelector, message = 'データを読み込んでいます...') {
            const element = document.querySelector(elementSelector);
            if (!element) return;

            this.loadingStates.add(elementSelector);
            
            element.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <div class="loading-message">${message}</div>
                </div>
            `;
            
            element.classList.add('is-loading');
        }

        /**
         * ローディング状態クリア
         */
        clearLoadingState(element) {
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            
            if (element) {
                element.classList.remove('is-loading');
                this.loadingStates.delete(element);
            }
        }

        /**
         * エラー状態表示
         */
        showErrorState(elementSelector, message = 'データの読み込みに失敗しました') {
            const element = document.querySelector(elementSelector);
            if (!element) return;
            
            element.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="error-message">${message}</div>
                    <button class="btn-small btn-outline retry-btn" onclick="window.dashboardUpdater.forceRefresh()">
                        <i class="fas fa-redo"></i> 再試行
                    </button>
                </div>
            `;
            
            element.classList.add('has-error');
        }

        /**
         * 空状態表示
         */
        showEmptyState(elementSelector, message = 'データがありません') {
            const element = document.querySelector(elementSelector);
            if (!element) return;
            
            element.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-inbox"></i>
                    </div>
                    <div class="empty-message">${message}</div>
                </div>
            `;
            
            element.classList.add('is-empty');
        }

        /**
         * 最終更新時刻更新
         */
        updateLastRefreshTime() {
            const now = new Date();
            const timeString = now.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit'
            });

            // 更新時刻表示エリアがある場合
            const refreshElement = document.querySelector('.last-refresh-time');
            if (refreshElement) {
                refreshElement.textContent = `最終更新: ${timeString}`;
            }

            console.log(`[DashboardUI] Dashboard updated at ${timeString}`);
        }

        /**
         * ボタン機能の初期化
         */
        initializeButtonHandlers() {
            // 「すべて見る」ボタン（アクティビティ）
            const viewAllActivitiesBtn = document.querySelector('.content-card:nth-child(1) .btn-text');
            if (viewAllActivitiesBtn) {
                viewAllActivitiesBtn.onclick = () => this.viewAllActivities();
            }

            // 「カレンダー」ボタン（イベント）
            const calendarBtn = document.querySelector('.content-card:nth-child(2) .btn-text');
            if (calendarBtn) {
                calendarBtn.onclick = () => this.viewCalendar();
            }

            console.log('[DashboardUI] Button handlers initialized');
        }

        /**
         * 全アクティビティ表示
         */
        viewAllActivities() {
            console.log('[DashboardUI] Navigating to all activities');
            // 将来的にactivities.htmlページを作成
            window.location.href = 'activities.html';
        }

        /**
         * カレンダー表示
         */
        viewCalendar() {
            console.log('[DashboardUI] Navigating to calendar');
            window.location.href = 'events.html#calendar';
        }

        /**
         * イベント詳細表示
         */
        viewEventDetails(eventId) {
            console.log('[DashboardUI] Viewing event details:', eventId);
            window.location.href = `events.html#event-${eventId}`;
        }

        /**
         * 通知バッジ更新
         */
        updateNotificationBadges(stats) {
            // サイドバーの通知バッジ
            const sidebarBadges = document.querySelectorAll('.sidebar-link .badge');
            sidebarBadges.forEach(badge => {
                if (badge.textContent === '3') { // メッセージバッジ
                    badge.textContent = stats.unread_messages || 0;
                    badge.style.display = stats.unread_messages > 0 ? 'inline' : 'none';
                }
            });

            // ヘッダーの通知バッジ
            const headerBadges = document.querySelectorAll('.notification-badge');
            headerBadges.forEach(badge => {
                const totalNotifications = (stats.unread_messages || 0) + 
                                          (stats.pending_invitations || 0);
                badge.textContent = totalNotifications;
                badge.style.display = totalNotifications > 0 ? 'inline' : 'none';
            });
        }

        /**
         * レスポンシブ対応チェック
         */
        checkResponsiveLayout() {
            const isMobile = window.innerWidth <= 768;
            const isTablet = window.innerWidth <= 1024;

            document.body.classList.toggle('is-mobile', isMobile);
            document.body.classList.toggle('is-tablet', isTablet);
        }

        /**
         * エラー処理統合
         */
        handleError(error, context = 'Unknown') {
            console.error(`[DashboardUI] Error in ${context}:`, error);
            
            // エラー通知表示（将来的に実装）
            this.showToast(`${context}でエラーが発生しました`, 'error');
        }

        /**
         * トースト通知表示（将来の実装用）
         */
        showToast(message, type = 'info') {
            console.log(`[DashboardUI] Toast (${type}):`, message);
            // 将来的にトースト通知システムを実装
        }

        /**
         * イベント詳細を表示
         */
        viewEventDetails(eventId) {
            console.log('[DashboardUI] Viewing event details:', eventId);
            
            // イベント詳細ページへ遷移
            // TODO: イベント詳細ページが未実装の場合は、モーダルで表示
            if (window.location.pathname.includes('dashboard.html')) {
                // 簡易的にアラートで表示（後でモーダルに変更）
                this.showEventModal(eventId);
            } else {
                window.location.href = `events.html?id=${eventId}`;
            }
        }

        /**
         * イベントモーダル表示（簡易版）
         */
        async showEventModal(eventId) {
            try {
                // Supabaseからイベント詳細を取得
                if (window.supabase) {
                    const { data: event, error } = await window.supabase
                        .from('events')
                        .select('*')
                        .eq('id', eventId)
                        .single();
                    
                    if (error) {
                        alert('イベント情報の取得に失敗しました');
                        return;
                    }
                    
                    if (event) {
                        const eventDate = new Date(event.event_date);
                        const dateStr = eventDate.toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                        
                        alert(`イベント詳細\n\nタイトル: ${event.title}\n日付: ${dateStr}\n時間: ${event.time || '未定'}\n場所: ${event.location || '未定'}\n\n詳細: ${event.description || '詳細情報なし'}`);
                    }
                } else {
                    alert('イベント詳細ページは準備中です');
                }
            } catch (error) {
                console.error('[DashboardUI] Error showing event modal:', error);
                alert('イベント詳細の表示中にエラーが発生しました');
            }
        }

        /**
         * ボタンハンドラーの初期化
         */
        initializeButtonHandlers() {
            // イベント詳細ボタンのハンドラー（既に設定済みの場合はスキップ）
            const eventButtons = document.querySelectorAll('[data-event-id]');
            eventButtons.forEach(button => {
                if (!button.hasAttribute('data-handler-set')) {
                    button.setAttribute('data-handler-set', 'true');
                    // onclickが既に設定されているので追加の処理は不要
                }
            });
        }
    }

    // グローバルに公開
    window.DashboardUI = DashboardUI;
    window.dashboardUI = new DashboardUI();

    console.log('[DashboardUI] Module loaded');

})();