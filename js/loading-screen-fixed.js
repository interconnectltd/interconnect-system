/**
 * ローディング画面制御 - Memory Leak Fixed Version
 */

document.addEventListener('DOMContentLoaded', function() {
    // クリーンアップ用の参照
    let checkVideoProgressInterval = null;
    let timeouts = [];
    let loadHandler = null;
    
    // タイムアウト管理ヘルパー
    function setManagedTimeout(fn, delay) {
        const timeoutId = setTimeout(fn, delay);
        timeouts.push(timeoutId);
        return timeoutId;
    }
    
    // クリーンアップ関数
    function cleanup() {
        if (checkVideoProgressInterval) {
            clearInterval(checkVideoProgressInterval);
            checkVideoProgressInterval = null;
        }
        timeouts.forEach(timeout => clearTimeout(timeout));
        timeouts = [];
        if (loadHandler) {
            window.removeEventListener('load', loadHandler);
            loadHandler = null;
        }
    }
    
    // ローディング画面の要素を作成
    const loadingScreen = document.createElement('div');
    loadingScreen.className = 'loading-screen';
    loadingScreen.innerHTML = `
        <div class="loading-video-container">
            <video class="loading-video" autoplay muted playsinline preload="auto" webkit-playsinline>
                <source src="assets/interconnect-top.mp4" type="video/mp4">
            </video>
            <div class="loading-overlay"></div>
            <div class="loading-text">INTER CONNECT</div>
            <div class="loading-progress">
                <div class="loading-progress-bar"></div>
            </div>
        </div>
    `;

    // ボディに追加
    document.body.appendChild(loadingScreen);
    document.body.classList.add('loading');

    // ビデオ要素を取得
    const loadingVideo = loadingScreen.querySelector('.loading-video');
    const loadingOverlay = loadingScreen.querySelector('.loading-overlay');
    const progressBar = loadingScreen.querySelector('.loading-progress-bar');

    // ローディング完了フラグ
    let loadingCompleted = false;
    
    // ローディング完了処理
    function completeLoading() {
        if (loadingCompleted) return;
        loadingCompleted = true;
        
        cleanup();
        loadingOverlay.classList.add('active');
        
        setManagedTimeout(() => {
            if (document.contains(loadingScreen)) {
                loadingScreen.classList.add('fade-out');
                document.body.classList.remove('loading');
                
                // 完全に非表示にして削除
                setManagedTimeout(() => {
                    if (document.contains(loadingScreen)) {
                        // ビデオのリソースを解放
                        if (loadingVideo) {
                            loadingVideo.pause();
                            loadingVideo.removeAttribute('src');
                            loadingVideo.load();
                        }
                        loadingScreen.remove();
                        cleanup(); // 最終クリーンアップ
                    }
                }, 800);
            }
        }, 600);
    }

    // ビデオを2倍速に設定
    if (loadingVideo) {
        loadingVideo.playbackRate = 2.0;
        
        // モバイルでの再生を強制
        loadingVideo.play().catch(error => {
            // console.log('Video autoplay failed:', error);
            // ビデオが再生できない場合は早めに終了
            setManagedTimeout(completeLoading, 1000);
        });
        
        // プログレスバーのアニメーション
        setManagedTimeout(() => {
            if (progressBar) progressBar.style.width = '100%';
        }, 100);
        
        // ビデオの再生時間を監視
        checkVideoProgressInterval = setInterval(() => {
            // 要素が存在しない場合はクリア
            if (!loadingVideo || !document.contains(loadingVideo) || loadingCompleted) {
                if (checkVideoProgressInterval) {
                    clearInterval(checkVideoProgressInterval);
                    checkVideoProgressInterval = null;
                }
                return;
            }
            
            if (loadingVideo.duration && loadingVideo.currentTime > 0) {
                const progress = (loadingVideo.currentTime / loadingVideo.duration) * 100;
                
                // 80%再生されたらホワイトアウト開始
                if (progress >= 80) {
                    completeLoading();
                }
            }
        }, 50);

        // フォールバック：最大6秒でローディング終了
        setManagedTimeout(() => {
            if (!loadingCompleted) {
                completeLoading();
            }
        }, 6000);
    } else {
        // ビデオが読み込めない場合は即座に終了
        setManagedTimeout(() => {
            loadingScreen.classList.add('fade-out');
            document.body.classList.remove('loading');
            
            setManagedTimeout(() => {
                if (document.contains(loadingScreen)) {
                    loadingScreen.remove();
                }
            }, 800);
        }, 500);
    }

    // ページ読み込み完了時の処理
    loadHandler = function() {
        // すべてのリソースが読み込まれたら、最低でも3秒後にはローディング終了
        setManagedTimeout(() => {
            if (!loadingCompleted) {
                completeLoading();
            }
        }, 3000);
    };
    window.addEventListener('load', loadHandler);
    
    // ページ遷移時のクリーンアップ
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
});