/**
 * Homepage All Conflicts Fix
 * すべてのローディングとアニメーションの競合を解決
 */

(function() {
    'use strict';
    
    // console.log('[AllConflictsFix] 競合解決開始');
    
    // 競合している全スクリプトを無効化
    const ConflictResolver = {
        // 無効化すべきグローバル関数リスト
        conflictingFunctions: [
            // ローディング関連
            'observeLoadingScreen',
            'initLoadingScreen',
            'createLoadingScreen',
            'hideLoadingScreen',
            'checkLoadingComplete',
            
            // アニメーション関連
            'initHeroAnimation',
            'typewriterEffect',
            'animateTitle',
            'startPageAnimations',
            'initScrollAnimations',
            'digitalTextEffect'
        ],
        
        // 無効化すべきイベントリスナー
        conflictingEvents: [
            { target: document, type: 'DOMContentLoaded', pattern: /loading|animation|typewriter/i },
            { target: window, type: 'load', pattern: /loading|animation|typewriter/i }
        ],
        
        // すべての競合を無効化
        disableAll() {
            // console.log('[AllConflictsFix] 競合関数を無効化');
            
            // グローバル関数を無効化
            this.conflictingFunctions.forEach(fnName => {
                if (window[fnName]) {
                    // console.log(`[AllConflictsFix] ${fnName}を無効化`);
                    window[fnName] = function() {
                        // console.log(`[AllConflictsFix] ${fnName}は無効化されています`);
                    };
                }
            });
            
            // イベントリスナーを上書き
            this.overrideEventListeners();
            
            // 既存のローディング画面を削除
            this.removeExistingLoadingScreens();
        },
        
        // イベントリスナーの上書き
        overrideEventListeners() {
            const originalAddEventListener = EventTarget.prototype.addEventListener;
            
            EventTarget.prototype.addEventListener = function(type, listener, options) {
                const listenerStr = listener.toString();
                
                // 競合するイベントリスナーをブロック
                for (const conflict of ConflictResolver.conflictingEvents) {
                    if (this === conflict.target && type === conflict.type && conflict.pattern.test(listenerStr)) {
                        // console.log(`[AllConflictsFix] ブロック: ${type}イベント`);
                        return;
                    }
                }
                
                return originalAddEventListener.call(this, type, listener, options);
            };
        },
        
        // 既存のローディング画面を削除
        removeExistingLoadingScreens() {
            const existingScreens = [
                '#loadingScreen',
                '.loading-screen',
                '#instantLoadingScreen div.loading-screen' // 既存の重複
            ];
            
            existingScreens.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el.id !== 'instantLoadingScreen') {
                        // console.log(`[AllConflictsFix] 削除: ${selector}`);
                        el.remove();
                    }
                });
            });
        }
    };
    
    // 統一されたローディングマネージャー
    const UnifiedLoader = {
        screen: null,
        video: null,
        initialized: false,
        animationStarted: false,
        
        init() {
            if (this.initialized) return;
            
            // console.log('[AllConflictsFix] 統一ローダー初期化');
            
            // instantLoadingScreenのみを使用
            this.screen = document.getElementById('instantLoadingScreen');
            if (!this.screen) {
                console.warn('[AllConflictsFix] instantLoadingScreenが見つかりません');
                return;
            }
            
            // 既存の動画を取得または作成
            this.setupVideo();
            
            // ローディング完了処理
            this.setupCompletion();
            
            this.initialized = true;
        },
        
        setupVideo() {
            // 既存の動画を確認
            let video = this.screen.querySelector('video');
            
            if (!video) {
                // 動画がない場合は追加
                const container = this.screen.querySelector('div');
                if (container) {
                    const videoHTML = `
                        <video class="loading-video" autoplay muted loop playsinline style="
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
            
            this.video = video;
            
            if (this.video) {
                this.video.playbackRate = 2.0;
                this.video.play().catch(err => {
                    // console.log('[AllConflictsFix] 動画再生エラー:', err);
                });
            }
        },
        
        setupCompletion() {
            const minDuration = 2000;
            const maxDuration = 5000;
            const startTime = Date.now();
            let completed = false;
            
            const complete = () => {
                if (completed) return;
                completed = true;
                
                // console.log('[AllConflictsFix] ローディング完了');
                
                // フェードアウト
                this.screen.style.transition = 'opacity 0.8s ease-out';
                this.screen.style.opacity = '0';
                
                setTimeout(() => {
                    this.screen.style.display = 'none';
                    document.body.style.overflow = '';
                    
                    // 統一されたアニメーション開始
                    this.startUnifiedAnimations();
                }, 800);
            };
            
            // 最小時間経過後に完了
            setTimeout(() => {
                const elapsed = Date.now() - startTime;
                if (elapsed >= minDuration) {
                    complete();
                }
            }, minDuration);
            
            // 最大時間でのフォールバック
            setTimeout(complete, maxDuration);
        },
        
        startUnifiedAnimations() {
            if (this.animationStarted) return;
            this.animationStarted = true;
            
            // console.log('[AllConflictsFix] 統一アニメーション開始');
            
            // ヒーロー動画再生
            const heroVideo = document.querySelector('.hero-video');
            if (heroVideo) {
                heroVideo.play().catch(err => {
                    console.warn('[AllConflictsFix] Hero video autoplay failed:', err);
                });
            }
            
            // タイトルアニメーション（統一版）
            this.animateHeroText();
            
            // その他の要素フェードイン
            this.fadeInElements();
        },
        
        animateHeroText() {
            const heroTitle = document.querySelector('.hero-title');
            const heroSubtitle = document.querySelector('.hero-subtitle');
            
            if (!heroTitle) return;
            
            // 初期化
            heroTitle.style.opacity = '1';
            heroTitle.style.visibility = 'visible';
            
            const originalHTML = heroTitle.innerHTML;
            const text = heroTitle.textContent || '';
            
            heroTitle.innerHTML = '';
            let index = 0;
            
            const typeChar = () => {
                if (index < text.length) {
                    heroTitle.textContent = text.substring(0, index + 1);
                    index++;
                    setTimeout(typeChar, 20); // 2.5倍速
                } else {
                    // 元のHTMLを復元（改行を含む）
                    heroTitle.innerHTML = originalHTML;
                    
                    // サブタイトル
                    if (heroSubtitle) {
                        heroSubtitle.style.opacity = '1';
                        heroSubtitle.style.visibility = 'visible';
                        
                        const subHTML = heroSubtitle.innerHTML;
                        const subText = heroSubtitle.textContent || '';
                        
                        heroSubtitle.innerHTML = '';
                        let subIndex = 0;
                        
                        const typeSubChar = () => {
                            if (subIndex < subText.length) {
                                heroSubtitle.textContent = subText.substring(0, subIndex + 1);
                                subIndex++;
                                setTimeout(typeSubChar, 20);
                            } else {
                                heroSubtitle.innerHTML = subHTML;
                            }
                        };
                        
                        setTimeout(typeSubChar, 200);
                    }
                }
            };
            
            setTimeout(typeChar, 200);
        },
        
        fadeInElements() {
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
    };
    
    // 実行順序を制御
    // 1. まず競合を無効化
    ConflictResolver.disableAll();
    
    // 2. 統一ローダーを初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            UnifiedLoader.init();
        });
    } else {
        UnifiedLoader.init();
    }
    
    // 3. グローバルに公開（デバッグ用）
    window.AllConflictsFix = {
        ConflictResolver,
        UnifiedLoader
    };
    
    // console.log('[AllConflictsFix] 初期化完了');
    
})();