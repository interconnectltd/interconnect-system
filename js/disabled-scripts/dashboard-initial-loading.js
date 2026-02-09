/**
 * Dashboard Initial Loading State
 * ページ読み込み時の初期ローディング状態を管理
 */

(function() {
    'use strict';

    // ページ読み込み直後にローディング状態を表示
    function showInitialLoading() {
        // console.log('[InitialLoading] Showing initial loading states');
        
        // 統計コンテナにローディング表示
        const statsContainer = document.querySelector('.stats-container');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="loading-state" style="grid-column: 1 / -1;">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <div class="loading-message">統計データを読み込んでいます...</div>
                </div>
            `;
            statsContainer.classList.add('is-loading');
        }

        // アクティビティリストにローディング表示
        const activityList = document.querySelector('.activity-list');
        if (activityList) {
            activityList.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <div class="loading-message">アクティビティを読み込んでいます...</div>
                </div>
            `;
            activityList.classList.add('is-loading');
        }

        // イベントリストにローディング表示
        const eventList = document.querySelector('.event-list');
        if (eventList) {
            eventList.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <div class="loading-message">イベント情報を読み込んでいます...</div>
                </div>
            `;
            eventList.classList.add('is-loading');
        }
    }

    // DOMContentLoadedイベントで実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showInitialLoading);
    } else {
        // 既にDOMが読み込まれている場合は即座に実行
        showInitialLoading();
    }

    // グローバルに公開（デバッグ用）
    window.dashboardInitialLoading = {
        showInitialLoading: showInitialLoading
    };

})();