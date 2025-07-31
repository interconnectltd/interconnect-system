/**
 * Matching Loading Animation
 * マッチングページのローディングアニメーション
 */

(function() {
    'use strict';
    
    console.log('[MatchingLoadingAnimation] 初期化');
    
    const MatchingLoader = {
        overlay: null,
        progressFill: null,
        loadingText: null,
        startTime: null,
        
        // ローディング開始
        show() {
            console.log('[MatchingLoadingAnimation] ローディング表示');
            this.startTime = Date.now();
            
            // 既存のオーバーレイがあれば削除
            this.hide();
            
            // ローディングHTML作成
            const loadingHTML = `
                <div class="matching-loading-overlay" id="matchingLoadingOverlay">
                    <div class="matching-loading-container">
                        <div class="ai-matching-animation">
                            <svg class="ai-brain-icon" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            <div class="ai-pulse-ring"></div>
                            <div class="ai-pulse-ring"></div>
                            <div class="ai-pulse-ring"></div>
                            <div class="data-points">
                                <div class="data-point"></div>
                                <div class="data-point"></div>
                                <div class="data-point"></div>
                                <div class="data-point"></div>
                                <div class="data-point"></div>
                                <div class="data-point"></div>
                            </div>
                        </div>
                        
                        <div class="matching-loading-text">AI がマッチング候補を分析中...</div>
                        <div class="matching-loading-subtext">最適なビジネスパートナーを探しています</div>
                        
                        <div class="matching-progress-bar">
                            <div class="matching-progress-fill" id="matchingProgressFill"></div>
                        </div>
                    </div>
                </div>
            `;
            
            // DOMに追加
            document.body.insertAdjacentHTML('beforeend', loadingHTML);
            
            this.overlay = document.getElementById('matchingLoadingOverlay');
            this.progressFill = document.getElementById('matchingProgressFill');
            this.loadingText = this.overlay.querySelector('.matching-loading-text');
            
            // プログレスアニメーション開始
            this.animateProgress();
            
            // テキストローテーション
            this.startTextRotation();
        },
        
        // ローディング非表示
        hide() {
            console.log('[MatchingLoadingAnimation] ローディング非表示');
            
            if (this.overlay) {
                this.overlay.classList.add('fade-out');
                setTimeout(() => {
                    this.overlay.remove();
                    this.overlay = null;
                    this.progressFill = null;
                    this.loadingText = null;
                }, 300);
            }
        },
        
        // プログレスバーアニメーション
        animateProgress() {
            if (!this.progressFill) return;
            
            let progress = 0;
            const interval = setInterval(() => {
                if (!this.progressFill) {
                    clearInterval(interval);
                    return;
                }
                
                progress += Math.random() * 15 + 5;
                if (progress > 90) {
                    progress = 90;
                    clearInterval(interval);
                }
                
                this.progressFill.style.width = progress + '%';
            }, 300);
        },
        
        // 完了時のプログレス
        completeProgress() {
            if (this.progressFill) {
                this.progressFill.style.width = '100%';
            }
        },
        
        // テキストローテーション
        startTextRotation() {
            const texts = [
                'AI がマッチング候補を分析中...',
                'ビジネスの相性を計算中...',
                'プロフィールデータを処理中...',
                '最適なパートナーを検索中...'
            ];
            
            let index = 0;
            const rotateInterval = setInterval(() => {
                if (!this.loadingText) {
                    clearInterval(rotateInterval);
                    return;
                }
                
                index = (index + 1) % texts.length;
                this.loadingText.textContent = texts[index];
            }, 2000);
        },
        
        // インラインローディング表示
        showInline(container, text = '読み込み中...') {
            const inlineHTML = `
                <div class="inline-loading">
                    <div class="inline-spinner"></div>
                    <span>${text}</span>
                </div>
            `;
            
            if (container) {
                container.innerHTML = inlineHTML;
            }
        },
        
        // カードスケルトン表示
        showCardSkeletons(container, count = 6) {
            const skeletonHTML = Array(count).fill(0).map(() => `
                <div class="card-skeleton">
                    <div class="skeleton-header">
                        <div class="skeleton-avatar"></div>
                        <div class="skeleton-info">
                            <div class="skeleton-line short"></div>
                            <div class="skeleton-line medium"></div>
                        </div>
                    </div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line medium"></div>
                    <div class="skeleton-line short"></div>
                </div>
            `).join('');
            
            if (container) {
                container.innerHTML = `<div class="matching-grid">${skeletonHTML}</div>`;
            }
        }
    };
    
    // グローバルに公開
    window.MatchingLoader = MatchingLoader;
    
    // 既存のloadProfiles関数をラップ
    const originalLoadProfiles = window.loadProfiles;
    
    window.loadProfiles = async function() {
        console.log('[MatchingLoadingAnimation] loadProfiles with loading');
        
        // ローディング開始
        MatchingLoader.show();
        
        try {
            // 元の関数を実行
            if (originalLoadProfiles) {
                await originalLoadProfiles.call(this);
            }
            
            // 成功時の処理
            MatchingLoader.completeProgress();
            
            // 最低表示時間を確保（UX向上のため）
            const elapsed = Date.now() - MatchingLoader.startTime;
            const minTime = 1500;
            
            if (elapsed < minTime) {
                await new Promise(resolve => setTimeout(resolve, minTime - elapsed));
            }
            
        } catch (error) {
            console.error('[MatchingLoadingAnimation] エラー:', error);
            
            // エラー時もローディングを非表示に
            MatchingLoader.completeProgress();
            
        } finally {
            // ローディング非表示
            MatchingLoader.hide();
        }
    };
    
    // 検索時のローディング
    const originalHandleSearch = window.handleSearch;
    
    window.handleSearch = async function(query) {
        console.log('[MatchingLoadingAnimation] 検索中...');
        
        const container = document.getElementById('matching-container');
        if (container) {
            MatchingLoader.showInline(container, `"${query}" を検索中...`);
        }
        
        try {
            if (originalHandleSearch) {
                await originalHandleSearch.call(this, query);
            }
        } catch (error) {
            console.error('[MatchingLoadingAnimation] 検索エラー:', error);
        }
    };
    
    // ページ読み込み時のローディング
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const container = document.getElementById('matching-container');
            if (container && container.children.length === 0) {
                MatchingLoader.showCardSkeletons(container);
            }
        });
    }
    
})();