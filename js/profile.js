// Profile JavaScript
// console.log('profile.js loading started');

// 名前空間を使用してグローバル汚染を防ぐ
window.InterConnect = window.InterConnect || {};
// console.log('InterConnect namespace:', window.InterConnect);

window.InterConnect.Profile = {
    currentTab: 'about',
    profileData: null,
    isOwnProfile: true, // 自分のプロフィールかどうか
    targetUserId: null, // 表示対象のユーザーID
    currentUserId: null, // ログイン中のユーザーID
    profileCache: {}, // プロフィールデータのキャッシュ
    cacheExpiry: 5 * 60 * 1000, // 5分間のキャッシュ
    isLoading: false, // ローディング状態
    initialized: false, // 初期化済みフラグ
    
    // 初期化
    init: async function() {
        // console.log('[Profile] 初期化開始...');
        // console.log('[Profile] 現在のURL:', window.location.href);
        // console.log('[Profile] URLパラメータ:', window.location.search);
        
        // 重複初期化を防ぐ
        if (this.initialized || this.isLoading) {
            // console.log('[Profile] 既に初期化済みまたは初期化中');
            return;
        }
        
        this.isLoading = true;
        this.showLoadingState();
        
        try {
            // URLパラメータからユーザーIDを取得
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('user');
            // console.log('[Profile] URLから取得したユーザーID:', userId);
            
            // 現在のユーザーIDを取得
            await this.getCurrentUser();
            // console.log('[Profile] 現在のユーザーID:', this.currentUserId);
        
        if (userId) {
            // userパラメータが指定されている場合
            if (userId !== this.currentUserId) {
                // 他のユーザーのプロフィール
                // console.log('[Profile] 他のユーザーのプロフィールを表示:', userId);
                this.isOwnProfile = false;
                this.targetUserId = userId;
                await this.loadOtherUserProfile(userId);
            } else {
                // 自分のプロフィール（userパラメータで指定された場合）
                // console.log('[Profile] 自分のプロフィールを表示 (userパラメータ指定)');
                this.isOwnProfile = true;
                this.targetUserId = this.currentUserId;
                await this.loadProfileData();
            }
        } else {
            // userパラメータがない場合は自分のプロフィール
            // console.log('[Profile] 自分のプロフィールを表示 (デフォルト)');
            this.isOwnProfile = true;
            this.targetUserId = this.currentUserId;
            await this.loadProfileData();
        }
        
            // UIの初期化
            this.updateUIMode();
            this.initializeTabs();
            this.initializeEditModal();
            
            this.initialized = true;
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    },
    
    // 現在のユーザー情報を取得
    getCurrentUser: async function() {
        try {
            if (window.supabaseClient || window.supabase) {
                const client = window.supabaseClient || window.supabase;
                // authが存在するか確認
                if (client && client.auth && typeof client.auth.getUser === 'function') {
                    const { data: { user } } = await client.auth.getUser();
                    if (user) {
                        this.currentUserId = user.id;
                        // console.log('[Profile] 現在のユーザーID:', this.currentUserId);
                        return;
                    }
                } else {
                    console.warn('[Profile] Supabase auth not available, using localStorage');
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
        // console.log('[Profile] loadOtherUserProfile開始:', userId);
        try {
            // SQLインジェクション対策：UUIDの検証
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(userId)) {
                console.error('[Profile] 無効なユーザーID:', userId);
                this.showError('無効なユーザーIDです');
                return;
            }
            
            // キャッシュをチェック
            const cached = this.getFromCache(userId);
            if (cached) {
                // console.log('[Profile] キャッシュからデータを使用:', userId);
                this.profileData = cached;
                await this.checkConnectionStatus(userId);
                this.updateProfileInfo();
                return;
            }
            
            const client = window.supabaseClient || window.supabase;
            if (!client || typeof client.from !== 'function') {
                console.error('[Profile] Supabaseが初期化されていません');
                // フォールバック：localStorageから基本情報を取得
                this.showFallbackProfile(userId);
                return;
            }
            
            // user_profilesテーブルから他のユーザー情報を取得（公開情報のみ）
            const { data, error } = await client
                .from('profiles')
                .select(`
                    id,
                    name,
                    full_name,
                    email,
                    company,
                    position,
                    avatar_url,
                    industry,
                    skills,
                    bio,
                    is_online,
                    last_login_at
                `)
                .eq('id', userId)
                .eq('is_active', true)
                .single();
            
            if (error) {
                console.error('[Profile] プロフィール取得エラー:', error);
                console.error('[Profile] エラー詳細:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                this.showError('ユーザーが見つかりません');
                return;
            }
            
            if (!data) {
                this.showError('ユーザーが見つかりません');
                return;
            }
            
            // console.log('[Profile] 他のユーザーデータ:', data);
            
            // プロフィールデータを設定
            this.profileData = {
                id: data.id,
                name: data.full_name || data.name || 'ユーザー',
                email: data.email,
                company: data.company || '未設定',
                position: data.position || '未設定',
                title: data.position || '役職未設定', // titleカラムは存在しないのでpositionを使用
                profileImage: data.avatar_url || 'assets/user-placeholder.svg',
                industry: data.industry || '未設定',
                skills: data.skills || [],
                bio: data.bio || '',
                connectionCount: 0, // 後で別途取得
                isOnline: data.is_online || false,
                lastLoginAt: data.last_login_at
            };
            
            // コネクション数を別途取得
            await this.loadConnectionCount(userId);
            
            // キャッシュに保存
            this.saveToCache(userId, this.profileData);
            
            // コネクションステータスを確認
            await this.checkConnectionStatus(userId);
            
            // UIを更新
            this.updateProfileInfo();
            
        } catch (error) {
            console.error('[Profile] プロフィール読み込みエラー:', error);
            this.showError('プロフィールの読み込みに失敗しました');
        }
    },
    
    // コネクション数を取得
    loadConnectionCount: async function(userId) {
        try {
            if (!window.supabaseClient) return;
            
            const { data, error } = await window.supabaseClient
                .from('connections')
                .select('id')
                .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`)
                .eq('status', 'accepted');
            
            if (!error && data) {
                this.profileData.connectionCount = data.length;
                // console.log('[Profile] コネクション数:', data.length);
            }
        } catch (error) {
            console.error('[Profile] コネクション数取得エラー:', error);
        }
    },
    
    // コネクションステータスを確認
    checkConnectionStatus: async function(userId) {
        try {
            if (!window.supabaseClient || !this.currentUserId) return;
            
            const { data } = await window.supabaseClient
                .from('connections')
                .select('status')
                .or(`user_id.eq.${this.currentUserId},connected_user_id.eq.${this.currentUserId}`)
                .eq('user_id', userId)
                .eq('connected_user_id', userId)
                .single();
            
            if (data) {
                this.connectionStatus = data.status;
                // console.log('[Profile] コネクションステータス:', this.connectionStatus);
            }
        } catch (error) {
            // console.log('[Profile] コネクションステータス確認エラー:', error);
        }
    },
    
    // プロフィールデータの読み込み（自分用）
    loadProfileData: async function() {
        try {
            // まずSupabaseから最新のユーザー情報を取得
            if (window.ProfileSync && window.ProfileSync.sync) {
                // console.log('Syncing profile from Supabase...');
                await window.ProfileSync.sync();
            }
            
            // Supabaseから自分のプロフィールデータも取得
            if (window.supabaseClient && this.currentUserId) {
                const { data, error } = await window.supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', this.currentUserId)
                    .single();
                
                if (data && !error) {
                    // console.log('[Profile] 自分のSupabaseデータ:', data);
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
                        title: data.position || window.InterConnect.Profile.profileData.title, // titleカラムは存在しない
                        industry: data.industry || window.InterConnect.Profile.profileData.industry,
                        skills: data.skills || window.InterConnect.Profile.profileData.skills || [],
                        bio: data.bio || window.InterConnect.Profile.profileData.bio,
                        connectionCount: 0, // 後で別途取得
                        isOnline: data.is_online || false
                    };
                }
            }
            
            // localStorageからユーザー情報を取得
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const userData = JSON.parse(userStr);
                    // console.log('User data from sync:', userData);
                    
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
                // console.log('Loaded profile data:', window.InterConnect.Profile.profileData);
                // console.log('revenue-details:', window.InterConnect.Profile.profileData['revenue-details']);
                // console.log('hr-details:', window.InterConnect.Profile.profileData['hr-details']);
                // console.log('dx-details:', window.InterConnect.Profile.profileData['dx-details']);
                // console.log('strategy-details:', window.InterConnect.Profile.profileData['strategy-details']);
            }
            
            // コネクション数を取得
            if (this.currentUserId) {
                await this.loadConnectionCount(this.currentUserId);
            }
            
            window.InterConnect.Profile.updateProfileInfo();
            
        } catch (error) {
            console.error('プロフィールデータの読み込みエラー:', error);
        }
    },
    
    // UIモードの更新
    updateUIMode: function() {
        // console.log('[Profile] UIモード更新 - isOwnProfile:', this.isOwnProfile);
        // console.log('[Profile] targetUserId:', this.targetUserId);
        // console.log('[Profile] connectionStatus:', this.connectionStatus);
        
        const editAvatarBtn = document.querySelector('.btn-edit-avatar');
        const editCoverBtn = document.querySelector('.btn-edit-cover');
        
        if (this.isOwnProfile) {
            // 自分のプロフィール
            // 編集ボタンを表示
            if (editAvatarBtn) editAvatarBtn.style.display = 'flex';
            if (editCoverBtn) editCoverBtn.style.display = 'flex';
        } else {
            // 他人のプロフィール
            // すべての編集ボタンを非表示
            if (editAvatarBtn) editAvatarBtn.style.display = 'none';
            if (editCoverBtn) editCoverBtn.style.display = 'none';
        }
    },
    
    // コネクト申請を送る
    sendConnectionRequest: async function() {
        try {
            if (!window.supabaseClient || !this.currentUserId || !this.targetUserId) {
                // alert('ログインが必要です');
                if (window.showError) {
                    showError('ログインが必要です');
                }
                return;
            }
            
            const { error } = await window.supabaseClient
                .from('connections')
                .insert({
                    user_id: this.currentUserId,
                    connected_user_id: this.targetUserId,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
            
            if (error) throw error;
            
            // alert('コネクト申請を送信しました');
            if (window.showSuccess) {
                showSuccess('コネクト申請を送信しました');
            }
            this.connectionStatus = 'pending';
            this.updateUIMode();
            
        } catch (error) {
            console.error('[Profile] コネクト申請エラー:', error);
            // alert('コネクト申請の送信に失敗しました');
            if (window.showError) {
                showError('コネクト申請の送信に失敗しました');
            }
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
        // console.log('updateProfileInfo called');
        const data = window.InterConnect.Profile.profileData;
        // console.log('Profile data:', data);
        
        if (!data) {
            // console.log('No profile data found');
            return;
        }
        
        // ユーザー名
        const userNameElements = document.querySelectorAll('.user-name, .profile-details h2');
        // console.log('User name elements found:', userNameElements.length);
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
                // console.log('Profile avatar updated:', data.profileImage);
            }
            
            // ヘッダーのユーザーアバター
            const headerAvatar = document.querySelector('.user-menu-btn img');
            if (headerAvatar) {
                headerAvatar.src = data.profileImage;
                headerAvatar.onerror = function() {
                    this.src = 'assets/user-placeholder.svg';
                };
                // console.log('Header avatar updated:', data.profileImage);
            }
        }
        
        // カバー画像の更新
        if (data.coverImage) {
            const coverImg = document.querySelector('.profile-cover img');
            if (coverImg) {
                coverImg.src = data.coverImage;
                coverImg.onerror = function() {
                    this.style.display = 'none';
                };
                // console.log('Cover image updated:', data.coverImage);
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
    saveProfile: async function() {
        // console.log('saveProfile called');
        
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
        
        // Supabaseに保存
        if (window.supabaseClient && this.currentUserId) {
            try {
                const updateData = {
                    name: window.InterConnect.Profile.profileData.name,
                    full_name: window.InterConnect.Profile.profileData.name, // full_nameも更新
                    company: window.InterConnect.Profile.profileData.company,
                    position: window.InterConnect.Profile.profileData.position,
                    bio: window.InterConnect.Profile.profileData.bio,
                    updated_at: new Date().toISOString()
                };
                
                const { error } = await window.supabaseClient
                    .from('profiles')
                    .update(updateData)
                    .eq('id', this.currentUserId);
                    
                if (error) {
                    console.error('[Profile] Supabase更新エラー:', error);
                    // エラーでもlocalStorageには保存する
                } else {
                    // console.log('[Profile] Supabaseに正常に保存されました');
                }
            } catch (error) {
                console.error('[Profile] 保存処理エラー:', error);
            }
        }
        
        // localStorageにも保存（バックアップ）
        if (window.safeLocalStorage) {
            window.safeLocalStorage.setJSON('userProfile', window.InterConnect.Profile.profileData);
            // console.log('Profile saved to localStorage');
        }
        
        // UIを更新
        window.InterConnect.Profile.updateProfileInfo();
        
        // モーダルを閉じる
        window.InterConnect.Profile.closeEditModal();
        
        // 成功メッセージ
        // alert('プロフィールを更新しました');
        if (window.showSuccess) {
            showSuccess('プロフィールを更新しました');
        }
    },
    
    // 画像アップロードの処理
    handleImageUpload: function(event, type) {
        const file = event.target.files[0];
        if (!file) return;
        
        // ファイルサイズチェック（5MB以下）
        if (file.size > 5 * 1024 * 1024) {
            // alert('ファイルサイズは5MB以下にしてください');
            if (window.showError) {
                showError('ファイルサイズは5MB以下にしてください');
            }
            return;
        }
        
        // 画像ファイルチェック
        if (!file.type.startsWith('image/')) {
            // alert('画像ファイルを選択してください');
            if (window.showError) {
                showError('画像ファイルを選択してください');
            }
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
        // console.log('updateAboutTab called');
        const data = window.InterConnect.Profile.profileData;
        if (!data) return;
        
        // 各フィールドを更新
        const bioElement = document.getElementById('profileBioDisplay');
        if (bioElement) bioElement.textContent = data.bio || '自己紹介が登録されていません。';
        
        // 売上情報の更新
        const revenueDetailElement = document.getElementById('revenueDetailText');
        if (revenueDetailElement) {
            const revenueDetail = data['revenue-details'] || '詳細情報なし';
            // console.log('Setting revenue detail:', revenueDetail);
            revenueDetailElement.textContent = revenueDetail;
        }
        
        // 人事課題の更新
        const hrDetailElement = document.getElementById('hrDetailText');
        if (hrDetailElement) {
            const hrDetail = data['hr-details'] || '詳細情報なし';
            // console.log('Setting HR detail:', hrDetail);
            hrDetailElement.textContent = hrDetail;
        }
        
        // DX推進状況の更新
        const dxDetailElement = document.getElementById('dxDetailText');
        if (dxDetailElement) {
            const dxDetail = data['dx-details'] || '詳細情報なし';
            // console.log('Setting DX detail:', dxDetail);
            dxDetailElement.textContent = dxDetail;
        }
        
        // 経営戦略の更新
        const strategyDetailElement = document.getElementById('strategyDetailText');
        if (strategyDetailElement) {
            const strategyDetail = data['strategy-details'] || '詳細情報なし';
            // console.log('Setting strategy detail:', strategyDetail);
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
        // console.log('[Profile] 統計情報更新:', data);
        
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
    },
    
    // キャッシュから取得
    getFromCache: function(userId) {
        const cached = this.profileCache[userId];
        if (cached && (Date.now() - cached.timestamp < this.cacheExpiry)) {
            return cached.data;
        }
        // 期限切れの場合は削除
        if (cached) {
            delete this.profileCache[userId];
        }
        return null;
    },
    
    // キャッシュに保存
    saveToCache: function(userId, data) {
        this.profileCache[userId] = {
            data: data,
            timestamp: Date.now()
        };
    },
    
    // キャッシュをクリア
    clearCache: function() {
        this.profileCache = {};
    },
    
    // ローディング状態を表示
    showLoadingState: function() {
        const container = document.querySelector('.profile-container');
        if (container && !container.querySelector('.loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>プロフィールを読み込んでいます...</p>
                </div>
            `;
            container.appendChild(overlay);
        }
    },
    
    // ローディング状態を非表示
    hideLoadingState: function() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    },
    
    // フォールバックプロフィール表示
    showFallbackProfile: function(userId) {
        // console.log('[Profile] フォールバックモードでプロフィール表示');
        
        // エラーバナーを表示
        const container = document.querySelector('.content-container');
        if (container && !container.querySelector('.warning-banner')) {
            const warningBanner = document.createElement('div');
            warningBanner.className = 'warning-banner';
            warningBanner.innerHTML = `
                <div class="warning-content">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>データベースに接続できません。一部の情報が表示されない可能性があります。</span>
                    <button class="btn btn-small btn-outline" onclick="window.location.reload()">
                        再読み込み
                    </button>
                </div>
            `;
            container.insertBefore(warningBanner, container.firstChild);
        }
        
        // 基本的なダミーデータを設定
        this.profileData = {
            id: userId,
            name: 'ユーザー情報を読み込み中...',
            company: '---',
            position: '---',
            title: '---',
            profileImage: 'assets/user-placeholder.svg',
            skills: [],
            bio: 'プロフィール情報を読み込めませんでした。',
            connectionCount: 0,
            isOnline: false
        };
        
        this.updateProfileInfo();
    }
};

// DOMContentLoadedイベントでプロフィール機能を初期化
document.addEventListener('DOMContentLoaded', function() {
    // console.log('DOMContentLoaded - initializing profile');
    // console.log('現在のURL:', window.location.href);
    // console.log('URLパラメータ:', window.location.search);
    
    // URLパラメータを早期に確認
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    // console.log('userパラメータ:', userParam);
    
    // Supabaseの準備を待つ
    function initWhenReady() {
        if (window.supabaseClient) {
            // console.log('Supabase準備完了、初期化開始');
            window.InterConnect.Profile.init();
        } else {
            // console.log('Supabase未準備、イベント待機');
            window.addEventListener('supabaseReady', () => {
                // console.log('supabaseReadyイベント受信、初期化開始');
                window.InterConnect.Profile.init();
            });
            // フォールバック
            setTimeout(() => {
                if (!window.InterConnect.Profile.initialized) {
                    // console.log('タイムアウトによる初期化');
                    window.InterConnect.Profile.init();
                }
            }, 1000);
        }
    }
    
    initWhenReady();
});

// console.log('profile.js loaded successfully');
// Cache buster: 1753750334
