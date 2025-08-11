/**
 * Members Supabase Integration
 * メンバーページのSupabase連携
 */

(function() {
    'use strict';

    // console.log('[MembersSupabase] 初期化開始...');

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
            this.initialized = false;
        }

        async init() {
            if (this.initialized) return;
            
            try {
                // Supabase接続確認
                if (!window.supabaseClient) {
                    console.error('[MembersSupabase] Supabaseクライアントが見つかりません');
                    this.showFallbackUI();
                    return;
                }

                // console.log('[MembersSupabase] Supabase接続確認OK');

                // 認証状態を確認
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                if (!user) {
                    // console.log('[MembersSupabase] ユーザー未認証');
                    this.showFallbackUI();
                    return;
                }

                // console.log('[MembersSupabase] 認証済みユーザー:', user.id);
                this.currentUserId = user.id;
                this.initialized = true;
                
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
                // console.log('[MembersSupabase] メンバーデータ読み込み中...');
                
                // ベースクエリ（user_profilesテーブルを使用 - active_usersはビュー）
                let query = window.supabaseClient
                    .from('user_profiles')
                    .select('*', { count: 'exact' })
                    .eq('is_active', true)
                    .neq('id', this.currentUserId); // 自分以外のメンバー

                // 検索フィルター（nameも検索対象に追加）
                if (this.filters.search) {
                    query = query.or(`name.ilike.%${this.filters.search}%,full_name.ilike.%${this.filters.search}%,company.ilike.%${this.filters.search}%,bio.ilike.%${this.filters.search}%`);
                }

                // 業界フィルター
                if (this.filters.industry) {
                    query = query.eq('industry', this.filters.industry);
                }

                // 役職フィルター（positionを使用）
                if (this.filters.role) {
                    // roleマッピング: executive->経営者・役員, manager->管理職など
                    const roleMap = {
                        'executive': ['CEO', 'CTO', 'CFO', '代表', '役員', '社長'],
                        'manager': ['部長', 'マネージャー', '課長', 'リーダー'],
                        'specialist': ['エンジニア', 'デザイナー', 'コンサルタント', '専門'],
                        'general': ['一般', 'スタッフ', 'メンバー']
                    };
                    
                    if (roleMap[this.filters.role]) {
                        const positions = roleMap[this.filters.role];
                        query = query.or(positions.map(pos => `position.ilike.%${pos}%`).join(','));
                    }
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

                // console.log('[MembersSupabase] データ取得成功:', data?.length || 0, '件');
                
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
                
                if (memberIds.length === 0) return;
                
                // 各メンバーのコネクション数を取得
                const { data: connections, error } = await window.supabaseClient
                    .from('connections')
                    .select('user_id, connected_user_id')
                    .or(`user_id.in.(${memberIds.join(',')}),connected_user_id.in.(${memberIds.join(',')})`)
                    .eq('status', 'accepted');

                if (error) throw error;

                // コネクション数を集計
                const connectionCounts = {};
                memberIds.forEach(id => connectionCounts[id] = 0);

                connections?.forEach(conn => {
                    if (connectionCounts[conn.user_id] !== undefined) {
                        connectionCounts[conn.user_id]++;
                    }
                    if (connectionCounts[conn.connected_user_id] !== undefined) {
                        connectionCounts[conn.connected_user_id]++;
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

            // ローディングプレースホルダーを削除
            const loadingPlaceholder = grid.querySelector('.loading-placeholder');
            if (loadingPlaceholder) {
                loadingPlaceholder.remove();
            }

            if (this.members.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
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
                name = '',
                full_name = '', 
                avatar_url = 'assets/user-placeholder.svg',
                position = '役職未設定',
                title = '',
                company = '会社未設定',
                industry = '',
                skills = [],
                connection_count = 0,
                is_online = false
            } = member;
            
            // 表示名とタイトルの決定
            const displayName = full_name || name || 'ユーザー';
            const displayTitle = title || position;

            // スキルタグを最大3つまで表示
            const displaySkills = skills.slice(0, 3);
            const hasMoreSkills = skills.length > 3;

            return `
                <div class="member-card" data-member-id="${id}" data-user-id="${id}">
                    <div class="member-header">
                        <div style="position: relative;">
                            <img src="${this.escapeHtml(avatar_url)}" 
                                 alt="${this.escapeHtml(displayName)}" 
                                 class="member-avatar"
                                 onerror="this.src='assets/user-placeholder.svg'">
                            ${is_online ? '<span class="online-indicator"></span>' : ''}
                        </div>
                        <div class="member-info">
                            <h3>${this.escapeHtml(displayName)}</h3>
                            <p class="member-title">${this.escapeHtml(displayTitle)}</p>
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
                            <span>${member.connectionCount || 0} コネクション</span>
                        </div>
                    </div>
                    <div class="member-actions">
                        <button class="btn btn-primary btn-small view-profile-btn" 
                                data-member-id="${id}"
                                type="button"
                                onclick="event.preventDefault(); event.stopPropagation(); if(window.membersProfileModal && window.membersProfileModal.show) { window.membersProfileModal.show('${id}'); } else { console.error('[members-supabase] Modal not ready, retrying...'); setTimeout(function() { if(window.membersProfileModal && window.membersProfileModal.show) { window.membersProfileModal.show('${id}'); } else { alert('プロフィールを読み込み中です。もう一度お試しください。'); } }, 500); } return false;">
                            <i class="fas fa-user"></i>
                            <span class="btn-text">プロフィール</span>
                        </button>
                        <button class="btn btn-outline btn-small connect-btn" 
                                data-member-id="${id}"
                                data-member-name="${this.escapeHtml(displayName)}">
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
            this.profilesSubscription = window.supabaseClient
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
            // console.log('[MembersSupabase] プロフィール変更:', payload);
            
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
            // console.log('[MembersSupabase] フォールバックUI表示');
            
            const grid = document.querySelector('.members-grid');
            if (!grid) return;
            
            // フォールバック用ダミーデータ
            const fallbackMembers = [
                {
                    id: 'fallback-1',
                    full_name: '山田 太郎',
                    avatar_url: 'assets/user-placeholder.svg',
                    title: '代表取締役CEO',
                    company: '株式会社テックイノベーション',
                    skills: ['IT', 'AI', 'DX推進'],
                    connectionCount: 156,
                    is_online: true
                },
                {
                    id: 'fallback-2',
                    full_name: '佐藤 花子',
                    avatar_url: 'assets/user-placeholder.svg',
                    title: 'マーケティング部長',
                    company: 'グローバルコマース株式会社',
                    skills: ['マーケティング', 'EC', 'グローバル'],
                    connectionCount: 234,
                    is_online: false
                },
                {
                    id: 'fallback-3',
                    full_name: '高橋 健一',
                    avatar_url: 'assets/user-placeholder.svg',
                    title: 'CTO',
                    company: 'デジタルソリューションズ',
                    skills: ['開発', 'クラウド', 'DevOps'],
                    connectionCount: 198,
                    is_online: true
                }
            ];
            
            this.members = fallbackMembers;
            this.totalMembers = fallbackMembers.length;
            
            // UIを更新
            this.updateMembersUI();
            this.updateResultsCount();
            
            // エラー表示を追加
            const errorBanner = document.createElement('div');
            errorBanner.className = 'error-banner';
            errorBanner.innerHTML = `
                <div class="error-content">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>データベースに接続できません。サンプルデータを表示しています。</span>
                    <button class="btn btn-small btn-primary" onclick="window.location.reload()">
                        再読み込み
                    </button>
                </div>
            `;
            
            const container = document.querySelector('.content-container');
            if (container && !container.querySelector('.error-banner')) {
                container.insertBefore(errorBanner, container.firstChild);
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
         * クリーンアップ
         */
        cleanup() {
            if (this.profilesSubscription) {
                window.supabaseClient.removeChannel(this.profilesSubscription);
            }
        }
    }

    // スタイルを追加
    const style = document.createElement('style');
    style.textContent = `
        /* オンラインインジケーター */
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

        /* 空の状態 */
        .empty-state {
            padding: 3rem;
            text-align: center;
            color: var(--text-secondary);
            grid-column: 1/-1;
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

        /* ローディング状態 */
        .loading-placeholder {
            grid-column: 1/-1;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 200px;
        }

        .loading-spinner {
            text-align: center;
            color: var(--text-secondary);
        }

        .loading-spinner i {
            font-size: 2rem;
            margin-bottom: 1rem;
            color: var(--primary-color);
        }

        .loading-spinner p {
            font-size: 1rem;
            margin: 0;
        }

        /* エラーバナー */
        .error-banner {
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
            border: 1px solid #f87171;
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin-bottom: var(--space-xl);
            box-shadow: 0 2px 8px rgba(248, 113, 113, 0.1);
        }

        .error-content {
            display: flex;
            align-items: center;
            gap: var(--space-md);
            flex-wrap: wrap;
        }

        .error-content i {
            color: #dc2626;
            font-size: 1.25rem;
            flex-shrink: 0;
        }

        .error-content span {
            flex: 1;
            color: #7f1d1d;
            font-weight: 500;
            min-width: 200px;
        }

        .error-content .btn {
            flex-shrink: 0;
        }

        /* モバイル対応 */
        @media (max-width: 768px) {
            .error-content {
                flex-direction: column;
                text-align: center;
            }

            .error-content span {
                min-width: auto;
            }
        }
    `;
    document.head.appendChild(style);

    // Supabaseの準備ができるまで待つ
    function initializeWhenReady() {
        if (window.supabaseClient) {
            // console.log('[MembersSupabase] Supabase準備完了、マネージャー作成');
            window.membersSupabase = new MembersSupabaseManager();
            window.membersSupabase.init();
        } else {
            // console.log('[MembersSupabase] Supabaseの準備待ち...');
            setTimeout(initializeWhenReady, 100);
        }
    }

    // supabaseReadyイベントを待つ
    if (window.supabaseClient) {
        initializeWhenReady();
    } else {
        window.addEventListener('supabaseReady', () => {
            // console.log('[MembersSupabase] supabaseReadyイベント受信');
            initializeWhenReady();
        });
        // フォールバックとして500ms後に再チェック
        setTimeout(initializeWhenReady, 500);
    }

    // ページ離脱時のクリーンアップ
    window.addEventListener('beforeunload', () => {
        if (window.membersSupabase) {
            window.membersSupabase.cleanup();
        }
    });

    // console.log('[MembersSupabase] セットアップ完了');
})();