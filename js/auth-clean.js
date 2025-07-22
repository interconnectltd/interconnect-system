/**
 * Clean Authentication Debug Script
 * 競合を排除したクリーンな認証確認スクリプト
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== Auth Clean Debug ===');
    
    // 1. LINEボタンの確認
    const lineButton = document.getElementById('lineLoginBtn');
    console.log('LINE button found:', !!lineButton);
    
    // 2. ログインフォームの確認
    const loginForm = document.getElementById('loginForm');
    console.log('Login form found:', !!loginForm);
    
    // 3. スクリプトの読み込み順序を確認
    const scripts = Array.from(document.scripts).map(s => s.src ? s.src.split('/').pop() : 'inline');
    console.log('Loaded scripts:', scripts);
    
    // 4. グローバル変数/関数の確認
    console.log('Global functions check:');
    console.log('- handleLineLogin:', typeof handleLineLogin);
    console.log('- handleEmailLogin:', typeof handleEmailLogin);
    console.log('- LINE_CHANNEL_ID:', typeof LINE_CHANNEL_ID !== 'undefined' ? LINE_CHANNEL_ID : 'undefined');
    
    // 5. イベントリスナーの確認（非破壊的）
    if (lineButton) {
        // テスト用の一時的なリスナー
        const testHandler = function(e) {
            console.log('=== LINE Button Click Debug ===');
            console.log('Event type:', e.type);
            console.log('Event target:', e.target);
            console.log('Event currentTarget:', e.currentTarget);
            console.log('_lineLoginInProgress:', window._lineLoginInProgress);
            // このハンドラーは実際の処理を妨げない
        };
        
        // キャプチャフェーズで確認（他のハンドラーを妨げない）
        lineButton.addEventListener('click', testHandler, true);
    }
    
    // 6. Supabase初期化状態の確認
    window.addEventListener('supabaseReady', function() {
        console.log('=== Supabase Ready ===');
        console.log('Supabase client:', !!window.supabase);
    });
    
    // 7. 競合チェッカー
    if (window._authCleanLoaded) {
        console.error('WARNING: auth-clean.js loaded multiple times!');
    }
    window._authCleanLoaded = true;
});