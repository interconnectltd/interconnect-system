/**
 * Dashboard UI Fix - 統計カード表示修正
 */

(function() {
    'use strict';

    // DashboardUIのupdateStatCardsメソッドを上書き
    if (window.dashboardUI) {
        const originalUpdateStatCards = window.dashboardUI.updateStatCards;
        
        window.dashboardUI.updateStatCards = function(stats) {
            console.log('[DashboardUIFix] Updating stat cards with:', stats);
            
            const statsContainer = document.querySelector('.stats-container');
            if (!statsContainer) {
                console.error('[DashboardUIFix] Stats container not found');
                return;
            }
            
            // ローディング状態をクリア
            this.clearLoadingState(statsContainer);
            
            // 常に統計カードを再生成（確実に表示するため）
            const statCardsHTML = `
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.total_members || 0}</div>
                        <div class="stat-label">総メンバー数</div>
                        <div class="stat-change ${(stats.member_growth_percentage || 0) >= 0 ? 'positive' : 'negative'}">
                            <i class="fas fa-arrow-${(stats.member_growth_percentage || 0) >= 0 ? 'up' : 'down'}"></i>
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
                        <div class="stat-change ${(stats.event_increase || 0) >= 0 ? 'positive' : 'negative'}">
                            <i class="fas fa-arrow-${(stats.event_increase || 0) >= 0 ? 'up' : 'down'}"></i>
                            <span>${Math.abs(stats.event_increase || 0)}イベント${(stats.event_increase || 0) >= 0 ? '増加' : '減少'}</span>
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
                        <div class="stat-change ${(stats.message_decrease_percentage || 0) > 0 ? 'negative' : 'positive'}">
                            <i class="fas fa-arrow-${(stats.message_decrease_percentage || 0) > 0 ? 'down' : 'up'}"></i>
                            <span>${Math.abs(stats.message_decrease_percentage || 5)}% ${(stats.message_decrease_percentage || 0) > 0 ? '減少' : '増加'}</span>
                        </div>
                    </div>
                </div>
            `;
            
            // HTMLを設定
            statsContainer.innerHTML = statCardsHTML;
            
            // 通知バッジも更新
            this.updateNotificationBadges(stats);
            
            console.log('[DashboardUIFix] Stat cards updated successfully');
        };
        
        console.log('[DashboardUIFix] Applied fixes to dashboardUI.updateStatCards');
    }

})();