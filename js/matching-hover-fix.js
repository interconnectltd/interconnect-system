/**
 * Matching Hover Animation Fix
 * レーダーチャートのホバーアニメーションを無効化
 */

(function() {
    'use strict';
    
    console.log('[HoverFix] レーダーチャートのホバーアニメーションを無効化');
    
    // PerfectRadarChartクラスを上書き
    const originalInit = setInterval(() => {
        if (window.matchingPerfectIntegration && window.matchingPerfectIntegration.charts) {
            clearInterval(originalInit);
            
            // 既存のチャートのホバーアニメーションを無効化
            window.matchingPerfectIntegration.charts.forEach((chart) => {
                if (chart.canvas) {
                    // 既存のイベントリスナーを削除
                    const newCanvas = chart.canvas.cloneNode(true);
                    chart.canvas.parentNode.replaceChild(newCanvas, chart.canvas);
                    chart.canvas = newCanvas;
                    chart.ctx = newCanvas.getContext('2d');
                    
                    // アニメーションをキャンセル
                    if (chart.animationFrame) {
                        cancelAnimationFrame(chart.animationFrame);
                        chart.animationFrame = null;
                    }
                    
                    // スケールをリセット
                    chart.currentScale = 1.0;
                    chart.draw(1.0);
                }
            });
            
            // PerfectRadarChartのプロトタイプを変更
            if (window.PerfectRadarChart) {
                // ホバーメソッドを無効化
                window.PerfectRadarChart.prototype.handleMouseEnter = function() {
                    // 何もしない
                };
                
                window.PerfectRadarChart.prototype.handleMouseLeave = function() {
                    // 何もしない
                };
                
                window.PerfectRadarChart.prototype.animateHover = function() {
                    // 何もしない
                };
                
                // 元のinitメソッドを上書き
                const originalInitMethod = window.PerfectRadarChart.prototype.init;
                window.PerfectRadarChart.prototype.init = function() {
                    // イベントハンドラーをバインドしない新しいinit
                    this.draw();
                };
            }
            
            console.log('[HoverFix] ✅ ホバーアニメーションを完全に無効化');
        }
    }, 100);
    
    // displayProfiles関数も監視して新しいチャートの作成を防ぐ
    const checkDisplayProfiles = setInterval(() => {
        if (window.displayProfiles) {
            clearInterval(checkDisplayProfiles);
            
            const originalDisplayProfiles = window.displayProfiles;
            window.displayProfiles = function(profiles) {
                // 元の関数を実行
                const result = originalDisplayProfiles.apply(this, arguments);
                
                // 新しく作成されたチャートのホバーアニメーションを無効化
                setTimeout(() => {
                    if (window.matchingPerfectIntegration && window.matchingPerfectIntegration.charts) {
                        window.matchingPerfectIntegration.charts.forEach((chart) => {
                            if (chart.canvas && chart.handleMouseEnter) {
                                const newCanvas = chart.canvas.cloneNode(true);
                                chart.canvas.parentNode.replaceChild(newCanvas, chart.canvas);
                                chart.canvas = newCanvas;
                                chart.ctx = newCanvas.getContext('2d');
                                chart.draw(1.0);
                            }
                        });
                    }
                }, 500);
                
                return result;
            };
            
            console.log('[HoverFix] displayProfiles関数を監視開始');
        }
    }, 100);
    
})();