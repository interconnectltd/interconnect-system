/**
 * ホームページローディング修正
 * loading-screen.jsとhomepage-loading-integration.jsの競合を解決
 * 元の仕様に戻す
 */

(function() {
    'use strict';
    
    console.log('[LoadingFix] 初期化開始');
    
    // 既存のローディング画面を取得
    const instantLoadingScreen = document.getElementById('instantLoadingScreen');
    
    if (!instantLoadingScreen) {
        console.log('[LoadingFix] instant loading screen not found');
        return;
    }
    
    // ローディング画面に動画を追加
    const videoHTML = `
        <video class="loading-video" autoplay muted loop playsinline style="
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            z-index: -1;
        ">
            <source src="assets/interconnect-top.mp4" type="video/mp4">
        </video>
    `;
    
    // 既存のコンテンツの前に動画を挿入
    const container = instantLoadingScreen.querySelector('div');
    if (container) {
        container.style.position = 'relative';
        container.style.width = '100%';
        container.style.height = '100%';
        container.insertAdjacentHTML('afterbegin', videoHTML);
    }
    
    const loadingVideo = instantLoadingScreen.querySelector('video');
    const loadingBar = document.getElementById('loadingBar');
    
    // 動画の再生速度を設定
    if (loadingVideo) {
        loadingVideo.playbackRate = 2.0;
        loadingVideo.play().catch(err => {
            console.log('[LoadingFix] Video autoplay failed:', err);
        });
    }
    
    // ローディング完了処理
    let loadingComplete = false;
    
    function completeLoading() {
        if (loadingComplete) return;
        loadingComplete = true;
        
        console.log('[LoadingFix] ローディング完了');
        
        // フェードアウト
        instantLoadingScreen.style.transition = 'opacity 0.8s ease-out';
        instantLoadingScreen.style.opacity = '0';
        
        setTimeout(() => {
            instantLoadingScreen.style.display = 'none';
            document.body.style.overflow = '';
            
            // アニメーション開始
            startPageAnimations();
        }, 800);
    }
    
    // ページアニメーション開始
    function startPageAnimations() {
        // ヒーロー動画の再生開始
        const heroVideo = document.querySelector('.hero-video');
        if (heroVideo) {
            heroVideo.play().catch(err => {
                console.warn('[LoadingFix] Hero video autoplay failed:', err);
            });
        }
        
        // タイトルアニメーション（元の仕様通り）
        const heroTitle = document.querySelector('.hero-title');
        const heroSubtitle = document.querySelector('.hero-subtitle');
        
        if (heroTitle) {
            // 元のタイプライター効果を復元
            heroTitle.style.opacity = '1';
            heroTitle.style.visibility = 'visible';
            
            // タイプライター効果
            const originalHTML = heroTitle.innerHTML;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = originalHTML;
            const text = tempDiv.textContent || '';
            
            heroTitle.innerHTML = '';
            let index = 0;
            
            function typeNextChar() {
                if (index < text.length) {
                    heroTitle.textContent = text.substring(0, index + 1);
                    index++;
                    setTimeout(typeNextChar, 20); // 2.5倍速（20ms）
                } else {
                    // 最後に元のHTMLを復元（改行を含む）
                    heroTitle.innerHTML = originalHTML;
                    
                    // サブタイトルのアニメーション
                    if (heroSubtitle) {
                        heroSubtitle.style.opacity = '1';
                        heroSubtitle.style.visibility = 'visible';
                        
                        const subtitleHTML = heroSubtitle.innerHTML;
                        const subtitleDiv = document.createElement('div');
                        subtitleDiv.innerHTML = subtitleHTML;
                        const subtitleText = subtitleDiv.textContent || '';
                        
                        heroSubtitle.innerHTML = '';
                        let subIndex = 0;
                        
                        function typeSubtitle() {
                            if (subIndex < subtitleText.length) {
                                heroSubtitle.textContent = subtitleText.substring(0, subIndex + 1);
                                subIndex++;
                                setTimeout(typeSubtitle, 20); // 2.5倍速
                            } else {
                                heroSubtitle.innerHTML = subtitleHTML;
                            }
                        }
                        
                        setTimeout(typeSubtitle, 200);
                    }
                }
            }
            
            setTimeout(typeNextChar, 200);
        }
        
        // その他の要素のフェードイン
        const elements = [
            '.section-badge',
            '.hero-buttons',
            '.scroll-indicator'
        ];
        
        elements.forEach((selector, index) => {
            const el = document.querySelector(selector);
            if (el) {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                el.style.transition = 'opacity 1s ease-out, transform 1s ease-out';
                
                setTimeout(() => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, 1000 + (index * 300));
            }
        });
    }
    
    // 動画の進行状況を監視
    if (loadingVideo) {
        const checkProgress = setInterval(() => {
            if (loadingVideo.duration && loadingVideo.currentTime > 0) {
                const progress = (loadingVideo.currentTime / loadingVideo.duration) * 100;
                
                if (progress >= 80) {
                    clearInterval(checkProgress);
                    completeLoading();
                }
            }
        }, 50);
        
        // フォールバック：最大3秒で終了
        setTimeout(() => {
            clearInterval(checkProgress);
            completeLoading();
        }, 3000);
    } else {
        // 動画がない場合は2秒後に終了
        setTimeout(completeLoading, 2000);
    }
    
    // プログレスバーアニメーションが完了していることを確認
    if (loadingBar && loadingBar.style.width !== '100%') {
        loadingBar.style.width = '100%';
    }
    
})();