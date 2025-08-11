/**
 * プロフィール閲覧機能
 * URLパラメータからユーザーIDを取得して他のユーザーのプロフィールを表示
 */

(function() {
    'use strict';

    class ProfileViewer {
        constructor() {
            this.targetUserId = null;
            this.isOwnProfile = false;
            this.init();
        }

        async init() {
            // URLパラメータからユーザーIDを取得
            const urlParams = new URLSearchParams(window.location.search);
            this.targetUserId = urlParams.get('id');

            if (!this.targetUserId) {
                // IDがない場合は自分のプロフィールを表示
                this.isOwnProfile = true;
                return;
            }

            // 現在のユーザーを取得
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) {
                // console.log('[ProfileViewer] Not authenticated');
                return;
            }

            // 自分のプロフィールかチェック
            this.isOwnProfile = (user.id === this.targetUserId);

            if (!this.isOwnProfile) {
                // 他のユーザーのプロフィールを表示
                await this.loadOtherUserProfile();
                this.hideEditButtons();
            }
        }

        async loadOtherUserProfile() {
            try {
                // プロフィールデータを取得
                const { data: profile, error } = await window.supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', this.targetUserId)
                    .single();

                if (error) {
                    console.error('[ProfileViewer] Error loading profile:', error);
                    this.showError('プロフィールが見つかりません');
                    return;
                }

                if (!profile) {
                    this.showError('プロフィールが見つかりません');
                    return;
                }

                // プロフィール情報を表示
                this.displayProfile(profile);

            } catch (error) {
                console.error('[ProfileViewer] Error:', error);
                this.showError('プロフィールの読み込みに失敗しました');
            }
        }

        displayProfile(profile) {
            // 基本情報
            const updateElement = (selector, value) => {
                const element = document.querySelector(selector);
                if (element) {
                    element.textContent = value || '未設定';
                }
            };

            // 名前
            updateElement('.profile-name', profile.name || profile.email?.split('@')[0]);
            document.querySelectorAll('.user-name').forEach(el => {
                el.textContent = profile.name || profile.email?.split('@')[0] || 'ユーザー';
            });

            // 役職・会社
            updateElement('.profile-title', profile.title);
            updateElement('.profile-company', profile.company);

            // 自己紹介
            const bioElement = document.querySelector('.profile-bio p');
            if (bioElement) {
                bioElement.textContent = profile.bio || '自己紹介が設定されていません。';
            }

            // スキル
            const skillsContainer = document.querySelector('.profile-skills');
            if (skillsContainer && profile.skills) {
                skillsContainer.innerHTML = profile.skills.map(skill => 
                    `<span class="skill-tag">${this.escapeHtml(skill)}</span>`
                ).join('');
            }

            // アバター
            const avatarImg = document.querySelector('.profile-avatar img');
            if (avatarImg) {
                avatarImg.src = profile.avatar_url || 'assets/user-placeholder.svg';
                avatarImg.onerror = function() {
                    this.src = 'assets/user-placeholder.svg';
                };
            }

            // 業界・地域
            updateElement('[data-field="industry"]', this.getIndustryLabel(profile.industry));
            updateElement('[data-field="location"]', this.getLocationLabel(profile.location));

            // ヘッダータイトル
            const headerTitle = document.querySelector('.header-left h1');
            if (headerTitle) {
                headerTitle.textContent = `${profile.name || 'ユーザー'}のプロフィール`;
            }
        }

        hideEditButtons() {
            // 編集ボタンを非表示
            const editButtons = document.querySelectorAll('.btn-primary[onclick*="editProfile"], .btn-secondary[onclick*="editProfile"]');
            editButtons.forEach(btn => {
                btn.style.display = 'none';
            });

            // タブを非表示（他のユーザーのプロフィールでは基本情報のみ表示）
            const tabButtons = document.querySelectorAll('.tab-btn:not([onclick*="basic"])');
            tabButtons.forEach(btn => {
                btn.style.display = 'none';
            });

            // コネクトボタンを追加
            this.addConnectButton();
        }

        addConnectButton() {
            const profileHeader = document.querySelector('.profile-header');
            if (!profileHeader) return;

            const connectBtn = document.createElement('button');
            connectBtn.className = 'btn btn-primary';
            connectBtn.innerHTML = '<i class="fas fa-user-plus"></i> コネクト';
            connectBtn.onclick = () => this.sendConnectRequest();

            // 既存のボタンエリアを探す
            let buttonArea = profileHeader.querySelector('.profile-actions');
            if (!buttonArea) {
                buttonArea = document.createElement('div');
                buttonArea.className = 'profile-actions';
                buttonArea.style.marginTop = '20px';
                profileHeader.appendChild(buttonArea);
            }
            
            buttonArea.appendChild(connectBtn);
        }

        async sendConnectRequest() {
            if (window.matchingButtons && window.matchingButtons.sendConnectRequest) {
                await window.matchingButtons.sendConnectRequest(this.targetUserId);
            } else {
                alert('コネクト機能が利用できません');
            }
        }

        showError(message) {
            const container = document.querySelector('.profile-content');
            if (container) {
                container.innerHTML = `
                    <div class="error-message" style="text-align: center; padding: 50px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc3545; margin-bottom: 20px;"></i>
                        <h2>${message}</h2>
                        <a href="matching.html" class="btn btn-primary" style="margin-top: 20px;">マッチングページに戻る</a>
                    </div>
                `;
            }
        }

        getIndustryLabel(value) {
            const industries = {
                'tech': 'IT・テクノロジー',
                'finance': '金融',
                'healthcare': '医療・ヘルスケア',
                'retail': '小売・流通',
                'manufacturing': '製造業',
                'consulting': 'コンサルティング',
                'education': '教育',
                'real_estate': '不動産',
                'media': 'メディア・広告',
                'other': 'その他'
            };
            return industries[value] || value || '未設定';
        }

        getLocationLabel(value) {
            const locations = {
                'tokyo': '東京',
                'osaka': '大阪',
                'nagoya': '名古屋',
                'fukuoka': '福岡',
                'sapporo': '札幌',
                'sendai': '仙台',
                'hiroshima': '広島',
                'kyoto': '京都',
                'kobe': '神戸',
                'remote': 'リモート',
                'overseas': '海外',
                'other': 'その他'
            };
            return locations[value] || value || '未設定';
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    // DOMContentLoaded後に初期化
    document.addEventListener('DOMContentLoaded', () => {
        window.profileViewer = new ProfileViewer();
        // console.log('[ProfileViewer] Initialized');
    });

})();