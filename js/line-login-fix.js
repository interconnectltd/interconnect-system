// LINE Login Fix - Prevent event bubbling issues
document.addEventListener('DOMContentLoaded', function() {
    // LINEログインボタンを取得
    const lineButton = document.getElementById('lineLoginBtn');
    
    if (lineButton) {
        // 既存のイベントリスナーを削除
        lineButton.replaceWith(lineButton.cloneNode(true));
        
        // 新しい要素を取得
        const newLineButton = document.getElementById('lineLoginBtn');
        
        // クリックイベントを追加
        newLineButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('LINE Login Fix: Button clicked');
            
            // Channel ID and redirect URI
            const LINE_CHANNEL_ID = '2007688781';
            const LINE_REDIRECT_URI = window.location.origin + '/line-callback.html';
            
            // Generate random strings
            const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            
            // Save state
            sessionStorage.setItem('line_state', state);
            
            // Create auth URL
            const authUrl = 'https://access.line.me/oauth2/v2.1/authorize?' + 
                'response_type=code' +
                '&client_id=' + LINE_CHANNEL_ID +
                '&redirect_uri=' + encodeURIComponent(LINE_REDIRECT_URI) +
                '&state=' + state +
                '&scope=' + encodeURIComponent('profile openid email') +
                '&nonce=' + nonce;
            
            console.log('Redirecting to:', authUrl);
            
            // Redirect
            window.location.href = authUrl;
        });
    }
});