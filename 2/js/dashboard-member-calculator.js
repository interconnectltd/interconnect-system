/**
 * Dashboard Member Calculator
 * メンバー統計の正確な計算
 */

(function() {
    'use strict';

    class DashboardMemberCalculator {
        constructor() {
            this.cache = new Map();
            this.cacheTTL = 30000; // 30秒
        }

        /**
         * メンバー統計を計算
         */
        async calculateMemberStats() {
            // console.log('[MemberCalculator] メンバー統計を計算中...');
            
            try {
                // 総メンバー数と先月の新規メンバー数を並行で取得
                const [totalMembers, lastMonthNewMembers, thisMonthNewMembers] = await Promise.all([
                    this.getTotalMemberCount(),
                    this.getMonthlyNewMembers(-1),  // 先月
                    this.getMonthlyNewMembers(0)     // 今月
                ]);

                // 前月比の計算
                let memberChangePercentage = 0;
                if (totalMembers > 0 && lastMonthNewMembers > 0) {
                    // 今月の新規メンバー数を先月と比較
                    memberChangePercentage = Math.round((thisMonthNewMembers / lastMonthNewMembers - 1) * 100);
                } else if (thisMonthNewMembers > 0) {
                    memberChangePercentage = 100;
                }

                // 変化のタイプを判定
                let changeType = 'neutral';
                if (memberChangePercentage > 0) {
                    changeType = 'positive';
                } else if (memberChangePercentage < 0) {
                    changeType = 'negative';
                }

                const stats = {
                    total_members: totalMembers,
                    new_members_this_month: thisMonthNewMembers,
                    new_members_last_month: lastMonthNewMembers,
                    member_change_percentage: Math.abs(memberChangePercentage),
                    member_change_type: changeType,
                    member_change_text: `${Math.abs(memberChangePercentage)}% 前月比`,
                    calculated_at: new Date().toISOString()
                };

                // console.log('[MemberCalculator] 計算結果:', stats);
                return stats;

            } catch (error) {
                console.error('[MemberCalculator] エラー:', error);
                return {
                    total_members: 0,
                    member_change_percentage: 0,
                    member_change_type: 'neutral',
                    member_change_text: 'エラー'
                };
            }
        }

        /**
         * 総メンバー数を取得
         */
        async getTotalMemberCount() {
            const cacheKey = 'total_members';
            
            // キャッシュチェック
            const cached = this.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
                return cached.value;
            }

            try {
                const { count, error } = await window.supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true });

                if (error) {
                    console.error('[MemberCalculator] プロファイル取得エラー:', error);
                    return 0;
                }

                const memberCount = count || 0;
                
                // キャッシュに保存
                this.cache.set(cacheKey, {
                    value: memberCount,
                    timestamp: Date.now()
                });

                // console.log('[MemberCalculator] 総メンバー数:', memberCount);
                return memberCount;

            } catch (error) {
                console.error('[MemberCalculator] getTotalMemberCount エラー:', error);
                return 0;
            }
        }

        /**
         * 特定月の新規メンバー数を取得
         */
        async getMonthlyNewMembers(monthOffset = 0) {
            const cacheKey = `new_members_month_${monthOffset}`;
            
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
                
                // console.log(`[MemberCalculator] ${monthOffset === 0 ? '今月' : '先月'}の新規メンバーを取得: ${startDate} ~ ${endDate}`);

                const { count, error } = await window.supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', startDate)
                    .lte('created_at', endDate);

                if (error) {
                    console.error(`[MemberCalculator] 新規メンバー取得エラー:`, error);
                    return 0;
                }

                const newMemberCount = count || 0;
                
                // キャッシュに保存
                this.cache.set(cacheKey, {
                    value: newMemberCount,
                    timestamp: Date.now()
                });

                // console.log(`[MemberCalculator] ${monthOffset === 0 ? '今月' : '先月'}の新規メンバー数: ${newMemberCount}`);
                return newMemberCount;

            } catch (error) {
                console.error('[MemberCalculator] getMonthlyNewMembers エラー:', error);
                return 0;
            }
        }

        /**
         * 日付をYYYY-MM-DD形式にフォーマット
         */
        formatDate(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }

    // グローバルに公開
    window.dashboardMemberCalculator = new DashboardMemberCalculator();

    // DashboardUIと統合
    if (window.dashboardUI) {
        const originalUpdateStatCards = window.dashboardUI.updateStatCards;
        
        window.dashboardUI.updateStatCards = async function(stats) {
            try {
                // メンバー統計を計算
                const memberStats = await window.dashboardMemberCalculator.calculateMemberStats();
                
                // 統計をマージ
                const enhancedStats = {
                    ...stats,
                    total_members: memberStats.total_members,
                    member_change_percentage: memberStats.member_change_percentage,
                    member_change_text: memberStats.member_change_text,
                    member_change_type: memberStats.member_change_type
                };

                // メンバーカード専用の更新
                const memberCard = document.querySelector('.stats-container .stat-card:nth-child(1)');
                if (memberCard) {
                    const statValue = memberCard.querySelector('.stat-value');
                    const changeSpan = memberCard.querySelector('.stat-change span');
                    const changeContainer = memberCard.querySelector('.stat-change');
                    const changeIcon = changeContainer?.querySelector('i');
                    
                    if (statValue) {
                        // アニメーション付きで値を設定
                        if (window.dashboardStatsInitializer) {
                            window.dashboardStatsInitializer.setStatValue(
                                1, 
                                memberStats.total_members, 
                                memberStats.member_change_text, 
                                memberStats.member_change_type
                            );
                        } else {
                            statValue.textContent = memberStats.total_members.toLocaleString();
                        }
                    }
                    
                    if (changeSpan) {
                        changeSpan.textContent = memberStats.member_change_text;
                    }
                    
                    if (changeContainer) {
                        changeContainer.className = `stat-change ${memberStats.member_change_type}`;
                        
                        // アイコンも更新
                        if (changeIcon) {
                            if (memberStats.member_change_type === 'positive') {
                                changeIcon.className = 'fas fa-arrow-up';
                            } else if (memberStats.member_change_type === 'negative') {
                                changeIcon.className = 'fas fa-arrow-down';
                            } else {
                                changeIcon.className = 'fas fa-minus';
                            }
                        }
                    }
                }

                // 元の関数を呼び出し
                return originalUpdateStatCards.call(this, enhancedStats);
                
            } catch (error) {
                console.error('[MemberCalculator] updateStatCards エラー:', error);
                return originalUpdateStatCards.call(this, stats);
            }
        }.bind(window.dashboardUI);
    }

    // console.log('[MemberCalculator] モジュールが読み込まれました');

})();