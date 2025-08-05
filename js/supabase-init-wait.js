/**
 * Supabaseクライアント初期化待機ユーティリティ
 */

(function() {
    'use strict';

    console.log('[SupabaseInitWait] 初期化待機スクリプト読み込み');

    // Supabaseクライアントの初期化を待つPromise
    window.waitForSupabase = function() {
        return new Promise((resolve) => {
            // 既に初期化済みの場合
            if (window.supabaseClient) {
                console.log('[SupabaseInitWait] Supabaseクライアントは既に初期化済み');
                resolve(window.supabaseClient);
                return;
            }

            // 初期化を待つ
            let checkCount = 0;
            const maxChecks = 100; // 最大10秒待つ（100ms x 100）
            
            const checkInterval = setInterval(() => {
                checkCount++;
                
                if (window.supabaseClient) {
                    clearInterval(checkInterval);
                    console.log('[SupabaseInitWait] Supabaseクライアントが初期化されました');
                    resolve(window.supabaseClient);
                } else if (checkCount >= maxChecks) {
                    clearInterval(checkInterval);
                    console.error('[SupabaseInitWait] Supabaseクライアントの初期化タイムアウト');
                    resolve(null);
                }
            }, 100);
        });
    };

    // グローバルに公開（後方互換性のため）
    window.supabase = new Proxy({}, {
        get: function(target, prop) {
            if (window.supabaseClient) {
                return window.supabaseClient[prop];
            }
            console.warn('[SupabaseInitWait] Supabaseクライアントが未初期化です');
            return undefined;
        }
    });

})();