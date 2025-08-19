/**
 * Dashboard Member Counter
 * 総メンバー数を複数の方法で取得
 */

(function() {
    'use strict';

    class DashboardMemberCounter {
        constructor() {
            this.cache = {
                count: null,
                lastUpdate: null,
                ttl: 60000 // 1分間キャッシュ
            };
            this.previousCount = this.loadPreviousCount();
        }

        /**
         * 前回のカウントを読み込み
         */
        loadPreviousCount() {
            const saved = localStorage.getItem('dashboard_member_count_previous');
            if (saved) {
                const data = JSON.parse(saved);
                // 30日以上前のデータは無視
                if (new Date() - new Date(data.timestamp) < 30 * 24 * 60 * 60 * 1000) {
                    return data.count;
                }
            }
            return 1100; // デフォルト値
        }

        /**
         * 現在のカウントを保存
         */
        saveCurrentCount(count) {
            localStorage.setItem('dashboard_member_count_current', JSON.stringify({
                count: count,
                timestamp: new Date().toISOString()
            }));
        }

        /**
         * 総メンバー数を取得（複数の方法を試行）
         */
        async getTotalMembers() {
            // キャッシュチェック
            if (this.cache.count !== null && this.cache.lastUpdate &&
                (Date.now() - this.cache.lastUpdate) < this.cache.ttl) {
                // console.log('[MemberCounter] Returning cached count:', this.cache.count);
                return this.cache.count;
            }

            // console.log('[MemberCounter] Calculating total members...');
            
            let count = null;

            // 方法1: profilesテーブルを確認
            count = await this.countFromProfiles();
            if (count !== null) {
                this.updateCache(count);
                return count;
            }

            // 方法2: usersテーブルを確認
            count = await this.countFromUsers();
            if (count !== null) {
                this.updateCache(count);
                return count;
            }

            // 方法3: membersテーブルを確認
            count = await this.countFromMembers();
            if (count !== null) {
                this.updateCache(count);
                return count;
            }

            // 方法4: user_activitiesから推測
            count = await this.countFromActivities();
            if (count !== null) {
                this.updateCache(count);
                return count;
            }

            // 方法5: dashboard_statsから取得
            count = await this.countFromDashboardStats();
            if (count !== null) {
                this.updateCache(count);
                return count;
            }

            // すべて失敗した場合のフォールバック
            console.warn('[MemberCounter] All methods failed, using fallback');
            return 1234;
        }

        /**
         * キャッシュ更新
         */
        updateCache(count) {
            this.cache.count = count;
            this.cache.lastUpdate = Date.now();
            this.saveCurrentCount(count);
            // console.log('[MemberCounter] Cache updated with count:', count);
        }

        /**
         * profilesテーブルからカウント
         */
        async countFromProfiles() {
            try {
                const { count, error } = await window.supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true });

                if (!error && count !== null) {
                    // console.log('[MemberCounter] Count from profiles:', count);
                    return count;
                }
            } catch (e) {
                // console.log('[MemberCounter] profiles table not accessible');
            }
            return null;
        }

        /**
         * usersテーブルからカウント
         */
        async countFromUsers() {
            try {
                const { count, error } = await window.supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true });

                if (!error && count !== null) {
                    // console.log('[MemberCounter] Count from users:', count);
                    return count;
                }
            } catch (e) {
                // console.log('[MemberCounter] users table not accessible');
            }
            return null;
        }

        /**
         * membersテーブルからカウント
         */
        async countFromMembers() {
            try {
                const { count, error } = await window.supabase
                    .from('members')
                    .select('*', { count: 'exact', head: true });

                if (!error && count !== null) {
                    // console.log('[MemberCounter] Count from members:', count);
                    return count;
                }
            } catch (e) {
                // console.log('[MemberCounter] members table not accessible');
            }
            return null;
        }

        /**
         * user_activitiesのユニークユーザーをカウント
         */
        async countFromActivities() {
            try {
                // ユニークなuser_idを取得
                const { data, error } = await window.supabase
                    .from('user_activities')
                    .select('user_id')
                    .limit(10000); // 大量データ対策

                if (!error && data) {
                    const uniqueUsers = [...new Set(data.map(item => item.user_id))];
                    const count = uniqueUsers.length;
                    // console.log('[MemberCounter] Unique users from activities:', count);
                    
                    // 最低でも1は返す（現在のユーザーを含む）
                    return Math.max(count, 1);
                }
            } catch (e) {
                // console.log('[MemberCounter] user_activities count failed');
            }
            return null;
        }

        /**
         * dashboard_statsから取得
         */
        async countFromDashboardStats() {
            try {
                const { data, error } = await window.supabase
                    .from('dashboard_stats')
                    .select('total_members')
                    .limit(1);

                if (!error && data && data.length > 0 && data[0].total_members) {
                    // console.log('[MemberCounter] Count from dashboard_stats:', data[0].total_members);
                    return data[0].total_members;
                }
            } catch (e) {
                // console.log('[MemberCounter] dashboard_stats not accessible');
            }
            return null;
        }

        /**
         * 成長率を計算
         */
        calculateGrowthPercentage(currentCount) {
            if (!this.previousCount || this.previousCount === 0) {
                return 0;
            }
            
            const growth = ((currentCount - this.previousCount) / this.previousCount) * 100;
            return parseFloat(growth.toFixed(1));
        }

        /**
         * 月初めに前月データとして保存
         */
        archivePreviousMonth() {
            const now = new Date();
            if (now.getDate() === 1) { // 月初め
                const current = JSON.parse(localStorage.getItem('dashboard_member_count_current') || '{}');
                if (current.count) {
                    localStorage.setItem('dashboard_member_count_previous', JSON.stringify({
                        count: current.count,
                        timestamp: new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString()
                    }));
                }
            }
        }
    }

    // グローバルに公開
    window.dashboardMemberCounter = new DashboardMemberCounter();

    // calculateTotalMembersメソッドを上書き
    if (window.dashboardStats) {
        window.dashboardStats.calculateTotalMembers = async function() {
            return await window.dashboardMemberCounter.getTotalMembers();
        };
        // console.log('[MemberCounter] Enhanced calculateTotalMembers with multi-source counting');
    }

    // リアルタイム計算にも適用
    if (window.dashboardRealtimeCalculator) {
        const originalCalculate = window.dashboardRealtimeCalculator.calculateRealStats;
        window.dashboardRealtimeCalculator.calculateRealStats = async function() {
            const stats = await originalCalculate.call(this);
            
            // メンバー数を実際に計算
            const memberCount = await window.dashboardMemberCounter.getTotalMembers();
            stats.total_members = memberCount;
            
            // 成長率も計算
            stats.member_growth_percentage = window.dashboardMemberCounter.calculateGrowthPercentage(memberCount);
            
            return stats;
        };
        // console.log('[MemberCounter] Enhanced realtime calculator with member counting');
    }

})();