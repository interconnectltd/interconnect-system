/**
 * Video Preload Optimization
 * 動画の高速読み込みと再生の最適化
 */

(function() {
    'use strict';
    
    // console.log('[VideoOptimize] 動画最適化開始');
    
    // 1. 動画プリロードの強化
    function preloadVideo() {
        const videoUrl = 'assets/interconnect-top.mp4';
        
        // プリフェッチリンクを追加
        const prefetchLink = document.createElement('link');
        prefetchLink.rel = 'prefetch';
        prefetchLink.href = videoUrl;
        prefetchLink.as = 'video';
        prefetchLink.type = 'video/mp4';
        document.head.appendChild(prefetchLink);
        
        // プリロードリンクを追加
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.href = videoUrl;
        preloadLink.as = 'video';
        preloadLink.type = 'video/mp4';
        preloadLink.crossOrigin = 'anonymous';
        document.head.appendChild(preloadLink);
        
        // 2. ビデオ要素を事前に作成してバッファリング開始
        const preloadVideo = document.createElement('video');
        preloadVideo.src = videoUrl;
        preloadVideo.preload = 'auto';
        preloadVideo.muted = true;
        preloadVideo.playsInline = true;
        preloadVideo.style.display = 'none';
        document.body.appendChild(preloadVideo);
        
        // 3. 動画のメタデータを事前に読み込む
        preloadVideo.load();
        
        // console.log('[VideoOptimize] プリロード設定完了');
        
        return preloadVideo;
    }
    
    // 4. Intersection Observerを使用した遅延読み込みの最適化
    function setupLazyLoading() {
        const videos = document.querySelectorAll('video[data-lazy]');
        
        if ('IntersectionObserver' in window) {
            const videoObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const video = entry.target;
                        video.src = video.dataset.src;
                        video.load();
                        videoObserver.unobserve(video);
                    }
                });
            }, {
                rootMargin: '50px'
            });
            
            videos.forEach(video => videoObserver.observe(video));
        }
    }
    
    // 5. 動画の最適化設定
    function optimizeVideoElement(video) {
        // ブラウザのデコード最適化
        if ('requestVideoFrameCallback' in video) {
            video.requestVideoFrameCallback(() => {
                // console.log('[VideoOptimize] ビデオフレーム準備完了');
            });
        }
        
        // Web Audio APIを使用した音声の事前準備（ミュート動画でも）
        // 既存のAudioContextがあるかチェック
        if (!video.audioSource) {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioContext.createMediaElementSource(video);
                source.connect(audioContext.destination);
                video.audioSource = source; // マークしておく
            } catch (e) {
                // 既に接続されている場合はスキップ
                // console.log('[VideoOptimize] AudioContext already connected');
            }
        }
        
        // 再生速度の調整（ローディング中は高速）
        video.playbackRate = 2.0;
        
        // バッファリング戦略の設定（最初はメタデータのみ）
        video.preload = 'metadata';
        
        // 自動再生の最適化
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                // console.log('[VideoOptimize] 動画再生開始');
            }).catch(error => {
                // console.log('[VideoOptimize] 自動再生エラー:', error);
                // ユーザーインタラクション後に再生
                document.addEventListener('click', () => {
                    video.play();
                }, { once: true });
            });
        }
    }
    
    // 6. Service Workerを使用したキャッシュ戦略（別ファイルで実装）
    function setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw-video-cache-fixed.js')
                .then(registration => {
                    // console.log('[VideoOptimize] Service Worker登録成功');
                })
                .catch(error => {
                    // console.log('[VideoOptimize] Service Worker登録失敗:', error);
                });
        }
    }
    
    // 7. ローディング画面への動画追加（改良版）
    function addOptimizedVideoToLoading() {
        const screen = document.getElementById('instantLoadingScreen');
        if (!screen) return;
        
        // 既存の動画をチェック
        let video = screen.querySelector('video');
        if (video) {
            optimizeVideoElement(video);
            return;
        }
        
        // 動画要素を作成
        video = document.createElement('video');
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'metadata';
        
        // スタイル設定
        Object.assign(video.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: '0'
        });
        
        // 動画ソース設定
        const source = document.createElement('source');
        source.src = 'assets/interconnect-top.mp4';
        source.type = 'video/mp4';
        video.appendChild(source);
        
        // ローディング画面に追加
        screen.insertBefore(video, screen.firstChild);
        
        // 最適化を適用
        optimizeVideoElement(video);
        
        // 既存コンテンツのz-index調整
        const contentDiv = screen.querySelector('div');
        if (contentDiv) {
            contentDiv.style.position = 'relative';
            contentDiv.style.zIndex = '1';
        }
    }
    
    // 8. ネットワーク状態に応じた最適化
    function adaptToNetworkConditions() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            
            // 低速接続の場合は品質を下げる
            if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
                // console.log('[VideoOptimize] 低速接続検出 - 品質を調整');
                // ここで低品質バージョンの動画に切り替える処理を追加
            }
            
            // 接続状態の変更を監視
            connection.addEventListener('change', () => {
                // console.log('[VideoOptimize] ネットワーク状態変更:', connection.effectiveType);
            });
        }
    }
    
    // 実行
    // 即座にプリロード開始
    const preloadedVideo = preloadVideo();
    
    // DOMContentLoadedを待たずに実行
    if (document.getElementById('instantLoadingScreen')) {
        addOptimizedVideoToLoading();
    }
    
    // DOMContentLoadedでも実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            addOptimizedVideoToLoading();
            setupLazyLoading();
            adaptToNetworkConditions();
        });
    } else {
        addOptimizedVideoToLoading();
        setupLazyLoading();
        adaptToNetworkConditions();
    }
    
    // ページ完全読み込み後にService Worker設定
    window.addEventListener('load', () => {
        setupServiceWorker();
    });
    
})();