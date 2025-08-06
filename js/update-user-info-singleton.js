/**
 * updateUserInfo実行をシングルトンパターンで完全管理
 */

(function() {
    'use strict';

    console.log('[UpdateUserInfoSingleton] 初期化開始');

    // グローバルなフラグとタイマー
    window._updateUserInfoState = {
        isRunning: false,
        lastRun: 0,
        minInterval: 5000, // 最小実行間隔 5秒
        pendingUpdate: false,
        executionCount: 0
    };

    // 元のupdateUserInfo関数を保存
    let originalUpdateUserInfo = null;

    // DOMContentLoadedを待って初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wrapUpdateUserInfo);
    } else {
        wrapUpdateUserInfo();
    }

    function wrapUpdateUserInfo() {
        // 少し待ってから実行（dashboard.jsが読み込まれるのを待つ）
        setTimeout(() => {
            if (window.updateDashboardUserInfo && !originalUpdateUserInfo) {
                console.log('[UpdateUserInfoSingleton] updateDashboardUserInfo関数をラップします');
                originalUpdateUserInfo = window.updateDashboardUserInfo;
                
                // ラップした関数に置き換え
                window.updateDashboardUserInfo = function() {
                    const now = Date.now();
                    const state = window._updateUserInfoState;
                    
                    // 実行中の場合はスキップ
                    if (state.isRunning) {
                        console.log('[UpdateUserInfoSingleton] 既に実行中のためスキップ');
                        state.pendingUpdate = true;
                        return;
                    }
                    
                    // 最小間隔チェック
                    if (now - state.lastRun < state.minInterval) {
                        console.log('[UpdateUserInfoSingleton] 最小実行間隔未満のためスキップ', {
                            lastRun: new Date(state.lastRun).toISOString(),
                            nextAllowed: new Date(state.lastRun + state.minInterval).toISOString()
                        });
                        state.pendingUpdate = true;
                        
                        // 後で実行
                        setTimeout(() => {
                            if (state.pendingUpdate && !state.isRunning) {
                                state.pendingUpdate = false;
                                window.updateDashboardUserInfo();
                            }
                        }, state.minInterval - (now - state.lastRun));
                        return;
                    }
                    
                    // 実行開始
                    state.isRunning = true;
                    state.lastRun = now;
                    state.executionCount++;
                    state.pendingUpdate = false;
                    
                    console.log(`[UpdateUserInfoSingleton] 実行開始 (${state.executionCount}回目)`);
                    
                    try {
                        // 元の関数を実行
                        const result = originalUpdateUserInfo.apply(this, arguments);
                        
                        // Promiseの場合は完了を待つ
                        if (result && typeof result.then === 'function') {
                            result.then(() => {
                                state.isRunning = false;
                                console.log('[UpdateUserInfoSingleton] 非同期実行完了');
                            }).catch((error) => {
                                state.isRunning = false;
                                console.error('[UpdateUserInfoSingleton] 非同期実行エラー:', error);
                            });
                        } else {
                            // 同期実行の場合は即座にフラグをリセット
                            setTimeout(() => {
                                state.isRunning = false;
                                console.log('[UpdateUserInfoSingleton] 同期実行完了');
                            }, 100);
                        }
                        
                        return result;
                    } catch (error) {
                        state.isRunning = false;
                        console.error('[UpdateUserInfoSingleton] 実行エラー:', error);
                        throw error;
                    }
                };
                
                console.log('[UpdateUserInfoSingleton] updateDashboardUserInfo関数のラップ完了');
            }
            
            // updateUserInfo関数も同様にラップ（もし存在すれば）
            if (typeof window.updateUserInfo === 'function') {
                window.updateUserInfo = window.updateDashboardUserInfo;
            }
        }, 100);
    }

    // デバッグ用関数
    window.getUpdateUserInfoState = function() {
        return {
            ...window._updateUserInfoState,
            lastRunFormatted: new Date(window._updateUserInfoState.lastRun).toISOString()
        };
    };

    console.log('[UpdateUserInfoSingleton] スクリプト読み込み完了');

})();