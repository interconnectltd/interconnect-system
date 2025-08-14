/**
 * Dashboard Stat Card Renderer
 * 統計カードのHTML生成を管理
 */

(function() {
    'use strict';

    class DashboardStatRenderer {
        /**
         * 統計カードHTMLを生成
         */
        generateStatCardsHTML(stats) {
            return `
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${this.formatNumber(stats.total_members || 0)}</div>
                        <div class="stat-label">総メンバー数</div>
                        <div class="stat-change ${stats.member_growth_percentage >= 0 ? 'positive' : 'negative'}">
                            <i class="fas fa-arrow-${stats.member_growth_percentage >= 0 ? 'up' : 'down'}"></i>
                            <span>${Math.abs(stats.member_growth_percentage || 0)}% 前月比</span>
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.monthly_events || 0}</div>
                        <div class="stat-label">今月のイベント</div>
                        <div class="stat-change ${stats.event_increase >= 0 ? 'positive' : 'negative'}">
                            <i class="fas fa-arrow-${stats.event_increase >= 0 ? 'up' : 'down'}"></i>
                            <span>${Math.abs(stats.event_increase || 0)}イベント${stats.event_increase >= 0 ? '増加' : '減少'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-handshake"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.matching_success || 0}</div>
                        <div class="stat-label">マッチング成功数</div>
                        <div class="stat-change positive">
                            <i class="fas fa-arrow-up"></i>
                            <span>${stats.matching_success_percentage || 23}% 増加</span>
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-envelope"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.unread_messages || 0}</div>
                        <div class="stat-label">未読メッセージ</div>
                        <div class="stat-change ${stats.message_decrease_percentage > 0 ? 'negative' : 'positive'}">
                            <i class="fas fa-arrow-${stats.message_decrease_percentage > 0 ? 'down' : 'up'}"></i>
                            <span>${Math.abs(stats.message_decrease_percentage || 5)}% ${stats.message_decrease_percentage > 0 ? '減少' : '増加'}</span>
                        </div>
                    </div>
                </div>
            `;
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
    }

    // グローバルに公開
    window.dashboardStatRenderer = new DashboardStatRenderer();

})();