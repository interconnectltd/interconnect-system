// Profile JavaScript
console.log('profile.js loading started');

// 名前空間を使用してグローバル汚染を防ぐ
window.InterConnect = window.InterConnect || {};
console.log('InterConnect namespace:', window.InterConnect);

window.InterConnect.Profile = {
    currentTab: 'about',
    profileData: null,
    isOwnProfile: true, // 自分のプロフィールかどうか
    targetUserId: null, // 表示対象のユーザーID
    currentUserId: null, // ログイン中のユーザーID
    
    // 初期化
    init: async function() {
        console.log('[Profile] 初期化開始...');
        
        // URLパラメータからユーザーIDを取得
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user');
        
        // 現在のユーザーIDを取得
        await this.getCurrentUser();
        
        if (userId && userId !== this.currentUserId) {
            // 他のユーザーのプロフィール
            console.log('[Profile] 他のユーザーのプロフィールを表示:', userId);
            this.isOwnProfile = false;
            this.targetUserId = userId;
            await this.loadOtherUserProfile(userId);
        } else {
            // 自分のプロフィール
            console.log('[Profile] 自分のプロフィールを表示');
            this.isOwnProfile = true;
            this.targetUserId = this.currentUserId;
            await this.loadProfileData();
        }
        
        // UIの初期化
        this.updateUIMode();
        this.initializeTabs();
        this.initializeEditModal();
    },
    
    // 現在のユーザー情報を取得
    getCurrentUser: async function() {
        try {
            if (window.supabase) {
                const { data: { user } } = await window.supabase.auth.getUser();
                if (user) {
                    this.currentUserId = user.id;
                    console.log('[Profile] 現在のユーザーID:', this.currentUserId);
                    return;
                }
            }
            
            // フォールバック: localStorageから取得
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const userData = JSON.parse(userStr);
                this.currentUserId = userData.id;
            }
        } catch (error) {
            console.error('[Profile] ユーザー情報取得エラー:', error);
        }
    },
    
    // 他のユーザーのプロフィールを読み込む
    loadOtherUserProfile: async function(userId) {
        try {
            if (!window.supabase) {
                console.error('[Profile] Supabaseが初期化されていません');
                this.showError('プロフィールを読み込めません');
                return;
            }
            
            // user_profilesテーブルから他のユーザー情報を取得
            const { data, error } = await window.supabase
                .from('user_profiles')
                .select(`
                    *,
                    connection_count
                `)
                .eq('id', userId)
                .eq('is_active', true)
                .single();
            
            if (error) {
                console.error('[Profile] プロフィール取得エラー:', error);
                this.showError('ユーザーが見つかりません');
                return;
            }
            
            if (!data) {
                this.showError('ユーザーが見つかりません');
                return;
            }
            
            console.log('[Profile] 他のユーザーデータ:', data);
            
            // プロフィールデータを設定
            this.profileData = {
                id: data.id,
                name: data.full_name || data.name || 'ユーザー',
                email: data.email,
                company: data.company || '未設定',
                position: data.position || '未設定',
                title: data.title || data.position || '役職未設定',
                profileImage: data.avatar_url || 'assets/user-placeholder.svg',
                industry: data.industry || '未設定',
                skills: data.skills || [],
                bio: data.bio || '',
                connectionCount: data.connection_count || 0,
                isOnline: data.is_online || false,
                lastLoginAt: data.last_login_at
            };
            
            // コネクションステータスを確認
            await this.checkConnectionStatus(userId);
            
            // UIを更新
            this.updateProfileInfo();
            
        } catch (error) {
            console.error('[Profile] プロフィール読み込みエラー:', error);
            this.showError('プロフィールの読み込みに失敗しました');
        }
    },
    
    // コネクションステータスを確認
    checkConnectionStatus: async function(userId) {
        try {
            if (!window.supabase || !this.currentUserId) return;
            
            const { data } = await window.supabase
                .from('connections')
                .select('status')
                .or(`and(requester_id.eq.${this.currentUserId},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${this.currentUserId})`)
                .single();
            
            if (data) {
                this.connectionStatus = data.status;
                console.log('[Profile] コネクションステータス:', this.connectionStatus);
            }
        } catch (error) {
            console.log('[Profile] コネクションステータス確認エラー:', error);
        }
    },
    
    // プロフィールデータの読み込み（自分用）
    loadProfileData: async function() {
        try {
            // まずSupabaseから最新のユーザー情報を取得
            if (window.ProfileSync && window.ProfileSync.sync) {
                console.log('Syncing profile from Supabase...');
                await window.ProfileSync.sync();
            }
            
            // Supabaseから自分のプロフィールデータも取得
            if (window.supabase && this.currentUserId) {
                const { data, error } = await window.supabase
                    .from('user_profiles')
                    .select('*, connection_count')
                    .eq('id', this.currentUserId)
                    .single();
                
                if (data && !error) {
                    console.log('[Profile] 自分のSupabaseデータ:', data);
                    // Supabaseのデータを優先的に使用
                    if (!window.InterConnect.Profile.profileData) {
                        window.InterConnect.Profile.profileData = {};
                    }
                    window.InterConnect.Profile.profileData = {
                        ...window.InterConnect.Profile.profileData,
                        id: data.id,
                        name: data.full_name || data.name || window.InterConnect.Profile.profileData.name,
                        company: data.company || window.InterConnect.Profile.profileData.company,
                        position: data.position || window.InterConnect.Profile.profileData.position,
                        title: data.title || data.position || window.InterConnect.Profile.profileData.title,
                        industry: data.industry || window.InterConnect.Profile.profileData.industry,
                        skills: data.skills || window.InterConnect.Profile.profileData.skills || [],
                        bio: data.bio || window.InterConnect.Profile.profileData.bio,
                        connectionCount: data.connection_count || 0,
                        isOnline: data.is_online || false
                    };
                }
            }
            
            // localStorageからユーザー情報を取得
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const userData = JSON.parse(userStr);
                    console.log('User data from sync:', userData);
                    
                    // プロフィールデータの初期化
                    if (!window.InterConnect.Profile.profileData) {
                        window.InterConnect.Profile.profileData = {};
                    }
                    
                    // Supabaseのデータでプロフィールを更新
                    window.InterConnect.Profile.profileData.name = userData.name || userData.display_name || '';
                    window.InterConnect.Profile.profileData.email = userData.email || '';
                    if (userData.picture || userData.picture_url) {
                        window.InterConnect.Profile.profileData.profileImage = userData.picture || userData.picture_url;
                    }
                } catch (e) {
                    console.error('Failed to parse user data:', e);
                }
            }
            
            // 既存のプロフィールデータも読み込む（追加情報用）
            const savedData = window.safeLocalStorage ? 
                window.safeLocalStorage.getJSON('userProfile', null) : 
                null;
            
            if (savedData) {
                // 既存データとマージ（Supabaseのデータを優先）
                window.InterConnect.Profile.profileData = {
                    ...savedData,
                    ...window.InterConnect.Profile.profileData
                };
                
                // デバッグ: 詳細フィールドの確認
                console.log('Loaded profile data:', window.InterConnect.Profile.profileData);
                console.log('revenue-details:', window.InterConnect.Profile.profileData['revenue-details']);
                console.log('hr-details:', window.InterConnect.Profile.profileData['hr-details']);
                console.log('dx-details:', window.InterConnect.Profile.profileData['dx-details']);
                console.log('strategy-details:', window.InterConnect.Profile.profileData['strategy-details']);
            }
            
            window.InterConnect.Profile.updateProfileInfo();
            
        } catch (error) {
            console.error('プロフィールデータの読み込みエラー:', error);
        }
    },
    
    // UIモードの更新
    updateUIMode: function() {
        const editButton = document.querySelector('.profile-details .btn-primary');
        
        if (this.isOwnProfile) {
            // 自分のプロフィール
            if (editButton) {
                editButton.textContent = 'プロフィールを編集';
                editButton.onclick = () => this.openEditModal();
            }
        } else {
            // 他人のプロフィール
            if (editButton) {
                if (this.connectionStatus === 'accepted') {
                    editButton.textContent = 'メッセージを送る';
                    editButton.onclick = () => this.sendMessage();
                } else if (this.connectionStatus === 'pending') {
                    editButton.textContent = '申請中';
                    editButton.disabled = true;
                } else {
                    editButton.textContent = 'コネクト申請';
                    editButton.onclick = () => this.sendConnectionRequest();
                }
            }
        }
    },
    
    // コネクト申請を送る
    sendConnectionRequest: async function() {
        try {
            if (!window.supabase || !this.currentUserId || !this.targetUserId) {
                alert('ログインが必要です');
                return;
            }
            
            const { error } = await window.supabase
                .from('connections')
                .insert({
                    requester_id: this.currentUserId,
                    receiver_id: this.targetUserId,
                    status: 'pending',
                    message: 'コネクトさせていただければ幸いです。',
                    created_at: new Date().toISOString()
                });
            
            if (error) throw error;
            
            alert('コネクト申請を送信しました');
            this.connectionStatus = 'pending';
            this.updateUIMode();
            
        } catch (error) {
            console.error('[Profile] コネクト申請エラー:', error);
            alert('コネクト申請の送信に失敗しました');
        }
    },
    
    // メッセージを送る
    sendMessage: function() {
        // メッセージページへ遷移
        window.location.href = `messages.html?user=${this.targetUserId}`;
    },
    
    // エラー表示
    showError: function(message) {
        const container = document.querySelector('.profile-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 1rem;"></i>
                    <h2 style="color: #dc3545; margin-bottom: 0.5rem;">エラー</h2>
                    <p style="color: #6c757d;">${message}</p>
                    <a href="members.html" class="btn btn-primary" style="margin-top: 1rem;">メンバー一覧へ戻る</a>
                </div>
            `;
        }
    },
    
    // プロフィール情報の更新
    updateProfileInfo: function() {
        console.log('updateProfileInfo called');
        const data = window.InterConnect.Profile.profileData;
        console.log('Profile data:', data);
        
        if (!data) {
            console.log('No profile data found');
            return;
        }
        
        // ユーザー名
        const userNameElements = document.querySelectorAll('.user-name, .profile-details h2');
        console.log('User name elements found:', userNameElements.length);
        userNameElements.forEach(el => {
            if (el) el.textContent = data.name || 'ユーザー名';
        });
        
        // 会社名
        const companyElement = document.querySelector('.profile-company');
        if (companyElement) companyElement.textContent = data.company || '会社名';
        
        // 役職
        const positionElement = document.querySelector('.profile-title');
        if (positionElement) positionElement.textContent = data.title || data.position || '役職・肩書き';
        
        // 統計情報の更新
        this.updateProfileStats(data);
        
        // オンラインステータスの更新
        if (!this.isOwnProfile && data.isOnline !== undefined) {
            const onlineIndicator = document.querySelector('.online-indicator');
            if (onlineIndicator) {
                onlineIndicator.style.display = data.isOnline ? 'block' : 'none';
            }
        }
        
        // プロフィール画像の更新
        if (data.profileImage) {
            // プロフィールページのアバター画像
            const profileAvatar = document.querySelector('.profile-avatar img');
            if (profileAvatar) {
                profileAvatar.src = data.profileImage;
                profileAvatar.onerror = function() {
                    this.src = 'assets/user-placeholder.svg';
                };
                console.log('Profile avatar updated:', data.profileImage);
            }
            
            // ヘッダーのユーザーアバター
            const headerAvatar = document.querySelector('.user-menu-btn img');
            if (headerAvatar) {
                headerAvatar.src = data.profileImage;
                console.log('Header avatar updated:', data.profileImage);
            }
        }
        
        // カバー画像の更新
        if (data.coverImage) {
            const coverImg = document.querySelector('.profile-cover img');
            if (coverImg) {
                coverImg.src = data.coverImage;
                console.log('Cover image updated:', data.coverImage);
            }
        }
        
        // 基本情報タブの内容を更新
        this.updateAboutTab();
        
        // スキルタブの更新
        this.updateSkillsTab();
        
        // プロジェクトタブの更新
        this.updateProjectsTab();
        
        // コネクションタブの更新
        this.updateConnectionsTab();
    },
    
    // タブの初期化
    initializeTabs: function() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // アクティブクラスの切り替え
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // タブコンテンツの表示切り替え
                tabContents.forEach(content => {
                    if (content.getAttribute('data-tab') === targetTab) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
                
                window.InterConnect.Profile.currentTab = targetTab;
            });
        });
    },
    
    // 編集モーダルの初期化
    initializeEditModal: function() {
        if (!this.isOwnProfile) return; // 他人のプロフィールでは初期化しない
        
        // 編集ボタンのクリックイベント
        const editButton = document.querySelector('.profile-details .btn-primary');
        if (editButton) {
            editButton.addEventListener('click', () => {
                window.InterConnect.Profile.openEditModal();
            });
        }
        
        // モーダルの閉じるボタン
        const closeButtons = document.querySelectorAll('[data-close-modal]');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                window.InterConnect.Profile.closeEditModal();
            });
        });
        
        // 保存ボタン
        const saveButton = document.getElementById('saveProfile');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                window.InterConnect.Profile.saveProfile();
            });
        }
        
        // ファイル入力の処理
        const avatarInput = document.getElementById('avatarInput');
        const coverInput = document.getElementById('coverInput');
        
        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => {
                window.InterConnect.Profile.handleImageUpload(e, 'avatar');
            });
        }
        
        if (coverInput) {
            coverInput.addEventListener('change', (e) => {
                window.InterConnect.Profile.handleImageUpload(e, 'cover');
            });
        }
    },
    
    // 編集モーダルを開く
    openEditModal: function() {
        const modal = document.getElementById('editProfileModal');
        if (!modal) return;
        
        // 現在のデータをフォームに反映
        const data = window.InterConnect.Profile.profileData || {};
        
        // 各フィールドに値を設定
        const nameInput = document.getElementById('profileName');
        if (nameInput) nameInput.value = data.name || '';
        
        const companyInput = document.getElementById('profileCompany');
        if (companyInput) companyInput.value = data.company || '';
        
        const positionInput = document.getElementById('profilePosition');
        if (positionInput) positionInput.value = data.position || '';
        
        const bioInput = document.getElementById('profileBio');
        if (bioInput) bioInput.value = data.bio || '';
        
        // モーダルを表示
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
    },
    
    // 編集モーダルを閉じる
    closeEditModal: function() {
        const modal = document.getElementById('editProfileModal');
        if (!modal) return;
        
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    },
    
    // プロフィールを保存
    saveProfile: function() {
        console.log('saveProfile called');
        
        // フォームからデータを取得
        const nameInput = document.getElementById('profileName');
        const companyInput = document.getElementById('profileCompany');
        const positionInput = document.getElementById('profilePosition');
        const bioInput = document.getElementById('profileBio');
        
        if (!window.InterConnect.Profile.profileData) {
            window.InterConnect.Profile.profileData = {};
        }
        
        // データを更新
        if (nameInput) window.InterConnect.Profile.profileData.name = nameInput.value;
        if (companyInput) window.InterConnect.Profile.profileData.company = companyInput.value;
        if (positionInput) window.InterConnect.Profile.profileData.position = positionInput.value;
        if (bioInput) window.InterConnect.Profile.profileData.bio = bioInput.value;
        
        // localStorageに保存
        if (window.safeLocalStorage) {
            window.safeLocalStorage.setJSON('userProfile', window.InterConnect.Profile.profileData);
            console.log('Profile saved to localStorage');
        }
        
        // UIを更新
        window.InterConnect.Profile.updateProfileInfo();
        
        // モーダルを閉じる
        window.InterConnect.Profile.closeEditModal();
        
        // 成功メッセージ
        alert('プロフィールを更新しました');
    },
    
    // 画像アップロードの処理
    handleImageUpload: function(event, type) {
        const file = event.target.files[0];
        if (!file) return;
        
        // ファイルサイズチェック（5MB以下）
        if (file.size > 5 * 1024 * 1024) {
            alert('ファイルサイズは5MB以下にしてください');
            return;
        }
        
        // 画像ファイルチェック
        if (!file.type.startsWith('image/')) {
            alert('画像ファイルを選択してください');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            if (!window.InterConnect.Profile.profileData) {
                window.InterConnect.Profile.profileData = {};
            }
            
            if (type === 'avatar') {
                window.InterConnect.Profile.profileData.profileImage = e.target.result;
                // プレビュー更新
                const preview = document.querySelector('.avatar-preview');
                if (preview) preview.style.backgroundImage = `url(${e.target.result})`;
            } else if (type === 'cover') {
                window.InterConnect.Profile.profileData.coverImage = e.target.result;
                // プレビュー更新
                const preview = document.querySelector('.cover-preview');
                if (preview) preview.style.backgroundImage = `url(${e.target.result})`;
            }
        };
        reader.readAsDataURL(file);
    },
    
    // 基本情報タブの更新
    updateAboutTab: function() {
        console.log('updateAboutTab called');
        const data = window.InterConnect.Profile.profileData;
        if (!data) return;
        
        // 各フィールドを更新
        const bioElement = document.getElementById('profileBioDisplay');
        if (bioElement) bioElement.textContent = data.bio || '自己紹介が登録されていません。';
        
        // 売上情報の更新
        const revenueDetailElement = document.getElementById('revenueDetailText');
        if (revenueDetailElement) {
            const revenueDetail = data['revenue-details'] || '詳細情報なし';
            console.log('Setting revenue detail:', revenueDetail);
            revenueDetailElement.textContent = revenueDetail;
        }
        
        // 人事課題の更新
        const hrDetailElement = document.getElementById('hrDetailText');
        if (hrDetailElement) {
            const hrDetail = data['hr-details'] || '詳細情報なし';
            console.log('Setting HR detail:', hrDetail);
            hrDetailElement.textContent = hrDetail;
        }
        
        // DX推進状況の更新
        const dxDetailElement = document.getElementById('dxDetailText');
        if (dxDetailElement) {
            const dxDetail = data['dx-details'] || '詳細情報なし';
            console.log('Setting DX detail:', dxDetail);
            dxDetailElement.textContent = dxDetail;
        }
        
        // 経営戦略の更新
        const strategyDetailElement = document.getElementById('strategyDetailText');
        if (strategyDetailElement) {
            const strategyDetail = data['strategy-details'] || '詳細情報なし';
            console.log('Setting strategy detail:', strategyDetail);
            strategyDetailElement.textContent = strategyDetail;
        }
    },
    
    // スキルタブの更新
    updateSkillsTab: function() {
        const data = window.InterConnect.Profile.profileData;
        if (!data || !data.skills) return;
        
        const skillsContainer = document.querySelector('.skills-grid');
        if (!skillsContainer) return;
        
        // スキルを表示
        skillsContainer.innerHTML = data.skills.map(skill => `
            <div class="skill-item">
                <i class="fas fa-check-circle"></i>
                <span>${skill}</span>
            </div>
        `).join('');
    },
    
    // プロジェクトタブの更新
    updateProjectsTab: function() {
        // 実装予定
    },
    
    // コネクションタブの更新
    updateConnectionsTab: function() {
        // 実装予定
    },
    
    // プロフィール統計情報の更新
    updateProfileStats: function(data) {
        console.log('[Profile] 統計情報更新:', data);
        
        // コネクション数
        const connectionCountEl = document.querySelector('.stat-value.connection-count');
        if (connectionCountEl && data.connectionCount !== undefined) {
            connectionCountEl.textContent = data.connectionCount;
        }
        
        // メッセージ数（今は固定値）
        const messageCountEl = document.querySelector('.stat-value.message-count');
        if (messageCountEl) {
            messageCountEl.textContent = data.messageCount || 0;
        }
        
        // マッチング率（今は固定値）
        const matchingRateEl = document.querySelector('.stat-value.matching-rate');
        if (matchingRateEl) {
            matchingRateEl.textContent = data.matchingRate || '0%';
        }
    }
};

// DOMContentLoadedイベントでプロフィール機能を初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded - initializing profile');
    
    // Supabaseの準備を待つ
    function initWhenReady() {
        if (window.supabase) {
            window.InterConnect.Profile.init();
        } else {
            window.addEventListener('supabaseReady', () => {
                window.InterConnect.Profile.init();
            });
            // フォールバック
            setTimeout(() => {
                if (!window.InterConnect.Profile.profileData) {
                    window.InterConnect.Profile.init();
                }
            }, 1000);
        }
    }
    
    initWhenReady();
});

console.log('profile.js loaded successfully');