/**
 * マッチングパラメータの6角形レーダーチャート表示
 */

class MatchingRadarChart {
    constructor() {
        this.canvasSize = 200;
        this.centerX = this.canvasSize / 2;
        this.centerY = this.canvasSize / 2;
        this.radius = 80;
        this.levels = 5;
        
        // 6つの評価軸
        this.parameters = [
            { label: '事業相性', key: 'businessSynergy' },
            { label: '課題解決', key: 'solutionMatch' },
            { label: 'トレンド', key: 'businessTrends' },
            { label: '成長適合', key: 'growthPhaseMatch' },
            { label: '緊急度', key: 'urgencyAlignment' },
            { label: 'リソース', key: 'resourceComplement' }
        ];
        
        // 色設定
        this.colors = {
            grid: '#e5e7eb',
            gridDark: '#9ca3af',
            fill: 'rgba(59, 130, 246, 0.2)',
            stroke: '#3b82f6',
            text: '#374151',
            background: '#ffffff'
        };
    }

    /**
     * レーダーチャートを描画
     */
    drawRadarChart(canvas, data) {
        const ctx = canvas.getContext('2d');
        canvas.width = this.canvasSize;
        canvas.height = this.canvasSize;
        
        // 背景をクリア
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);
        
        // グリッドを描画
        this.drawGrid(ctx);
        
        // 軸ラベルを描画
        this.drawAxisLabels(ctx);
        
