/**
 * レーダーチャートのパフォーマンス最適化版
 * キャンバスの最適化とレンダリング効率の向上
 */

class MatchingRadarChartPerformance {
    constructor() {
        // キャンバスプール（再利用）
        this.canvasPool = [];
        this.activeCanvases = new Map();
        
        // レンダリングキュー
        this.renderQueue = [];
        this.isRendering = false;
        
        // パフォーマンス設定
        this.config = {
            maxConcurrentRenders: 3,
            renderBatchSize: 5,
            canvasPoolSize: 20,
            enableOffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
            enableImageBitmap: typeof createImageBitmap !== 'undefined',
            throttleDelay: 16, // 60fps
            debounceDelay: 100
        };
        
        // オフスクリーンキャンバスのサポート確認
        this.offscreenSupported = this.checkOffscreenSupport();
        
        // パフォーマンス計測
        this.metrics = {
            renderCount: 0,
            totalRenderTime: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        // レンダリングキャッシュ
        this.renderCache = new Map();
        this.cacheMaxSize = 50;
        
        // Web Worker（利用可能な場合）
        this.worker = null;
        if (window.Worker && this.offscreenSupported) {
            this.initializeWorker();
        }
        
        // リクエストアニメーションフレームのID
        this.rafId = null;
        
        // デバウンス用タイマー
        this.debounceTimer = null;
        
        this.init();
    }

    /**
     * 初期化
     */
    init() {
        // キャンバスプールの初期化
        this.initializeCanvasPool();
        
        // レンダリングループの開始
        this.startRenderLoop();
        
        // パフォーマンス監視
        this.setupPerformanceMonitoring();
        
        console.log('[RadarChartPerformance] 初期化完了', {
            offscreenSupported: this.offscreenSupported,
            workerEnabled: this.worker !== null,
            poolSize: this.config.canvasPoolSize
        });
    }

    /**
     * OffscreenCanvasのサポート確認
     */
    checkOffscreenSupport() {
        try {
            const canvas = document.createElement('canvas');
            return typeof canvas.transferControlToOffscreen === 'function';
        } catch (e) {
            return false;
        }
    }

    /**
     * Web Workerの初期化
     */
    initializeWorker() {
        try {
            // インラインWorkerを作成
            const workerCode = `
                self.addEventListener('message', function(e) {
                    const { canvas, data, config, id } = e.data;
                    
                    if (canvas) {
                        const ctx = canvas.getContext('2d');
                        // レンダリング処理（簡略版）
                        renderRadarChart(ctx, data, config);
                        
                        // ビットマップに変換して返す
                        canvas.convertToBlob().then(blob => {
                            self.postMessage({ id, blob }, [blob]);
                        });
                    }
                });
                
                function renderRadarChart(ctx, data, config) {
                    // ここにレンダリングロジックを実装
                    // 実際の実装は既存のdrawDataメソッドと同じ
                }
            `;
            
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            this.worker = new Worker(URL.createObjectURL(blob));
            
            this.worker.addEventListener('message', (e) => {
                this.handleWorkerMessage(e.data);
            });
            
        } catch (error) {
            console.warn('[RadarChartPerformance] Worker初期化失敗:', error);
            this.worker = null;
        }
    }

    /**
     * キャンバスプールの初期化
     */
    initializeCanvasPool() {
        for (let i = 0; i < this.config.canvasPoolSize; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            this.canvasPool.push(canvas);
        }
    }

    /**
     * キャンバスの取得（プールから）
     */
    getCanvas() {
        let canvas = this.canvasPool.pop();
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
        }
        return canvas;
    }

    /**
     * キャンバスの返却（プールへ）
     */
    releaseCanvas(canvas) {
        if (this.canvasPool.length < this.config.canvasPoolSize) {
            // キャンバスをクリア
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.canvasPool.push(canvas);
        }
    }

