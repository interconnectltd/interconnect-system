/**
 * マッチング機能の初期化修正
 * Supabaseクライアントの非同期読み込みに対応
 */

(function() {
    'use strict';
    
    console.log('[MatchingInit] 初期化修正開始');
    
    // Supabaseの準備状態を追跡
    let supabaseReady = false;
    let domReady = false;
    let initialized = false;
    
    // 初期化を試行
    function tryInitialize() {
        if (supabaseReady && domReady && !initialized) {
            initialized = true;
            console.log('[MatchingInit] 条件が揃いました。初期化を実行します。');
            
            // マッチング機能の再初期化
            if (window.matchingSupabase && typeof window.matchingSupabase.initialize === 'function') {
                console.log('[MatchingInit] MatchingSupabaseを再初期化');
                window.matchingSupabase.initialize();
            }
            
            // レーダーチャートの初期化確認
            setTimeout(() => {
                const cards = document.querySelectorAll('.matching-card');
                console.log(`[MatchingInit] マッチングカード数: ${cards.length}`);
                
                if (cards.length > 0) {
                    // レーダーチャートが無い場合は追加
                    cards.forEach((card, index) => {
                        const container = card.querySelector('.radar-chart-container');
                        if (!container || !container.querySelector('canvas')) {
                            console.log(`[MatchingInit] カード${index + 1}にレーダーチャートを追加`);
                            addRadarChart(card);
                        }
                    });
                }
            }, 1000);
        }
    }
    
    // レーダーチャートを追加
    function addRadarChart(card) {
        try {
            // コンテナを探すか作成
            let container = card.querySelector('.radar-chart-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'radar-chart-container';
                container.style.cssText = 'width: 200px; height: 200px; margin: 10px auto;';
                
                const tags = card.querySelector('.matching-tags');
                if (tags && tags.nextSibling) {
                    tags.parentNode.insertBefore(container, tags.nextSibling);
                } else {
                    const actions = card.querySelector('.matching-actions');
                    if (actions) {
                        card.insertBefore(container, actions);
                    }
                }
            }
            
            // データを生成（実際のデータがある場合はそれを使用）
            const userId = card.querySelector('a[href*="profile.html"]')?.href.match(/user=(\d+)/)?.[1];
            const data = card.radarChartData || generateDefaultData(userId);
            
            // チャートを描画
            if (window.MatchingRadarChartEnhanced) {
                const chart = new window.MatchingRadarChartEnhanced();
                chart.render(container, data);
                console.log('[MatchingInit] レーダーチャート追加成功');
            }
        } catch (error) {
            console.error('[MatchingInit] レーダーチャート追加エラー:', error);
        }
    }
    
    // デフォルトデータ生成
    function generateDefaultData(userId) {
        // ユーザーIDに基づいて異なるデータを生成
        const seed = parseInt(userId) || 1;
        return {
            businessSynergy: 50 + (seed * 7) % 40,
            solutionMatch: 50 + (seed * 11) % 40,
            businessTrends: 50 + (seed * 13) % 40,
            growthPhaseMatch: 50 + (seed * 17) % 40,
            urgencyAlignment: 50 + (seed * 19) % 40,
            resourceComplement: 50 + (seed * 23) % 40
        };
    }
    
    // Supabase準備完了を監視
    if (window.supabase) {
        console.log('[MatchingInit] Supabaseは既に準備完了');
        supabaseReady = true;
        tryInitialize();
    } else {
        window.addEventListener('supabaseReady', () => {
            console.log('[MatchingInit] Supabaseが準備完了');
            supabaseReady = true;
            tryInitialize();
        });
    }
    
    // DOM準備完了を監視
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[MatchingInit] DOMが準備完了');
            domReady = true;
            tryInitialize();
        });
    } else {
        console.log('[MatchingInit] DOMは既に準備完了');
        domReady = true;
        tryInitialize();
    }
    
    // 手動初期化コマンド
    window.forceInitMatching = function() {
        console.log('[MatchingInit] 強制初期化実行');
        supabaseReady = true;
        domReady = true;
        initialized = false;
        tryInitialize();
    };
    
    console.log('[MatchingInit] 初期化修正設定完了');
    console.log('[MatchingInit] 強制初期化: forceInitMatching()');
    
})();