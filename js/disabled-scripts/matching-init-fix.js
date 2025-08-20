/**
 * マッチング・コネクション機能の初期化修正
 * 削除された重要な初期化コードを復活
 */

(function() {
    'use strict';
    
    console.log('[MatchingInitFix] 初期化修正開始');
    
    // Supabaseの準備状態を追跡
    let supabaseReady = false;
    let domReady = false;
    let initialized = false;
    
    // 初期化を試行
    function tryInitialize() {
        if (supabaseReady && domReady && !initialized) {
            initialized = true;
            console.log('[MatchingInitFix] 条件が揃いました。各モジュールを再初期化します。');
            
            // matching-unified.jsの再初期化
            if (window.initializeMatchingSystem) {
                console.log('[MatchingInitFix] initializeMatchingSystemを実行');
                window.initializeMatchingSystem();
            }
            
            // connections-manager-simple.jsの再初期化
            if (window.connectionsManager && !window.connectionsManager.initialized) {
                console.log('[MatchingInitFix] connectionsManager.init()を実行');
                window.connectionsManager.init();
            }
            
            // 初期化完了イベント
            window.dispatchEvent(new CustomEvent('matchingSystemReady'));
            console.log('[MatchingInitFix] matchingSystemReadyイベントを発火');
        }
    }
    
    // Supabase準備完了を監視
    function checkSupabase() {
        if (window.supabaseClient) {
            console.log('[MatchingInitFix] Supabaseクライアントを検出');
            supabaseReady = true;
            tryInitialize();
            return true;
        }
        return false;
    }
    
    // DOM準備完了を監視
    function checkDOM() {
        if (document.readyState !== 'loading') {
            console.log('[MatchingInitFix] DOMが準備完了');
            domReady = true;
            tryInitialize();
            return true;
        }
        return false;
    }
    
    // 初期チェック
    if (!checkSupabase()) {
        // Supabaseの準備を待つ
        window.addEventListener('supabaseReady', () => {
            console.log('[MatchingInitFix] supabaseReadyイベントを受信');
            supabaseReady = true;
            tryInitialize();
        });
        
        // ポーリングでもチェック（フォールバック）
        const supabaseCheckInterval = setInterval(() => {
            if (checkSupabase()) {
                clearInterval(supabaseCheckInterval);
            }
        }, 100);
        
        // タイムアウト（5秒）
        setTimeout(() => {
            clearInterval(supabaseCheckInterval);
            if (!supabaseReady) {
                console.error('[MatchingInitFix] Supabase初期化タイムアウト');
            }
        }, 5000);
    }
    
    // DOM監視
    if (!checkDOM()) {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[MatchingInitFix] DOMContentLoadedイベントを受信');
            domReady = true;
            tryInitialize();
        });
    }
    
    // 手動初期化コマンド（デバッグ用）
    window.forceInitMatching = function() {
        console.log('[MatchingInitFix] 強制初期化実行');
        supabaseReady = true;
        domReady = true;
        initialized = false;
        tryInitialize();
    };
    
    // デバッグ情報
    window.getMatchingInitStatus = function() {
        return {
            supabaseReady,
            domReady,
            initialized,
            supabaseClient: !!window.supabaseClient,
            connectionsManager: !!window.connectionsManager,
            matchingFunctions: {
                initializeMatchingSystem: !!window.initializeMatchingSystem,
                displayDummyData: !!window.displayDummyData,
                drawRadarChartForUser: !!window.drawRadarChartForUser
            }
        };
    };
    
    console.log('[MatchingInitFix] 初期化修正設定完了');
    console.log('[MatchingInitFix] デバッグ: getMatchingInitStatus()');
    console.log('[MatchingInitFix] 強制初期化: forceInitMatching()');
    
})();