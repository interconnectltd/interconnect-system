/**
 * Notifications Complete Check
 * 通知ページの完全性チェックと最終修正
 */

(function() {
    'use strict';

    console.log('[NotificationCompleteCheck] 完全性チェックを開始...');

    class NotificationCompleteChecker {
        constructor() {
            this.issues = [];
            this.init();
        }

        async init() {
            console.log('[NotificationCompleteCheck] システムチェック開始');
            
            // 1. 必要な要素の存在確認
            this.checkRequiredElements();
            
            // 2. Supabase接続確認
            await this.checkSupabaseConnection();
            
            // 3. データ整合性確認
            this.checkDataIntegrity();
            
            // 4. UI/UXの問題確認
            this.checkUIUXIssues();
            
            // 5. パフォーマンス確認
            this.checkPerformance();
            
            // 6. エラーハンドリング確認
            this.checkErrorHandling();
            
            // 7. モバイル対応確認
            this.checkMobileResponsiveness();
            
            // 8. アクセシビリティ確認
            this.checkAccessibility();
            
            // レポート出力
            this.generateReport();
        }

        /**
         * 必要な要素の存在確認
         */
        checkRequiredElements() {
            console.log('[NotificationCompleteCheck] 要素チェック...');
            
            const requiredElements = [
                { selector: '.notifications-page', name: '通知ページコンテナ' },
                { selector: '.notifications-filters', name: 'フィルターコンテナ' },
                { selector: '.filter-btn', name: 'フィルターボタン' },
                { selector: '.notification-item-full', name: '通知アイテム' },
                { selector: '#batchActionToolbar', name: '一括操作ツールバー' },
                { selector: '#advancedFilters', name: '詳細フィルター' }
            ];

            requiredElements.forEach(item => {
                const element = document.querySelector(item.selector);
                if (!element) {
                    this.issues.push({
                        type: 'ERROR',
                        category: '要素不足',
                        message: `${item.name}が見つかりません`,
                        selector: item.selector
                    });
                }
            });
        }

        /**
         * Supabase接続確認
         */
        async checkSupabaseConnection() {
            console.log('[NotificationCompleteCheck] Supabase接続チェック...');
            
            if (!window.supabase) {
                this.issues.push({
                    type: 'ERROR',
                    category: 'Supabase',
                    message: 'Supabaseクライアントが初期化されていません'
                });
                return;
            }

            try {
                // テスト接続
                const { data, error } = await window.supabase
                    .from('user_activities')
                    .select('count')
                    .limit(1);

                if (error && error.code !== '42P01') {
                    this.issues.push({
                        type: 'WARNING',
                        category: 'Supabase',
                        message: `データベース接続エラー: ${error.message}`
                    });
                }
            } catch (error) {
                this.issues.push({
                    type: 'ERROR',
                    category: 'Supabase',
                    message: `接続テスト失敗: ${error.message}`
                });
            }
        }

        /**
         * データ整合性確認
         */
        checkDataIntegrity() {
            console.log('[NotificationCompleteCheck] データ整合性チェック...');
            
            // グローバル通知配列の確認
            if (!window.notifications) {
                this.issues.push({
                    type: 'ERROR',
                    category: 'データ',
                    message: 'グローバル通知配列が存在しません'
                });
            } else {
                // データ形式の確認
                window.notifications.forEach((notification, index) => {
                    if (!notification.id) {
                        this.issues.push({
                            type: 'WARNING',
                            category: 'データ',
                            message: `通知[${index}]にIDがありません`
                        });
                    }
                    if (!notification.type) {
                        this.issues.push({
                            type: 'WARNING',
                            category: 'データ',
                            message: `通知[${index}]にタイプがありません`
                        });
                    }
                });
            }

            // DOM要素とデータの同期確認
            const domNotifications = document.querySelectorAll('.notification-item-full');
            const dataIds = window.notifications ? window.notifications.map(n => n.id) : [];
            
            domNotifications.forEach(element => {
                const id = element.dataset.id;
                if (id && !dataIds.includes(id)) {
                    this.issues.push({
                        type: 'WARNING',
                        category: 'データ同期',
                        message: `DOM要素(ID: ${id})がデータ配列に存在しません`
                    });
                }
            });
        }

        /**
         * UI/UXの問題確認
         */
        checkUIUXIssues() {
            console.log('[NotificationCompleteCheck] UI/UXチェック...');
            
            // アラートが残っていないか確認
            const alertButtons = document.querySelectorAll('button[onclick*="alert"]');
            alertButtons.forEach(button => {
                this.issues.push({
                    type: 'WARNING',
                    category: 'UI/UX',
                    message: `アラートボタンが残っています: ${button.textContent}`,
                    element: button
                });
            });

            // 空のhref確認
            const emptyLinks = document.querySelectorAll('a[href="#"], a[href=""]');
            emptyLinks.forEach(link => {
                if (link.closest('.notification-actions')) {
                    this.issues.push({
                        type: 'INFO',
                        category: 'UI/UX',
                        message: `空のリンクがあります: ${link.textContent}`,
                        element: link
                    });
                }
            });

            // ローディング状態の確認
            const loadingElements = document.querySelectorAll('.loading, .skeleton');
            if (loadingElements.length > 0) {
                this.issues.push({
                    type: 'INFO',
                    category: 'UI/UX',
                    message: `ローディング要素が表示されたままです: ${loadingElements.length}個`
                });
            }
        }

        /**
         * パフォーマンス確認
         */
        checkPerformance() {
            console.log('[NotificationCompleteCheck] パフォーマンスチェック...');
            
            // イベントリスナーの重複確認
            const buttons = document.querySelectorAll('.btn');
            let duplicateListeners = 0;
            
            buttons.forEach(button => {
                // data-fixed属性で重複を検出
                if (button.getAttribute('data-fixed') && button.onclick) {
                    duplicateListeners++;
                }
            });

            if (duplicateListeners > 0) {
                this.issues.push({
                    type: 'WARNING',
                    category: 'パフォーマンス',
                    message: `重複したイベントリスナーの可能性: ${duplicateListeners}個`
                });
            }

            // DOM要素数の確認
            const notificationCount = document.querySelectorAll('.notification-item-full').length;
            if (notificationCount > 100) {
                this.issues.push({
                    type: 'WARNING',
                    category: 'パフォーマンス',
                    message: `大量の通知要素: ${notificationCount}個（ページネーション推奨）`
                });
            }
        }

        /**
         * エラーハンドリング確認
         */
        checkErrorHandling() {
            console.log('[NotificationCompleteCheck] エラーハンドリングチェック...');
            
            // コンソールエラーの確認
            const originalError = console.error;
            let errorCount = 0;
            
            console.error = function(...args) {
                errorCount++;
                originalError.apply(console, args);
            };

            // エラーメッセージ要素の確認
            const errorMessages = document.querySelectorAll('.error-message, .error-state');
            if (errorMessages.length > 0) {
                this.issues.push({
                    type: 'INFO',
                    category: 'エラー',
                    message: `エラー表示要素が存在: ${errorMessages.length}個`
                });
            }

            // console.errorを元に戻す
            setTimeout(() => {
                console.error = originalError;
                if (errorCount > 0) {
                    this.issues.push({
                        type: 'WARNING',
                        category: 'エラー',
                        message: `コンソールエラー検出: ${errorCount}個`
                    });
                }
            }, 100);
        }

        /**
         * モバイル対応確認
         */
        checkMobileResponsiveness() {
            console.log('[NotificationCompleteCheck] モバイル対応チェック...');
            
            const viewportWidth = window.innerWidth;
            
            if (viewportWidth <= 768) {
                // モバイルビューでの確認
                const horizontalScroll = document.documentElement.scrollWidth > viewportWidth;
                if (horizontalScroll) {
                    this.issues.push({
                        type: 'WARNING',
                        category: 'モバイル',
                        message: '横スクロールが発生しています'
                    });
                }

                // タッチターゲットサイズの確認
                const buttons = document.querySelectorAll('.btn-small, .btn-icon');
                buttons.forEach(button => {
                    const rect = button.getBoundingClientRect();
                    if (rect.width < 44 || rect.height < 44) {
                        this.issues.push({
                            type: 'INFO',
                            category: 'モバイル',
                            message: `タッチターゲットが小さい: ${button.textContent || 'アイコンボタン'}`,
                            size: `${rect.width}x${rect.height}`
                        });
                    }
                });
            }
        }

        /**
         * アクセシビリティ確認
         */
        checkAccessibility() {
            console.log('[NotificationCompleteCheck] アクセシビリティチェック...');
            
            // aria-label確認
            const buttons = document.querySelectorAll('button');
            buttons.forEach(button => {
                if (!button.textContent.trim() && !button.getAttribute('aria-label')) {
                    this.issues.push({
                        type: 'WARNING',
                        category: 'アクセシビリティ',
                        message: 'アイコンボタンにaria-labelがありません',
                        element: button
                    });
                }
            });

            // alt属性確認
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                if (!img.getAttribute('alt')) {
                    this.issues.push({
                        type: 'WARNING',
                        category: 'アクセシビリティ',
                        message: `画像にalt属性がありません: ${img.src}`,
                        element: img
                    });
                }
            });

            // フォーカス可能要素の確認
            const focusableElements = document.querySelectorAll('a, button, input, select, textarea');
            focusableElements.forEach(element => {
                if (element.tabIndex < 0) {
                    this.issues.push({
                        type: 'INFO',
                        category: 'アクセシビリティ',
                        message: 'フォーカス不可能な要素があります',
                        element: element
                    });
                }
            });
        }

        /**
         * レポート生成
         */
        generateReport() {
            console.log('[NotificationCompleteCheck] レポート生成...');
            
            const totalIssues = this.issues.length;
            const errors = this.issues.filter(i => i.type === 'ERROR').length;
            const warnings = this.issues.filter(i => i.type === 'WARNING').length;
            const info = this.issues.filter(i => i.type === 'INFO').length;

            console.log(`
====================================
通知ページ完全性チェックレポート
====================================
総問題数: ${totalIssues}
- エラー: ${errors}
- 警告: ${warnings}
- 情報: ${info}

詳細:
`);

            // カテゴリ別に表示
            const categories = [...new Set(this.issues.map(i => i.category))];
            
            categories.forEach(category => {
                const categoryIssues = this.issues.filter(i => i.category === category);
                console.log(`\n【${category}】`);
                categoryIssues.forEach(issue => {
                    console.log(`${issue.type}: ${issue.message}`);
                    if (issue.element) {
                        console.log('  要素:', issue.element);
                    }
                });
            });

            // 自動修正を試みる
            if (totalIssues > 0) {
                console.log('\n自動修正を試みています...');
                this.attemptAutoFix();
            } else {
                console.log('\n✅ 問題は検出されませんでした！通知ページは完璧です！');
            }
        }

        /**
         * 自動修正を試みる
         */
        attemptAutoFix() {
            let fixedCount = 0;

            // アラートボタンの修正
            const alertButtons = document.querySelectorAll('button[onclick*="alert"]');
            alertButtons.forEach(button => {
                if (window.notificationActionsFixManager) {
                    window.notificationActionsFixManager.fixGenericButton(button);
                    fixedCount++;
                }
            });

            // aria-labelの追加
            const iconButtons = document.querySelectorAll('button:not([aria-label])');
            iconButtons.forEach(button => {
                if (!button.textContent.trim()) {
                    const icon = button.querySelector('i');
                    if (icon) {
                        const label = this.getAriaLabelFromIcon(icon.className);
                        button.setAttribute('aria-label', label);
                        fixedCount++;
                    }
                }
            });

            console.log(`\n✅ ${fixedCount}個の問題を自動修正しました`);
        }

        /**
         * アイコンからaria-labelを生成
         */
        getAriaLabelFromIcon(iconClass) {
            const iconMap = {
                'fa-trash': '削除',
                'fa-check': '既読にする',
                'fa-times': '閉じる',
                'fa-filter': 'フィルター',
                'fa-search': '検索',
                'fa-bell': '通知',
                'fa-undo': 'リセット'
            };

            for (const [icon, label] of Object.entries(iconMap)) {
                if (iconClass.includes(icon)) {
                    return label;
                }
            }

            return 'アクション';
        }
    }

    // 初期化
    setTimeout(() => {
        window.notificationCompleteChecker = new NotificationCompleteChecker();
    }, 3500);

})();