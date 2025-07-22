// LINE Login Immediate Fix
// Supabaseの初期化を待たずに、直接LINEログインを処理

(function() {
    'use strict';
    
    // Channel ID を定数として定義
    const LINE_CHANNEL_ID = '2007688781';
    const LINE_REDIRECT_URI = window.location.origin + '/line-callback.html';
    
    console.log('LINE Login Immediate: Channel ID =', LINE_CHANNEL_ID);
    
    // ランダム文字列生成
    function generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    // グローバルに関数を公開
    window.handleLineLoginDirect = function() {
        console.log('handleLineLoginDirect called');
        
        const state = generateRandomString(32);
        const nonce = generateRandomString(32);
        
        // stateを保存
        sessionStorage.setItem('line_state', state);
        
        // 認証URL構築
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
        
        // リダイレクト
        window.location.href = authUrl;
    };
    
    // DOMContentLoadedで初期化
    document.addEventListener('DOMContentLoaded', function() {
        const lineButton = document.getElementById('lineLoginBtn');
        if (lineButton) {
            console.log('LINE button found, attaching direct handler');
            
            // 既存のイベントリスナーをクリア
            const newButton = lineButton.cloneNode(true);
            lineButton.parentNode.replaceChild(newButton, lineButton);
            
            // 新しいイベントリスナーを追加
            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                console.log('LINE button clicked (immediate handler)');
                window.handleLineLoginDirect();
            });
            
            console.log('LINE Login Immediate: Setup complete');
        } else {
            console.error('LINE Login Immediate: Button not found');
        }
    });
})();