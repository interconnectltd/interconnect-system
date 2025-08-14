/**
 * スクロールフェードインアニメーション（メモリリーク修正版）
 */

(function() {
    'use strict';

    // リソース管理用
    const observers = [];
    const intervals = [];
    const timeouts = [];

    // フェードインアニメーション対象要素
    const fadeElements = document.querySelectorAll('.fade-in');
    
    // オプション設定
    const options = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    // IntersectionObserverの作成
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                fadeObserver.unobserve(entry.target); // 一度表示したら監視を停止
            }
        });
    }, options);
    
    observers.push(fadeObserver);
    
    // 各要素の監視開始
    fadeElements.forEach(element => {
        fadeObserver.observe(element);
    });
    
    // 特定セクションのスライドイン
    const slideElements = document.querySelectorAll('.slide-in-left, .slide-in-right');
    
    const slideObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('slide-visible');
                slideObserver.unobserve(entry.target); // 一度表示したら監視を停止
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '0px'
    });
    
    observers.push(slideObserver);
    
    slideElements.forEach(element => {
        slideObserver.observe(element);
    });
    
    // ヒーローセクションのタイプライターエフェクト
    const heroTitle = document.querySelector('.hero-title');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    
    if (heroTitle && heroSubtitle) {
        const titleText = heroTitle.textContent;
        const subtitleText = heroSubtitle.textContent;
        
        heroTitle.textContent = '';
        heroSubtitle.textContent = '';
        heroSubtitle.style.opacity = '0';
        
        let titleIndex = 0;
        const typeTitle = () => {
            if (titleIndex < titleText.length) {
                heroTitle.textContent += titleText.charAt(titleIndex);
                titleIndex++;
                const timeout = setTimeout(typeTitle, 50);
                timeouts.push(timeout);
            } else {
                // タイトル完了後、サブタイトルを表示
                heroSubtitle.style.opacity = '1';
                heroSubtitle.style.transition = 'opacity 1s ease';
                
                let subtitleIndex = 0;
                const typeSubtitle = () => {
                    if (subtitleIndex < subtitleText.length) {
                        heroSubtitle.textContent += subtitleText.charAt(subtitleIndex);
                        subtitleIndex++;
                        const timeout = setTimeout(typeSubtitle, 30);
                        timeouts.push(timeout);
                    }
                };
                const timeout = setTimeout(typeSubtitle, 500);
                timeouts.push(timeout);
            }
        };
        
        // ページロード後に開始
        const startTimeout = setTimeout(typeTitle, 1000);
        timeouts.push(startTimeout);
    }
    
    // セクションタイトルのアンダーライン効果
    const sectionTitles = document.querySelectorAll('.section-title');
    
    const titleObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('underline-visible');
                titleObserver.unobserve(entry.target); // 一度表示したら監視を停止
            }
        });
    }, {
        threshold: 0.5
    });
    
    observers.push(titleObserver);
    
    sectionTitles.forEach(title => {
        // アンダーライン要素を追加
        const underline = document.createElement('span');
        underline.className = 'title-underline';
        title.appendChild(underline);
        titleObserver.observe(title);
    });
    
    // スクロールインジケーターのアニメーション
    const scrollIndicator = document.querySelector('.scroll-indicator');
    
    if (scrollIndicator) {
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 100) {
                scrollIndicator.style.opacity = '0';
                scrollIndicator.style.pointerEvents = 'none';
            } else {
                scrollIndicator.style.opacity = '1';
                scrollIndicator.style.pointerEvents = 'auto';
            }
        }, { passive: true });
        
        // 3秒後にフェード効果を適用
        const fadeTimeout = setTimeout(() => {
            scrollIndicator.style.transition = 'opacity 1s ease';
        }, 3000);
        timeouts.push(fadeTimeout);
    }
    
    // 数字カウントアップアニメーション（メモリリーク修正版）
    const counterElements = document.querySelectorAll('.data-value');
    const animatedCounters = new Set(); // 既にアニメーションした要素を記録
    
    const animateCounter = (element, target, suffix = '') => {
        // 既にアニメーション済みならスキップ
        if (animatedCounters.has(element)) return;
        animatedCounters.add(element);
        
        const duration = 2000; // 2秒
        const steps = 60;
        const stepDuration = duration / steps;
        let current = 0;
        let stepCount = 0;
        
        // 数値とサフィックスを分離
        const numericTarget = parseFloat(target.replace(/[^0-9.]/g, ''));
        
        // NaNチェック
        if (isNaN(numericTarget)) {
            console.error('Invalid numeric target:', target);
            element.textContent = target;
            return;
        }
        
        const isPercentage = target.includes('%');
        const isCurrency = target.includes('億円') || target.includes('万円');
        
        const counter = setInterval(() => {
            current += numericTarget / steps;
            stepCount++;
            
            if (stepCount >= steps || current >= numericTarget) {
                current = numericTarget;
                if (isPercentage) {
                    element.textContent = current.toFixed(1) + '%';
                } else if (isCurrency) {
                    if (target.includes('億円')) {
                        element.textContent = Math.floor(current) + '億円';
                    } else if (target.includes('万円')) {
                        element.textContent = Math.floor(current) + '万円';
                    }
                } else if (target.includes('件')) {
                    element.textContent = Math.floor(current) + '件';
                } else {
                    element.textContent = Math.floor(current) + suffix;
                }
                clearInterval(counter);
                // インターバルをリストから削除
                const index = intervals.indexOf(counter);
                if (index > -1) intervals.splice(index, 1);
            } else {
                // ランダムな数字でダララララ効果
                const randomNum = Math.floor(Math.random() * numericTarget * 1.5);
                if (isPercentage) {
                    element.textContent = randomNum.toFixed(1) + '%';
                } else if (isCurrency) {
                    if (target.includes('億円')) {
                        element.textContent = randomNum + '億円';
                    } else if (target.includes('万円')) {
                        element.textContent = randomNum + '万円';
                    }
                } else if (target.includes('件')) {
                    element.textContent = randomNum + '件';
                } else {
                    element.textContent = randomNum + suffix;
                }
            }
        }, stepDuration);
        
        intervals.push(counter);
    };
    
    // 実績セクションのオブザーバー
    const performanceSection = document.querySelector('.performance-data');
    if (performanceSection) {
        const performanceObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // カウンターアニメーション開始
                    counterElements.forEach(element => {
                        const targetValue = element.getAttribute('data-target') || element.textContent;
                        element.textContent = '0';
                        animateCounter(element, targetValue);
                    });
                    performanceObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.3
        });
        
        observers.push(performanceObserver);
        performanceObserver.observe(performanceSection);
    }
    
    // クリーンアップ関数
    function cleanup() {
        // すべてのObserverを切断
        observers.forEach(observer => observer.disconnect());
        
        // すべてのインターバルをクリア
        intervals.forEach(interval => clearInterval(interval));
        
        // すべてのタイムアウトをクリア
        timeouts.forEach(timeout => clearTimeout(timeout));
        
        // イベントリスナーの削除
        if (scrollIndicator) {
            window.removeEventListener('scroll', () => {});
        }
    }
    
    // ページ遷移時のクリーンアップ
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
    
    // パブリックAPIとして公開
    if (!window.INTERCONNECT) window.INTERCONNECT = {};
    window.INTERCONNECT.scrollFadeCleanup = cleanup;
    
})();