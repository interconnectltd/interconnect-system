/**
 * Matching Supabase Integration
 * マッチング機能のSupabase連携
 */

(function() {
    'use strict';

    class MatchingSupabase {
        constructor() {
            this.filters = {
                industry: '',
                location: '',
                interest: ''
            };
            this.sortOrder = 'score';
            this.currentPage = 1;
            this.itemsPerPage = 6;
            this.allProfiles = [];
            this.filteredProfiles = [];
            this.init();
        }

        init() {
            if (!window.supabase) {
                console.error('[MatchingSupabase] Supabase client not found');
                return;
            }

            this.setupEventListeners();
            this.loadProfiles();
        }

        setupEventListeners() {
            // フィルターのイベントリスナー
            const industrySelect = document.querySelector('.filter-group select[name="industry"]');
            const locationSelect = document.querySelector('.filter-group select[name="location"]');
            const interestSelect = document.querySelector('.filter-group select[name="interest"]');

            // name属性を追加
            if (industrySelect && !industrySelect.name) {
                industrySelect.name = 'industry';
            }
            if (locationSelect && !locationSelect.name) {
                locationSelect.name = 'location';
            }
            if (interestSelect && !interestSelect.name) {
                interestSelect.name = 'interest';
            }

            // 検索ボタン
            const searchBtn = document.querySelector('.matching-filters .btn-primary');
            if (searchBtn) {
                searchBtn.addEventListener('click', () => this.applyFilters());
            }

            // フィルター変更時の自動検索
            [industrySelect, locationSelect, interestSelect].forEach(select => {
                if (select) {
                    select.addEventListener('change', () => this.applyFilters());
                }
            });

            // ソート順の変更
            const sortSelect = document.querySelector('.sort-options select');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    this.sortOrder = e.target.value;
                    this.sortAndRenderProfiles();
                });
            }

            // ページネーション
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('page-number')) {
                    this.currentPage = parseInt(e.target.textContent);
                    this.renderProfiles();
                } else if (e.target.closest('.pagination .btn-outline')) {
                    const isPrev = e.target.textContent.includes('前へ');
                    if (isPrev && this.currentPage > 1) {
                        this.currentPage--;
                        this.renderProfiles();
                    } else if (!isPrev) {
                        const totalPages = Math.ceil(this.filteredProfiles.length / this.itemsPerPage);
                        if (this.currentPage < totalPages) {
                            this.currentPage++;
                            this.renderProfiles();
                        }
                    }
                }
            });
        }

        /**
         * プロフィールデータを読み込み
         */
        async loadProfiles() {
            try {
                console.log('[MatchingSupabase] Loading profiles...');
                
                // 現在のユーザーを取得
                const { data: { user } } = await window.supabase.auth.getUser();
                
                // プロフィールデータを取得（自分以外）
                let query = window.supabase
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (user) {
                    query = query.neq('id', user.id);
                }

                const { data: profiles, error } = await query;

                if (error) {
                    console.error('[MatchingSupabase] Error loading profiles:', error);
                    this.showError('プロフィールの読み込みに失敗しました');
                    return;
                }

                console.log('[MatchingSupabase] Loaded profiles:', profiles?.length);
                
                // マッチングスコアを計算
                this.allProfiles = this.calculateMatchingScores(profiles || []);
                this.filteredProfiles = [...this.allProfiles];
                this.sortAndRenderProfiles();

            } catch (error) {
                console.error('[MatchingSupabase] Error:', error);
                this.showError('エラーが発生しました');
            }
        }

        /**
         * マッチングスコアを計算
         */
        calculateMatchingScores(profiles) {
            return profiles.map(profile => {
                // 簡易的なスコア計算（実際はより複雑なアルゴリズムを使用）
                let score = 50; // 基本スコア

                // プロフィールの充実度でスコアを加算
                if (profile.title) score += 10;
                if (profile.company) score += 10;
                if (profile.bio && profile.bio.length > 50) score += 10;
                if (profile.skills && profile.skills.length > 0) score += 10;
                if (profile.industry) score += 5;
                if (profile.location) score += 5;

                // ランダム要素を追加（デモ用）
                score += Math.floor(Math.random() * 10);

                // 最大100点に調整
                profile.matchingScore = Math.min(score, 100);
                return profile;
            });
        }

        /**
         * フィルターを適用
         */
        applyFilters() {
            const industrySelect = document.querySelector('.filter-group select[name="industry"]');
            const locationSelect = document.querySelector('.filter-group select[name="location"]');
            const interestSelect = document.querySelector('.filter-group select[name="interest"]');

            this.filters.industry = industrySelect?.value || '';
            this.filters.location = locationSelect?.value || '';
            this.filters.interest = interestSelect?.value || '';

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
            this.sortAndRenderProfiles();
        }

        /**
         * ソートして表示
         */
        sortAndRenderProfiles() {
            // ソート
            const sorted = [...this.filteredProfiles];
            
            switch (this.sortOrder) {
                case 'score':
                    sorted.sort((a, b) => b.matchingScore - a.matchingScore);
                    break;
                case 'newest':
                    sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    break;
                case 'active':
                    // アクティビティ順（最終ログイン時刻で代用）
                    sorted.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                    break;
            }

            this.filteredProfiles = sorted;
            this.renderProfiles();
        }

        /**
         * プロフィールを表示
         */
        renderProfiles() {
            const grid = document.querySelector('.matching-grid');
            if (!grid) return;

            // 結果件数を更新
            const resultsCount = document.querySelector('.results-count');
            if (resultsCount) {
                resultsCount.textContent = `${this.filteredProfiles.length}件のマッチング候補`;
            }

            // ページネーション計算
            const totalPages = Math.ceil(this.filteredProfiles.length / this.itemsPerPage);
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const pageProfiles = this.filteredProfiles.slice(startIndex, endIndex);

            if (pageProfiles.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users-slash"></i>
                        <h3>マッチング候補が見つかりません</h3>
                        <p>フィルター条件を変更してお試しください</p>
                    </div>
                `;
                this.updatePagination(0);
                return;
            }

            // カードを生成
            const cardsHTML = pageProfiles.map(profile => this.createMatchingCard(profile)).join('');
            grid.innerHTML = cardsHTML;

            // ページネーションを更新
            this.updatePagination(totalPages);

            // カードのイベントリスナーを設定
            this.attachCardEventListeners();
        }

        /**
         * マッチングカードを作成
         */
        createMatchingCard(profile) {
            const tags = profile.skills || [];
            const tagsHTML = tags.slice(0, 3).map(tag => 
                `<span class="tag">${this.escapeHtml(tag)}</span>`
            ).join('');

            return `
                <div class="matching-card" data-profile-id="${profile.id}">
                    <div class="matching-score">${profile.matchingScore}%</div>
                    <img src="${profile.avatar_url || 'assets/user-placeholder.svg'}" 
                         alt="${this.escapeHtml(profile.name)}" 
                         class="matching-avatar"
                         onerror="this.src='assets/user-placeholder.svg'">
                    <h3>${this.escapeHtml(profile.name || 'ユーザー名未設定')}</h3>
                    <p class="matching-title">${this.escapeHtml(profile.title || '役職未設定')}</p>
                    <p class="matching-company">${this.escapeHtml(profile.company || '所属未設定')}</p>
                    <div class="matching-tags">
                        ${tagsHTML}
                    </div>
                    <div class="matching-actions">
                        <a href="profile.html?id=${profile.id}" class="btn btn-outline">プロフィール</a>
                        <button class="btn btn-primary connect-btn" data-profile-id="${profile.id}">コネクト</button>
                    </div>
                </div>
            `;
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
                    await this.sendConnectionRequest(profileId);
                });
            });
        }

        /**
         * コネクト申請を送信
         */
        async sendConnectionRequest(profileId) {
            try {
                const { data: { user } } = await window.supabase.auth.getUser();
                if (!user) {
                    alert('ログインが必要です');
                    window.location.href = 'login.html';
                    return;
                }

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
                    } else {
                        throw error;
                    }
                    return;
                }

                alert('コネクト申請を送信しました');

                // ボタンを無効化
                const btn = document.querySelector(`button[data-profile-id="${profileId}"]`);
                if (btn) {
                    btn.textContent = '申請済み';
                    btn.disabled = true;
                    btn.classList.remove('btn-primary');
                    btn.classList.add('btn-secondary');
                }

            } catch (error) {
                console.error('[MatchingSupabase] Error sending connection request:', error);
                alert('エラーが発生しました');
            }
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
                prevBtn.disabled = this.currentPage === 1;
            }
            if (nextBtn) {
                nextBtn.disabled = this.currentPage === totalPages || totalPages === 0;
            }

            // ページ番号
            if (pageNumbers && totalPages > 0) {
                const pages = [];
                const maxVisible = 5;
                let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
                let end = Math.min(totalPages, start + maxVisible - 1);

                if (end - start + 1 < maxVisible) {
                    start = Math.max(1, end - maxVisible + 1);
                }

                for (let i = start; i <= end; i++) {
                    pages.push(`
                        <button class="page-number ${i === this.currentPage ? 'active' : ''}">${i}</button>
                    `);
                }

                pageNumbers.innerHTML = pages.join('');
            }
        }

        /**
         * HTMLエスケープ
         */
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }

        /**
         * エラー表示
         */
        showError(message) {
            const grid = document.querySelector('.matching-grid');
            if (grid) {
                grid.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>エラーが発生しました</h3>
                        <p>${message}</p>
                        <button class="btn btn-primary" onclick="location.reload()">
                            再読み込み
                        </button>
                    </div>
                `;
            }
        }
    }

    // スタイルを追加
    const style = document.createElement('style');
    style.textContent = `
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

        .matching-card .btn:disabled {
            cursor: not-allowed;
            opacity: 0.6;
        }
    `;
    document.head.appendChild(style);

    // グローバルに公開
    window.MatchingSupabase = MatchingSupabase;
    window.matchingSupabase = new MatchingSupabase();

    console.log('[MatchingSupabase] Module loaded');

})();