        // データを描画
        if (data) {
            this.drawData(ctx, data);
        }
    }

    /**
     * グリッド（6角形の網）を描画
     */
    drawGrid(ctx) {
        const angleStep = (Math.PI * 2) / 6;
        
        // 各レベルの6角形を描画
        for (let level = 1; level <= this.levels; level++) {
            const levelRadius = (this.radius / this.levels) * level;
            
            ctx.beginPath();
            ctx.strokeStyle = level === this.levels ? this.colors.gridDark : this.colors.grid;
            ctx.lineWidth = level === this.levels ? 2 : 1;
            
            for (let i = 0; i <= 6; i++) {
                const angle = angleStep * i - Math.PI / 2;
                const x = this.centerX + Math.cos(angle) * levelRadius;
                const y = this.centerY + Math.sin(angle) * levelRadius;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }
        
        // 中心から各頂点への線を描画
        for (let i = 0; i < 6; i++) {
            const angle = angleStep * i - Math.PI / 2;
            const x = this.centerX + Math.cos(angle) * this.radius;
            const y = this.centerY + Math.sin(angle) * this.radius;
            
            ctx.beginPath();
            ctx.strokeStyle = this.colors.grid;
            ctx.lineWidth = 1;
            ctx.moveTo(this.centerX, this.centerY);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    }

    /**
     * 軸ラベルを描画
     */
    drawAxisLabels(ctx) {
        const angleStep = (Math.PI * 2) / 6;
        const labelRadius = this.radius + 20;
        
        ctx.font = '12px "Noto Sans JP", sans-serif';
        ctx.fillStyle = this.colors.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        this.parameters.forEach((param, i) => {
            const angle = angleStep * i - Math.PI / 2;
            const x = this.centerX + Math.cos(angle) * labelRadius;
            const y = this.centerY + Math.sin(angle) * labelRadius;
            
            // ラベルの位置を微調整
            if (i === 0) {
                ctx.textBaseline = 'bottom';
            } else if (i === 3) {
                ctx.textBaseline = 'top';
            } else {
                ctx.textBaseline = 'middle';
            }
            
            ctx.fillText(param.label, x, y);
        });
    }

    /**
     * データを描画
     */
    drawData(ctx, data) {
        const angleStep = (Math.PI * 2) / 6;
        const points = [];
        
        // 各パラメータの座標を計算
        this.parameters.forEach((param, i) => {
            const value = data[param.key] || 0;
            const normalizedValue = Math.min(100, Math.max(0, value)) / 100;
            const radius = this.radius * normalizedValue;
            
            const angle = angleStep * i - Math.PI / 2;
            const x = this.centerX + Math.cos(angle) * radius;
            const y = this.centerY + Math.sin(angle) * radius;
            
            points.push({ x, y, value });
        });
        
        // 塗りつぶし
        ctx.beginPath();
        ctx.fillStyle = this.colors.fill;
        points.forEach((point, i) => {
            if (i === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.closePath();
        ctx.fill();
        
        // 輪郭線
        ctx.beginPath();
        ctx.strokeStyle = this.colors.stroke;
        ctx.lineWidth = 2;
        points.forEach((point, i) => {
            if (i === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.closePath();
        ctx.stroke();
        
        // 各頂点に点を描画
        points.forEach(point => {
            ctx.beginPath();
            ctx.fillStyle = this.colors.stroke;
            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // 値を表示
            ctx.fillStyle = this.colors.text;
            ctx.font = 'bold 10px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(Math.round(point.value), point.x, point.y - 6);
        });
    }

    /**
     * マッチングカードにレーダーチャートを追加
     */
    addToMatchingCard(cardElement, scoreBreakdown) {
        // すでにチャートがある場合は削除
        const existingChart = cardElement.querySelector('.radar-chart-container');
        if (existingChart) {
            existingChart.remove();
        }
        
        // チャートコンテナを作成
        const container = document.createElement('div');
        container.className = 'radar-chart-container';
        
        // キャンバスを作成
        const canvas = document.createElement('canvas');
        canvas.className = 'radar-chart';
        container.appendChild(canvas);
        
        // スコアの後に挿入
        const scoreElement = cardElement.querySelector('.matching-score');
        if (scoreElement && scoreElement.parentNode) {
            scoreElement.parentNode.insertBefore(container, scoreElement.nextSibling);
        }
        
        // チャートを描画
        this.drawRadarChart(canvas, scoreBreakdown);
        
        // クリックで詳細表示
        container.addEventListener('click', () => {
            this.showDetailModal(scoreBreakdown);
        });
    }

    /**
     * 詳細モーダルを表示
     */
    showDetailModal(data) {
        // 既存のモーダルを削除
        const existingModal = document.querySelector('.radar-chart-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // モーダルを作成
        const modal = document.createElement('div');
        modal.className = 'radar-chart-modal';
        modal.innerHTML = `
            <div class="radar-chart-modal-content">
                <button class="radar-chart-modal-close">&times;</button>
                <h3>マッチングパラメータ詳細</h3>
                <canvas id="modal-radar-chart"></canvas>
                <div class="parameter-details">
                    ${this.parameters.map(param => `
                        <div class="parameter-item">
                            <span class="parameter-label">${param.label}</span>
                            <div class="parameter-bar">
                                <div class="parameter-fill" style="width: ${data[param.key] || 0}%"></div>
                            </div>
                            <span class="parameter-value">${Math.round(data[param.key] || 0)}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 大きいチャートを描画
        const canvas = modal.querySelector('#modal-radar-chart');
        const originalSize = this.canvasSize;
        this.canvasSize = 300;
        this.centerX = 150;
        this.centerY = 150;
        this.radius = 120;
        
        this.drawRadarChart(canvas, data);
        
        // サイズを元に戻す
        this.canvasSize = originalSize;
        this.centerX = originalSize / 2;
        this.centerY = originalSize / 2;
        this.radius = 80;
        
        // 閉じるボタン
        modal.querySelector('.radar-chart-modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        // モーダル外クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// スタイルを追加
const style = document.createElement('style');
style.textContent = `
    .radar-chart-container {
        margin: 15px 0;
        text-align: center;
        cursor: pointer;
        transition: transform 0.2s;
    }
    
    .radar-chart-container:hover {
        transform: scale(1.05);
    }
    
    .radar-chart {
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .radar-chart-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.2s;
    }
    
    .radar-chart-modal-content {
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        animation: slideIn 0.3s;
    }
    
    .radar-chart-modal-close {
        position: absolute;
        top: 15px;
        right: 15px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6b7280;
        transition: color 0.2s;
    }
    
    .radar-chart-modal-close:hover {
        color: #374151;
    }
    
    .radar-chart-modal h3 {
        margin: 0 0 20px;
        font-size: 20px;
        color: #1f2937;
        text-align: center;
    }
    
    #modal-radar-chart {
        display: block;
        margin: 0 auto 30px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .parameter-details {
        space-y: 15px;
    }
    
    .parameter-item {
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 15px;
    }
    
    .parameter-label {
        flex: 0 0 80px;
        font-size: 14px;
        color: #4b5563;
        text-align: right;
    }
    
    .parameter-bar {
        flex: 1;
        height: 20px;
        background: #f3f4f6;
        border-radius: 10px;
        overflow: hidden;
        position: relative;
    }
    
    .parameter-fill {
        height: 100%;
        background: linear-gradient(to right, #3b82f6, #60a5fa);
        border-radius: 10px;
        transition: width 0.5s ease;
    }
    
    .parameter-value {
        flex: 0 0 50px;
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideIn {
        from {
            transform: translateY(-20px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    /* モバイル対応 */
    @media (max-width: 768px) {
        .radar-chart-container {
            margin: 10px 0;
        }
        
        .radar-chart {
            width: 160px !important;
            height: 160px !important;
        }
        
        .radar-chart-modal-content {
            padding: 20px;
        }
        
        .parameter-label {
            flex: 0 0 60px;
            font-size: 12px;
        }
        
        .parameter-value {
            flex: 0 0 40px;
            font-size: 12px;
        }
    }
`;
document.head.appendChild(style);

// グローバルに公開
window.matchingRadarChart = new MatchingRadarChart();

console.log('[RadarChart] マッチングレーダーチャート初期化');