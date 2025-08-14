/**
 * スクロールフェードインアニメーション
 */

document.addEventListener('DOMContentLoaded', function() {
    // IntersectionObserverのサポートチェック
    if (!('IntersectionObserver' in window)) {
        // サポートされていない場合は全て表示
        const allElements = document.querySelectorAll('.service-card, .comparison-item, .case-study, .data-card, .pricing-card, .process-step, .faq-category, .news-month, .cta-card, .section-title');
        allElements.forEach(element => {
            element.style.opacity = '1';
            element.style.transform = 'none';
        });
        return;
    }

    // フェードイン対象要素を取得
    const fadeElements = document.querySelectorAll(
        '.service-card, .comparison-item, .case-study, .data-card, ' +
        '.pricing-card, .process-step, .faq-category, .news-month, ' +
        '.cta-card, .section-title, .section-description, .about-item, ' +
        '.feature-card, .event-card, .contact-item'
    );

    // Intersection Observer の設定
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // 各要素を監視
    fadeElements.forEach(element => {
        observer.observe(element);
    });

    // ローディング完了チェック関数（homepage-loading-integration.jsと連携）
    function checkLoadingComplete() {
        // homepage-loading-integration.jsが処理を行うため、ここではスキップ
        if (window.homepageLoadingIntegration) {
            // console.log('[ScrollFade] ローディング処理はhomepage-loading-integrationに委譲');
            return;
        }
        
        // フォールバック処理
        const loadingScreen = document.querySelector('.loading-screen');
        
        if (!loadingScreen || loadingScreen.style.display === 'none' || 
            !document.contains(loadingScreen) || loadingScreen.classList.contains('fade-out')) {
            // ローディング完了後、少し遅延してからアニメーション開始
            setTimeout(initHeroAnimation, 300);
        } else {
            // ローディング中の場合は100ms後に再チェック
            setTimeout(checkLoadingComplete, 100);
        }
    }
    
    // シンプルなタイプライターエフェクト
    function initHeroAnimation() {
        const heroTitle = document.querySelector('.hero-title');
        const heroSubtitle = document.querySelector('.hero-subtitle');
        
        if (!heroTitle) return;
        
        heroTitle.style.opacity = '1';
        heroTitle.style.visibility = 'visible';
        
        // シンプルなタイプライターエフェクト（HTML対応版）
        function typewriterEffect(element, callback) {
            if (!element) {
                if (callback) callback();
                return;
            }
            
            // innerHTMLを保存してHTMLタグを維持
            const originalHTML = element.innerHTML;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = originalHTML;
            const originalText = tempDiv.textContent || tempDiv.innerText || '';
            
            // シンプルな実装：最後に元のHTMLを復元するだけ
            const htmlParts = [];
            
            element.innerHTML = '';
            
            let currentIndex = 0;
            let currentHTML = '';
            
            function typeNextCharacter() {
                if (currentIndex < originalText.length) {
                    currentHTML += originalText[currentIndex];
                    element.textContent = currentHTML;
                    currentIndex++;
                    setTimeout(typeNextCharacter, 20); // 20ms間隔（2.5倍速）
                } else {
                    // 最後に元のHTMLを設定して確実に改行を含める
                    element.innerHTML = originalHTML;
                    if (callback) setTimeout(callback, 200);
                }
            }
            
            setTimeout(typeNextCharacter, 200);
        }
        
        // タイトルのタイプライター開始
        typewriterEffect(heroTitle, () => {
            // タイトル完了後、サブタイトルを開始
            if (heroSubtitle) {
                heroSubtitle.style.opacity = '1';
                heroSubtitle.style.visibility = 'visible';
                typewriterEffect(heroSubtitle);
            }
        });
    }
    
    // ローディング完了チェック開始
    checkLoadingComplete();
    
    // グローバルに公開（homepage-loading-integration.jsから呼び出し可能にする）
    window.initScrollAnimations = function() {
        // 既にobserverが設定されているので、要素の可視性をリセット
        fadeElements.forEach(element => {
            if (!element.classList.contains('visible')) {
                observer.observe(element);
            }
        });
    };

    // セクションタイトルのアニメーション
    const sectionTitles = document.querySelectorAll('.section-title');
    sectionTitles.forEach(title => {
        title.style.opacity = '0';
        title.style.transform = 'translateY(20px)';
        title.style.transition = 'all 0.8s ease';
    });

    const titleObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
                titleObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    sectionTitles.forEach(title => {
        titleObserver.observe(title);
    });

    // スクロールインジケーターのアニメーション
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.style.opacity = '0';
        setTimeout(() => {
            scrollIndicator.style.opacity = '1';
            scrollIndicator.style.transition = 'opacity 1s ease';
        }, 3000);
    }

    // 数字カウントアップアニメーション
    const counterElements = document.querySelectorAll('.data-value');
    
    const animateCounter = (element, target, suffix = '') => {
        const duration = 2000; // 2秒
        const steps = 60;
        const stepDuration = duration / steps;
        let current = 0;
        
        // 数値とサフィックスを分離
        const numericTarget = parseFloat(target.replace(/[^0-9.]/g, ''));
        const isPercentage = target.includes('%');
        const isCurrency = target.includes('億円') || target.includes('万円');
        
        const counter = setInterval(() => {
            current += numericTarget / steps;
            
            if (current >= numericTarget) {
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
    };

    // 実績セクションのオブザーバー
    const performanceSection = document.querySelector('.performance-data');
    if (performanceSection) {
        const performanceObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    counterElements.forEach(element => {
                        const originalText = element.textContent;
                        element.textContent = '0';
                        animateCounter(element, originalText);
                    });
                    performanceObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        
        performanceObserver.observe(performanceSection);
    }
});