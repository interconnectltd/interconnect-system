/**
 * Missing Critical Features - 辛口チェックで見つかった本当に必要な機能
 * 削除されたファイルから絶対に必要な機能を追加復活
 */

(function() {
    'use strict';
    
    console.log('[MissingCritical] 見逃していた重要機能の復活開始');
    
    // ============================================================
    // 1. 通知音・ブラウザ通知・トースト通知（完全版）
    // from: backup/notifications/realtime-notifications.js
    // ============================================================
    
    // 通知音の準備（Base64エンコードされた音）
    window.prepareNotificationSound = function() {
        if (!window.notificationSound) {
            try {
                window.notificationSound = new Audio('data:audio/wav;base64,UklGRuIBAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YXEBAAAAAAEAAgADAAQABQAGAAcACAAPAA4ADQAMAAsACgAJAAMABAAFAAYABwAIAAkACgALAAwADQAOAA8ADwAOAA0ADAALAAoACQAIAAcABgAFAAQAAwACAA==');
                window.notificationSound.volume = 0.3;
            } catch (error) {
                console.error('[MissingCritical] 通知音の準備エラー:', error);
            }
        }
    };
    
    // 通知音を再生
    window.playNotificationSound = function() {
        if (window.notificationSound && localStorage.getItem('enableNotificationSound') !== 'false') {
            try {
                window.notificationSound.play().catch(e => {
                    console.log('[MissingCritical] 通知音の再生エラー（ユーザー操作が必要）');
                });
            } catch (error) {
                console.error('[MissingCritical] 通知音再生エラー:', error);
            }
        }
    };
    
    // ブラウザ通知を表示
    window.showBrowserNotification = function(notification) {
        if (!('Notification' in window)) return;
        
        if (Notification.permission === 'granted' && 
            localStorage.getItem('enableBrowserNotifications') !== 'false') {
            
            const title = notification.title || '新しい通知';
            const options = {
                body: notification.content || notification.message || '',
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: notification.id || 'notification',
                data: notification,
                requireInteraction: false
            };
            
            try {
                const browserNotif = new Notification(title, options);
                
                // クリック時の処理
                browserNotif.onclick = function(event) {
                    event.preventDefault();
                    window.focus();
                    
                    // 通知タイプに応じて適切なページに遷移
                    if (notification.type === 'message') {
                        window.location.href = '/messages.html';
                    } else if (notification.type === 'matching_request') {
                        window.location.href = '/matching.html';
                    } else if (notification.type === 'event_reminder') {
                        window.location.href = '/events.html';
                    }
                    
                    browserNotif.close();
                };
                
                // 5秒後に自動で閉じる
                setTimeout(() => browserNotif.close(), 5000);
                
            } catch (error) {
                console.error('[MissingCritical] ブラウザ通知エラー:', error);
            }
        }
    };
    
    // トースト通知を表示（完全版）
    window.showToastNotification = function(notification) {
        // 既存のトーストコンテナがなければ作成
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 400px;
            `;
            document.body.appendChild(toastContainer);
        }
        
        // トースト要素を作成
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.style.cssText = `
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06);
            padding: 16px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            animation: slideIn 0.3s ease-out;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        // アイコンを決定
        const iconMap = {
            'message': 'fa-envelope',
            'matching_request': 'fa-user-plus',
            'matching_accepted': 'fa-check-circle',
            'event_reminder': 'fa-calendar',
            'system': 'fa-info-circle'
        };
        
        const iconClass = iconMap[notification.type] || 'fa-bell';
        const iconColor = notification.type === 'matching_accepted' ? '#10b981' : '#3b82f6';
        
        toast.innerHTML = `
            <div style="flex-shrink: 0;">
                <i class="fas ${iconClass}" style="color: ${iconColor}; font-size: 20px;"></i>
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 4px; color: #1f2937;">
                    ${notification.title || '新しい通知'}
                </div>
                <div style="color: #6b7280; font-size: 14px;">
                    ${notification.content || notification.message || ''}
                </div>
                <div style="color: #9ca3af; font-size: 12px; margin-top: 4px;">
                    たった今
                </div>
            </div>
            <button style="
                background: none;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                padding: 4px;
                font-size: 18px;
            " onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // クリック時の処理
        toast.onclick = function(e) {
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'I') {
                if (notification.type === 'message') {
                    window.location.href = '/messages.html';
                } else if (notification.type === 'matching_request') {
                    window.location.href = '/matching.html';
                } else if (notification.type === 'event_reminder') {
                    window.location.href = '/events.html';
                }
            }
        };
        
        // コンテナに追加
        toastContainer.appendChild(toast);
        
        // 5秒後に自動で削除
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    };
    
    // ============================================================
    // 2. マッチング設定とキャッシュシステム
    // from: backup/old-matching/matching-supabase.js
    // ============================================================
    
    // マッチング設定（削除されていた重要な設定）
    window.MATCHING_CONFIG = {
        ITEMS_PER_PAGE: 6,
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        CACHE_DURATION: 5 * 60 * 1000, // 5分
        DEBOUNCE_DELAY: 300,
        MAX_VISIBLE_PAGES: 5,
        DEFAULT_AVATAR: 'assets/user-placeholder.svg',
        MATCHING_WEIGHTS: {
            title: 10,
            company: 10,
            bio: 10,
            skills: 10,
            industry: 5,
            location: 5
        }
    };
    
    // マッチングデータキャッシュシステム
    window.MatchingCache = class {
        constructor() {
            this.cache = new Map();
            this.cacheTimestamps = new Map();
        }
        
        set(key, data) {
            this.cache.set(key, data);
            this.cacheTimestamps.set(key, Date.now());
        }
        
        get(key) {
            const timestamp = this.cacheTimestamps.get(key);
            if (!timestamp) return null;
            
            const age = Date.now() - timestamp;
            if (age > window.MATCHING_CONFIG.CACHE_DURATION) {
                this.cache.delete(key);
                this.cacheTimestamps.delete(key);
                return null;
            }
            
            return this.cache.get(key);
        }
        
        clear() {
            this.cache.clear();
            this.cacheTimestamps.clear();
        }
    };
    
    // グローバルキャッシュインスタンス
    window.matchingCache = new window.MatchingCache();
    
    // ============================================================
    // 3. プロフィール画像アップロード（削除されていた機能）
    // ============================================================
    
    window.uploadProfileImage = async function(file) {
        if (!file) return null;
        
        try {
            const client = await window.waitForSupabaseWithRetry?.() || window.supabaseClient;
            if (!client) throw new Error('Supabaseクライアントが利用できません');
            
            const { data: { user } } = await client.auth.getUser();
            if (!user) throw new Error('認証されていません');
            
            // ファイル名を生成
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;
            
            // アップロード
            const { data, error } = await client.storage
                .from('avatars')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });
            
            if (error) throw error;
            
            // 公開URLを取得
            const { data: { publicUrl } } = client.storage
                .from('avatars')
                .getPublicUrl(filePath);
            
            // プロフィールを更新
            await client
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);
            
            console.log('[MissingCritical] プロフィール画像アップロード成功');
            return publicUrl;
            
        } catch (error) {
            console.error('[MissingCritical] プロフィール画像アップロードエラー:', error);
            throw error;
        }
    };
    
    // ============================================================
    // 4. セッション管理・認証維持（重要）
    // ============================================================
    
    window.SessionManager = class {
        constructor() {
            this.sessionCheckInterval = null;
            this.lastActivity = Date.now();
            this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30分
            this.WARNING_TIME = 5 * 60 * 1000; // 5分前に警告
            
            this.init();
        }
        
        init() {
            // アクティビティ追跡
            ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
                document.addEventListener(event, () => {
                    this.lastActivity = Date.now();
                }, { passive: true });
            });
            
            // セッションチェックを開始
            this.startSessionCheck();
        }
        
        startSessionCheck() {
            this.sessionCheckInterval = setInterval(async () => {
                const inactive = Date.now() - this.lastActivity;
                
                // タイムアウト警告
                if (inactive > this.SESSION_TIMEOUT - this.WARNING_TIME && 
                    inactive < this.SESSION_TIMEOUT) {
                    this.showSessionWarning();
                }
                
                // タイムアウト
                if (inactive > this.SESSION_TIMEOUT) {
                    await this.handleSessionTimeout();
                }
                
                // トークンリフレッシュ
                await this.refreshTokenIfNeeded();
                
            }, 60000); // 1分ごとにチェック
        }
        
        showSessionWarning() {
            if (!document.getElementById('session-warning')) {
                const warning = document.createElement('div');
                warning.id = 'session-warning';
                warning.style.cssText = `
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #fef3c7;
                    border: 1px solid #fbbf24;
                    color: #92400e;
                    padding: 12px 20px;
                    border-radius: 8px;
                    z-index: 10001;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                `;
                warning.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    セッションがまもなくタイムアウトします。
                    <button onclick="window.sessionManager.extendSession()" style="
                        margin-left: 10px;
                        padding: 4px 8px;
                        background: #f59e0b;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">延長</button>
                `;
                document.body.appendChild(warning);
                
                setTimeout(() => warning.remove(), 10000);
            }
        }
        
        async handleSessionTimeout() {
            console.log('[MissingCritical] セッションタイムアウト');
            clearInterval(this.sessionCheckInterval);
            
            // ログアウト処理
            if (window.supabaseClient) {
                await window.supabaseClient.auth.signOut();
            }
            
            // ログインページへリダイレクト
            window.location.href = '/login.html?session=expired';
        }
        
        async refreshTokenIfNeeded() {
            if (window.supabaseClient) {
                try {
                    const { data: { session }, error } = await window.supabaseClient.auth.getSession();
                    
                    if (session) {
                        const expiresAt = new Date(session.expires_at * 1000);
                        const now = new Date();
                        const timeUntilExpiry = expiresAt - now;
                        
                        // 10分以内に期限切れになる場合はリフレッシュ
                        if (timeUntilExpiry < 10 * 60 * 1000) {
                            await window.supabaseClient.auth.refreshSession();
                            console.log('[MissingCritical] セッショントークンをリフレッシュしました');
                        }
                    }
                } catch (error) {
                    console.error('[MissingCritical] トークンリフレッシュエラー:', error);
                }
            }
        }
        
        extendSession() {
            this.lastActivity = Date.now();
            const warning = document.getElementById('session-warning');
            if (warning) warning.remove();
            console.log('[MissingCritical] セッションを延長しました');
        }
        
        destroy() {
            if (this.sessionCheckInterval) {
                clearInterval(this.sessionCheckInterval);
            }
        }
    };
    
    // ============================================================
    // 5. メッセージ送信機能（完全版）
    // ============================================================
    
    window.sendMessage = async function(recipientId, content, attachments = []) {
        try {
            const client = await window.waitForSupabaseWithRetry?.() || window.supabaseClient;
            if (!client) throw new Error('Supabaseクライアントが利用できません');
            
            const { data: { user } } = await client.auth.getUser();
            if (!user) throw new Error('認証されていません');
            
            // メッセージを送信
            const { data: message, error } = await client
                .from('messages')
                .insert({
                    sender_id: user.id,
                    recipient_id: recipientId,
                    content: content,
                    attachments: attachments,
                    is_read: false,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            
            // 通知を作成
            await client
                .from('notifications')
                .insert({
                    user_id: recipientId,
                    type: 'message',
                    title: '新しいメッセージ',
                    content: content.substring(0, 100),
                    data: { message_id: message.id, sender_id: user.id },
                    is_read: false
                });
            
            console.log('[MissingCritical] メッセージ送信成功');
            return message;
            
        } catch (error) {
            console.error('[MissingCritical] メッセージ送信エラー:', error);
            throw error;
        }
    };
    
    // ============================================================
    // 6. 検索・フィルタリングの高度な機能
    // ============================================================
    
    window.AdvancedSearch = class {
        constructor() {
            this.searchIndex = new Map();
            this.filters = {
                text: '',
                industry: [],
                location: [],
                skills: [],
                interests: [],
                availability: 'all',
                sortBy: 'relevance'
            };
        }
        
        // 全文検索インデックスを構築
        buildSearchIndex(profiles) {
            this.searchIndex.clear();
            
            profiles.forEach(profile => {
                const searchableText = [
                    profile.name,
                    profile.title,
                    profile.company,
                    profile.bio,
                    profile.skills?.join(' '),
                    profile.interests?.join(' ')
                ].filter(Boolean).join(' ').toLowerCase();
                
                this.searchIndex.set(profile.id, {
                    profile,
                    searchableText,
                    tokens: this.tokenize(searchableText)
                });
            });
        }
        
        // テキストをトークン化
        tokenize(text) {
            return text.toLowerCase()
                .split(/\s+/)
                .filter(token => token.length > 1);
        }
        
        // 検索実行
        search(query) {
            if (!query) return Array.from(this.searchIndex.values()).map(item => item.profile);
            
            const queryTokens = this.tokenize(query.toLowerCase());
            const results = [];
            
            this.searchIndex.forEach(item => {
                let score = 0;
                
                // 完全一致
                if (item.searchableText.includes(query.toLowerCase())) {
                    score += 10;
                }
                
                // トークンマッチ
                queryTokens.forEach(token => {
                    if (item.tokens.includes(token)) {
                        score += 1;
                    }
                });
                
                if (score > 0) {
                    results.push({ ...item.profile, searchScore: score });
                }
            });
            
            // スコア順でソート
            return results.sort((a, b) => b.searchScore - a.searchScore);
        }
        
        // 複合フィルタリング
        applyFilters(profiles) {
            let filtered = [...profiles];
            
            // テキスト検索
            if (this.filters.text) {
                filtered = this.search(this.filters.text);
            }
            
            // 業界フィルター
            if (this.filters.industry.length > 0) {
                filtered = filtered.filter(p => 
                    this.filters.industry.includes(p.industry)
                );
            }
            
            // 地域フィルター
            if (this.filters.location.length > 0) {
                filtered = filtered.filter(p => 
                    this.filters.location.some(loc => 
                        p.location?.includes(loc)
                    )
                );
            }
            
            // スキルフィルター
            if (this.filters.skills.length > 0) {
                filtered = filtered.filter(p => 
                    this.filters.skills.some(skill => 
                        p.skills?.includes(skill)
                    )
                );
            }
            
            // ソート
            return this.sortProfiles(filtered);
        }
        
        sortProfiles(profiles) {
            const sortFunctions = {
                relevance: (a, b) => (b.searchScore || 0) - (a.searchScore || 0),
                name: (a, b) => a.name.localeCompare(b.name),
                recent: (a, b) => new Date(b.created_at) - new Date(a.created_at),
                active: (a, b) => new Date(b.last_login) - new Date(a.last_login)
            };
            
            const sortFn = sortFunctions[this.filters.sortBy] || sortFunctions.relevance;
            return profiles.sort(sortFn);
        }
    };
    
    // ============================================================
    // 7. 自動初期化
    // ============================================================
    
    async function initializeMissingFeatures() {
        console.log('[MissingCritical] 見逃していた機能の初期化開始');
        
        // 通知音を準備
        window.prepareNotificationSound();
        
        // ブラウザ通知の権限リクエスト
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        // セッションマネージャーを初期化
        window.sessionManager = new window.SessionManager();
        
        // 検索システムを初期化
        window.advancedSearch = new window.AdvancedSearch();
        
        // アニメーションスタイルを追加
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
        
        console.log('[MissingCritical] 見逃していた機能の初期化完了');
    }
    
    // DOMContentLoaded後に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeMissingFeatures);
    } else {
        initializeMissingFeatures();
    }
    
    // グローバル公開
    window.MissingCriticalFeatures = {
        prepareNotificationSound: window.prepareNotificationSound,
        playNotificationSound: window.playNotificationSound,
        showBrowserNotification: window.showBrowserNotification,
        showToastNotification: window.showToastNotification,
        uploadProfileImage: window.uploadProfileImage,
        sendMessage: window.sendMessage,
        SessionManager: window.SessionManager,
        MatchingCache: window.MatchingCache,
        AdvancedSearch: window.AdvancedSearch
    };
    
})();