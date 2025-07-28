/**
 * Dashboard Message Calculator Fix
 * メッセージテーブルのフィールドエラーを修正
 */

(function() {
    'use strict';

    // 既存のgetUnreadMessageCountメソッドを上書き
    if (window.dashboardMessageCalculator) {
        window.dashboardMessageCalculator.getUnreadMessageCount = async function() {
            const cacheKey = 'unread_messages';
            
            // キャッシュチェック
            const cached = this.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
                return cached.value;
            }

            try {
                // 現在のユーザーID取得
                const { data: { user } } = await window.supabase.auth.getUser();
                if (!user) {
                    console.warn('[MessageCalculator] ユーザーが見つかりません');
                    return 0;
                }

                const userId = user.id;
                console.log('[MessageCalculator] 未読メッセージを確認中:', userId);

                // まずテーブル構造を確認
                const { data: sampleData, error: sampleError } = await window.supabase
                    .from('messages')
                    .select('*')
                    .limit(1);

                let count = 0;

                if (!sampleError && sampleData && sampleData.length > 0) {
                    const columns = Object.keys(sampleData[0]);
                    console.log('[MessageCalculator] messagesテーブルのカラム:', columns);

                    // フィールド構造を判定
                    let query = window.supabase.from('messages').select('*', { count: 'exact', head: true });
                    
                    // 受信者フィールドの判定
                    if (columns.includes('recipient_id')) {
                        query = query.eq('recipient_id', userId);
                    } else if (columns.includes('to_user_id')) {
                        query = query.eq('to_user_id', userId);
                    } else if (columns.includes('receiver_id')) {
                        query = query.eq('receiver_id', userId);
                    }

                    // 既読フィールドの判定
                    if (columns.includes('is_read')) {
                        query = query.eq('is_read', false);
                    } else if (columns.includes('read_at')) {
                        query = query.is('read_at', null);
                    } else if (columns.includes('read')) {
                        query = query.eq('read', false);
                    }

                    const { count: messageCount, error } = await query;

                    if (!error) {
                        count = messageCount || 0;
                        console.log('[MessageCalculator] 未読メッセージ数:', count);
                    } else {
                        console.error('[MessageCalculator] クエリエラー:', error);
                        // エラーの場合、より汎用的なクエリを試す
                        const { count: altCount } = await window.supabase
                            .from('messages')
                            .select('*', { count: 'exact', head: true })
                            .or(`recipient_id.eq.${userId},to_user_id.eq.${userId},receiver_id.eq.${userId}`);
                        
                        count = altCount || 0;
                    }
                } else {
                    console.warn('[MessageCalculator] messagesテーブルにアクセスできません');
                    
                    // messagesテーブルが存在しない場合、user_activitiesから推測
                    const { count: notificationCount } = await window.supabase
                        .from('user_activities')
                        .select('*', { count: 'exact', head: true })
                        .eq('activity_type', 'message_received')
                        .eq('user_id', userId)
                        .is('read_at', null);
                    
                    count = notificationCount || 0;
                }
                
                // キャッシュに保存
                this.cache.set(cacheKey, {
                    value: count,
                    timestamp: Date.now()
                });

                return count;

            } catch (error) {
                console.error('[MessageCalculator] getUnreadMessageCount エラー:', error);
                return 0;
            }
        }.bind(window.dashboardMessageCalculator);

        // 月次比較も修正
        window.dashboardMessageCalculator.getMonthlyMessageStats = async function(monthOffset = 0) {
            const cacheKey = `messages_month_${monthOffset}`;
            
            // キャッシュチェック
            const cached = this.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
                return cached.value;
            }

            try {
                const now = new Date();
                const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
                const nextMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);
                
                // 月の開始日と終了日
                const startDate = this.formatDate(targetMonth);
                const endDate = this.formatDate(new Date(nextMonth - 1));

                // テーブル構造を確認
                const { data: sampleData } = await window.supabase
                    .from('messages')
                    .select('*')
                    .limit(1);

                let count = 0;

                if (sampleData && sampleData.length > 0) {
                    const columns = Object.keys(sampleData[0]);
                    
                    // 日付フィールドを特定
                    let dateField = 'created_at';
                    if (columns.includes('sent_at')) {
                        dateField = 'sent_at';
                    } else if (columns.includes('timestamp')) {
                        dateField = 'timestamp';
                    }

                    const { count: messageCount, error } = await window.supabase
                        .from('messages')
                        .select('*', { count: 'exact', head: true })
                        .gte(dateField, startDate)
                        .lte(dateField, endDate);

                    if (!error) {
                        count = messageCount || 0;
                    }
                }

                // キャッシュに保存
                this.cache.set(cacheKey, {
                    value: count,
                    timestamp: Date.now()
                });

                return count;

            } catch (error) {
                console.error('[MessageCalculator] getMonthlyMessageStats エラー:', error);
                return 0;
            }
        }.bind(window.dashboardMessageCalculator);
    }

    console.log('[MessageCalculatorFix] フィールド自動検出機能を適用しました');

})();