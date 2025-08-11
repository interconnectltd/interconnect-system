/**
 * LINE Button Fix
 * LINEボタンのイベントリスナーを確実に設定
 */

(function() {
    'use strict';
    
    // console.log('🔧 LINE Button Fix Script loaded');
    
    // 複数のタイミングでボタンを探して設定を試みる
    function setupLineButton() {
        const lineRegisterBtn = document.getElementById('lineRegisterBtn');
        const lineLoginBtn = document.getElementById('lineLoginBtn');
        
        if (lineRegisterBtn && !lineRegisterBtn.hasAttribute('data-listener-attached')) {
            // console.log('📍 Setting up LINE Register button');
            
            // クリックイベントを直接設定
            lineRegisterBtn.onclick = function(e) {
                // console.log('🖱️ LINE Register button clicked (onclick)');
                e.preventDefault();
                e.stopPropagation();
                
                // handleLineLogin関数を呼び出す
                if (typeof window.handleLineLogin === 'function') {
                    window.handleLineLogin(e);
                } else {
                    console.error('❌ handleLineLogin function not found');
                    
                    // フォールバック: 直接LINE認証URLにリダイレクト
                    // console.log('📍 Using fallback LINE authentication');
                    const LINE_CHANNEL_ID = '2007688781';
                    const LINE_REDIRECT_URI = window.location.origin + '/line-callback.html';
                    
                    const state = Math.random().toString(36).substring(2, 15);
                    const nonce = Math.random().toString(36).substring(2, 15);
                    
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
                    // console.log('Redirecting to:', authUrl);
                    window.location.href = authUrl;
                }
            };
            
            // マーカーを設定
            lineRegisterBtn.setAttribute('data-listener-attached', 'true');
            // console.log('✅ LINE Register button setup complete');
        }
        
        if (lineLoginBtn && !lineLoginBtn.hasAttribute('data-listener-attached')) {
            // console.log('📍 Setting up LINE Login button');
            
            lineLoginBtn.onclick = function(e) {
                // console.log('🖱️ LINE Login button clicked (onclick)');
                e.preventDefault();
                e.stopPropagation();
                
                if (typeof window.handleLineLogin === 'function') {
                    window.handleLineLogin(e);
                } else {
                    console.error('❌ handleLineLogin function not found');
                }
            };
            
            lineLoginBtn.setAttribute('data-listener-attached', 'true');
            // console.log('✅ LINE Login button setup complete');
        }
    }
    
    // 複数のタイミングで実行
    // 1. 即座に実行
    setupLineButton();
    
    // 2. DOMContentLoadedで実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupLineButton);
    } else {
        // 既に読み込み済みの場合
        setTimeout(setupLineButton, 0);
    }
    
    // 3. windowのloadイベントで実行
    window.addEventListener('load', setupLineButton);
    
    // 4. supabaseReadyイベントで実行
    window.addEventListener('supabaseReady', function() {
        // console.log('📍 supabaseReady event in line-button-fix.js');
        setupLineButton();
    });
    
    // 5. 1秒後にも実行（念のため）
    setTimeout(setupLineButton, 1000);
    
    // デバッグ用: ボタンの状態を定期的にチェック
    let checkCount = 0;
    const checkInterval = setInterval(function() {
        checkCount++;
        const btn = document.getElementById('lineRegisterBtn');
        if (btn) {
            // console.log(`🔍 Button check #${checkCount}:`, {
                exists: true,
                hasOnclick: !!btn.onclick,
                hasListenerAttr: btn.hasAttribute('data-listener-attached'),
                disabled: btn.disabled,
                display: window.getComputedStyle(btn).display
            });
            
            if (btn.onclick || checkCount > 10) {
                clearInterval(checkInterval);
            }
        } else if (checkCount > 10) {
            // ボタンが見つからない場合も10回でクリア
            // console.log('❌ Button not found after 10 checks, stopping');
            clearInterval(checkInterval);
        }
    }, 500);
    
})();