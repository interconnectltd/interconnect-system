/**
 * レーダーチャート統合システム
 * すべてのレーダーチャート機能を統合し、完全な実装を提供
 */

class MatchingRadarChartIntegration {
    constructor() {
        // シングルトンパターン
        if (window.matchingRadarChartIntegration) {
            return window.matchingRadarChartIntegration;
        }

        // 統合設定
        this.config = {
            enabled: true,
            debug: localStorage.getItem('debugMode') === 'true',
            features: {
                animation: true,
                interaction: true,
                performance: true,
                accessibility: true
            }
        };

        // コンポーネント参照
        this.components = {
            base: null,
            enhanced: null,
            performance: null,
            ux: null,
            dataIntegrity: null
        };

        // データストア
        this.dataStore = new Map();
        
        // エラーログ
        this.errors = [];
        
        // 初期化
        this.init();
    }

    /**
     * 初期化
     */
    async init() {
        try {
            console.log('[RadarChartIntegration] 統合システム初期化開始');
            
            // 依存関係の確認
            await this.checkDependencies();
            
            // コンポーネントの初期化
            await this.initializeComponents();
            
            // データ連携の設定
            this.setupDataIntegration();
            
            // イベントリスナーの設定
            this.setupEventListeners();
            
            // 既存チャートの修正
            this.fixExistingCharts();
            
            // パフォーマンス最適化
            this.optimizePerformance();
            
            // アクセシビリティ対応
            this.setupAccessibility();
            
            console.log('[RadarChartIntegration] 初期化完了');
            
        } catch (error) {
            console.error('[RadarChartIntegration] 初期化エラー:', error);
            this.handleError('init', error);
        }
    }

    /**
     * 依存関係の確認
     */
    async checkDependencies() {
        const required = [
            'matchingRadarChart',
            'MatchingRadarChartEnhanced',
            'matchingRadarChartPerformance',
            'matchingRadarChartUX',
            'matchingDataIntegrity'
        ];

        const missing = [];
        
        required.forEach(dep => {
            if (!window[dep]) {
                missing.push(dep);
            }
        });

        if (missing.length > 0) {
            throw new Error(`Missing dependencies: ${missing.join(', ')}`);
        }

        // コンポーネント参照の保存
        this.components = {
            base: window.matchingRadarChart,
            enhanced: window.MatchingRadarChartEnhanced,
            performance: window.matchingRadarChartPerformance,
            ux: window.matchingRadarChartUX,
            dataIntegrity: window.matchingDataIntegrity
        };
    }

    /**
     * コンポーネントの初期化
     */
    async initializeComponents() {
        // Enhanced チャートのインスタンス管理
        if (!window.radarChartInstances) {
            window.radarChartInstances = new Map();
        }
        
        // パフォーマンスモニタリング
        this.setupPerformanceMonitoring();
    }

    /**
     * データ連携の設定
     */
    setupDataIntegration() {
        // extractDataFromCanvas の正しい実装
        if (this.components.ux) {
            this.components.ux.extractDataFromCanvas = (canvas) => {
                return this.extractChartData(canvas);
            };
        }

        // レーダーチャートデータの自動保存
        this.interceptChartRendering();
    }

    /**
     * チャートレンダリングの介入
     */
    interceptChartRendering() {
        // Enhanced チャートのrender メソッドを拡張
        if (!this.components.enhanced || !this.components.enhanced.prototype) {
            console.warn('[RadarChartIntegration] Enhanced component not properly initialized');
            return;
        }
        
        const originalRender = this.components.enhanced.prototype.render;
        if (!originalRender) {
            console.warn('[RadarChartIntegration] render method not found');
            return;
        }
        
        const integration = this;
        
        this.components.enhanced.prototype.render = function(container, data) {
            try {
                // データを保存
                const chartId = integration.generateChartId(container);
                integration.dataStore.set(chartId, {
                    data: data,
                    timestamp: Date.now(),
                    container: container
                });

                // カードにデータを添付
                const card = container.closest('.matching-card');
                if (card) {
                    card.dataset.chartId = chartId;
                    card.radarChartData = data;
                }

                // オリジナルのレンダリングを実行
                const result = originalRender.call(this, container, data);

                // 後処理
                integration.postProcessChart(container, data);
                
                return result;

            } catch (error) {
                integration.handleError('render', error);
                // フォールバック
                return originalRender.call(this, container, data);
            }
        };
    }

