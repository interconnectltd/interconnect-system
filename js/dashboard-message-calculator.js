/**
 * Dashboard Message Calculator
 * メッセージ統計の正確な計算
 */

(function() {
    'use strict';

    class DashboardMessageCalculator {
        constructor() {
            this.cache = new Map();
            this.cacheTTL = 30000; // 30秒
            this.currentUser = null;
        }

        /**
         * 現在のユーザーを取得
         */
        async getCurrentUser() {
            if (this.currentUser) return this.currentUser;
            
            try {
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                this.currentUser = user;
                return user;
            } catch (error) {
                console.error('[MessageCalculator] ユーザー取得エラー:', error);
                return null;
            }
        }

        /**
         * メッセージ統計を計算
         */
        async calculateMessageStats() {
            // console.log('[MessageCalculator] メッセージ統計を計算中...');
            
            try {
                const user = await this.getCurrentUser();
                if (!user) {
                    // console.log('[MessageCalculator] ユーザーが認証されていません');
                    return this.getDefaultStats();
                }

                // 未読メッセージ数を取得
                const unreadCount = await this.getUnreadMessageCount(user.id);
                
                // 今日と昨日の未読メッセージ数を取得（変化率計算用）
                const [todayUnread, yesterdayUnread] = await Promise.all([
                    this.getDailyUnreadCount(user.id, 0),  // 今日
                    this.getDailyUnreadCount(user.id, -1)  // 昨日
                ]);

                // 増減率を計算
                let messageChangePercentage = 0;
                let changeType = 'neutral';
                
                if (yesterdayUnread > 0) {
                    // 未読が減った場合はポジティブ
                    const changeRate = ((yesterdayUnread - todayUnread) / yesterdayUnread) * 100;
                    messageChangePercentage = Math.round(Math.abs(changeRate));
                    
                    if (todayUnread < yesterdayUnread) {
                        changeType = 'positive'; // 未読が減った
                    } else if (todayUnread > yesterdayUnread) {
                        changeType = 'negative'; // 未読が増えた
                    }
                } else if (todayUnread > 0) {
                    messageChangePercentage = 100;
                    changeType = 'negative'; // 新たに未読が発生
                }

                const stats = {
                    unread_messages: unreadCount,
                    today_unread: todayUnread,
                    yesterday_unread: yesterdayUnread,
                    message_change_percentage: messageChangePercentage,
                    message_change_type: changeType,
                    message_change_text: messageChangePercentage > 0 
                        ? `${messageChangePercentage}% ${changeType === 'positive' ? '減少' : '増加'}`
                        : '変化なし',
                    calculated_at: new Date().toISOString()
                };

                // console.log('[MessageCalculator] 計算結果:', stats);
                return stats;

            } catch (error) {
                console.error('[MessageCalculator] エラー:', error);
                return this.getDefaultStats();
            }
        }

        /**
         * デフォルトの統計値
         */
        getDefaultStats() {
            return {
                unread_messages: 0,
                message_change_percentage: 0,
                message_change_type: 'neutral',
                message_change_text: 'データなし'
            };
        }

        /**
         * 未読メッセージ数を取得
         */
        async getUnreadMessageCount(userId) {
            const cacheKey = `unread_messages_${userId}`;
            
            // キャッシュチェック
            const cached = this.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
                return cached.value;
            }

            try {
                // メッセージテーブルの構造を確認
                const tableStructure = await this.checkMessageTableStructure();
                
                let count = 0;
                
                if (tableStructure.hasMessages) {
                    if (tableStructure.hasRecipientId && tableStructure.hasIsRead) {
                        // 標準的な構造
                        const { count: unreadCount, error } = await window.supabase
                            .from('messages')
                            .select('*', { count: 'exact', head: true })
                            .eq('recipient_id', userId)
                            .eq('is_read', false);
                        
                        if (!error) {
                            count = unreadCount || 0;
                        }
                    } else if (tableStructure.hasToUserId && tableStructure.hasReadAt) {
                        // 別の構造パターン
                        const { count: unreadCount, error } = await window.supabase
                            .from('messages')
                            .select('*', { count: 'exact', head: true })
                            .eq('to_user_id', userId)
                            .is('read_at', null);
                        
                        if (!error) {
                            count = unreadCount || 0;
                        }
                    } else {
                        // 構造が不明な場合は全メッセージをカウント
                        const { count: totalCount } = await window.supabase
                            .from('messages')
                            .select('*', { count: 'exact', head: true });
                        
                        count = Math.min(totalCount || 0, 99); // 最大99に制限
                    }
                }
                
                // キャッシュに保存
                this.cache.set(cacheKey, {
                    value: count,
                    timestamp: Date.now()
                });

                // console.log(`[MessageCalculator] 未読メッセージ数: ${count}`);
                return count;

            } catch (error) {
                console.error('[MessageCalculator] getUnreadMessageCount エラー:', error);
                return 0;
            }
        }

        /**
         * 特定日の未読メッセージ数を取得
         */
        async getDailyUnreadCount(userId, dayOffset = 0) {
            try {
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + dayOffset);
                const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
                const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
                
                const tableStructure = await this.checkMessageTableStructure();
                
                if (!tableStructure.hasMessages) return 0;
                
                let query = window.supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', startOfDay.toISOString())
                    .lte('created_at', endOfDay.toISOString());
                
                if (tableStructure.hasRecipientId && tableStructure.hasIsRead) {
                    query = query.eq('recipient_id', userId).eq('is_read', false);
                } else if (tableStructure.hasToUserId && tableStructure.hasReadAt) {
                    query = query.eq('to_user_id', userId).is('read_at', null);
                }
                
                const { count, error } = await query;
                
                if (!error) {
                    return count || 0;
                }
                
                return 0;
                
            } catch (error) {
                console.error('[MessageCalculator] getDailyUnreadCount エラー:', error);
                return 0;
            }
        }

        /**
         * メッセージテーブルの構造を確認
         */
        async checkMessageTableStructure() {
            const cacheKey = 'message_table_structure';
            
            // キャッシュチェック
            const cached = this.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < 300000) { // 5分間キャッシュ
                return cached.value;
            }

            try {
                const { data, error } = await window.supabase
                    .from('messages')
                    .select('*')
                    .limit(1);

                const structure = {
                    hasMessages: false,
                    hasRecipientId: false,
                    hasIsRead: false,
                    hasToUserId: false,
                    hasReadAt: false,
                    columns: []
                };

                if (!error && data && data.length > 0) {
                    structure.hasMessages = true;
                    structure.columns = Object.keys(data[0]);
                    structure.hasRecipientId = 'recipient_id' in data[0];
                    structure.hasIsRead = 'is_read' in data[0];
                    structure.hasToUserId = 'to_user_id' in data[0];
                    structure.hasReadAt = 'read_at' in data[0];
                    
                    // console.log('[MessageCalculator] メッセージテーブル構造:', structure);
                }

                // キャッシュに保存
                this.cache.set(cacheKey, {
                    value: structure,
                    timestamp: Date.now()
                });

                return structure;

            } catch (error) {
                console.error('[MessageCalculator] テーブル構造確認エラー:', error);
                return {
                    hasMessages: false,
                    hasRecipientId: false,
                    hasIsRead: false,
                    hasToUserId: false,
                    hasReadAt: false,
                    columns: []
                };
            }
        }
    }

    // グローバルに公開
    window.dashboardMessageCalculator = new DashboardMessageCalculator();

    // DashboardUIと統合
    if (window.dashboardUI) {
        const originalUpdateStatCards = window.dashboardUI.updateStatCards;
        
        window.dashboardUI.updateStatCards = async function(stats) {
            try {
                // メッセージ統計を計算
                const messageStats = await window.dashboardMessageCalculator.calculateMessageStats();
                
                // 統計をマージ
                const enhancedStats = {
                    ...stats,
                    unread_messages: messageStats.unread_messages,
                    message_change_percentage: messageStats.message_change_percentage,
                    message_change_text: messageStats.message_change_text,
                    message_change_type: messageStats.message_change_type
                };

                // メッセージカード専用の更新
                const messageCard = document.querySelector('.stats-container .stat-card:nth-child(4)');
                if (messageCard) {
                    const statValue = messageCard.querySelector('.stat-value');
                    const changeSpan = messageCard.querySelector('.stat-change span');
                    const changeContainer = messageCard.querySelector('.stat-change');
                    const changeIcon = changeContainer?.querySelector('i');
                    
                    if (statValue) {
                        statValue.textContent = messageStats.unread_messages;
                    }
                    
                    if (changeSpan) {
                        changeSpan.textContent = messageStats.message_change_text;
                    }
                    
                    if (changeContainer) {
                        // 未読メッセージの場合、減少がpositive（良い）、増加がnegative（悪い）
                        const displayType = messageStats.message_change_type === 'neutral' ? 'neutral' :
                                          messageStats.message_change_type === 'positive' ? 'positive' : 'negative';
                        
                        changeContainer.className = `stat-change ${displayType}`;
                        
                        // アイコンも更新
                        if (changeIcon) {
                            if (displayType === 'positive') {
                                changeIcon.className = 'fas fa-arrow-down';
                            } else if (displayType === 'negative') {
                                changeIcon.className = 'fas fa-arrow-up';
                            } else {
                                changeIcon.className = 'fas fa-minus';
                            }
                        }
                    }
                }

                // 元の関数を呼び出し
                return originalUpdateStatCards.call(this, enhancedStats);
                
            } catch (error) {
                console.error('[MessageCalculator] updateStatCards エラー:', error);
                return originalUpdateStatCards.call(this, stats);
            }
        }.bind(window.dashboardUI);
    }

    // console.log('[MessageCalculator] モジュールが読み込まれました');

})();