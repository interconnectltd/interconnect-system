/**
 * Supabase統一初期化モジュール
 * 
 * このファイルは全てのSupabase初期化を統合管理します
 * - supabase-client.js
 * - auth-supabase.js
 * - supabase-init-wait.js
 * の機能を1つに統合
 */

(function() {
    'use strict';

    console.log('[SupabaseUnified] 統一初期化モジュール読み込み開始');

    // Supabase設定
    const SUPABASE_URL = 'https://whyoqhhzwtlxprhizmor.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeW9xaGh6d3RseHByaGl6bW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjMyNzUsImV4cCI6MjA2NzA5OTI3NX0.HI03HObR6GkTmYh4Adm_DRkUOAssA8P1dhqzCH-mLrw';

    // LINE Login設定
    const LINE_CHANNEL_ID = '2007688781';
    const LINE_REDIRECT_URI = window.location.origin + '/line-callback.html';

    // 初期化フラグ
    let isInitialized = false;
    let authInitialized = false;

    // Supabaseクライアントの初期化を待つPromise
    window.waitForSupabase = function() {
        return new Promise((resolve) => {
            if (window.supabaseClient) {
                resolve(window.supabaseClient);
                return;
            }

            const checkInterval = setInterval(() => {
                if (window.supabaseClient) {
                    clearInterval(checkInterval);
                    resolve(window.supabaseClient);
                }
            }, 100);

            // 10秒でタイムアウト
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve(null);
            }, 10000);
        });
    };

    // Supabase CDNを読み込み
    function loadSupabaseSDK() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Supabaseクライアントを初期化
    async function initializeSupabase() {
        if (isInitialized) {
            console.log('[SupabaseUnified] 既に初期化済み');
            return;
        }

        try {
            // SDKを読み込み
            await loadSupabaseSDK();
            console.log('[SupabaseUnified] Supabase SDK読み込み完了');

            // クライアントを作成
            window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true
                }
            });

            // 後方互換性の設定は削除（window.supabaseClientのみ使用）
            // window.supabase = window.supabaseClient;

            isInitialized = true;
            console.log('[SupabaseUnified] Supabaseクライアント初期化完了');

            // 初期化完了イベントを発火
            window.dispatchEvent(new Event('supabaseReady'));

            // 認証機能を初期化
            initializeAuth();

        } catch (error) {
            console.error('[SupabaseUnified] 初期化エラー:', error);
        }
    }

    // 認証機能の初期化
    function initializeAuth() {
        if (authInitialized) return;
        authInitialized = true;

        console.log('[SupabaseUnified] 認証機能初期化開始');

        // ログインフォームの処理
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleEmailLogin);
            console.log('[SupabaseUnified] ログインフォームハンドラー設定完了');
        }

        // LINEログインボタンの処理
        const lineLoginBtn = document.getElementById('lineLoginBtn');
        if (lineLoginBtn) {
            lineLoginBtn.addEventListener('click', handleLineLogin);
            console.log('[SupabaseUnified] LINEログインボタンハンドラー設定完了');
        }

        // LINE登録ボタンの処理
        const lineRegisterBtn = document.getElementById('lineRegisterBtn');
        if (lineRegisterBtn) {
            lineRegisterBtn.addEventListener('click', handleLineLogin);
            console.log('[SupabaseUnified] LINE登録ボタンハンドラー設定完了');
        }

        // 認証状態をチェック
        checkAuthStatus();
    }

    // メールアドレスでのログイン
    async function handleEmailLogin(e) {
        e.preventDefault();
        
        const email = e.target.email.value;
        const password = e.target.password.value;
        const submitButton = e.target.querySelector('button[type="submit"]');
        
        // ローディング状態
        submitButton.classList.add('loading');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ログイン中...';
        
        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) {
                showError('ログインに失敗しました: ' + error.message);
                submitButton.classList.remove('loading');
                submitButton.disabled = false;
                submitButton.textContent = 'ログイン';
                return;
            }
            
            // ログイン成功
            console.log('[SupabaseUnified] ログイン成功:', data.user.email);
            
            // ユーザー情報を保存
            localStorage.setItem('user', JSON.stringify({
                id: data.user.id,
                email: data.user.email,
                name: data.user.user_metadata?.name || email.split('@')[0]
            }));
            
            // ダッシュボードへリダイレクト
            window.location.href = 'dashboard.html';
            
        } catch (err) {
            console.error('[SupabaseUnified] ログインエラー:', err);
            showError('ログイン処理中にエラーが発生しました');
            submitButton.classList.remove('loading');
            submitButton.disabled = false;
            submitButton.textContent = 'ログイン';
        }
    }

    // LINEログイン
    function handleLineLogin(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        console.log('[SupabaseUnified] LINEログイン開始');
        
        // 二重実行を防ぐ
        if (window._lineLoginInProgress) {
            console.log('[SupabaseUnified] LINEログイン処理中');
            return;
        }
        window._lineLoginInProgress = true;
        
        try {
            // LINE認証URLを構築
            const state = generateRandomString(32);
            const nonce = generateRandomString(32);
            
            // stateを保存（CSRF対策）
            sessionStorage.setItem('line_state', state);
            
            const params = new URLSearchParams({
                response_type: 'code',
                client_id: LINE_CHANNEL_ID,
                redirect_uri: LINE_REDIRECT_URI,
                state: state,
                scope: 'profile openid email',
                nonce: nonce
            });
            
            const authUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
            console.log('[SupabaseUnified] LINE認証URLへリダイレクト');
            
            // LINE認証ページへリダイレクト
            window.location.href = authUrl;
        } catch (error) {
            console.error('[SupabaseUnified] LINEログインエラー:', error);
            window._lineLoginInProgress = false;
            showError('LINEログインエラーが発生しました');
        }
    }

    // 認証状態をチェック
    async function checkAuthStatus() {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            
            if (user) {
                console.log('[SupabaseUnified] ログイン済みユーザー:', user.email);
                
                // ログインページの場合はダッシュボードへリダイレクト
                if (window.location.pathname.includes('login.html')) {
                    window.location.href = 'dashboard.html';
                }
            }
        } catch (err) {
            console.error('[SupabaseUnified] 認証状態チェックエラー:', err);
        }
    }

    // エラー表示
    function showError(message) {
        const existingError = document.querySelector('.auth-error');
        if (existingError) {
            existingError.remove();
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'auth-error';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> <span>${message}</span>`;
        
        const form = document.getElementById('loginForm');
        if (form && form.parentNode) {
            form.parentNode.insertBefore(errorDiv, form);
        }
        
        // 5秒後に自動で削除
        setTimeout(() => errorDiv.remove(), 5000);
    }

    // ランダム文字列生成
    function generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // グローバル関数として公開
    window.handleLineLogin = handleLineLogin;
    window.initializeAuth = initializeAuth;

    // 初期化を実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSupabase);
    } else {
        initializeSupabase();
    }

})();