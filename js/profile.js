// Profile JavaScript
console.log('profile.js loading started');

// 名前空間を使用してグローバル汚染を防ぐ
window.InterConnect = window.InterConnect || {};
console.log('InterConnect namespace:', window.InterConnect);

window.InterConnect.Profile = {
    currentTab: 'about',
    profileData: null,
    
    // プロフィールデータの読み込み
    loadProfileData: async function() {
        try {
            // まずSupabaseから最新のユーザー情報を取得
            if (window.ProfileSync && window.ProfileSync.sync) {
                console.log('Syncing profile from Supabase...');
                await window.ProfileSync.sync();
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
        if (positionElement) positionElement.textContent = data.position || '役職・肩書き';
        
        // プロフィール画像の更新
        if (data.profileImage) {
            // プロフィールページのアバター画像
            const profileAvatar = document.querySelector('.profile-avatar img');
            if (profileAvatar) {
                profileAvatar.src = data.profileImage;
                profileAvatar.onerror = function() {
                    this.src = 'assets/user-placeholder.svg';
                };
            }
            
            // ヘッダーのユーザーアイコン
            const headerUserImg = document.querySelector('.user-menu-btn img');
            if (headerUserImg) {
                headerUserImg.src = data.profileImage;
                headerUserImg.onerror = function() {
                    this.src = 'assets/user-placeholder.svg';
                };
            }
        }
        
        // カバー画像の更新
        if (data.coverImage) {
            const coverImg = document.querySelector('.profile-cover img');
            if (coverImg) {
                coverImg.src = data.coverImage;
                coverImg.onerror = function() {
                    this.src = 'assets/user-placeholder.svg';
                };
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('Profile page initialization started');
        
        // プロフィールデータを読み込む
        window.InterConnect.Profile.loadProfileData();
        
        // Tab functionality
        const tabBtns = document.querySelectorAll('.tab-btn');
        const profileContent = document.querySelector('.profile-content');
        
        console.log('Tab buttons found:', tabBtns.length);
        console.log('Profile content element:', profileContent);
    
    // Initialize with default tab content
    if (profileContent) {
        console.log('Loading default tab content');
        window.loadTabContent('about');
    } else {
        console.error('Profile content element not found');
    }
    
    // Tab click handlers
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Update active state
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Load tab content
            window.loadTabContent(tabName);
        });
    });
    
    // Profile edit buttons
    const editProfileBtn = document.querySelector('.btn-primary');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            window.InterConnect.Profile.openEditModal();
        });
    }
    
    // Avatar and cover edit buttons
    const editAvatarBtn = document.querySelector('.btn-edit-avatar');
    const editCoverBtn = document.querySelector('.btn-edit-cover');
    
    if (editAvatarBtn) {
        editAvatarBtn.addEventListener('click', function() {
            window.InterConnect.Profile.openAvatarModal();
        });
    }
    
    if (editCoverBtn) {
        editCoverBtn.addEventListener('click', function() {
            window.InterConnect.Profile.openCoverModal();
        });
    }
    
    // Image upload handlers
    const coverUpload = document.getElementById('cover-upload');
    const avatarUpload = document.getElementById('avatar-upload');
    
    if (coverUpload) {
        coverUpload.addEventListener('change', function(e) {
            window.InterConnect.Profile.handleImagePreview(e, 'cover-preview');
        });
    }
    
    if (avatarUpload) {
        avatarUpload.addEventListener('change', function(e) {
            window.InterConnect.Profile.handleImagePreview(e, 'avatar-preview');
        });
    }
    } catch (error) {
        console.error('Error in profile initialization:', error);
        console.error('Error stack:', error.stack);
    }
});

