/**
 * 関数実行トラッカー
 * 重複実行を検出して防止
 */

(function() {
    'use strict';

    window.FunctionTracker = {
        executions: {},
        config: {
            warningThreshold: 2, // 警告を出す実行回数
            blockDuplicates: false, // 重複実行をブロックするか
            trackingFunctions: [
                'updateUserInfo',
                'loadUserProfile', 
                'loadReferralPoints',
                'loadDashboardStats',
                'initializeSupabase',
                'checkAuth'
            ]
        }
    };

    // 関数実行を記録
    function trackExecution(functionName, args) {
        const now = Date.now();
        const key = functionName;
        
        if (!window.FunctionTracker.executions[key]) {
            window.FunctionTracker.executions[key] = {
                count: 0,
                firstCall: now,
                lastCall: null,
                calls: []
            };
        }
        
        const tracker = window.FunctionTracker.executions[key];
        tracker.count++;
        tracker.lastCall = now;
        tracker.calls.push({
            time: now,
            args: args,
            stack: new Error().stack
        });
        
        // 最大10回分の呼び出しを保持
        if (tracker.calls.length > 10) {
            tracker.calls.shift();
        }
        
        // 短時間での重複実行を検出
        if (tracker.count >= window.FunctionTracker.config.warningThreshold) {
            const timeSinceFirst = now - tracker.firstCall;
            if (timeSinceFirst < 5000) { // 5秒以内
                console.warn(
                    `⚠️ [FunctionTracker] ${functionName} が短時間に ${tracker.count} 回実行されています`,
                    `\n初回: ${new Date(tracker.firstCall).toLocaleTimeString()}`,
                    `\n最新: ${new Date(tracker.lastCall).toLocaleTimeString()}`,
                    `\n間隔: ${timeSinceFirst}ms`
                );
                
                // 重複実行をブロック
                if (window.FunctionTracker.config.blockDuplicates && tracker.count > 3) {
                    console.error(`🚫 [FunctionTracker] ${functionName} の重複実行をブロックしました`);
                    return true; // ブロックする
                }
            }
        }
        
        return false; // ブロックしない
    }

    // 特定の関数をラップして追跡
    function wrapFunction(obj, functionName) {
        const original = obj[functionName];
        if (typeof original !== 'function') return;
        
        obj[functionName] = function(...args) {
            const shouldBlock = trackExecution(functionName, args);
            if (shouldBlock) {
                return Promise.resolve(null); // ブロックされた場合
            }
            
            // console.log(`📍 [FunctionTracker] ${functionName} 実行開始`);
            const result = original.apply(this, args);
            
            // Promiseの場合
            if (result && typeof result.then === 'function') {
                return result
                    .then(res => {
                        // console.log(`✅ [FunctionTracker] ${functionName} 完了`);
                        return res;
                    })
                    .catch(err => {
                        console.error(`❌ [FunctionTracker] ${functionName} エラー:`, err);
                        throw err;
                    });
            }
            
            // console.log(`✅ [FunctionTracker] ${functionName} 完了（同期）`);
            return result;
        };
    }

    // 監視対象の関数を自動的にラップ
    function autoWrapFunctions() {
        // グローバル関数
        window.FunctionTracker.config.trackingFunctions.forEach(funcName => {
            if (typeof window[funcName] === 'function') {
                wrapFunction(window, funcName);
                // console.log(`🔍 [FunctionTracker] ${funcName} を追跡対象に追加しました`);
            }
        });
        
        // 遅延読み込みされる関数用のMutationObserver
        const observer = new MutationObserver(() => {
            window.FunctionTracker.config.trackingFunctions.forEach(funcName => {
                if (typeof window[funcName] === 'function' && !window[funcName]._tracked) {
                    wrapFunction(window, funcName);
                    window[funcName]._tracked = true;
                    // console.log(`🔍 [FunctionTracker] ${funcName} を追跡対象に追加しました（遅延）`);
                }
            });
        });
        
        observer.observe(document, { childList: true, subtree: true });
    }

    // ユーティリティ関数
    window.FunctionTracker.utils = {
        // 実行統計を表示
        showStats() {
            // console.log('📊 === 関数実行統計 ===');
            Object.entries(window.FunctionTracker.executions)
                .sort((a, b) => b[1].count - a[1].count)
                .forEach(([name, data]) => {
                    // console.log(
                    //     `${name}: ${data.count}回`,
                    //     `(初回: ${new Date(data.firstCall).toLocaleTimeString()},`,
                    //     `最終: ${new Date(data.lastCall).toLocaleTimeString()})`
                    // );
                });
        },
        
        // 特定関数の詳細を表示
        showDetails(functionName) {
            const data = window.FunctionTracker.executions[functionName];
            if (!data) {
                // console.log(`関数 ${functionName} の実行記録はありません`);
                return;
            }
            
            // console.log(`📋 === ${functionName} 実行詳細 ===`);
            // console.log(`合計実行回数: ${data.count}`);
            // console.log(`初回実行: ${new Date(data.firstCall).toLocaleTimeString()}`);
            // console.log(`最終実行: ${new Date(data.lastCall).toLocaleTimeString()}`);
            // console.log('最近の呼び出し:');
            data.calls.forEach((call, i) => {
                // console.log(`  ${i + 1}. ${new Date(call.time).toLocaleTimeString()}`);
            });
        },
        
        // 追跡をリセット
        reset() {
            window.FunctionTracker.executions = {};
            // console.log('🔄 関数実行追跡をリセットしました');
        },
        
        // 特定の関数を追跡対象に追加
        track(functionName) {
            if (!window.FunctionTracker.config.trackingFunctions.includes(functionName)) {
                window.FunctionTracker.config.trackingFunctions.push(functionName);
                if (typeof window[functionName] === 'function') {
                    wrapFunction(window, functionName);
                    // console.log(`🎯 ${functionName} を追跡対象に追加しました`);
                }
            }
        }
    };

    // ショートカット
    window.ft = window.FunctionTracker.utils;

    // DOMContentLoaded後に自動ラップ
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoWrapFunctions);
    } else {
        setTimeout(autoWrapFunctions, 100);
    }

    // console.log(
        '🎯 関数実行トラッカーが有効になりました\n' +
        '使い方:\n' +
        '  ft.showStats() - 実行統計を表示\n' +
        '  ft.showDetails("関数名") - 詳細を表示\n' +
        '  ft.track("関数名") - 追跡対象に追加\n' +
        '  ft.reset() - 追跡をリセット'
    );

})();