/**
 * マッチングページのローディング問題を修正
 * ローディング状態が解除されない問題を解決
 */

(function() {
    'use strict';

    // DOMContentLoaded後に実行
    document.addEventListener('DOMContentLoaded', function() {
        
        // 既存のローディングオーバーレイを強制的に削除
        setTimeout(() => {
            const loadingOverlay = document.querySelector('.loading-overlay');
            if (loadingOverlay) {
                console.log('[MatchingFix] Removing stuck loading overlay');
                loadingOverlay.remove();
            }
            
            // loading クラスも削除
            const matchingGrid = document.querySelector('.matching-grid');
            if (matchingGrid && matchingGrid.classList.contains('loading')) {
                matchingGrid.classList.remove('loading');
            }
        }, 3000); // 3秒後に強制削除
        
        // hideLoading メソッドを修正
        if (window.matchingSupabase) {
            const originalHideLoading = window.matchingSupabase.hideLoading.bind(window.matchingSupabase);
            
            window.matchingSupabase.hideLoading = function() {
                console.log('[MatchingFix] hideLoading called');
                originalHideLoading();
                
                // 確実に削除
                setTimeout(() => {
                    const overlay = document.querySelector('.loading-overlay');
                    if (overlay) {
                        overlay.remove();
                    }
                    const grid = document.querySelector('.matching-grid');
                    if (grid) {
                        grid.classList.remove('loading');
                    }
                }, 100);
            };
            
            // プロフィール読み込み後に確実にローディングを解除
            const originalRenderProfiles = window.matchingSupabase.renderProfiles?.bind(window.matchingSupabase);
            if (originalRenderProfiles) {
                window.matchingSupabase.renderProfiles = async function() {
                    await originalRenderProfiles();
                    this.hideLoading();
                };
            }
            
            // 最適化版も同様に修正
            const originalRenderOptimized = window.matchingSupabase.renderProfilesOptimized?.bind(window.matchingSupabase);
            if (originalRenderOptimized) {
                window.matchingSupabase.renderProfilesOptimized = async function() {
                    await originalRenderOptimized();
                    this.hideLoading();
                };
            }
        }
        
        console.log('[MatchingFix] Loading fix applied');
    });
    
})();