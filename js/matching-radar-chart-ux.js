/**
 * レーダーチャートのUX改善
 * インタラクティブ機能とビジュアルエンハンスメント
 */

class MatchingRadarChartUX {
    constructor() {
        this.config = {
            animationDuration: 800,
            hoverScale: 1.05,
            tooltipDelay: 200,
            touchSensitivity: 10,
            colors: {
                primary: '#3b82f6',
                secondary: '#60a5fa',
                accent: '#f59e0b',
                background: 'rgba(59, 130, 246, 0.1)',
                hover: 'rgba(59, 130, 246, 0.3)',
                text: '#1f2937',
                grid: 'rgba(156, 163, 175, 0.3)'
            },
            labels: {
                businessSynergy: '事業相性',
                solutionMatch: '課題解決',
                businessTrends: 'トレンド',
                growthPhaseMatch: '成長適合',
                urgencyAlignment: '緊急度',
                resourceComplement: 'リソース'
            }
        };

        // インタラクション状態
        this.activeCharts = new Map();
        this.hoveredChart = null;
        this.tooltipElement = null;
        
        // タッチデバイス検出
        this.isTouchDevice = 'ontouchstart' in window;
        
        // アニメーション用
        this.animationFrames = new Map();
        
        this.init();
    }

    /**
     * 初期化
     */
    init() {
        // ツールチップ要素の作成
        this.createTooltipElement();
        
        // グローバルイベントリスナー
        this.setupGlobalListeners();
        
        // スタイルの注入
        this.injectStyles();
        
        // 既存チャートの拡張
        this.enhanceExistingCharts();
        
        console.log('[RadarChartUX] UX拡張機能初期化完了');
    }

    /**
     * ツールチップ要素の作成
     */
    createTooltipElement() {
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = 'radar-chart-tooltip';
        document.body.appendChild(this.tooltipElement);
    }

    /**
     * スタイルの注入
     */
    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .radar-chart-container {
                position: relative;
                cursor: pointer;
                transition: transform 0.3s ease;
            }
            
            .radar-chart-container:hover {
                transform: scale(${this.config.hoverScale});
            }
            
            .radar-chart-tooltip {
                position: fixed;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 12px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                font-size: 14px;
                z-index: 10000;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s ease;
                max-width: 200px;
            }
            
            .radar-chart-tooltip.visible {
                opacity: 1;
            }
            
            .radar-chart-tooltip h4 {
                margin: 0 0 8px 0;
                font-size: 16px;
                font-weight: 600;
                color: #1f2937;
            }
            
            .radar-chart-tooltip .metric {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px 0;
                border-bottom: 1px solid #f3f4f6;
            }
            
            .radar-chart-tooltip .metric:last-child {
                border-bottom: none;
            }
            
            .radar-chart-tooltip .metric-name {
                color: #6b7280;
                font-size: 13px;
            }
            
            .radar-chart-tooltip .metric-value {
                color: #1f2937;
                font-weight: 500;
                font-size: 14px;
            }
            
            .radar-chart-tooltip .metric-bar {
                width: 100%;
                height: 4px;
                background: #e5e7eb;
                border-radius: 2px;
                margin-top: 4px;
                overflow: hidden;
            }
            
            .radar-chart-tooltip .metric-bar-fill {
                height: 100%;
                background: ${this.config.colors.primary};
                transition: width 0.3s ease;
            }
            
            .radar-chart-legend {
                position: absolute;
                bottom: -30px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 16px;
                font-size: 12px;
                color: #6b7280;
                flex-wrap: wrap;
                justify-content: center;
                max-width: 100%;
                padding: 0 10px;
            }
            
            .radar-chart-legend-item {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .radar-chart-legend-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: ${this.config.colors.primary};
            }
            
            @media (hover: hover) {
                .radar-chart-container canvas {
                    transition: filter 0.2s ease;
                }
                
                .radar-chart-container:hover canvas {
                    filter: brightness(1.05);
                }
            }
            
            @media (max-width: 768px) {
                .radar-chart-container {
                    touch-action: manipulation;
                }
                
                .radar-chart-tooltip {
                    font-size: 13px;
                    padding: 10px;
                }
            }
            
            .radar-chart-fullscreen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            
            .radar-chart-fullscreen.active {
                opacity: 1;
                visibility: visible;
            }
            
            .radar-chart-fullscreen canvas {
                max-width: 90%;
                max-height: 90%;
                cursor: zoom-out;
            }
            
            .radar-chart-close {
                position: absolute;
                top: 20px;
                right: 20px;
                width: 40px;
                height: 40px;
                background: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: transform 0.2s ease;
            }
            
