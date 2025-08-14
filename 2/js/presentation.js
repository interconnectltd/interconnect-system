// プレゼンテーション用JavaScript
document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // スムーススクロールナビゲーション
    initSmoothNavigation();
    
    // ヒーローセクションのカウントアニメーション
    initCountAnimation();
    
    // スクロールインジケーター
    initScrollIndicator();
    
    // セクションのアニメーション
    initSectionAnimations();
    
    // メリットセクションのインタラクション
    initBenefitsInteraction();
    
    // プロセスタイムライン
    initProcessTimeline();
    
    // 統計チャート
    initStatisticsCharts();
    
    // コンタクトフォーム
    initContactForm();
    
    // パーティクルシステム
    initParticleSystem();
});

// スムーススクロールナビゲーション
function initSmoothNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');
    
    // クリックイベント
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    const offset = 80; // ナビゲーションの高さ
                    const targetPosition = targetSection.offsetTop - offset;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
    
    // スクロールでアクティブリンクを更新
    function updateActiveLink() {
        const scrollPosition = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
    
    window.addEventListener('scroll', updateActiveLink);
    updateActiveLink();
}

// カウントアニメーション
function initCountAnimation() {
    const statNumbers = document.querySelectorAll('.stat-number');
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px'
    };
    
    const countObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                const target = entry.target;
                const endValue = parseInt(target.getAttribute('data-count'));
                const duration = 2000;
                const increment = endValue / (duration / 16);
                let currentValue = 0;
                
                if (window.AnimationManager) {
                    // AnimationManagerを使用
                    const animationId = `counter-${target.dataset.value}-${Date.now()}`;
                    window.AnimationManager.register(animationId, (deltaTime) => {
                        currentValue += increment * (deltaTime / 16); // 60FPSベースで調整
                        if (currentValue >= endValue) {
                            target.textContent = endValue.toLocaleString();
                            target.classList.add('counted');
                            window.AnimationManager.unregister(animationId);
                        } else {
                            target.textContent = Math.floor(currentValue).toLocaleString();
                        }
                    }, { priority: 5 });
                } else {
                    // フォールバック
                    const updateCount = () => {
                        currentValue += increment;
                        if (currentValue >= endValue) {
                            target.textContent = endValue.toLocaleString();
                            target.classList.add('counted');
                        } else {
                            target.textContent = Math.floor(currentValue).toLocaleString();
                            requestAnimationFrame(updateCount);
                        }
                    };
                    updateCount();
                }
            }
        });
    }, observerOptions);
    
    statNumbers.forEach(stat => {
        countObserver.observe(stat);
    });
}

// スクロールインジケーター
function initScrollIndicator() {
    const indicator = document.querySelector('.scroll-indicator');
    
    if (indicator) {
        indicator.addEventListener('click', () => {
            const firstSection = document.querySelector('#features');
            if (firstSection) {
                firstSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
        
        // スクロールで非表示
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                indicator.style.opacity = '0';
            } else {
                indicator.style.opacity = '1';
            }
        });
    }
}

// セクションアニメーション
function initSectionAnimations() {
    const animatedElements = document.querySelectorAll('[data-aos]');
    
    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const animation = element.getAttribute('data-aos');
                const delay = element.getAttribute('data-aos-delay') || 0;
                
                setTimeout(() => {
                    element.style.opacity = '1';
                    element.style.transform = 'none';
                    element.classList.add('aos-animated');
                }, delay);
                
                animationObserver.unobserve(element);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '50px'
    });
    
    // 初期スタイル設定
    animatedElements.forEach(element => {
        const animation = element.getAttribute('data-aos');
        element.style.opacity = '0';
        element.style.transition = 'all 0.6s ease';
        
        if (animation === 'fade-up') {
            element.style.transform = 'translateY(30px)';
        } else if (animation === 'fade-left') {
            element.style.transform = 'translateX(30px)';
        } else if (animation === 'fade-right') {
            element.style.transform = 'translateX(-30px)';
        }
        
        animationObserver.observe(element);
    });
}

// メリットセクションのインタラクション
function initBenefitsInteraction() {
    const benefitNodes = document.querySelectorAll('.benefit-node');
    const benefitCards = document.querySelectorAll('.benefit-card');
    
    benefitNodes.forEach((node, index) => {
        node.addEventListener('click', () => {
            const position = node.getAttribute('data-position');
            
            // すべてのカードを非表示
            benefitCards.forEach(card => {
                card.classList.remove('active');
            });
            
            // 対応するカードを表示
            const targetCard = document.querySelector(`.benefit-card[data-benefit="${position}"]`);
            if (targetCard) {
                targetCard.classList.add('active');
            }
            
            // ノードのハイライト
            benefitNodes.forEach(n => n.classList.remove('active'));
            node.classList.add('active');
        });
    });
}

