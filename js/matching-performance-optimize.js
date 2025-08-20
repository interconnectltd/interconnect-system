/**
 * マッチングページパフォーマンス最適化
 * 遅延読み込み、デバウンス、スロットリング
 */

(function() {
    'use strict';
    
    // デバウンス関数
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // スロットル関数
    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // 画像の遅延読み込み
    function setupLazyLoading() {
        if (!('IntersectionObserver' in window)) {
            // フォールバック: すべての画像を即座に読み込む
            loadAllImages();
            return;
        }
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    
                    // data-srcから実際のsrcを設定
                    if (img.dataset.src) {
                        // プリロード
                        const tempImg = new Image();
                        tempImg.onload = () => {
                            img.src = img.dataset.src;
                            img.classList.add('loaded');
                            
                            // フェードインアニメーション
                            img.style.opacity = '0';
                            img.style.transition = 'opacity 0.3s ease';
                            setTimeout(() => {
                                img.style.opacity = '1';
                            }, 10);
                        };
                        tempImg.onerror = () => {
                            // エラー時はデフォルト画像を設定
                            img.src = 'assets/default-avatar.svg';
                            img.classList.add('error');
                        };
                        tempImg.src = img.dataset.src;
                        
                        delete img.dataset.src;
                    }
                    
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.01
        });
        
        // マッチングカードの画像を監視
        const lazyImages = document.querySelectorAll('.matching-card img[data-src], .profile-image[data-src]');
        lazyImages.forEach(img => imageObserver.observe(img));
        
        // 動的に追加される画像も監視
        const matchingContainer = document.getElementById('matching-container');
        if (matchingContainer) {
            const mutationObserver = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            const images = node.querySelectorAll('img[data-src]');
                            images.forEach(img => imageObserver.observe(img));
                        }
                    });
                });
            });
            
            mutationObserver.observe(matchingContainer, {
                childList: true,
                subtree: true
            });
        }
    }
    
    // フォールバック: すべての画像を読み込む
    function loadAllImages() {
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                delete img.dataset.src;
            }
        });
    }
    
    // レーダーチャートの遅延描画
    function setupLazyCharts() {
        if (!('IntersectionObserver' in window)) return;
        
        const chartObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const chartContainer = entry.target;
                    const canvas = chartContainer.querySelector('canvas');
                    
                    if (canvas && !canvas.dataset.rendered) {
                        // レーダーチャート描画をトリガー
                        const event = new CustomEvent('lazyDrawChart', {
                            detail: { canvas }
                        });
                        window.dispatchEvent(event);
                        canvas.dataset.rendered = 'true';
                    }
                    
                    observer.unobserve(chartContainer);
                }
            });
        }, {
            rootMargin: '100px',
            threshold: 0.1
        });
        
        // レーダーチャートコンテナを監視
        const chartContainers = document.querySelectorAll('.radar-chart-container');
        chartContainers.forEach(container => chartObserver.observe(container));
    }
    
    // スクロールパフォーマンス最適化
    function optimizeScroll() {
        let ticking = false;
        
        function updateScrollPosition() {
            // スクロール位置に応じた処理
            const scrollY = window.scrollY;
            
            // ヘッダーの固定/非固定
            const header = document.querySelector('.content-header');
            if (header) {
                if (scrollY > 100) {
                    header.classList.add('sticky');
                } else {
                    header.classList.remove('sticky');
                }
            }
            
            ticking = false;
        }
        
        function requestTick() {
            if (!ticking) {
                window.requestAnimationFrame(updateScrollPosition);
                ticking = true;
            }
        }
        
        window.addEventListener('scroll', requestTick, { passive: true });
    }
    
    // フィルター入力の最適化
    function optimizeFilters() {
        // 検索入力のデバウンス
        const searchInputs = document.querySelectorAll('.matching-filters input[type="text"], .matching-filters input[type="search"]');
        searchInputs.forEach(input => {
            const debouncedSearch = debounce((value) => {
                // 検索処理をトリガー
                const event = new CustomEvent('filterSearch', {
                    detail: { value }
                });
                window.dispatchEvent(event);
            }, 300);
            
            input.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });
        });
        
        // セレクトボックスの変更をスロットリング
        const selectBoxes = document.querySelectorAll('.matching-filters select');
        const throttledFilter = throttle(() => {
            // フィルター処理をトリガー
            const searchBtn = document.querySelector('.matching-filters .btn-primary');
            if (searchBtn) {
                searchBtn.click();
            }
        }, 500);
        
        selectBoxes.forEach(select => {
            select.addEventListener('change', throttledFilter);
        });
    }
    
    // アニメーションの最適化
    function optimizeAnimations() {
        // will-changeの適切な設定
        const animatedElements = document.querySelectorAll('.matching-card');
        
        animatedElements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                element.style.willChange = 'transform, box-shadow';
            });
            
            element.addEventListener('mouseleave', () => {
                // アニメーション完了後にwill-changeを削除
                setTimeout(() => {
                    element.style.willChange = 'auto';
                }, 300);
            });
        });
    }
    
    // レンダリング最適化
    function optimizeRendering() {
        // Virtual Scrolling風の実装（簡易版）
        const container = document.getElementById('matching-container');
        if (!container) return;
        
        const grid = container.querySelector('.matching-grid');
        if (!grid) return;
        
        // 表示領域外のカードを非表示にする
        const cards = grid.querySelectorAll('.matching-card');
        
        const visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.visibility = 'visible';
                    entry.target.style.opacity = '1';
                } else {
                    // 画面外のカードは見えなくする（DOMには残す）
                    entry.target.style.visibility = 'hidden';
                    entry.target.style.opacity = '0';
                }
            });
        }, {
            rootMargin: '200px',
            threshold: 0
        });
        
        cards.forEach(card => {
            card.style.transition = 'opacity 0.3s ease';
            visibilityObserver.observe(card);
        });
    }
    
    // メモリリーク防止
    function preventMemoryLeaks() {
        // イベントリスナーのクリーンアップ
        window.addEventListener('beforeunload', () => {
            // すべてのObserverを切断
            if (window.matchingObservers) {
                window.matchingObservers.forEach(observer => observer.disconnect());
            }
            
            // タイマーのクリア
            if (window.matchingTimers) {
                window.matchingTimers.forEach(timer => clearTimeout(timer));
            }
        });
    }
    
    // 初期化
    function init() {
        // パフォーマンス測定開始
        if (window.performance && window.performance.mark) {
            window.performance.mark('matching-optimize-start');
        }
        
        // 各最適化を実行
        setupLazyLoading();
        setupLazyCharts();
        optimizeScroll();
        optimizeFilters();
        optimizeAnimations();
        optimizeRendering();
        preventMemoryLeaks();
        
        // パフォーマンス測定終了
        if (window.performance && window.performance.mark) {
            window.performance.mark('matching-optimize-end');
            window.performance.measure('matching-optimize', 'matching-optimize-start', 'matching-optimize-end');
            
            const measure = window.performance.getEntriesByName('matching-optimize')[0];
            console.log(`[MatchingOptimize] 最適化完了: ${measure.duration.toFixed(2)}ms`);
        }
    }
    
    // DOMContentLoadedで実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();