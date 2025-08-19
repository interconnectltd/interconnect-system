/**
 * Admin Security - セキュリティ管理モジュール
 * 認証、権限管理、セキュリティ機能を提供
 */

(function() {
    'use strict';

    // グローバル名前空間の安全な初期化
    if (typeof window.INTERCONNECT === 'undefined') {
        window.INTERCONNECT = {};
    }
    if (typeof window.INTERCONNECT.Security === 'undefined') {
        window.INTERCONNECT.Security = {};
    }
    
    // セキュリティモジュールの追加（既存を上書きしない）
    Object.assign(window.INTERCONNECT.Security, {
        
        // 設定
        config: {
            sessionTimeout: 3600000,        // 1時間
            maxLoginAttempts: 3,            // 最大ログイン試行回数
            lockoutTime: 900000,            // ロックアウト時間（15分）
            passwordMinLength: 8,           // パスワード最小長
            requireStrongPassword: true     // 強力なパスワード要求
        },

        // セッション管理
        session: {
            // セッション開始
            start: function(userData) {
                const sessionData = {
                    user: userData,
                    startTime: Date.now(),
                    lastActivity: Date.now(),
                    permissions: userData.permissions || [],
                    token: this.generateToken()
                };
                
                sessionStorage.setItem('adminSession', JSON.stringify(sessionData));
                this.resetTimeout();
                
                // console.log('🔐 Admin session started');
                return sessionData.token;
            },

            // セッション取得
            get: function() {
                try {
                    const sessionData = sessionStorage.getItem('adminSession');
                    return sessionData ? JSON.parse(sessionData) : null;
                } catch (e) {
                    console.error('Session parse error:', e);
                    return null;
                }
            },

            // セッション更新
            refresh: function() {
                const session = this.get();
                if (session) {
                    session.lastActivity = Date.now();
                    sessionStorage.setItem('adminSession', JSON.stringify(session));
                }
            },

            // セッション終了
            end: function() {
                sessionStorage.removeItem('adminSession');
                localStorage.removeItem('adminLoginAttempts');
                localStorage.removeItem('adminLockout');
                // console.log('🔓 Admin session ended');
            },

            // セッション有効性確認
            isValid: function() {
                const session = this.get();
                if (!session) return false;

                const now = Date.now();
                const sessionAge = now - session.startTime;
                const lastActivity = now - session.lastActivity;

                // セッションタイムアウトチェック
                if (sessionAge > window.INTERCONNECT.Security.config.sessionTimeout) {
                    console.warn('Session expired (timeout)');
                    this.end();
                    return false;
                }

                // 非アクティブタイムアウトチェック
                if (lastActivity > 1800000) { // 30分
                    console.warn('Session expired (inactivity)');
                    this.end();
                    return false;
                }

                return true;
            },

            // トークン生成
            generateToken: function() {
                return 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            },

            // タイムアウト設定
            resetTimeout: function() {
                // 既存のタイマーをクリア
                if (this.timeoutId) {
                    clearTimeout(this.timeoutId);
                }

                // 新しいタイマーを設定
                this.timeoutId = setTimeout(() => {
                    if (confirm('セッションがタイムアウトしました。再ログインしますか？')) {
                        window.location.href = 'login.html';
                    } else {
                        this.end();
                        window.location.href = 'index.html';
                    }
                }, window.INTERCONNECT.Security.config.sessionTimeout);
            }
        },

        // 認証管理
        auth: {
            // ログイン試行記録
            recordLoginAttempt: function(success, username) {
                const attempts = JSON.parse(localStorage.getItem('adminLoginAttempts') || '{}');
                const now = Date.now();
                
                if (!attempts[username]) {
                    attempts[username] = { count: 0, lastAttempt: now, lockoutUntil: 0 };
                }

                if (success) {
                    // 成功時はカウンターリセット
                    attempts[username].count = 0;
                    attempts[username].lockoutUntil = 0;
                } else {
                    // 失敗時はカウンター増加
                    attempts[username].count++;
                    attempts[username].lastAttempt = now;

                    // 最大試行回数に達した場合はロックアウト
                    if (attempts[username].count >= window.INTERCONNECT.Security.config.maxLoginAttempts) {
                        attempts[username].lockoutUntil = now + window.INTERCONNECT.Security.config.lockoutTime;
                    }
                }

                localStorage.setItem('adminLoginAttempts', JSON.stringify(attempts));
            },

            // ロックアウト状態確認
            isLockedOut: function(username) {
                const attempts = JSON.parse(localStorage.getItem('adminLoginAttempts') || '{}');
                const userAttempts = attempts[username];
                
                if (!userAttempts) return false;
                
                const now = Date.now();
                if (userAttempts.lockoutUntil > now) {
                    const remainingTime = Math.ceil((userAttempts.lockoutUntil - now) / 60000);
                    return { locked: true, remainingMinutes: remainingTime };
                }

                return { locked: false };
            },

            // パスワード強度チェック
            checkPasswordStrength: function(password) {
                const result = {
                    score: 0,
                    issues: [],
                    isStrong: false
                };

                // 長さチェック
                if (password.length < this.config.passwordMinLength) {
                    result.issues.push(`最低${this.config.passwordMinLength}文字必要です`);
                } else {
                    result.score += 1;
                }

                // 英大文字チェック
                if (!/[A-Z]/.test(password)) {
                    result.issues.push('英大文字を含める必要があります');
                } else {
                    result.score += 1;
                }

                // 英小文字チェック
                if (!/[a-z]/.test(password)) {
                    result.issues.push('英小文字を含める必要があります');
                } else {
                    result.score += 1;
                }

                // 数字チェック
                if (!/\d/.test(password)) {
                    result.issues.push('数字を含める必要があります');
                } else {
                    result.score += 1;
                }

                // 記号チェック
                if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                    result.issues.push('記号を含める必要があります');
                } else {
                    result.score += 1;
                }

                result.isStrong = result.score >= 4 && result.issues.length === 0;
                return result;
            }
        },

        // 権限管理
        permissions: {
            // 権限確認
            check: function(requiredPermission) {
                const session = window.INTERCONNECT.Security.session.get();
                if (!session || !session.permissions) return false;
                
                return session.permissions.includes(requiredPermission) || 
                       session.permissions.includes('admin') ||
                       session.permissions.includes('super_admin');
            },

            // 複数権限確認（AND条件）
            checkAll: function(requiredPermissions) {
                return requiredPermissions.every(permission => this.check(permission));
            },

            // 複数権限確認（OR条件）
            checkAny: function(requiredPermissions) {
                return requiredPermissions.some(permission => this.check(permission));
            },

            // 権限不足時の処理
            deny: function(message = 'この操作を実行する権限がありません') {
                window.INTERCONNECT.Utils.toast.show(message, 'error');
                console.warn('Permission denied');
                return false;
            }
        },

        // セキュリティイベント監視
        monitor: {
            // 不審なアクティビティ検出
            detectSuspiciousActivity: function() {
                // 複数タブでの同時ログイン検出
                window.addEventListener('storage', function(e) {
                    if (e.key === 'adminSession' && e.newValue && e.oldValue) {
                        const oldSession = JSON.parse(e.oldValue);
                        const newSession = JSON.parse(e.newValue);
                        
                        if (oldSession.token !== newSession.token) {
                            if (confirm('他の場所でログインが検出されました。このセッションを継続しますか？')) {
                                // 現在のセッションを維持
                                sessionStorage.setItem('adminSession', e.oldValue);
                            } else {
                                // ログアウト
                                window.INTERCONNECT.logout();
                            }
                        }
                    }
                });

                // 開発者ツールの使用検出
                let devtools = { open: false, orientation: null };
                if (window.devtoolsInterval) {
                    clearInterval(window.devtoolsInterval);
                }
                window.devtoolsInterval = setInterval(function() {
                    if (window.outerHeight - window.innerHeight > 200 || window.outerWidth - window.innerWidth > 200) {
                        if (!devtools.open) {
                            devtools.open = true;
                            console.warn('🔍 Developer tools detected');
                        }
                    } else {
                        devtools.open = false;
                    }
                }, 500);
            },

            // 操作ログ記録
            logAction: function(action, details = {}) {
                const session = window.INTERCONNECT.Security.session.get();
                const logEntry = {
                    timestamp: new Date().toISOString(),
                    user: session ? session.user.username : 'anonymous',
                    action: action,
                    details: details,
                    userAgent: navigator.userAgent,
                    ip: 'client-side' // サーバーサイドで実際のIPを記録
                };

                // ローカルストレージに保存（開発用）
                const logs = JSON.parse(localStorage.getItem('adminActionLogs') || '[]');
                logs.push(logEntry);
                
                // 最新100件のみ保持
                if (logs.length > 100) {
                    logs.splice(0, logs.length - 100);
                }
                
                localStorage.setItem('adminActionLogs', JSON.stringify(logs));
                // console.log('📝 Action logged:', action);
            }
        },

        // 初期化
        init: function() {
            // セッション有効性の定期チェック
            if (window.sessionCheckInterval) {
                clearInterval(window.sessionCheckInterval);
            }
            window.sessionCheckInterval = setInterval(() => {
                if (!this.session.isValid()) {
                    console.warn('Invalid session detected');
                    window.location.href = 'login.html';
                }
            }, 60000); // 1分間隔

            // ユーザーアクティビティ監視
            ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
                document.addEventListener(event, () => {
                    this.session.refresh();
                }, { passive: true });
            });

            // セキュリティ監視開始
            this.monitor.detectSuspiciousActivity();

            // console.log('🛡️ Security module initialized');
        }
    });

    // ページ保護用のガード関数
    window.INTERCONNECT.requireAuth = function(requiredPermissions = []) {
        const security = window.INTERCONNECT.Security;
        
        // セッション確認
        if (!security.session.isValid()) {
            console.warn('Authentication required');
            window.location.href = 'login.html';
            return false;
        }

        // 権限確認
        if (requiredPermissions.length > 0) {
            if (!security.permissions.checkAny(requiredPermissions)) {
                security.permissions.deny();
                return false;
            }
        }

        return true;
    };

    // DOM読み込み完了時に初期化
    document.addEventListener('DOMContentLoaded', function() {
        window.INTERCONNECT.Security.init();
    });

    // console.log('🔐 Security module loaded');

})();