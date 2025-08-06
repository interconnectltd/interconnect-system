/**
 * 高度な検索機能
 * 
 * 機能:
 * - 複数条件での絞り込み検索
 * - リアルタイム検索結果更新
 * - 検索履歴の保存
 * - 検索条件の保存・読み込み
 */

(function() {
    'use strict';

    console.log('[AdvancedSearch] 高度な検索機能初期化');

    // グローバル変数
    let currentUserId = null;
    let searchFilters = {
        keyword: '',
        industry: [],
        skills: [],
        interests: [],
        businessChallenges: [],
        location: '',
        hasProfileImage: false,
        lastLoginDays: 0,
        sortBy: 'relevance',
        page: 1,
        limit: 20
    };

    // 検索可能なオプション
    const searchOptions = {
        industries: [
            'IT・テクノロジー', '金融', '製造業', '小売・流通', '医療・ヘルスケア',
            '不動産・建設', '教育', 'メディア・広告', 'コンサルティング', 'その他'
        ],
        skills: [
            'AI・機械学習', 'ブロックチェーン', 'IoT', 'クラウド', 'ビッグデータ',
            'セキュリティ', 'モバイル開発', 'Web開発', 'データ分析', 'UI/UX',
            'プロジェクト管理', 'マーケティング', '営業', '財務・会計', '人事'
        ],
        interests: [
            '新規事業開発', 'DX推進', 'グローバル展開', 'M&A', 'IPO',
            'SDGs', 'ESG投資', 'スタートアップ', 'イノベーション', '地方創生'
        ],
        businessChallenges: [
            '売上向上', '新規顧客獲得', 'コスト削減', '人材採用', '人材育成',
            'DX推進', '新規事業開発', '海外展開', '資金調達', '事業承継'
        ],
        locations: [
            '東京', '大阪', '名古屋', '福岡', '札幌', '仙台', '広島', '京都', 'その他'
        ]
    };

    // 初期化
    async function initialize() {
        console.log('[AdvancedSearch] 初期化開始');

        // Supabaseの準備を待つ
        await window.waitForSupabase();

        // 現在のユーザーを取得
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            console.error('[AdvancedSearch] ユーザーが認証されていません');
            return;
        }

        currentUserId = user.id;
        console.log('[AdvancedSearch] ユーザーID:', currentUserId);

        // 検索UIを構築
        buildSearchUI();

        // イベントリスナーの設定
        setupEventListeners();

        // 保存された検索条件を読み込み
        loadSavedFilters();
    }

    // 検索UIの構築
    function buildSearchUI() {
        const searchContainer = document.querySelector('.advanced-search-container');
        if (!searchContainer) {
            console.log('[AdvancedSearch] 検索コンテナが見つかりません');
            return;
        }

        searchContainer.innerHTML = `
            <div class="search-header">
                <h2>高度な検索</h2>
                <button class="btn btn-outline btn-sm" onclick="window.AdvancedSearch.toggleFilters()">
                    <i class="fas fa-sliders-h"></i> フィルター
                </button>
            </div>

            <div class="search-bar">
                <input type="text" id="search-keyword" placeholder="名前、会社名、スキルなどで検索..." 
                       class="form-input" value="${searchFilters.keyword}">
                <button class="btn btn-primary" onclick="window.AdvancedSearch.search()">
                    <i class="fas fa-search"></i> 検索
                </button>
            </div>

            <div class="search-filters" id="search-filters" style="display: none;">
                <div class="filter-section">
                    <h3>業界</h3>
                    <div class="filter-tags">
                        ${searchOptions.industries.map(industry => `
                            <label class="filter-tag">
                                <input type="checkbox" name="industry" value="${industry}">
                                <span>${industry}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div class="filter-section">
                    <h3>スキル・専門分野</h3>
                    <div class="filter-tags">
                        ${searchOptions.skills.map(skill => `
                            <label class="filter-tag">
                                <input type="checkbox" name="skills" value="${skill}">
                                <span>${skill}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div class="filter-section">
                    <h3>興味・関心</h3>
                    <div class="filter-tags">
                        ${searchOptions.interests.map(interest => `
                            <label class="filter-tag">
                                <input type="checkbox" name="interests" value="${interest}">
                                <span>${interest}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div class="filter-section">
                    <h3>ビジネス課題</h3>
                    <div class="filter-tags">
                        ${searchOptions.businessChallenges.map(challenge => `
                            <label class="filter-tag">
                                <input type="checkbox" name="businessChallenges" value="${challenge}">
                                <span>${challenge}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div class="filter-section">
                    <h3>地域</h3>
                    <select id="location-filter" class="form-select">
                        <option value="">すべての地域</option>
                        ${searchOptions.locations.map(location => `
                            <option value="${location}">${location}</option>
                        `).join('')}
                    </select>
                </div>

                <div class="filter-section">
                    <h3>その他の条件</h3>
                    <label class="filter-option">
                        <input type="checkbox" id="has-profile-image">
                        <span>プロフィール画像あり</span>
                    </label>
                    <label class="filter-option">
                        <span>最終ログイン：</span>
                        <select id="last-login-days" class="form-select inline">
                            <option value="0">すべて</option>
                            <option value="1">1日以内</option>
                            <option value="7">1週間以内</option>
                            <option value="30">1ヶ月以内</option>
                            <option value="90">3ヶ月以内</option>
                        </select>
                    </label>
                </div>

                <div class="filter-actions">
                    <button class="btn btn-outline" onclick="window.AdvancedSearch.resetFilters()">
                        <i class="fas fa-redo"></i> リセット
                    </button>
                    <button class="btn btn-primary" onclick="window.AdvancedSearch.applyFilters()">
                        <i class="fas fa-check"></i> 適用
                    </button>
                </div>
            </div>

            <div class="search-results" id="search-results">
                <!-- 検索結果がここに表示されます -->
            </div>
        `;
    }

    // イベントリスナーの設定
    function setupEventListeners() {
        // キーワード検索のリアルタイム更新
        const keywordInput = document.getElementById('search-keyword');
        if (keywordInput) {
            let debounceTimer;
            keywordInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    searchFilters.keyword = e.target.value;
                    if (e.target.value.length >= 2 || e.target.value.length === 0) {
                        search();
                    }
                }, 500);
            });

            // Enterキーで検索
            keywordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    search();
                }
            });
        }
    }

    // フィルターの表示切り替え
    function toggleFilters() {
        const filtersDiv = document.getElementById('search-filters');
        if (filtersDiv) {
            filtersDiv.style.display = filtersDiv.style.display === 'none' ? 'block' : 'none';
        }
    }

    // フィルターの適用
    function applyFilters() {
        // チェックボックスの値を収集
        searchFilters.industry = Array.from(document.querySelectorAll('input[name="industry"]:checked'))
            .map(cb => cb.value);
        searchFilters.skills = Array.from(document.querySelectorAll('input[name="skills"]:checked'))
            .map(cb => cb.value);
        searchFilters.interests = Array.from(document.querySelectorAll('input[name="interests"]:checked'))
            .map(cb => cb.value);
        searchFilters.businessChallenges = Array.from(document.querySelectorAll('input[name="businessChallenges"]:checked'))
            .map(cb => cb.value);

        // その他の条件
        searchFilters.location = document.getElementById('location-filter').value;
        searchFilters.hasProfileImage = document.getElementById('has-profile-image').checked;
        searchFilters.lastLoginDays = parseInt(document.getElementById('last-login-days').value);

        // 検索実行
        search();

        // フィルターを保存
        saveFilters();
    }

    // フィルターのリセット
    function resetFilters() {
        // すべてのチェックボックスをクリア
        document.querySelectorAll('.search-filters input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });

        // セレクトボックスをリセット
        document.getElementById('location-filter').value = '';
        document.getElementById('last-login-days').value = '0';

        // フィルターオブジェクトをリセット
        searchFilters = {
            ...searchFilters,
            industry: [],
            skills: [],
            interests: [],
            businessChallenges: [],
            location: '',
            hasProfileImage: false,
            lastLoginDays: 0
        };

        // 検索実行
        search();
    }

    // 検索実行
    async function search() {
        try {
            showLoading();

            // クエリの構築
            let query = window.supabaseClient
                .from('user_profiles')
                .select('*')
                .neq('id', currentUserId);

            // キーワード検索
            if (searchFilters.keyword) {
                query = query.or(`name.ilike.%${searchFilters.keyword}%,company.ilike.%${searchFilters.keyword}%,bio.ilike.%${searchFilters.keyword}%`);
            }

            // 業界フィルター
            if (searchFilters.industry.length > 0) {
                query = query.in('industry', searchFilters.industry);
            }

            // 地域フィルター
            if (searchFilters.location) {
                query = query.eq('location', searchFilters.location);
            }

            // プロフィール画像フィルター
            if (searchFilters.hasProfileImage) {
                query = query.not('picture_url', 'is', null);
            }

            // 最終ログインフィルター
            if (searchFilters.lastLoginDays > 0) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - searchFilters.lastLoginDays);
                query = query.gte('last_login', cutoffDate.toISOString());
            }

            // ソート
            switch (searchFilters.sortBy) {
                case 'newest':
                    query = query.order('created_at', { ascending: false });
                    break;
                case 'active':
                    query = query.order('last_login', { ascending: false });
                    break;
                default:
                    // relevance sorting would require full-text search
                    break;
            }

            // ページネーション
            const from = (searchFilters.page - 1) * searchFilters.limit;
            const to = from + searchFilters.limit - 1;
            query = query.range(from, to);

            // 実行
            const { data: users, error, count } = await query;

            if (error) throw error;

            // スキル、興味、ビジネス課題でのフィルタリング（クライアントサイド）
            let filteredUsers = users || [];

            if (searchFilters.skills.length > 0) {
                filteredUsers = filteredUsers.filter(user => 
                    user.skills && searchFilters.skills.some(skill => user.skills.includes(skill))
                );
            }

            if (searchFilters.interests.length > 0) {
                filteredUsers = filteredUsers.filter(user => 
                    user.interests && searchFilters.interests.some(interest => user.interests.includes(interest))
                );
            }

            if (searchFilters.businessChallenges.length > 0) {
                filteredUsers = filteredUsers.filter(user => 
                    user.business_challenges && searchFilters.businessChallenges.some(challenge => 
                        user.business_challenges.includes(challenge)
                    )
                );
            }

            // 結果を表示
            displayResults(filteredUsers, count);

            // 検索履歴を保存
            saveSearchHistory();

        } catch (error) {
            console.error('[AdvancedSearch] 検索エラー:', error);
            showError('検索中にエラーが発生しました');
        } finally {
            hideLoading();
        }
    }

    // 検索結果の表示
    function displayResults(users, totalCount) {
        const resultsDiv = document.getElementById('search-results');
        if (!resultsDiv) return;

        if (users.length === 0) {
            resultsDiv.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>検索結果が見つかりませんでした</h3>
                    <p>検索条件を変更してお試しください</p>
                </div>
            `;
            return;
        }

        resultsDiv.innerHTML = `
            <div class="results-header">
                <span class="results-count">${users.length}件の結果</span>
                <select class="form-select" onchange="window.AdvancedSearch.changeSort(this.value)">
                    <option value="relevance">関連性順</option>
                    <option value="newest">新着順</option>
                    <option value="active">アクティブ順</option>
                </select>
            </div>
            <div class="results-grid">
                ${users.map(user => createUserCard(user)).join('')}
            </div>
        `;
    }

    // ユーザーカードの作成
    function createUserCard(user) {
        return `
            <div class="user-card" data-user-id="${user.id}">
                <div class="user-avatar">
                    ${user.picture_url ? 
                        `<img src="${user.picture_url}" alt="${user.name}">` :
                        `<div class="avatar-placeholder"><i class="fas fa-user"></i></div>`
                    }
                </div>
                <div class="user-info">
                    <h3>${escapeHtml(user.name || '名前未設定')}</h3>
                    <p class="user-title">${escapeHtml(user.position || '')} @ ${escapeHtml(user.company || '')}</p>
                    ${user.skills && user.skills.length > 0 ? `
                        <div class="user-tags">
                            ${user.skills.slice(0, 3).map(skill => 
                                `<span class="tag">${escapeHtml(skill)}</span>`
                            ).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="user-actions">
                    <button class="btn btn-outline btn-sm" onclick="window.location.href='profile.html?user=${user.id}'">
                        <i class="fas fa-user"></i> プロフィール
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="window.AdvancedSearch.sendConnect('${user.id}')">
                        <i class="fas fa-link"></i> コネクト
                    </button>
                </div>
            </div>
        `;
    }

    // ソート変更
    function changeSort(sortBy) {
        searchFilters.sortBy = sortBy;
        search();
    }

    // コネクト申請送信
    async function sendConnect(userId) {
        if (window.sendConnectRequest) {
            await window.sendConnectRequest(userId);
        } else {
            showError('コネクト機能が利用できません');
        }
    }

    // フィルターの保存
    function saveFilters() {
        localStorage.setItem('searchFilters', JSON.stringify(searchFilters));
    }

    // 保存されたフィルターの読み込み
    function loadSavedFilters() {
        const saved = localStorage.getItem('searchFilters');
        if (saved) {
            try {
                searchFilters = { ...searchFilters, ...JSON.parse(saved) };
                // UIに反映
                applyFiltersToUI();
            } catch (e) {
                console.error('[AdvancedSearch] フィルター読み込みエラー:', e);
            }
        }
    }

    // フィルターをUIに反映
    function applyFiltersToUI() {
        // キーワード
        const keywordInput = document.getElementById('search-keyword');
        if (keywordInput) keywordInput.value = searchFilters.keyword;

        // チェックボックス
        searchFilters.industry.forEach(value => {
            const cb = document.querySelector(`input[name="industry"][value="${value}"]`);
            if (cb) cb.checked = true;
        });

        searchFilters.skills.forEach(value => {
            const cb = document.querySelector(`input[name="skills"][value="${value}"]`);
            if (cb) cb.checked = true;
        });

        searchFilters.interests.forEach(value => {
            const cb = document.querySelector(`input[name="interests"][value="${value}"]`);
            if (cb) cb.checked = true;
        });

        searchFilters.businessChallenges.forEach(value => {
            const cb = document.querySelector(`input[name="businessChallenges"][value="${value}"]`);
            if (cb) cb.checked = true;
        });

        // セレクトボックス
        const locationSelect = document.getElementById('location-filter');
        if (locationSelect) locationSelect.value = searchFilters.location;

        const lastLoginSelect = document.getElementById('last-login-days');
        if (lastLoginSelect) lastLoginSelect.value = searchFilters.lastLoginDays;

        // その他
        const hasImageCb = document.getElementById('has-profile-image');
        if (hasImageCb) hasImageCb.checked = searchFilters.hasProfileImage;
    }

    // 検索履歴の保存
    async function saveSearchHistory() {
        try {
            await window.supabaseClient
                .from('search_history')
                .insert({
                    user_id: currentUserId,
                    search_query: searchFilters.keyword,
                    filters: searchFilters,
                    searched_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('[AdvancedSearch] 検索履歴保存エラー:', error);
        }
    }

    // ローディング表示
    function showLoading() {
        const resultsDiv = document.getElementById('search-results');
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>検索中...</span>
                </div>
            `;
        }
    }

    function hideLoading() {
        // ローディング表示は結果表示で上書きされる
    }

    // ユーティリティ関数
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showError(message) {
        showToast(message, 'error');
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // グローバルAPIとして公開
    window.AdvancedSearch = {
        initialize,
        search,
        toggleFilters,
        applyFilters,
        resetFilters,
        changeSort,
        sendConnect
    };

    // 初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();