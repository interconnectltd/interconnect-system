/**
 * Dashboard Loading Fix
 * ダッシュボードのローディング問題を修正
 */

(function() {
    'use strict';
    
    console.log('[DashboardFix] ローディング修正開始');
    
    // Supabaseクライアントの初期化を待つ
    function waitForSupabase() {
        return new Promise((resolve) => {
            if (window.supabase) {
                resolve();
                return;
            }
            
            // supabaseReadyイベントを待つ
            window.addEventListener('supabaseReady', () => {
                resolve();
            });
            
            // タイムアウト後も確認
            setTimeout(() => {
                if (window.supabase) {
                    resolve();
                }
            }, 3000);
        });
    }
    
    // 統計データの初期化
    async function initializeStats() {
        await waitForSupabase();
        
        if (!window.supabase) {
            console.error('[DashboardFix] Supabaseが初期化されていません');
            showFallbackData();
            return;
        }
        
        try {
            // 統計を更新
            if (window.dashboardMemberCalculator) {
                const memberStats = await window.dashboardMemberCalculator.calculateMemberStats();
                updateMemberCard(memberStats);
            }
            
            if (window.dashboardEventCalculator) {
                const eventStats = await window.dashboardEventCalculator.calculateEventStats();
                updateEventCard(eventStats);
            }
            
            if (window.dashboardMatchingCalculator) {
                const matchingStats = await window.dashboardMatchingCalculator.calculateMatchingStats();
                updateMatchingCard(matchingStats);
            }
            
        } catch (error) {
            console.error('[DashboardFix] 統計更新エラー:', error);
            showFallbackData();
        }
    }
    
    // メンバーカードの更新
    function updateMemberCard(stats) {
        const card = document.querySelector('.stats-container .stat-card:nth-child(1)');
        if (!card) return;
        
        const statValue = card.querySelector('.stat-value');
        const changeSpan = card.querySelector('.stat-change span');
        const changeContainer = card.querySelector('.stat-change');
        
        if (statValue) {
            statValue.textContent = stats.total_members || '0';
        }
        
        if (changeSpan) {
            changeSpan.textContent = stats.member_change_text || '0% 前月比';
        }
        
        if (changeContainer) {
            changeContainer.className = `stat-change ${stats.member_change_type || 'neutral'}`;
            const icon = changeContainer.querySelector('i');
            if (icon) {
                if (stats.member_change_type === 'positive') {
                    icon.className = 'fas fa-arrow-up';
                } else if (stats.member_change_type === 'negative') {
                    icon.className = 'fas fa-arrow-down';
                } else {
                    icon.className = 'fas fa-minus';
                }
            }
        }
    }
    
    // イベントカードの更新
    function updateEventCard(stats) {
        const card = document.querySelector('.stats-container .stat-card:nth-child(2)');
        if (!card) return;
        
        const statValue = card.querySelector('.stat-value');
        const changeSpan = card.querySelector('.stat-change span');
        const changeContainer = card.querySelector('.stat-change');
        
        if (statValue) {
            statValue.textContent = stats.events_this_month || '0';
        }
        
        if (changeSpan) {
            changeSpan.textContent = `${stats.event_change_count || 0}イベント増加`;
        }
        
        if (changeContainer) {
            changeContainer.className = `stat-change ${stats.event_change_type || 'neutral'}`;
        }
    }
    
    // マッチングカードの更新
    function updateMatchingCard(stats) {
        const card = document.querySelector('.stats-container .stat-card:nth-child(3)');
        if (!card) return;
        
        const statValue = card.querySelector('.stat-value');
        const changeSpan = card.querySelector('.stat-change span');
        const changeContainer = card.querySelector('.stat-change');
        
        if (statValue) {
            statValue.textContent = stats.total_connections || '0';
        }
        
        if (changeSpan) {
            changeSpan.textContent = stats.change_percentage 
                ? `${Math.abs(stats.change_percentage)}% ${stats.change_percentage > 0 ? '増加' : '減少'}`
                : '0% 変化なし';
        }
        
        if (changeContainer) {
            changeContainer.className = `stat-change ${stats.change_type || 'neutral'}`;
        }
    }
    
    // フォールバックデータの表示
    function showFallbackData() {
        console.log('[DashboardFix] フォールバックデータを表示');
        
        // 統計カードにデフォルト値を設定
        const statCards = document.querySelectorAll('.stat-card');
        
        if (statCards[0]) {
            const value = statCards[0].querySelector('.stat-value');
            const change = statCards[0].querySelector('.stat-change span');
            if (value) value.textContent = '0';
            if (change) change.textContent = 'データ取得中...';
        }
        
        if (statCards[1]) {
            const value = statCards[1].querySelector('.stat-value');
            const change = statCards[1].querySelector('.stat-change span');
            if (value) value.textContent = '0';
            if (change) change.textContent = 'データ取得中...';
        }
        
        if (statCards[2]) {
            const value = statCards[2].querySelector('.stat-value');
            const change = statCards[2].querySelector('.stat-change span');
            if (value) value.textContent = '0';
            if (change) change.textContent = 'データ取得中...';
        }
    }
    
    // 今後のイベントの修正
    async function fixUpcomingEvents() {
        await waitForSupabase();
        
        if (!window.supabase) {
            console.error('[DashboardFix] Supabaseが利用できません');
            return;
        }
        
        // DashboardUpcomingEventsの再初期化
        if (window.dashboardUpcomingEvents) {
            try {
                await window.dashboardUpcomingEvents.loadUpcomingEvents();
            } catch (error) {
                console.error('[DashboardFix] イベント読み込みエラー:', error);
                
                // エラー時はダミーデータを表示
                const eventList = document.querySelector('.event-list');
                if (eventList) {
                    eventList.innerHTML = `
                        <div class="no-events" style="text-align: center; padding: 40px; color: #999;">
                            <i class="fas fa-calendar-times" style="font-size: 48px; margin-bottom: 16px;"></i>
                            <p>イベントデータを読み込めませんでした</p>
                        </div>
                    `;
                }
            }
        }
    }
    
    // リアルタイム通知の修正
    async function fixRealtimeNotifications() {
        await waitForSupabase();
        
        if (!window.supabase) {
            console.error('[DashboardFix] Supabaseが利用できません');
            return;
        }
        
        // RealtimeNotificationsの再初期化を試みる
        if (!window.realtimeNotifications && window.RealtimeNotifications) {
            try {
                window.realtimeNotifications = new window.RealtimeNotifications();
            } catch (error) {
                console.error('[DashboardFix] リアルタイム通知の初期化エラー:', error);
            }
        }
    }
    
    // 初期化
    function init() {
        // DOMContentLoadedを待つ
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        
        console.log('[DashboardFix] 初期化開始');
        
        // 各修正を実行
        Promise.all([
            initializeStats(),
            fixUpcomingEvents(),
            fixRealtimeNotifications()
        ]).then(() => {
            console.log('[DashboardFix] すべての修正が完了');
        }).catch(error => {
            console.error('[DashboardFix] 修正中にエラー:', error);
        });
    }
    
    // 開始
    init();
    
})();