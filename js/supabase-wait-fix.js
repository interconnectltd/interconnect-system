/**
 * Supabase待機修正
 * 
 * このファイルは、supabaseClientが初期化される前に
 * アクセスしようとするスクリプトのエラーを防ぐために
 * グローバル変数の参照を修正します。
 */

(function() {
    'use strict';

    // supabaseのグローバル参照を防ぐ
    Object.defineProperty(window, 'supabase', {
        get: function() {
            console.warn('[SupabaseWaitFix] window.supabase is deprecated. Use window.supabaseClient instead.');
            return window.supabaseClient;
        },
        set: function(value) {
            console.warn('[SupabaseWaitFix] Setting window.supabase is deprecated. Use window.supabaseClient instead.');
            window.supabaseClient = value;
        },
        configurable: true
    });

    // waitForSupabaseが定義されていない場合のフォールバック
    if (typeof window.waitForSupabase === 'undefined') {
        window.waitForSupabase = function() {
            return new Promise((resolve) => {
                if (window.supabaseClient) {
                    resolve(window.supabaseClient);
                    return;
                }

                let checkCount = 0;
                const checkInterval = setInterval(() => {
                    checkCount++;
                    if (window.supabaseClient) {
                        clearInterval(checkInterval);
                        resolve(window.supabaseClient);
                    } else if (checkCount > 100) { // 10秒後にタイムアウト
                        clearInterval(checkInterval);
                        console.error('[SupabaseWaitFix] Supabase初期化タイムアウト');
                        resolve(null);
                    }
                }, 100);
            });
        };
    }

    console.log('[SupabaseWaitFix] Supabase参照の修正を適用しました');
})();