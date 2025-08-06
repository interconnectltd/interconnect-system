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

    console.log('[SupabaseWaitFix] Supabase参照の修正を適用しました');
})();