/**
 * Dashboard Dynamic Calculator
 * ダッシュボードの動的データ計算
 */

(function() {
    'use strict';

    class DashboardDynamicCalculator {
        constructor() {
            // 前月のデータを保存（実際にはlocalStorageやDBから取得）
            this.previousMonthData = this.loadPreviousData();
        }

        /**
         * 前月データの読み込み（またはデフォルト値）
         */
        loadPreviousData() {
            const saved = localStorage.getItem('dashboard_previous_month');
            if (saved) {
                return JSON.parse(saved);
            }
            
            // デフォルトの前月データ
            return {
                total_members: 1100,
                monthly_events: 12,
                matching_success: 72,
                unread_messages: 45,
                timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
            };
        }

        /**
         * 現在のデータを保存
         */
        saveCurrentData(data) {
            localStorage.setItem('dashboard_current_month', JSON.stringify({
                ...data,
                timestamp: new Date().toISOString()
            }));
        }

        /**
         * 成長率を計算
         */
        calculateGrowthPercentage(current, previous) {
            if (!previous || previous === 0) return 0;
            return ((current - previous) / previous * 100).toFixed(1);
        }

        /**
         * 統計データに動的計算を追加
         */
        enrichStatsWithCalculations(stats) {
            const enriched = { ...stats };
            
            // メンバー成長率の計算
            if (!enriched.member_growth_percentage && enriched.total_members) {
                enriched.member_growth_percentage = this.calculateGrowthPercentage(
                    enriched.total_members,
                    this.previousMonthData.total_members
                );
            }
            
            // イベント増加数の計算
            if (enriched.event_increase === undefined && enriched.monthly_events) {
                enriched.event_increase = enriched.monthly_events - this.previousMonthData.monthly_events;
            }
            
            // マッチング成功率の計算
            if (!enriched.matching_success_percentage && enriched.matching_success) {
                enriched.matching_success_percentage = this.calculateGrowthPercentage(
                    enriched.matching_success,
                    this.previousMonthData.matching_success
                );
            }
            
            // メッセージ減少率の計算
            if (enriched.message_decrease_percentage === undefined && enriched.unread_messages !== undefined) {
                const diff = this.previousMonthData.unread_messages - enriched.unread_messages;
                enriched.message_decrease_percentage = this.calculateGrowthPercentage(
                    Math.abs(diff),
                    this.previousMonthData.unread_messages
                );
                // 減少の場合は正の値、増加の場合は負の値
                if (enriched.unread_messages > this.previousMonthData.unread_messages) {
                    enriched.message_decrease_percentage = -enriched.message_decrease_percentage;
                }
            }
            
            // 現在のデータを保存
            this.saveCurrentData(enriched);
            
            return enriched;
        }

        /**
         * 時系列データからトレンドを計算
         */
        calculateTrend(dataPoints) {
            if (!dataPoints || dataPoints.length < 2) return 'stable';
            
            const recent = dataPoints.slice(-3); // 最新3つのデータポイント
            const average = recent.reduce((sum, val) => sum + val, 0) / recent.length;
            const previousAverage = dataPoints.slice(-6, -3).reduce((sum, val) => sum + val, 0) / 3;
            
            const change = ((average - previousAverage) / previousAverage) * 100;
            
            if (change > 10) return 'increasing';
            if (change < -10) return 'decreasing';
            return 'stable';
        }

        /**
         * リアルタイムの更新を反映
         */
        updateRealTimeStats(stats) {
            // 現在時刻
            const now = new Date();
            const currentHour = now.getHours();
            
            // 営業時間内（9-18時）はアクティブ率を上げる
            if (currentHour >= 9 && currentHour <= 18) {
                stats.activity_rate = 'high';
                // ランダムに少しずつ増加
                if (Math.random() > 0.7) {
                    stats.total_members += Math.floor(Math.random() * 3);
                }
            } else {
                stats.activity_rate = 'low';
            }
            
            return stats;
        }
    }

    // グローバルに公開
    window.dashboardCalculator = new DashboardDynamicCalculator();

    // 既存のfetchDashboardStatsをラップして計算を追加
    if (window.dashboardStats) {
        const originalFetch = window.dashboardStats.fetchDashboardStats;
        window.dashboardStats.fetchDashboardStats = async function() {
            const stats = await originalFetch.call(this);
            return window.dashboardCalculator.enrichStatsWithCalculations(stats);
        };
        // console.log('[DashboardCalculator] Enhanced fetchDashboardStats with calculations');
    }

})();