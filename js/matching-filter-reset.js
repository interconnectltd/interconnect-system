/**
 * マッチングフィルターリセット機能
 * 削除されたmatching-ux-improvements.jsから復元
 */

(function() {
    'use strict';
    
    // フィルターリセットボタンを追加
    function addResetButton() {
        const filtersContainer = document.querySelector('.matching-filters');
        if (!filtersContainer) return;
        
        // 既存のリセットボタンがあれば削除
        const existingReset = filtersContainer.querySelector('.filter-reset-wrapper');
        if (existingReset) existingReset.remove();
        
        const resetWrapper = document.createElement('div');
        resetWrapper.className = 'filter-reset-wrapper';
        resetWrapper.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 10px;
            margin-left: auto;
        `;
        
        resetWrapper.innerHTML = `
            <button class="btn-reset" style="
                background: #e74c3c;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                transition: all 0.3s ease;
            " onmouseover="this.style.background='#c0392b'" 
               onmouseout="this.style.background='#e74c3c'"
               onclick="window.resetMatchingFilters()">
                <i class="fas fa-redo"></i>
                フィルターをリセット
            </button>
            <div class="active-filters-display" id="activeFiltersDisplay" style="
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
            "></div>
        `;
        
        filtersContainer.appendChild(resetWrapper);
    }
    
    // フィルターリセット機能
    window.resetMatchingFilters = function() {
        // セレクトボックスをリセット
        const selects = document.querySelectorAll('.matching-filters select');
        selects.forEach(select => {
            select.value = '';
            // changeイベントを手動で発火
            const event = new Event('change', { bubbles: true });
            select.dispatchEvent(event);
        });
        
        // 検索ボックスをリセット
        const searchInputs = document.querySelectorAll('.matching-filters input[type="text"], .matching-filters input[type="search"]');
        searchInputs.forEach(input => {
            input.value = '';
            const event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);
        });
        
        // LocalStorageのフィルター設定をクリア
        localStorage.removeItem('matchingFilters');
        
        // アクティブフィルター表示を更新
        updateActiveFiltersDisplay();
        
        // フィルターボタンをクリック（再検索）
        const searchBtn = document.querySelector('.matching-filters .btn-primary');
        if (searchBtn) {
            searchBtn.click();
        }
        
        // トースト通知
        if (window.showToast) {
            window.showToast('フィルターをリセットしました', 'info');
        }
    };
    
    // アクティブなフィルターを表示
    function updateActiveFiltersDisplay() {
        const display = document.getElementById('activeFiltersDisplay');
        if (!display) return;
        
        const activeFilters = [];
        
        // セレクトボックスの値を確認
        document.querySelectorAll('.matching-filters select').forEach(select => {
            if (select.value && select.value !== '') {
                const label = select.previousElementSibling?.textContent || select.name;
                const option = select.options[select.selectedIndex];
                activeFilters.push({
                    label: label,
                    value: option.textContent,
                    element: select
                });
            }
        });
        
        // 検索ボックスの値を確認
        document.querySelectorAll('.matching-filters input[type="text"], .matching-filters input[type="search"]').forEach(input => {
            if (input.value && input.value !== '') {
                activeFilters.push({
                    label: '検索',
                    value: input.value,
                    element: input
                });
            }
        });
        
        // 表示を更新
        if (activeFilters.length > 0) {
            display.innerHTML = activeFilters.map(filter => `
                <span class="active-filter-tag" style="
                    background: #3498db;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                ">
                    ${filter.label}: ${filter.value}
                    <button onclick="window.removeFilter(this, '${filter.element.name || filter.element.id}')" style="
                        background: none;
                        border: none;
                        color: white;
                        cursor: pointer;
                        padding: 0;
                        margin-left: 4px;
                        font-size: 14px;
                        line-height: 1;
                    ">×</button>
                </span>
            `).join('');
            display.style.display = 'flex';
        } else {
            display.innerHTML = '';
            display.style.display = 'none';
        }
    }
    
    // 個別フィルター削除
    window.removeFilter = function(button, elementIdentifier) {
        const element = document.querySelector(`[name="${elementIdentifier}"], #${elementIdentifier}`);
        if (element) {
            if (element.tagName === 'SELECT') {
                element.value = '';
            } else if (element.tagName === 'INPUT') {
                element.value = '';
            }
            
            // changeイベントを発火
            const event = new Event('change', { bubbles: true });
            element.dispatchEvent(event);
            
            // 再検索
            const searchBtn = document.querySelector('.matching-filters .btn-primary');
            if (searchBtn) {
                searchBtn.click();
            }
        }
        
        // 表示を更新
        updateActiveFiltersDisplay();
    };
    
    // フィルター変更を監視
    function setupFilterMonitoring() {
        const filtersContainer = document.querySelector('.matching-filters');
        if (!filtersContainer) return;
        
        // セレクトボックスの変更を監視
        filtersContainer.addEventListener('change', (e) => {
            if (e.target.tagName === 'SELECT') {
                updateActiveFiltersDisplay();
            }
        });
        
        // 入力フィールドの変更を監視
        filtersContainer.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT') {
                updateActiveFiltersDisplay();
            }
        });
    }
    
    // 初期化
    function init() {
        // DOMContentLoadedで実行
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    addResetButton();
                    setupFilterMonitoring();
                    updateActiveFiltersDisplay();
                }, 500);
            });
        } else {
            setTimeout(() => {
                addResetButton();
                setupFilterMonitoring();
                updateActiveFiltersDisplay();
            }, 500);
        }
    }
    
    init();
    
})();