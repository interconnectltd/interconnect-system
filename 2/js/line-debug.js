// LINE Login Debug Script
// console.log('=== LINE Login Debug ===');

// Channel IDを確認
if (typeof LINE_CHANNEL_ID !== 'undefined') {
    // console.log('LINE_CHANNEL_ID:', LINE_CHANNEL_ID);
} else {
    console.error('LINE_CHANNEL_ID is not defined!');
}

// ボタンの存在を確認
document.addEventListener('DOMContentLoaded', function() {
    const lineButton = document.getElementById('lineLoginBtn');
    if (lineButton) {
        // console.log('LINE button found:', lineButton);
        
        // クリックイベントを確認
        lineButton.addEventListener('click', function(e) {
            // console.log('LINE button clicked (debug listener)');
            // console.log('Event:', e);
            // console.log('Current LINE_CHANNEL_ID:', typeof LINE_CHANNEL_ID !== 'undefined' ? LINE_CHANNEL_ID : 'UNDEFINED');
        }, true); // capture phase
    } else {
        console.error('LINE button NOT found!');
    }
    
    // すべてのスクリプトタグを確認
    const scripts = document.querySelectorAll('script');
    // console.log('Loaded scripts:');
    scripts.forEach((script, index) => {
        if (script.src) {
            // console.log(`${index}: ${script.src}`);
        }
    });
});

// グローバル変数を確認
window.addEventListener('load', function() {
    // console.log('=== Window Load - Global Check ===');
    // console.log('window.LINE_CHANNEL_ID:', window.LINE_CHANNEL_ID);
    // console.log('window.handleLineLogin:', typeof window.handleLineLogin);
    
    // auth-supabase.jsが読み込まれているか確認
    if (typeof handleLineLogin === 'function') {
        // console.log('handleLineLogin function is available');
    } else {
        console.error('handleLineLogin function is NOT available!');
    }
});