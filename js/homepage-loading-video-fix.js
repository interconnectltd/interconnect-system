/**
 * Homepage Loading Video Fix
 * ローディング画面に動画を確実に表示
 */

(function() {
    'use strict';
    
    console.log('[LoadingVideoFix] 動画修正開始');
    
    function addVideoToLoading() {
        const screen = document.getElementById('instantLoadingScreen');
        if (!screen) {
            console.error('[LoadingVideoFix] instantLoadingScreen が見つかりません');
            return;
        }
        
        // 既存の動画をチェック
        let video = screen.querySelector('video');
        if (video) {
            console.log('[LoadingVideoFix] 動画は既に存在します');
            return;
        }
        
        // 動画を作成して追加
        const videoHTML = `
            <video autoplay muted loop playsinline style="
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                z-index: 0;
            ">
                <source src="assets/interconnect-top.mp4" type="video/mp4">
            </video>
        `;
        
        // instantLoadingScreenの最初に動画を挿入
        screen.insertAdjacentHTML('afterbegin', videoHTML);
        
        // 既存のコンテンツのz-indexを調整
        const contentDiv = screen.querySelector('div');
        if (contentDiv) {
            contentDiv.style.position = 'relative';
            contentDiv.style.zIndex = '1';
        }
        
        // 動画を取得して再生
        video = screen.querySelector('video');
        if (video) {
            video.playbackRate = 2.0;
            video.play().catch(err => {
                console.log('[LoadingVideoFix] 動画の自動再生に失敗:', err);
            });
            
            console.log('[LoadingVideoFix] 動画を追加しました');
        }
    }
    
    // 即座に実行
    addVideoToLoading();
    
    // DOMContentLoadedでも実行（念のため）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addVideoToLoading);
    }
    
})();