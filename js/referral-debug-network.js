/**
 * 紹介ページの400エラーデバッグ用
 */

(function() {
    'use strict';

    console.log('[ReferralDebug] ネットワークデバッグ開始');

    // Supabaseのfromメソッドをラップ
    const wrapSupabase = () => {
        if (window.supabaseClient && window.supabaseClient.from) {
            const originalFrom = window.supabaseClient.from;
            
            window.supabaseClient.from = function(table) {
                console.log('[ReferralDebug] テーブルアクセス:', table);
                
                const result = originalFrom.apply(this, arguments);
                const originalSelect = result.select;
                
                if (originalSelect) {
                    result.select = function(columns) {
                        console.log(`[ReferralDebug] SELECT ${columns} FROM ${table}`);
                        
                        // referralsテーブルの問題のあるクエリを検出
                        if (table === 'referrals' && columns && columns.includes('referred_user')) {
                            console.error('[ReferralDebug] ⚠️ 問題のあるreferralsクエリを検出!');
                            console.trace('[ReferralDebug] スタックトレース:');
                            
                            // 修正版のクエリに変更
                            console.warn('[ReferralDebug] クエリを修正: referred_userジョインを削除');
                            return originalSelect.call(this, '*');
                        }
                        
                        return originalSelect.apply(this, arguments);
                    };
                }
                
                return result;
            };
            
            console.log('[ReferralDebug] Supabaseラップ完了');
        }
    };

    // DOMContentLoadedとsupabaseReadyの両方で実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wrapSupabase);
    } else {
        wrapSupabase();
    }

    window.addEventListener('supabaseReady', wrapSupabase);

})();