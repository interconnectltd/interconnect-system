/**
 * Dashboard Early Fix
 * Supabaseクライアント初期化前のエラーを防ぐ
 */

// グローバルにSupabaseのプレースホルダーを設定
if (!window.supabase) {
    console.log('[DashboardEarlyFix] Supabaseプレースホルダーを設定');
    
    window.supabase = {
        _pending: true,
        _queue: [],
        
        // fromメソッドのプレースホルダー
        from: function(table) {
            const promise = new Promise((resolve, reject) => {
                this._queue.push({ table, resolve, reject });
            });
            
            // チェーン可能なメソッドを返す
            const methods = ['select', 'insert', 'update', 'delete', 'upsert'];
            const filters = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'order', 'limit', 'range'];
            
            const chainable = {};
            
            [...methods, ...filters].forEach(method => {
                chainable[method] = function() {
                    return chainable;
                };
            });
            
            // 実行時はキューに入れる
            chainable.then = promise.then.bind(promise);
            chainable.catch = promise.catch.bind(promise);
            
            return chainable;
        },
        
        auth: {
            getUser: async function() {
                // localStorageからユーザー情報を取得
                const userStr = localStorage.getItem('supabase_user');
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        return { data: { user }, error: null };
                    } catch (e) {
                        return { data: { user: null }, error: e };
                    }
                }
                return { data: { user: null }, error: null };
            },
            
            onAuthStateChange: function(callback) {
                // プレースホルダー
                return {
                    data: { subscription: { unsubscribe: () => {} } },
                    error: null
                };
            }
        }
    };
}

// 実際のSupabaseクライアントが初期化されたら、キューを処理
window.addEventListener('supabaseReady', function() {
    console.log('[DashboardEarlyFix] 実際のSupabaseクライアントで置き換え');
    
    // キューに入っているリクエストを処理
    if (window.supabase._queue) {
        const queue = window.supabase._queue;
        
        // 少し遅延させて実行
        setTimeout(() => {
            queue.forEach(item => {
                console.log('[DashboardEarlyFix] キューのリクエストを処理:', item.table);
                // エラーで解決（データベース接続が必要なため）
                item.reject(new Error('Database not initialized during placeholder phase'));
            });
        }, 100);
    }
});