// Load tab content - グローバルスコープに定義
window.loadTabContent = function(tabName) {
    console.log('loadTabContent called with:', tabName);
    
    const profileContent = document.querySelector('.profile-content');
    if (!profileContent) {
        console.error('Profile content element not found in loadTabContent');
        return;
    }
    
    // タブ名の検証
    const validTabs = ['about', 'experience', 'skills', 'interests', 'challenges'];
    if (!validTabs.includes(tabName)) {
        console.error('Invalid tab name:', tabName);
        return;
    }
    
    // 現在のタブを更新
    window.InterConnect.Profile.currentTab = tabName;
    
    let content = '';
    let profileData;
    
    try {
        switch(tabName) {
        case 'about':
            profileData = window.InterConnect.Profile.profileData;
            content = `
                <div class="profile-section">
                    <h3 class="section-title">
                        自己紹介
                        <button class="btn btn-text">編集</button>
                    </h3>
                    <div class="about-content">
                        <p>ビジネスイノベーションに情熱を持つ経営者です。テクノロジーを活用した新しいビジネスモデルの創造に取り組んでいます。</p>
                        <p>専門分野：AI、IoT、ブロックチェーン、DX推進</p>
                    </div>
                </div>
                
                <div class="profile-section">
                    <h3 class="section-title">連絡先情報</h3>
                    <div class="contact-info">
                        <div class="contact-item">
                            <i class="fas fa-envelope"></i>
                            <div class="contact-details">
                                <div class="contact-label">メールアドレス</div>
                                <div class="contact-value">${profileData && profileData.email ? window.InterConnect.Profile.escapeHtml(profileData.email) : 'example@company.com'}</div>
                            </div>
                        </div>
                        <div class="contact-item">
                            <i class="fab fa-line"></i>
                            <div class="contact-details">
                                <div class="contact-label">LINE ID</div>
                                <div class="contact-value">${profileData && profileData.lineId ? window.InterConnect.Profile.escapeHtml(profileData.lineId) : '@example_line'}</div>
                            </div>
                        </div>
                        <div class="contact-item">
                            <i class="fas fa-phone"></i>
                            <div class="contact-details">
                                <div class="contact-label">電話番号</div>
                                <div class="contact-value">${profileData && profileData.phone ? window.InterConnect.Profile.escapeHtml(profileData.phone) : '090-1234-5678'}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="profile-section">
                    <h3 class="section-title">LINE QRコード</h3>
                    <div class="qr-code-section">
                        <div class="qr-code-container">
                            <img src="assets/qr-placeholder.svg" alt="LINE QR Code">
                        </div>
                        <button class="btn btn-outline qr-upload-btn">QRコードを更新</button>
                    </div>
                </div>
            `;
            break;
            
        case 'experience':
            profileData = window.InterConnect.Profile.profileData;
            const experiences = profileData && profileData.experiences ? profileData.experiences : [
                {
                    date: '2020年 - 現在',
                    title: '代表取締役CEO',
                    company: '株式会社テックイノベーション',
                    description: 'AI技術を活用したビジネスソリューションの開発・提供'
                },
                {
                    date: '2015年 - 2020年',
                    title: '事業開発部長',
                    company: 'グローバルテック株式会社',
                    description: '新規事業の立ち上げ、海外展開の推進'
                }
            ];
            
            content = `
                <div class="profile-section">
                    <h3 class="section-title">
                        職歴
                        <button class="btn btn-text">編集</button>
                    </h3>
                    <div class="experience-timeline">
                        ${experiences.map(exp => `
                            <div class="timeline-item">
                                <div class="timeline-date">${window.InterConnect.Profile.escapeHtml(exp.date || '')}</div>
                                <div class="timeline-title">${window.InterConnect.Profile.escapeHtml(exp.title || '')}</div>
                                <div class="timeline-company">${window.InterConnect.Profile.escapeHtml(exp.company || '')}</div>
                                <div class="timeline-description">
                                    ${window.InterConnect.Profile.escapeHtml(exp.description || '')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
            
        case 'skills':
            profileData = window.InterConnect.Profile.profileData;
            const userSkills = profileData && profileData.skills ? profileData.skills : [];
            
            // デフォルトのスキルカテゴリー
            const skillCategories = {
                '経営・戦略': [
                    '経営戦略立案', '事業計画策定', 'ビジョン構築', 'M&A戦略',
                    '組織変革', 'リスクマネジメント', 'ガバナンス強化'
                ],
                '事業開発': [
                    '新規事業開発', '事業提携・アライアンス', 'ビジネスモデル構築',
                    '市場開拓', '商品企画', 'サービス開発', 'プロダクトマネジメント'
                ],
                'テクノロジー': [
                    'AI・機械学習', 'IoT', 'ブロックチェーン', 'クラウド',
                    'ビッグデータ', 'サイバーセキュリティ', 'DX推進', 'システム設計'
                ],
                'マーケティング': [
                    'デジタルマーケティング', 'ブランディング', 'PR・広報',
                    'SNSマーケティング', 'コンテンツマーケティング', 'SEO/SEM',
                    'CRM', 'マーケティング分析'
                ],
                '財務・ファイナンス': [
                    '財務戦略', '資金調達', 'IPO準備', '予算管理',
                    '投資判断', 'コスト削減', 'キャッシュフロー管理', '会計'
                ],
                '人事・組織': [
                    '人材採用', '人材育成', '組織開発', '評価制度設計',
                    'ダイバーシティ推進', 'エンゲージメント向上', 'リーダーシップ開発'
                ]
            };
            
            content = `
                <div class="profile-section">
                    <h3 class="section-title">
                        スキル・専門分野
                        <button class="btn btn-text">編集</button>
                    </h3>
                    <div class="skills-container">
                        ${Object.entries(skillCategories).map(([category, skills]) => `
                            <div class="skill-category">
                                <h4>${category}</h4>
                                <div class="skills-grid">
                                    ${skills.map(skill => `
                                        <div class="skill-item ${userSkills.includes(skill) ? 'active' : ''}">
                                            <div class="skill-name">${window.InterConnect.Profile.escapeHtml(skill)}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
            
        case 'interests':
            profileData = window.InterConnect.Profile.profileData;
            const userInterests = profileData && profileData.interests ? profileData.interests : [];
            
            // 興味・関心のカテゴリー
            const interestCategories = {
                'ビジネス・経営': [
                    'スタートアップ', 'イノベーション', '新規事業開発', 'M&A',
                    '事業承継', 'IPO', 'ベンチャーキャピタル', 'エンジェル投資',
                    'コーポレートベンチャリング', 'オープンイノベーション'
                ],
                'テクノロジー': [
                    'AI・人工知能', '機械学習', 'IoT', 'ブロックチェーン',
                    'メタバース', 'Web3', 'NFT', 'ロボティクス',
                    'AR/VR', '量子コンピューティング', '5G/6G', 'エッジコンピューティング'
                ],
                '産業・分野': [
                    'FinTech', 'EdTech', 'HealthTech', 'AgriTech',
                    'FoodTech', 'RetailTech', 'PropTech', 'LegalTech',
                    'HRTech', 'AdTech', 'GovTech', 'InsurTech'
                ],
                '社会・環境': [
                    'サステナビリティ', 'SDGs', '脱炭素', 'ESG投資',
                    'サーキュラーエコノミー', 'グリーンテック', '再生可能エネルギー',
                    'ソーシャルビジネス', 'インパクト投資', 'ダイバーシティ'
                ],
                'マーケティング・顧客': [
                    'デジタルマーケティング', 'CX（顧客体験）', 'UXデザイン',
                    'データドリブンマーケティング', 'グロースハック', 'インフルエンサーマーケティング',
                    'コンテンツマーケティング', 'ブランディング', 'PR戦略', 'カスタマーサクセス'
                ],
                '働き方・組織': [
                    'リモートワーク', 'ハイブリッドワーク', 'ワークライフバランス',
                    '組織文化', 'チームビルディング', 'リーダーシップ開発',
                    'タレントマネジメント', 'エンゲージメント', 'ウェルビーイング', '副業・兼業'
                ]
            };
            
            content = `
                <div class="profile-section">
                    <h3 class="section-title">
                        興味・関心分野
                        <button class="btn btn-text">編集</button>
                    </h3>
                    <div class="interests-container">
                        ${Object.entries(interestCategories).map(([category, interests]) => `
                            <div class="interest-category">
                                <h4>${category}</h4>
                                <div class="interests-grid">
                                    ${interests.map(interest => `
                                        <span class="tag ${userInterests.includes(interest) ? 'active' : ''}">
                                            ${window.InterConnect.Profile.escapeHtml(interest)}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
            
        case 'challenges':
            profileData = window.InterConnect.Profile.profileData;
            console.log('Challenges tab - profileData:', profileData);
            const challenges = profileData && profileData.challenges ? profileData.challenges : [];
            
            // 予算の安全な処理
            let budget = '未設定';
            if (profileData && profileData.budget) {
                const budgetNum = parseInt(profileData.budget, 10);
                if (!isNaN(budgetNum) && budgetNum > 0) {
                    budget = budgetNum.toLocaleString();
                }
            }
            
            // デバッグ用
            console.log('revenue-details:', profileData ? profileData['revenue-details'] : 'no data');
            console.log('hr-details:', profileData ? profileData['hr-details'] : 'no data');
            console.log('dx-details:', profileData ? profileData['dx-details'] : 'no data');
            console.log('strategy-details:', profileData ? profileData['strategy-details'] : 'no data');
            
            content = `
                <div class="profile-section">
                    <h3 class="section-title">
                        事業課題
                        <button class="btn btn-text" onclick="window.InterConnect.Profile.editChallenges()">編集</button>
                    </h3>
                    <div class="business-challenges">
                        <div class="challenge-category">
                            <h4><i class="fas fa-chart-line"></i> 売上・収益の課題</h4>
                            <ul class="challenge-list">
                                ${challenges.includes('新規顧客獲得') ? '<li>新規顧客獲得の伸び悩み</li>' : ''}
                                ${challenges.includes('既存顧客単価') ? '<li>既存顧客の単価向上</li>' : ''}
                                ${challenges.includes('市場シェア拡大') ? '<li>市場シェアの拡大</li>' : ''}
                                ${challenges.includes('リピート率向上') ? '<li>顧客リピート率の向上</li>' : ''}
                                ${challenges.includes('新規事業開発') ? '<li>新規事業・サービスの開発</li>' : ''}
                            </ul>
                            ${profileData && profileData['revenue-details'] && profileData['revenue-details'].trim() ? `
                            <div class="challenge-details">
                                <h5>詳細:</h5>
                                <p>${window.InterConnect.Profile.escapeHtml(profileData['revenue-details'])}</p>
                            </div>` : challenges.some(c => ['新規顧客獲得', '既存顧客単価', '市場シェア拡大', 'リピート率向上', '新規事業開発'].includes(c)) ? `
                            <div class="challenge-details">
                                <h5>詳細:</h5>
                                <p style="color: #999; font-style: italic;">詳細情報が未入力です。編集ボタンから追加してください。</p>
                            </div>` : ''}
                        </div>
                        
                        <div class="challenge-category">
                            <h4><i class="fas fa-users"></i> 組織・人材の課題</h4>
                            <ul class="challenge-list">
                                ${challenges.includes('人材採用') ? '<li>優秀な人材の採用</li>' : ''}
                                ${challenges.includes('人材育成') ? '<li>社員の育成・スキルアップ</li>' : ''}
                                ${challenges.includes('組織文化') ? '<li>組織文化の醸成</li>' : ''}
                                ${challenges.includes('離職防止') ? '<li>離職率の改善・定着率向上</li>' : ''}
                                ${challenges.includes('評価制度') ? '<li>人事評価制度の構築</li>' : ''}
                            </ul>
                            ${profileData && profileData['hr-details'] && profileData['hr-details'].trim() ? `
                            <div class="challenge-details">
                                <h5>詳細:</h5>
                                <p>${window.InterConnect.Profile.escapeHtml(profileData['hr-details'])}</p>
                            </div>` : challenges.some(c => ['人材採用', '人材育成', '組織文化', '離職防止', '評価制度'].includes(c)) ? `
                            <div class="challenge-details">
                                <h5>詳細:</h5>
                                <p style="color: #999; font-style: italic;">詳細情報が未入力です。編集ボタンから追加してください。</p>
                            </div>` : ''}
                        </div>
                        
                        <div class="challenge-category">
                            <h4><i class="fas fa-cogs"></i> 業務効率・DXの課題</h4>
                            <ul class="challenge-list">
                                ${challenges.includes('DX推進') ? '<li>DX推進・デジタル化</li>' : ''}
                                ${challenges.includes('業務自動化') ? '<li>業務プロセスの自動化</li>' : ''}
                                ${challenges.includes('システム統合') ? '<li>社内システムの統合</li>' : ''}
                                ${challenges.includes('データ活用') ? '<li>データ分析・活用の推進</li>' : ''}
                                ${challenges.includes('セキュリティ') ? '<li>情報セキュリティの強化</li>' : ''}
                            </ul>
                            ${profileData && profileData['dx-details'] && profileData['dx-details'].trim() ? `
                            <div class="challenge-details">
                                <h5>詳細:</h5>
                                <p>${window.InterConnect.Profile.escapeHtml(profileData['dx-details'])}</p>
                            </div>` : challenges.some(c => ['DX推進', '業務自動化', 'システム統合', 'データ活用', 'セキュリティ'].includes(c)) ? `
                            <div class="challenge-details">
                                <h5>詳細:</h5>
                                <p style="color: #999; font-style: italic;">詳細情報が未入力です。編集ボタンから追加してください。</p>
                            </div>` : ''}
                        </div>
                        
                        <div class="challenge-category">
                            <h4><i class="fas fa-globe"></i> 事業戦略・競争力の課題</h4>
                            <ul class="challenge-list">
                                ${challenges.includes('差別化戦略') ? '<li>競合他社との差別化</li>' : ''}
                                ${challenges.includes('ブランディング') ? '<li>ブランド力の向上</li>' : ''}
                                ${challenges.includes('海外展開') ? '<li>海外市場への展開</li>' : ''}
                                ${challenges.includes('パートナーシップ') ? '<li>戦略的パートナーシップ構築</li>' : ''}
                            </ul>
                            ${profileData && profileData['strategy-details'] && profileData['strategy-details'].trim() ? `
                            <div class="challenge-details">
                                <h5>詳細:</h5>
                                <p>${window.InterConnect.Profile.escapeHtml(profileData['strategy-details'])}</p>
                            </div>` : challenges.some(c => ['差別化戦略', 'ブランディング', '海外展開', 'パートナーシップ'].includes(c)) ? `
                            <div class="challenge-details">
                                <h5>詳細:</h5>
                                <p style="color: #999; font-style: italic;">詳細情報が未入力です。編集ボタンから追加してください。</p>
                            </div>` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="profile-section">
                    <h3 class="section-title">
                        予算計画
                        <button class="btn btn-text" onclick="window.InterConnect.Profile.editBudget()">編集</button>
                    </h3>
                    <div class="budget-planning">
                        <div class="budget-item">
                            <span class="budget-label">年間予算規模</span>
                            <span class="budget-value">${budget}円</span>
                        </div>
                    </div>
                </div>
                
                <!-- デバッグ用（本番環境では削除） -->
                <div class="profile-section" style="background: #f0f0f0; padding: 10px; margin-top: 20px; font-size: 12px;">
                    <h4>デバッグ情報</h4>
                    <button class="btn btn-sm" onclick="console.log('ProfileData:', window.InterConnect.Profile.profileData); alert('コンソールを確認してください')">データ確認</button>
                    <button class="btn btn-sm" onclick="window.loadTabContent('challenges')">タブ再読み込み</button>
                </div>
            `;
            break;
    }
    } catch (error) {
        console.error('Error in loadTabContent:', error);
        console.error('Error stack:', error.stack);
        content = '<div class="error-message">コンテンツの読み込み中にエラーが発生しました。</div>';
    }
    
    // 安全にHTMLを設定（XSS対策はテンプレート内で実施済み）
    profileContent.innerHTML = content;
    
    // Add event listeners to newly created buttons
    const editBtns = profileContent.querySelectorAll('.btn-text');
    editBtns.forEach(btn => {
        // イベントリスナーを追加する前に既存のものを削除
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', function() {
            const action = this.getAttribute('onclick');
            if (action) {
                // onclick属性があれば実行
                return;
            }
            // タブに応じて適切なモーダルを開く
            const currentTab = window.InterConnect.Profile.currentTab;
            switch(currentTab) {
                case 'about':
                    window.InterConnect.Profile.openEditModal();
                    break;
                case 'experience':
                    window.InterConnect.Profile.openExperienceModal();
                    break;
                case 'skills':
                    window.InterConnect.Profile.openSkillsModal();
                    break;
                case 'interests':
                    window.InterConnect.Profile.openInterestsModal();
                    break;
                case 'challenges':
                    window.InterConnect.Profile.openChallengesModal();
                    break;
                default:
                    alert('編集機能は準備中です');
            }
        });
    });
    
    // QR code upload button
    const qrUploadBtn = profileContent.querySelector('.qr-upload-btn');
    if (qrUploadBtn) {
        qrUploadBtn.addEventListener('click', function() {
            window.InterConnect.Profile.uploadQRCode();
        });
    }
};

// ユーティリティ関数
window.InterConnect.Profile.escapeHtml = function(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
};

// 編集機能
window.InterConnect.Profile.openEditModal = function() {
    try {
        const modal = document.getElementById('profileEditModal');
        const profileData = window.InterConnect.Profile.profileData;
        
        if (!modal) {
            console.error('Edit modal not found');
            return;
        }
        
        // フォームに現在のデータを設定
        if (profileData) {
            const form = document.getElementById('profileEditForm');
            if (form) {
                form.elements['name'].value = profileData.name || '';
                form.elements['company'].value = profileData.company || '';
                form.elements['position'].value = profileData.position || '';
                form.elements['bio'].value = profileData.bio || '';
                form.elements['email'].value = profileData.email || '';
                form.elements['phone'].value = profileData.phone || '';
                form.elements['lineId'].value = profileData.lineId || '';
            }
        }
        
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    } catch (error) {
        console.error('Error opening edit modal:', error);
    }
};

window.InterConnect.Profile.closeEditModal = function() {
    try {
        const modal = document.getElementById('profileEditModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    } catch (error) {
        console.error('Error closing edit modal:', error);
    }
};

window.InterConnect.Profile.saveProfile = async function() {
    try {
        const form = document.getElementById('profileEditForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        // フォームデータを収集
        const formData = new FormData(form);
        const updatedData = {};
        
        for (let [key, value] of formData.entries()) {
            updatedData[key] = value;
        }
        
        // 既存のデータとマージ
        window.InterConnect.Profile.profileData = {
            ...window.InterConnect.Profile.profileData,
            ...updatedData
        };
        
        // ローカルストレージに保存
        if (window.safeLocalStorage) {
            window.safeLocalStorage.setJSON('userProfile', window.InterConnect.Profile.profileData);
        }
        
        // Supabaseに同期
        if (window.ProfileSync && window.ProfileSync.update) {
            console.log('Syncing profile to Supabase...');
            const { error } = await window.ProfileSync.update({
                name: updatedData.name,
                display_name: updatedData.name,
                company: updatedData.company,
                position: updatedData.position,
                bio: updatedData.bio,
                phone: updatedData.phone,
                lineId: updatedData.lineId
            });
            
            if (error) {
                console.error('Supabase sync error:', error);
            } else {
                console.log('Profile synced to Supabase successfully');
            }
        }
        
        // UIを更新
        window.InterConnect.Profile.updateProfileInfo();
        
        // モーダルを閉じる
        window.InterConnect.Profile.closeEditModal();
        
        // 成功メッセージ
        if (window.InterConnect && window.InterConnect.Registration && window.InterConnect.Registration.showToast) {
            window.InterConnect.Registration.showToast('プロフィールを更新しました', 'success');
        } else {
            alert('プロフィールを更新しました');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('プロフィールの保存中にエラーが発生しました');
    }
};

// 画像編集モーダル
window.InterConnect.Profile.openCoverModal = function() {
    try {
        const modal = document.getElementById('coverEditModal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
        }
    } catch (error) {
        console.error('Error opening cover modal:', error);
    }
};

window.InterConnect.Profile.closeCoverModal = function() {
    try {
        const modal = document.getElementById('coverEditModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 300);
            
            // プレビューをリセット
            const preview = document.getElementById('cover-preview');
            const placeholder = modal.querySelector('.upload-placeholder');
            if (preview) preview.style.display = 'none';
            if (placeholder) placeholder.style.display = 'block';
        }
    } catch (error) {
        console.error('Error closing cover modal:', error);
    }
};

window.InterConnect.Profile.openAvatarModal = function() {
    try {
        const modal = document.getElementById('avatarEditModal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
        }
    } catch (error) {
        console.error('Error opening avatar modal:', error);
    }
};

window.InterConnect.Profile.closeAvatarModal = function() {
    try {
        const modal = document.getElementById('avatarEditModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 300);
            
            // プレビューをリセット
            const preview = document.getElementById('avatar-preview');
            const placeholder = modal.querySelector('.upload-placeholder');
            if (preview) preview.style.display = 'none';
            if (placeholder) placeholder.style.display = 'block';
        }
    } catch (error) {
        console.error('Error closing avatar modal:', error);
    }
};

// 画像プレビュー処理
window.InterConnect.Profile.handleImagePreview = function(event, previewId) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        
        // ファイルタイプチェック
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
        if (!allowedTypes.includes(file.type.toLowerCase())) {
            alert('PNG、JPG、JPEG、GIF形式の画像をアップロードしてください');
            event.target.value = '';
            return;
        }
        
        // ファイルサイズチェック（5MB）
        if (file.size > 5 * 1024 * 1024) {
            alert('ファイルサイズは5MB以下にしてください');
            event.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById(previewId);
            const placeholder = preview.parentElement.querySelector('.upload-placeholder');
            
            if (preview && placeholder) {
                preview.src = e.target.result;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
            }
        };
        
        reader.onerror = function() {
            alert('ファイルの読み込みに失敗しました');
        };
        
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('Error handling image preview:', error);
    }
};

// 画像保存処理
window.InterConnect.Profile.saveCoverImage = function() {
    try {
        const preview = document.getElementById('cover-preview');
        if (preview && preview.style.display !== 'none') {
            const coverImg = document.querySelector('.profile-cover img');
            if (coverImg) {
                coverImg.src = preview.src;
            }
            
            // プロフィールデータに保存
            if (window.InterConnect.Profile.profileData) {
                window.InterConnect.Profile.profileData.coverImage = preview.src;
                if (window.safeLocalStorage) {
                    window.safeLocalStorage.setJSON('userProfile', window.InterConnect.Profile.profileData);
                }
            }
            
            window.InterConnect.Profile.closeCoverModal();
            alert('カバー画像を更新しました');
        }
    } catch (error) {
        console.error('Error saving cover image:', error);
        alert('画像の保存中にエラーが発生しました');
    }
};

window.InterConnect.Profile.saveAvatarImage = async function() {
    try {
        const preview = document.getElementById('avatar-preview');
        if (preview && preview.style.display !== 'none') {
            const avatarImg = document.querySelector('.profile-avatar img');
            if (avatarImg) {
                avatarImg.src = preview.src;
            }
            
            // プロフィールデータに保存
            if (window.InterConnect.Profile.profileData) {
                window.InterConnect.Profile.profileData.profileImage = preview.src;
                if (window.safeLocalStorage) {
                    window.safeLocalStorage.setJSON('userProfile', window.InterConnect.Profile.profileData);
                }
            }
            
            // Supabaseに同期
            if (window.ProfileSync && window.ProfileSync.update) {
                console.log('Syncing avatar to Supabase...');
                const { error } = await window.ProfileSync.update({
                    picture: preview.src,
                    picture_url: preview.src
                });
                
                if (error) {
                    console.error('Avatar sync error:', error);
                } else {
                    console.log('Avatar synced to Supabase successfully');
                }
            }
            
            window.InterConnect.Profile.closeAvatarModal();
            alert('プロフィール画像を更新しました');
        }
    } catch (error) {
        console.error('Error saving avatar image:', error);
        alert('画像の保存中にエラーが発生しました');
    }
};

// 経歴編集機能
window.InterConnect.Profile.openExperienceModal = function() {
    try {
        const modal = document.getElementById('experienceEditModal');
        if (!modal) return;
        
        // 既存の経歴データを読み込む
        const profileData = window.InterConnect.Profile.profileData;
        const experiences = profileData && profileData.experiences ? profileData.experiences : [
            {
                id: 1,
                date: '2020年 - 現在',
                title: '代表取締役CEO',
                company: '株式会社テックイノベーション',
                description: 'AI技術を活用したビジネスソリューションの開発・提供'
            }
        ];
        
        // 経歴リストを生成
        const experienceList = document.getElementById('experienceList');
        experienceList.innerHTML = experiences.map((exp, index) => `
            <div class="experience-item" data-id="${exp.id || index}">
                <button class="btn-remove" onclick="window.InterConnect.Profile.removeExperience(${exp.id || index})">
                    <i class="fas fa-times"></i>
                </button>
                <div class="form-group">
                    <label>期間</label>
                    <input type="text" name="exp-date-${index}" value="${exp.date || ''}" placeholder="例：2020年4月 - 現在">
                </div>
                <div class="form-group">
                    <label>役職</label>
                    <input type="text" name="exp-title-${index}" value="${exp.title || ''}" placeholder="例：代表取締役">
                </div>
                <div class="form-group">
                    <label>会社名</label>
                    <input type="text" name="exp-company-${index}" value="${exp.company || ''}" placeholder="例：株式会社〇〇">
                </div>
                <div class="form-group">
                    <label>業務内容</label>
                    <textarea name="exp-description-${index}" rows="3" placeholder="主な業務内容や実績">${exp.description || ''}</textarea>
                </div>
            </div>
        `).join('');
        
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    } catch (error) {
        console.error('Error opening experience modal:', error);
    }
};

window.InterConnect.Profile.closeExperienceModal = function() {
    try {
        const modal = document.getElementById('experienceEditModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    } catch (error) {
        console.error('Error closing experience modal:', error);
    }
};

window.InterConnect.Profile.addExperience = function() {
    try {
        const experienceList = document.getElementById('experienceList');
        const newId = Date.now();
        const newIndex = experienceList.children.length;
        
        const newItem = document.createElement('div');
        newItem.className = 'experience-item';
        newItem.dataset.id = newId;
        newItem.innerHTML = `
            <button class="btn-remove" onclick="window.InterConnect.Profile.removeExperience(${newId})">
                <i class="fas fa-times"></i>
            </button>
            <div class="form-group">
                <label>期間</label>
                <input type="text" name="exp-date-${newIndex}" placeholder="例：2020年4月 - 現在">
            </div>
            <div class="form-group">
                <label>役職</label>
                <input type="text" name="exp-title-${newIndex}" placeholder="例：代表取締役">
            </div>
            <div class="form-group">
                <label>会社名</label>
                <input type="text" name="exp-company-${newIndex}" placeholder="例：株式会社〇〇">
            </div>
            <div class="form-group">
                <label>業務内容</label>
                <textarea name="exp-description-${newIndex}" rows="3" placeholder="主な業務内容や実績"></textarea>
            </div>
        `;
        
        experienceList.appendChild(newItem);
    } catch (error) {
        console.error('Error adding experience:', error);
    }
};

window.InterConnect.Profile.removeExperience = function(id) {
    try {
        const item = document.querySelector(`.experience-item[data-id="${id}"]`);
        if (item && confirm('この経歴を削除しますか？')) {
            item.remove();
        }
    } catch (error) {
        console.error('Error removing experience:', error);
    }
};

window.InterConnect.Profile.saveExperience = function() {
    try {
        const items = document.querySelectorAll('.experience-item');
        const experiences = [];
        
        items.forEach((item, index) => {
            const date = item.querySelector(`input[name^="exp-date"]`).value;
            const title = item.querySelector(`input[name^="exp-title"]`).value;
            const company = item.querySelector(`input[name^="exp-company"]`).value;
            const description = item.querySelector(`textarea[name^="exp-description"]`).value;
            
            if (date || title || company || description) {
                experiences.push({
                    id: item.dataset.id,
                    date,
                    title,
                    company,
                    description
                });
            }
        });
        
        // プロフィールデータに保存
        if (!window.InterConnect.Profile.profileData) {
            window.InterConnect.Profile.profileData = {};
        }
        window.InterConnect.Profile.profileData.experiences = experiences;
        
        // ローカルストレージに保存
        if (window.safeLocalStorage) {
            window.safeLocalStorage.setJSON('userProfile', window.InterConnect.Profile.profileData);
        }
        
        // タブコンテンツを再読み込み
        window.loadTabContent('experience');
        
        // モーダルを閉じる
        window.InterConnect.Profile.closeExperienceModal();
        
        alert('経歴を更新しました');
    } catch (error) {
        console.error('Error saving experience:', error);
        alert('経歴の保存中にエラーが発生しました');
    }
};

// スキル編集機能
window.InterConnect.Profile.openSkillsModal = function() {
    try {
        const modal = document.getElementById('skillsEditModal');
        if (!modal) return;
        
        const profileData = window.InterConnect.Profile.profileData;
        const userSkills = profileData && profileData.skills ? profileData.skills : [];
        
        // スキルカテゴリー（profile.jsから同じものを使用）
        const skillCategories = {
            '経営・戦略': [
                '経営戦略立案', '事業計画策定', 'ビジョン構築', 'M&A戦略',
                '組織変革', 'リスクマネジメント', 'ガバナンス強化'
            ],
            '事業開発': [
                '新規事業開発', '事業提携・アライアンス', 'ビジネスモデル構築',
                '市場開拓', '商品企画', 'サービス開発', 'プロダクトマネジメント'
            ],
            'テクノロジー': [
                'AI・機械学習', 'IoT', 'ブロックチェーン', 'クラウド',
                'ビッグデータ', 'サイバーセキュリティ', 'DX推進', 'システム設計'
            ],
            'マーケティング': [
                'デジタルマーケティング', 'ブランディング', 'PR・広報',
                'SNSマーケティング', 'コンテンツマーケティング', 'SEO/SEM',
                'CRM', 'マーケティング分析'
            ],
            '財務・ファイナンス': [
                '財務戦略', '資金調達', 'IPO準備', '予算管理',
                '投資判断', 'コスト削減', 'キャッシュフロー管理', '会計'
            ],
            '人事・組織': [
                '人材採用', '人材育成', '組織開発', '評価制度設計',
                'ダイバーシティ推進', 'エンゲージメント向上', 'リーダーシップ開発'
            ]
        };
        
        // スキル編集UIを生成
        const container = modal.querySelector('.skills-edit-container');
        container.innerHTML = Object.entries(skillCategories).map(([category, skills]) => `
            <div class="edit-category">
                <h4>${category}</h4>
                <div class="checkbox-grid">
                    ${skills.map(skill => `
                        <label class="checkbox-item ${userSkills.includes(skill) ? 'checked' : ''}">
                            <input type="checkbox" name="skill" value="${skill}" ${userSkills.includes(skill) ? 'checked' : ''}>
                            <span>${skill}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        // チェックボックスの状態変更イベント
        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                this.parentElement.classList.toggle('checked', this.checked);
            });
        });
        
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    } catch (error) {
        console.error('Error opening skills modal:', error);
    }
};

window.InterConnect.Profile.closeSkillsModal = function() {
    try {
        const modal = document.getElementById('skillsEditModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    } catch (error) {
        console.error('Error closing skills modal:', error);
    }
};

window.InterConnect.Profile.saveSkills = function() {
    try {
        const checkedSkills = Array.from(document.querySelectorAll('#skillsEditModal input[name="skill"]:checked'))
            .map(cb => cb.value);
        
        // プロフィールデータに保存
        if (!window.InterConnect.Profile.profileData) {
            window.InterConnect.Profile.profileData = {};
        }
        window.InterConnect.Profile.profileData.skills = checkedSkills;
        
        // ローカルストレージに保存
        if (window.safeLocalStorage) {
            window.safeLocalStorage.setJSON('userProfile', window.InterConnect.Profile.profileData);
        }
        
        // タブコンテンツを再読み込み
        window.loadTabContent('skills');
        
        // モーダルを閉じる
        window.InterConnect.Profile.closeSkillsModal();
        
        alert('スキルを更新しました');
    } catch (error) {
        console.error('Error saving skills:', error);
        alert('スキルの保存中にエラーが発生しました');
    }
};

// 興味・関心編集機能
window.InterConnect.Profile.openInterestsModal = function() {
    try {
        const modal = document.getElementById('interestsEditModal');
        if (!modal) return;
        
        const profileData = window.InterConnect.Profile.profileData;
        const userInterests = profileData && profileData.interests ? profileData.interests : [];
        
        // 興味・関心のカテゴリー
        const interestCategories = {
            'ビジネス・経営': [
                'スタートアップ', 'イノベーション', '新規事業開発', 'M&A',
                '事業承継', 'IPO', 'ベンチャーキャピタル', 'エンジェル投資',
                'コーポレートベンチャリング', 'オープンイノベーション'
            ],
            'テクノロジー': [
                'AI・人工知能', '機械学習', 'IoT', 'ブロックチェーン',
                'メタバース', 'Web3', 'NFT', 'ロボティクス',
                'AR/VR', '量子コンピューティング', '5G/6G', 'エッジコンピューティング'
            ],
            '産業・分野': [
                'FinTech', 'EdTech', 'HealthTech', 'AgriTech',
                'FoodTech', 'RetailTech', 'PropTech', 'LegalTech',
                'HRTech', 'AdTech', 'GovTech', 'InsurTech'
            ],
            '社会・環境': [
                'サステナビリティ', 'SDGs', '脱炭素', 'ESG投資',
                'サーキュラーエコノミー', 'グリーンテック', '再生可能エネルギー',
                'ソーシャルビジネス', 'インパクト投資', 'ダイバーシティ'
            ],
            'マーケティング・顧客': [
                'デジタルマーケティング', 'CX（顧客体験）', 'UXデザイン',
                'データドリブンマーケティング', 'グロースハック', 'インフルエンサーマーケティング',
                'コンテンツマーケティング', 'ブランディング', 'PR戦略', 'カスタマーサクセス'
            ],
            '働き方・組織': [
                'リモートワーク', 'ハイブリッドワーク', 'ワークライフバランス',
                '組織文化', 'チームビルディング', 'リーダーシップ開発',
                'タレントマネジメント', 'エンゲージメント', 'ウェルビーイング', '副業・兼業'
            ]
        };
        
        // 興味・関心編集UIを生成
        const container = modal.querySelector('.interests-edit-container');
        container.innerHTML = Object.entries(interestCategories).map(([category, interests]) => `
            <div class="edit-category">
                <h4>${category}</h4>
                <div class="checkbox-grid">
                    ${interests.map(interest => `
                        <label class="checkbox-item ${userInterests.includes(interest) ? 'checked' : ''}">
                            <input type="checkbox" name="interest" value="${window.InterConnect.Profile.escapeHtml(interest)}" ${userInterests.includes(interest) ? 'checked' : ''}>
                            <span>${window.InterConnect.Profile.escapeHtml(interest)}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        // チェックボックスの状態変更イベント
        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                this.parentElement.classList.toggle('checked', this.checked);
            });
        });
        
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    } catch (error) {
        console.error('Error opening interests modal:', error);
    }
};

