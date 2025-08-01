/**
 * ホームページローディング統合
 * ローディング画面終了後に動画とアニメーションを開始
 */

(function() {
    'use strict';
    
    console.log('[LoadingIntegration] 初期化開始');
    
    // 状態管理
    const state = {
        loadingComplete: false,
        videoReady: false,
        animationsStarted: false
    };
    
    // ローディング画面の監視
    function observeLoadingScreen() {
        const loadingScreen = document.getElementById('instantLoadingScreen');
        
        if (!loadingScreen) {
            console.log('[LoadingIntegration] ローディング画面が見つかりません');
            state.loadingComplete = true;
            checkAndStartAnimations();
            return;
        }
        
        // MutationObserverでローディング画面の変化を監視
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes') {
                    const opacity = loadingScreen.style.opacity;
                    if (opacity === '0' || !document.contains(loadingScreen)) {
                        console.log('[LoadingIntegration] ローディング完了を検出');
                        state.loadingComplete = true;
                        observer.disconnect();
                        checkAndStartAnimations();
                    }
                }
            });
        });
        
        // style属性の変化を監視
        observer.observe(loadingScreen, {
            attributes: true,
            attributeFilter: ['style']
        });
        
        // フォールバック: 5秒後には必ず開始
        setTimeout(() => {
            if (!state.loadingComplete) {
                console.log('[LoadingIntegration] タイムアウトによるローディング完了');
                state.loadingComplete = true;
                checkAndStartAnimations();
            }
        }, 5000);
    }
    
    // 動画の準備
    function prepareVideo() {
        const video = document.querySelector('.hero-video');
        
        if (!video) {
            console.log('[LoadingIntegration] 動画要素が見つかりません');
            state.videoReady = true;
            checkAndStartAnimations();
            return;
        }
        
        // 最初は動画を一時停止
        video.pause();
        video.currentTime = 0;
        
        // 動画の準備完了を待つ
        if (video.readyState >= 3) { // HAVE_FUTURE_DATA
            console.log('[LoadingIntegration] 動画準備完了');
            state.videoReady = true;
            checkAndStartAnimations();
        } else {
            video.addEventListener('canplay', () => {
                console.log('[LoadingIntegration] 動画準備完了（canplay）');
                state.videoReady = true;
                checkAndStartAnimations();
            }, { once: true });
        }
    }
    
    // アニメーションとコンテンツの開始
    function checkAndStartAnimations() {
        if (!state.loadingComplete || !state.videoReady || state.animationsStarted) {
            return;
        }
        
        console.log('[LoadingIntegration] アニメーション開始');
        state.animationsStarted = true;
        
        // 少し遅延を入れてスムーズな遷移を実現
        setTimeout(() => {
            // 1. 動画を再生開始
            const video = document.querySelector('.hero-video');
            if (video) {
                video.play().catch(err => {
                    console.warn('[LoadingIntegration] 動画の自動再生に失敗:', err);
                });
                
                // フェードイン効果
                video.style.opacity = '0';
                video.style.transition = 'opacity 1.5s ease-out';
                setTimeout(() => {
                    video.style.opacity = '1';
                }, 100);
            }
            
            // 2. ヒーローコンテンツのアニメーション開始
            startHeroAnimations();
            
            // 3. スクロールアニメーションを有効化
            enableScrollAnimations();
            
        }, 300); // ローディング画面のフェードアウト後に開始
    }
    
    // ヒーローセクションのアニメーション（無効化）
    function startHeroAnimations() {
        const heroContent = document.querySelector('.hero-content');
        const heroTitle = document.querySelector('.hero-title');
        const heroSubtitle = document.querySelector('.hero-subtitle');
        const heroButtons = document.querySelector('.hero-buttons');
        const sectionBadge = document.querySelector('.section-badge');
        
        // すべて即座に表示（アニメーションなし）
        const elements = [sectionBadge, heroTitle, heroSubtitle, heroButtons];
        elements.forEach(el => {
            if (el) {
                el.style.opacity = '1';
                el.style.transform = 'none';
                el.style.transition = 'none';
                el.style.visibility = 'visible';
            }
        });
        
        // スクロールインジケーターも即座に表示
        const scrollIndicator = document.querySelector('.scroll-indicator');
        if (scrollIndicator) {
            scrollIndicator.style.opacity = '1';
            scrollIndicator.style.transition = 'none';
        }
    }
    
    // スクロールアニメーションの有効化
    function enableScrollAnimations() {
        // scroll-fade.jsのアニメーションをトリガー
        if (window.initScrollAnimations && typeof window.initScrollAnimations === 'function') {
            window.initScrollAnimations();
        }
        
        // フェードイン要素の監視を開始
        const fadeElements = document.querySelectorAll(
            '.service-card, .comparison-item, .case-study, .data-card, ' +
            '.pricing-card, .process-step, .faq-category, .news-month, ' +
            '.cta-card, .section-title, .section-description'
        );
        
        // 初期状態を設定（まだvisibleでない要素のみ）
        fadeElements.forEach(el => {
            if (!el.classList.contains('visible')) {
                el.style.opacity = '0';
            }
        });
        
        console.log('[LoadingIntegration] スクロールアニメーション有効化完了');
    }
    
    // 初期化
    function init() {
        // DOMContentLoadedを待つ
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        
        console.log('[LoadingIntegration] DOM準備完了、初期化開始');
        
        // ローディング画面の監視開始
        observeLoadingScreen();
        
        // 動画の準備開始
        prepareVideo();
    }
    
    // グローバルに公開（デバッグ用）
    window.homepageLoadingIntegration = {
        state: state,
        checkAndStartAnimations: checkAndStartAnimations,
        startHeroAnimations: startHeroAnimations
    };
    
    // 初期化開始
    init();
    
})();