    /**
     * レンダリングループ
     */
    startRenderLoop() {
        const processQueue = () => {
            if (this.renderQueue.length > 0 && !this.isRendering) {
                this.isRendering = true;
                
                // バッチ処理
                const batch = this.renderQueue.splice(0, this.config.renderBatchSize);
                
                Promise.all(batch.map(item => this.processRenderItem(item)))
                    .then(() => {
                        this.isRendering = false;
                    })
                    .catch(error => {
                        console.error('[RadarChartPerformance] レンダリングエラー:', error);
                        this.isRendering = false;
                    });
            }
            
            this.rafId = requestAnimationFrame(processQueue);
        };
        
        processQueue();
    }

    /**
     * レンダリングアイテムの処理
     */
    async processRenderItem(item) {
        const { cardElement, data, callback } = item;
        const startTime = performance.now();
        
        try {
            // キャッシュチェック
            const cacheKey = this.generateCacheKey(data);
            const cached = this.renderCache.get(cacheKey);
            
            if (cached) {
                this.metrics.cacheHits++;
                await this.applyCanvas(cardElement, cached);
                if (callback) callback();
                return;
            }
            
            this.metrics.cacheMisses++;
            
            // レンダリング実行
            const canvas = await this.renderChart(data);
            
            // キャッシュに保存
            this.saveToCache(cacheKey, canvas);
            
            // カードに適用
            await this.applyCanvas(cardElement, canvas);
            
            // メトリクス更新
            this.metrics.renderCount++;
            this.metrics.totalRenderTime += performance.now() - startTime;
            
            if (callback) callback();
            
        } catch (error) {
            console.error('[RadarChartPerformance] レンダリングエラー:', error);
        }
    }

    /**
     * チャートのレンダリング
     */
    async renderChart(data) {
        if (this.worker && this.offscreenSupported) {
            // Web Workerでレンダリング
            return await this.renderWithWorker(data);
        } else {
            // メインスレッドでレンダリング
            return await this.renderOnMainThread(data);
        }
    }

    /**
     * メインスレッドでのレンダリング
     */
    async renderOnMainThread(data) {
        const canvas = this.getCanvas();
        const ctx = canvas.getContext('2d', { alpha: true });
        
        // アンチエイリアスの最適化
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // レンダリング（既存のロジックを使用）
        this.drawOptimizedChart(ctx, data, canvas.width, canvas.height);
        
        return canvas;
    }

