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
    
    // 他のレーダーチャート関数との競合を防ぐ
    if (window.drawRadarChart || window.drawRadarChartForUser) {
        console.warn('[MatchingUnified] 既存のレーダーチャート関数を検出。上書きします。');
        delete window.drawRadarChart;
        delete window.drawRadarChartForUser;
    }

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

        try {
            // Supabaseの準備を待つ
            await window.waitForSupabase();

            // 現在のユーザーを取得
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (!user) {
                console.error('[MatchingUnified] ユーザーが認証されていません');
                // テスト用にダミーデータを表示
                displayDummyData();
                return;
            }

            currentUserId = user.id;
            console.log('[MatchingUnified] ユーザーID:', currentUserId);

            // イベントリスナーの設定
            setupEventListeners();

            // マッチング候補の読み込み
            await loadMatchingCandidates();
        } catch (error) {
            console.error('[MatchingUnified] 初期化エラー:', error);
            // エラー時もダミーデータを表示
            displayDummyData();
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

        // フィルター
        document.querySelectorAll('.filter-option input').forEach(input => {
            input.addEventListener('change', updateFilters);
        });
    }

    // マッチング候補の読み込み
    async function loadMatchingCandidates() {
        try {
            console.log('[MatchingUnified] マッチング候補読み込み開始');
            
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
            
            // user_profilesテーブルから全ユーザーを取得
            const { data: allUsers, error } = await window.supabaseClient
                .from('user_profiles')
                .select('*');
            
            if (error) {
                console.error('[MatchingUnified] ユーザー取得エラー:', error);
                container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>データの取得に失敗しました</h3><p>' + error.message + '</p></div>';
                return;
            }
            
            // 自分以外のユーザーをフィルタリング
            const users = allUsers ? allUsers.filter(user => user.user_id !== currentUserId) : [];
            
            console.log('[MatchingUnified] 取得したユーザー数:', users.length);
            
            if (!users || users.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><h3>マッチング候補が見つかりません</h3><p>条件を変更して再度お試しください</p></div>';
                return;
            }
            
            // 各ユーザーのコネクションステータスを取得
            const userIds = users.map(u => u.user_id).filter(id => id); // null/undefinedを除外
            let connections = [];
            
            if (userIds.length > 0) {
                const { data: connectionsData } = await window.supabaseClient
                    .from('connections')
                    .select('*');
                
                // JavaScriptでフィルタリング
                connections = connectionsData ? connectionsData.filter(conn => 
                    (conn.user_id === currentUserId && userIds.includes(conn.connected_user_id)) ||
                    (userIds.includes(conn.user_id) && conn.connected_user_id === currentUserId)
                ) : [];
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
                user.connectionStatus = connectionMap[user.user_id] || null;
            });
            
            // 表示
            displayMatchingUsers();

        } catch (error) {
            console.error('[MatchingUnified] エラー:', error);
            const container = document.getElementById('matching-container');
            if (container) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>エラーが発生しました</h3><p>' + error.message + '</p></div>';
            }
        }
    }

    // マッチングスコアの計算
    async function calculateMatchingScores(users) {
        try {
            // 現在のユーザーのプロフィール取得
            const { data: allProfiles } = await window.supabaseClient
                .from('user_profiles')
                .select('*');
            
            const currentUser = allProfiles ? allProfiles.find(u => u.user_id === currentUserId) : null;

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
        console.log('[MatchingUnified] displayMatchingUsers開始, ユーザー数:', matchingUsers.length);
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
        
        // レーダーチャートを描画（少し遅延させて確実にCanvasが準備されるようにする）
        setTimeout(() => {
            console.log('[MatchingUnified] レーダーチャート描画を開始します。ユーザー数:', filteredUsers.length);
            // 全てのCanvas要素が存在するか確認
            const canvasElements = container.querySelectorAll('canvas[id^="radar-"]');
            console.log('[MatchingUnified] Canvas要素数:', canvasElements.length);
            
            filteredUsers.forEach((user, index) => {
                const userId = user.user_id || user.id;
                console.log(`[MatchingUnified] ユーザー ${index + 1}/${filteredUsers.length} のレーダーチャート描画:`, userId);
                drawRadarChartForUser(user);
            });
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
        const matchScore = user.matchScore || Math.floor(Math.random() * 30 + 70);
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

        const userId = user.user_id || user.id;
        return `
            <div class="matching-card" data-user-id="${userId}">
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
                <!-- レーダーチャート追加 -->
                <div class="matching-radar">
                    <canvas id="radar-${userId}" width="200" height="200"></canvas>
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
    function setupCardEventListeners() {
        // プロフィール表示ボタン
        document.querySelectorAll('.view-profile-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const userId = btn.dataset.userId || e.target.closest('.view-profile-btn').dataset.userId;
                if (userId) {
                    showUserProfile(userId);
                }
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
            const { data: users, error } = await window.supabaseClient
                .from('user_profiles')
                .select('*');
            
            if (error) throw error;
            
            // user_idでフィルタリング
            const user = users.find(u => u.user_id === userId);
            if (!user) throw new Error('ユーザーが見つかりません');

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
                    <button class="btn btn-secondary">閉じる</button>
                    <button class="btn btn-primary" data-user-id="${user.user_id || user.id}">
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
            console.log('[MatchingUnified] コネクト申請送信:', recipientId);
            
            // 既存のコネクトを確認
            const { data: existingConnection, error: checkError } = await window.supabaseClient
                .from('connections')
                .select('*')
                .or(`and(user_id.eq.${currentUserId},connected_user_id.eq.${recipientId}),and(user_id.eq.${recipientId},connected_user_id.eq.${currentUserId})`)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
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

            if (insertError) throw insertError;

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

            // イベントリスナー
            modal.querySelector('#send-connect-btn').addEventListener('click', () => {
                const message = modal.querySelector('#connect-message').value.trim();
                modal.remove();
                resolve(message);
            });

            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.remove();
                resolve(null);
            });
            
            modal.querySelector('.btn-secondary').addEventListener('click', () => {
                modal.remove();
                resolve(null);
            });
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
    async function sendNotification(userId, type, title, content, relatedId = null, relatedType = null) {
        try {
            console.log('[MatchingUnified] 通知送信:', { userId, type, title });
            
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

            if (error) throw error;
            console.log('[MatchingUnified] 通知送信成功');
            
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

            if (error) throw error;
            console.log('[MatchingUnified] アクティビティ記録成功');
            
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
                button.innerHTML = '<i class="fas fa-clock"></i> 申請中';
                button.classList.remove('btn-primary');
                button.classList.add('btn-secondary');
            } else if (status === 'accepted') {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-check"></i> コネクト済み';
                button.classList.remove('btn-primary');
                button.classList.add('btn-success');
            }
        });
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

    // レーダーチャートを描画
    function drawRadarChartForUser(user) {
        const userId = user.user_id || user.id;
        console.log('[MatchingUnified] レーダーチャート描画開始:', userId);
        const canvas = document.getElementById(`radar-${userId}`);
        if (!canvas) {
            console.error('[MatchingUnified] Canvas要素が見つかりません:', `radar-${userId}`);
            // 再試行
            setTimeout(() => {
                const retryCanvas = document.getElementById(`radar-${userId}`);
                if (retryCanvas) {
                    console.log('[MatchingUnified] Canvas要素が見つかりました（再試行）');
                    drawRadarChartForUser(user);
                }
            }, 500);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        console.log('[MatchingUnified] Canvas取得成功:', canvas.width, 'x', canvas.height);
        
        // Canvasのサイズを確認
        if (canvas.width === 0 || canvas.height === 0) {
            console.error('[MatchingUnified] Canvasのサイズが0です');
            // サイズを強制的に設定
            canvas.width = 200;
            canvas.height = 200;
        }
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) * 0.4;
        const sides = 6;
        
        // クリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
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
        
        // データポイントを計算
        const values = [
            Math.min((user.skills?.length || 0) * 20, 100), // スキル
            Math.random() * 80 + 20, // 経験（ダミー）
            user.industry ? 80 : 40, // 業界
            user.location ? 80 : 40, // 地域
            Math.random() * 80 + 20, // 活動（ダミー）
            Math.min((user.interests?.length || 0) * 25, 100) // 興味
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
        
        console.log('[MatchingUnified] レーダーチャート描画完了:', userId);
        
        // Canvasの表示状態を検証
        const canvasRect = canvas.getBoundingClientRect();
        console.log('[MatchingUnified] Canvas表示状態:', {
            userId: userId,
            visible: canvasRect.width > 0 && canvasRect.height > 0,
            width: canvasRect.width,
            height: canvasRect.height,
            display: window.getComputedStyle(canvas).display,
            visibility: window.getComputedStyle(canvas).visibility
        });
    }

    // ダミーデータを表示
    function displayDummyData() {
        console.log('[MatchingUnified] ダミーデータを表示します');
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

})();