/**
 * Activity Event Filter 修正
 * nullエラーを防止
 */

(function() {
    'use strict';
    
    // console.log('[ActivityFilterFix] 修正開始');
    
    // DOMが読み込まれるまで待つ
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyFixes);
    } else {
        applyFixes();
    }
    
    function applyFixes() {
        // 元のActivityEventFilterクラスをオーバーライド
        const originalCreateFilterUI = window.ActivityEventFilter?.prototype?.createFilterUI;
    
    if (window.ActivityEventFilter && window.ActivityEventFilter.prototype) {
        window.ActivityEventFilter.prototype.createFilterUI = function() {
            try {
                // アクティビティカードを安全に取得
                const activityList = document.querySelector('.activity-list');
                if (!activityList) {
                    console.warn('[ActivityFilterFix] .activity-list not found');
                    return;
                }
                
                // closestメソッドを安全に使用
                const activityCard = activityList.closest('.content-card');
                if (!activityCard) {
                    console.warn('[ActivityFilterFix] .content-card not found');
                    return;
                }
                
                // 元の処理を呼び出し
                if (originalCreateFilterUI) {
                    originalCreateFilterUI.call(this);
                } else {
                    // フォールバック実装
                    const filterContainer = document.createElement('div');
                    filterContainer.className = 'activity-filters';
                    filterContainer.innerHTML = `
                        <select class="filter-select" id="activityTypeFilter">
                            <option value="all">すべてのアクティビティ</option>
                            <option value="member_joined">新規メンバー</option>
                            <option value="event_completed">イベント完了</option>
                            <option value="matching_success">マッチング成立</option>
                            <option value="message_sent">メッセージ</option>
                            <option value="connection_made">接続</option>
                        </select>
                        <select class="filter-select" id="activityTimeFilter">
                            <option value="all">全期間</option>
                            <option value="today">今日</option>
                            <option value="week">今週</option>
                            <option value="month">今月</option>
                        </select>
                    `;
                    
                    // カードヘッダーに追加
                    const cardHeader = activityCard.querySelector('.card-header');
                    if (cardHeader) {
                        cardHeader.appendChild(filterContainer);
                    }
                }
            } catch (error) {
                console.error('[ActivityFilterFix] Error in createFilterUI:', error);
            }
        };
    }
    
    // イベントフィルターの修正も追加
    if (window.ActivityEventFilter && window.ActivityEventFilter.prototype && window.ActivityEventFilter.prototype.init) {
        const originalInit = window.ActivityEventFilter.prototype.init;
        
        window.ActivityEventFilter.prototype.init = function() {
            try {
                // DOMの存在を確認してから初期化
                const hasActivityList = document.querySelector('.activity-list');
                const hasEventList = document.querySelector('.event-list');
                
                if (!hasActivityList && !hasEventList) {
                    // console.log('[ActivityFilterFix] Required elements not found, skipping init');
                    return;
                }
                
                originalInit.call(this);
            } catch (error) {
                console.error('[ActivityFilterFix] Error in init:', error);
            }
        };
    }
    
        // console.log('[ActivityFilterFix] 修正完了');
    }
    
})();