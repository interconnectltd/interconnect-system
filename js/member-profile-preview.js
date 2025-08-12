/**
 * Member Profile Preview
 * メンバープロフィールのホバープレビュー機能
 */

(function() {
    'use strict';

    class MemberProfilePreview {
        constructor() {
            this.previewElement = null;
            this.currentTarget = null;
            this.hideTimeout = null;
            this.showTimeout = null;
            this.isPreviewHovered = false;
            this.cache = new Map();
            this.cacheExpiry = 5 * 60 * 1000; // 5分
            
            this.init();
        }

        init() {
            this.createPreviewElement();
            this.setupEventListeners();
            // console.log('[ProfilePreview] Initialized');
        }

        /**
         * プレビュー要素を作成
         */
        createPreviewElement() {
            this.previewElement = document.createElement('div');
            this.previewElement.className = 'profile-preview';
            this.previewElement.innerHTML = `
                <div class="profile-preview-content">
                    <div class="profile-preview-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                </div>
            `;
            document.body.appendChild(this.previewElement);
        }

        /**
         * イベントリスナーを設定
         */
        setupEventListeners() {
            // メンバーカードのホバーイベントを監視
            document.addEventListener('mouseenter', (e) => {
                // e.targetがElementであることを確認
                if (!e.target || !e.target.nodeType || e.target.nodeType !== 1) return;
                
                const memberCard = e.target.closest('.member-card');
                if (memberCard && !memberCard.closest('.profile-preview')) {
                    this.handleMouseEnter(memberCard);
                }
            }, true);

            document.addEventListener('mouseleave', (e) => {
                // e.targetがElementであることを確認
                if (!e.target || !e.target.nodeType || e.target.nodeType !== 1) return;
                
                const memberCard = e.target.closest('.member-card');
                if (memberCard && memberCard === this.currentTarget) {
                    this.handleMouseLeave();
                }
            }, true);

            // プレビュー自体のホバーイベント
            this.previewElement.addEventListener('mouseenter', () => {
                this.isPreviewHovered = true;
                this.cancelHide();
            });

            this.previewElement.addEventListener('mouseleave', () => {
                this.isPreviewHovered = false;
                this.scheduleHide();
            });

            // スクロール時は非表示
            window.addEventListener('scroll', () => {
                this.hidePreview();
            }, { passive: true });

            // クリックで非表示
            document.addEventListener('click', (e) => {
                // e.targetがElementであることを確認
                if (!e.target || !e.target.nodeType || e.target.nodeType !== 1) return;
                
                // closestメソッドが使用可能か確認
                if (typeof e.target.closest === 'function') {
                    if (!e.target.closest('.member-card') && !e.target.closest('.profile-preview')) {
                        this.hidePreview();
                    }
                }
            });
            
            // プレビュー内のボタンクリックイベント
            this.previewElement.addEventListener('click', (e) => {
                if (e.target.closest('.preview-profile-btn')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const btn = e.target.closest('.preview-profile-btn');
                    const userId = btn.dataset.userId;
                    
                    // モーダル表示を試行
                    if (window.membersProfileModal && window.membersProfileModal.show) {
                        window.membersProfileModal.show(userId);
                        this.hidePreview(); // プレビューを閉じる
                    } else if (window.showMemberProfileModal) {
                        window.showMemberProfileModal(userId);
                        this.hidePreview();
                    } else {
                        // フォールバック：モーダルが利用できない場合のみプロフィールページへ
                        console.warn('[ProfilePreview] Modal not available, redirecting to profile page');
                        window.location.href = `profile.html?user=${userId}`;
                    }
                } else if (e.target.closest('.preview-message-btn')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const btn = e.target.closest('.preview-message-btn');
                    const userId = btn.dataset.userId;
                    window.location.href = `messages.html?user=${userId}`;
                }
            });
        }

        /**
         * マウスエンター処理
         */
        handleMouseEnter(memberCard) {
            this.currentTarget = memberCard;
            this.cancelHide();
            
            // 少し遅延してから表示（誤操作防止）
            this.showTimeout = setTimeout(() => {
                this.showPreview(memberCard);
            }, 300);
        }

        /**
         * マウスリーブ処理
         */
        handleMouseLeave() {
            clearTimeout(this.showTimeout);
            if (!this.isPreviewHovered) {
                this.scheduleHide();
            }
        }

        /**
         * プレビューを表示
         */
        async showPreview(memberCard) {
            const userId = memberCard.dataset.userId;
            if (!userId) return;

            // キャッシュチェック
            const cached = this.cache.get(userId);
            if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
                this.displayPreview(memberCard, cached.data);
                return;
            }

            // ローディング表示
            this.displayLoading(memberCard);

            try {
                // Supabaseからユーザー情報を取得
                const client = window.supabaseClient || window.supabase;
                if (!client) {
                    console.error('[ProfilePreview] No Supabase client found');
                    return;
                }
                
                const { data: userData, error } = await client
                    .from('user_profiles')
                    .select(`
                        id,
                        name,
                        full_name,
                        email,
                        company,
                        position,
                        industry,
                        bio,
                        skills,
                        avatar_url,
                        is_online,
                        last_login_at
                    `)
                    .eq('id', userId)
                    .single();

                if (error) throw error;

                // キャッシュに保存
                this.cache.set(userId, {
                    data: userData,
                    timestamp: Date.now()
                });

                this.displayPreview(memberCard, userData);

            } catch (error) {
                console.error('[ProfilePreview] Error fetching user data:', error);
                this.displayError();
            }
        }

        /**
         * ローディング表示
         */
        displayLoading(memberCard) {
            const rect = memberCard.getBoundingClientRect();
            this.positionPreview(rect);
            
            this.previewElement.classList.add('visible');
            const content = this.previewElement.querySelector('.profile-preview-content');
            content.innerHTML = `
                <div class="profile-preview-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
            `;
        }

        /**
         * プレビューコンテンツを表示
         */
        displayPreview(memberCard, userData) {
            if (this.currentTarget !== memberCard) return;

            const rect = memberCard.getBoundingClientRect();
            this.positionPreview(rect);

            const content = this.previewElement.querySelector('.profile-preview-content');
            
            // オンラインステータス
            const isOnline = this.checkOnlineStatus(userData.last_login_at);
            const onlineClass = isOnline ? 'online' : 'offline';
            const onlineText = isOnline ? 'オンライン' : 'オフライン';

            // スキルタグ
            const skillsHTML = userData.skills ? 
                userData.skills.slice(0, 3).map(skill => 
                    `<span class="skill-tag">${this.escapeHtml(skill)}</span>`
                ).join('') : '';

            content.innerHTML = `
                <div class="profile-preview-header">
                    <div class="preview-avatar">
                        <img src="${userData.avatar_url || 'assets/user-placeholder.svg'}" 
                             alt="${this.escapeHtml(userData.name || 'User')}"
                             onerror="this.src='assets/user-placeholder.svg'">
                        <span class="status-indicator ${onlineClass}"></span>
                    </div>
                    <div class="preview-info">
                        <h4>${this.escapeHtml(userData.full_name || userData.name || 'ユーザー')}</h4>
                        <p class="preview-position">${this.escapeHtml(userData.position || '役職未設定')}</p>
                        <p class="preview-company">${this.escapeHtml(userData.company || '会社未設定')}</p>
                    </div>
                </div>
                
                ${userData.bio ? `
                    <div class="profile-preview-bio">
                        <p>${this.escapeHtml(this.truncateText(userData.bio, 100))}</p>
                    </div>
                ` : ''}
                
                ${skillsHTML ? `
                    <div class="profile-preview-skills">
                        ${skillsHTML}
                        ${userData.skills.length > 3 ? `<span class="skill-more">+${userData.skills.length - 3}</span>` : ''}
                    </div>
                ` : ''}
                
                <div class="profile-preview-footer">
                    <div class="preview-stat">
                        <i class="fas fa-circle ${onlineClass}"></i>
                        <span>${onlineText}</span>
                    </div>
                    <div class="preview-stat">
                        <i class="fas fa-briefcase"></i>
                        <span>${this.escapeHtml(userData.industry || '業界未設定')}</span>
                    </div>
                </div>
                
                <div class="profile-preview-actions">
                    <button class="btn btn-sm btn-primary preview-profile-btn" data-user-id="${userData.id}">
                        <i class="fas fa-user"></i> プロフィールを見る
                    </button>
                    <button class="btn btn-sm btn-outline preview-message-btn" data-user-id="${userData.id}">
                        <i class="fas fa-envelope"></i> メッセージ
                    </button>
                </div>
            `;

            this.previewElement.classList.add('visible');
        }

        /**
         * エラー表示
         */
        displayError() {
            const content = this.previewElement.querySelector('.profile-preview-content');
            content.innerHTML = `
                <div class="profile-preview-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>プロフィールを読み込めませんでした</p>
                </div>
            `;
        }

        /**
         * プレビューの位置を調整
         */
        positionPreview(targetRect) {
            const previewRect = this.previewElement.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const margin = 10;

            let left = targetRect.right + margin;
            let top = targetRect.top;

            // 右側に表示スペースがない場合は左側に表示
            if (left + previewRect.width > viewportWidth - margin) {
                left = targetRect.left - previewRect.width - margin;
            }

            // 左側にも表示スペースがない場合は下に表示
            if (left < margin) {
                left = targetRect.left;
                top = targetRect.bottom + margin;
            }

            // 下に表示する場合、画面外にはみ出さないよう調整
            if (top + previewRect.height > viewportHeight - margin) {
                top = viewportHeight - previewRect.height - margin;
            }

            // 最小値の保証
            left = Math.max(margin, left);
            top = Math.max(margin, top);

            this.previewElement.style.left = `${left}px`;
            this.previewElement.style.top = `${top}px`;
        }

        /**
         * プレビューを非表示にするスケジュール
         */
        scheduleHide() {
            this.cancelHide();
            this.hideTimeout = setTimeout(() => {
                if (!this.isPreviewHovered) {
                    this.hidePreview();
                }
            }, 300);
        }

        /**
         * 非表示のキャンセル
         */
        cancelHide() {
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
            }
        }

        /**
         * プレビューを非表示
         */
        hidePreview() {
            this.previewElement.classList.remove('visible');
            this.currentTarget = null;
            this.cancelHide();
            clearTimeout(this.showTimeout);
        }

        /**
         * オンラインステータスをチェック
         */
        checkOnlineStatus(lastLoginAt) {
            if (!lastLoginAt) return false;
            const lastLogin = new Date(lastLoginAt);
            const now = new Date();
            const diffMinutes = (now - lastLogin) / (1000 * 60);
            return diffMinutes < 5; // 5分以内ならオンライン
        }

        /**
         * テキストを切り詰める
         */
        truncateText(text, maxLength) {
            if (!text || text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        }

        /**
         * HTMLエスケープ
         */
        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    // グローバルに公開
    window.MemberProfilePreview = MemberProfilePreview;
    
    // DOMContentLoaded時に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.memberProfilePreview = new MemberProfilePreview();
        });
    } else {
        window.memberProfilePreview = new MemberProfilePreview();
    }

})();