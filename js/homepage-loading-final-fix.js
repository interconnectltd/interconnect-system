/**
 * Homepage Loading Final Fix
 * ローディング画面の動画再生と背景ロゴ表示問題を完全に修正
 */

(function() {
    'use strict';
    
    console.log('[LoadingFinalFix] 初期化開始');
    
    // 1. hero-fallback.svgを非表示にする
    const hideFallbackImage = () => {
        const style = document.createElement('style');
        style.textContent = `
            /* フォールバック画像を完全に非表示 */
            .hero-fallback,
            .hero-fallback-image,
            img[src*="hero-fallback.svg"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
            }
            
            /* ローディング中はヒーローセクションも非表示 */
            #instantLoadingScreen ~ .hero {
                opacity: 0;
                transition: opacity 0.8s ease-out;
            }
            
            /* ローディング画面のスタイル改善 */
            #instantLoadingScreen {
                background: #000 !important;
            }
            
            #instantLoadingScreen video {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                z-index: 1;
            }
            
            #instantLoadingScreen > div {
                position: relative;
                z-index: 2;
            }
        `;
        document.head.appendChild(style);
    };
    
    // 2. ローディング画面の動画を確実に再生
    const ensureVideoPlayback = () => {
        const screen = document.getElementById('instantLoadingScreen');
        if (!screen) return;
        
        // 既存の動画を確認
        let video = screen.querySelector('video');
        
        // 動画がない場合は作成
        if (!video) {
            const videoHTML = `
                <video autoplay muted loop playsinline preload="auto">
                    <source src="assets/interconnect-top.mp4" type="video/mp4">
                </video>
            `;
            screen.insertAdjacentHTML('afterbegin', videoHTML);
            video = screen.querySelector('video');
        }
        
        if (video) {
            // 動画の属性を確実に設定
            video.autoplay = true;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.preload = 'auto';
            
            // スタイルを直接設定
            video.style.position = 'absolute';
            video.style.top = '0';
            video.style.left = '0';
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
            video.style.zIndex = '1';
            
            // 再生を試みる
            const playVideo = () => {
                video.play().then(() => {
                    console.log('[LoadingFinalFix] 動画再生成功');
                    video.playbackRate = 2.0;
                }).catch(err => {
                    console.error('[LoadingFinalFix] 動画再生エラー:', err);
                    // エラー時は再試行
                    setTimeout(playVideo, 100);
                });
            };
            
            // 動画の準備ができたら再生
            if (video.readyState >= 3) {
                playVideo();
            } else {
                video.addEventListener('canplay', playVideo, { once: true });
                // loadedmetadataでも試す
                video.addEventListener('loadedmetadata', () => {
                    if (video.readyState >= 3) {
                        playVideo();
                    }
                }, { once: true });
            }
            
            // 強制的に読み込み開始
            video.load();
        }
    };
    
    // 3. ローディング完了処理の改善
    const improveLoadingCompletion = () => {
        const screen = document.getElementById('instantLoadingScreen');
        if (!screen) return;
        
        // 既存の完了処理を監視
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style' && 
                    screen.style.opacity === '0') {
                    // ローディング完了時にヒーローセクションを表示
                    const hero = document.querySelector('.hero');
                    if (hero) {
                        setTimeout(() => {
                            hero.style.opacity = '1';
                        }, 100);
                    }
                    observer.disconnect();
                }
            });
        });
        
        observer.observe(screen, { attributes: true });
    };
    
    // 4. 実行
    const init = () => {
        // フォールバック画像を非表示
        hideFallbackImage();
        
        // 動画再生を確実に
        ensureVideoPlayback();
        
        // 完了処理の改善
        improveLoadingCompletion();
        
        // homepage-perfect-final.jsとの連携
        if (window.PerfectLoader && !window.PerfectLoader._originalInit) {
            window.PerfectLoader._originalInit = window.PerfectLoader.init;
            window.PerfectLoader.init = function() {
                // 元の処理を実行
                window.PerfectLoader._originalInit.call(this);
                
                // 追加の動画処理
                setTimeout(ensureVideoPlayback, 100);
            };
        }
        
        console.log('[LoadingFinalFix] 初期化完了');
    };
    
    // DOMContentLoadedより早く実行
    if (document.readyState === 'loading') {
        // できるだけ早く実行
        init();
        
        // DOMContentLoadedでも再実行
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();