window.InterConnect.Profile.closeInterestsModal = function() {
    try {
        const modal = document.getElementById('interestsEditModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    } catch (error) {
        console.error('Error closing interests modal:', error);
    }
};

window.InterConnect.Profile.saveInterests = function() {
    try {
        const checkedInterests = Array.from(document.querySelectorAll('#interestsEditModal input[name="interest"]:checked'))
            .map(cb => cb.value);
        
        // プロフィールデータに保存
        if (!window.InterConnect.Profile.profileData) {
            window.InterConnect.Profile.profileData = {};
        }
        window.InterConnect.Profile.profileData.interests = checkedInterests;
        
        // ローカルストレージに保存
        if (window.safeLocalStorage) {
            window.safeLocalStorage.setJSON('userProfile', window.InterConnect.Profile.profileData);
        }
        
        // タブコンテンツを再読み込み
        window.loadTabContent('interests');
        
        // モーダルを閉じる
        window.InterConnect.Profile.closeInterestsModal();
        
        alert('興味・関心を更新しました');
    } catch (error) {
        console.error('Error saving interests:', error);
        alert('興味・関心の保存中にエラーが発生しました');
    }
};

// 事業課題編集機能
window.InterConnect.Profile.openChallengesModal = function() {
    try {
        const modal = document.getElementById('challengesEditModal');
        if (!modal) return;
        
        const profileData = window.InterConnect.Profile.profileData;
        const userChallenges = profileData && profileData.challenges ? profileData.challenges : [];
        const budget = profileData && profileData.budget ? profileData.budget : '';
        
        // 事業課題のカテゴリー
        const challengeCategories = {
            '売上・収益の課題': {
                icon: 'fa-chart-line',
                challenges: [
                    { id: '新規顧客獲得', label: '新規顧客獲得の伸び悩み' },
                    { id: '既存顧客単価', label: '既存顧客の単価向上' },
                    { id: '市場シェア拡大', label: '市場シェアの拡大' },
                    { id: 'リピート率向上', label: '顧客リピート率の向上' },
                    { id: '新規事業開発', label: '新規事業・サービスの開発' }
                ],
                detailField: 'revenue-details'
            },
            '組織・人材の課題': {
                icon: 'fa-users',
                challenges: [
                    { id: '人材採用', label: '優秀な人材の採用' },
                    { id: '人材育成', label: '社員の育成・スキルアップ' },
                    { id: '組織文化', label: '組織文化の醸成' },
                    { id: '離職防止', label: '離職率の改善・定着率向上' },
                    { id: '評価制度', label: '人事評価制度の構築' }
                ],
                detailField: 'hr-details'
            },
            '業務効率・DXの課題': {
                icon: 'fa-cogs',
                challenges: [
                    { id: 'DX推進', label: 'DX推進・デジタル化' },
                    { id: '業務自動化', label: '業務プロセスの自動化' },
                    { id: 'システム統合', label: '社内システムの統合' },
                    { id: 'データ活用', label: 'データ分析・活用の推進' },
                    { id: 'セキュリティ', label: '情報セキュリティの強化' }
                ],
                detailField: 'dx-details'
            },
            '事業戦略・競争力の課題': {
                icon: 'fa-globe',
                challenges: [
                    { id: '差別化戦略', label: '競合他社との差別化' },
                    { id: 'ブランディング', label: 'ブランド力の向上' },
                    { id: '海外展開', label: '海外市場への展開' },
                    { id: 'パートナーシップ', label: '戦略的パートナーシップ構築' }
                ],
                detailField: 'strategy-details'
            }
        };
        
        // 事業課題編集UIを生成
        const container = modal.querySelector('.challenges-edit-container');
        container.innerHTML = Object.entries(challengeCategories).map(([category, data]) => {
            const detailValue = profileData && profileData[data.detailField] ? profileData[data.detailField] : '';
            const hasChecked = data.challenges.some(ch => userChallenges.includes(ch.id));
            
            return `
                <div class="challenge-edit-group">
                    <h4><i class="fas ${data.icon}"></i> ${category}</h4>
                    <div class="checkbox-grid">
                        ${data.challenges.map(challenge => `
                            <label class="checkbox-item ${userChallenges.includes(challenge.id) ? 'checked' : ''}">
                                <input type="checkbox" name="challenge" value="${challenge.id}" 
                                    ${userChallenges.includes(challenge.id) ? 'checked' : ''}
                                    data-category="${data.detailField}">
                                <span>${challenge.label}</span>
                            </label>
                        `).join('')}
                    </div>
                    <div class="challenge-detail-input ${hasChecked ? 'show' : ''}" data-field="${data.detailField}">
                        <label>詳細（50文字以上）</label>
                        <textarea name="${data.detailField}" placeholder="具体的な課題内容を入力してください">${detailValue}</textarea>
                    </div>
                </div>
            `;
        }).join('');
        
        // 予算を設定
        const budgetInput = document.getElementById('edit-budget');
        if (budgetInput) {
            budgetInput.value = budget;
        }
        
        // チェックボックスの状態変更イベント
        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                this.parentElement.classList.toggle('checked', this.checked);
                
                // カテゴリー内のチェック状態を確認
                const category = this.dataset.category;
                const categoryGroup = this.closest('.challenge-edit-group');
                const anyChecked = categoryGroup.querySelectorAll('input[type="checkbox"]:checked').length > 0;
                const detailInput = categoryGroup.querySelector('.challenge-detail-input');
                
                if (detailInput) {
                    detailInput.classList.toggle('show', anyChecked);
                }
            });
        });
        
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    } catch (error) {
        console.error('Error opening challenges modal:', error);
    }
};

