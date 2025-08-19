/**
 * Performance Monitor
 * メモリリークとパフォーマンス問題を検出・報告
 */

(function() {
    'use strict';
    
    const PerformanceMonitor = {
        // 監視設定
        config: {
            memoryCheckInterval: 10000, // 10秒ごと
            memoryThreshold: 100 * 1024 * 1024, // 100MB
            animationCheckInterval: 5000, // 5秒ごと
            enableLogging: true
        },
        
        // 監視データ
        data: {
            initialMemory: 0,
            peakMemory: 0,
            leakDetected: false,
            runningAnimations: new Set(),
            observers: [],
            eventListeners: new Map(),
            timeouts: new Set(),
            intervals: new Set()
        },
        
        // 初期化
        init() {
            if (!performance.memory) {
                console.warn('Performance Memory API not available');
                return;
            }
            
            this.data.initialMemory = performance.memory.usedJSHeapSize;
            
            // メモリ監視開始
            this.startMemoryMonitoring();
            
            // アニメーション監視開始
            this.startAnimationMonitoring();
            
            // DOM変更監視
            this.startDOMMutationMonitoring();
            
            // ネイティブ関数をラップ
            this.wrapNativeFunctions();
            
            // console.log('Performance Monitor initialized');
        },
        
        // メモリ監視
        startMemoryMonitoring() {
            // 既存のインターバルをクリア
            if (this.memoryInterval) {
                clearInterval(this.memoryInterval);
            }
            this.memoryInterval = setInterval(() => {
                const currentMemory = performance.memory.usedJSHeapSize;
                const memoryIncrease = currentMemory - this.data.initialMemory;
                
                // ピーク更新
                if (currentMemory > this.data.peakMemory) {
                    this.data.peakMemory = currentMemory;
                }
                
                // メモリリーク検出
                if (memoryIncrease > this.config.memoryThreshold) {
                    this.data.leakDetected = true;
                    this.reportMemoryLeak(memoryIncrease);
                }
                
                if (this.config.enableLogging) {
                    // console.log(`Memory usage: ${(currentMemory / 1024 / 1024).toFixed(2)}MB (Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB)`);
                }
            }, this.config.memoryCheckInterval);
        },
        
        // アニメーション監視
        startAnimationMonitoring() {
            // 既存のインターバルをクリア
            if (this.animationInterval) {
                clearInterval(this.animationInterval);
            }
            this.animationInterval = setInterval(() => {
                // CSS アニメーション検出
                const animatedElements = document.querySelectorAll('*');
                let infiniteAnimations = 0;
                
                animatedElements.forEach(element => {
                    const style = getComputedStyle(element);
                    const animationName = style.animationName;
                    const animationIterationCount = style.animationIterationCount;
                    
                    if (animationName && animationName !== 'none') {
                        if (animationIterationCount === 'infinite') {
                            infiniteAnimations++;
                            this.data.runningAnimations.add(element);
                        }
                    }
                });
                
                if (infiniteAnimations > 10) {
                    console.warn(`Warning: ${infiniteAnimations} infinite animations detected`);
                }
            }, this.config.animationCheckInterval);
        },
        
        // DOM変更監視
        startDOMMutationMonitoring() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    // 削除されたノードのリソース確認
                    mutation.removedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            this.checkForLeakedResources(node);
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        },
        
        // ネイティブ関数ラップ
        wrapNativeFunctions() {
            // setTimeout ラップ
            const originalSetTimeout = window.setTimeout;
            window.setTimeout = function(...args) {
                const timeoutId = originalSetTimeout.apply(this, args);
                PerformanceMonitor.data.timeouts.add(timeoutId);
                return timeoutId;
            };
            
            // clearTimeout ラップ
            const originalClearTimeout = window.clearTimeout;
            window.clearTimeout = function(id) {
                PerformanceMonitor.data.timeouts.delete(id);
                return originalClearTimeout.apply(this, arguments);
            };
            
            // setInterval ラップ
            const originalSetInterval = window.setInterval;
            window.setInterval = function(...args) {
                const intervalId = originalSetInterval.apply(this, args);
                PerformanceMonitor.data.intervals.add(intervalId);
                return intervalId;
            };
            
            // clearInterval ラップ
            const originalClearInterval = window.clearInterval;
            window.clearInterval = function(id) {
                PerformanceMonitor.data.intervals.delete(id);
                return originalClearInterval.apply(this, arguments);
            };
            
            // addEventListener ラップ
            const originalAddEventListener = EventTarget.prototype.addEventListener;
            EventTarget.prototype.addEventListener = function(type, listener, options) {
                if (!PerformanceMonitor.data.eventListeners.has(this)) {
                    PerformanceMonitor.data.eventListeners.set(this, new Set());
                }
                PerformanceMonitor.data.eventListeners.get(this).add({ type, listener, options });
                return originalAddEventListener.apply(this, arguments);
            };
        },
        
        // リークしたリソースの確認
        checkForLeakedResources(element) {
            // ビデオ要素のチェック
            const videos = element.querySelectorAll('video');
            videos.forEach(video => {
                if (video.src || video.srcObject) {
                    console.warn('Video element removed without clearing source:', video);
                }
            });
            
            // Canvas要素のチェック
            const canvases = element.querySelectorAll('canvas');
            canvases.forEach(canvas => {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    console.warn('Canvas element removed with active context:', canvas);
                }
            });
        },
        
        // メモリリーク報告
        reportMemoryLeak(increase) {
            const report = {
                timestamp: new Date().toISOString(),
                memoryIncrease: `${(increase / 1024 / 1024).toFixed(2)}MB`,
                peakMemory: `${(this.data.peakMemory / 1024 / 1024).toFixed(2)}MB`,
                activeTimeouts: this.data.timeouts.size,
                activeIntervals: this.data.intervals.size,
                infiniteAnimations: this.data.runningAnimations.size,
                eventListeners: this.data.eventListeners.size
            };
            
            console.error('Memory leak detected!', report);
            
            // レポートをローカルストレージに保存
            const reports = JSON.parse(localStorage.getItem('performanceReports') || '[]');
            reports.push(report);
            localStorage.setItem('performanceReports', JSON.stringify(reports));
        },
        
        // 現在の状態を取得
        getStatus() {
            return {
                currentMemory: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
                memoryIncrease: `${((performance.memory.usedJSHeapSize - this.data.initialMemory) / 1024 / 1024).toFixed(2)}MB`,
                activeTimeouts: this.data.timeouts.size,
                activeIntervals: this.data.intervals.size,
                infiniteAnimations: this.data.runningAnimations.size,
                eventListeners: this.data.eventListeners.size,
                leakDetected: this.data.leakDetected
            };
        },
        
        // レポートをクリア
        clearReports() {
            localStorage.removeItem('performanceReports');
            // console.log('Performance reports cleared');
        },
        
        // クリーンアップ
        cleanup() {
            if (this.memoryInterval) {
                clearInterval(this.memoryInterval);
                this.memoryInterval = null;
            }
            if (this.animationInterval) {
                clearInterval(this.animationInterval);
                this.animationInterval = null;
            }
            // console.log('Performance monitor cleaned up');
        },
        
        // 監視を停止
        stop() {
            // Note: In production, you would store interval IDs and clear them here
            // console.log('Performance Monitor stopped');
        }
    };
    
    // 開発環境でのみ有効化
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.PerformanceMonitor = PerformanceMonitor;
        PerformanceMonitor.init();
    }
})();