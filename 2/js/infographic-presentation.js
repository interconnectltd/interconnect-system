// インフォグラフィック用JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // スムーススクロール
    initSmoothScroll();
    
    // KPIカウントアップアニメーション
    initKPICounters();
    
    // KPIチャート
    initKPIChart();
    
    // サービスコンポーネントのホバーエフェクト
    initServiceComponents();
    
    // タイムラインアニメーション
    initTimeline();
    
    // 競争優位性マトリックスアニメーション
    initCompetitiveMatrix();
    
    // Intersection Observer for animations
    initScrollAnimations();
});

// スムーススクロール
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// KPIカウンター
function initKPICounters() {
    const counters = document.querySelectorAll('.kpi-value');
    
    const animateCounter = (counter) => {
        const target = parseInt(counter.getAttribute('data-target'));
        const suffix = counter.getAttribute('data-suffix') || '';
        const duration = 2000;
        const increment = target / (duration / 16);
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            counter.textContent = Math.floor(current).toLocaleString() + suffix;
        }, 16);
    };
    
    // Intersection Observer for counter animation
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    counters.forEach(counter => observer.observe(counter));
}

// KPIチャート
function initKPIChart() {
    const ctx = document.getElementById('kpiChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
            datasets: [
                {
                    label: '登録企業数',
                    data: [1000, 1500, 2200, 3000, 3800, 4700, 5600, 6600, 7700, 8800, 9500, 10000],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'マッチング数',
                    data: [2000, 3500, 5000, 8000, 12000, 18000, 25000, 32000, 38000, 42000, 47000, 50000],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 14,
                            family: "'Noto Sans JP', sans-serif"
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: {
                        size: 14,
                        family: "'Noto Sans JP', sans-serif"
                    },
                    bodyFont: {
                        size: 13,
                        family: "'Noto Sans JP', sans-serif"
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        borderDash: [5, 5]
                    },
                    ticks: {
                        font: {
                            size: 12,
                            family: "'Noto Sans JP', sans-serif"
                        },
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 12,
                            family: "'Noto Sans JP', sans-serif"
                        }
                    }
                }
            }
        }
    });
}

// サービスコンポーネントアニメーション
function initServiceComponents() {
    const components = document.querySelectorAll('.component');
    const centerLogo = document.querySelector('.center-logo');
    const connectionLines = document.querySelector('.connection-lines');
    
    components.forEach(component => {
        component.addEventListener('mouseenter', function() {
            // ハイライト効果
            this.style.transform = 'scale(1.1)';
            this.style.zIndex = '20';
            
            // 中央ロゴも反応
            if (centerLogo) {
                centerLogo.style.transform = 'scale(1.05)';
            }
        });
        
        component.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.zIndex = '10';
            
            if (centerLogo) {
                centerLogo.style.transform = 'scale(1)';
            }
        });
    });
}

// タイムラインアニメーション
function initTimeline() {
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('fade-in');
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 200);
            }
        });
    }, { threshold: 0.3 });
    
    timelineItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = 'all 0.6s ease-out';
        observer.observe(item);
    });
}

// 競争優位性マトリックスアニメーション
function initCompetitiveMatrix() {
    const matrixPoints = document.querySelectorAll('.company-point');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'scale(1)';
                }, index * 300);
            }
        });
    }, { threshold: 0.5 });
    
    matrixPoints.forEach(point => {
        point.style.opacity = '0';
        point.style.transform = 'scale(0)';
        point.style.transition = 'all 0.5s ease-out';
        observer.observe(point);
    });
    
    // ホバー効果
    matrixPoints.forEach(point => {
        point.addEventListener('mouseenter', function() {
            this.querySelector('.point-dot').style.transform = 'scale(1.5)';
            this.querySelector('.point-label').style.fontWeight = '700';
        });
        
        point.addEventListener('mouseleave', function() {
            this.querySelector('.point-dot').style.transform = 'scale(1)';
            this.querySelector('.point-label').style.fontWeight = '600';
        });
    });
}

// スクロールアニメーション
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.flow-step, .revenue-item, .process-step, .ai-component');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    animatedElements.forEach(element => {
        observer.observe(element);
    });
}

// データフローアニメーション
function animateDataFlow() {
    const connectorLines = document.querySelectorAll('.connector-line');
    
    connectorLines.forEach((line, index) => {
        setTimeout(() => {
            line.style.opacity = '1';
        }, index * 500);
    });
}

// ページロード完了時のアニメーション
window.addEventListener('load', function() {
    // ヘッダーアニメーション
    const header = document.querySelector('.infographic-header');
    if (header) {
        header.style.opacity = '0';
        header.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            header.style.transition = 'all 0.8s ease-out';
            header.style.opacity = '1';
            header.style.transform = 'translateY(0)';
        }, 100);
    }
    
    // データフローアニメーション開始
    setTimeout(animateDataFlow, 1000);
});

// ウィンドウリサイズ時の処理
let resizeTimer;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        // チャートの再描画など必要な処理
        const chartElement = document.getElementById('kpiChart');
        if (chartElement && chartElement.chart) {
            chartElement.chart.resize();
        }
    }, 250);
});