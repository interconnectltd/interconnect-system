/**
 * 動画パフォーマンス最適化
 * 27MBの動画を効率的に読み込む
 */

(function() {
    'use strict';

    // console.log('[VideoOptimizer] 初期化開始');

    // 設定
    const config = {
        videoPath: 'assets/interconnect-top.mp4',
        posterPath: 'assets/video-poster.svg', // 静止画のポスター
        lowQualityPath: 'assets/interconnect-top-low.mp4', // 低品質版
        chunkSize: 1024 * 1024, // 1MB chunks
        preloadDuration: 3, // 最初の3秒だけプリロード
    };

    // 初期化
    function initialize() {
        const video = document.querySelector('.hero-video');
        if (!video) {
            console.error('[VideoOptimizer] 動画要素が見つかりません');
            return;
        }

        // 1. 静止画のポスターを設定（即座に表示）
        setPoster(video);

        // 2. ネットワーク速度を検出
        detectNetworkSpeed().then(speed => {
            // console.log(`[VideoOptimizer] ネットワーク速度: ${speed}`);
            
            if (speed === 'slow') {
                // 遅い接続では低品質版または静止画のみ
                loadLowQualityOrPoster(video);
            } else if (speed === 'medium') {
                // 中速では段階的読み込み
                loadVideoProgressive(video);
            } else {
                // 高速では通常読み込み（ただし最適化済み）
                loadVideoOptimized(video);
            }
        });

        // 3. Intersection Observerで可視領域に入ったら再生
        setupIntersectionObserver(video);

        // 4. プリコネクトとDNSプリフェッチ
        setupResourceHints();
    }

    // 静止画ポスターを設定
    function setPoster(video) {
        // CSSで背景画像として設定（より高速）
        const container = video.parentElement;
        if (container) {
            container.style.backgroundImage = `url('${config.posterPath}')`;
            container.style.backgroundSize = 'cover';
            container.style.backgroundPosition = 'center';
        }

        // video要素のposter属性も設定
        video.poster = config.posterPath;
    }

    // ネットワーク速度検出
    async function detectNetworkSpeed() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            const effectiveType = connection.effectiveType;
            
            if (effectiveType === 'slow-2g' || effectiveType === '2g') {
                return 'slow';
            } else if (effectiveType === '3g') {
                return 'medium';
            } else {
                return 'fast';
            }
        }

        // Network Information APIが使えない場合は、小さいファイルで測定
        const startTime = performance.now();
        try {
            const response = await fetch('/favicon.ico', { cache: 'no-store' });
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            if (duration > 500) return 'slow';
            if (duration > 200) return 'medium';
            return 'fast';
        } catch {
            return 'medium'; // デフォルト
        }
    }

    // 低品質版または静止画のみ
    function loadLowQualityOrPoster(video) {
        // console.log('[VideoOptimizer] 低品質モード');
        
        // 低品質版が存在する場合
        fetch(config.lowQualityPath, { method: 'HEAD' })
            .then(response => {
                if (response.ok) {
                    video.src = config.lowQualityPath;
                    video.load();
                } else {
                    // 静止画のみ表示（動画なし）
                    video.style.display = 'none';
                    showStaticImage(video.parentElement);
                }
            })
            .catch(() => {
                video.style.display = 'none';
                showStaticImage(video.parentElement);
            });
    }

    // 段階的読み込み
    function loadVideoProgressive(video) {
        // console.log('[VideoOptimizer] 段階的読み込みモード');
        
        // 最初の数秒だけ読み込む
        const source = video.querySelector('source') || video;
        const originalSrc = source.src || config.videoPath;
        
        // Range Requestsを使用
        fetch(originalSrc, {
            headers: {
                'Range': `bytes=0-${config.chunkSize * 3}` // 最初の3MBのみ
            }
        }).then(response => response.blob())
          .then(blob => {
            const url = URL.createObjectURL(blob);
            video.src = url;
            video.load();
            
            // 再生開始後に残りを読み込む
            video.addEventListener('play', () => {
                loadRemainingVideo(video, originalSrc);
            }, { once: true });
        });
    }

    // 最適化された通常読み込み
    function loadVideoOptimized(video) {
        // console.log('[VideoOptimizer] 最適化モード');
        
        // preload属性を調整
        video.preload = 'metadata'; // 最初はメタデータのみ
        
        // ユーザーインタラクション後にフル読み込み
        const loadFull = () => {
            video.preload = 'auto';
            video.load();
        };
        
        // スクロールまたはクリックで完全読み込み
        window.addEventListener('scroll', loadFull, { once: true });
        window.addEventListener('click', loadFull, { once: true });
        
        // 3秒後には自動で読み込み開始
        setTimeout(loadFull, 3000);
    }

    // 残りの動画を読み込む
    async function loadRemainingVideo(video, originalSrc) {
        // 既に読み込んだ部分以降を取得
        const response = await fetch(originalSrc);
        const blob = await response.blob();
        const fullUrl = URL.createObjectURL(blob);
        
        // シームレスに切り替え
        const currentTime = video.currentTime;
        video.src = fullUrl;
        video.currentTime = currentTime;
        video.play();
    }

    // 静止画表示
    function showStaticImage(container) {
        const img = document.createElement('img');
        img.src = config.posterPath;
        img.className = 'hero-static-image';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        container.appendChild(img);
    }

    // Intersection Observer設定
    function setupIntersectionObserver(video) {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        video.play().catch(() => {
                            // 自動再生がブロックされた場合
                            // console.log('[VideoOptimizer] 自動再生がブロックされました');
                        });
                    } else {
                        video.pause();
                    }
                });
            }, {
                threshold: 0.5
            });
            
            observer.observe(video);
        }
    }

    // リソースヒントを設定
    function setupResourceHints() {
        // DNS プリフェッチ
        const dnsPrefetch = document.createElement('link');
        dnsPrefetch.rel = 'dns-prefetch';
        dnsPrefetch.href = window.location.origin;
        document.head.appendChild(dnsPrefetch);
        
        // プリコネクト
        const preconnect = document.createElement('link');
        preconnect.rel = 'preconnect';
        preconnect.href = window.location.origin;
        preconnect.crossOrigin = 'anonymous';
        document.head.appendChild(preconnect);
    }

    // Service Workerでキャッシュ
    function setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw-video-cache.js')
                .then(() => {}) // console.log('[VideoOptimizer] Service Worker登録成功')
                .catch(err => console.error('[VideoOptimizer] Service Worker登録失敗:', err));
        }
    }

    // 初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // グローバルAPIとして公開
    window.VideoOptimizer = {
        initialize,
        detectNetworkSpeed,
        loadVideoOptimized
    };

})();