    /**
     * チャートデータの抽出
     */
    extractChartData(canvas) {
        try {
            // キャンバスの親要素からデータを取得
            const container = canvas.parentElement;
            const card = container?.closest('.matching-card');
            
            if (card) {
                // データストアから取得
                const chartId = card.dataset.chartId;
                if (chartId && this.dataStore.has(chartId)) {
                    return this.dataStore.get(chartId).data;
                }
                
                // カードの属性から取得
                if (card.radarChartData) {
                    return card.radarChartData;
                }
            }

            // ローカルストレージから取得を試行
            const userId = this.extractUserIdFromCard(card);
            if (userId) {
                const storedData = this.getStoredChartData(userId);
                if (storedData) {
                    return storedData;
                }
            }

            // デフォルトデータ
            return this.getDefaultChartData();

        } catch (error) {
            this.handleError('extractChartData', error);
            return this.getDefaultChartData();
        }
    }

    /**
     * ユーザーIDの抽出
     */
    extractUserIdFromCard(card) {
        if (!card) return null;
        
        // プロフィールリンクから抽出
        const profileLink = card.querySelector('a[href*="profile.html"]');
        if (profileLink) {
            const match = profileLink.href.match(/user=(\d+)/);
            if (match) return match[1];
        }
        
        // データ属性から抽出
        return card.dataset.userId || null;
    }

    /**
     * 保存されたチャートデータの取得
     */
    getStoredChartData(userId) {
        try {
            const scoreKey = `ai_score_${userId}_${window.supabase.auth.user()?.id}`;
            const storedScore = localStorage.getItem(scoreKey);
            
            if (storedScore) {
                const parsed = JSON.parse(storedScore);
                if (parsed.breakdown) {
                    // データ整合性チェック
                    const validated = this.components.dataIntegrity.validateScoreBreakdown(parsed.breakdown);
                    return validated.data;
                }
            }
        } catch (error) {
            this.handleError('getStoredChartData', error);
        }
        
        return null;
    }

    /**
     * デフォルトチャートデータ
     */
    getDefaultChartData() {
        return {
            businessSynergy: 50,
            solutionMatch: 50,
            businessTrends: 50,
            growthPhaseMatch: 50,
            urgencyAlignment: 50,
            resourceComplement: 50
        };
    }

    /**
     * チャートの後処理
     */
    postProcessChart(container, data) {
        // アクセシビリティ属性の追加
        const canvas = container.querySelector('canvas');
        if (canvas) {
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', this.generateAriaLabel(data));
            canvas.tabIndex = 0;
        }

        // データ属性の追加
        container.dataset.chartRendered = 'true';
        container.dataset.chartTimestamp = Date.now();
    }

