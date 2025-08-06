/**
 * users テーブル参照エラーの詳細デバッグスクリプト
 */

(function() {
    'use strict';

    console.log('[DEBUG-ENHANCED] users テーブルエラー詳細デバッグ開始');

    // グローバルにデバッグ情報を保存
    window.usersTableDebug = {
        calls: [],
        errors: []
    };

    // Supabaseクライアントの初期化を監視
    let originalSupabaseClient = null;
    let fromMethodWrapped = false;

    // Supabaseクライアントが設定されたら即座にラップ
    Object.defineProperty(window, 'supabaseClient', {
        get: function() {
            return originalSupabaseClient;
        },
        set: function(value) {
            console.log('[DEBUG-ENHANCED] supabaseClient が設定されました');
            originalSupabaseClient = value;
            
            if (value && value.from && !fromMethodWrapped) {
                wrapFromMethod(value);
                fromMethodWrapped = true;
            }
        },
        configurable: true
    });

    function wrapFromMethod(client) {
        const originalFrom = client.from;
        
        client.from = function(table) {
            const callInfo = {
                table: table,
                timestamp: new Date().toISOString(),
                stack: new Error().stack
            };
            
            window.usersTableDebug.calls.push(callInfo);
            
            console.log(`[DEBUG-ENHANCED] Supabase.from('${table}') called at ${callInfo.timestamp}`);
            
            // usersテーブルへのアクセスを検出
            if (table === 'users') {
                console.error('[DEBUG-ENHANCED] ⚠️ USERS TABLE ACCESS DETECTED!');
                console.error('[DEBUG-ENHANCED] Full stack trace:');
                console.error(callInfo.stack);
                
                // エラー情報を保存
                window.usersTableDebug.errors.push(callInfo);
                
                // スタックを解析して呼び出し元を特定
                const stackLines = callInfo.stack.split('\n');
                const callerLine = stackLines[2] || stackLines[1];
                console.error('[DEBUG-ENHANCED] Caller:', callerLine);
                
                // matching-unified.jsからの呼び出しかチェック
                if (callInfo.stack.includes('matching-unified.js')) {
                    console.error('[DEBUG-ENHANCED] ⚠️ Called from matching-unified.js!');
                }
                
                // user_profilesに自動修正
                console.warn('[DEBUG-ENHANCED] Auto-correcting to user_profiles');
                table = 'user_profiles';
            }
            
            // selectメソッドも監視
            const result = originalFrom.call(this, table);
            const originalSelect = result.select;
            
            if (originalSelect) {
                result.select = function(columns) {
                    console.log(`[DEBUG-ENHANCED] .select('${columns}') on table '${table}'`);
                    
                    // エラーメッセージと同じselect句かチェック
                    if (columns && columns.includes('skills,interests,business_challenges')) {
                        console.error('[DEBUG-ENHANCED] ⚠️ Found problematic select clause!');
                        console.error('[DEBUG-ENHANCED] This matches the error message pattern');
                    }
                    
                    return originalSelect.apply(this, arguments);
                };
            }
            
            return result;
        };
        
        console.log('[DEBUG-ENHANCED] Supabase.from() method wrapped successfully');
    }

    // 既にsupabaseClientが存在する場合
    if (window.supabaseClient && window.supabaseClient.from && !fromMethodWrapped) {
        originalSupabaseClient = window.supabaseClient;
        wrapFromMethod(window.supabaseClient);
        fromMethodWrapped = true;
    }

    // デバッグ情報を表示する関数
    window.showUsersTableDebug = function() {
        console.log('[DEBUG-ENHANCED] === USERS TABLE ACCESS SUMMARY ===');
        console.log('Total calls:', window.usersTableDebug.calls.length);
        console.log('Errors found:', window.usersTableDebug.errors.length);
        
        if (window.usersTableDebug.errors.length > 0) {
            console.log('\n[DEBUG-ENHANCED] === ERROR DETAILS ===');
            window.usersTableDebug.errors.forEach((error, index) => {
                console.log(`\nError ${index + 1}:`);
                console.log('Time:', error.timestamp);
                console.log('Table:', error.table);
                console.log('Stack:', error.stack);
            });
        }
        
        console.log('\n[DEBUG-ENHANCED] === ALL TABLE ACCESSES ===');
        const tableCounts = {};
        window.usersTableDebug.calls.forEach(call => {
            tableCounts[call.table] = (tableCounts[call.table] || 0) + 1;
        });
        
        Object.entries(tableCounts).forEach(([table, count]) => {
            console.log(`${table}: ${count} calls`);
        });
    };

    console.log('[DEBUG-ENHANCED] Debug script loaded. Call window.showUsersTableDebug() to see results.');

})();