/**
 * Matching Supabase Integration - Improved Version
 * マッチング機能のSupabase連携（改良版）
 */

(function() {
    'use strict';

    // 定数の定義（外部設定ファイルがあればそれを使用、なければデフォルト値）
    const CONFIG = window.MATCHING_CONFIG || {
        ITEMS_PER_PAGE: 6,
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        CACHE_DURATION: 5 * 60 * 1000, // 5分
        DEBOUNCE_DELAY: 300,
        MAX_VISIBLE_PAGES: 5,
        DEFAULT_AVATAR: 'assets/user-placeholder.svg',
        MATCHING_WEIGHTS: {
            title: 10,
            company: 10,
            bio: 10,
            skills: 10,
            industry: 5,
            location: 5
        }
    };

    class MatchingSupabaseImproved {
        constructor() {
            this.filters = {
                industry: '',
                location: '',
                interest: ''
            };
            this.sortOrder = 'score';
            this.currentPage = 1;
            this.isLoading = false;
            this.cache = new Map();
            this.retryCount = 0;
            this.abortController = null;
            this.init();
        }

        init() {
            if (!window.supabase) {
                console.error('[MatchingSupabase] Supabase client not found');
                this.showError('データベース接続エラー', 'ページをリロードしてください');
                return;
            }

            this.injectStyles();
            this.setupEventListeners();
            this.loadProfiles();
        }

        /**
         * スタイルの注入
         */
        injectStyles() {
            const style = document.createElement('style');
            style.textContent = `
                /* ローディング状態 */
                .matching-grid.loading {
                    position: relative;
                    min-height: 400px;
                }

                .loading-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                }

                .loading-spinner {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f4f6;
                    border-top: 4px solid #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .loading-text {
                    color: #6b7280;
                    font-size: 14px;
                }

                /* エラー状態 */
                .empty-state, .error-state {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 60px 20px;
                    color: #6c757d;
                }

                .empty-state i, .error-state i {
                    font-size: 64px;
                    margin-bottom: 20px;
                    opacity: 0.5;
                }

                .empty-state h3, .error-state h3 {
                    font-size: 20px;
                    margin-bottom: 10px;
                    color: #495057;
                }

                .empty-state p, .error-state p {
                    font-size: 14px;
                    margin-bottom: 20px;
                }

                .error-state {
                    color: #dc3545;
                }

                .error-state i {
                    color: #dc3545;
                }

                .error-details {
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                    padding: 12px;
                    margin-top: 16px;
                    text-align: left;
                    font-size: 12px;
                    font-family: monospace;
                    max-width: 600px;
                    margin-left: auto;
                    margin-right: auto;
                }

                /* フェードインアニメーション */
                .matching-card {
                    animation: fadeIn 0.3s ease-in-out;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .matching-card .btn:disabled {
                    cursor: not-allowed;
                    opacity: 0.6;
                }

                /* スケルトンローダー */
                .skeleton {
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                }

                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                .skeleton-card {
                    border-radius: 8px;
                    padding: 20px;
                    background: #fff;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .skeleton-avatar {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    margin: 0 auto 16px;
                }

                .skeleton-text {
                    height: 16px;
                    border-radius: 4px;
                    margin-bottom: 8px;
                }

                .skeleton-text.title {
                    width: 60%;
                    margin: 0 auto 8px;
                }

                .skeleton-text.subtitle {
                    width: 80%;
                    margin: 0 auto 8px;
                }
            `;
            document.head.appendChild(style);
        }

        setupEventListeners() {
            // デバウンス用のタイマー
            let filterDebounce;

            // フィルターのイベントリスナー
            const filterSelects = {
                industry: document.querySelector('.filter-group select[name="industry"]'),
                location: document.querySelector('.filter-group select[name="location"]'),
                interest: document.querySelector('.filter-group select[name="interest"]')
            };

            // name属性を追加
            Object.entries(filterSelects).forEach(([name, select]) => {
                if (select && !select.name) {
                    select.name = name;
                }
            });

            // 検索ボタン
            const searchBtn = document.querySelector('.matching-filters .btn-primary');
            if (searchBtn) {
                searchBtn.addEventListener('click', () => {
                    clearTimeout(filterDebounce);
                    this.applyFilters();
                });
            }

            // フィルター変更時の自動検索（デバウンス付き）
            Object.values(filterSelects).forEach(select => {
                if (select) {
                    select.addEventListener('change', () => {
                        clearTimeout(filterDebounce);
                        filterDebounce = setTimeout(() => {
                            this.applyFilters();
                        }, CONFIG.DEBOUNCE_DELAY);
                    });
                }
            });

            // ソート順の変更
            const sortSelect = document.querySelector('.sort-options select');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    this.sortOrder = e.target.value;
                    this.renderProfiles();
                });
            }

            // ページネーション
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('page-number') && !this.isLoading) {
                    this.currentPage = parseInt(e.target.textContent);
                    this.renderProfiles();
                } else if (e.target.closest('.pagination .btn-outline') && !this.isLoading) {
                    const isPrev = e.target.textContent.includes('前へ');
                    this.handlePagination(isPrev);
                }
            });

            // ページ離脱時の処理
            window.addEventListener('beforeunload', () => {
                if (this.abortController) {
                    this.abortController.abort();
                }
            });
        }

        /**
         * ページネーションハンドラー
         */
        handlePagination(isPrev) {
            const totalPages = Math.ceil(this.filteredProfiles.length / CONFIG.ITEMS_PER_PAGE);
            
            if (isPrev && this.currentPage > 1) {
                this.currentPage--;
                this.renderProfiles();
            } else if (!isPrev && this.currentPage < totalPages) {
                this.currentPage++;
                this.renderProfiles();
            }
        }

        /**
         * プロフィールデータを読み込み（リトライ機能付き）
         */
        async loadProfiles() {
            // キャッシュチェック
            const cacheKey = 'all_profiles';
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                this.allProfiles = cached;
                this.filteredProfiles = [...this.allProfiles];
                this.renderProfiles();
                return;
            }

            this.showLoading();

            try {
                const profiles = await this.fetchProfilesWithRetry();
                
                // キャッシュに保存
                this.setCache(cacheKey, profiles);
                
                // マッチングスコアを計算
                this.allProfiles = this.calculateMatchingScores(profiles);
                this.filteredProfiles = [...this.allProfiles];
                this.renderProfiles();

            } catch (error) {
                console.error('[MatchingSupabase] Error:', error);
                this.showError(
                    'データの読み込みに失敗しました',
                    'ネットワーク接続を確認してください',
                    error
                );
            } finally {
                this.hideLoading();
            }
        }

        /**
         * リトライ機能付きプロフィール取得
         */
        async fetchProfilesWithRetry() {
            let lastError;

            for (let i = 0; i < CONFIG.MAX_RETRIES; i++) {
                try {
                    // AbortControllerを作成
                    this.abortController = new AbortController();
                    
                    const { data: { user } } = await window.supabase.auth.getUser();
                    
                    // プロフィールデータを取得
                    let query = window.supabase
                        .from('profiles')
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (user) {
                        query = query.neq('id', user.id);
                    }

                    const { data: profiles, error } = await query;

                    if (error) throw error;

                    console.log('[MatchingSupabase] Loaded profiles:', profiles?.length);
                    return profiles || [];

                } catch (error) {
                    lastError = error;
                    console.warn(`[MatchingSupabase] Retry ${i + 1}/${CONFIG.MAX_RETRIES}:`, error);
                    
                    if (i < CONFIG.MAX_RETRIES - 1) {
                        await this.delay(CONFIG.RETRY_DELAY * (i + 1));
                    }
                }
            }

            throw lastError;
        }

        /**
         * 遅延処理
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * キャッシュから取得
         */
        getFromCache(key) {
            const cached = this.cache.get(key);
            if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
                return cached.data;
            }
            this.cache.delete(key);
            return null;
        }

        /**
         * キャッシュに保存
         */
        setCache(key, data) {
            this.cache.set(key, {
                data,
                timestamp: Date.now()
            });
        }

        /**
         * マッチングスコアを計算（改良版）
         */
        calculateMatchingScores(profiles) {
            return profiles.map(profile => {
                let score = 50; // 基本スコア

                // プロフィールの充実度でスコアを加算
                if (profile.title) score += CONFIG.MATCHING_WEIGHTS.title;
                if (profile.company) score += CONFIG.MATCHING_WEIGHTS.company;
                if (profile.bio && profile.bio.length > 50) score += CONFIG.MATCHING_WEIGHTS.bio;
                if (profile.skills && profile.skills.length > 0) {
                    score += CONFIG.MATCHING_WEIGHTS.skills * Math.min(profile.skills.length / 3, 1);
                }
                if (profile.industry) score += CONFIG.MATCHING_WEIGHTS.industry;
                if (profile.location) score += CONFIG.MATCHING_WEIGHTS.location;

                // アクティビティスコア（最終アクティブ日時）
                if (profile.last_active_at) {
                    const daysSinceActive = (Date.now() - new Date(profile.last_active_at)) / (1000 * 60 * 60 * 24);
                    if (daysSinceActive < 7) score += 5;
                    else if (daysSinceActive < 30) score += 3;
                }

                // 最大100点に調整
                profile.matchingScore = Math.min(Math.round(score), 100);
                return profile;
            });
        }

        /**
         * フィルターを適用
         */
        applyFilters() {
            const filterSelects = {
                industry: document.querySelector('.filter-group select[name="industry"]'),
                location: document.querySelector('.filter-group select[name="location"]'),
                interest: document.querySelector('.filter-group select[name="interest"]')
            };

            this.filters.industry = filterSelects.industry?.value || '';
            this.filters.location = filterSelects.location?.value || '';
            this.filters.interest = filterSelects.interest?.value || '';

            console.log('[MatchingSupabase] Applying filters:', this.filters);

            // フィルタリング
            this.filteredProfiles = this.allProfiles.filter(profile => {
                // 業界フィルター
                if (this.filters.industry && profile.industry !== this.filters.industry) {
                    return false;
                }

                // 地域フィルター
                if (this.filters.location && profile.location !== this.filters.location) {
                    return false;
                }

                // 興味・関心フィルター（スキルで代用）
                if (this.filters.interest) {
                    const interests = {
                        'collaboration': ['協業', 'パートナーシップ', 'コラボレーション'],
                        'investment': ['投資', 'ファンディング', '資金調達'],
                        'mentoring': ['メンタリング', 'コーチング', '指導'],
                        'networking': ['ネットワーキング', '人脈', '交流']
                    };
                    
                    const relatedTerms = interests[this.filters.interest] || [];
                    const hasInterest = profile.skills?.some(skill => 
                        relatedTerms.some(term => skill.toLowerCase().includes(term))
                    ) || profile.bio?.toLowerCase().includes(this.filters.interest);
                    
                    if (!hasInterest) return false;
                }

                return true;
            });

            this.currentPage = 1;
            this.renderProfiles();
        }

        /**
         * プロフィールを表示
         */
        async renderProfiles() {
            const grid = document.querySelector('.matching-grid');
            if (!grid || this.isLoading) return;

            // ソート
            const sorted = [...this.filteredProfiles];
            this.sortProfiles(sorted);
            this.filteredProfiles = sorted;

            // 結果件数を更新
            this.updateResultsCount();

            // ページネーション計算
            const totalPages = Math.ceil(this.filteredProfiles.length / CONFIG.ITEMS_PER_PAGE);
            const startIndex = (this.currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
            const endIndex = startIndex + CONFIG.ITEMS_PER_PAGE;
            const pageProfiles = this.filteredProfiles.slice(startIndex, endIndex);

            if (pageProfiles.length === 0) {
                grid.innerHTML = this.getEmptyStateHTML();
                this.updatePagination(0);
                return;
            }

            // 既にコネクト済みのユーザーを確認
            const connectedUsers = await this.checkExistingConnections(pageProfiles.map(p => p.id));

            // カードを生成
            const cardsHTML = pageProfiles.map((profile, index) => 
                this.createMatchingCard(profile, connectedUsers.includes(profile.id), index)
            ).join('');
            
            grid.innerHTML = cardsHTML;

            // ページネーションを更新
            this.updatePagination(totalPages);

            // カードのイベントリスナーを設定
            this.attachCardEventListeners();
        }

        /**
         * プロフィールをソート
         */
        sortProfiles(profiles) {
            switch (this.sortOrder) {
                case 'score':
                    profiles.sort((a, b) => b.matchingScore - a.matchingScore);
                    break;
                case 'newest':
                    profiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    break;
                case 'active':
                    profiles.sort((a, b) => {
                        const aDate = new Date(a.last_active_at || a.updated_at);
                        const bDate = new Date(b.last_active_at || b.updated_at);
                        return bDate - aDate;
                    });
                    break;
            }
        }

        /**
         * 既存のコネクションを確認
         */
        async checkExistingConnections(profileIds) {
            try {
                const { data: { user } } = await window.supabase.auth.getUser();
                if (!user) return [];

                const { data: connections } = await window.supabase
                    .from('connections')
                    .select('connected_user_id')
                    .eq('user_id', user.id)
                    .in('connected_user_id', profileIds);

                return connections?.map(c => c.connected_user_id) || [];
            } catch (error) {
                console.error('[MatchingSupabase] Error checking connections:', error);
                return [];
            }
        }

        /**
         * 結果件数を更新
         */
        updateResultsCount() {
            const resultsCount = document.querySelector('.results-count');
            if (resultsCount) {
                resultsCount.textContent = `${this.filteredProfiles.length}件のマッチング候補`;
            }
        }

        /**
         * 空の状態のHTML
         */
        getEmptyStateHTML() {
            return `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <h3>マッチング候補が見つかりません</h3>
                    <p>フィルター条件を変更してお試しください</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-redo"></i>
                        フィルターをリセット
                    </button>
                </div>
            `;
        }

        /**
         * マッチングカードを作成
         */
        createMatchingCard(profile, isConnected, index) {
            const tags = profile.skills || [];
            const tagsHTML = tags.slice(0, 3).map(tag => 
                `<span class="tag">${this.escapeHtml(tag)}</span>`
            ).join('');

            const animationDelay = index * 50;

            return `
                <div class="matching-card" data-profile-id="${profile.id}" style="animation-delay: ${animationDelay}ms">
                    <div class="matching-score">${profile.matchingScore}%</div>
                    <img src="${profile.avatar_url || CONFIG.DEFAULT_AVATAR}" 
                         alt="${this.escapeHtml(profile.name)}" 
                         class="matching-avatar"
                         onerror="this.src='${CONFIG.DEFAULT_AVATAR}'">
                    <h3>${this.escapeHtml(profile.name || 'ユーザー名未設定')}</h3>
                    <p class="matching-title">${this.escapeHtml(profile.title || '役職未設定')}</p>
                    <p class="matching-company">${this.escapeHtml(profile.company || '所属未設定')}</p>
                    <div class="matching-tags">
                        ${tagsHTML}
                    </div>
                    <div class="matching-actions">
                        <a href="profile.html?id=${profile.id}" class="btn btn-outline">プロフィール</a>
                        ${this.getConnectButtonHTML(profile.id, isConnected)}
                    </div>
                </div>
            `;
        }

        /**
         * コネクトボタンのHTML
         */
        getConnectButtonHTML(profileId, isConnected) {
            if (isConnected) {
                return `<button class="btn btn-secondary" disabled>申請済み</button>`;
            }
            return `<button class="btn btn-primary connect-btn" data-profile-id="${profileId}">コネクト</button>`;
        }

        /**
         * カードのイベントリスナーを設定
         */
        attachCardEventListeners() {
            // コネクトボタン
            const connectBtns = document.querySelectorAll('.connect-btn');
            connectBtns.forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const profileId = e.target.dataset.profileId;
                    await this.sendConnectionRequest(profileId, e.target);
                });
            });
        }

        /**
         * コネクト申請を送信
         */
        async sendConnectionRequest(profileId, button) {
            if (this.isLoading) return;

            try {
                const { data: { user } } = await window.supabase.auth.getUser();
                if (!user) {
                    alert('ログインが必要です');
                    window.location.href = 'login.html';
                    return;
                }

                // ボタンを無効化してローディング表示
                const originalText = button.textContent;
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 送信中...';

                // connections テーブルに申請を保存
                const { error } = await window.supabase
                    .from('connections')
                    .insert({
                        user_id: user.id,
                        connected_user_id: profileId,
                        status: 'pending'
                    });

                if (error) {
                    if (error.code === '23505') {
                        alert('既にコネクト申請を送信済みです');
                        button.textContent = '申請済み';
                        button.classList.remove('btn-primary');
                        button.classList.add('btn-secondary');
                    } else {
                        throw error;
                    }
                    return;
                }

                // 成功メッセージ
                this.showSuccessMessage('コネクト申請を送信しました');

                // ボタンを更新
                button.textContent = '申請済み';
                button.classList.remove('btn-primary');
                button.classList.add('btn-secondary');

            } catch (error) {
                console.error('[MatchingSupabase] Error sending connection request:', error);
                alert('エラーが発生しました。もう一度お試しください。');
                button.disabled = false;
                button.textContent = originalText;
            }
        }

        /**
         * 成功メッセージを表示
         */
        showSuccessMessage(message) {
            const toast = document.createElement('div');
            toast.className = 'success-toast';
            toast.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
            `;
            
            // スタイルを追加
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #10b981;
                color: white;
                padding: 12px 24px;
                border-radius: 6px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                display: flex;
                align-items: center;
                gap: 8px;
                z-index: 9999;
                animation: slideIn 0.3s ease-out;
            `;

            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        /**
         * ページネーションを更新
         */
        updatePagination(totalPages) {
            const pagination = document.querySelector('.pagination');
            if (!pagination) return;

            const prevBtn = pagination.querySelector('.btn-outline:first-child');
            const nextBtn = pagination.querySelector('.btn-outline:last-child');
            const pageNumbers = pagination.querySelector('.page-numbers');

            // 前へ/次へボタンの状態
            if (prevBtn) {
                prevBtn.disabled = this.currentPage === 1 || this.isLoading;
            }
            if (nextBtn) {
                nextBtn.disabled = this.currentPage === totalPages || totalPages === 0 || this.isLoading;
            }

            // ページ番号
            if (pageNumbers && totalPages > 0) {
                const pages = this.generatePageNumbers(totalPages);
                pageNumbers.innerHTML = pages.map(page => {
                    if (page === '...') {
                        return '<span class="page-ellipsis">...</span>';
                    }
                    return `<button class="page-number ${page === this.currentPage ? 'active' : ''}">${page}</button>`;
                }).join('');
            }
        }

        /**
         * ページ番号を生成
         */
        generatePageNumbers(totalPages) {
            const pages = [];
            const maxVisible = CONFIG.MAX_VISIBLE_PAGES;

            if (totalPages <= maxVisible) {
                for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                if (this.currentPage <= 3) {
                    for (let i = 1; i <= 4; i++) {
                        pages.push(i);
                    }
                    pages.push('...');
                    pages.push(totalPages);
                } else if (this.currentPage >= totalPages - 2) {
                    pages.push(1);
                    pages.push('...');
                    for (let i = totalPages - 3; i <= totalPages; i++) {
                        pages.push(i);
                    }
                } else {
                    pages.push(1);
                    pages.push('...');
                    for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
                        pages.push(i);
                    }
                    pages.push('...');
                    pages.push(totalPages);
                }
            }

            return pages;
        }

        /**
         * HTMLエスケープ（強化版）
         */
        escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;',
                '/': '&#x2F;'
            };
            
            return String(text || '').replace(/[&<>"'/]/g, char => map[char]);
        }

        /**
         * ローディング表示
         */
        showLoading() {
            this.isLoading = true;
            const grid = document.querySelector('.matching-grid');
            if (!grid) return;

            grid.classList.add('loading');
            
            // スケルトンローダーを表示
            const skeletonHTML = Array(CONFIG.ITEMS_PER_PAGE).fill(0).map(() => `
                <div class="skeleton-card">
                    <div class="skeleton skeleton-avatar"></div>
                    <div class="skeleton skeleton-text title"></div>
                    <div class="skeleton skeleton-text subtitle"></div>
                    <div class="skeleton skeleton-text"></div>
                </div>
            `).join('');

            grid.innerHTML = `
                <div class="loading-overlay">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <div class="loading-text">データを読み込んでいます...</div>
                    </div>
                </div>
                ${skeletonHTML}
            `;
        }

        /**
         * ローディング非表示
         */
        hideLoading() {
            this.isLoading = false;
            const grid = document.querySelector('.matching-grid');
            if (grid) {
                grid.classList.remove('loading');
            }
        }

        /**
         * エラー表示（詳細版）
         */
        showError(title, message, error = null) {
            const grid = document.querySelector('.matching-grid');
            if (!grid) return;

            const errorDetails = error ? `
                <div class="error-details">
                    <strong>エラー詳細:</strong><br>
                    ${this.escapeHtml(error.message || error.toString())}
                </div>
            ` : '';

            grid.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>${this.escapeHtml(title)}</h3>
                    <p>${this.escapeHtml(message)}</p>
                    ${errorDetails}
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-redo"></i>
                        再読み込み
                    </button>
                </div>
            `;
        }
    }

    // 既存のインスタンスを削除
    if (window.matchingSupabase) {
        delete window.matchingSupabase;
    }

    // グローバルに公開
    window.MatchingSupabaseImproved = MatchingSupabaseImproved;
    window.matchingSupabase = new MatchingSupabaseImproved();

    console.log('[MatchingSupabase] Improved module loaded');

})();