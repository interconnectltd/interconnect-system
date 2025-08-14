/**
 * Loading Video Fullsize Fix
 * ローディング画面の動画を全画面表示に修正
 */

(function() {
    'use strict';
    
    // console.log('[LoadingVideoFix] 初期化開始');
    
    // 既存のローディング画面を修正
    function fixLoadingVideo() {
        const instantLoadingScreen = document.getElementById('instantLoadingScreen');
        if (!instantLoadingScreen) return;
        
        // ローディング画面を全画面に設定
        instantLoadingScreen.style.position = 'fixed';
        instantLoadingScreen.style.top = '0';
        instantLoadingScreen.style.left = '0';
        instantLoadingScreen.style.width = '100vw';
        instantLoadingScreen.style.height = '100vh';
        instantLoadingScreen.style.zIndex = '99999';
        
        // 内部のコンテナも全画面に
        const container = instantLoadingScreen.querySelector('div');
        if (container) {
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.style.position = 'relative';
        }
        
        // テキストとローディングバーのコンテナ
        const textContainer = container?.querySelector('div');
        if (textContainer) {
            textContainer.style.position = 'relative';
            textContainer.style.zIndex = '2';
        }
        
        // 動画を全画面で表示
        const video = instantLoadingScreen.querySelector('video');
        if (video) {
            video.style.position = 'absolute';
            video.style.top = '0';
            video.style.left = '0';
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
            video.style.zIndex = '1';
        }
    }
    
    // DOMContentLoadedを待つ
    if (document.readyState === 'loading') {
        // 即座に修正を試みる
        fixLoadingVideo();
        
        // DOMContentLoadedでも再度実行
        document.addEventListener('DOMContentLoaded', fixLoadingVideo);
    } else {
        fixLoadingVideo();
    }
    
    // MutationObserverで動的に追加される動画も監視
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.tagName === 'VIDEO' && node.classList.contains('loading-video')) {
                        // console.log('[LoadingVideoFix] 動画要素を検知、スタイル適用');
                        node.style.position = 'absolute';
                        node.style.top = '0';
                        node.style.left = '0';
                        node.style.width = '100%';
                        node.style.height = '100%';
                        node.style.objectFit = 'cover';
                        node.style.zIndex = '1';
                    }
                });
            }
        });
    });
    
    // ローディング画面を監視
    const loadingScreen = document.getElementById('instantLoadingScreen');
    if (loadingScreen) {
        observer.observe(loadingScreen, {
            childList: true,
            subtree: true
        });
    }
    
})();