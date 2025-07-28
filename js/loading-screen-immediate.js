/**
 * ローディング画面即時表示
 * DOMContentLoadedより前に実行
 */

(function() {
    'use strict';
    
    // ローディング画面のHTMLを直接生成
    const loadingHTML = `
        <div class="loading-screen" id="loadingScreen">
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
        </div>
    `;
    
    // CSSを動的に追加（loading-screen.cssが読み込まれる前でも表示できるように）
    const loadingCSS = `
        .loading-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: opacity 0.8s ease-out;
        }
        
        .loading-screen.fade-out {
            opacity: 0;
            pointer-events: none;
        }
        
        .loading-video-container {
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        
        .loading-video {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            min-width: 100%;
            min-height: 100%;
            width: auto;
            height: auto;
            object-fit: cover;
        }
        
        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            opacity: 0;
            transition: opacity 0.6s ease-in;
            pointer-events: none;
        }
        
        .loading-overlay.active {
            opacity: 1;
        }
        
        body.loading {
            overflow: hidden;
        }
        
        .loading-progress {
            position: absolute;
            bottom: 50px;
            left: 50%;
            transform: translateX(-50%);
            width: 200px;
            height: 2px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
            overflow: hidden;
        }
        
        .loading-progress-bar {
            height: 100%;
            background: white;
            width: 0%;
            transition: width 2s ease-out;
        }
        
        .loading-text {
            position: absolute;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            font-size: 0.875rem;
            letter-spacing: 0.1em;
            opacity: 0.8;
        }
    `;
    
    // スタイルタグを作成して追加
    const styleTag = document.createElement('style');
    styleTag.textContent = loadingCSS;
    document.head.appendChild(styleTag);
    
    // ローディング画面をbodyの最初に追加
    document.body.insertAdjacentHTML('afterbegin', loadingHTML);
    document.body.classList.add('loading');
    
    // ローディング制御
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingVideo = loadingScreen.querySelector('.loading-video');
    const loadingOverlay = loadingScreen.querySelector('.loading-overlay');
    const progressBar = loadingScreen.querySelector('.loading-progress-bar');
    
    // ビデオを2倍速に設定
    if (loadingVideo) {
        loadingVideo.playbackRate = 2.0;
        
        // ビデオの再生を試みる
        loadingVideo.play().catch(error => {
            console.log('Video autoplay failed:', error);
        });
        
        // プログレスバーのアニメーション開始
        setTimeout(() => {
            progressBar.style.width = '100%';
        }, 100);
    }
    
    // ローディング完了フラグ
    let loadingCompleted = false;
    
    // ローディング終了処理
    function endLoading() {
        if (!loadingCompleted) {
            loadingCompleted = true;
            loadingOverlay.classList.add('active');
            
            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
                document.body.classList.remove('loading');
                
                setTimeout(() => {
                    loadingScreen.remove();
                }, 800);
            }, 600);
        }
    }
    
    // ビデオの再生進捗を監視
    if (loadingVideo) {
        const checkVideoProgress = setInterval(() => {
            if (loadingCompleted) {
                clearInterval(checkVideoProgress);
                return;
            }
            
            if (loadingVideo.duration && loadingVideo.currentTime > 0) {
                const progress = (loadingVideo.currentTime / loadingVideo.duration) * 100;
                
                // 80%再生されたら終了
                if (progress >= 80) {
                    clearInterval(checkVideoProgress);
                    endLoading();
                }
            }
        }, 50);
    }
    
    // DOM読み込み完了時
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // 最低2秒は表示
            setTimeout(() => {
                if (!loadingCompleted) {
                    endLoading();
                }
            }, 2000);
        });
    } else {
        // 既にDOM読み込み完了している場合
        setTimeout(() => {
            endLoading();
        }, 2000);
    }
    
    // フォールバック：最大5秒で終了
    setTimeout(() => {
        endLoading();
    }, 5000);
    
})();