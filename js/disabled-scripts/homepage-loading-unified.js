/**
 * Homepage Loading Unified
 * ローディング画面の統一実装
 */

(function() {
    'use strict';
    
    // console.log('[LoadingUnified] 初期化開始');
    
    // グローバルフラグで重複実行を防ぐ
    if (window._loadingInitialized) {
        // console.log('[LoadingUnified] 既に初期化済み');
        return;
    }
    window._loadingInitialized = true;
    
    const LoadingManager = {
        screen: null,
        video: null,
        bar: null,
        initialized: false,
        
        init() {
            if (this.initialized) return;
            
            this.screen = document.getElementById('instantLoadingScreen');
            if (!this.screen) {
                console.warn('[LoadingUnified] ローディング画面が見つかりません');
                return;
            }
            
            // ローディング画面のスタイルを統一
            this.setupStyles();
            
            // 動画を追加（重複チェック付き）
            this.addVideo();
            
            // プログレスバーを初期化
            this.initProgressBar();
            
            // ローディング完了処理を設定
            this.setupCompletion();
            
            this.initialized = true;
        },
        
        setupStyles() {
            // 既存のスタイルをリセット
            this.screen.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: #000;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: opacity 0.8s ease-out;
            `;
            
            // コンテナのスタイル
            const container = this.screen.querySelector('div');
            if (container) {
                container.style.cssText = `
                    position: relative;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                
                // テキストコンテナ
                const textContainer = container.querySelector('div');
                if (textContainer) {
                    textContainer.style.cssText = `
                        position: relative;
                        z-index: 10;
                        text-align: center;
                    `;
                }
            }
        },
        
        addVideo() {
            // 既存の動画をチェック
            const existingVideo = this.screen.querySelector('video');
            if (existingVideo) {
                // console.log('[LoadingUnified] 動画は既に存在します');
                this.video = existingVideo;
                this.styleVideo(existingVideo);
                return;
            }
            
            // 動画HTMLを作成
            const videoHTML = `
                <video class="loading-video" autoplay muted loop playsinline>
                    <source src="assets/interconnect-top.mp4" type="video/mp4">
                </video>
            `;
            
            const container = this.screen.querySelector('div');
            if (container) {
                container.insertAdjacentHTML('afterbegin', videoHTML);
                this.video = container.querySelector('video');
                
                if (this.video) {
                    this.styleVideo(this.video);
                    this.video.playbackRate = 2.0;
                    
                    // 再生を試みる
                    this.video.play().catch(err => {
                        // console.log('[LoadingUnified] 動画の自動再生に失敗:', err);
                    });
                }
            }
        },
        
        styleVideo(video) {
            video.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                z-index: 1;
            `;
        },
        
        initProgressBar() {
            this.bar = document.getElementById('loadingBar');
            if (this.bar) {
                // アニメーション開始
                setTimeout(() => {
                    this.bar.style.width = '100%';
                }, 100);
            }
        },
        
        setupCompletion() {
            let completed = false;
            const minDuration = 2000; // 最小表示時間
            const maxDuration = 5000; // 最大表示時間
            const startTime = Date.now();
            
            const complete = () => {
                if (completed) return;
                completed = true;
                
                // console.log('[LoadingUnified] ローディング完了処理開始');
                
                // フェードアウト
                this.screen.style.opacity = '0';
                
                setTimeout(() => {
                    this.screen.style.display = 'none';
                    document.body.style.overflow = '';
                    
                    // ページアニメーション開始
                    this.startPageAnimations();
                    
                    // クリーンアップ
                    this.cleanup();
                }, 800);
            };
            
            // 動画の進行状況を監視
            if (this.video) {
                const checkProgress = setInterval(() => {
                    if (!this.video || !this.video.duration) return;
                    
                    const progress = (this.video.currentTime / this.video.duration) * 100;
                    const elapsed = Date.now() - startTime;
                    
                    // 動画が80%以上進行、かつ最小時間経過
                    if (progress >= 80 && elapsed >= minDuration) {
                        clearInterval(checkProgress);
                        complete();
                    }
                }, 50);
                
                // 最大時間でのフォールバック
                setTimeout(() => {
                    clearInterval(checkProgress);
                    complete();
                }, maxDuration);
            } else {
                // 動画がない場合
                setTimeout(complete, minDuration);
            }
            
            // DOMContentLoadedでも完了を試みる
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    const elapsed = Date.now() - startTime;
                    if (elapsed >= minDuration) {
                        complete();
                    } else {
                        setTimeout(complete, minDuration - elapsed);
                    }
                });
            }
        },
        
        startPageAnimations() {
            // console.log('[LoadingUnified] ページアニメーション開始');
            
            // ヒーロー動画の再生
            const heroVideo = document.querySelector('.hero-video');
            if (heroVideo) {
                heroVideo.play().catch(err => {
                    console.warn('[LoadingUnified] Hero video autoplay failed:', err);
                });
            }
            
            // タイトルアニメーション
            this.animateTitle();
            
            // その他の要素のフェードイン
            this.fadeInElements();
        },
        
        animateTitle() {
            const heroTitle = document.querySelector('.hero-title');
            const heroSubtitle = document.querySelector('.hero-subtitle');
            
            if (!heroTitle) return;
            
            // 初期状態
            heroTitle.style.opacity = '1';
            heroTitle.style.visibility = 'visible';
            
            // HTMLを保存
            const originalHTML = heroTitle.innerHTML;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = originalHTML;
            const text = tempDiv.textContent || '';
            
            // タイプライター効果
            heroTitle.innerHTML = '';
            let index = 0;
            
            const typeNextChar = () => {
                if (index < text.length) {
                    heroTitle.textContent = text.substring(0, index + 1);
                    index++;
                    setTimeout(typeNextChar, 20); // 2.5倍速
                } else {
                    // 完了時に元のHTMLを復元
                    heroTitle.innerHTML = originalHTML;
                    
                    // サブタイトルのアニメーション
                    if (heroSubtitle) {
                        this.animateSubtitle(heroSubtitle);
                    }
                }
            };
            
            setTimeout(typeNextChar, 200);
        },
        
        animateSubtitle(subtitle) {
            subtitle.style.opacity = '1';
            subtitle.style.visibility = 'visible';
            
            const originalHTML = subtitle.innerHTML;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = originalHTML;
            const text = tempDiv.textContent || '';
            
            subtitle.innerHTML = '';
            let index = 0;
            
            const typeSubtitle = () => {
                if (index < text.length) {
                    subtitle.textContent = text.substring(0, index + 1);
                    index++;
                    setTimeout(typeSubtitle, 20);
                } else {
                    subtitle.innerHTML = originalHTML;
                }
            };
            
            setTimeout(typeSubtitle, 200);
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
        },
        
        cleanup() {
            // 動画の参照をクリア
            this.video = null;
            this.screen = null;
            this.bar = null;
            
            // console.log('[LoadingUnified] クリーンアップ完了');
        }
    };
    
    // 初期化実行
    LoadingManager.init();
    
    // グローバルに公開（デバッグ用）
    window.LoadingManager = LoadingManager;
    
})();