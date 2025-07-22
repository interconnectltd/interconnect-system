/**
 * Supabase Authentication Module
 * Version: 2025-01-22-v2
 */

console.log('🚀 auth-supabase.js loaded at:', new Date().toISOString());
console.log('   Script version: 2025-01-22-v2');

// LINE Login Configuration
const LINE_CHANNEL_ID = '2007688781';
const LINE_REDIRECT_URI = window.location.origin + '/line-callback.html';

// デバッグ用：Channel IDの詳細確認
console.log('🔍 auth-supabase.js: LINE_CHANNEL_ID defined');
console.log('   Value:', LINE_CHANNEL_ID);
console.log('   Type:', typeof LINE_CHANNEL_ID);
console.log('   Length:', LINE_CHANNEL_ID.length);
console.log('   Is 10 digits?:', /^\d{10}$/.test(LINE_CHANNEL_ID));
console.log('   ⚠️ If you see 2007213003, clear cache!');

// Supabaseが準備できるまで待つ
window.addEventListener('supabaseReady', function() {
    console.log('📍 supabaseReady event received in auth-supabase.js');
    initializeAuth();
});

// DOMContentLoadedでも試す（念のため）
document.addEventListener('DOMContentLoaded', function() {
    console.log('📍 DOMContentLoaded in auth-supabase.js');
    if (window.supabase) {
        console.log('📍 Supabase already available, calling initializeAuth');
        initializeAuth();
    }
});

function initializeAuth() {
    console.log('🔧 initializeAuth called');
    
    // ログインフォームの処理
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleEmailLogin);
    }
    
    // LINEログインボタンの処理
    const lineLoginBtn = document.getElementById('lineLoginBtn');
    if (lineLoginBtn) {
        console.log('🎯 LINE Login button found, adding event listener');
        lineLoginBtn.addEventListener('click', handleLineLogin);
    }
    
    // LINE登録ボタンの処理
    const lineRegisterBtn = document.getElementById('lineRegisterBtn');
    if (lineRegisterBtn) {
        console.log('🎯 LINE Register button found, adding event listener');
        lineRegisterBtn.addEventListener('click', handleLineLogin);
    } else {
        console.log('❌ LINE Register button NOT found');
    }
    
    // 現在のユーザーセッションをチェック
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
        // Supabaseでログイン
        const { data, error } = await window.supabase.auth.signInWithPassword({
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
        console.log('ログイン成功:', data.user);
        
        // ユーザー情報をローカルストレージに保存
        localStorage.setItem('user', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || email.split('@')[0]
        }));
        
        // ダッシュボードへリダイレクト
        window.location.href = 'dashboard.html';
        
    } catch (err) {
        console.error('ログインエラー:', err);
        showError('ログイン処理中にエラーが発生しました');
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
        submitButton.textContent = 'ログイン';
    }
}

// LINEログイン
function handleLineLogin(e) {
    // イベントの伝播を停止（stopImmediatePropagationは削除）
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    console.log('LINE Login button clicked (auth-supabase.js)');
    console.log('Using Channel ID:', LINE_CHANNEL_ID);
    
    // 二重実行を防ぐフラグ
    if (window._lineLoginInProgress) {
        console.log('LINE login already in progress');
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
        console.log('Redirecting to:', authUrl);
        
        // LINE認証ページへリダイレクト
        window.location.href = authUrl;
    } catch (error) {
        console.error('LINE login error:', error);
        window._lineLoginInProgress = false;
        showError('LINEログインエラーが発生しました');
    }
}

// 認証状態をチェック
async function checkAuthStatus() {
    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        
        if (user) {
            console.log('既にログイン済み:', user);
            
            // ログインページの場合はダッシュボードへリダイレクト
            if (window.location.pathname.includes('login.html')) {
                window.location.href = 'dashboard.html';
            }
        }
    } catch (err) {
        console.error('認証状態チェックエラー:', err);
    }
}

// エラー表示
function showError(message) {
    // 既存のエラーメッセージを削除
    const existingError = document.querySelector('.auth-error');
    if (existingError) {
        existingError.remove();
    }
    
    // エラーメッセージを作成
    const errorDiv = document.createElement('div');
    errorDiv.className = 'auth-error';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    // フォームの前に挿入
    const form = document.getElementById('loginForm');
    if (form) {
        form.parentNode.insertBefore(errorDiv, form);
    }
    
    // 5秒後に自動で削除
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
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

// handleLineLogin関数をグローバルに公開（他のスクリプトから呼び出せるように）
window.handleLineLogin = handleLineLogin;

// ログアウト関数（グローバルに公開）
window.logout = async function() {
    try {
        const { error } = await window.supabase.auth.signOut();
        if (error) {
            console.error('ログアウトエラー:', error);
        }
        
        // ローカルストレージをクリア
        localStorage.removeItem('user');
        sessionStorage.clear();
        
        // ログインページへリダイレクト
        window.location.href = 'login.html';
    } catch (err) {
        console.error('ログアウト処理エラー:', err);
    }
};