/**
 * Guest Login Handler
 * ゲストログインボタンの処理
 */

(function() {
    'use strict';
    
    console.log('[GuestLogin] ゲストログインハンドラー初期化');
    
    document.addEventListener('DOMContentLoaded', function() {
        // ゲストログインボタンを取得
        const guestButton = document.querySelector('.guest-button');
        
        if (guestButton) {
            console.log('[GuestLogin] ゲストログインボタンを検出');
            
            // 既存のリンクを無効化してイベントハンドラーを追加
            guestButton.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('[GuestLogin] ゲストログインボタンがクリックされました');
                
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
                
                console.log('[GuestLogin] ゲストモード設定完了');
                
                // ダッシュボードへリダイレクト
                window.location.href = 'dashboard.html?guest=true';
            });
        } else {
            console.warn('[GuestLogin] ゲストログインボタンが見つかりません');
        }
    });
    
})();