    /**
     * 最適化されたチャート描画
     */
    drawOptimizedChart(ctx, data, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.35;
        
        // パスの事前計算
        const parameters = Object.keys(data);
        const angleStep = (Math.PI * 2) / parameters.length;
        const points = [];
        
        // 座標の事前計算
        parameters.forEach((param, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const value = data[param] / 100;
            const x = centerX + Math.cos(angle) * radius * value;
            const y = centerY + Math.sin(angle) * radius * value;
            points.push({ x, y, angle, value });
        });
        
        // バッチ描画で効率化
        ctx.save();
        
        // 背景グリッドの描画（パスを一度に作成）
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
        ctx.lineWidth = 1;
        
        // グリッドライン
        for (let i = 0.2; i <= 1; i += 0.2) {
            parameters.forEach((_, index) => {
                const angle = index * angleStep - Math.PI / 2;
                const x = centerX + Math.cos(angle) * radius * i;
                const y = centerY + Math.sin(angle) * radius * i;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.closePath();
        }
        
        // 軸線
        parameters.forEach((_, index) => {
            const angle = index * angleStep - Math.PI / 2;
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + Math.cos(angle) * radius,
                centerY + Math.sin(angle) * radius
            );
        });
        
        ctx.stroke();
        
        // データ描画
        ctx.beginPath();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        ctx.lineWidth = 2;
        
        points.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // データポイント
        ctx.fillStyle = 'rgba(59, 130, 246, 1)';
        points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.restore();
    }

    /**
     * キャッシュキーの生成
     */
    generateCacheKey(data) {
        return JSON.stringify(data);
    }

    /**
     * キャッシュへの保存
     */
    saveToCache(key, canvas) {
        // キャッシュサイズ制限
        if (this.renderCache.size >= this.cacheMaxSize) {
            const firstKey = this.renderCache.keys().next().value;
            const oldCanvas = this.renderCache.get(firstKey);
            this.releaseCanvas(oldCanvas);
            this.renderCache.delete(firstKey);
        }
        
        this.renderCache.set(key, canvas);
    }

    /**
     * キャンバスの適用
     */
    async applyCanvas(cardElement, canvas) {
        const container = cardElement.querySelector('.radar-chart-container');
        if (!container) return;
        
        // 既存のキャンバスを削除
        const existingCanvas = container.querySelector('canvas');
        if (existingCanvas) {
            container.removeChild(existingCanvas);
        }
        
        // 新しいキャンバスを追加
        const displayCanvas = canvas.cloneNode();
        displayCanvas.getContext('2d').drawImage(canvas, 0, 0);
        container.appendChild(displayCanvas);
    }

    /**
     * レンダリングのキューイング
     */
    queueRender(cardElement, data, callback) {
        // デバウンス処理
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(() => {
            this.renderQueue.push({ cardElement, data, callback });
            this.debounceTimer = null;
        }, this.config.debounceDelay);
    }

    /**
     * パフォーマンス監視
     */
    setupPerformanceMonitoring() {
        // 5秒ごとにメトリクスを出力
        setInterval(() => {
            if (this.metrics.renderCount > 0) {
                const avgRenderTime = this.metrics.totalRenderTime / this.metrics.renderCount;
                const cacheHitRate = this.metrics.cacheHits / 
                    (this.metrics.cacheHits + this.metrics.cacheMisses) * 100;
                
                console.log('[RadarChartPerformance] メトリクス:', {
                    総レンダリング数: this.metrics.renderCount,
                    平均レンダリング時間: `${avgRenderTime.toFixed(2)}ms`,
                    キャッシュヒット率: `${cacheHitRate.toFixed(1)}%`,
                    アクティブキャンバス数: this.activeCanvases.size,
                    プール残数: this.canvasPool.length
                });
            }
        }, 5000);
    }

    /**
     * リソースのクリーンアップ
     */
    cleanup() {
        // レンダリングループの停止
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        // Workerの終了
        if (this.worker) {
            this.worker.terminate();
        }
        
        // キャンバスプールのクリア
        this.canvasPool = [];
        this.activeCanvases.clear();
        this.renderCache.clear();
        
        // タイマーのクリア
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
    }

    /**
     * バッチレンダリング
     */
    batchRender(items) {
        items.forEach(item => {
            this.queueRender(item.element, item.data, item.callback);
        });
    }

    /**
     * プリロード
     */
    preloadCharts(dataArray) {
        dataArray.forEach(data => {
            const cacheKey = this.generateCacheKey(data);
            if (!this.renderCache.has(cacheKey)) {
                this.renderChart(data).then(canvas => {
                    this.saveToCache(cacheKey, canvas);
                });
            }
        });
    }
}

// 既存のシステムとの統合
window.matchingRadarChartPerformance = new MatchingRadarChartPerformance();

// 既存のレーダーチャートシステムを拡張
if (window.MatchingRadarChartEnhanced) {
    const originalRender = window.MatchingRadarChartEnhanced.prototype.render;
    
    window.MatchingRadarChartEnhanced.prototype.render = function(container, data) {
        // パフォーマンス最適化版を使用
        const card = container.closest('.matching-card');
        if (card && window.matchingRadarChartPerformance) {
            window.matchingRadarChartPerformance.queueRender(card, data, () => {
                console.log('[RadarChart] パフォーマンス最適化レンダリング完了');
            });
        } else {
            // フォールバック
            originalRender.call(this, container, data);
        }
    };
}

console.log('[RadarChartPerformance] パフォーマンス最適化システム有効');