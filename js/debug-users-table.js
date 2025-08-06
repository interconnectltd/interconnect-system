/**
 * users テーブル参照エラーのデバッグスクリプト
 */

(function() {
    'use strict';

    console.log('[DEBUG] users テーブルエラーデバッグ開始');

    // Supabaseクライアントのfromメソッドをラップして監視
    const originalSupabaseReady = window.addEventListener;
    window.addEventListener = function(event, handler) {
        if (event === 'supabaseReady') {
            const wrappedHandler = function() {
                handler.apply(this, arguments);
                
                // supabaseClientが準備できたらfromメソッドをラップ
                if (window.supabaseClient && window.supabaseClient.from) {
                    const originalFrom = window.supabaseClient.from;
                    window.supabaseClient.from = function(table) {
                        console.log('[DEBUG] Supabase.from() called with table:', table);
                        console.trace('[DEBUG] Stack trace for table:', table);
                        
                        // usersテーブルへのアクセスを検出
                        if (table === 'users') {
                            console.error('[DEBUG] ⚠️ USERS TABLE ACCESS DETECTED!');
                            console.trace('[DEBUG] Full stack trace:');
                            
                            // エラーを投げてスタックトレースを取得
                            try {
                                throw new Error('users table access');
                            } catch (e) {
                                console.error('[DEBUG] Error stack:', e.stack);
                            }
                        }
                        
                        return originalFrom.apply(this, arguments);
                    };
                    console.log('[DEBUG] Supabase.from() method wrapped successfully');
                }
            };
            originalSupabaseReady.call(this, event, wrappedHandler);
        } else {
            originalSupabaseReady.apply(this, arguments);
        }
    };

    // matching-unified.jsが読み込まれる前に実行される
    console.log('[DEBUG] Debug script loaded before matching-unified.js');

})();