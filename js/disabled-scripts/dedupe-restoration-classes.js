/**
 * 復活スクリプト間のクラス重複を解決
 * このファイルを最後に読み込むことで重複定義を上書き
 */

// 重複を検出してログに記録
(function() {
    const duplicateClasses = [
        'SessionManager',
        'MatchingRadarChart', 
        'MatchingCache',
        'AdvancedSearch',
        'AIMatchingScorer'
    ];
    
    duplicateClasses.forEach(className => {
        if (window[className]) {
            console.warn(`[Dedupe] クラス ${className} は既に定義されています。最新版で上書きします。`);
        }
    });
})();

// SessionManager - 最終統合版
if (!window.SessionManager || window.SessionManager.constructor.name === 'SessionManager') {
    window.SessionManager = class SessionManager {
        constructor() {
            this.sessionTimeout = 30 * 60 * 1000; // 30分
            this.warningTime = 5 * 60 * 1000; // 5分前に警告
            this.sessionTimer = null;
            this.warningTimer = null;
            this.lastActivity = Date.now();
            
            this.init();
        }
        
        init() {
            // アクティビティ監視
            ['mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => {
                document.addEventListener(event, () => this.resetTimer(), true);
            });
            
            this.startTimer();
        }
        
        resetTimer() {
            this.lastActivity = Date.now();
            this.startTimer();
        }
        
        startTimer() {
            // 既存のタイマーをクリア
            if (this.sessionTimer) clearTimeout(this.sessionTimer);
            if (this.warningTimer) clearTimeout(this.warningTimer);
            
            // 警告タイマー
            this.warningTimer = setTimeout(() => {
                this.showWarning();
            }, this.sessionTimeout - this.warningTime);
            
            // セッションタイムアウトタイマー
            this.sessionTimer = setTimeout(() => {
                this.handleTimeout();
            }, this.sessionTimeout);
        }
        
        showWarning() {
            if (window.showWarning) {
                window.showWarning('セッションが5分後にタイムアウトします。');
            }
        }
        
        handleTimeout() {
            if (window.logout) {
                window.logout();
            }
        }
        
        extendSession() {
            this.resetTimer();
            if (window.showSuccess) {
                window.showSuccess('セッションを延長しました');
            }
        }
    };
}

// MatchingRadarChart - 最終統合版
if (!window.MatchingRadarChart || window.MatchingRadarChart.constructor.name === 'MatchingRadarChart') {
    window.MatchingRadarChart = class MatchingRadarChart {
        constructor(canvas, data) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.data = data;
            this.center = { x: canvas.width / 2, y: canvas.height / 2 };
            this.radius = Math.min(canvas.width, canvas.height) * 0.35;
        }
        
        draw() {
            this.clear();
            this.drawAxes();
            this.drawData();
            this.drawLabels();
        }
        
        clear() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        drawAxes() {
            const axes = Object.keys(this.data);
            const angleStep = (Math.PI * 2) / axes.length;
            
            this.ctx.strokeStyle = '#e0e0e0';
            this.ctx.lineWidth = 1;
            
            // 軸線を描画
            axes.forEach((_, i) => {
                const angle = angleStep * i - Math.PI / 2;
                const x = this.center.x + Math.cos(angle) * this.radius;
                const y = this.center.y + Math.sin(angle) * this.radius;
                
                this.ctx.beginPath();
                this.ctx.moveTo(this.center.x, this.center.y);
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
            });
            
            // 同心円を描画
            for (let i = 1; i <= 5; i++) {
                this.ctx.beginPath();
                this.ctx.arc(this.center.x, this.center.y, (this.radius * i) / 5, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
        
        drawData() {
            const axes = Object.keys(this.data);
            const angleStep = (Math.PI * 2) / axes.length;
            const points = [];
            
            axes.forEach((axis, i) => {
                const angle = angleStep * i - Math.PI / 2;
                const value = this.data[axis] / 100; // 0-1に正規化
                const x = this.center.x + Math.cos(angle) * this.radius * value;
                const y = this.center.y + Math.sin(angle) * this.radius * value;
                points.push({ x, y });
            });
            
            // データ領域を塗りつぶし
            this.ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
            this.ctx.strokeStyle = '#3B82F6';
            this.ctx.lineWidth = 2;
            
            this.ctx.beginPath();
            points.forEach((point, i) => {
                if (i === 0) {
                    this.ctx.moveTo(point.x, point.y);
                } else {
                    this.ctx.lineTo(point.x, point.y);
                }
            });
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            
            // データポイントを描画
            points.forEach(point => {
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
                this.ctx.fillStyle = '#3B82F6';
                this.ctx.fill();
            });
        }
        
        drawLabels() {
            const axes = Object.keys(this.data);
            const angleStep = (Math.PI * 2) / axes.length;
            
            this.ctx.font = '12px Inter, sans-serif';
            this.ctx.fillStyle = '#666';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            axes.forEach((axis, i) => {
                const angle = angleStep * i - Math.PI / 2;
                const x = this.center.x + Math.cos(angle) * (this.radius + 20);
                const y = this.center.y + Math.sin(angle) * (this.radius + 20);
                
                this.ctx.fillText(axis, x, y);
                
                // スコアを表示
                const scoreX = this.center.x + Math.cos(angle) * (this.radius + 35);
                const scoreY = this.center.y + Math.sin(angle) * (this.radius + 35);
                this.ctx.font = '10px Inter, sans-serif';
                this.ctx.fillStyle = '#999';
                this.ctx.fillText(`${this.data[axis]}%`, scoreX, scoreY);
            });
        }
    };
}

// グローバルインスタンスの初期化（一度だけ）
if (!window.sessionManagerInstance) {
    window.sessionManagerInstance = new window.SessionManager();
}

console.log('[Dedupe] クラス重複解決スクリプトを適用しました');