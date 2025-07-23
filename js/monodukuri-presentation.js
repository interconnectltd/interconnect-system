// ものづくり補助金申請用プレゼンテーションJS
document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // 目次ナビゲーションのスムーススクロール
    initTableOfContents();
    
    // 市場成長グラフの初期化
    initMarketGrowthChart();
    
    // 収益予測グラフの初期化
    initRevenueChart();
    
    // タイムラインアニメーション
    initTimelineAnimation();
    
    // 数値アニメーション
    initNumberAnimation();
    
    // 印刷対応
    initPrintSupport();
});

// 目次ナビゲーション
function initTableOfContents() {
    const tocLinks = document.querySelectorAll('.toc-container a');
    const sections = document.querySelectorAll('.grant-section');
    
    // クリックでスムーススクロール
    tocLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offset = 100; // 固定ナビゲーションの高さ
                const targetPosition = targetSection.offsetTop - offset;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // スクロール位置に応じてアクティブリンクを更新
    function updateActiveLink() {
        const scrollPosition = window.scrollY + 150;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                tocLinks.forEach(link => {
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

// 市場成長グラフ
function initMarketGrowthChart() {
    const canvas = document.getElementById('marketGrowthChart');
    if (canvas && window.Chart) {
        const ctx = canvas.getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['2020年', '2021年', '2022年', '2023年', '2024年', '2025年', '2026年', '2027年', '2028年', '2029年', '2030年'],
                datasets: [{
                    label: 'ビジネスマッチング市場規模（億円）',
                    data: [800, 900, 980, 1050, 1120, 1200, 1350, 1520, 1710, 1900, 2100],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'AI活用型市場規模（億円）',
                    data: [20, 40, 80, 150, 280, 500, 750, 1100, 1400, 1700, 2000],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'ビジネスマッチング市場の成長予測',
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + '億円';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString() + '億円';
                            }
                        }
                    }
                }
            }
        });
    }
}

// 収益予測グラフ
function initRevenueChart() {
    const canvas = document.getElementById('revenueChart');
    if (canvas && window.Chart) {
        const ctx = canvas.getContext('2d');
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['1年目', '2年目', '3年目', '4年目', '5年目'],
                datasets: [{
                    label: '売上高',
                    data: [1.2, 6, 18, 36, 60],
                    backgroundColor: '#3b82f6',
                    borderColor: '#1e3a8a',
                    borderWidth: 2
                }, {
                    label: '営業利益',
                    data: [0.2, 1.8, 7.2, 16, 30],
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '5年間の収益予測',
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y + '億円';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + '億円';
                            }
                        }
                    }
                }
            }
        });
    }
}

// タイムラインアニメーション
function initTimelineAnimation() {
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    const timelineObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                
                // マーカーのアニメーション
                const marker = entry.target.querySelector('.timeline-marker');
                if (marker) {
                    marker.style.transform = 'translate(-50%, -50%) scale(1.2)';
                    setTimeout(() => {
                        marker.style.transform = 'translate(-50%, -50%) scale(1)';
                    }, 300);
                }
            }
        });
    }, {
        threshold: 0.3
    });
    
    // 初期スタイル設定
    timelineItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = `all 0.6s ease ${index * 0.2}s`;
        
        timelineObserver.observe(item);
    });
}

// 数値アニメーション
function initNumberAnimation() {
    const animatedNumbers = document.querySelectorAll('.stat-value, .benefit-value, .metric-value');
    
    const numberObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
                const target = entry.target;
                const text = target.textContent;
                const match = text.match(/[\d,]+/);
                
                if (match) {
                    const endValue = parseInt(match[0].replace(/,/g, ''));
                    const suffix = text.replace(match[0], '');
                    const duration = 2000;
                    const increment = endValue / (duration / 16);
                    let currentValue = 0;
                    
                    if (window.AnimationManager) {
                        // AnimationManagerを使用
                        const animationId = `mono-counter-${target.dataset.value}-${Date.now()}`;
                        window.AnimationManager.register(animationId, (deltaTime) => {
                            currentValue += increment * (deltaTime / 16); // 60FPSベースで調整
                            if (currentValue >= endValue) {
                                target.textContent = endValue.toLocaleString() + suffix;
                                target.classList.add('animated');
                                window.AnimationManager.unregister(animationId);
                            } else {
                                target.textContent = Math.floor(currentValue).toLocaleString() + suffix;
                            }
                        }, { priority: 5 });
                    } else {
                        // フォールバック
                        const updateNumber = () => {
                            currentValue += increment;
                            if (currentValue >= endValue) {
                                target.textContent = endValue.toLocaleString() + suffix;
                                target.classList.add('animated');
                            } else {
                                target.textContent = Math.floor(currentValue).toLocaleString() + suffix;
                                requestAnimationFrame(updateNumber);
                            }
                        };
                        updateNumber();
                    }
                }
            }
        });
    }, {
        threshold: 0.5
    });
    
    animatedNumbers.forEach(number => {
        numberObserver.observe(number);
    });
}

// 印刷対応
function initPrintSupport() {
    // 印刷前の処理
    window.addEventListener('beforeprint', () => {
        // グラフを静的画像に変換（実装は省略）
        document.body.classList.add('printing');
    });
    
    // 印刷後の処理
    window.addEventListener('afterprint', () => {
        document.body.classList.remove('printing');
    });
}

// スクロール時のヘッダー固定
window.addEventListener('scroll', () => {
    const header = document.querySelector('.grant-header');
    const toc = document.querySelector('.toc-navigation');
    
    if (window.scrollY > header.offsetHeight) {
        toc.style.position = 'fixed';
        toc.style.top = '0';
        toc.style.width = '100%';
        toc.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    } else {
        toc.style.position = 'sticky';
        toc.style.boxShadow = 'none';
    }
});

// ホバーエフェクト強化
document.querySelectorAll('.feature-card, .segment, .milestone, .benefit-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// 比較テーブルのハイライト
document.querySelectorAll('.comparison-row').forEach(row => {
    row.addEventListener('mouseenter', function() {
        this.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
    });
    
    row.addEventListener('mouseleave', function() {
        this.style.backgroundColor = '';
    });
});