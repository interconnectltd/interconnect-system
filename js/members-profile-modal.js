/**
 * Members Profile Modal
 * メンバーページ専用のプロフィールモーダル機能
 */

(function() {
    'use strict';
    
    console.log('[MembersProfileModal] 初期化開始');
    
    // プロフィールモーダルクラス
    class MembersProfileModal {
        constructor() {
            this.modal = null;
            this.currentUserId = null;
            this.currentTab = 'challenges'; // デフォルトは事業課題
            this.userData = null;
            
            this.init();
        }
        
        init() {
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
                            <button class="tab-btn active" data-tab="challenges">事業課題</button>
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
                            <div class="tab-pane active" data-tab="challenges">
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
                // Supabaseチェック
                if (!window.supabase) {
                    console.error('[MembersProfileModal] Supabase not initialized');
                    return;
                }
                
                // ユーザーデータを取得
                const { data: userData, error } = await window.supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();
                
                if (error) throw error;
                
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
        }
        
        displayExperienceTab(userData) {
            const container = this.modal.querySelector('#modalExperience');
            if (userData.experience && Array.isArray(userData.experience) && userData.experience.length > 0) {
                container.innerHTML = userData.experience.map(exp => `
                    <div class="experience-item">
                        <h5>${this.escapeHtml(exp.title || '')}</h5>
                        <p class="company">${this.escapeHtml(exp.company || '')}</p>
                        <p class="period">${this.escapeHtml(exp.period || '')}</p>
                        ${exp.description ? `<p class="description">${this.escapeHtml(exp.description)}</p>` : ''}
                    </div>
                `).join('');
            } else if (userData.work_history) {
                // 代替フィールドをチェック
                container.innerHTML = `<p>${this.escapeHtml(userData.work_history)}</p>`;
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
            const challenges = [];
            
            // 各種課題フィールドをチェック
            if (userData.challenges && Array.isArray(userData.challenges)) {
                challenges.push(...userData.challenges);
            }
            
            // 課題詳細フィールドをチェック
            const challengeDetails = [
                { title: '売上・収益の課題', content: userData.revenue_details },
                { title: '組織・人材の課題', content: userData.hr_details },
                { title: '業務効率・DXの課題', content: userData.dx_details },
                { title: '事業戦略の課題', content: userData.strategy_details }
            ];
            
            let html = '';
            
            // チェックボックス形式の課題
            if (challenges.length > 0) {
                html += `
                    <div class="challenges-list">
                        <h5>主な課題</h5>
                        <ul>
                            ${challenges.map(challenge => 
                                `<li><i class="fas fa-check-circle"></i> ${this.escapeHtml(challenge)}</li>`
                            ).join('')}
                        </ul>
                    </div>
                `;
            }
            
            // 詳細テキスト形式の課題
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
            
            // 予算情報
            if (userData.budget) {
                const budgetFormatted = new Intl.NumberFormat('ja-JP', {
                    style: 'currency',
                    currency: 'JPY'
                }).format(userData.budget);
                
                html += `
                    <div class="budget-info">
                        <h5>年間予算規模</h5>
                        <p>${budgetFormatted}</p>
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
    
    // グローバルインスタンスを作成
    console.log('[MembersProfileModal] Creating global instance...');
    window.membersProfileModal = new MembersProfileModal();
    console.log('[MembersProfileModal] Global instance created:', window.membersProfileModal);
    
    // プロフィールボタンのクリックイベントを監視
    document.addEventListener('click', (e) => {
        // メンバーページでのプロフィールボタンクリック
        if (e.target.closest('.members-grid .btn-primary[href^="profile.html"]')) {
            e.preventDefault();
            const link = e.target.closest('a');
            const urlParams = new URLSearchParams(link.href.split('?')[1]);
            const userId = urlParams.get('user');
            
            if (userId && window.membersProfileModal) {
                window.membersProfileModal.show(userId);
            }
        }
    });
    
})();