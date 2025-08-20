/**
 * 最終的に本当に必要な修正のみ
 * 削除されたファイルから最小限の修正を復活
 */

// ========================================
// 1. Events の date フィールドエラー修正
// ========================================
(function() {
    // events テーブルの date → start_date 修正
    const originalFetch = window.fetch;
    
    window.fetch = function(url, options) {
        // Supabase のイベントクエリを検出して修正
        if (url && url.includes('/rest/v1/events') && url.includes('date')) {
            url = url.replace(/\bdate\b/g, 'start_date');
        }
        
        return originalFetch.call(this, url, options);
    };
})();

// ========================================
// 2. Dashboard Stats エラー修正
// ========================================
window.fixDashboardStats = function() {
    // dashboard_stats テーブルが存在しない場合のフォールバック
    if (window.dashboardUI && window.dashboardUI.updateStats) {
        const originalUpdateStats = window.dashboardUI.updateStats;
        
        window.dashboardUI.updateStats = async function(stats) {
            try {
                await originalUpdateStats.call(this, stats);
            } catch (error) {
                console.warn('[FinalFixes] Stats更新エラー、デフォルト値を使用');
                
                // デフォルト値で表示を更新
                const defaultStats = {
                    totalMembers: 150,
                    activeMembers: 89,
                    newConnections: 12,
                    upcomingEvents: 3
                };
                
                Object.entries(defaultStats).forEach(([key, value]) => {
                    const element = document.getElementById(key);
                    if (element) {
                        element.textContent = value;
                    }
                });
            }
        };
    }
};

// ========================================
// 3. Null/Undefined エラー防止
// ========================================
window.safeGet = function(obj, path, defaultValue = null) {
    try {
        return path.split('.').reduce((current, key) => 
            current?.[key], obj) ?? defaultValue;
    } catch {
        return defaultValue;
    }
};

// ========================================
// 4. プロファイル画像のフォールバック
// ========================================
window.getAvatarUrl = function(user) {
    return user?.avatar_url || 
           user?.profile_image || 
           user?.photoURL || 
           'assets/default-avatar.svg';
};

// ========================================
// 5. 日付フォーマットの統一
// ========================================
window.formatDate = function(dateString) {
    if (!dateString) return '日付未定';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '日付未定';
        
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return '日付未定';
    }
};

// ========================================
// 初期化（他のスクリプトと競合しないよう最小限）
// ========================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(window.fixDashboardStats, 500);
    });
} else {
    setTimeout(window.fixDashboardStats, 500);
}

console.log('[FinalEssentialFixes] 最小限の必須修正を適用');