// プロセスタイムライン
function initProcessTimeline() {
    const processSteps = document.querySelectorAll('.process-step');
    const progressBar = document.querySelector('.progress-bar');
    
    const timelineObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const step = entry.target;
                const stepNumber = step.getAttribute('data-step');
                
                // アクティブステップまでを有効化
                processSteps.forEach((s, index) => {
                    if (index < stepNumber) {
                        s.classList.add('active');
                    }
                });
                
                // プログレスバーを更新
                if (progressBar) {
                    const progress = (stepNumber / processSteps.length) * 100;
                    progressBar.style.width = `${progress}%`;
                }
            }
        });
    }, {
        threshold: 0.5
    });
    
    processSteps.forEach(step => {
        timelineObserver.observe(step);
    });
}

// 統計チャート
function initStatisticsCharts() {
    // 成長チャート
    const growthCanvas = document.getElementById('growthChart');
    if (growthCanvas && window.Chart) {
        const ctx = growthCanvas.getContext('2d');
        
        // グラデーション作成
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(0, 102, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 102, 255, 0.1)');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
                datasets: [{
                    label: 'ユーザー数',
                    data: [1000, 2500, 4000, 6500, 8500, 10000],
                    borderColor: '#0066ff',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // 円形プログレスのSVGグラデーション
    const svgNS = "http://www.w3.org/2000/svg";
    const circularProgress = document.querySelector('.circular-progress svg');
    
    if (circularProgress) {
        const defs = document.createElementNS(svgNS, 'defs');
        const linearGradient = document.createElementNS(svgNS, 'linearGradient');
        linearGradient.setAttribute('id', 'gradient');
        
        const stop1 = document.createElementNS(svgNS, 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', '#0066ff');
        
        const stop2 = document.createElementNS(svgNS, 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', '#00d4ff');
        
        linearGradient.appendChild(stop1);
        linearGradient.appendChild(stop2);
        defs.appendChild(linearGradient);
        circularProgress.appendChild(defs);
    }
    
    // 業界チャートアニメーション
    const industryBars = document.querySelectorAll('.industry-bar');
    
    const industryObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, {
        threshold: 0.1
    });
    
    industryBars.forEach(bar => {
        industryObserver.observe(bar);
    });
}

// コンタクトフォーム
function initContactForm() {
    const form = document.getElementById('presentationContactForm');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // フォームデータの取得
            const formData = new FormData(form);
            const data = {};
            
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            
            // ボタンのローディング状態
            const submitBtn = form.querySelector('.submit-btn');
            const originalContent = submitBtn.textContent;
            // 安全にローディング状態を表示
            submitBtn.textContent = '';
            const loadingSpan = document.createElement('span');
            loadingSpan.textContent = '送信中...';
            submitBtn.appendChild(loadingSpan);
            submitBtn.disabled = true;
            
            // 送信シミュレーション
            setTimeout(() => {
                // 成功メッセージ
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.textContent = 'お問い合わせありがとうございます。担当者より連絡させていただきます。';
                successMessage.style.cssText = `
                    background: rgba(0, 255, 136, 0.2);
                    color: #00ff88;
                    padding: 1rem;
                    border-radius: 10px;
                    margin-top: 1rem;
                    text-align: center;
                    animation: fadeIn 0.5s ease;
                `;
                
                form.appendChild(successMessage);
                form.reset();
                
                // ボタンを元に戻す
                submitBtn.textContent = originalContent;
                submitBtn.disabled = false;
                
                // メッセージを削除
                setTimeout(() => {
                    successMessage.remove();
                }, 5000);
            }, 2000);
        });
    }
}

// パーティクルシステム
function initParticleSystem() {
    const particleContainer = document.querySelector('.particle-system');
    
    if (particleContainer) {
        // パーティクルを動的に生成
        const particleCount = 50;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 4 + 1}px;
                height: ${Math.random() * 4 + 1}px;
                background: rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2});
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: float-particle ${Math.random() * 20 + 10}s linear infinite;
            `;
            
            particleContainer.appendChild(particle);
        }
        
        // アニメーションを追加
        const style = document.createElement('style');
        style.textContent = `
            @keyframes float-particle {
                0% {
                    transform: translate(0, 0);
                    opacity: 0;
                }
                10% {
                    opacity: 1;
                }
                90% {
                    opacity: 1;
                }
                100% {
                    transform: translate(${Math.random() * 200 - 100}px, -100vh);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// スクロール時のナビゲーション背景
window.addEventListener('scroll', () => {
    const nav = document.querySelector('.presentation-nav');
    if (window.scrollY > 50) {
        nav.style.background = 'rgba(255, 255, 255, 0.95)';
    } else {
        nav.style.background = 'rgba(255, 255, 255, 0.9)';
    }
});