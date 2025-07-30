/**
 * レーダーチャート表示の改善版
 * MutationObserverを使用して確実にカードが描画されてからチャートを追加
 */

(function() {
    'use strict';

    // 既存のレーダーチャートクラスを拡張
    const originalRadarChart = window.matchingRadarChart;
    
    class EnhancedRadarChart {
        constructor() {
            this.observer = null;
            this.pendingCharts = new Map();
            this.renderQueue = [];
            this.isProcessing = false;
        }

        /**
         * 初期化
         */
        init() {
            // DOMの変更を監視
            this.setupMutationObserver();
            
            // 既存のメソッドをオーバーライド
            this.overrideIntegrationMethods();
            
            console.log('[EnhancedRadarChart] 初期化完了');
        }

        /**
         * MutationObserverの設定
         */
        setupMutationObserver() {
            const targetNode = document.querySelector('.matching-grid');
            if (!targetNode) {
                // matching-gridがまだない場合は、後で再試行
                setTimeout(() => this.setupMutationObserver(), 500);
                return;
            }

            const config = {
                childList: true,
                subtree: true,
                attributes: false
            };

            this.observer = new MutationObserver((mutationsList) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1 && node.classList?.contains('matching-card')) {
                                this.handleNewCard(node);
                            }
                        });
                    }
                }
            });

            this.observer.observe(targetNode, config);
        }

        /**
         * 新しいカードが追加された時の処理
         */
        handleNewCard(cardElement) {
            // カードのユニークIDを取得または生成
            const cardId = this.getCardId(cardElement);
            
            // ペンディング中のチャートデータがあるか確認
            if (this.pendingCharts.has(cardId)) {
                const chartData = this.pendingCharts.get(cardId);
                this.renderChartWhenReady(cardElement, chartData);
                this.pendingCharts.delete(cardId);
            }
        }

        /**
         * カードのIDを取得
         */
        getCardId(cardElement) {
            // プロフィール名からIDを生成
            const nameElement = cardElement.querySelector('h3');
            if (nameElement) {
                return btoa(nameElement.textContent.trim());
            }
            return `card-${Date.now()}-${Math.random()}`;
        }

        /**
         * チャートの描画準備ができたら実行
         */
        renderChartWhenReady(cardElement, chartData) {
            // カードが完全に描画されているか確認
            const checkAndRender = () => {
                const rect = cardElement.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    // IntersectionObserverで画面内に入ったときに描画
                    this.setupLazyRendering(cardElement, chartData);
                } else {
                    // まだ描画されていない場合は再試行
                    requestAnimationFrame(checkAndRender);
                }
            };
            
            checkAndRender();
        }

        /**
         * 遅延レンダリングの設定
         */
        setupLazyRendering(cardElement, chartData) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.renderChart(cardElement, chartData);
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                root: null,
                rootMargin: '50px',
                threshold: 0.1
            });

            observer.observe(cardElement);
        }

        /**
         * チャートを実際に描画
         */
        renderChart(cardElement, chartData) {
            // キューに追加
            this.renderQueue.push({ cardElement, chartData });
            
            // キューを処理
            if (!this.isProcessing) {
                this.processRenderQueue();
            }
        }

        /**
         * レンダリングキューを処理
         */
        async processRenderQueue() {
            this.isProcessing = true;

            while (this.renderQueue.length > 0) {
                const { cardElement, chartData } = this.renderQueue.shift();
                
                try {
                    // データの検証と正規化
                    const normalizedData = this.normalizeChartData(chartData);
                    
                    // 元のレーダーチャートクラスを使用して描画
                    originalRadarChart.addToMatchingCard(cardElement, normalizedData);
                    
                    // パフォーマンスのため少し待機
                    await this.sleep(16); // 約60fps
                } catch (error) {
                    console.error('[EnhancedRadarChart] レンダリングエラー:', error);
                }
            }

            this.isProcessing = false;
        }

        /**
         * チャートデータの正規化
         */
        normalizeChartData(data) {
            const defaultData = {
                businessSynergy: 50,
                solutionMatch: 50,
                businessTrends: 50,
                growthPhaseMatch: 50,
                urgencyAlignment: 50,
                resourceComplement: 50
            };

            // データが不完全な場合はデフォルト値で補完
            const normalized = { ...defaultData };
            
            if (data && typeof data === 'object') {
                Object.keys(defaultData).forEach(key => {
                    if (typeof data[key] === 'number') {
                        normalized[key] = Math.max(0, Math.min(100, data[key]));
                    }
                });
            }

            return normalized;
        }

        /**
         * 統合メソッドのオーバーライド
         */
        overrideIntegrationMethods() {
            // matching-ai-integration.jsのメソッドを改善
            const originalCreateCard = window.matchingSupabase?.createMatchingCard;
            
            if (originalCreateCard) {
                window.matchingSupabase.createMatchingCard = (profile, isConnected, index) => {
                    const cardHTML = originalCreateCard.call(window.matchingSupabase, profile, isConnected, index);
                    
                    // チャートデータがある場合は保存
                    if (profile.scoreBreakdown) {
                        // カードのIDを生成
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = cardHTML;
                        const nameElement = tempDiv.querySelector('h3');
                        const cardId = nameElement ? btoa(nameElement.textContent.trim()) : `temp-${index}`;
                        
                        // ペンディングリストに追加
                        this.pendingCharts.set(cardId, profile.scoreBreakdown);
                    }
                    
                    return cardHTML;
                };
            }
        }

        /**
         * スリープ関数
         */
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * クリーンアップ
         */
        destroy() {
            if (this.observer) {
                this.observer.disconnect();
            }
            this.pendingCharts.clear();
            this.renderQueue = [];
        }
    }

    // グローバルに公開
    window.enhancedRadarChart = new EnhancedRadarChart();

    // DOM読み込み完了後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.enhancedRadarChart.init();
        });
    } else {
        window.enhancedRadarChart.init();
    }

})();