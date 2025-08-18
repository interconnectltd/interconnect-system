/**
 * Members Profile Modal
 * メンバーページ専用のプロフィールモーダル機能
 */

// デバッグ用ログ
console.log('[MembersProfileModal] ファイル読み込み開始');
console.log('[DEBUG] 1. ファイル実行開始時点');
console.log('[DEBUG] window.MembersProfileModal:', window.MembersProfileModal);
console.log('[DEBUG] window.showMemberProfileModal:', window.showMemberProfileModal);
console.log('[DEBUG] window.membersProfileModal:', window.membersProfileModal);

// プロフィールモーダルクラスをグローバルスコープで定義
class MembersProfileModal {
    constructor() {
        console.log('[MembersProfileModal] Constructor called');
        this.modal = null;
        this.currentUserId = null;
        this.currentTab = 'challenges'; // デフォルトは事業課題
        this.userData = null;
        
        this.init();
    }
    
    init() {
        console.log('[MembersProfileModal] Init called');
        this.createModal();
        this.setupEventListeners();
        console.log('[MembersProfileModal] 初期化完了');
    }
    
    createModal() {
            // 既存のモーダルがあれば削除
            const existingModal = document.getElementById('memberProfileModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            this.modal = document.createElement('div');
            this.modal.id = 'memberProfileModal';
            this.modal.className = 'modal';
            this.modal.style.display = 'none'; // 確実に非表示で開始
            this.modal.innerHTML = `
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="modalProfileName">プロフィール</h2>
                        <button class="modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="profile-header-section">
                            <img src="assets/user-placeholder.svg" alt="User" class="profile-modal-avatar" id="modalAvatar">
                            <div class="profile-modal-info">
                                <h3 id="modalFullName">名前</h3>
                                <p id="modalPosition">役職</p>
                                <p id="modalCompany">会社名</p>
                            </div>
                        </div>
                        
                        <div class="profile-tabs">
                            <button class="tab-btn" data-tab="about">基本情報</button>
                            <button class="tab-btn" data-tab="experience">経歴</button>
                            <button class="tab-btn" data-tab="skills">スキル</button>
                            <button class="tab-btn" data-tab="interests">興味・関心</button>
                            <button class="tab-btn" data-tab="challenges">事業課題</button>
                        </div>
                        
                        <div class="profile-tab-content">
                            <!-- 基本情報タブ -->
                            <div class="tab-pane" data-tab="about">
                                <div class="info-section">
                                    <h4>自己紹介</h4>
                                    <p id="modalBio">自己紹介文がありません</p>
                                </div>
                                <div class="info-section">
                                    <h4>業界</h4>
                                    <p id="modalIndustry">未設定</p>
                                </div>
                                <div class="info-section">
                                    <h4>所在地</h4>
                                    <p id="modalLocation">未設定</p>
                                </div>
                                <div class="info-section">
                                    <h4>連絡先</h4>
                                    <p id="modalEmail">非公開</p>
                                </div>
                            </div>
                            
                            <!-- 経歴タブ -->
                            <div class="tab-pane" data-tab="experience">
                                <div class="experience-list" id="modalExperience">
                                    <p class="empty-state">経歴情報がありません</p>
                                </div>
                            </div>
                            
                            <!-- スキルタブ -->
                            <div class="tab-pane" data-tab="skills">
                                <div class="skills-container" id="modalSkills">
                                    <p class="empty-state">スキル情報がありません</p>
                                </div>
                            </div>
                            
                            <!-- 興味・関心タブ -->
                            <div class="tab-pane" data-tab="interests">
                                <div class="interests-container" id="modalInterests">
                                    <p class="empty-state">興味・関心情報がありません</p>
                                </div>
                            </div>
                            
                            <!-- 事業課題タブ -->
                            <div class="tab-pane" data-tab="challenges">
                                <div class="challenges-container" id="modalChallenges">
                                    <p class="empty-state">事業課題情報がありません</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary modal-close-btn">閉じる</button>
                        <button class="btn btn-primary" id="modalMessageBtn">
                            <i class="fas fa-envelope"></i> メッセージを送る
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(this.modal);
            console.log('[MembersProfileModal] Modal added to DOM. Check:', document.getElementById('memberProfileModal'));
            
            // モーダルの初期状態を確認
            console.log('[DEBUG] Modal initial state:');
            console.log('[DEBUG]   - display:', this.modal.style.display);
            console.log('[DEBUG]   - classList:', this.modal.classList.toString());
            console.log('[DEBUG]   - computed display:', window.getComputedStyle(this.modal).display);
            console.log('[DEBUG]   - computed visibility:', window.getComputedStyle(this.modal).visibility);
            console.log('[DEBUG]   - has show class:', this.modal.classList.contains('show'));
        }
        
        setupEventListeners() {
            // モーダルを閉じる
            this.modal.querySelector('.modal-overlay').addEventListener('click', () => this.close());
            this.modal.querySelector('.modal-close').addEventListener('click', () => this.close());
            this.modal.querySelector('.modal-close-btn').addEventListener('click', () => this.close());
            
            // タブ切り替え
            this.modal.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tab = e.target.dataset.tab;
                    this.switchTab(tab);
                });
            });
            
            // メッセージボタン
            this.modal.querySelector('#modalMessageBtn').addEventListener('click', () => {
                if (this.currentUserId) {
                    window.location.href = `messages.html?user=${this.currentUserId}`;
                }
            });
        }
        
        switchTab(tabName) {
            // タブボタンのアクティブ状態を更新
            this.modal.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabName);
            });
            
            // タブコンテンツの表示を更新
            this.modal.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.toggle('active', pane.dataset.tab === tabName);
            });
            
            this.currentTab = tabName;
        }
        
        async show(userId) {
            console.log('[MembersProfileModal] show() called with userId:', userId);
            console.log('[DEBUG] Stack trace:', new Error().stack);
            if (!userId) {
                console.error('[MembersProfileModal] userId is empty');
                return;
            }
            
            console.log('[MembersProfileModal] Modal element:', this.modal);
            console.log('[MembersProfileModal] Modal classList before:', this.modal.classList.toString());
            
            this.currentUserId = userId;
            this.modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            console.log('[MembersProfileModal] Modal classList after:', this.modal.classList.toString());
            console.log('[MembersProfileModal] Modal display style:', window.getComputedStyle(this.modal).display);
            
            // データ取得前にローディング表示
            this.showLoading();
            
            try {
                // テスト用のユーザーIDの場合はデモデータを表示
                if (userId === 'test-user-id' || userId.startsWith('fallback-')) {
                    console.log('[MembersProfileModal] Using demo data for:', userId);
                    this.showDemoData(userId);
                    return;
                }
                
                // Supabaseチェック
                if (!window.supabaseClient && !window.supabase) {
                    console.error('[MembersProfileModal] Supabase not initialized, using demo data');
                    this.showDemoData(userId);
                    return;
                }
                
                // ユーザーデータを取得
                console.log('[MembersProfileModal] Supabase client:', window.supabase);
                console.log('[MembersProfileModal] supabaseClient:', window.supabaseClient);
                
                // supabaseClient を使用
                const client = window.supabaseClient || window.supabase;
                if (!client) {
                    console.error('[MembersProfileModal] No Supabase client found! Using demo data');
                    this.showDemoData(userId);
                    return;
                }
                
                console.log('[MembersProfileModal] Using client:', client);
                
                // user_profilesテーブルからデータを取得（正しいテーブル）
                const { data: userData, error } = await client
                    .from('user_profiles')
                    .select(`
                        *,
                        user_experiences (
                            title,
                            company,
                            description,
                            start_date,
                            end_date,
                            is_current
                        ),
                        user_business_challenges (
                            challenge_id,
                            details,
                            priority
                        )
                    `)
                    .eq('id', userId)
                    .single();
                
                if (error) {
                    console.log('[MembersProfileModal] Error fetching user data:', error.message);
                }
                
                if (!userData) {
                    console.log('[MembersProfileModal] No data found in database, using demo data');
                    this.showDemoData(userId);
                    return;
                }
                
                this.userData = userData;
                this.displayUserData(userData);
                
                // 閲覧履歴に追加（グローバル機能を使用）
                if (window.GlobalViewingHistory) {
                    window.GlobalViewingHistory.addUser(
                        userId,
                        userData.full_name || userData.display_name || userData.name || 'ユーザー',
                        userData.avatar_url
                    );
                }
                
            } catch (error) {
                console.error('[MembersProfileModal] データ取得エラー:', error);
                this.showError();
            }
        }
        
        showLoading() {
            const tabContent = this.modal.querySelector('.profile-tab-content');
            tabContent.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>読み込み中...</p>
                </div>
            `;
        }
        
        showError() {
            const tabContent = this.modal.querySelector('.profile-tab-content');
            tabContent.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>プロフィールの読み込みに失敗しました</p>
                </div>
            `;
        }
        
        showDemoData(userId) {
            console.log('[MembersProfileModal] Showing demo data for:', userId);
            
            // デモデータ
            const demoUsers = {
                'test-user-id': {
                    id: 'test-user-id',
                    full_name: 'テスト ユーザー',
                    name: 'Test User',
                    avatar_url: 'assets/user-placeholder.svg',
                    position: 'テストエンジニア',
                    company: 'テストカンパニー株式会社',
                    industry: 'IT・ソフトウェア',
                    location: '東京都',
                    bio: 'これはテスト用のプロフィールです。モーダルの動作確認に使用されています。',
                    email: 'test@example.com',
                    show_email: true,
                    skills: ['JavaScript', 'React', 'Node.js', 'テスト'],
                    interests: ['Web開発', '新技術', 'チームワーク'],
                    challenges: ['開発効率向上', 'チーム連携強化', 'DX推進'],
                    revenue_details: '売上アップのためのシステム改善が必要です。',
                    hr_details: 'エンジニア採用を強化したいと考えています。',
                    dx_details: 'レガシーシステムのモダン化を進めています。',
                    strategy_details: '新規事業展開のための技術戦略を検討中です。',
                    budget: 5000000
                },
                'fallback-1': {
                    id: 'fallback-1',
                    full_name: '山田 太郎',
                    name: '山田 太郎',
                    avatar_url: 'assets/user-placeholder.svg',
                    position: '代表取締役CEO',
                    company: '株式会社テックイノベーション',
                    industry: 'IT・ソフトウェア',
                    location: '東京都渋谷区',
                    bio: 'IT業界で15年の経験を持つエンジニア出身の経営者です。スタートアップから大企業まで幅広い経験があります。',
                    email: 'yamada@tech-innovation.co.jp',
                    show_email: true,
                    skills: ['Python', 'AI/ML', 'クラウド', 'チームマネジメント', '事業開発'],
                    interests: ['人工知能', 'ブロックチェーン', 'スタートアップ支援'],
                    challenges: ['AI導入', 'デジタル変革', '新規事業創出'],
                    revenue_details: 'AI技術を活用した新サービスで売上拡大を目指しています。',
                    hr_details: 'データサイエンティストとエンジニアの採用が急務です。',
                    dx_details: '社内業務のAI化とクラウド移行を推進しています。',
                    strategy_details: 'グローバル展開に向けた技術基盤の構築を計画中です。',
                    budget: 50000000
                }
            };
            
            const userData = demoUsers[userId] || demoUsers['test-user-id'];
            this.userData = userData;
            this.displayUserData(userData);
        }
        
        displayUserData(userData) {
            // ヘッダー情報
            this.modal.querySelector('#modalProfileName').textContent = 
                userData.full_name || userData.display_name || userData.name || 'プロフィール';
            this.modal.querySelector('#modalFullName').textContent = 
                userData.full_name || userData.display_name || userData.name || '名前未設定';
            this.modal.querySelector('#modalPosition').textContent = 
                userData.position || userData.title || '役職未設定';
            this.modal.querySelector('#modalCompany').textContent = 
                userData.company || '会社未設定';
            
            // アバター
            const avatar = this.modal.querySelector('#modalAvatar');
            avatar.src = userData.avatar_url || 'assets/user-placeholder.svg';
            avatar.onerror = () => { avatar.src = 'assets/user-placeholder.svg'; };
            
            // タブコンテンツを再作成
            this.createTabContent();
            
            // 各タブのデータを表示
            this.displayAboutTab(userData);
            this.displayExperienceTab(userData);
            this.displaySkillsTab(userData);
            this.displayInterestsTab(userData);
            this.displayChallengesTab(userData);
        }
        
        createTabContent() {
            const tabContent = this.modal.querySelector('.profile-tab-content');
            tabContent.innerHTML = `
                <!-- 基本情報タブ -->
                <div class="tab-pane" data-tab="about">
                    <div class="info-section">
                        <h4>自己紹介</h4>
                        <p id="modalBio">自己紹介文がありません</p>
                    </div>
                    <div class="info-section">
                        <h4>業界</h4>
                        <p id="modalIndustry">未設定</p>
                    </div>
                    <div class="info-section">
                        <h4>所在地</h4>
                        <p id="modalLocation">未設定</p>
                    </div>
                    <div class="info-section">
                        <h4>連絡先</h4>
                        <p id="modalEmail">非公開</p>
                    </div>
                </div>
                
                <!-- 経歴タブ -->
                <div class="tab-pane" data-tab="experience">
                    <div class="experience-list" id="modalExperience">
                        <p class="empty-state">経歴情報がありません</p>
                    </div>
                </div>
                
                <!-- スキルタブ -->
                <div class="tab-pane" data-tab="skills">
                    <div class="skills-container" id="modalSkills">
                        <p class="empty-state">スキル情報がありません</p>
                    </div>
                </div>
                
                <!-- 興味・関心タブ -->
                <div class="tab-pane" data-tab="interests">
                    <div class="interests-container" id="modalInterests">
                        <p class="empty-state">興味・関心情報がありません</p>
                    </div>
                </div>
                
                <!-- 事業課題タブ -->
                <div class="tab-pane ${this.currentTab === 'challenges' ? 'active' : ''}" data-tab="challenges">
                    <div class="challenges-container" id="modalChallenges">
                        <p class="empty-state">事業課題情報がありません</p>
                    </div>
                </div>
            `;
            
            // 現在のタブをアクティブに
            const activePane = tabContent.querySelector(`.tab-pane[data-tab="${this.currentTab}"]`);
            if (activePane) {
                activePane.classList.add('active');
            }
        }
        
        displayAboutTab(userData) {
            if (userData.bio) {
                this.modal.querySelector('#modalBio').textContent = userData.bio;
            }
            if (userData.industry) {
                this.modal.querySelector('#modalIndustry').textContent = userData.industry;
            }
            if (userData.location) {
                this.modal.querySelector('#modalLocation').textContent = userData.location;
            }
            if (userData.email && userData.show_email) {
                this.modal.querySelector('#modalEmail').textContent = userData.email;
            }
            
            // 追加フィールドを表示（user_profilesテーブルの詳細データ）
            const additionalInfo = [];
            if (userData.company) {
                additionalInfo.push(`会社: ${userData.company}`);
            }
            if (userData.position) {
                additionalInfo.push(`役職: ${userData.position}`);
            }
            if (userData.employee_count) {
                additionalInfo.push(`従業員数: ${userData.employee_count}`);
            }
            if (userData.revenue_scale) {
                additionalInfo.push(`売上規模: ${userData.revenue_scale}`);
            }
            
            // 基本情報セクションに追加情報を挿入
            if (additionalInfo.length > 0) {
                const bioSection = this.modal.querySelector('#modalBio').parentElement;
                const additionalDiv = document.createElement('div');
                additionalDiv.className = 'info-section';
                additionalDiv.innerHTML = `
                    <h4>企業情報</h4>
                    <p>${additionalInfo.join(' / ')}</p>
                `;
                bioSection.parentElement.insertBefore(additionalDiv, bioSection.nextSibling);
            }
        }
        
        displayExperienceTab(userData) {
            const container = this.modal.querySelector('#modalExperience');
            
            // user_experiencesテーブルのデータを使用
            if (userData.user_experiences && Array.isArray(userData.user_experiences) && userData.user_experiences.length > 0) {
                container.innerHTML = userData.user_experiences.map(exp => {
                    const period = exp.is_current ? 
                        `${exp.start_date || ''} - 現在` : 
                        `${exp.start_date || ''} - ${exp.end_date || ''}`;
                    
                    return `
                        <div class="experience-item">
                            <h5>${this.escapeHtml(exp.title || '')}</h5>
                            <p class="company">${this.escapeHtml(exp.company || '')}</p>
                            <p class="period">${this.escapeHtml(period)}</p>
                            ${exp.description ? `<p class="description">${this.escapeHtml(exp.description)}</p>` : ''}
                        </div>
                    `;
                }).join('');
            } else if (userData.work_history) {
                // フォールバック：work_historyフィールドがあれば使用
                container.innerHTML = `<p>${this.escapeHtml(userData.work_history)}</p>`;
            } else {
                container.innerHTML = '<p class="empty-state">経歴情報がありません</p>';
            }
        }
        
        displaySkillsTab(userData) {
            const container = this.modal.querySelector('#modalSkills');
            if (userData.skills && Array.isArray(userData.skills) && userData.skills.length > 0) {
                container.innerHTML = `
                    <div class="skills-grid">
                        ${userData.skills.map(skill => 
                            `<span class="skill-tag">${this.escapeHtml(skill)}</span>`
                        ).join('')}
                    </div>
                `;
            }
        }
        
        displayInterestsTab(userData) {
            const container = this.modal.querySelector('#modalInterests');
            if (userData.interests && Array.isArray(userData.interests) && userData.interests.length > 0) {
                container.innerHTML = `
                    <div class="interests-grid">
                        ${userData.interests.map(interest => 
                            `<span class="interest-tag">${this.escapeHtml(interest)}</span>`
                        ).join('')}
                    </div>
                `;
            }
        }
        
        displayChallengesTab(userData) {
            const container = this.modal.querySelector('#modalChallenges');
            let html = '';
            
            // user_business_challengesテーブルのデータを使用
            if (userData.user_business_challenges && Array.isArray(userData.user_business_challenges) && userData.user_business_challenges.length > 0) {
                // 優先度順にソート
                const sortedChallenges = userData.user_business_challenges.sort((a, b) => (a.priority || 999) - (b.priority || 999));
                
                html += `
                    <div class="challenges-list">
                        <h5>事業課題（優先度順）</h5>
                        <ul>
                            ${sortedChallenges.map(challenge => 
                                `<li>
                                    <i class="fas fa-check-circle"></i> 
                                    ${challenge.details ? this.escapeHtml(challenge.details) : '詳細なし'}
                                    ${challenge.priority ? `<span class="priority-badge">優先度 ${challenge.priority}</span>` : ''}
                                </li>`
                            ).join('')}
                        </ul>
                    </div>
                `;
            }
            
            // user_profilesテーブルの詳細フィールドも表示
            const challengeDetails = [
                { title: '売上・収益の課題', content: userData.revenue_details },
                { title: '組織・人材の課題', content: userData.hr_details },
                { title: '業務効率・DXの課題', content: userData.dx_details },
                { title: '事業戦略の課題', content: userData.strategy_details }
            ];
            
            challengeDetails.forEach(detail => {
                if (detail.content) {
                    html += `
                        <div class="challenge-detail">
                            <h5>${detail.title}</h5>
                            <p>${this.escapeHtml(detail.content)}</p>
                        </div>
                    `;
                }
            });
            
            // 予算情報（budget_rangeフィールドを使用）
            if (userData.budget_range) {
                html += `
                    <div class="budget-info">
                        <h5>予算規模</h5>
                        <p>${this.escapeHtml(userData.budget_range)}</p>
                    </div>
                `;
            }
            
            container.innerHTML = html || '<p class="empty-state">事業課題情報がありません</p>';
        }
        
        close() {
            this.modal.classList.remove('show');
            document.body.style.overflow = '';
            this.currentUserId = null;
            this.userData = null;
        }
        
        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
    }
}

// グローバル関数を定義
console.log('[DEBUG] 4. showMemberProfileModal関数登録前');
window.showMemberProfileModal = function(userId) {
    console.log('[MembersProfileModal] showMemberProfileModal called with:', userId);
    if (window.membersProfileModal && window.membersProfileModal.show) {
        window.membersProfileModal.show(userId);
    } else {
        console.error('[MembersProfileModal] Modal not initialized yet');
        // フォールバック: 初期化を試行
        if (window.MembersProfileModal && !window.membersProfileModal) {
            window.membersProfileModal = new window.MembersProfileModal();
            window.membersProfileModal.show(userId);
        }
    }
};

// onclickインラインハンドラーがあるため、addEventListenerは不要
// イベントハンドラーの重複を防ぐためコメントアウト
// document.addEventListener('click', (e) => {
//     console.log('[MembersProfileModal] Click event:', e.target);
//     
//     // プロフィールボタンのクリック
//     if (e.target.closest('.view-profile-btn')) {
//         e.preventDefault();
//         e.stopPropagation();
//         
//         const btn = e.target.closest('.view-profile-btn');
//         const userId = btn.dataset.memberId;
//         
//         console.log('[MembersProfileModal] Profile button clicked for userId:', userId);
//         
//         if (userId) {
//             if (window.membersProfileModal && window.membersProfileModal.show) {
//                 window.membersProfileModal.show(userId);
//             } else {
//                 console.error('[MembersProfileModal] Modal instance not found');
//             }
//         } else {
//             console.error('[MembersProfileModal] No userId found in button data');
//         }
//         
//         return false;
//     }
// });

// MembersProfileModalクラスをグローバルスコープに登録（ファイルの早い段階で実行）
console.log('[DEBUG] 2. クラス定義完了、グローバル登録前');
console.log('[DEBUG] MembersProfileModal (ローカル):', typeof MembersProfileModal);
window.MembersProfileModal = MembersProfileModal;
console.log('[DEBUG] 3. グローバル登録完了');
console.log('[DEBUG] window.MembersProfileModal:', !!window.MembersProfileModal);

// 初期化処理（ただしモーダルは表示しない）
function initializeMembersProfileModal() {
    // 既にインスタンスが存在する場合はスキップ（重複作成防止）
    if (window.membersProfileModal && window.membersProfileModal.show) {
        console.log('[MembersProfileModal] Instance already exists, skipping initialization');
        return;
    }
    
    console.log('[MembersProfileModal] Initializing...');
    try {
        console.log('[MembersProfileModal] Creating modal instance...');
        window.membersProfileModal = new MembersProfileModal();
        console.log('[MembersProfileModal] Instance created:', !!window.membersProfileModal);
        
        // 初期化直後に確実に非表示にする
        const modal = document.getElementById('memberProfileModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
            console.log('[MembersProfileModal] Modal hidden after initialization');
        }
        
        // グローバルに利用可能であることを確認
        if (window.membersProfileModal && window.membersProfileModal.show) {
            console.log('[MembersProfileModal] Modal ready to use');
        }
    } catch (error) {
        console.error('[MembersProfileModal] Initialization error:', error);
        // エラー時でも最小限の機能を提供
        window.membersProfileModal = {
            show: function(userId) {
                console.error('[MembersProfileModal] Failed to initialize, cannot show modal');
                alert('プロフィールを表示できません。ページを再読み込みしてください。');
            }
        };
    }
}

// 即座に初期化を実行
console.log('[MembersProfileModal] Starting initialization...');
initializeMembersProfileModal();

// DOMContentLoadedでも再確認（念のため）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.membersProfileModal || !window.membersProfileModal.show) {
            console.log('[MembersProfileModal] Re-initializing on DOMContentLoaded...');
            initializeMembersProfileModal();
        }
    });
}

// ProfileDetailModalとの互換性のため、同じインターフェースを提供
if (!window.ProfileDetailModal) {
    window.ProfileDetailModal = window.MembersProfileModal;
}
if (!window.profileDetailModal && window.membersProfileModal) {
    window.profileDetailModal = window.membersProfileModal;
}

console.log('[DEBUG] 5. ファイル読み込み完了時点');
console.log('[DEBUG] window.MembersProfileModal:', !!window.MembersProfileModal);
console.log('[DEBUG] window.showMemberProfileModal:', !!window.showMemberProfileModal);
console.log('[DEBUG] window.membersProfileModal:', !!window.membersProfileModal);
console.log('[MembersProfileModal] ファイル読み込み完了');