            .radar-chart-close:hover {
                transform: scale(1.1);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * グローバルイベントリスナーの設定
     */
    setupGlobalListeners() {
        // マウス移動でツールチップを更新
        document.addEventListener('mousemove', (e) => {
            if (this.hoveredChart) {
                this.updateTooltipPosition(e.clientX, e.clientY);
            }
        });
        
        // タッチデバイスのサポート
        if (this.isTouchDevice) {
            document.addEventListener('touchstart', this.handleTouchStart.bind(this));
            document.addEventListener('touchmove', this.handleTouchMove.bind(this));
            document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        }
    }

    /**
     * 既存チャートの拡張
     */
    enhanceExistingCharts() {
        // MutationObserverで新しいチャートを監視
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList?.contains('radar-chart-container')) {
                        this.enhanceChart(node);
                    } else if (node.nodeType === 1) {
                        const containers = node.querySelectorAll('.radar-chart-container');
                        containers.forEach(container => this.enhanceChart(container));
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // 既存のチャートを拡張
        document.querySelectorAll('.radar-chart-container').forEach(container => {
            this.enhanceChart(container);
        });
    }

    /**
     * 個別チャートの拡張
     */
    enhanceChart(container) {
        const canvas = container.querySelector('canvas');
        if (!canvas) return;
        
        const chartId = this.generateChartId();
        container.setAttribute('data-chart-id', chartId);
        
        // インタラクティブ機能の追加
        this.addInteractivity(container, canvas, chartId);
        
        // アニメーションの追加
        this.addAnimation(container, canvas, chartId);
        
        // 凡例の追加
        this.addLegend(container);
        
        // フルスクリーン機能
        this.addFullscreenCapability(container, canvas);
        
        this.activeCharts.set(chartId, {
            container,
            canvas,
            data: this.extractDataFromCanvas(canvas)
        });
    }

    /**
     * インタラクティブ機能の追加
     */
    addInteractivity(container, canvas, chartId) {
        // マウスイベント
        canvas.addEventListener('mouseenter', (e) => {
            this.hoveredChart = chartId;
            this.showTooltip(chartId, e.clientX, e.clientY);
        });
        
        canvas.addEventListener('mouseleave', () => {
            this.hoveredChart = null;
            this.hideTooltip();
        });
        
        // クリックで詳細表示
        canvas.addEventListener('click', (e) => {
            this.showDetailView(chartId, e);
        });
        
        // タッチイベント
        if (this.isTouchDevice) {
            canvas.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                this.hoveredChart = chartId;
                this.showTooltip(chartId, touch.clientX, touch.clientY);
            });
        }
    }

    /**
     * アニメーションの追加
     */
    addAnimation(container, canvas, chartId) {
        const ctx = canvas.getContext('2d');
        const originalData = this.extractDataFromCanvas(canvas);
        
        // エントリーアニメーション
        this.animateEntry(ctx, originalData, canvas.width, canvas.height);
        
        // ホバーアニメーション
        canvas.addEventListener('mouseenter', () => {
            this.animateHover(ctx, originalData, canvas.width, canvas.height, true);
        });
        
        canvas.addEventListener('mouseleave', () => {
            this.animateHover(ctx, originalData, canvas.width, canvas.height, false);
        });
    }

    /**
     * エントリーアニメーション
     */
    animateEntry(ctx, data, width, height) {
        const duration = this.config.animationDuration;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // イージング関数
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            
            // クリアして再描画
            ctx.clearRect(0, 0, width, height);
            
            // スケールアップアニメーション
            ctx.save();
            ctx.translate(width / 2, height / 2);
            ctx.scale(easeOutQuart, easeOutQuart);
            ctx.translate(-width / 2, -height / 2);
            
            // チャートを再描画（既存のdrawOptimizedChartを使用）
            if (window.matchingRadarChartPerformance) {
                window.matchingRadarChartPerformance.drawOptimizedChart(ctx, data, width, height);
            }
            
            ctx.restore();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * ツールチップの表示
     */
    showTooltip(chartId, x, y) {
        const chart = this.activeCharts.get(chartId);
        if (!chart) return;
        
        const data = chart.data;
        const container = chart.container;
        const card = container.closest('.matching-card');
        const userName = card?.querySelector('h3')?.textContent || 'ユーザー';
        
        // ツールチップの内容を構築
        let content = `<h4>${userName}</h4>`;
        
        Object.entries(data).forEach(([key, value]) => {
            const label = this.config.labels[key] || key;
            content += `
                <div class="metric">
                    <div>
                        <div class="metric-name">${label}</div>
                        <div class="metric-bar">
                            <div class="metric-bar-fill" style="width: ${value}%"></div>
                        </div>
                    </div>
                    <div class="metric-value">${value}%</div>
                </div>
            `;
        });
        
        this.tooltipElement.innerHTML = content;
        this.tooltipElement.classList.add('visible');
        this.updateTooltipPosition(x, y);
    }

    /**
     * ツールチップの非表示
     */
    hideTooltip() {
        this.tooltipElement.classList.remove('visible');
    }

    /**
     * ツールチップ位置の更新
     */
    updateTooltipPosition(x, y) {
        const tooltip = this.tooltipElement;
        const rect = tooltip.getBoundingClientRect();
        const padding = 10;
        
        // 画面端での位置調整
        let left = x + padding;
        let top = y + padding;
        
        if (left + rect.width > window.innerWidth) {
            left = x - rect.width - padding;
        }
        
        if (top + rect.height > window.innerHeight) {
            top = y - rect.height - padding;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }

    /**
     * 凡例の追加
     */
    addLegend(container) {
        const legend = document.createElement('div');
        legend.className = 'radar-chart-legend';
        
        // 簡易凡例（最大3項目）
        const items = ['高評価', '中評価', '要改善'];
        const colors = ['#10b981', '#f59e0b', '#ef4444'];
        
        items.forEach((item, index) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'radar-chart-legend-item';
            legendItem.innerHTML = `
                <span class="radar-chart-legend-dot" style="background: ${colors[index]}"></span>
                <span>${item}</span>
            `;
            legend.appendChild(legendItem);
        });
        
        container.appendChild(legend);
    }

    /**
     * フルスクリーン機能
     */
    addFullscreenCapability(container, canvas) {
        const fullscreenContainer = document.createElement('div');
        fullscreenContainer.className = 'radar-chart-fullscreen';
        
        const closeButton = document.createElement('div');
        closeButton.className = 'radar-chart-close';
        closeButton.innerHTML = '✕';
        
        const fullscreenCanvas = document.createElement('canvas');
        fullscreenCanvas.width = 600;
        fullscreenCanvas.height = 600;
        
        fullscreenContainer.appendChild(fullscreenCanvas);
        fullscreenContainer.appendChild(closeButton);
        document.body.appendChild(fullscreenContainer);
        
        // ダブルクリックでフルスクリーン
        canvas.addEventListener('dblclick', () => {
            // 大きなキャンバスに再描画
            const ctx = fullscreenCanvas.getContext('2d');
            ctx.clearRect(0, 0, 600, 600);
            
            const data = this.extractDataFromCanvas(canvas);
            if (window.matchingRadarChartPerformance) {
                window.matchingRadarChartPerformance.drawOptimizedChart(ctx, data, 600, 600);
            }
            
            fullscreenContainer.classList.add('active');
        });
        
        // 閉じるボタン
        closeButton.addEventListener('click', () => {
            fullscreenContainer.classList.remove('active');
        });
        
        // キャンバスクリックでも閉じる
        fullscreenCanvas.addEventListener('click', () => {
            fullscreenContainer.classList.remove('active');
        });
    }

    /**
     * データ抽出（仮実装）
     */
    extractDataFromCanvas(canvas) {
        // 実際のデータ取得ロジックが必要
        const card = canvas.closest('.matching-card');
        if (card && card.radarChartData) {
            return card.radarChartData;
        }
        
        // デフォルトデータ
        return {
            businessSynergy: 85,
            solutionMatch: 70,
            businessTrends: 90,
            growthPhaseMatch: 75,
            urgencyAlignment: 60,
            resourceComplement: 80
        };
    }

    /**
     * チャートIDの生成
     */
    generateChartId() {
        return `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * タッチイベントハンドラー
     */
    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }

    handleTouchMove(e) {
        if (!this.touchStartX || !this.touchStartY) return;
        
        const deltaX = e.touches[0].clientX - this.touchStartX;
        const deltaY = e.touches[0].clientY - this.touchStartY;
        
        if (Math.abs(deltaX) > this.config.touchSensitivity || 
            Math.abs(deltaY) > this.config.touchSensitivity) {
            this.hideTooltip();
        }
    }

    handleTouchEnd() {
        this.touchStartX = null;
        this.touchStartY = null;
    }

    /**
     * 詳細ビューの表示
     */
    showDetailView(chartId, event) {
        const chart = this.activeCharts.get(chartId);
        if (!chart) return;
        
        // アニメーション付きで詳細情報を表示
        const card = chart.container.closest('.matching-card');
        if (card) {
            card.style.transform = 'scale(1.02)';
            setTimeout(() => {
                card.style.transform = '';
            }, 200);
        }
    }

    /**
     * パフォーマンスレポート
     */
    getPerformanceReport() {
        return {
            activeCharts: this.activeCharts.size,
            animationsActive: this.animationFrames.size,
            tooltipVisible: this.tooltipElement.classList.contains('visible')
        };
    }
}

// グローバルに公開
window.matchingRadarChartUX = new MatchingRadarChartUX();

console.log('[RadarChartUX] UX改善機能が有効になりました');
console.log('[RadarChartUX] ダブルクリックでフルスクリーン表示');
console.log('[RadarChartUX] ホバーで詳細情報表示');