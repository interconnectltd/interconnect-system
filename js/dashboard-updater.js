/**
 * Dashboard Real-time Updater
 * ダッシュボードのリアルタイム更新システム
 */

(function() {
    'use strict';

    /**
     * ダッシュボード更新システム
     */
    class DashboardUpdater {
        constructor() {
            this.updateInterval = 30000; // 30秒間隔
            this.fastUpdateInterval = 5000; // 5秒間隔（緊急時）
            this.intervalId = null;
            this.isUpdating = false;
            this.updateCount = 0;
            this.subscriptions = [];
            this.retryCount = 0;
            this.maxRetries = 3;
            
            // 更新設定
            this.config = {
                enableAutoUpdate: true,
                enableRealtimeSubscription: true,
                enableVisibilityUpdate: true,
                enableRetry: true
            };
        }

        /**
         * 初期化
         */
        async init() {
            console.log('[DashboardUpdater] Initializing...');

            try {
                // 依存関係の確認
                await this.waitForDependencies();
                
                // 初回データ読み込み
                await this.loadInitialData();
                
                // 自動更新開始
                if (this.config.enableAutoUpdate) {
                    this.startAutoUpdate();
                }
                
                // リアルタイム購読開始
                if (this.config.enableRealtimeSubscription) {
                    this.subscribeToRealtime();
                }
                
                // イベントリスナー設定
                this.setupEventListeners();
                
                console.log('[DashboardUpdater] Initialized successfully');
                
            } catch (error) {
                console.error('[DashboardUpdater] Initialization failed:', error);
                this.handleInitializationError(error);
            }
        }

        /**
         * 依存関係の待機
         */
        async waitForDependencies() {
            const dependencies = [
                { name: 'supabase', obj: () => window.supabase },
                { name: 'dashboardStats', obj: () => window.dashboardStats },
                { name: 'dashboardUI', obj: () => window.dashboardUI }
            ];

            for (const dep of dependencies) {
                await this.waitForDependency(dep.name, dep.obj);
            }

            // dashboardStatsの初期化を待機
            if (!window.dashboardStats.initialized) {
                await window.dashboardStats.init();
            }

            console.log('[DashboardUpdater] All dependencies ready');
        }

        /**
         * 個別依存関係の待機
         */
        waitForDependency(name, checkFunction) {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error(`Dependency ${name} not found within timeout`));
                }, 10000); // 10秒タイムアウト

                const check = () => {
                    if (checkFunction()) {
                        clearTimeout(timeout);
                        console.log(`[DashboardUpdater] ${name} dependency ready`);
                        resolve();
                    } else {
                        setTimeout(check, 100);
                    }
                };

                check();
            });
        }

        /**
         * 初回データ読み込み
         */
        async loadInitialData() {
            console.log('[DashboardUpdater] Loading initial data...');
            
            try {
                // UIローディング状態を表示
                window.dashboardUI.showLoadingState('.stats-container', '統計データを読み込んでいます...');
                window.dashboardUI.showLoadingState('.activity-list', 'アクティビティを読み込んでいます...');
                window.dashboardUI.showLoadingState('.event-list', 'イベント情報を読み込んでいます...');

                // 全データを並行取得
                const [stats, activities, events] = await Promise.all([
                    window.dashboardStats.fetchDashboardStats(),
                    window.dashboardStats.fetchRecentActivities(),
                    window.dashboardStats.fetchUpcomingEvents()
                ]);

                // UI更新
                await this.updateUI(stats, activities, events);
                
                console.log('[DashboardUpdater] Initial data loaded successfully');
                this.retryCount = 0; // 成功時はリトライカウントをリセット
                
            } catch (error) {
                console.error('[DashboardUpdater] Initial data loading failed:', error);
                await this.handleLoadError(error);
            }
        }

        /**
         * UI更新
         */
        async updateUI(stats, activities, events) {
            try {
                // 統計カード更新
                if (stats) {
                    window.dashboardUI.updateStatCards(stats);
                    window.dashboardUI.updateNotificationBadges(stats);
                }

                // アクティビティ更新
                if (activities && activities.length > 0) {
                    window.dashboardUI.renderRecentActivities(activities);
                } else {
                    window.dashboardUI.showEmptyState('.activity-list', '最近のアクティビティはありません');
                }

                // イベント更新
                if (events && events.length > 0) {
                    window.dashboardUI.renderUpcomingEvents(events);
                } else {
                    window.dashboardUI.showEmptyState('.event-list', '予定されているイベントはありません');
                }

                // ボタンハンドラーの初期化
                window.dashboardUI.initializeButtonHandlers();

                this.updateCount++;
                console.log(`[DashboardUpdater] UI updated (count: ${this.updateCount})`);

            } catch (error) {
                console.error('[DashboardUpdater] UI update failed:', error);
                throw error;
            }
        }

        /**
         * 自動更新開始
         */
        startAutoUpdate() {
            if (this.intervalId) {
                this.stopAutoUpdate();
            }

            console.log(`[DashboardUpdater] Starting auto-update (${this.updateInterval}ms interval)`);
            
            this.intervalId = setInterval(() => {
                this.performUpdate();
            }, this.updateInterval);
        }

        /**
         * 自動更新停止
         */
        stopAutoUpdate() {
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
                console.log('[DashboardUpdater] Auto-update stopped');
            }
        }

        /**
         * 更新実行
         */
        async performUpdate() {
            if (this.isUpdating) {
                console.log('[DashboardUpdater] Update already in progress, skipping');
                return;
            }

            this.isUpdating = true;
            
            try {
                console.log('[DashboardUpdater] Performing scheduled update...');
                
                // データ取得
                const [stats, activities, events] = await Promise.all([
                    window.dashboardStats.fetchDashboardStats(),
                    window.dashboardStats.fetchRecentActivities(),
                    window.dashboardStats.fetchUpcomingEvents()
                ]);

                // UI更新
                await this.updateUI(stats, activities, events);
                
                this.retryCount = 0; // 成功時はリトライカウントをリセット
                
            } catch (error) {
                console.error('[DashboardUpdater] Scheduled update failed:', error);
                await this.handleUpdateError(error);
            } finally {
                this.isUpdating = false;
            }
        }

        /**
         * 強制更新
         */
        async forceRefresh() {
            console.log('[DashboardUpdater] Force refresh requested');
            
            // キャッシュクリア
            window.dashboardStats.clearCache();
            
            // 即座に更新実行
            await this.performUpdate();
        }

        /**
         * リアルタイム購読
         */
        subscribeToRealtime() {
            if (!window.supabase) {
                console.warn('[DashboardUpdater] Supabase not available for realtime');
                return;
            }

            console.log('[DashboardUpdater] Setting up realtime subscriptions...');

            try {
                // 統計データの変更を監視
                const statsSubscription = window.supabase
                    .channel('dashboard_stats_changes')
                    .on('postgres_changes', 
                        { event: '*', schema: 'public', table: 'dashboard_stats' },
                        (payload) => {
                            console.log('[DashboardUpdater] Stats data changed:', payload);
                            this.handleRealtimeUpdate('stats', payload);
                        }
                    )
                    .subscribe();

                // アクティビティの変更を監視
                const activitiesSubscription = window.supabase
                    .channel('user_activities_changes')
                    .on('postgres_changes',
                        { event: 'INSERT', schema: 'public', table: 'user_activities' },
                        (payload) => {
                            console.log('[DashboardUpdater] New activity:', payload);
                            this.handleRealtimeUpdate('activities', payload);
                        }
                    )
                    .subscribe();

                // イベントの変更を監視
                const eventsSubscription = window.supabase
                    .channel('events_changes')
                    .on('postgres_changes',
                        { event: '*', schema: 'public', table: 'events' },
                        (payload) => {
                            console.log('[DashboardUpdater] Events data changed:', payload);
                            this.handleRealtimeUpdate('events', payload);
                        }
                    )
                    .subscribe();

                this.subscriptions = [statsSubscription, activitiesSubscription, eventsSubscription];
                console.log('[DashboardUpdater] Realtime subscriptions active');

            } catch (error) {
                console.warn('[DashboardUpdater] Realtime subscription setup failed:', error);
            }
        }

        /**
         * リアルタイム更新処理
         */
        async handleRealtimeUpdate(type, payload) {
            console.log(`[DashboardUpdater] Handling realtime update (${type}):`, payload);
            
            try {
                // キャッシュクリア
                window.dashboardStats.clearCache();
                
                // 少し遅延してから更新（複数の変更を一括処理）
                setTimeout(() => {
                    this.performUpdate();
                }, 1000);
                
            } catch (error) {
                console.error('[DashboardUpdater] Realtime update handling failed:', error);
            }
        }

        /**
         * イベントリスナー設定
         */
        setupEventListeners() {
            // ページ可視性変更
            if (this.config.enableVisibilityUpdate) {
                document.addEventListener('visibilitychange', () => {
                    if (!document.hidden) {
                        console.log('[DashboardUpdater] Page became visible, refreshing data');
                        setTimeout(() => this.performUpdate(), 500);
                    }
                });
            }

            // ウィンドウフォーカス
            window.addEventListener('focus', () => {
                console.log('[DashboardUpdater] Window focused, refreshing data');
                setTimeout(() => this.performUpdate(), 500);
            });

            // オンライン状態変更
            window.addEventListener('online', () => {
                console.log('[DashboardUpdater] Back online, refreshing data');
                this.performUpdate();
            });

            // ウィンドウサイズ変更（レスポンシブ対応）
            window.addEventListener('resize', debounce(() => {
                window.dashboardUI.checkResponsiveLayout();
            }, 250));

            console.log('[DashboardUpdater] Event listeners set up');
        }

        /**
         * 初期化エラー処理
         */
        async handleInitializationError(error) {
            console.error('[DashboardUpdater] Initialization error handling:', error);
            
            // フォールバック表示
            window.dashboardUI.showErrorState('.stats-container', 
                'ダッシュボードの初期化に失敗しました');
            window.dashboardUI.showErrorState('.activity-list', 
                'アクティビティの読み込みに失敗しました');
            window.dashboardUI.showErrorState('.event-list', 
                'イベント情報の読み込みに失敗しました');
        }

        /**
         * 読み込みエラー処理
         */
        async handleLoadError(error) {
            this.retryCount++;
            
            if (this.config.enableRetry && this.retryCount <= this.maxRetries) {
                console.log(`[DashboardUpdater] Retrying data load (${this.retryCount}/${this.maxRetries})...`);
                
                // 指数バックオフで再試行
                const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 10000);
                setTimeout(() => {
                    this.loadInitialData();
                }, delay);
                
            } else {
                console.error('[DashboardUpdater] Max retries reached, showing error state');
                
                window.dashboardUI.showErrorState('.stats-container', 
                    'データの読み込みに失敗しました');
                window.dashboardUI.showErrorState('.activity-list', 
                    'アクティビティの読み込みに失敗しました');
                window.dashboardUI.showErrorState('.event-list', 
                    'イベント情報の読み込みに失敗しました');
            }
        }

        /**
         * 更新エラー処理
         */
        async handleUpdateError(error) {
            this.retryCount++;
            
            if (this.retryCount <= this.maxRetries) {
                console.log(`[DashboardUpdater] Update failed, will retry in next cycle (${this.retryCount}/${this.maxRetries})`);
                
                // 一時的に更新間隔を短くする
                if (this.retryCount >= 2) {
                    this.stopAutoUpdate();
                    this.updateInterval = this.fastUpdateInterval;
                    this.startAutoUpdate();
                }
                
            } else {
                console.error('[DashboardUpdater] Multiple update failures detected');
                window.dashboardUI.showToast('データ更新に問題が発生しています', 'error');
            }
        }

        /**
         * 設定更新
         */
        updateConfig(newConfig) {
            this.config = { ...this.config, ...newConfig };
            console.log('[DashboardUpdater] Config updated:', this.config);
            
            // 設定に応じて動作を調整
            if (!this.config.enableAutoUpdate && this.intervalId) {
                this.stopAutoUpdate();
            } else if (this.config.enableAutoUpdate && !this.intervalId) {
                this.startAutoUpdate();
            }
        }

        /**
         * 統計情報取得
         */
        getStats() {
            return {
                updateCount: this.updateCount,
                isUpdating: this.isUpdating,
                retryCount: this.retryCount,
                intervalId: this.intervalId,
                subscriptions: this.subscriptions.length,
                config: this.config
            };
        }

        /**
         * クリーンアップ
         */
        destroy() {
            console.log('[DashboardUpdater] Destroying...');
            
            // 自動更新停止
            this.stopAutoUpdate();
            
            // リアルタイム購読解除
            this.subscriptions.forEach(subscription => {
                if (subscription && subscription.unsubscribe) {
                    subscription.unsubscribe();
                }
            });
            this.subscriptions = [];
            
            // フラグリセット
            this.isUpdating = false;
            this.retryCount = 0;
            
            console.log('[DashboardUpdater] Destroyed');
        }
    }

    /**
     * デバウンス関数
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // グローバルに公開
    window.DashboardUpdater = DashboardUpdater;
    window.dashboardUpdater = new DashboardUpdater();

    console.log('[DashboardUpdater] Module loaded');

})();