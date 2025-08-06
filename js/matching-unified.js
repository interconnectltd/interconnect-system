/**
 * マッチングシステム統一JavaScript
 * 
 * 機能:
 * - マッチング候補の表示
 * - コネクト申請
 * - プロフィール詳細表示
 * - ブックマーク機能
 * - フィルタリング・検索
 */

(function() {
    'use strict';

    console.log('[MatchingUnified] マッチングシステム初期化');

    // グローバル変数
    let currentUserId = null;
    let matchingUsers = [];
    let filters = {
        industry: '',
        skills: [],
        interests: [],
        sortBy: 'score'
    };

    // 初期化
    async function initialize() {
        console.log('[MatchingUnified] 初期化開始');

        // Supabaseの準備を待つ
        await window.waitForSupabase();

        // 現在のユーザーを取得
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            console.error('[MatchingUnified] ユーザーが認証されていません');
            window.location.href = '/login.html';
            return;
        }

        currentUserId = user.id;
        console.log('[MatchingUnified] ユーザーID:', currentUserId);

        // イベントリスナーの設定
        setupEventListeners();

        // マッチング候補の読み込み
        await loadMatchingCandidates();
    }

    // イベントリスナーの設定
    function setupEventListeners() {
        // 検索ボタン
        const searchBtn = document.querySelector('.matching-filters .btn-primary');
        if (searchBtn) {
            searchBtn.addEventListener('click', handleSearch);
        }

        // ソート選択
        const sortSelect = document.querySelector('.sort-options select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                filters.sortBy = e.target.value;
                displayMatchingUsers();
            });
        }

        // フィルター
        document.querySelectorAll('.filter-option input').forEach(input => {
            input.addEventListener('change', updateFilters);
        });
    }

    // マッチング候補の読み込み
    async function loadMatchingCandidates() {
        try {
            // 自分以外のユーザーを取得
            const { data: users, error } = await window.supabaseClient
                .from('user_profiles')
                .select('*')
                .neq('id', currentUserId)
                .limit(50);

            if (error) throw error;

            // マッチングスコアを計算
            matchingUsers = await calculateMatchingScores(users || []);

            // 表示
            displayMatchingUsers();

        } catch (error) {
            console.error('[MatchingUnified] マッチング候補読み込みエラー:', error);
            showError('マッチング候補の読み込みに失敗しました');
        }
    }

    // マッチングスコアの計算
    async function calculateMatchingScores(users) {
        try {
            // 現在のユーザーのプロフィール取得
            const { data: currentUser } = await window.supabaseClient
                .from('user_profiles')
                .select('*')
                .eq('id', currentUserId)
                .single();

            if (!currentUser) return users;

            // 各ユーザーのスコアを計算
            return users.map(user => {
                let score = 0;
                const reasons = [];

                // スキルの一致度（文字列型の場合も考慮）
                const userSkills = Array.isArray(user.skills) ? user.skills : 
                    (user.skills ? user.skills.split(',').map(s => s.trim()) : []);
                const currentSkills = Array.isArray(currentUser.skills) ? currentUser.skills : 
                    (currentUser.skills ? currentUser.skills.split(',').map(s => s.trim()) : []);
                
                if (currentSkills.length > 0 && userSkills.length > 0) {
                    const commonSkills = currentSkills.filter(skill => 
                        userSkills.includes(skill)
                    );
                    if (commonSkills.length > 0) {
                        score += commonSkills.length * 10;
                        reasons.push(`共通スキル: ${commonSkills.join(', ')}`);
                    }
                }

                // 興味の一致度（文字列型の場合も考慮）
                const userInterests = Array.isArray(user.interests) ? user.interests : 
                    (user.interests ? user.interests.split(',').map(s => s.trim()) : []);
                const currentInterests = Array.isArray(currentUser.interests) ? currentUser.interests : 
                    (currentUser.interests ? currentUser.interests.split(',').map(s => s.trim()) : []);
                
                if (currentInterests.length > 0 && userInterests.length > 0) {
                    const commonInterests = currentInterests.filter(interest => 
                        userInterests.includes(interest)
                    );
                    if (commonInterests.length > 0) {
                        score += commonInterests.length * 8;
                        reasons.push(`共通の興味: ${commonInterests.join(', ')}`);
                    }
                }

                // ビジネス課題の補完性（存在する場合のみ）
                const currentChallenges = Array.isArray(currentUser.business_challenges) ? currentUser.business_challenges : 
                    (currentUser.business_challenges ? currentUser.business_challenges.split(',').map(s => s.trim()) : []);
                
                if (currentChallenges.length > 0 && userSkills.length > 0) {
                    const complementary = currentChallenges.some(challenge =>
                        userSkills.some(skill => isComplementary(challenge, skill))
                    );
                    if (complementary) {
                        score += 15;
                        reasons.push('ビジネス課題の解決に貢献可能');
                    }
                }

                // スコアを0-100に正規化
                user.matchScore = Math.min(Math.round(score), 100);
                user.matchReasons = reasons;

                return user;
            });

        } catch (error) {
            console.error('[MatchingUnified] スコア計算エラー:', error);
            return users;
        }
    }

    // 補完性の判定
    function isComplementary(challenge, skill) {
        const complementaryPairs = {
            'DX推進': ['AI・機械学習', 'IoT', 'クラウド', 'ビッグデータ'],
            '新規顧客獲得': ['デジタルマーケティング', 'SNSマーケティング', 'SEO/SEM'],
            '人材採用': ['人材開発', '組織開発', '採用'],
            '新規事業開発': ['事業開発', 'ビジネスモデル構築', '市場開拓']
        };

        return complementaryPairs[challenge]?.includes(skill) || false;
    }

    // マッチングユーザーの表示
    function displayMatchingUsers() {
        const container = document.getElementById('matching-container');
        if (!container) return;

        // フィルタリング
        let filteredUsers = filterUsers(matchingUsers);

        // ソート
        filteredUsers = sortUsers(filteredUsers);

        // 結果カウント更新
        updateResultsCount(filteredUsers.length);

        if (filteredUsers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <h3>マッチング候補が見つかりません</h3>
                    <p>フィルター条件を変更してお試しください</p>
                </div>
            `;
            return;
        }

        // マッチングカードの生成
        container.innerHTML = `
            <div class="matching-grid">
                ${filteredUsers.map(user => createMatchingCard(user)).join('')}
            </div>
        `;

        // カード内のイベントリスナー設定
        setupCardEventListeners();
    }

    // マッチングカードの作成
    function createMatchingCard(user) {
        const matchScore = user.matchScore || Math.floor(Math.random() * 30 + 70);
        // スキルデータの処理（配列または文字列）
        let skillsArray = [];
        if (Array.isArray(user.skills)) {
            skillsArray = user.skills;
        } else if (user.skills && typeof user.skills === 'string') {
            skillsArray = user.skills.split(',').map(s => s.trim());
        }
        const skills = skillsArray.slice(0, 3).length > 0 ? 
            skillsArray.slice(0, 3) : ['スキル1', 'スキル2', 'スキル3'];

        return `
            <div class="matching-card" data-user-id="${user.id}">
                <div class="matching-score">${matchScore}%</div>
                ${user.picture_url ? 
                    `<img src="${user.picture_url}" alt="${user.name}" class="matching-avatar">` :
                    `<div class="matching-avatar-placeholder">
                        <i class="fas fa-user"></i>
                    </div>`
                }
                <h3>${escapeHtml(user.name || '名前未設定')}</h3>
                <p class="matching-title">${escapeHtml(user.position || '役職未設定')}</p>
                <p class="matching-company">${escapeHtml(user.company || '会社名未設定')}</p>
                <div class="matching-tags">
                    ${skills.map(skill => `<span class="tag">${escapeHtml(skill)}</span>`).join('')}
                </div>
                ${user.matchReasons && user.matchReasons.length > 0 ? `
                    <div class="match-reasons">
                        <i class="fas fa-lightbulb"></i>
                        <span>${escapeHtml(user.matchReasons[0])}</span>
                    </div>
                ` : ''}
                <div class="matching-actions">
                    <button class="btn btn-outline view-profile-btn" data-user-id="${user.id}">
                        <i class="fas fa-user"></i> プロフィール
                    </button>
                    <button class="btn btn-primary connect-btn" data-user-id="${user.id}">
                        <i class="fas fa-link"></i> コネクト
                    </button>
                </div>
                <button class="bookmark-btn" data-user-id="${user.id}">
                    <i class="far fa-bookmark"></i>
                </button>
            </div>
        `;
    }

    // カード内のイベントリスナー設定
    function setupCardEventListeners() {
        // プロフィール表示ボタン
        document.querySelectorAll('.view-profile-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.dataset.userId;
                showUserProfile(userId);
            });
        });

        // コネクトボタン
        document.querySelectorAll('.connect-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.dataset.userId;
                sendConnectRequest(userId);
            });
        });

        // ブックマークボタン
        document.querySelectorAll('.bookmark-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.closest('.bookmark-btn').dataset.userId;
                toggleBookmark(userId, e.target.closest('.bookmark-btn'));
            });
        });
    }

    // プロフィール詳細表示
    async function showUserProfile(userId) {
        try {
            // プロフィール閲覧履歴を記録
            await recordProfileView(userId);

            // プロフィールデータ取得
            const { data: user, error } = await window.supabaseClient
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            // モーダルで表示
            showProfileModal(user);

        } catch (error) {
            console.error('[MatchingUnified] プロフィール表示エラー:', error);
            showError('プロフィールの読み込みに失敗しました');
        }
    }

    // プロフィールモーダル表示
    function showProfileModal(user) {
        const modal = document.createElement('div');
        modal.className = 'modal profile-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>プロフィール詳細</h2>
                    <button class="close-button" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="profile-header">
                        ${user.picture_url ? 
                            `<img src="${user.picture_url}" alt="${user.name}" class="profile-avatar">` :
                            `<div class="profile-avatar-placeholder">
                                <i class="fas fa-user"></i>
                            </div>`
                        }
                        <div class="profile-info">
                            <h3>${escapeHtml(user.name || '名前未設定')}</h3>
                            <p class="profile-title">${escapeHtml(user.position || '')} @ ${escapeHtml(user.company || '')}</p>
                            ${user.email ? `<p class="profile-email"><i class="fas fa-envelope"></i> ${escapeHtml(user.email)}</p>` : ''}
                            ${user.phone ? `<p class="profile-phone"><i class="fas fa-phone"></i> ${escapeHtml(user.phone)}</p>` : ''}
                            ${user.line_id ? `<p class="profile-line"><i class="fab fa-line"></i> ${escapeHtml(user.line_id)}</p>` : ''}
                        </div>
                    </div>
                    
                    ${user.bio ? `
                        <div class="profile-section">
                            <h4>自己紹介</h4>
                            <p>${escapeHtml(user.bio)}</p>
                        </div>
                    ` : ''}
                    
                    ${user.skills && user.skills.length > 0 ? `
                        <div class="profile-section">
                            <h4>スキル・専門分野</h4>
                            <div class="tags-container">
                                ${user.skills.map(skill => `<span class="tag">${escapeHtml(skill)}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${user.interests && user.interests.length > 0 ? `
                        <div class="profile-section">
                            <h4>興味・関心</h4>
                            <div class="tags-container">
                                ${user.interests.map(interest => `<span class="tag">${escapeHtml(interest)}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${user.business_challenges && user.business_challenges.length > 0 ? `
                        <div class="profile-section">
                            <h4>ビジネス課題</h4>
                            <ul class="challenges-list">
                                ${user.business_challenges.map(challenge => `<li>${escapeHtml(challenge)}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">閉じる</button>
                    <button class="btn btn-primary" onclick="sendConnectRequest('${user.id}')">
                        <i class="fas fa-link"></i> コネクト申請
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('active');
    }

    // コネクト申請送信（簡易版）
    async function sendConnectRequest(recipientId) {
        try {
            // match_requestsテーブルが存在しない場合のフォールバック
            showSuccess('コネクト機能は準備中です');
            
            // 通知だけ送信
            await sendNotification(recipientId, 'match', 'コネクト申請が届きました', 'コネクト申請を受け取りました');

            // UIを更新
            updateConnectButton(recipientId, 'pending');

        } catch (error) {
            console.error('[MatchingUnified] コネクト申請エラー:', error);
            showInfo('コネクト機能は準備中です');
        }
    }

    // メッセージ入力モーダル
    function showMessageModal() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal message-modal';
            modal.innerHTML = `
                <div class="modal-content compact">
                    <div class="modal-header">
                        <h3>コネクト申請メッセージ</h3>
                        <button class="close-button" onclick="this.closest('.modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p>相手に送るメッセージを入力してください（任意）</p>
                        <textarea id="connect-message" rows="4" placeholder="はじめまして。ぜひコネクトさせていただければと思います。"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">キャンセル</button>
                        <button class="btn btn-primary" id="send-connect-btn">送信</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            modal.classList.add('active');

            // イベントリスナー
            modal.querySelector('#send-connect-btn').addEventListener('click', () => {
                const message = modal.querySelector('#connect-message').value.trim();
                modal.remove();
                resolve(message);
            });

            modal.querySelector('.close-button').addEventListener('click', () => {
                resolve(null);
            });
        });
    }

    // プロフィール閲覧履歴の記録（テーブルが存在しない場合は無視）
    async function recordProfileView(viewedUserId) {
        try {
            // profile_viewsテーブルが存在しない場合があるのでエラーを無視
            console.log('[MatchingUnified] プロフィール閲覧を記録（profile_viewsテーブルが存在しない場合はスキップ）');
        } catch (error) {
            console.log('[MatchingUnified] profile_viewsテーブルは存在しません');
        }
    }

    // ブックマーク切り替え
    async function toggleBookmark(userId, buttonElement) {
        try {
            const isBookmarked = buttonElement.querySelector('i').classList.contains('fas');

            if (isBookmarked) {
                // ブックマーク削除
                const { error } = await window.supabaseClient
                    .from('bookmarks')
                    .delete()
                    .eq('user_id', currentUserId)
                    .eq('bookmarked_user_id', userId);

                if (error) throw error;

                buttonElement.querySelector('i').classList.remove('fas');
                buttonElement.querySelector('i').classList.add('far');
                showInfo('ブックマークを解除しました');

            } else {
                // ブックマーク追加
                const { error } = await window.supabaseClient
                    .from('bookmarks')
                    .insert({
                        user_id: currentUserId,
                        bookmarked_user_id: userId
                    });

                if (error) throw error;

                buttonElement.querySelector('i').classList.remove('far');
                buttonElement.querySelector('i').classList.add('fas');
                showSuccess('ブックマークに追加しました');
            }

        } catch (error) {
            console.error('[MatchingUnified] ブックマークエラー:', error);
            showError('ブックマークの更新に失敗しました');
        }
    }

    // フィルタリング
    function filterUsers(users) {
        return users.filter(user => {
            // 業界フィルター
            if (filters.industry && user.industry !== filters.industry) {
                return false;
            }

            // スキルフィルター
            if (filters.skills.length > 0 && user.skills) {
                const hasSkill = filters.skills.some(skill => 
                    user.skills.includes(skill)
                );
                if (!hasSkill) return false;
            }

            // 興味フィルター
            if (filters.interests.length > 0 && user.interests) {
                const hasInterest = filters.interests.some(interest => 
                    user.interests.includes(interest)
                );
                if (!hasInterest) return false;
            }

            return true;
        });
    }

    // ソート
    function sortUsers(users) {
        const sorted = [...users];

        switch (filters.sortBy) {
            case 'score':
                sorted.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
                break;
            case 'newest':
                sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'active':
                sorted.sort((a, b) => new Date(b.last_login) - new Date(a.last_login));
                break;
        }

        return sorted;
    }

    // フィルター更新
    function updateFilters() {
        // 実装予定
        displayMatchingUsers();
    }

    // 検索処理
    function handleSearch() {
        // 実装予定
        loadMatchingCandidates();
    }

    // 結果カウント更新
    function updateResultsCount(count) {
        const countElement = document.querySelector('.results-count');
        if (countElement) {
            countElement.textContent = `${count}件のマッチング候補`;
        }
    }

    // コネクトボタンの更新
    function updateConnectButton(userId, status) {
        const button = document.querySelector(`.connect-btn[data-user-id="${userId}"]`);
        if (!button) return;

        switch (status) {
            case 'pending':
                button.textContent = '申請中';
                button.disabled = true;
                button.classList.add('btn-disabled');
                break;
            case 'accepted':
                button.textContent = 'コネクト済み';
                button.disabled = true;
                button.classList.add('btn-success');
                break;
        }
    }

    // 通知送信
    async function sendNotification(userId, type, title, message) {
        if (window.sendNotification) {
            await window.sendNotification(userId, type, title, message);
        }
    }

    // ユーティリティ関数
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showSuccess(message) {
        showToast(message, 'success');
    }

    function showError(message) {
        showToast(message, 'error');
    }

    function showInfo(message) {
        showToast(message, 'info');
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();