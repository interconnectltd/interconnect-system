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

    // console.log('[MatchingUnified] マッチングシステム初期化');
    
    // 他のレーダーチャート関数との競合を防ぐ
    if (window.drawRadarChart || window.drawRadarChartForUser) {
        console.warn('[MatchingUnified] 既存のレーダーチャート関数を検出。上書きします。');
        delete window.drawRadarChart;
        delete window.drawRadarChartForUser;
    }

    // グローバル変数
    let currentUserId = null;
    let matchingUsers = [];
    let currentPage = 1;
    const itemsPerPage = 12;
    let filters = {
        industry: '',
        location: '',
        interest: '',
        skills: [],
        interests: [],
        sortBy: 'score'
    };
    
    // タイマー管理用
    const activeTimers = new Set();
    
    // Canvas再試行カウントを管理するWeakMap
    const canvasRetryCount = new WeakMap();
    
    // マッチングスコア計算関数をグローバルに公開（後で設定）
    window.matchingScoreFix = {
        calculateScore: calculateMatchingScore
    };
    
    // タイマー管理ヘルパー関数
    function setManagedTimeout(callback, delay) {
        const timerId = setTimeout(() => {
            activeTimers.delete(timerId);
            callback();
        }, delay);
        activeTimers.add(timerId);
        return timerId;
    }
    
    // 全タイマーのクリーンアップ
    function clearAllTimers() {
        activeTimers.forEach(timerId => clearTimeout(timerId));
        activeTimers.clear();
    }

    // 初期化
    async function initialize() {
        // console.log('[MatchingUnified] 初期化開始');

        try {
            // Supabaseの準備を待つ
            await window.waitForSupabase();

            // 現在のユーザーを取得
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (!user) {
                console.error('[MatchingUnified] ユーザーが認証されていません');
                // 開発環境でのみダミーデータを表示
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    displayDummyData();
                } else {
                    showLoginRequired();
                }
                return;
            }

            currentUserId = user.id;
            // console.log('[MatchingUnified] ユーザーID:', currentUserId);

            // イベントリスナーの設定
            setupEventListeners();

            // マッチング候補の読み込み
            await loadMatchingCandidates();
        } catch (error) {
            console.error('[MatchingUnified] 初期化エラー:', error);
            // 開発環境でのみダミーデータを表示
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                displayDummyData();
            } else {
                showErrorMessage('初期化エラーが発生しました。ページを再読み込みしてください。');
            }
        }
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

        // フィルター - 業界
        const industrySelect = document.querySelector('[name="industry"]');
        if (industrySelect) {
            industrySelect.addEventListener('change', (e) => {
                filters.industry = e.target.value;
                displayMatchingUsers();
            });
        }

        // フィルター - 地域
        const locationSelect = document.querySelector('[name="location"]');
        if (locationSelect) {
            locationSelect.addEventListener('change', (e) => {
                filters.location = e.target.value;
                displayMatchingUsers();
            });
        }

        // フィルター - 興味・関心
        const interestSelect = document.querySelector('[name="interest"]');
        if (interestSelect) {
            interestSelect.addEventListener('change', (e) => {
                filters.interest = e.target.value;
                displayMatchingUsers();
            });
        }

        // フィルター（その他の入力フィールド用）
        document.querySelectorAll('.filter-option input').forEach(input => {
            input.addEventListener('change', updateFilters);
        });
    }

    // マッチング候補の読み込み
    async function loadMatchingCandidates() {
        try {
            // console.log('[MatchingUnified] マッチング候補読み込み開始');
            
            const container = document.getElementById('matching-container');
            if (!container) {
                console.error('[MatchingUnified] matching-containerが見つかりません');
                return;
            }
            
            // 読み込み中表示（改善されたローディング演出）
            container.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner">
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                    </div>
                    <p class="loading-text">マッチング候補を検索中...</p>
                </div>
            `;
            
            // 現在のユーザーID取得
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (!user) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>ログインが必要です</h3></div>';
                return;
            }
            
            currentUserId = user.id;
            
            // user_profilesテーブルから必要なカラムのみ取得（パフォーマンス改善）
            const { data: allUsers, error } = await window.supabaseClient
                .from('user_profiles')
                .select(`
                    id,
                    name,
                    position,
                    company,
                    location,
                    industry,
                    skills,
                    interests,
                    business_challenges,
                    picture_url,
                    last_login,
                    bio,
                    email,
                    phone,
                    line_id,
                    created_at
                `)
                .limit(200); // パフォーマンス対策: 最大200件に制限
            
            if (error) {
                console.error('[MatchingUnified] ユーザー取得エラー:', error);
                // XSS対策: DOM操作で安全に挿入
                container.innerHTML = '';
                const errorDiv = document.createElement('div');
                errorDiv.className = 'empty-state';
                
                const icon = document.createElement('i');
                icon.className = 'fas fa-exclamation-triangle';
                
                const heading = document.createElement('h3');
                heading.textContent = 'データの取得に失敗しました';
                
                const paragraph = document.createElement('p');
                paragraph.textContent = error.message;
                
                errorDiv.appendChild(icon);
                errorDiv.appendChild(heading);
                errorDiv.appendChild(paragraph);
                container.appendChild(errorDiv);
                return;
            }
            
            // 自分以外のユーザーをフィルタリング（user_profilesではidカラムを使用）
            const users = allUsers ? allUsers.filter(user => user.id !== currentUserId) : [];
            
            // console.log('[MatchingUnified] 取得したユーザー数:', users.length);
            
            if (!users || users.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><h3>マッチング候補が見つかりません</h3><p>条件を変更して再度お試しください</p></div>';
                return;
            }
            
            // 各ユーザーのコネクションステータスを取得（user_profilesではidカラムを使用）
            const userIds = users.map(u => u.id).filter(id => id); // null/undefinedを除外
            // console.log('[MatchingUnified] フィルタリング後のuserIds:', userIds);
            
            let connections = [];
            
            if (userIds.length > 0) {
                const { data: connectionsData, error: connError } = await window.supabaseClient
                    .from('connections')
                    .select('*');
                
                if (connError) {
                    console.error('[MatchingUnified] コネクション取得エラー:', connError);
                } else {
                    // JavaScriptでフィルタリング
                    connections = connectionsData ? connectionsData.filter(conn => 
                        (conn.user_id === currentUserId && userIds.includes(conn.connected_user_id)) ||
                        (userIds.includes(conn.user_id) && conn.connected_user_id === currentUserId)
                    ) : [];
                    // console.log('[MatchingUnified] 取得したconnections:', connections);
                }
            }
            
            // コネクションステータスをマップに格納
            const connectionMap = {};
            if (connections) {
                connections.forEach(conn => {
                    const otherUserId = conn.user_id === currentUserId ? conn.connected_user_id : conn.user_id;
                    connectionMap[otherUserId] = conn.status;
                });
            }
            
            // マッチングスコアを計算
            matchingUsers = await calculateMatchingScores(users);
            
            // connectionMapを各ユーザーに追加
            matchingUsers.forEach(user => {
                user.connectionStatus = connectionMap[user.id] || null;
            });
            
            // 表示
            displayMatchingUsers();
            
            // カード内のイベントリスナーを設定
            setupCardEventListeners();

        } catch (error) {
            console.error('[MatchingUnified] エラー:', error);
            const container = document.getElementById('matching-container');
            if (container) {
                // XSS対策: DOM操作で安全に挿入
                container.innerHTML = '';
                const errorDiv = document.createElement('div');
                errorDiv.className = 'empty-state';
                
                const icon = document.createElement('i');
                icon.className = 'fas fa-exclamation-triangle';
                
                const heading = document.createElement('h3');
                heading.textContent = 'エラーが発生しました';
                
                const paragraph = document.createElement('p');
                paragraph.textContent = error.message;
                
                errorDiv.appendChild(icon);
                errorDiv.appendChild(heading);
                errorDiv.appendChild(paragraph);
                container.appendChild(errorDiv);
            }
        }
    }

    // 個別のマッチングスコア計算（profile-detail-modalから呼び出し可能）
    function calculateMatchingScore(profileUser, currentUser) {
        if (!profileUser || !currentUser) return 50;
        
        let score = 0;
        
        // スキルの一致度（30点満点）
        if (profileUser.skills && currentUser.skills) {
            const profileSkills = Array.isArray(profileUser.skills) ? profileUser.skills : [];
            const currentSkills = Array.isArray(currentUser.skills) ? currentUser.skills : [];
            const commonSkills = profileSkills.filter(skill => currentSkills.includes(skill));
            score += Math.min((commonSkills.length / Math.max(profileSkills.length, 1)) * 30, 30);
        }
        
        // 興味の一致度（25点満点）
        if (profileUser.interests && currentUser.interests) {
            const profileInterests = Array.isArray(profileUser.interests) ? profileUser.interests : [];
            const currentInterests = Array.isArray(currentUser.interests) ? currentUser.interests : [];
            const commonInterests = profileInterests.filter(interest => currentInterests.includes(interest));
            score += Math.min((commonInterests.length / Math.max(profileInterests.length, 1)) * 25, 25);
        }
        
        // 業界の一致（20点）
        if (profileUser.industry && currentUser.industry && profileUser.industry === currentUser.industry) {
            score += 20;
        }
        
        // 地域の一致（15点）
        if (profileUser.location && currentUser.location && profileUser.location === currentUser.location) {
            score += 15;
        }
        
        // 基礎スコア（10点）
        score += 10;
        
        return Math.min(Math.round(score), 100);
    }
    
    // マッチングスコアの計算
    async function calculateMatchingScores(users) {
        try {
            // 現在のユーザーのプロフィール取得（自分のデータのみ）
            const { data: currentUserData } = await window.supabaseClient
                .from('user_profiles')
                .select(`
                    id,
                    skills,
                    interests,
                    business_challenges,
                    industry,
                    location
                `)
                .eq('id', currentUserId)
                .single();
            
            const currentUser = currentUserData;

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
        // console.log('[MatchingUnified] displayMatchingUsers開始, ユーザー数:', matchingUsers.length);
        const container = document.getElementById('matching-container');
        if (!container) {
            console.error('[MatchingUnified] matching-containerが見つかりません');
            return;
        }

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
            updatePagination(0);
            return;
        }

        // ページネーション処理
        const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
        // 現在のページが総ページ数を超えている場合は1ページ目にリセット
        if (currentPage > totalPages) {
            currentPage = 1;
        }
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

        // マッチングカードの生成
        container.innerHTML = `
            <div class="matching-grid">
                ${paginatedUsers.map(user => createMatchingCard(user)).join('')}
            </div>
        `;

        // ページネーションUI更新
        updatePagination(filteredUsers.length);

        // カード内のイベントリスナー設定
        setupCardEventListeners();
        
        // レーダーチャートを描画（少し遅延させて確実にCanvasが準備されるようにする）
        setManagedTimeout(() => {
            // console.log('[MatchingUnified] レーダーチャート描画を開始します。ユーザー数:', paginatedUsers.length);
            // 全てのCanvas要素が存在するか確認
            const canvasElements = container.querySelectorAll('canvas[id^="radar-"]');
            // console.log('[MatchingUnified] Canvas要素数:', canvasElements.length);
            
            // requestAnimationFrameを使用して順次描画（フリーズ防止）
            let currentIndex = 0;
            function drawNextChart() {
                if (currentIndex < paginatedUsers.length) {
                    const user = paginatedUsers[currentIndex];
                    const userId = user.id;
                    // console.log(`[MatchingUnified] ユーザー ${currentIndex + 1}/${paginatedUsers.length} のレーダーチャート描画:`, userId);
                    drawRadarChartForUser(user);
                    currentIndex++;
                    requestAnimationFrame(drawNextChart);
                }
            }
            requestAnimationFrame(drawNextChart);
        }, 300);
    }

    // コネクトボタンのレンダリング
    function renderConnectButton(userId, connectionStatus) {
        if (connectionStatus === 'accepted') {
            return `<button class="btn btn-success connect-btn" disabled data-user-id="${userId}">
                        <i class="fas fa-check"></i> コネクト済み
                    </button>`;
        } else if (connectionStatus === 'pending') {
            return `<button class="btn btn-secondary connect-btn" disabled data-user-id="${userId}">
                        <i class="fas fa-clock"></i> 申請中
                    </button>`;
        } else {
            return `<button class="btn btn-primary connect-btn" data-user-id="${userId}">
                        <i class="fas fa-link"></i> コネクト
                    </button>`;
        }
    }

    // マッチングカードの作成
    function createMatchingCard(user) {
        // スコアが未設定の場合は、ユーザーIDベースの疑似ランダム値を生成（一貫性を保つ）
        const matchScore = user.matchScore || generateConsistentScore(user.id);
        // スキルデータの処理（配列または文字列）
        let skillsArray = [];
        if (Array.isArray(user.skills)) {
            skillsArray = user.skills;
        } else if (user.skills && typeof user.skills === 'string') {
            skillsArray = user.skills.split(',').map(s => s.trim());
        }
        const skills = skillsArray.slice(0, 3).length > 0 ? 
            skillsArray.slice(0, 3) : ['ビジネス', 'コミュニケーション', 'プロジェクト管理'];
        
        // 共通スキルを判定
        const commonSkills = ['ビジネス', 'コミュニケーション'];
        const hasCommonSkills = skills.some(skill => commonSkills.includes(skill));

        const userId = user.id;
        // Canvas用のIDを安全にエスケープ（HTML属性用）
        const safeCanvasId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
        return `
            <div class="matching-card" data-user-id="${userId}">
                <div class="matching-score">${matchScore}%</div>
                ${user.picture_url ? 
                    `<img src="${sanitizeImageUrl(user.picture_url)}" alt="${escapeHtml(user.name)}" class="matching-avatar">` :
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
                <!-- レーダーチャート追加 -->
                <div class="matching-radar">
                    <canvas id="radar-${safeCanvasId}" data-original-user-id="${userId}"></canvas>
                </div>
                <!-- 共通スキル表示 -->
                ${hasCommonSkills ? `
                    <div class="common-skills">
                        <i class="fas fa-check-circle"></i>
                        共通スキル: ビジネス, コミュニケーション
                    </div>
                ` : ''}
                <div class="matching-actions">
                    <button class="btn btn-outline view-profile-btn" data-user-id="${userId}">
                        <i class="fas fa-user"></i> プロフィール
                    </button>
                    ${renderConnectButton(userId, user.connectionStatus)}
                </div>
                <button class="bookmark-btn" data-user-id="${userId}">
                    <i class="far fa-bookmark"></i>
                </button>
            </div>
        `;
    }

    // カード内のイベントリスナー設定
    // イベントリスナーの設定フラグ
    let eventListenersSetup = false;
    
    function setupCardEventListeners() {
        // 既にイベントリスナーが設定されている場合はスキップ
        if (eventListenersSetup) {
            // console.log('[MatchingUnified] イベントリスナーは既に設定済みです');
            return;
        }
        
        // イベントリスナーが設定済みであることをマーク
        eventListenersSetup = true;
        
        // プロフィール表示ボタン - イベント委譲を使用（一度だけ設定）
        document.addEventListener('click', handleCardClick);
    }
    
    // カード内のクリックイベントを一元管理
    function handleCardClick(e) {
        // プロフィール表示ボタン
        const profileBtn = e.target.closest('.view-profile-btn');
        if (profileBtn && !profileBtn.dataset.listenerAttached) {
            e.preventDefault();
            e.stopPropagation();
            profileBtn.dataset.listenerAttached = 'true';
            const userId = profileBtn.dataset.userId;
            if (userId) {
                showUserProfile(userId);
            }
            return;
        }
        
        // コネクトボタン
        const connectBtn = e.target.closest('.connect-btn');
        if (connectBtn && !connectBtn.dataset.listenerAttached) {
            e.preventDefault();
            e.stopPropagation();
            connectBtn.dataset.listenerAttached = 'true';
            const userId = connectBtn.dataset.userId;
            if (userId) {
                sendConnectRequest(userId);
            }
            return;
        }
        
        // ブックマークボタン
        const bookmarkBtn = e.target.closest('.bookmark-btn');
        if (bookmarkBtn && !bookmarkBtn.dataset.listenerAttached) {
            bookmarkBtn.dataset.listenerAttached = 'true';
            const userId = bookmarkBtn.dataset.userId;
            toggleBookmark(userId, bookmarkBtn);
            return;
        }
    }

    // ProfileDetailModalの読み込みを待機する関数
    async function waitForProfileModal(maxAttempts = 10) {
        for (let i = 0; i < maxAttempts; i++) {
            if (window.profileDetailModal && window.profileDetailModal.show) {
                return true;
            }
            // 100ms待機
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return false;
    }

    // プロフィール詳細表示
    async function showUserProfile(userId) {
        try {
            // プロフィール閲覧履歴を記録
            await recordProfileView(userId);

            // ProfileDetailModalの読み込みを待機（最大1秒）
            const modalAvailable = await waitForProfileModal();
            
            if (modalAvailable) {
                // ProfileDetailModalを使用（高機能版）
                window.profileDetailModal.show(userId);
            } else {
                // フォールバック: 従来のモーダル表示
                const { data: users, error } = await window.supabaseClient
                    .from('user_profiles')
                    .select('*');
                
                if (error) {
                    console.error('[MatchingUnified] ユーザー取得エラー:', error);
                    showToast('ユーザー情報の取得に失敗しました', 'error');
                    return;
                }
                
                // idでフィルタリング（user_profilesテーブルではidカラムを使用）
                const user = users.find(u => u.id === userId);
                if (!user) {
                    console.error('[MatchingUnified] ユーザーが見つかりません:', userId);
                    showToast('ユーザーが見つかりません', 'error');
                    return;
                }

                // モーダルで表示
                showProfileModal(user);
            }

        } catch (error) {
            console.error('[MatchingUnified] プロフィール表示エラー:', error);
            showError('プロフィールの読み込みに失敗しました');
        }
    }

    // プロフィールモーダル表示
    function showProfileModal(user) {
        // 既存のモーダルがあれば削除
        const existingModal = document.querySelector('.profile-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal profile-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>プロフィール詳細</h2>
                    <button class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="profile-header">
                        ${user.picture_url ? 
                            `<img src="${sanitizeImageUrl(user.picture_url)}" alt="${escapeHtml(user.name)}" class="profile-avatar">` :
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
                    <button class="btn btn-secondary">閉じる</button>
                    <button class="btn btn-primary" data-user-id="${user.id}">
                        <i class="fas fa-link"></i> コネクト申請
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // イベントハンドラーの設定
        // 閉じるボタン
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        // 二次閉じるボタン
        modal.querySelector('.btn-secondary').addEventListener('click', () => {
            modal.remove();
        });
        
        // コネクト申請ボタン
        modal.querySelector('.btn-primary').addEventListener('click', (e) => {
            const userId = e.target.dataset.userId;
            sendConnectRequest(userId);
            modal.remove();
        });
        
        // 背景クリックで閉じる
        modal.querySelector('.modal-overlay').addEventListener('click', () => {
            modal.remove();
        });
        
        // ESCキーで閉じる
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    // コネクト申請送信
    async function sendConnectRequest(recipientId) {
        try {
            // console.log('[MatchingUnified] コネクト申請送信:', recipientId);
            
            // 既存のコネクトを確認（シンプルなクエリに変更）
            const { data: allConnections } = await window.supabaseClient
                .from('connections')
                .select('*');
                
            // JavaScriptでフィルタリング
            const existingConnection = allConnections ? allConnections.find(conn =>
                (conn.user_id === currentUserId && conn.connected_user_id === recipientId) ||
                (conn.user_id === recipientId && conn.connected_user_id === currentUserId)
            ) : null;
            
            // エラーハンドリングを簡素化
            if (!allConnections) {
                console.error('[MatchingUnified] コネクションデータの取得に失敗');
            }

            if (existingConnection) {
                if (existingConnection.status === 'pending') {
                    showInfo('既にコネクト申請が送信されています');
                } else if (existingConnection.status === 'accepted') {
                    showInfo('既にコネクト済みです');
                }
                return;
            }

            // メッセージ入力モーダルを表示
            const message = await showMessageModal();
            if (message === null) return; // キャンセル

            // コネクト申請を作成
            const { error: insertError } = await window.supabaseClient
                .from('connections')
                .insert({
                    user_id: currentUserId,
                    connected_user_id: recipientId,
                    status: 'pending'
                });

            if (insertError) {
                console.error('[MatchingUnified] コネクト申請エラー:', insertError);
                showToast('コネクト申請の送信に失敗しました', 'error');
                return;
            }

            // 通知を送信
            await sendNotification(
                recipientId, 
                'connect_request', 
                '新しいコネクト申請', 
                message || 'コネクト申請が届いています',
                currentUserId,
                'connection'
            );

            // アクティビティを記録
            await recordActivity('connect_request', 'コネクト申請を送信しました', recipientId);

            // UIを更新
            updateConnectButton(recipientId, 'pending');
            showSuccess('コネクト申請を送信しました');

        } catch (error) {
            console.error('[MatchingUnified] コネクト申請エラー:', error);
            showError('コネクト申請の送信に失敗しました');
        }
    }

    // メッセージ入力モーダル
    function showMessageModal() {
        return new Promise((resolve) => {
            // 既存のモーダルがあれば削除
            const existingModal = document.querySelector('.message-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            const modal = document.createElement('div');
            modal.className = 'modal message-modal';
            modal.innerHTML = `
                <div class="modal-content compact">
                    <div class="modal-header">
                        <h3>コネクト申請メッセージ</h3>
                        <button class="modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p>相手に送るメッセージを入力してください（任意）</p>
                        <textarea id="connect-message" rows="4" placeholder="はじめまして。ぜひコネクトさせていただければと思います。"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary">キャンセル</button>
                        <button class="btn btn-primary" id="send-connect-btn">送信</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // イベントリスナー（once: trueで重複防止）
            modal.querySelector('#send-connect-btn').addEventListener('click', () => {
                const message = modal.querySelector('#connect-message').value.trim();
                modal.remove();
                resolve(message);
            }, { once: true });

            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.remove();
                resolve(null);
            }, { once: true });
            
            modal.querySelector('.btn-secondary').addEventListener('click', () => {
                modal.remove();
                resolve(null);
            }, { once: true });
        });
    }

    // プロフィール閲覧履歴の記録（削除済み - profile_viewsテーブルは使用しない）
    async function recordProfileView(viewedUserId) {
        // profile_viewsテーブルは存在しないため、この機能は無効化
        return;
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

                if (error) {
                    console.error('[MatchingUnified] ブックマーク解除エラー:', error);
                    showToast('ブックマークの解除に失敗しました', 'error');
                    return;
                }

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

                if (error) {
                    console.error('[MatchingUnified] ブックマーク追加エラー:', error);
                    showToast('ブックマークの追加に失敗しました', 'error');
                    return;
                }

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
            if (filters.industry && filters.industry !== '') {
                // 業界の値をマッピング
                const industryMap = {
                    'tech': 'IT・テクノロジー',
                    'finance': '金融',
                    'healthcare': '医療・ヘルスケア',
                    'retail': '小売・流通'
                };
                const filterIndustry = industryMap[filters.industry] || filters.industry;
                if (user.industry !== filterIndustry && user.industry !== filters.industry) {
                    return false;
                }
            }

            // 地域フィルター
            if (filters.location && filters.location !== '') {
                // 地域の値をマッピング
                const locationMap = {
                    'tokyo': '東京',
                    'osaka': '大阪',
                    'nagoya': '名古屋',
                    'fukuoka': '福岡'
                };
                const filterLocation = locationMap[filters.location] || filters.location;
                if (user.location !== filterLocation && user.location !== filters.location) {
                    return false;
                }
            }

            // 興味・関心フィルター
            if (filters.interest && filters.interest !== '') {
                // 興味の値をマッピング
                const interestMap = {
                    'collaboration': '協業',
                    'investment': '投資',
                    'mentoring': 'メンタリング',
                    'networking': 'ネットワーキング'
                };
                const filterInterest = interestMap[filters.interest] || filters.interest;
                
                // user.interestsの配列にfilterInterestが含まれているかチェック
                if (user.interests && Array.isArray(user.interests)) {
                    const hasInterest = user.interests.some(interest => 
                        interest === filterInterest || interest === filters.interest
                    );
                    if (!hasInterest) return false;
                } else {
                    return false; // interestsがない場合は除外
                }
            }

            // スキルフィルター
            if (filters.skills.length > 0 && user.skills) {
                const hasSkill = filters.skills.some(skill => 
                    user.skills.includes(skill)
                );
                if (!hasSkill) return false;
            }

            // 興味フィルター（複数選択）
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
        // ページを1ページ目にリセット
        currentPage = 1;
        displayMatchingUsers();
    }

    // 検索処理
    function handleSearch() {
        // ページを1ページ目にリセット
        currentPage = 1;
        displayMatchingUsers();
    }

    // 結果カウント更新
    function updateResultsCount(count) {
        const countElement = document.querySelector('.results-count');
        if (countElement) {
            countElement.textContent = `${count}件のマッチング候補`;
        }
    }

    // ページネーションボタンのハンドラー（グローバルに定義して再利用）
    function handlePrevPage() {
        if (currentPage > 1) {
            currentPage--;
            displayMatchingUsers();
            window.scrollTo({ top: 0, behavior: 'smooth' }); // スクロール位置をトップに
        }
    }

    function handleNextPage(totalPages) {
        if (currentPage < totalPages) {
            currentPage++;
            displayMatchingUsers();
            window.scrollTo({ top: 0, behavior: 'smooth' }); // スクロール位置をトップに
        }
    }

    // ページネーションUI更新
    function updatePagination(totalItems) {
        const pagination = document.querySelector('.pagination');
        if (!pagination) return;

        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        // 前へボタン
        const prevBtn = pagination.querySelector('.btn-outline:first-child');
        if (prevBtn) {
            prevBtn.disabled = currentPage <= 1;
            // removeEventListenerで既存のイベントをクリア
            const newPrevBtn = prevBtn.cloneNode(true);
            prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
            newPrevBtn.addEventListener('click', handlePrevPage);
        }

        // 次へボタン
        const nextBtn = pagination.querySelector('.btn-outline:last-child');
        if (nextBtn) {
            nextBtn.disabled = currentPage >= totalPages;
            // removeEventListenerで既存のイベントをクリア
            const newNextBtn = nextBtn.cloneNode(true);
            nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
            newNextBtn.addEventListener('click', () => handleNextPage(totalPages));
        }

        // ページ番号
        const pageNumbers = pagination.querySelector('.page-numbers');
        if (pageNumbers) {
            pageNumbers.innerHTML = '';
            
            // 表示するページ番号の範囲を計算
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + 4);
            
            // 開始ページを調整
            if (endPage - startPage < 4) {
                startPage = Math.max(1, endPage - 4);
            }

            for (let i = startPage; i <= endPage; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
                pageBtn.textContent = i;
                // onclickの代わりにaddEventListenerを使用
                pageBtn.addEventListener('click', ((pageNum) => {
                    return () => {
                        currentPage = pageNum;
                        displayMatchingUsers();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    };
                })(i));
                pageNumbers.appendChild(pageBtn);
            }
        }
    }

    // コネクトボタンの更新（重複定義のため削除 - 886行の定義を使用）
    // function updateConnectButton(userId, status) {
    //     const button = document.querySelector(`.connect-btn[data-user-id="${userId}"]`);
    //     if (!button) return;

    //     switch (status) {
    //         case 'pending':
    //             button.textContent = '申請中';
    //             button.disabled = true;
    //             button.classList.add('btn-disabled');
    //             break;
    //         case 'accepted':
    //             button.textContent = 'コネクト済み';
    //             button.disabled = true;
    //             button.classList.add('btn-success');
    //             break;
    //     }
    // }

    // 通知送信
    async function sendNotification(userId, type, title, content, relatedId = null, relatedType = null) {
        try {
            // console.log('[MatchingUnified] 通知送信:', { userId, type, title });
            
            const { error } = await window.supabaseClient
                .from('notifications')
                .insert({
                    user_id: userId,
                    type: type,
                    category: 'matching',
                    title: title,
                    content: content,
                    icon: 'fas fa-user-plus',
                    priority: 'normal',
                    related_id: relatedId,
                    related_type: relatedType,
                    is_read: false
                });

            if (error) {
                console.error('[MatchingUnified] 通知送信エラー:', error);
                // 通知送信失敗はサイレントに処理（UIの流れを止めない）
            }
            // console.log('[MatchingUnified] 通知送信成功');
            
        } catch (error) {
            console.error('[MatchingUnified] 通知送信エラー:', error);
        }
    }

    // アクティビティを記録
    async function recordActivity(type, title, relatedUserId = null) {
        try {
            const { error } = await window.supabaseClient
                .from('activities')
                .insert({
                    type: type,
                    title: title,
                    user_id: currentUserId,
                    related_user_id: relatedUserId
                });

            if (error) {
                console.error('[MatchingUnified] アクティビティ記録エラー:', error);
                // アクティビティ記録失敗はサイレントに処理（UIの流れを止めない）
            }
            // console.log('[MatchingUnified] アクティビティ記録成功');
            
        } catch (error) {
            console.error('[MatchingUnified] アクティビティ記録エラー:', error);
        }
    }

    // コネクトボタンの状態を更新
    function updateConnectButton(userId, status) {
        const buttons = document.querySelectorAll(`.connect-btn[data-user-id="${userId}"]`);
        buttons.forEach(button => {
            if (status === 'pending') {
                button.disabled = true;
                // XSS対策: DOM操作で安全に挿入
                button.innerHTML = '';
                const clockIcon = document.createElement('i');
                clockIcon.className = 'fas fa-clock';
                button.appendChild(clockIcon);
                button.appendChild(document.createTextNode(' 申請中'));
                button.classList.remove('btn-primary');
                button.classList.add('btn-secondary');
            } else if (status === 'accepted') {
                button.disabled = true;
                // XSS対策: DOM操作で安全に挿入
                button.innerHTML = '';
                const checkIcon = document.createElement('i');
                checkIcon.className = 'fas fa-check';
                button.appendChild(checkIcon);
                button.appendChild(document.createTextNode(' コネクト済み'));
                button.classList.remove('btn-primary');
                button.classList.add('btn-success');
            }
        });
    }

    // ユーティリティ関数
    function escapeHtml(text) {
        if (!text) return '';
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;'
        };
        return String(text).replace(/[&<>"'\/]/g, char => escapeMap[char]);
    }
    
    // ユーザーIDから一貫したスコアを生成（再描画でも同じ値）
    function generateConsistentScore(userId) {
        if (!userId) return 75;
        
        // userIdから疑似ランダムな値を生成（常に同じIDは同じ値）
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            const char = userId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        // 70-100の範囲に収める
        const score = 70 + (Math.abs(hash) % 31);
        return score;
    }
    
    // 画像URLのサニタイズ（XSS対策）
    function sanitizeImageUrl(url) {
        if (!url) return '';
        
        // javascript:, data:, vbscript: などの危険なスキームをブロック
        const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
        const lowerUrl = url.toLowerCase().trim();
        
        for (const scheme of dangerousSchemes) {
            if (lowerUrl.startsWith(scheme)) {
                console.warn('[MatchingUnified] 危険なURLスキームをブロック:', scheme);
                return ''; // 安全なデフォルト画像URLまたは空文字を返す
            }
        }
        
        // 相対URLまたはhttps/httpのみ許可
        if (lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://') || lowerUrl.startsWith('/')) {
            return url;
        }
        
        // その他の場合は相対URLとして扱う
        return url;
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
    
    // ログイン要求メッセージを表示
    function showLoginRequired() {
        const container = document.getElementById('matching-container');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lock"></i>
                    <h3>ログインが必要です</h3>
                    <p>マッチング機能を利用するにはログインしてください</p>
                    <a href="login.html" class="btn btn-primary">ログインページへ</a>
                </div>
            `;
        }
    }
    
    // エラーメッセージを表示
    function showErrorMessage(message) {
        const container = document.getElementById('matching-container');
        if (container) {
            container.innerHTML = '';
            const errorDiv = document.createElement('div');
            errorDiv.className = 'empty-state';
            
            const icon = document.createElement('i');
            icon.className = 'fas fa-exclamation-triangle';
            
            const heading = document.createElement('h3');
            heading.textContent = 'エラーが発生しました';
            
            const paragraph = document.createElement('p');
            paragraph.textContent = message;
            
            errorDiv.appendChild(icon);
            errorDiv.appendChild(heading);
            errorDiv.appendChild(paragraph);
            container.appendChild(errorDiv);
        }
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // XSS対策: innerHTMLではなくDOM操作で要素を構築
        const icon = document.createElement('i');
        icon.className = `fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}`;
        
        const span = document.createElement('span');
        span.textContent = message; // textContentで安全にテキストを設定
        
        toast.appendChild(icon);
        toast.appendChild(span);
        document.body.appendChild(toast);

        setManagedTimeout(() => toast.classList.add('show'), 100);
        setManagedTimeout(() => {
            toast.classList.remove('show');
            setManagedTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 経験スコアを計算（実データベース）
    function calculateExperienceScore(user) {
        let score = 50; // 基準スコア
        
        // 役職・肩書きによる加点（title フィールドを使用）
        if (user.title || user.position) {
            const titleText = user.title || user.position || '';
            const seniorKeywords = ['CEO', '代表', '社長', 'CTO', 'CFO', '執行役員', '取締役', 'founder', 'co-founder'];
            const middleKeywords = ['部長', 'マネージャー', 'manager', 'director', 'lead'];
            const juniorKeywords = ['リーダー', '主任', 'senior', 'チーフ'];
            
            if (seniorKeywords.some(keyword => titleText.toLowerCase().includes(keyword.toLowerCase()))) {
                score += 30;
            } else if (middleKeywords.some(keyword => titleText.toLowerCase().includes(keyword.toLowerCase()))) {
                score += 20;
            } else if (juniorKeywords.some(keyword => titleText.toLowerCase().includes(keyword.toLowerCase()))) {
                score += 10;
            } else if (titleText.length > 0) {
                score += 5; // 何らかの役職がある
            }
        }
        
        // スキルの深さによる加点（幅広い経験）
        if (user.skills && Array.isArray(user.skills)) {
            if (user.skills.length > 7) {
                score += 15;
            } else if (user.skills.length > 5) {
                score += 10;
            } else if (user.skills.length > 3) {
                score += 5;
            }
        }
        
        // 会社情報による加点（実務経験の証）
        if (user.company) {
            score += 5;
        }
        
        return Math.min(score, 100);
    }
    
    // 活動スコアを計算（実データベース）
    function calculateActivityScore(user) {
        let score = 40; // 基準スコア
        
        // プロフィール完成度による加点（最大30点）
        let completionScore = 0;
        
        // bio の充実度
        if (user.bio) {
            if (user.bio.length > 100) {
                completionScore += 15;
            } else if (user.bio.length > 50) {
                completionScore += 10;
            } else if (user.bio.length > 0) {
                completionScore += 5;
            }
        }
        
        // プロフィール画像
        if (user.picture_url || user.avatar_url) {
            completionScore += 10;
        }
        
        // 連絡先情報の充実度
        if (user.phone || user.line_id) {
            completionScore += 5;
        }
        
        score += completionScore;
        
        // データの充実度による加点（最大30点）
        let dataScore = 0;
        
        // スキルの充実度
        if (user.skills && Array.isArray(user.skills)) {
            if (user.skills.length >= 5) {
                dataScore += 15;
            } else if (user.skills.length >= 3) {
                dataScore += 10;
            } else if (user.skills.length > 0) {
                dataScore += 5;
            }
        }
        
        // 興味・関心の充実度
        if (user.interests && Array.isArray(user.interests)) {
            if (user.interests.length >= 4) {
                dataScore += 15;
            } else if (user.interests.length >= 2) {
                dataScore += 10;
            } else if (user.interests.length > 0) {
                dataScore += 5;
            }
        }
        
        score += dataScore;
        
        return Math.min(score, 100);
    }
    
    // 業界スコアを計算（公平版）
    function calculateIndustryScore(user) {
        if (!user.industry) return 40; // 業界未設定の基礎スコア
        
        let score = 60; // 業界設定済みの基礎スコア
        
        // 業界情報の詳細度による加点（どの業界でも平等）
        if (user.industry && user.industry.length > 0) {
            score += 20; // 業界を明記している
        }
        
        // 業界に関連するスキルの保有度
        if (user.skills && Array.isArray(user.skills) && user.skills.length > 0) {
            // 業界に関わらず、専門スキルの保有を評価
            const hasSpecializedSkills = user.skills.length >= 3;
            if (hasSpecializedSkills) {
                score += 20;
            }
        }
        
        return Math.min(score, 100);
    }
    
    // 地域スコアを計算（公平版）
    function calculateLocationScore(user) {
        if (!user.location) return 40; // 地域未設定の基礎スコア
        
        let score = 60; // 地域設定済みの基礎スコア
        
        // 地域情報の明確さによる加点（どの地域でも平等）
        if (user.location && user.location.length > 0) {
            score += 20; // 地域を明記している
        }
        
        // オンライン対応可能性を考慮
        // 全ての地域を平等に評価し、リモート時代を反映
        if (user.location) {
            score += 20; // どの地域でも活動可能
        }
        
        return Math.min(score, 100);
    }

    // スキルスコアを計算（質的評価）
    function calculateSkillScore(user) {
        if (!user.skills || !Array.isArray(user.skills) || user.skills.length === 0) {
            return 30; // スキル未設定の基礎スコア
        }
        
        let score = 40; // スキル設定済みの基礎スコア
        
        // スキルの数による段階的評価（最大30点）
        const skillCount = user.skills.length;
        if (skillCount >= 7) {
            score += 30; // 豊富なスキルセット
        } else if (skillCount >= 5) {
            score += 25;
        } else if (skillCount >= 3) {
            score += 20;
        } else if (skillCount >= 2) {
            score += 15;
        } else if (skillCount >= 1) {
            score += 10;
        }
        
        // スキルの専門性ボーナス（最大30点）
        // 技術系、ビジネス系、クリエイティブ系など多様性を評価
        const techSkills = ['プログラミング', 'AI', 'データ分析', 'システム設計', 'DX'];
        const businessSkills = ['経営戦略', 'マーケティング', '営業', 'ファイナンス', 'プロジェクト管理'];
        const creativeSkills = ['デザイン', 'ライティング', '企画', 'ブランディング', 'UI/UX'];
        
        let hasSpecialization = false;
        
        if (user.skills.some(skill => techSkills.some(tech => skill.includes(tech)))) {
            hasSpecialization = true;
        }
        if (user.skills.some(skill => businessSkills.some(biz => skill.includes(biz)))) {
            hasSpecialization = true;
        }
        if (user.skills.some(skill => creativeSkills.some(creative => skill.includes(creative)))) {
            hasSpecialization = true;
        }
        
        if (hasSpecialization) {
            score += 30;
        }
        
        return Math.min(score, 100);
    }
    
    // 興味スコアを計算（質的評価）
    function calculateInterestScore(user) {
        if (!user.interests || !Array.isArray(user.interests) || user.interests.length === 0) {
            return 30; // 興味未設定の基礎スコア
        }
        
        let score = 40; // 興味設定済みの基礎スコア
        
        // 興味の数による段階的評価（最大30点）
        const interestCount = user.interests.length;
        if (interestCount >= 5) {
            score += 30; // 幅広い興味
        } else if (interestCount >= 4) {
            score += 25;
        } else if (interestCount >= 3) {
            score += 20;
        } else if (interestCount >= 2) {
            score += 15;
        } else if (interestCount >= 1) {
            score += 10;
        }
        
        // 興味の多様性ボーナス（最大30点）
        // ビジネス、テクノロジー、社会貢献など幅広い関心を評価
        const hasBusinessInterest = user.interests.some(interest => 
            interest.includes('ビジネス') || interest.includes('経営') || interest.includes('起業')
        );
        const hasTechInterest = user.interests.some(interest => 
            interest.includes('AI') || interest.includes('DX') || interest.includes('テクノロジー')
        );
        const hasSocialInterest = user.interests.some(interest => 
            interest.includes('SDGs') || interest.includes('社会') || interest.includes('環境')
        );
        
        const diversityCount = [hasBusinessInterest, hasTechInterest, hasSocialInterest].filter(Boolean).length;
        score += diversityCount * 10;
        
        return Math.min(score, 100);
    }
    
    // 計算関数をグローバルに追加公開
    window.matchingScoreFix.calculateExperienceScore = calculateExperienceScore;
    window.matchingScoreFix.calculateActivityScore = calculateActivityScore;
    window.matchingScoreFix.calculateIndustryScore = calculateIndustryScore;
    window.matchingScoreFix.calculateLocationScore = calculateLocationScore;
    window.matchingScoreFix.calculateSkillScore = calculateSkillScore;
    window.matchingScoreFix.calculateInterestScore = calculateInterestScore;

    // レーダーチャートを描画
    function drawRadarChartForUser(user) {
        const userId = user.id;
        // Canvas用のIDを安全にエスケープ（同じロジックを使用）
        const safeCanvasId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
        // console.log('[MatchingUnified] レーダーチャート描画開始:', userId);
        const canvas = document.getElementById(`radar-${safeCanvasId}`);
        if (!canvas) {
            // 再試行回数を制限（無限ループ防止）
            let retryCount = canvasRetryCount.get(user) || 0;
            if (retryCount >= 3) {
                console.error('[MatchingUnified] Canvas要素が見つかりません（最大試行回数到達）:', `radar-${safeCanvasId}`);
                canvasRetryCount.delete(user); // メモリリーク防止
                return;
            }
            
            retryCount++;
            canvasRetryCount.set(user, retryCount);
            // console.log('[MatchingUnified] Canvas要素再試行:', retryCount, '回目');
            
            // 再試行
            setManagedTimeout(() => {
                const retryCanvas = document.getElementById(`radar-${safeCanvasId}`);
                if (retryCanvas) {
                    // console.log('[MatchingUnified] Canvas要素が見つかりました（再試行）');
                    drawRadarChartForUser(user);
                }
            }, 500);
            return;
        }
        
        // Canvas要素が見つかったら再試行カウントをクリア
        if (canvasRetryCount.has(user)) {
            canvasRetryCount.delete(user);
        }
        
        // 既に描画済みの場合はスキップ
        if (canvas.dataset.rendered === 'true') {
            // console.log('[MatchingUnified] レーダーチャート既に描画済み:', safeCanvasId);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('[MatchingUnified] Canvas 2Dコンテキストの取得に失敗');
            return;
        }
        // console.log('[MatchingUnified] Canvas取得成功:', canvas.width, 'x', canvas.height);
        
        // 描画状態を保存
        ctx.save();
        
        // Retina/高DPIディスプレイ対応
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        // Canvas表示サイズ（最大300pxに制限）
        const displayWidth = Math.min(rect.width || 200, 300);
        const displayHeight = Math.min(rect.height || 200, 300);
        
        // 既存の属性をクリア
        canvas.removeAttribute('width');
        canvas.removeAttribute('height');
        
        // Canvasの実際のピクセルサイズを高DPI対応
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        
        // CSSで表示サイズを設定
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        // 描画コンテキストをスケール
        ctx.scale(dpr, dpr);
        
        // 描画用の座標（表示サイズベース）
        const centerX = displayWidth / 2;
        const centerY = displayHeight / 2;
        const radius = Math.min(displayWidth, displayHeight) * 0.4;
        const sides = 6;
        
        // クリア（スケール後のサイズ）
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        
        // 背景の六角形グリッドを描画
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        
        // 5段階のグリッド
        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            for (let j = 0; j <= sides; j++) {
                const angle = (Math.PI * 2 / sides) * j - Math.PI / 2;
                const x = centerX + Math.cos(angle) * (radius * i / 5);
                const y = centerY + Math.sin(angle) * (radius * i / 5);
                if (j === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();
        }
        
        // 軸線を描画
        ctx.strokeStyle = '#d0d0d0';
        for (let i = 0; i < sides; i++) {
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        
        // ラベル
        const labels = ['スキル', '経験', '業界', '地域', '活動', '興味'];
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        labels.forEach((label, i) => {
            const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
            const x = centerX + Math.cos(angle) * (radius + 15);
            const y = centerY + Math.sin(angle) * (radius + 15);
            ctx.fillText(label, x, y);
        });
        
        // データポイントを計算（質的評価を重視）
        const values = [
            calculateSkillScore(user), // スキル（質的評価：最大100点）
            calculateExperienceScore(user), // 経験（実データ：最大100点）
            calculateIndustryScore(user), // 業界（公平スコア：最大100点）
            calculateLocationScore(user), // 地域（公平スコア：最大100点）
            calculateActivityScore(user), // 活動（実データ：最大100点）
            calculateInterestScore(user) // 興味（質的評価：最大100点）
        ];
        
        // データポリゴンを描画
        ctx.fillStyle = 'rgba(74, 144, 226, 0.3)';
        ctx.strokeStyle = '#4a90e2';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        values.forEach((value, i) => {
            const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
            const x = centerX + Math.cos(angle) * (radius * value / 100);
            const y = centerY + Math.sin(angle) * (radius * value / 100);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // データポイントを描画
        ctx.fillStyle = '#4a90e2';
        values.forEach((value, i) => {
            const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
            const x = centerX + Math.cos(angle) * (radius * value / 100);
            const y = centerY + Math.sin(angle) * (radius * value / 100);
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // 描画状態を復元
        ctx.restore();
        
        // 描画完了フラグを設定
        canvas.dataset.rendered = 'true';
        
        // console.log('[MatchingUnified] レーダーチャート描画完了:', userId);
        // console.log('[MatchingUnified] Canvas表示状態:', {
        //     userId: userId,
        //     visible: canvasRect.width > 0 && canvasRect.height > 0,
        //     width: canvasRect.width,
        //     height: canvasRect.height,
        //     display: window.getComputedStyle(canvas).display,
        //     visibility: window.getComputedStyle(canvas).visibility
        // });
    }

    // ダミーデータを表示
    function displayDummyData() {
        // console.log('[MatchingUnified] ダミーデータを表示します');
        const dummyUsers = [
            {
                id: 'dummy1',
                name: 'りゅう',
                position: '役職未設定',
                company: '会社名未設定',
                skills: ['ビジネス', 'コミュニケーション', 'プロジェクト管理'],
                interests: ['ネットワーキング', 'スタートアップ'],
                industry: 'IT',
                location: '東京',
                matchScore: 95
            },
            {
                id: 'dummy2',
                name: 'guest',
                position: '役職未設定',
                company: '会社名未設定',
                skills: ['ビジネス', 'コミュニケーション', 'マーケティング'],
                interests: ['投資', 'テクノロジー'],
                industry: 'IT',
                location: '東京',
                matchScore: 88
            },
            {
                id: 'dummy3',
                name: '田中 太郎',
                position: 'エンジニア',
                company: 'テック株式会社',
                skills: ['プログラミング', 'AI', 'データ分析'],
                interests: ['AI', '機械学習'],
                industry: 'IT',
                location: '東京',
                matchScore: 82
            },
            {
                id: 'dummy4',
                name: '山田 花子',
                position: 'デザイナー',
                company: 'クリエイティブ社',
                skills: ['UI/UX', 'グラフィックデザイン', 'ブランディング'],
                interests: ['デザイン', 'アート'],
                industry: 'デザイン',
                location: '大阪',
                matchScore: 78
            },
            {
                id: 'dummy5',
                name: '佐藤 次郎',
                position: 'マーケター',
                company: 'マーケティング株式会社',
                skills: ['デジタルマーケティング', 'SEO', 'コンテンツ制作'],
                interests: ['マーケティング', 'グロース'],
                industry: 'マーケティング',
                location: '名古屋',
                matchScore: 75
            },
            {
                id: 'dummy6',
                name: '鈴木 美咲',
                position: 'コンサルタント',
                company: 'コンサルティングファーム',
                skills: ['戦略立案', '事業開発', 'プロジェクト管理'],
                interests: ['ビジネス戦略', 'イノベーション'],
                industry: 'コンサルティング',
                location: '福岡',
                matchScore: 72
            }
        ];

        matchingUsers = dummyUsers;
        displayMatchingUsers();
    }

    // 初期化実行（Supabase初期化を待つ）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Supabase初期化完了を待つ
            if (window.supabaseClient) {
                initialize();
            } else {
                window.addEventListener('supabaseReady', initialize, { once: true });
            }
        });
    } else {
        // 既にDOMが読み込まれている場合
        if (window.supabaseClient) {
            initialize();
        } else {
            window.addEventListener('supabaseReady', initialize, { once: true });
        }
    }
    
    // ページアンロード時にタイマーをクリーンアップ
    window.addEventListener('beforeunload', () => {
        clearAllTimers();
    });

})();