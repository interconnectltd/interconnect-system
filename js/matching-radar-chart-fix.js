/**
 * レーダーチャート競合修正とクラス定義の統一
 * すべてのレーダーチャート関連コードの競合を解決
 */

(function() {
    'use strict';

    console.log('[RadarChartFix] 競合修正開始');

    // Step 1: MatchingRadarChartEnhanced クラスを適切に定義
    class MatchingRadarChartEnhanced {
        constructor() {
            this.config = {
                size: 200,
                padding: 20,
                animationDuration: 800
            };
            this.canvases = new WeakMap();
        }

        /**
         * レンダリングメソッド
         */
        render(container, data) {
            try {
                // 既存のキャンバスがあれば再利用
                let canvas = container.querySelector('canvas');
                if (!canvas) {
                    canvas = document.createElement('canvas');
                    canvas.width = this.config.size;
                    canvas.height = this.config.size;
                    container.appendChild(canvas);
                }

                // データ検証
                const validatedData = this.validateData(data);
                
                // 描画実行
                const ctx = canvas.getContext('2d');
                this.drawChart(ctx, validatedData, canvas.width, canvas.height);
                
                // データを保存
                this.canvases.set(canvas, validatedData);
                
                // アクセシビリティ属性を追加
                this.addAccessibilityAttributes(canvas, validatedData);
                
                return canvas;
                
            } catch (error) {
                console.error('[MatchingRadarChartEnhanced] レンダリングエラー:', error);
                throw error;
            }
        }

        /**
         * データ検証
         */
        validateData(data) {
            const validated = {};
            const expectedKeys = [
                'businessSynergy', 'solutionMatch', 'businessTrends',
                'growthPhaseMatch', 'urgencyAlignment', 'resourceComplement'
            ];

            expectedKeys.forEach(key => {
                if (data && typeof data[key] === 'number') {
                    validated[key] = Math.max(0, Math.min(100, data[key]));
                } else {
                    validated[key] = 50; // デフォルト値
                }
            });

            return validated;
        }

        /**
         * チャート描画
         */
        drawChart(ctx, data, width, height) {
            // クリア
            ctx.clearRect(0, 0, width, height);
            
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) * 0.35;
            
            // 背景グリッドの描画
            this.drawGrid(ctx, centerX, centerY, radius);
            
            // データの描画
            this.drawData(ctx, data, centerX, centerY, radius);
            
            // ラベルの描画
            this.drawLabels(ctx, data, centerX, centerY, radius);
        }

        /**
         * グリッド描画
         */
        drawGrid(ctx, centerX, centerY, radius) {
            const steps = 5;
            const parameters = 6;
            
            ctx.save();
            ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
            ctx.lineWidth = 1;
            
            // 同心円
            for (let i = 1; i <= steps; i++) {
                ctx.beginPath();
                for (let j = 0; j < parameters; j++) {
                    const angle = (j / parameters) * Math.PI * 2 - Math.PI / 2;
                    const x = centerX + Math.cos(angle) * radius * (i / steps);
                    const y = centerY + Math.sin(angle) * radius * (i / steps);
                    
                    if (j === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.closePath();
                ctx.stroke();
            }
            
            // 軸線
            for (let i = 0; i < parameters; i++) {
                const angle = (i / parameters) * Math.PI * 2 - Math.PI / 2;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(
                    centerX + Math.cos(angle) * radius,
                    centerY + Math.sin(angle) * radius
                );
                ctx.stroke();
            }
            
            ctx.restore();
        }

        /**
         * データ描画
         */
        drawData(ctx, data, centerX, centerY, radius) {
            const parameters = Object.keys(data);
            const points = [];
            
            // 座標計算
            parameters.forEach((param, index) => {
                const angle = (index / parameters.length) * Math.PI * 2 - Math.PI / 2;
                const value = data[param] / 100;
                const x = centerX + Math.cos(angle) * radius * value;
                const y = centerY + Math.sin(angle) * radius * value;
                points.push({ x, y });
            });
            
            // 塗りつぶし
            ctx.save();
            ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
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
         * ラベル描画
         */
        drawLabels(ctx, data, centerX, centerY, radius) {
            const labels = {
                businessSynergy: '事業相性',
                solutionMatch: '課題解決',
                businessTrends: 'トレンド',
                growthPhaseMatch: '成長適合',
                urgencyAlignment: '緊急度',
                resourceComplement: 'リソース'
            };
            
            ctx.save();
            ctx.font = '12px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            Object.keys(data).forEach((key, index) => {
                const angle = (index / 6) * Math.PI * 2 - Math.PI / 2;
                const labelRadius = radius + 20;
                const x = centerX + Math.cos(angle) * labelRadius;
                const y = centerY + Math.sin(angle) * labelRadius;
                
                ctx.fillText(labels[key] || key, x, y);
            });
            
            ctx.restore();
        }

        /**
         * アクセシビリティ属性の追加
         */
        addAccessibilityAttributes(canvas, data) {
            const labels = {
                businessSynergy: '事業相性',
                solutionMatch: '課題解決',
                businessTrends: 'トレンド',
                growthPhaseMatch: '成長適合',
                urgencyAlignment: '緊急度',
                resourceComplement: 'リソース'
            };
            
            const description = Object.entries(data)
                .map(([key, value]) => `${labels[key]}: ${value}%`)
                .join(', ');
            
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', `レーダーチャート: ${description}`);
            canvas.setAttribute('tabindex', '0');
        }
    }

    // Step 2: グローバルに公開（既存のコードとの互換性のため）
    window.MatchingRadarChartEnhanced = MatchingRadarChartEnhanced;

    // Step 3: 既存のenhancedRadarChartとの統合
    if (window.enhancedRadarChart) {
        // 既存のenhancedRadarChartにrenderメソッドを追加
        window.enhancedRadarChart.render = function(container, data) {
            const chart = new MatchingRadarChartEnhanced();
            return chart.render(container, data);
        };
    }

    // Step 4: 競合の解決 - 重複した初期化の防止
    const initializeOnce = () => {
        // 初期化フラグ
        if (window.__radarChartInitialized) {
            console.log('[RadarChartFix] 既に初期化済み');
            return;
        }
        window.__radarChartInitialized = true;

        // 各コンポーネントの初期化順序を制御
        const initOrder = [
            'matchingRadarChart',
            'MatchingRadarChartEnhanced',
            'matchingRadarChartPerformance',
            'matchingRadarChartUX',
            'matchingRadarChartIntegration'
        ];

        initOrder.forEach((componentName, index) => {
            setTimeout(() => {
                if (window[componentName]) {
                    console.log(`[RadarChartFix] ${componentName} 確認済み`);
                    
                    // integrationが最後に実行されるように
                    if (componentName === 'matchingRadarChartIntegration' && window[componentName].init) {
                        // 既存のチャートを再初期化
                        window[componentName].fixExistingCharts();
                    }
                }
            }, index * 100);
        });
    };

    // Step 5: プロトタイプチェーンの修正
    const fixPrototypeChain = () => {
        // performanceとuxがenhancedのメソッドを上書きしないように
        if (window.matchingRadarChartPerformance && window.MatchingRadarChartEnhanced) {
            // パフォーマンス最適化版のレンダリングを統合
            const originalRender = MatchingRadarChartEnhanced.prototype.render;
            MatchingRadarChartEnhanced.prototype.render = function(container, data) {
                // パフォーマンス最適化が有効な場合
                if (window.matchingRadarChartPerformance && window.matchingRadarChartPerformance.config.enabled !== false) {
                    const card = container.closest('.matching-card');
                    if (card) {
                        return new Promise((resolve) => {
                            window.matchingRadarChartPerformance.queueRender(card, data, () => {
                                resolve(container.querySelector('canvas'));
                            });
                        });
                    }
                }
                
                // 通常のレンダリング
                return originalRender.call(this, container, data);
            };
        }
    };

    // Step 6: データ抽出の統一
    const unifyDataExtraction = () => {
        // すべてのコンポーネントが同じデータ抽出メソッドを使用
        const extractData = (element) => {
            if (window.matchingRadarChartIntegration) {
                return window.matchingRadarChartIntegration.extractChartData(element);
            }
            
            // フォールバック
            const card = element?.closest('.matching-card');
            if (card?.radarChartData) {
                return card.radarChartData;
            }
            
            return {
                businessSynergy: 50,
                solutionMatch: 50,
                businessTrends: 50,
                growthPhaseMatch: 50,
                urgencyAlignment: 50,
                resourceComplement: 50
            };
        };

        // UXコンポーネントの修正
        if (window.matchingRadarChartUX) {
            window.matchingRadarChartUX.extractDataFromCanvas = extractData;
        }
    };

    // Step 7: エラーバウンダリの追加
    const addErrorBoundaries = () => {
        const safeCall = (fn, context, ...args) => {
            try {
                return fn.apply(context, args);
            } catch (error) {
                console.error('[RadarChartFix] エラーをキャッチ:', error);
                return null;
            }
        };

        // 各コンポーネントのメソッドをラップ
        const components = [
            'matchingRadarChart',
            'matchingRadarChartPerformance',
            'matchingRadarChartUX',
            'matchingRadarChartIntegration'
        ];

        components.forEach(name => {
            if (window[name]) {
                const component = window[name];
                Object.getOwnPropertyNames(Object.getPrototypeOf(component))
                    .filter(prop => typeof component[prop] === 'function' && prop !== 'constructor')
                    .forEach(method => {
                        const original = component[method];
                        component[method] = function(...args) {
                            return safeCall(original, this, ...args);
                        };
                    });
            }
        });
    };

    // 実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeOnce();
            fixPrototypeChain();
            unifyDataExtraction();
            addErrorBoundaries();
        });
    } else {
        // 既に読み込み完了している場合
        setTimeout(() => {
            initializeOnce();
            fixPrototypeChain();
            unifyDataExtraction();
            addErrorBoundaries();
        }, 100);
    }

    console.log('[RadarChartFix] 競合修正設定完了');
    
    // Step 8: クリックイベントの無効化
    const disableChartInteractions = () => {
        console.log('[RadarChartFix] チャートのインタラクションを無効化');
        
        // スタイルを追加してインタラクションを完全に無効化
        const style = document.createElement('style');
        style.textContent = `
            /* レーダーチャートのクリック・タップを無効化 */
            .radar-container,
            .radar-container * {
                pointer-events: none !important;
                user-select: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                cursor: default !important;
            }
            
            /* ホバー効果を無効化 */
            .radar-container:hover {
                transform: none !important;
            }
            
            /* ツールチップを非表示 */
            .radar-chart-tooltip {
                display: none !important;
            }
            
            /* フルスクリーン機能を無効化 */
            .radar-chart-fullscreen {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
        
        // 既存のイベントリスナーを削除
        const removeInteractions = () => {
            document.querySelectorAll('.radar-container canvas').forEach(canvas => {
                // イベントリスナーを削除するため要素を複製
                const newCanvas = canvas.cloneNode(true);
                if (canvas.parentNode) {
                    canvas.parentNode.replaceChild(newCanvas, canvas);
                }
            });
        };
        
        // 初回実行
        removeInteractions();
        
        // 動的に追加される要素も処理
        const observer = new MutationObserver(() => {
            removeInteractions();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    };
    
    // インタラクション無効化を実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', disableChartInteractions);
    } else {
        setTimeout(disableChartInteractions, 500);
    }

})();