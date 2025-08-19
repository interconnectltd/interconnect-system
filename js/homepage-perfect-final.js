/**
 * Homepage Perfect Final
 * 完璧な最終版 - すべての競合を解決し、必要な機能を統合
 */

(function() {
    'use strict';
    
    // console.log('[PerfectFinal] 初期化開始');
    
    // グローバル状態管理
    const GlobalState = {
        initialized: false,
        loadingComplete: false,
        animationsStarted: false,
        scrollObserversSetup: false
    };
    
    // すべての競合スクリプトを無効化
    const DisableConflicts = {
        init() {
            // 競合する可能性のあるすべての関数を無効化
            const conflictingFunctions = [
                'observeLoadingScreen', 'initLoadingScreen', 'createLoadingScreen',
                'hideLoadingScreen', 'checkLoadingComplete', 'initHeroAnimation',
                'typewriterEffect', 'animateTitle', 'startPageAnimations',
                'initScrollAnimations', 'digitalTextEffect', 'LoadingManager',
                'UnifiedLoader', 'AllConflictsFix', 'initScrollEffects'
            ];
            
            conflictingFunctions.forEach(fn => {
                if (window[fn]) {
                    window[fn] = () => {}; // console.log(`[PerfectFinal] ${fn} は無効化されています`);
                }
            });
            
            // イベントリスナーの上書き
            this.overrideEventListeners();
        },
        
        overrideEventListeners() {
            const original = EventTarget.prototype.addEventListener;
            EventTarget.prototype.addEventListener = function(type, listener, options) {
                const listenerStr = listener.toString();
                
                // ローディング・アニメーション関連のリスナーをブロック
                if ((type === 'DOMContentLoaded' || type === 'load') && 
                    /loading|animation|typewriter|scroll.*fade/i.test(listenerStr)) {
                    // console.log(`[PerfectFinal] ブロック: ${type}イベント`);
                    return;
                }
                
                return original.call(this, type, listener, options);
            };
        }
    };
    
    // 完璧なローディング管理
    const PerfectLoader = {
        init() {
            if (GlobalState.initialized) return;
            GlobalState.initialized = true;
            
            const screen = document.getElementById('instantLoadingScreen');
            if (!screen) {
                // console.log('[PerfectFinal] ローディング画面なし、スキップ');
                GlobalState.loadingComplete = true;
                this.onComplete();
                return;
            }
            
            // プログレスバーアニメーションを開始（インラインスクリプトの代わり）
            const bar = document.getElementById('loadingBar');
            if (bar) {
                // インラインスクリプトと同じタイミング
                setTimeout(() => {
                    bar.style.width = '100%';
                }, 10);
            }
            
            // 動画の追加（重複チェック付き）
            this.setupVideo(screen);
            
            // 完了処理のセットアップ
            this.setupCompletion(screen);
        },
        
        setupVideo(screen) {
            let video = screen.querySelector('video');
            if (!video) {
                const container = screen.querySelector('div');
                if (container) {
                    const videoHTML = `
                        <video autoplay muted loop playsinline style="
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                            z-index: 1;
                        ">
                            <source src="assets/interconnect-top.mp4" type="video/mp4">
                        </video>
                    `;
                    container.insertAdjacentHTML('afterbegin', videoHTML);
                    video = container.querySelector('video');
                }
            }
            
            if (video) {
                video.playbackRate = 2.0;
                video.play().catch(err => // console.log('[PerfectFinal] 動画再生エラー:', err));
            }
        },
        
        setupCompletion(screen) {
            const minTime = 2000;
            const startTime = Date.now();
            
            const complete = () => {
                if (GlobalState.loadingComplete) return;
                GlobalState.loadingComplete = true;
                
                // console.log('[PerfectFinal] ローディング完了');
                
                screen.style.transition = 'opacity 0.8s ease-out';
                screen.style.opacity = '0';
                
                setTimeout(() => {
                    screen.style.display = 'none';
                    document.body.style.overflow = '';
                    document.body.classList.add('loading-complete');
                    this.onComplete();
                }, 800);
            };
            
            // 最小時間経過後に完了
            setTimeout(() => {
                if (Date.now() - startTime >= minTime) {
                    complete();
                }
            }, minTime);
        },
        
        onComplete() {
            // ローディング画面を消す
            const screen = document.getElementById('instantLoadingScreen');
            if (screen) {
                screen.style.display = 'none';
            }
            
            // アニメーション開始
            PerfectAnimator.start();
            // スクロールオブザーバー設定
            ScrollEffects.init();
        }
    };
    
    // 完璧なアニメーション管理
    const PerfectAnimator = {
        start() {
            if (GlobalState.animationsStarted) return;
            GlobalState.animationsStarted = true;
            
            // console.log('[PerfectFinal] アニメーション開始');
            
            // ヒーロー動画再生
            const heroVideo = document.querySelector('.hero-video');
            if (heroVideo) {
                heroVideo.play().catch(err => console.warn('[PerfectFinal] Hero video error:', err));
            }
            
            // タイトルアニメーション
            this.animateHeroTitle();
            
            // その他の要素フェードイン
            this.fadeInElements();
        },
        
        animateHeroTitle() {
            // タイプライター効果を無効化
            const title = document.querySelector('.hero-title');
            const subtitle = document.querySelector('.hero-subtitle');
            
            if (title) {
                title.style.opacity = '1';
                title.style.visibility = 'visible';
            }
            if (subtitle) {
                subtitle.style.opacity = '1';
                subtitle.style.visibility = 'visible';
            }
        },
        
        typewriter(element, callback) {
            element.style.opacity = '1';
            element.style.visibility = 'visible';
            
            const originalHTML = element.innerHTML;
            const text = element.textContent || '';
            
            element.innerHTML = '';
            let index = 0;
            
            const type = () => {
                if (index < text.length) {
                    element.textContent = text.substring(0, index + 1);
                    index++;
                    setTimeout(type, 20); // 2.5倍速
                } else {
                    element.innerHTML = originalHTML;
                    if (callback) setTimeout(callback, 200);
                }
            };
            
            setTimeout(type, 200);
        },
        
        fadeInElements() {
            // アニメーションを無効化
            const elements = [
                '.section-badge',
                '.hero-buttons',
                '.scroll-indicator'
            ];
            
            elements.forEach((selector) => {
                const el = document.querySelector(selector);
                if (el) {
                    el.style.opacity = '1';
                    el.style.transform = 'none';
                    el.style.transition = 'none';
                    el.style.visibility = 'visible';
                }
            });
        }
    };
    
    // スクロールエフェクト（scroll-fade.jsの機能を統合）
    const ScrollEffects = {
        init() {
            if (GlobalState.scrollObserversSetup) return;
            GlobalState.scrollObserversSetup = true;
            
            // console.log('[PerfectFinal] スクロールエフェクト初期化');
            
            // フェードイン対象要素
            const fadeElements = document.querySelectorAll(
                '.service-card, .comparison-item, .case-study, .data-card, ' +
                '.pricing-card, .process-step, .faq-category, .news-month, ' +
                '.cta-card, .section-title, .section-description, .about-item, ' +
                '.feature-card, .event-card, .contact-item'
            );
            
            if (!('IntersectionObserver' in window)) {
                fadeElements.forEach(el => {
                    el.style.opacity = '1';
                    el.style.transform = 'none';
                });
                return;
            }
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
            
            fadeElements.forEach(el => observer.observe(el));
            
            // 数字カウントアップ
            this.setupCounters();
        },
        
        setupCounters() {
            const counterElements = document.querySelectorAll('.data-value');
            if (!counterElements.length) return;
            
            const performanceSection = document.querySelector('.performance-data');
            if (!performanceSection) return;
            
            const counterObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        counterElements.forEach(el => {
                            this.animateCounter(el, el.textContent);
                        });
                        counterObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.3 });
            
            counterObserver.observe(performanceSection);
        },
        
        animateCounter(element, target) {
            const duration = 2000;
            const steps = 60;
            const stepDuration = duration / steps;
            const numericTarget = parseFloat(target.replace(/[^0-9.]/g, ''));
            let current = 0;
            
            element.textContent = '0';
            
            const counter = setInterval(() => {
                current += numericTarget / steps;
                
                if (current >= numericTarget) {
                    current = numericTarget;
                    element.textContent = target;
                    clearInterval(counter);
                } else {
                    const randomNum = Math.floor(Math.random() * numericTarget * 1.5);
                    element.textContent = randomNum + target.replace(/[0-9.]+/, '');
                }
            }, stepDuration);
        }
    };
    
    // 初期化実行
    DisableConflicts.init();
    
    // DOMContentLoadedで初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            PerfectLoader.init();
        });
    } else {
        PerfectLoader.init();
    }
    
    // グローバル公開（デバッグ用）
    window.HomepagePerfectFinal = {
        GlobalState,
        DisableConflicts,
        PerfectLoader,
        PerfectAnimator,
        ScrollEffects
    };
    
})();