    /**
     * ARIAラベルの生成
     */
    generateAriaLabel(data) {
        const labels = {
            businessSynergy: '事業相性',
            solutionMatch: '課題解決',
            businessTrends: 'トレンド',
            growthPhaseMatch: '成長適合',
            urgencyAlignment: '緊急度',
            resourceComplement: 'リソース'
        };

        const descriptions = Object.entries(data)
            .map(([key, value]) => `${labels[key] || key}: ${value}%`)
            .join(', ');

        return `レーダーチャート: ${descriptions}`;
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        // グローバルエラーハンドリング
        window.addEventListener('error', (event) => {
            if (event.filename?.includes('radar-chart')) {
                this.handleError('global', event.error);
                event.preventDefault();
            }
        });

        // パフォーマンス監視
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.name.includes('radar-chart')) {
                        this.logPerformance(entry);
                    }
                }
            });
            observer.observe({ entryTypes: ['measure', 'function'] });
        }
    }

    /**
     * 既存チャートの修正
     */
    fixExistingCharts() {
        const containers = document.querySelectorAll('.radar-chart-container');
        containers.forEach(container => {
            if (!container.dataset.chartRendered) {
                this.repairChart(container);
            }
        });
    }

    /**
     * チャートの修復
     */
    repairChart(container) {
        try {
            const card = container.closest('.matching-card');
            if (!card) return;

            // データの取得または生成
            let data = this.extractChartData(container.querySelector('canvas'));
            
            // データ検証
            const validated = this.components.dataIntegrity.validateScoreBreakdown(data);
            data = validated.data;

            // 再レンダリング
            const enhancedChart = new this.components.enhanced();
            enhancedChart.render(container, data);

            console.log('[RadarChartIntegration] チャート修復完了');

        } catch (error) {
            this.handleError('repairChart', error);
        }
    }

    /**
     * パフォーマンス最適化
     */
    optimizePerformance() {
        // メモリリーク対策
        this.setupMemoryManagement();
        
        // 遅延レンダリング
        this.setupLazyRendering();
        
        // バッチ処理の最適化
        this.optimizeBatchProcessing();
    }

    /**
     * メモリ管理の設定
     */
    setupMemoryManagement() {
        // 古いデータの自動削除
        setInterval(() => {
            const now = Date.now();
            const maxAge = 30 * 60 * 1000; // 30分
            
            for (const [key, value] of this.dataStore.entries()) {
                if (now - value.timestamp > maxAge) {
                    this.dataStore.delete(key);
                }
            }
            
            // キャンバスプールのクリーンアップ
            if (this.components.performance?.canvasPool) {
                const pool = this.components.performance.canvasPool;
                while (pool.length > 10) {
                    pool.pop();
                }
            }
            
        }, 5 * 60 * 1000); // 5分ごと
    }

    /**
     * 遅延レンダリングの設定
     */
    setupLazyRendering() {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const container = entry.target;
                        if (!container.dataset.chartRendered) {
                            this.renderChartWhenReady(container);
                        }
                    }
                });
            }, {
                rootMargin: '50px'
            });

            // 未レンダリングのコンテナを監視
            document.querySelectorAll('.radar-chart-container:not([data-chart-rendered])')
                .forEach(container => observer.observe(container));
        }
    }

    /**
     * チャートのレンダリング準備
     */
    async renderChartWhenReady(container) {
        try {
            const card = container.closest('.matching-card');
            if (!card) return;

            // データ取得
            const data = await this.fetchChartData(card);
            
            // レンダリング
            const enhancedChart = new this.components.enhanced();
            enhancedChart.render(container, data);

        } catch (error) {
            this.handleError('renderChartWhenReady', error);
        }
    }

    /**
     * チャートデータの取得
     */
    async fetchChartData(card) {
        // 既存のデータチェック
        const existingData = this.extractChartData(card.querySelector('canvas'));
        if (existingData && !this.isDefaultData(existingData)) {
            return existingData;
        }

        // AIスコアの取得を試行
        const userId = this.extractUserIdFromCard(card);
        if (userId && window.matchingAIScoring) {
            try {
                const score = await window.matchingAIScoring.getOrCalculateScore(
                    userId,
                    window.supabase.auth.user()?.id
                );
                if (score?.breakdown) {
                    return score.breakdown;
                }
            } catch (error) {
                console.warn('[RadarChartIntegration] AIスコア取得失敗:', error);
            }
        }

        return this.getDefaultChartData();
    }

    /**
     * デフォルトデータかどうかの判定
     */
    isDefaultData(data) {
        return Object.values(data).every(value => value === 50);
    }

    /**
     * バッチ処理の最適化
     */
    optimizeBatchProcessing() {
        if (this.components.performance) {
            // バッチサイズの動的調整
            const updateBatchSize = () => {
                const fps = this.measureFPS();
                if (fps < 30) {
                    this.components.performance.config.renderBatchSize = Math.max(1, 
                        this.components.performance.config.renderBatchSize - 1);
                } else if (fps > 50) {
                    this.components.performance.config.renderBatchSize = Math.min(10,
                        this.components.performance.config.renderBatchSize + 1);
                }
            };

            setInterval(updateBatchSize, 1000);
        }
    }

    /**
     * FPS測定
     */
    measureFPS() {
        if (!this.fpsData) {
            this.fpsData = {
                frames: 0,
                lastTime: performance.now()
            };
        }

        const now = performance.now();
        const delta = now - this.fpsData.lastTime;
        
        if (delta >= 1000) {
            const fps = (this.fpsData.frames * 1000) / delta;
            this.fpsData.frames = 0;
            this.fpsData.lastTime = now;
            return fps;
        }

        this.fpsData.frames++;
        return 60; // デフォルト
    }

    /**
     * アクセシビリティ対応
     */
    setupAccessibility() {
        // キーボードナビゲーション
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'CANVAS' && e.target.closest('.radar-chart-container')) {
                this.handleKeyboardNavigation(e);
            }
        });

        // スクリーンリーダー用の説明追加
        this.addScreenReaderSupport();
    }

    /**
     * キーボードナビゲーション処理
     */
    handleKeyboardNavigation(event) {
        const canvas = event.target;
        const container = canvas.closest('.radar-chart-container');
        
        switch (event.key) {
            case 'Enter':
            case ' ':
                // フルスクリーン表示
                if (this.components.ux) {
                    canvas.dispatchEvent(new Event('dblclick'));
                }
                event.preventDefault();
                break;
                
            case 'Tab':
                // 次の要素へのフォーカス（デフォルト動作）
                break;
                
            case 'Escape':
                // フルスクリーンを閉じる
                const fullscreen = document.querySelector('.radar-chart-fullscreen.active');
                if (fullscreen) {
                    fullscreen.classList.remove('active');
                }
                break;
        }
    }

    /**
     * スクリーンリーダーサポート
     */
    addScreenReaderSupport() {
        // 詳細説明用の隠し要素を追加
        const style = document.createElement('style');
        style.textContent = `
            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0,0,0,0);
                white-space: nowrap;
                border: 0;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * パフォーマンスモニタリング
     */
    setupPerformanceMonitoring() {
        this.performanceMetrics = {
            renderTimes: [],
            errors: [],
            memoryUsage: []
        };

        // レンダリング時間の計測
        const measureRender = (name, fn) => {
            return async (...args) => {
                const start = performance.now();
                try {
                    const result = await fn.apply(this, args);
                    const duration = performance.now() - start;
                    this.performanceMetrics.renderTimes.push({
                        name,
                        duration,
                        timestamp: Date.now()
                    });
                    return result;
                } catch (error) {
                    this.performanceMetrics.errors.push({
                        name,
                        error: error.message,
                        timestamp: Date.now()
                    });
                    throw error;
                }
            };
        };

        // メモリ使用量の監視
        if (performance.memory) {
            setInterval(() => {
                this.performanceMetrics.memoryUsage.push({
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    timestamp: Date.now()
                });
            }, 10000);
        }
    }

    /**
     * エラーハンドリング
     */
    handleError(context, error) {
        const errorInfo = {
            context,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };

        this.errors.push(errorInfo);
        
        if (this.config.debug) {
            console.error(`[RadarChartIntegration] ${context}:`, error);
        }

        // エラーが多い場合は機能を無効化
        if (this.errors.length > 50) {
            this.disable();
        }
    }

    /**
     * システムの無効化
     */
    disable() {
        console.warn('[RadarChartIntegration] エラーが多いため機能を無効化します');
        this.config.enabled = false;
        
        // クリーンアップ
        this.cleanup();
    }

    /**
     * クリーンアップ
     */
    cleanup() {
        // データストアのクリア
        this.dataStore.clear();
        
        // イベントリスナーの削除
        // （実装省略）
        
        // メモリ解放
        this.components = {};
        this.performanceMetrics = null;
    }

    /**
     * チャートIDの生成
     */
    generateChartId(container) {
        return `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * パフォーマンスログ
     */
    logPerformance(entry) {
        if (this.config.debug) {
            console.log('[RadarChartIntegration] Performance:', {
                name: entry.name,
                duration: entry.duration,
                startTime: entry.startTime
            });
        }
    }

    /**
     * 統合レポート生成
     */
    generateReport() {
        return {
            status: this.config.enabled ? 'active' : 'disabled',
            errors: this.errors.length,
            charts: this.dataStore.size,
            performance: {
                avgRenderTime: this.calculateAvgRenderTime(),
                memoryUsage: this.getCurrentMemoryUsage(),
                errorRate: this.calculateErrorRate()
            },
            recommendations: this.generateRecommendations()
        };
    }

    /**
     * 平均レンダリング時間の計算
     */
    calculateAvgRenderTime() {
        if (!this.performanceMetrics?.renderTimes.length) return 0;
        
        const sum = this.performanceMetrics.renderTimes
            .reduce((acc, curr) => acc + curr.duration, 0);
        
        return (sum / this.performanceMetrics.renderTimes.length).toFixed(2);
    }

    /**
     * 現在のメモリ使用量
     */
    getCurrentMemoryUsage() {
        if (!performance.memory) return 'N/A';
        
        const used = performance.memory.usedJSHeapSize;
        const total = performance.memory.totalJSHeapSize;
        const percentage = ((used / total) * 100).toFixed(1);
        
        return `${percentage}% (${(used / 1024 / 1024).toFixed(1)}MB / ${(total / 1024 / 1024).toFixed(1)}MB)`;
    }

    /**
     * エラー率の計算
     */
    calculateErrorRate() {
        const total = this.performanceMetrics?.renderTimes.length || 0;
        const errors = this.errors.length;
        
        if (total === 0) return 0;
        return ((errors / (total + errors)) * 100).toFixed(1);
    }

    /**
     * 推奨事項の生成
     */
    generateRecommendations() {
        const recommendations = [];
        
        if (this.errors.length > 10) {
            recommendations.push('エラーが多発しています。ログを確認してください。');
        }
        
        const avgRenderTime = parseFloat(this.calculateAvgRenderTime());
        if (avgRenderTime > 100) {
            recommendations.push('レンダリング時間が長いです。パフォーマンス最適化を検討してください。');
        }
        
        if (this.dataStore.size > 100) {
            recommendations.push('メモリ使用量が多いです。古いデータのクリーンアップを実行してください。');
        }
        
        return recommendations;
    }
}

// グローバルに公開
window.matchingRadarChartIntegration = new MatchingRadarChartIntegration();

// 開発者向けコマンド
console.log('[RadarChartIntegration] 統合システム有効');
console.log('[RadarChartIntegration] レポート: window.matchingRadarChartIntegration.generateReport()');
console.log('[RadarChartIntegration] デバッグモード: localStorage.setItem("debugMode", "true")');