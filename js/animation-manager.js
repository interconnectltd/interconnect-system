/**
 * Animation Manager
 * requestAnimationFrameの統一管理システム
 * 
 * 機能：
 * - 複数のアニメーションを一つのrequestAnimationFrameで管理
 * - パフォーマンスモニタリング
 * - 自動的なFPS調整
 * - ページ非表示時の自動停止
 */

(function() {
    'use strict';
    
    class AnimationManager {
        constructor() {
            this.animations = new Map();
            this.rafId = null;
            this.isRunning = false;
            this.fps = 60;
            this.frameInterval = 1000 / this.fps;
            this.lastFrameTime = 0;
            this.performanceMode = 'normal'; // 'low', 'normal', 'high'
            
            // パフォーマンスカウンター
            this.frameCount = 0;
            this.lastPerformanceCheck = performance.now();
            this.actualFPS = 60;
            
            // 初期化
            this.init();
        }
        
        init() {
            // ページ表示状態の監視
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.pause();
                } else {
                    this.resume();
                }
            });
            
            // ウィンドウフォーカスの監視
            window.addEventListener('blur', () => this.setPerformanceMode('low'));
            window.addEventListener('focus', () => this.setPerformanceMode('normal'));
            
            // クリーンアップ
            window.addEventListener('beforeunload', () => this.destroy());
        }
        
        /**
         * アニメーションを登録
         * @param {string} id - アニメーションの識別子
         * @param {Function} callback - アニメーション関数
         * @param {Object} options - オプション
         */
        register(id, callback, options = {}) {
            if (typeof callback !== 'function') {
                console.error('AnimationManager: callback must be a function');
                return false;
            }
            
            this.animations.set(id, {
                callback,
                priority: options.priority || 0,
                enabled: true,
                fps: options.fps || this.fps
            });
            
            // 優先度でソート
            this.sortAnimations();
            
            // 初回起動
            if (!this.isRunning && this.animations.size > 0) {
                this.start();
            }
            
            return true;
        }
        
        /**
         * アニメーションを解除
         * @param {string} id - アニメーションの識別子
         */
        unregister(id) {
            const removed = this.animations.delete(id);
            
            // アニメーションがなくなったら停止
            if (this.animations.size === 0) {
                this.stop();
            }
            
            return removed;
        }
        
        /**
         * アニメーションループ
         */
        animate(currentTime) {
            if (!this.isRunning) return;
            
            // FPS制限
            const deltaTime = currentTime - this.lastFrameTime;
            
            // パフォーマンスモードに応じたフレーム間隔
            const targetInterval = this.getTargetInterval();
            
            if (deltaTime >= targetInterval) {
                // FPS計測
                this.measurePerformance(currentTime);
                
                // 有効なアニメーションを実行
                for (const [id, animation] of this.animations) {
                    if (animation.enabled) {
                        try {
                            animation.callback(deltaTime, currentTime);
                        } catch (error) {
                            console.error(`AnimationManager: Error in animation '${id}':`, error);
                            // エラーが発生したアニメーションを無効化
                            animation.enabled = false;
                        }
                    }
                }
                
                this.lastFrameTime = currentTime - (deltaTime % targetInterval);
            }
            
            this.rafId = requestAnimationFrame((time) => this.animate(time));
        }
        
        /**
         * パフォーマンス計測
         */
        measurePerformance(currentTime) {
            this.frameCount++;
            
            const elapsed = currentTime - this.lastPerformanceCheck;
            if (elapsed >= 1000) {
                this.actualFPS = Math.round((this.frameCount * 1000) / elapsed);
                this.frameCount = 0;
                this.lastPerformanceCheck = currentTime;
                
                // 自動パフォーマンス調整
                this.autoAdjustPerformance();
            }
        }
        
        /**
         * パフォーマンス自動調整
         */
        autoAdjustPerformance() {
            if (this.actualFPS < 30 && this.performanceMode !== 'low') {
                this.setPerformanceMode('low');
                // console.log('AnimationManager: Switching to low performance mode');
            } else if (this.actualFPS > 50 && this.performanceMode === 'low') {
                this.setPerformanceMode('normal');
                // console.log('AnimationManager: Switching to normal performance mode');
            }
        }
        
        /**
         * パフォーマンスモード設定
         */
        setPerformanceMode(mode) {
            this.performanceMode = mode;
            
            switch(mode) {
                case 'low':
                    this.fps = 30;
                    break;
                case 'high':
                    this.fps = 120;
                    break;
                default:
                    this.fps = 60;
            }
            
            this.frameInterval = 1000 / this.fps;
        }
        
        /**
         * ターゲットフレーム間隔を取得
         */
        getTargetInterval() {
            // バッテリーセーバーモードの考慮
            if (navigator.getBattery) {
                navigator.getBattery().then(battery => {
                    if (battery.level < 0.2 && !battery.charging) {
                        return this.frameInterval * 2; // バッテリー低下時はFPSを半分に
                    }
                });
            }
            
            return this.frameInterval;
        }
        
        /**
         * アニメーションを優先度順にソート
         */
        sortAnimations() {
            const sorted = new Map([...this.animations.entries()].sort((a, b) => 
                b[1].priority - a[1].priority
            ));
            this.animations = sorted;
        }
        
        /**
         * アニメーション開始
         */
        start() {
            if (!this.isRunning) {
                this.isRunning = true;
                this.lastFrameTime = performance.now();
                this.rafId = requestAnimationFrame((time) => this.animate(time));
            }
        }
        
        /**
         * アニメーション停止
         */
        stop() {
            this.isRunning = false;
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }
        }
        
        /**
         * 一時停止
         */
        pause() {
            this.stop();
        }
        
        /**
         * 再開
         */
        resume() {
            if (this.animations.size > 0 && document.visibilityState === 'visible') {
                this.start();
            }
        }
        
        /**
         * 特定のアニメーションを有効/無効化
         */
        setEnabled(id, enabled) {
            const animation = this.animations.get(id);
            if (animation) {
                animation.enabled = enabled;
            }
        }
        
        /**
         * ステータス取得
         */
        getStatus() {
            return {
                isRunning: this.isRunning,
                animationCount: this.animations.size,
                fps: this.actualFPS,
                performanceMode: this.performanceMode,
                animations: Array.from(this.animations.keys())
            };
        }
        
        /**
         * 破棄
         */
        destroy() {
            this.stop();
            this.animations.clear();
        }
    }
    
    // シングルトンインスタンスを作成
    window.AnimationManager = new AnimationManager();
    
    // 使用例をコンソールに出力
    // console.log('AnimationManager initialized. Usage:');
    // console.log('AnimationManager.register("myAnimation", (delta, time) => { /* animation code */ })');
    // console.log('AnimationManager.unregister("myAnimation")');
    // console.log('AnimationManager.getStatus()');
    
})();