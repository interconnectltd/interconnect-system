/**
 * Dashboard Activity Enhancer
 * 最新のアクティビティ機能を強化
 */

(function() {
    'use strict';

    class ActivityEnhancer {
        constructor() {
            this.activityTypes = {
                // ユーザー関連
                'user_registered': {
                    icon: 'fa-user-plus',
                    color: '#4CAF50',
                    template: 'さんがコミュニティに参加しました',
                    priority: 8
                },
                'profile_updated': {
                    icon: 'fa-user-edit',
                    color: '#2196F3',
                    template: 'さんがプロフィールを更新しました',
                    priority: 3
                },
                'user_login': {
                    icon: 'fa-sign-in-alt',
                    color: '#607D8B',
                    template: 'さんがログインしました',
                    priority: 1
                },
                
                // イベント関連
                'event_created': {
                    icon: 'fa-calendar-plus',
                    color: '#FF9800',
                    template: 'さんが新しいイベント「{event_name}」を作成しました',
                    priority: 9
                },
                'event_joined': {
                    icon: 'fa-calendar-check',
                    color: '#4CAF50',
                    template: 'さんがイベント「{event_name}」に参加登録しました',
                    priority: 7
                },
                'event_cancelled': {
                    icon: 'fa-calendar-times',
                    color: '#F44336',
                    template: 'さんがイベント「{event_name}」への参加をキャンセルしました',
                    priority: 5
                },
                'event_completed': {
                    icon: 'fa-trophy',
                    color: '#FFD700',
                    template: 'イベント「{event_name}」が成功裏に終了しました',
                    priority: 8
                },
                
                // マッチング関連
                'matching_request': {
                    icon: 'fa-hand-paper',
                    color: '#9C27B0',
                    template: 'さんがマッチングリクエストを送信しました',
                    priority: 6
                },
                'matching_success': {
                    icon: 'fa-handshake',
                    color: '#4CAF50',
                    template: 'さんと{partner_name}さんのマッチングが成立しました',
                    priority: 10
                },
                'profile_exchange': {
                    icon: 'fa-address-card',
                    color: '#00BCD4',
                    template: 'さんがプロフィールを交換しました',
                    priority: 7
                },
                
                // メッセージ関連
                'message_sent': {
                    icon: 'fa-envelope',
                    color: '#3F51B5',
                    template: 'さんがメッセージを送信しました',
                    priority: 4
                },
                'message_received': {
                    icon: 'fa-envelope-open',
                    color: '#673AB7',
                    template: 'さんが新しいメッセージを受信しました',
                    priority: 5
                },
                
                // システム関連
                'achievement_unlocked': {
                    icon: 'fa-award',
                    color: '#FFD700',
                    template: 'さんが「{achievement_name}」の実績を解除しました',
                    priority: 9
                },
                'milestone_reached': {
                    icon: 'fa-flag-checkered',
                    color: '#E91E63',
                    template: '{milestone_description}',
                    priority: 10
                }
            };
        }

        /**
         * アクティビティデータを拡張
         */
        enhanceActivity(activity) {
            const typeConfig = this.activityTypes[activity.activity_type] || {
                icon: 'fa-info-circle',
                color: '#757575',
                template: activity.activity_type,
                priority: 0
            };

            // テンプレートに変数を適用
            let description = typeConfig.template;
            if (activity.activity_data) {
                Object.keys(activity.activity_data).forEach(key => {
                    description = description.replace(`{${key}}`, activity.activity_data[key]);
                });
            }

            return {
                ...activity,
                icon: typeConfig.icon,
                color: typeConfig.color,
                description: description,
                priority: typeConfig.priority,
                formattedTime: this.formatTimeAgo(activity.created_at)
            };
        }

        /**
         * 時間をより詳細にフォーマット
         */
        formatTimeAgo(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffSeconds = Math.floor(diffMs / 1000);
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffSeconds < 30) {
                return 'たった今';
            } else if (diffSeconds < 60) {
                return `${diffSeconds}秒前`;
            } else if (diffMinutes < 60) {
                return `${diffMinutes}分前`;
            } else if (diffHours < 24) {
                return `${diffHours}時間前`;
            } else if (diffDays === 1) {
                return '昨日';
            } else if (diffDays < 7) {
                return `${diffDays}日前`;
            } else if (diffDays < 30) {
                const weeks = Math.floor(diffDays / 7);
                return `${weeks}週間前`;
            } else {
                return date.toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
        }

        /**
         * サンプルアクティビティを生成（デモ用）
         */
        generateSampleActivities() {
            const names = ['田中太郎', '山田花子', '佐藤健', '鈴木美咲', '高橋一郎'];
            const events = ['月例ネットワーキング会', '新規事業セミナー', 'AI技術交流会', 'スタートアップピッチ'];
            const achievements = ['初めての参加', '10件マッチング達成', 'イベント主催者'];
            
            const activities = [];
            const now = new Date();

            // 様々なタイプのアクティビティを生成
            const activityConfigs = [
                {
                    type: 'user_registered',
                    timeOffset: -2 * 60 * 60 * 1000, // 2時間前
                    data: {}
                },
                {
                    type: 'event_created',
                    timeOffset: -5 * 60 * 60 * 1000, // 5時間前
                    data: { event_name: events[0] }
                },
                {
                    type: 'matching_success',
                    timeOffset: -24 * 60 * 60 * 1000, // 1日前
                    data: { partner_name: names[1] }
                },
                {
                    type: 'event_joined',
                    timeOffset: -2 * 24 * 60 * 60 * 1000, // 2日前
                    data: { event_name: events[1] }
                },
                {
                    type: 'achievement_unlocked',
                    timeOffset: -3 * 24 * 60 * 60 * 1000, // 3日前
                    data: { achievement_name: achievements[0] }
                },
                {
                    type: 'milestone_reached',
                    timeOffset: -7 * 24 * 60 * 60 * 1000, // 1週間前
                    data: { milestone_description: '総メンバー数が1,000人を突破しました！' }
                }
            ];

            activityConfigs.forEach((config, index) => {
                activities.push({
                    id: `sample-${index}`,
                    user_id: `user-${index}`,
                    activity_type: config.type,
                    activity_data: config.data,
                    created_at: new Date(now.getTime() + config.timeOffset).toISOString(),
                    is_public: true,
                    users: {
                        name: names[index % names.length],
                        avatar_url: null
                    }
                });
            });

            // 優先度でソート
            return activities
                .map(activity => this.enhanceActivity(activity))
                .sort((a, b) => {
                    // まず優先度でソート、同じ場合は時間でソート
                    if (a.priority !== b.priority) {
                        return b.priority - a.priority;
                    }
                    return new Date(b.created_at) - new Date(a.created_at);
                });
        }

        /**
         * DashboardUIのrenderRecentActivitiesを拡張
         */
        enhanceRenderMethod() {
            if (window.dashboardUI) {
                const originalRender = window.dashboardUI.renderRecentActivities;
                
                window.dashboardUI.renderRecentActivities = (activities) => {
                    console.log('[ActivityEnhancer] アクティビティを拡張中...');
                    
                    // アクティビティを拡張
                    const enhancedActivities = activities.map(activity => 
                        this.enhanceActivity(activity)
                    );
                    
                    // カスタムHTMLでレンダリング
                    const container = document.querySelector('.activity-list');
                    if (!container) return;
                    
                    const html = enhancedActivities.map(activity => {
                        const userName = activity.users?.name || 'ユーザー';
                        
                        return `
                            <div class="activity-item enhanced" data-activity-id="${activity.id}" data-priority="${activity.priority}">
                                <div class="activity-icon" style="color: ${activity.color}">
                                    <i class="fas ${activity.icon}"></i>
                                </div>
                                <div class="activity-content">
                                    <p><strong>${userName}</strong>${activity.description}</p>
                                    <span class="activity-time">${activity.formattedTime}</span>
                                </div>
                            </div>
                        `;
                    }).join('');
                    
                    // アニメーション付きで更新
                    container.style.opacity = '0.5';
                    setTimeout(() => {
                        container.innerHTML = html;
                        container.style.opacity = '1';
                    }, 150);
                };
            }
        }

        /**
         * 初期化
         */
        init() {
            console.log('[ActivityEnhancer] 初期化中...');
            
            // レンダリングメソッドを拡張
            this.enhanceRenderMethod();
            
            // サンプルデータでテスト（開発時のみ）
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                setTimeout(() => {
                    const sampleActivities = this.generateSampleActivities();
                    if (window.dashboardUI) {
                        window.dashboardUI.renderRecentActivities(sampleActivities);
                    }
                }, 3000);
            }
            
            console.log('[ActivityEnhancer] 初期化完了');
        }
    }

    // グローバルに公開
    window.activityEnhancer = new ActivityEnhancer();
    
    // DOMContentLoaded後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.activityEnhancer.init();
        });
    } else {
        window.activityEnhancer.init();
    }

})();