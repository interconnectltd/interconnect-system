// 登録ページのログイン状態チェック
(function() {
    console.log('[RegisterAuthCheck] 認証状態チェック開始');
    
    // Supabaseクライアントの初期化を待つ
    function checkAuthStatus() {
        if (!window.supabaseClient) {
            setTimeout(checkAuthStatus, 100);
            return;
        }
        
        // 現在のユーザーを確認
        window.supabaseClient.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                console.log('[RegisterAuthCheck] ログイン済みユーザー検出:', user.email);
                
                // アラートを表示
                if (confirm('既にログイン済みです。ダッシュボードに移動しますか？')) {
                    window.location.href = '/dashboard.html';
                } else {
                    // ログアウトするか確認
                    if (confirm('新規登録を行うには、一度ログアウトする必要があります。ログアウトしますか？')) {
                        window.supabaseClient.auth.signOut().then(() => {
                            console.log('[RegisterAuthCheck] ログアウト完了');
                            window.location.reload();
                        });
                    } else {
                        // ダッシュボードに移動
                        window.location.href = '/dashboard.html';
                    }
                }
            } else {
                console.log('[RegisterAuthCheck] 未ログイン状態 - 登録ページ表示を継続');
            }
        }).catch(error => {
            console.error('[RegisterAuthCheck] 認証状態確認エラー:', error);
        });
    }
    
    // DOMContentLoadedを待つ
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuthStatus);
    } else {
        checkAuthStatus();
    }
})();