window.InterConnect.Profile.closeChallengesModal = function() {
    try {
        const modal = document.getElementById('challengesEditModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    } catch (error) {
        console.error('Error closing challenges modal:', error);
    }
};

window.InterConnect.Profile.saveChallenges = function() {
    try {
        const form = document.getElementById('challengesEditForm');
        const checkedChallenges = Array.from(form.querySelectorAll('input[name="challenge"]:checked'))
            .map(cb => cb.value);
        
        const budget = document.getElementById('edit-budget')?.value || '';
        
        // 詳細フィールドの値を取得（デバッグ付き）
        const detailFields = {};
        form.querySelectorAll('textarea[name$="-details"]').forEach(textarea => {
            console.log('Saving textarea:', textarea.name, '=', textarea.value);
            detailFields[textarea.name] = textarea.value;
        });
        
        // プロフィールデータに保存
        if (!window.InterConnect.Profile.profileData) {
            window.InterConnect.Profile.profileData = {};
        }
        
        window.InterConnect.Profile.profileData.challenges = checkedChallenges;
        window.InterConnect.Profile.profileData.budget = budget;
        
        // 詳細フィールドも保存
        Object.assign(window.InterConnect.Profile.profileData, detailFields);
        
        // デバッグ: 保存前のデータを確認
        console.log('Saving profile data:', window.InterConnect.Profile.profileData);
        
        // ローカルストレージに保存
        if (window.safeLocalStorage) {
            window.safeLocalStorage.setJSON('userProfile', window.InterConnect.Profile.profileData);
        }
        
        // タブコンテンツを再読み込み
        window.loadTabContent('challenges');
        
        // モーダルを閉じる
        window.InterConnect.Profile.closeChallengesModal();
        
        alert('事業課題を更新しました');
    } catch (error) {
        console.error('Error saving challenges:', error);
        alert('事業課題の保存中にエラーが発生しました');
    }
};

// その他の編集機能
window.InterConnect.Profile.editChallenges = function() {
    window.InterConnect.Profile.openChallengesModal();
};

window.InterConnect.Profile.editBudget = function() {
    window.InterConnect.Profile.openChallengesModal();
};

// QRコードアップロード機能
window.InterConnect.Profile.uploadQRCode = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // ファイルサイズチェック（5MB）
        if (file.size > 5 * 1024 * 1024) {
            alert('ファイルサイズは5MB以下にしてください');
            return;
        }
        
        // ファイルタイプチェック
        if (!file.type.match(/image\/(png|jpg|jpeg)/i)) {
            alert('PNG、JPG、JPEG形式の画像をアップロードしてください');
            return;
        }
        
        // ファイルを読み込んで表示
        const reader = new FileReader();
        reader.onload = function(event) {
            const qrContainer = document.querySelector('.qr-code-container');
            if (qrContainer) {
                const img = qrContainer.querySelector('img');
                if (img) {
                    // 既存の画像URLを解放（メモリリーク防止）
                    if (img.src && img.src.startsWith('blob:')) {
                        URL.revokeObjectURL(img.src);
                    }
                    img.src = event.target.result;
                    
                    // プロフィールデータに保存
                    if (window.InterConnect.Profile.profileData) {
                        window.InterConnect.Profile.profileData.lineQR = event.target.result;
                        // SafeStorageを使用
                        if (window.safeLocalStorage) {
                            window.safeLocalStorage.setJSON('userProfile', window.InterConnect.Profile.profileData);
                        }
                    }
                    
                    alert('QRコードが更新されました');
                }
            }
        };
        
        reader.onerror = function() {
            alert('ファイルの読み込みに失敗しました');
        };
        
        reader.readAsDataURL(file);
    });
    
    input.click();
};

console.log('profile.js loading completed');