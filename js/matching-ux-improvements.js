/**
 * マッチング機能のUX改善
 * フィルターリセット、エラー表示改善、代替案提示
 */

(function() {
    'use strict';

    // DOM読み込み後に実行
    document.addEventListener('DOMContentLoaded', function() {
        
        // フィルターリセットボタンを追加
        function addResetButton() {
            const filtersContainer = document.querySelector('.matching-filters');
            if (!filtersContainer) return;
            
            // 既存のリセットボタンがあれば削除
            const existingReset = filtersContainer.querySelector('.filter-reset-wrapper');
            if (existingReset) existingReset.remove();
            
            const resetWrapper = document.createElement('div');
            resetWrapper.className = 'filter-reset-wrapper';
            resetWrapper.innerHTML = `
                <button class="btn-reset" onclick="window.resetMatchingFilters()">
                    <i class="fas fa-redo"></i>
                    フィルターをリセット
                </button>
                <div class="active-filters-display" id="activeFiltersDisplay"></div>
            `;
            
            filtersContainer.appendChild(resetWrapper);
        }
        
        // フィルターリセット機能
        window.resetMatchingFilters = function() {
            const selects = document.querySelectorAll('.matching-filters select');
            selects.forEach(select => {
                select.value = '';
                select.classList.remove('active');
            });
            
            // matchingSupabaseインスタンスがあれば再読み込み
            if (window.matchingSupabase) {
                window.matchingSupabase.filters = {
                    industry: '',
                    location: '',
                    interest: ''
                };
                window.matchingSupabase.currentPage = 1;
                
                // 最適化版が利用可能な場合
                if (typeof window.matchingSupabase.loadProfilesOptimized === 'function') {
                    window.matchingSupabase.loadProfilesOptimized(1);
                } else {
                    window.matchingSupabase.applyFilters();
                }
            }
            
            updateActiveFiltersDisplay();
        };
        
        // アクティブなフィルターの表示
        function updateActiveFiltersDisplay() {
            const display = document.getElementById('activeFiltersDisplay');
            if (!display) return;
            
            const filters = [];
            const selects = document.querySelectorAll('.matching-filters select');
            
            selects.forEach(select => {
                if (select.value) {
                    const label = select.closest('.filter-group').querySelector('label').textContent;
                    const text = select.options[select.selectedIndex].text;
                    filters.push({
                        name: select.name,
                        label: label,
                        value: select.value,
                        text: text
                    });
                    select.closest('.filter-group').classList.add('active');
                } else {
                    select.closest('.filter-group').classList.remove('active');
                }
            });
            
            if (filters.length === 0) {
                display.innerHTML = '';
                return;
            }
            
            display.innerHTML = filters.map(filter => `
                <span class="active-filter-tag">
                    ${filter.label}: ${filter.text}
                    <button onclick="window.removeFilter('${filter.name}')" aria-label="削除">
                        <i class="fas fa-times"></i>
                    </button>
                </span>
            `).join('');
        }
        
        // 個別フィルター削除
        window.removeFilter = function(filterName) {
            const select = document.querySelector(`.matching-filters select[name="${filterName}"]`);
            if (select) {
                select.value = '';
                if (window.matchingSupabase) {
                    window.matchingSupabase.filters[filterName] = '';
                    window.matchingSupabase.currentPage = 1;
                    
                    if (typeof window.matchingSupabase.loadProfilesOptimized === 'function') {
                        window.matchingSupabase.loadProfilesOptimized(1);
                    } else {
                        window.matchingSupabase.applyFilters();
                    }
                }
            }
            updateActiveFiltersDisplay();
        };
        
        // 元のgetEmptyStateHTMLをオーバーライド
        if (window.matchingSupabase) {
            const originalGetEmptyStateHTML = window.matchingSupabase.getEmptyStateHTML.bind(window.matchingSupabase);
            
            window.matchingSupabase.getEmptyStateHTML = function() {
                const hasFilters = Object.values(this.filters).some(f => f !== '');
                
                if (hasFilters) {
                    return `
                        <div class="empty-state">
                            <i class="fas fa-users-slash"></i>
                            <h3>マッチング候補が見つかりません</h3>
                            <p>フィルター条件を変更してお試しください</p>
                            
                            <div class="empty-state-suggestions">
                                <h4>おすすめの対処法：</h4>
                                <ul>
                                    <li>一部のフィルターを解除してみる</li>
                                    <li>地域を「すべて」に変更する</li>
                                    <li>興味・関心の条件を広げる</li>
                                </ul>
                            </div>
                            
                            <div class="error-retry-options">
                                <button class="btn btn-primary" onclick="window.resetMatchingFilters()">
                                    <i class="fas fa-redo"></i>
                                    フィルターをリセット
                                </button>
                                <button class="btn btn-outline" onclick="window.history.back()">
                                    <i class="fas fa-arrow-left"></i>
                                    戻る
                                </button>
                            </div>
                        </div>
                    `;
                } else {
                    return originalGetEmptyStateHTML();
                }
            };
            
            // showErrorメソッドも改善
            const originalShowError = window.matchingSupabase.showError.bind(window.matchingSupabase);
            
            window.matchingSupabase.showError = function(title, message, error = null) {
                const grid = document.querySelector('.matching-grid');
                if (!grid) return;
                
                const errorDetails = error ? `
                    <div class="error-details">
                        <strong>エラー詳細:</strong><br>
                        ${this.escapeHtml(error.message || error.toString())}
                        ${error.code ? `<br>エラーコード: ${error.code}` : ''}
                    </div>
                ` : '';
                
                // エラーの種類に応じた対処法
                let suggestions = '';
                if (error && error.code === '42P01') {
                    suggestions = `
                        <div class="empty-state-suggestions">
                            <h4>このエラーを解決するには：</h4>
                            <ul>
                                <li>管理者に連絡してデータベース設定を確認してもらう</li>
                                <li>execute-all-matching-sql.sqlを実行する</li>
                            </ul>
                        </div>
                    `;
                } else if (error && error.message && error.message.includes('network')) {
                    suggestions = `
                        <div class="empty-state-suggestions">
                            <h4>ネットワークエラーの対処法：</h4>
                            <ul>
                                <li>インターネット接続を確認する</li>
                                <li>VPNを使用している場合は一時的に無効にする</li>
                                <li>ブラウザのキャッシュをクリアする</li>
                            </ul>
                        </div>
                    `;
                }
                
                grid.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>${this.escapeHtml(title)}</h3>
                        <p>${this.escapeHtml(message)}</p>
                        ${errorDetails}
                        ${suggestions}
                        <div class="error-retry-options">
                            <button class="btn btn-primary" onclick="location.reload()">
                                <i class="fas fa-redo"></i>
                                再読み込み
                            </button>
                            <button class="btn btn-outline" onclick="window.matchingTests && window.matchingTests.runAllTests()">
                                <i class="fas fa-stethoscope"></i>
                                診断を実行
                            </button>
                        </div>
                    </div>
                `;
            };
        }
        
        // フィルター変更時にアクティブ表示を更新
        const filterSelects = document.querySelectorAll('.matching-filters select');
        filterSelects.forEach(select => {
            select.addEventListener('change', updateActiveFiltersDisplay);
        });
        
        // 初期化
        addResetButton();
        updateActiveFiltersDisplay();
        
        // プログレスバーを追加
        const grid = document.querySelector('.matching-grid');
        if (grid && window.matchingSupabase) {
            const originalShowLoading = window.matchingSupabase.showLoading.bind(window.matchingSupabase);
            
            window.matchingSupabase.showLoading = function() {
                originalShowLoading();
                
                // プログレスバーを追加
                const loadingOverlay = grid.querySelector('.loading-overlay');
                if (loadingOverlay && !loadingOverlay.querySelector('.loading-progress')) {
                    const progressBar = document.createElement('div');
                    progressBar.className = 'loading-progress';
                    progressBar.innerHTML = '<div class="loading-progress-bar"></div>';
                    loadingOverlay.insertBefore(progressBar, loadingOverlay.firstChild);
                }
            };
        }
        
        console.log('[MatchingUX] Improvements loaded');
    });
    
})();