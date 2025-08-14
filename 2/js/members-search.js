/**
 * Members Search & Filter
 * メンバー検索・フィルター機能
 */

(function() {
    'use strict';

    // console.log('[MembersSearch] 初期化開始...');

    class MembersSearchManager {
        constructor() {
            this.searchInput = null;
            this.industrySelect = null;
            this.roleSelect = null;
            this.searchTimeout = null;
            this.init();
        }

        init() {
            this.setupElements();
            this.setupEventListeners();
            this.loadSavedFilters();
        }

        /**
         * DOM要素を設定
         */
        setupElements() {
            this.searchInput = document.querySelector('.search-input');
            this.industrySelect = document.querySelector('.filter-select[name="industry"]') || 
                                  document.querySelector('.filter-select:nth-of-type(1)');
            this.roleSelect = document.querySelector('.filter-select[name="role"]') || 
                              document.querySelector('.filter-select:nth-of-type(2)');

            // name属性を追加
            if (this.industrySelect && !this.industrySelect.name) {
                this.industrySelect.name = 'industry';
            }
            if (this.roleSelect && !this.roleSelect.name) {
                this.roleSelect.name = 'role';
            }
        }

        /**
         * イベントリスナーを設定
         */
        setupEventListeners() {
            // 検索入力
            if (this.searchInput) {
                this.searchInput.addEventListener('input', (e) => {
                    this.handleSearchInput(e.target.value);
                });

                // Enterキーでの検索
                this.searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.performSearch();
                    }
                });
            }

            // 業界フィルター
            if (this.industrySelect) {
                this.industrySelect.addEventListener('change', (e) => {
                    this.handleFilterChange('industry', e.target.value);
                });
            }

            // 役職フィルター
            if (this.roleSelect) {
                this.roleSelect.addEventListener('change', (e) => {
                    this.handleFilterChange('role', e.target.value);
                });
            }

            // 検索クリアボタンを追加
            this.addSearchClearButton();
        }

        /**
         * 検索入力を処理（デバウンス付き）
         */
        handleSearchInput(value) {
            // 既存のタイムアウトをクリア
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }

            // 検索文字列を更新
            if (window.membersSupabase) {
                window.membersSupabase.filters.search = value;
            }

            // 300ms後に検索実行
            this.searchTimeout = setTimeout(() => {
                this.performSearch();
            }, 300);

            // 検索フィルターを保存
            this.saveFilters();
        }

        /**
         * フィルター変更を処理
         */
        handleFilterChange(type, value) {
            if (window.membersSupabase) {
                window.membersSupabase.filters[type] = value;
                window.membersSupabase.currentPage = 1; // ページをリセット
                this.performSearch();
            }

            // フィルターを保存
            this.saveFilters();
        }

        /**
         * 検索を実行
         */
        async performSearch() {
            if (!window.membersSupabase) {
                console.error('[MembersSearch] Supabaseマネージャーが見つかりません');
                return;
            }

            // ローディング表示
            this.showLoading();

            try {
                await window.membersSupabase.loadMembers();
            } catch (error) {
                console.error('[MembersSearch] 検索エラー:', error);
                this.showError();
            } finally {
                this.hideLoading();
            }
        }

        /**
         * 検索クリアボタンを追加
         */
        addSearchClearButton() {
            if (!this.searchInput) return;

            const searchBox = this.searchInput.parentElement;
            if (!searchBox.querySelector('.search-clear')) {
                const clearButton = document.createElement('button');
                clearButton.className = 'search-clear';
                clearButton.innerHTML = '<i class="fas fa-times"></i>';
                clearButton.style.cssText = `
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 8px;
                    display: none;
                    transition: color 0.2s;
                `;
                
                clearButton.addEventListener('click', () => {
                    this.clearSearch();
                });

                searchBox.style.position = 'relative';
                searchBox.appendChild(clearButton);

                // 入力があるときのみ表示
                this.searchInput.addEventListener('input', (e) => {
                    clearButton.style.display = e.target.value ? 'block' : 'none';
                });
            }
        }

        /**
         * 検索をクリア
         */
        clearSearch() {
            if (this.searchInput) {
                this.searchInput.value = '';
                this.searchInput.dispatchEvent(new Event('input'));
            }
        }

        /**
         * フィルターをリセット
         */
        resetFilters() {
            // 検索をクリア
            this.clearSearch();

            // セレクトボックスをリセット
            if (this.industrySelect) this.industrySelect.value = '';
            if (this.roleSelect) this.roleSelect.value = '';

            // Supabaseフィルターをリセット
            if (window.membersSupabase) {
                window.membersSupabase.filters = {
                    search: '',
                    industry: '',
                    role: '',
                    skills: []
                };
                window.membersSupabase.currentPage = 1;
                this.performSearch();
            }

            // 保存されたフィルターをクリア
            localStorage.removeItem('memberFilters');
        }

        /**
         * フィルターを保存
         */
        saveFilters() {
            if (window.membersSupabase) {
                const filters = {
                    search: window.membersSupabase.filters.search,
                    industry: window.membersSupabase.filters.industry,
                    role: window.membersSupabase.filters.role
                };
                localStorage.setItem('memberFilters', JSON.stringify(filters));
            }
        }

        /**
         * 保存されたフィルターを読み込む
         */
        loadSavedFilters() {
            try {
                const saved = localStorage.getItem('memberFilters');
                if (saved) {
                    const filters = JSON.parse(saved);
                    
                    // UIに反映
                    if (this.searchInput && filters.search) {
                        this.searchInput.value = filters.search;
                    }
                    if (this.industrySelect && filters.industry) {
                        this.industrySelect.value = filters.industry;
                    }
                    if (this.roleSelect && filters.role) {
                        this.roleSelect.value = filters.role;
                    }

                    // Supabaseフィルターに反映
                    if (window.membersSupabase) {
                        Object.assign(window.membersSupabase.filters, filters);
                    }
                }
            } catch (error) {
                console.error('[MembersSearch] フィルター読み込みエラー:', error);
            }
        }

        /**
         * ローディング表示
         */
        showLoading() {
            const grid = document.querySelector('.members-grid');
            if (grid) {
                grid.style.opacity = '0.6';
                grid.style.pointerEvents = 'none';
            }
        }

        /**
         * ローディング非表示
         */
        hideLoading() {
            const grid = document.querySelector('.members-grid');
            if (grid) {
                grid.style.opacity = '1';
                grid.style.pointerEvents = '';
            }
        }

        /**
         * エラー表示
         */
        showError() {
            const grid = document.querySelector('.members-grid');
            if (grid) {
                grid.innerHTML = `
                    <div class="search-error" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                        <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: var(--danger-color); margin-bottom: 1rem;"></i>
                        <h3>検索エラー</h3>
                        <p>検索中にエラーが発生しました。もう一度お試しください。</p>
                        <button class="btn btn-primary" onclick="window.membersSearch.performSearch()">
                            再試行
                        </button>
                    </div>
                `;
            }
        }

        /**
         * 高度な検索機能を追加（将来の拡張用）
         */
        setupAdvancedSearch() {
            // スキルタグ検索
            // 地域フィルター
            // 並び替え機能
            // 詳細検索モーダル
            // console.log('[MembersSearch] 高度な検索機能は今後実装予定');
        }
    }

    // リセットボタンのスタイルを追加
    const style = document.createElement('style');
    style.textContent = `
        .search-clear:hover {
            color: var(--primary-color) !important;
        }

        .filter-reset {
            padding: 14px 24px;
            background: var(--danger-color);
            color: white;
            border: none;
            border-radius: 16px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .filter-reset:hover {
            background: var(--danger-hover);
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(239, 68, 68, 0.3);
        }

        .members-grid {
            transition: opacity 0.3s ease;
        }

        /* 検索ハイライト */
        .search-highlight {
            background-color: #fef3c7;
            padding: 2px 4px;
            border-radius: 3px;
            font-weight: 500;
        }
    `;
    document.head.appendChild(style);

    // フィルターリセットボタンを追加
    const addResetButton = () => {
        const filterControls = document.querySelector('.filter-controls');
        if (filterControls && !filterControls.querySelector('.filter-reset')) {
            const resetButton = document.createElement('button');
            resetButton.className = 'filter-reset';
            resetButton.innerHTML = '<i class="fas fa-undo"></i> リセット';
            resetButton.onclick = () => window.membersSearch.resetFilters();
            filterControls.appendChild(resetButton);
        }
    };

    // DOMContentLoadedで実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addResetButton);
    } else {
        addResetButton();
    }

    // グローバルインスタンス
    window.membersSearch = new MembersSearchManager();

    // console.log('[MembersSearch] 初期化完了');
})();