/**
 * Matching Hover Complete Fix
 * レーダーチャートのホバー/タッチアニメーションを完全に無効化
 */

(function() {
    'use strict';
    
    console.log('[CompleteHoverFix] レーダーチャートアニメーション完全無効化開始');
    
    // 1. CSSでトランジションを無効化
    const style = document.createElement('style');
    style.textContent = `
        /* レーダーチャートのトランジション無効化 */
        .matching-card .radar-container canvas {
            transition: none !important;
            transform: none !important;
            cursor: default !important;
        }
        
        .matching-card:hover .radar-container canvas {
            transform: none !important;
        }
        
        /* タッチデバイス対応 */
        @media (hover: none) and (pointer: coarse) {
            .matching-card .radar-container canvas {
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
            }
        }
    `;
    document.head.appendChild(style);
    
    // 2. matching-perfect-integration.jsのPerfectRadarChartクラスを完全に置き換え
    function overridePerfectRadarChart() {
        // 元のクラスが存在する場合は削除
        if (window.PerfectRadarChart) {
            delete window.PerfectRadarChart;
        }
        
        // 新しいクラスを定義（ホバーアニメーションなし）
        class PerfectRadarChartNoHover {
            constructor(canvasId, profileData) {
                this.canvasId = canvasId;
                this.canvas = document.querySelector(`#${canvasId} canvas`);
                this.profileData = profileData;
                
                if (this.canvas) {
                    this.ctx = this.canvas.getContext('2d');
                    this.centerX = 100;
                    this.centerY = 100;
                    this.radius = 80;
                    this.currentScale = 1.0; // 常に1.0で固定
                    
                    // イベントリスナーを一切追加しない
                    this.init();
                }
            }
            
            init() {
                // 既存のイベントリスナーをすべて削除
                const newCanvas = this.canvas.cloneNode(false);
                this.canvas.parentNode.replaceChild(newCanvas, this.canvas);
                this.canvas = newCanvas;
                this.ctx = this.canvas.getContext('2d');
                
                // キャンバスのサイズ設定
                this.canvas.width = 200;
                this.canvas.height = 200;
                
                // 初期描画のみ
                this.draw();
            }
            
            draw(scale = 1.0) {
                if (!this.ctx) return;
                
                // スケールは常に1.0
                scale = 1.0;
                
                // キャンバスをクリア
                this.ctx.clearRect(0, 0, 200, 200);
                
                // グリッドを描画
                this.drawGrid();
                
                // データを描画
                this.drawData();
            }
            
            drawGrid() {
                this.ctx.strokeStyle = '#e0e0e0';
                this.ctx.lineWidth = 1;
                
                // 同心円
                for (let i = 1; i <= 5; i++) {
                    this.ctx.beginPath();
                    this.ctx.arc(this.centerX, this.centerY, (this.radius / 5) * i, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
                
                // 軸
                const axes = 6;
                for (let i = 0; i < axes; i++) {
                    const angle = (Math.PI * 2 / axes) * i - Math.PI / 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.centerX, this.centerY);
                    this.ctx.lineTo(
                        this.centerX + Math.cos(angle) * this.radius,
                        this.centerY + Math.sin(angle) * this.radius
                    );
                    this.ctx.stroke();
                }
            }
            
            drawData() {
                const values = this.calculateValues();
                const axes = 6;
                
                // データエリアを描画
                this.ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
                this.ctx.strokeStyle = '#3498db';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                
                values.forEach((value, i) => {
                    const angle = (Math.PI * 2 / axes) * i - Math.PI / 2;
                    const x = this.centerX + Math.cos(angle) * (this.radius * value / 100);
                    const y = this.centerY + Math.sin(angle) * (this.radius * value / 100);
                    
                    if (i === 0) this.ctx.moveTo(x, y);
                    else this.ctx.lineTo(x, y);
                });
                
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
            }
            
            calculateValues() {
                const profile = this.profileData;
                return [
                    Math.min((profile.skills?.length || 0) * 20, 100),
                    profile.location ? 80 : 20,
                    profile.industry ? 80 : 20,
                    Math.random() * 80 + 20,
                    Math.random() * 80 + 20,
                    (profile.interests?.length || 0) * 25
                ];
            }
            
            destroy() {
                // クリーンアップ（イベントリスナーはないので何もしない）
            }
            
            // 空のメソッド（互換性のため）
            handleMouseEnter() {}
            handleMouseLeave() {}
            animateHover() {}
        }
        
        // グローバルに公開
        window.PerfectRadarChart = PerfectRadarChartNoHover;
        
        console.log('[CompleteHoverFix] PerfectRadarChartクラスを置き換え完了');
    }
    
    // 3. 既存のチャートを再描画
    function redrawExistingCharts() {
        if (window.matchingPerfectIntegration && window.matchingPerfectIntegration.charts) {
            window.matchingPerfectIntegration.charts.forEach((chart, index) => {
                if (chart.canvas) {
                    // 新しいチャートインスタンスで置き換え
                    const canvasId = chart.canvasId;
                    const profileData = chart.profileData;
                    
                    chart.destroy();
                    
                    const newChart = new window.PerfectRadarChart(canvasId, profileData);
                    window.matchingPerfectIntegration.charts.set(index, newChart);
                }
            });
            console.log('[CompleteHoverFix] 既存チャートを再描画完了');
        }
    }
    
    // 4. 実行タイミングの制御
    let retryCount = 0;
    const maxRetries = 20;
    
    function tryFix() {
        retryCount++;
        
        // PerfectRadarChartクラスをオーバーライド
        overridePerfectRadarChart();
        
        // matchingPerfectIntegrationが存在する場合
        if (window.matchingPerfectIntegration) {
            // 既存のチャートを再描画
            setTimeout(redrawExistingCharts, 100);
            
            // displayProfiles関数も監視
            if (window.displayProfiles) {
                const originalDisplayProfiles = window.displayProfiles;
                window.displayProfiles = function(profiles) {
                    const result = originalDisplayProfiles.apply(this, arguments);
                    
                    // 新しいチャートが作成された後に再度確認
                    setTimeout(redrawExistingCharts, 500);
                    
                    return result;
                };
            }
            
            console.log('[CompleteHoverFix] ✅ ホバー/タッチアニメーション完全無効化完了');
        } else if (retryCount < maxRetries) {
            // まだ読み込まれていない場合はリトライ
            setTimeout(tryFix, 200);
        }
    }
    
    // DOMContentLoadedの後に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryFix);
    } else {
        tryFix();
    }
    
})();