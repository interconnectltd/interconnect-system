// ============================================================
// Section: guest-login-handler.js
// ============================================================
/**
 * Guest Login Handler
 * ゲストログインボタンの処理
 */

(function() {
    'use strict';

    // console.log('[GuestLogin] ゲストログインハンドラー初期化');

    document.addEventListener('DOMContentLoaded', function() {
        // ゲストログインボタンを取得
        const guestButton = document.querySelector('.guest-button');

        if (guestButton) {
            // console.log('[GuestLogin] ゲストログインボタンを検出');

            // 既存のリンクを無効化してイベントハンドラーを追加
            guestButton.addEventListener('click', function(e) {
                e.preventDefault();
                // console.log('[GuestLogin] ゲストログインボタンがクリックされました');

                // ゲストモードフラグを設定
                sessionStorage.setItem('isGuestMode', 'true');

                // ゲストユーザー情報を設定
                const guestUser = {
                    id: 'guest-user',
                    email: 'guest@interconnect.jp',
                    name: 'ゲストユーザー',
                    isGuest: true,
                    created_at: new Date().toISOString()
                };

                // ローカルストレージに保存
                localStorage.setItem('currentUser', JSON.stringify(guestUser));

                // console.log('[GuestLogin] ゲストモード設定完了');

                // ダッシュボードへリダイレクト
                window.location.href = 'dashboard.html?guest=true';
            });
        } else {
            console.warn('[GuestLogin] ゲストログインボタンが見つかりません');
        }
    });

})();

// ============================================================
// Section: line-login-simple.js
// ============================================================
/**
 * LINE Login Simple Implementation
 * シンプルで確実に動作するLINEログイン実装
 */

(function() {
    'use strict';

    const LINE_CHANNEL_ID = '2007688781';
    const LINE_REDIRECT_URI = window.location.origin + '/line-callback.html';

    // console.log('📱 LINE Login Simple loaded');
    // console.log('   Channel ID:', LINE_CHANNEL_ID);
    // console.log('   Redirect URI:', LINE_REDIRECT_URI);

    // ランダム文字列生成
    function generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // LINEログイン処理
    function handleLineLogin(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // console.log('🚀 LINE Login initiated (Simple)');

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
            // console.log('📍 Redirecting to LINE auth');
            // console.log('   URL:', authUrl);

            // LINE認証ページへリダイレクト
            window.location.href = authUrl;

        } catch (error) {
            console.error('❌ LINE login error:', error);
            alert('LINEログインでエラーが発生しました。もう一度お試しください。');
        }
    }

    // ボタンの設定
    function setupLineButton() {
        const lineLoginBtn = document.getElementById('lineLoginBtn');
        const lineRegisterBtn = document.getElementById('lineRegisterBtn');

        if (lineLoginBtn) {
            // console.log('✅ LINE Login button found');

            // 既存のイベントリスナーをクリア
            const newButton = lineLoginBtn.cloneNode(true);
            lineLoginBtn.parentNode.replaceChild(newButton, lineLoginBtn);

            // 新しいイベントリスナーを追加
            newButton.addEventListener('click', handleLineLogin);

            // console.log('✅ LINE Login button setup complete');
        }

        if (lineRegisterBtn) {
            // console.log('✅ LINE Register button found');

            // 既存のイベントリスナーをクリア
            const newButton = lineRegisterBtn.cloneNode(true);
            lineRegisterBtn.parentNode.replaceChild(newButton, lineRegisterBtn);

            // 新しいイベントリスナーを追加
            newButton.addEventListener('click', handleLineLogin);

            // console.log('✅ LINE Register button setup complete');
        }
    }

    // 初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupLineButton);
    } else {
        // すでに読み込み済みの場合は即座に実行
        setTimeout(setupLineButton, 0);
    }

    // 念のため少し遅延させても実行
    setTimeout(setupLineButton, 100);

})();
