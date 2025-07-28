/**
 * Members View Mode
 * メンバー表示モード切り替え
 */

(function() {
    'use strict';

    console.log('[MembersViewMode] 初期化開始...');

    class MembersViewModeManager {
        constructor() {
            this.currentView = 'grid'; // grid or list
            this.viewButtons = null;
            this.membersContainer = null;
            this.init();
        }

        init() {
            this.setupElements();
            this.loadSavedView();
            this.setupEventListeners();
            this.applyCurrentView();
        }

        /**
         * DOM要素を設定
         */
        setupElements() {
            this.viewButtons = document.querySelectorAll('.view-mode button');
            this.membersContainer = document.querySelector('.members-grid');
        }

        /**
         * 保存されたビューを読み込む
         */
        loadSavedView() {
            const savedView = localStorage.getItem('membersViewMode');
            if (savedView && ['grid', 'list'].includes(savedView)) {
                this.currentView = savedView;
            }
        }

        /**
         * イベントリスナーを設定
         */
        setupEventListeners() {
            this.viewButtons.forEach((button, index) => {
                button.addEventListener('click', () => {
                    const newView = index === 0 ? 'grid' : 'list';
                    this.switchView(newView);
                });
            });
        }

        /**
         * ビューを切り替える
         */
        switchView(view) {
            if (view === this.currentView) return;

            this.currentView = view;
            localStorage.setItem('membersViewMode', view);
            
            // ボタンのアクティブ状態を更新
            this.updateButtonStates();
            
            // ビューを適用
            this.applyCurrentView();
            
            // アニメーション
            this.animateTransition();
        }

        /**
         * ボタンのアクティブ状態を更新
         */
        updateButtonStates() {
            this.viewButtons.forEach((button, index) => {
                if ((index === 0 && this.currentView === 'grid') || 
                    (index === 1 && this.currentView === 'list')) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            });
        }

        /**
         * 現在のビューを適用
         */
        applyCurrentView() {
            if (!this.membersContainer) return;

            if (this.currentView === 'list') {
                this.membersContainer.classList.remove('members-grid');
                this.membersContainer.classList.add('members-list');
                this.updateMemberCardsForList();
            } else {
                this.membersContainer.classList.remove('members-list');
                this.membersContainer.classList.add('members-grid');
                this.updateMemberCardsForGrid();
            }
        }

        /**
         * リスト表示用にカードを更新
         */
        updateMemberCardsForList() {
            const cards = this.membersContainer.querySelectorAll('.member-card');
            cards.forEach(card => {
                card.classList.add('list-view');
                
                // レイアウトを調整
                const header = card.querySelector('.member-header');
                const tags = card.querySelector('.member-tags');
                const stats = card.querySelector('.member-stats');
                const actions = card.querySelector('.member-actions');
                
                if (header) header.classList.add('list-header');
                if (tags) tags.classList.add('list-tags');
                if (stats) stats.classList.add('list-stats');
                if (actions) actions.classList.add('list-actions');
            });
        }

        /**
         * グリッド表示用にカードを更新
         */
        updateMemberCardsForGrid() {
            const cards = this.membersContainer.querySelectorAll('.member-card');
            cards.forEach(card => {
                card.classList.remove('list-view');
                
                // レイアウトクラスを削除
                const header = card.querySelector('.member-header');
                const tags = card.querySelector('.member-tags');
                const stats = card.querySelector('.member-stats');
                const actions = card.querySelector('.member-actions');
                
                if (header) header.classList.remove('list-header');
                if (tags) tags.classList.remove('list-tags');
                if (stats) stats.classList.remove('list-stats');
                if (actions) actions.classList.remove('list-actions');
            });
        }

        /**
         * トランジションアニメーション
         */
        animateTransition() {
            if (!this.membersContainer) return;

            this.membersContainer.style.opacity = '0';
            this.membersContainer.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                this.membersContainer.style.opacity = '1';
                this.membersContainer.style.transform = 'scale(1)';
            }, 150);
        }

        /**
         * 外部から呼び出し可能なビュー切り替え
         */
        setView(view) {
            if (['grid', 'list'].includes(view)) {
                this.switchView(view);
            }
        }
    }

    // リスト表示用のスタイルを追加
    const style = document.createElement('style');
    style.textContent = `
        /* リスト表示コンテナ */
        .members-list {
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
            transition: all 0.3s ease;
        }

        /* リスト表示のメンバーカード */
        .member-card.list-view {
            display: flex;
            align-items: center;
            padding: var(--space-lg);
            gap: var(--space-lg);
            max-width: 100%;
        }

        .member-card.list-view:hover {
            transform: translateY(-2px);
        }

        /* リスト表示のヘッダー */
        .member-card.list-view .list-header {
            flex: 0 0 auto;
            margin-bottom: 0;
        }

        .member-card.list-view .member-avatar {
            width: 60px;
            height: 60px;
        }

        .member-card.list-view .member-info {
            min-width: 250px;
        }

        /* リスト表示のタグ */
        .member-card.list-view .list-tags {
            flex: 1;
            margin-bottom: 0;
            justify-content: flex-start;
        }

        /* リスト表示の統計 */
        .member-card.list-view .list-stats {
            flex: 0 0 auto;
            border: none;
            padding: 0;
            margin-bottom: 0;
            min-width: 150px;
        }

        /* リスト表示のアクション */
        .member-card.list-view .list-actions {
            flex: 0 0 auto;
            margin-top: 0;
            margin-left: auto;
        }

        /* モバイル対応 */
        @media (max-width: 1024px) {
            .member-card.list-view {
                flex-wrap: wrap;
            }

            .member-card.list-view .list-header {
                width: 100%;
            }

            .member-card.list-view .list-tags {
                width: 100%;
                order: 3;
            }

            .member-card.list-view .list-stats {
                order: 4;
            }

            .member-card.list-view .list-actions {
                width: 100%;
                order: 5;
                margin-top: var(--space-md);
            }
        }

        @media (max-width: 768px) {
            .member-card.list-view {
                padding: var(--space-md);
            }

            .member-card.list-view .member-avatar {
                width: 50px;
                height: 50px;
            }

            .member-card.list-view .member-info h3 {
                font-size: 1.125rem;
            }

            .member-card.list-view .list-actions {
                flex-direction: column;
                gap: var(--space-sm);
            }

            .member-card.list-view .list-actions .btn {
                width: 100%;
            }
        }

        /* アニメーション */
        .members-grid,
        .members-list {
            transition: opacity 0.3s ease, transform 0.3s ease;
        }

        /* ボタンアクティブ状態の強調 */
        .view-mode button.active {
            background: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
            box-shadow: 0 2px 8px rgba(0, 102, 255, 0.3);
        }
    `;
    document.head.appendChild(style);

    // グローバルインスタンス
    window.membersViewMode = new MembersViewModeManager();

    // Supabaseマネージャーが更新された時に再適用
    if (window.membersSupabase) {
        const originalUpdateUI = window.membersSupabase.updateMembersUI;
        window.membersSupabase.updateMembersUI = function() {
            originalUpdateUI.call(this);
            if (window.membersViewMode) {
                window.membersViewMode.applyCurrentView();
            }
        };
    }

    console.log('[MembersViewMode] 初期化完了');
})();