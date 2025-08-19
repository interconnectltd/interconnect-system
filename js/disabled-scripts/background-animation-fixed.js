// 背景アニメーション - Memory Leak Fixed Version
(function() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // アニメーションの状態管理
    let animationId = null;
    let isRunning = false;
    let resizeHandler = null;
    
    // キャンバスをauth-containerに追加
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';
    
    // パーティクルの設定
    const particles = [];
    const particleCount = 50;
    const connectionDistance = 150;
    const maxSpeed = 0.5;
    
    // パーティクルクラス
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * maxSpeed;
            this.vy = (Math.random() - 0.5) * maxSpeed;
            this.radius = Math.random() * 2 + 1;
        }
        
        update() {
            this.x += this.vx;
            this.y += this.vy;
            
            // 画面端で反射
            if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
            if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;
            
            // 境界内に収める
            this.x = Math.max(0, Math.min(canvas.width, this.x));
            this.y = Math.max(0, Math.min(canvas.height, this.y));
        }
        
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
            ctx.fill();
        }
    }
    
    // キャンバスサイズの調整
    function resizeCanvas() {
        const container = document.querySelector('.auth-container');
        if (container) {
            canvas.width = container.offsetWidth;
            canvas.height = container.offsetHeight;
        }
    }
    
    // パーティクルの初期化
    function initParticles() {
        particles.length = 0;
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }
    
    // 線の描画
    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < connectionDistance) {
                    const opacity = (1 - distance / connectionDistance) * 0.2;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0, 150, 255, ${opacity})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }
    
    // アニメーションループ
    function animate() {
        if (!isRunning) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 背景グラデーション
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, 'rgba(230, 245, 255, 0.1)');
        gradient.addColorStop(0.5, 'rgba(200, 235, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(230, 245, 255, 0.1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // パーティクルの更新と描画
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        // 接続線の描画
        drawConnections();
        
        animationId = requestAnimationFrame(animate);
    }
    
    // アニメーションの開始
    function startAnimation() {
        if (!isRunning) {
            isRunning = true;
            animate();
        }
    }
    
    // アニメーションの停止
    function stopAnimation() {
        isRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }
    
    // 初期化
    function init() {
        const container = document.querySelector('.auth-container');
        if (container && !container.querySelector('canvas')) {
            container.insertBefore(canvas, container.firstChild);
            resizeCanvas();
            initParticles();
            
            // ページが表示されている場合のみアニメーション開始
            if (document.visibilityState === 'visible') {
                startAnimation();
            }
        }
    }
    
    // クリーンアップ関数
    function cleanup() {
        stopAnimation();
        if (resizeHandler) {
            window.removeEventListener('resize', resizeHandler);
            resizeHandler = null;
        }
        if (canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }
        particles.length = 0;
    }
    
    // リサイズイベント
    resizeHandler = function() {
        resizeCanvas();
        initParticles();
    };
    window.addEventListener('resize', resizeHandler);
    
    // ページの表示状態の監視
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            startAnimation();
        } else {
            stopAnimation();
        }
    });
    
    // DOMロード後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // ページ遷移時のクリーンアップ
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
    
    // パブリックAPIとして公開
    window.BackgroundAnimation = {
        start: startAnimation,
        stop: stopAnimation,
        cleanup: cleanup
    };
})();