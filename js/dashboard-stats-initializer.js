/**
 * Dashboard Stats Initializer
 * ダッシュボードの統計情報を初期化時に「読み込み中」状態にする
 */

(function() {
    'use strict';

    class DashboardStatsInitializer {
        constructor() {
            this.initialized = false;
        }

        /**
         * 統計カードを初期化
         */
        init() {
            if (this.initialized) return;
            
            // console.log('[StatsInitializer] 統計カードを初期化中...');
            
            // 各統計カードを「読み込み中」状態に設定
            this.setLoadingState();
            
            this.initialized = true;
        }

        /**
         * 読み込み中状態を設定
         */
        setLoadingState() {
            // 総メンバー数カード
            const memberCard = document.querySelector('.stats-container .stat-card:nth-child(1)');
            if (memberCard) {
                const statValue = memberCard.querySelector('.stat-value');
                const changeSpan = memberCard.querySelector('.stat-change span');
                
                if (statValue) {
                    statValue.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    statValue.style.fontSize = '24px';
                }
                if (changeSpan) {
                    changeSpan.textContent = '計算中...';
                }
            }

            // 今月のイベントカード
            const eventCard = document.querySelector('.stats-container .stat-card:nth-child(2)');
            if (eventCard) {
                const statValue = eventCard.querySelector('.stat-value');
                const changeSpan = eventCard.querySelector('.stat-change span');
                
                if (statValue) {
                    statValue.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    statValue.style.fontSize = '24px';
                }
                if (changeSpan) {
                    changeSpan.textContent = '計算中...';
                }
            }

            // マッチング成功数カード
            const matchingCard = document.querySelector('.stats-container .stat-card:nth-child(3)');
            if (matchingCard) {
                const statValue = matchingCard.querySelector('.stat-value');
                const changeSpan = matchingCard.querySelector('.stat-change span');
                
                if (statValue) {
                    statValue.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    statValue.style.fontSize = '24px';
                }
                if (changeSpan) {
                    changeSpan.textContent = '計算中...';
                }
            }
        }

        /**
         * エラー状態を設定
         */
        setErrorState(cardIndex, message = 'エラー') {
            const card = document.querySelector(`.stats-container .stat-card:nth-child(${cardIndex})`);
            if (!card) return;

            const statValue = card.querySelector('.stat-value');
            const changeSpan = card.querySelector('.stat-change span');
            const changeContainer = card.querySelector('.stat-change');

            if (statValue) {
                statValue.innerHTML = '--';
                statValue.style.fontSize = '';
            }
            if (changeSpan) {
                changeSpan.textContent = message;
            }
            if (changeContainer) {
                changeContainer.className = 'stat-change neutral';
            }
        }

        /**
         * 統計値を設定（アニメーション付き）
         */
        setStatValue(cardIndex, value, changeText, changeType = 'neutral') {
            const card = document.querySelector(`.stats-container .stat-card:nth-child(${cardIndex})`);
            if (!card) return;

            const statValue = card.querySelector('.stat-value');
            const changeSpan = card.querySelector('.stat-change span');
            const changeContainer = card.querySelector('.stat-change');
            const changeIcon = changeContainer?.querySelector('i');

            if (statValue) {
                // 元のフォントサイズに戻す
                statValue.style.fontSize = '';
                
                // カウントアップアニメーション
                this.animateValue(statValue, 0, value, 1000);
            }

            if (changeSpan) {
                changeSpan.textContent = changeText;
            }

            if (changeContainer) {
                changeContainer.className = `stat-change ${changeType}`;
                
                // アイコンも更新
                if (changeIcon) {
                    if (changeType === 'positive') {
                        changeIcon.className = 'fas fa-arrow-up';
                    } else if (changeType === 'negative') {
                        changeIcon.className = 'fas fa-arrow-down';
                    } else {
                        changeIcon.className = 'fas fa-minus';
                    }
                }
            }
        }

        /**
         * 数値アニメーション
         */
        animateValue(element, start, end, duration) {
            const startTime = performance.now();
            const endTime = startTime + duration;

            const update = () => {
                const now = performance.now();
                const progress = Math.min((now - startTime) / duration, 1);
                
                // イージング関数（ease-out）
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const current = Math.floor(start + (end - start) * easeOut);
                
                element.textContent = this.formatNumber(current);

                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    element.textContent = this.formatNumber(end);
                }
            };

            requestAnimationFrame(update);
        }

        /**
         * 数値をフォーマット（3桁区切り）
         */
        formatNumber(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
    }

    // グローバルに公開
    window.dashboardStatsInitializer = new DashboardStatsInitializer();

    // 即座に初期化（DOMContentLoadedを待たない）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.dashboardStatsInitializer.init();
        });
    } else {
        // 既に読み込み済みの場合は少し遅延して実行
        setTimeout(() => {
            window.dashboardStatsInitializer.init();
        }, 10);
    }

    // console.log('[StatsInitializer] モジュールが読み込まれました');

})();