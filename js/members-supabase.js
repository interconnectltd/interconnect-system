/**
 * Members Supabase Integration
 * メンバーページのSupabase連携
 */

(function() {
    'use strict';

    console.log('[MembersSupabase] 初期化開始...');

    class MembersSupabaseManager {
        constructor() {
            this.members = [];
            this.currentPage = 1;
            this.itemsPerPage = 12;
            this.totalMembers = 0;
            this.filters = {
                search: '',
                industry: '',
                role: '',
                skills: []
            };
            this.init();
        }

        async init() {
            try {
                // Supabase接続確認
                if (!window.supabase) {
                    console.error('[MembersSupabase] Supabaseクライアントが見つかりません');
                    this.showFallbackUI();
                    return;
                }

                // 認証状態を確認
                const { data: { user } } = await window.supabase.auth.getUser();
                if (!user) {
                    console.log('[MembersSupabase] ユーザー未認証');
                    this.showFallbackUI();
                    return;
                }

                this.currentUserId = user.id;
                await this.loadMembers();
                this.setupRealtimeSubscription();
                
            } catch (error) {
                console.error('[MembersSupabase] 初期化エラー:', error);
                this.showFallbackUI();
            }
        }

        /**
         * メンバーデータを読み込む
         */
        async loadMembers() {
            try {
                console.log('[MembersSupabase] メンバーデータ読み込み中...');
                
                // ベースクエリ
                let query = window.supabase
                    .from('profiles')
                    .select('*', { count: 'exact' })
                    .neq('id', this.currentUserId); // 自分以外のメンバー

                // 検索フィルター
                if (this.filters.search) {
                    query = query.or(`full_name.ilike.%${this.filters.search}%,company.ilike.%${this.filters.search}%,bio.ilike.%${this.filters.search}%`);
                }

                // 業界フィルター
                if (this.filters.industry) {
                    query = query.eq('industry', this.filters.industry);
                }

                // 役職フィルター
                if (this.filters.role) {
                    query = query.eq('role', this.filters.role);
                }

                // スキルフィルター
                if (this.filters.skills.length > 0) {
                    query = query.contains('skills', this.filters.skills);
                }

                // ページネーション
                const from = (this.currentPage - 1) * this.itemsPerPage;
                const to = from + this.itemsPerPage - 1;
                query = query.range(from, to);

                // データ取得
                const { data, error, count } = await query;

                if (error) throw error;

                this.members = data || [];
                this.totalMembers = count || 0;

                // コネクション数を取得
                await this.loadConnectionCounts();

                // UIを更新
                this.updateMembersUI();
                this.updatePaginationUI();
                this.updateResultsCount();

            } catch (error) {
                console.error('[MembersSupabase] データ読み込みエラー:', error);
                this.showFallbackUI();
            }
        }

        /**
         * コネクション数を取得
         */
        async loadConnectionCounts() {
            try {
                const memberIds = this.members.map(m => m.id);
                
                // 各メンバーのコネクション数を取得
                const { data: connections, error } = await window.supabase
                    .from('connections')
                    .select('user_id, connected_id')
                    .or(`user_id.in.(${memberIds.join(',')}),connected_id.in.(${memberIds.join(',')})`)
                    .eq('status', 'accepted');

                if (error) throw error;

                // コネクション数を集計
                const connectionCounts = {};
                memberIds.forEach(id => connectionCounts[id] = 0);

                connections?.forEach(conn => {
                    if (connectionCounts[conn.user_id] !== undefined) {
                        connectionCounts[conn.user_id]++;
                    }
                    if (connectionCounts[conn.connected_id] !== undefined) {
                        connectionCounts[conn.connected_id]++;
                    }
                });

                // メンバーデータに追加
                this.members = this.members.map(member => ({
                    ...member,
                    connectionCount: connectionCounts[member.id] || 0
                }));

            } catch (error) {
                console.error('[MembersSupabase] コネクション数取得エラー:', error);
            }
        }

        /**
         * メンバーUIを更新
         */
        updateMembersUI() {
            const grid = document.querySelector('.members-grid');
            if (!grid) return;

            if (this.members.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                        <i class="fas fa-users" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                        <h3>メンバーが見つかりません</h3>
                        <p>検索条件を変更してお試しください</p>
                    </div>
                `;
                return;
            }

            grid.innerHTML = this.members.map(member => this.createMemberCard(member)).join('');
        }

        /**
         * メンバーカードを作成
         */
        createMemberCard(member) {
            const { 
                id, 
                full_name = '名前未設定', 
                avatar_url = 'assets/user-placeholder.svg',
                title = '役職未設定',
                company = '会社未設定',
                industry = '',
                skills = [],
                connectionCount = 0,
                is_online = false
            } = member;

            // スキルタグを最大3つまで表示
            const displaySkills = skills.slice(0, 3);
            const hasMoreSkills = skills.length > 3;

            return `
                <div class="member-card" data-member-id="${id}">
                    <div class="member-header">
                        <div style="position: relative;">
                            <img src="${this.escapeHtml(avatar_url)}" 
                                 alt="${this.escapeHtml(full_name)}" 
                                 class="member-avatar"
                                 onerror="this.src='assets/user-placeholder.svg'">
                            ${is_online ? '<span class="online-indicator"></span>' : ''}
                        </div>
                        <div class="member-info">
                            <h3>${this.escapeHtml(full_name)}</h3>
                            <p class="member-title">${this.escapeHtml(title)}</p>
                            <p class="member-company">${this.escapeHtml(company)}</p>
                        </div>
                    </div>
                    ${displaySkills.length > 0 ? `
                        <div class="member-tags">
                            ${displaySkills.map(skill => `
                                <span class="tag">${this.escapeHtml(skill)}</span>
                            `).join('')}
                            ${hasMoreSkills ? `<span class="tag">+${skills.length - 3}</span>` : ''}
                        </div>
                    ` : ''}
                    <div class="member-stats">
                        <div class="stat">
                            <i class="fas fa-users"></i>
                            <span>${connectionCount} コネクション</span>
                        </div>
                    </div>
                    <div class="member-actions">
                        <a href="profile.html?user=${id}" class="btn btn-primary btn-small">
                            <i class="fas fa-user"></i>
                            <span class="btn-text">プロフィール</span>
                        </a>
                        <button class="btn btn-outline btn-small connect-btn" 
                                data-member-id="${id}"
                                data-member-name="${this.escapeHtml(full_name)}">
                            <i class="fas fa-plus"></i>
                            <span class="btn-text">コネクト</span>
                        </button>
                    </div>
                </div>
            `;
        }

        /**
         * ページネーションUIを更新
         */
        updatePaginationUI() {
            const pagination = document.querySelector('.pagination');
            if (!pagination) return;

            const totalPages = Math.ceil(this.totalMembers / this.itemsPerPage);
            
            // 前へボタン
            const prevButton = pagination.querySelector('button:first-child');
            if (prevButton) {
                prevButton.disabled = this.currentPage === 1;
                prevButton.onclick = () => this.changePage(this.currentPage - 1);
            }

            // 次へボタン
            const nextButton = pagination.querySelector('button:last-child');
            if (nextButton) {
                nextButton.disabled = this.currentPage === totalPages || totalPages === 0;
                nextButton.onclick = () => this.changePage(this.currentPage + 1);
            }

            // ページ番号
            const pageNumbers = pagination.querySelector('.page-numbers');
            if (pageNumbers) {
                pageNumbers.innerHTML = this.generatePageNumbers(totalPages);
            }
        }

        /**
         * ページ番号を生成
         */
        generatePageNumbers(totalPages) {
            if (totalPages === 0) return '';

            let html = '';
            const maxVisible = 5;
            let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
            let end = Math.min(totalPages, start + maxVisible - 1);

            if (end - start + 1 < maxVisible) {
                start = Math.max(1, end - maxVisible + 1);
            }

            for (let i = start; i <= end; i++) {
                html += `
                    <button class="page-number ${i === this.currentPage ? 'active' : ''}"
                            onclick="window.membersSupabase.changePage(${i})">
                        ${i}
                    </button>
                `;
            }

            return html;
        }

        /**
         * 結果数を更新
         */
        updateResultsCount() {
            const countElement = document.querySelector('.results-count');
            if (countElement) {
                countElement.innerHTML = `<span>${this.totalMembers}</span>名のメンバー`;
            }
        }

        /**
         * ページを変更
         */
        async changePage(page) {
            if (page < 1 || page === this.currentPage) return;
            
            this.currentPage = page;
            await this.loadMembers();
            
            // ページトップへスクロール
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        /**
         * リアルタイム購読を設定
         */
        setupRealtimeSubscription() {
            // プロフィール更新を監視
            this.profilesSubscription = window.supabase
                .channel('public:profiles')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'profiles' },
                    (payload) => this.handleProfileChange(payload)
                )
                .subscribe();
        }

        /**
         * プロフィール変更を処理
         */
        handleProfileChange(payload) {
            console.log('[MembersSupabase] プロフィール変更:', payload);
            
            // 現在表示中のメンバーに変更があった場合は再読み込み
            const affectedMember = this.members.find(m => m.id === payload.new?.id || m.id === payload.old?.id);
            if (affectedMember) {
                this.loadMembers();
            }
        }

        /**
         * フォールバックUIを表示
         */
        showFallbackUI() {
            console.log('[MembersSupabase] フォールバックUI表示');
            // 既存のダミーデータをそのまま表示
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
         * クリーンアップ
         */
        cleanup() {
            if (this.profilesSubscription) {
                window.supabase.removeChannel(this.profilesSubscription);
            }
        }
    }

    // オンラインインジケーターのスタイル
    const style = document.createElement('style');
    style.textContent = `
        .online-indicator {
            position: absolute;
            bottom: 5px;
            right: 5px;
            width: 16px;
            height: 16px;
            background-color: #4caf50;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .member-card[data-member-id] {
            transition: all 0.3s ease;
        }

        .empty-state {
            padding: 3rem;
            text-align: center;
            color: var(--text-secondary);
        }

        .empty-state i {
            font-size: 3rem;
            margin-bottom: 1rem;
            opacity: 0.5;
        }

        .empty-state h3 {
            font-size: 1.25rem;
            margin-bottom: 0.5rem;
            color: var(--text-primary);
        }
    `;
    document.head.appendChild(style);

    // グローバルインスタンス
    window.membersSupabase = new MembersSupabaseManager();

    // ページ離脱時のクリーンアップ
    window.addEventListener('beforeunload', () => {
        if (window.membersSupabase) {
            window.membersSupabase.cleanup();
        }
    });

    console.log('[MembersSupabase] 初期化完了');
})();