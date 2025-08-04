// サイドバートグル機能（修正版）
console.log('[Sidebar] sidebar-toggle-fixed.js loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Sidebar] DOM loaded, initializing sidebar toggles');
    
    // モバイルメニュートグルボタンを取得
    const mobileMenuToggle = document.getElementById('dashboardSidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const mobileBackdrop = document.querySelector('.mobile-backdrop') || createMobileBackdrop();
    
    if (!mobileMenuToggle) {
        console.error('[Sidebar] Mobile menu toggle button not found');
        return;
    }
    
    if (!sidebar) {
        console.error('[Sidebar] Sidebar element not found');
        return;
    }
    
    console.log('[Sidebar] Elements found:', {
        mobileMenuToggle,
        sidebar,
        mobileBackdrop
    });
    
    // モバイルバックドロップを作成（存在しない場合）
    function createMobileBackdrop() {
        const backdrop = document.createElement('div');
        backdrop.className = 'mobile-backdrop';
        document.body.appendChild(backdrop);
        console.log('[Sidebar] Mobile backdrop created');
        return backdrop;
    }
    
    // サイドバーを開く
    function openSidebar() {
        console.log('[Sidebar] Opening sidebar');
        sidebar.classList.add('active');
        mobileBackdrop.classList.add('active');
        document.body.classList.add('menu-open');
    }
    
    // サイドバーを閉じる
    function closeSidebar() {
        console.log('[Sidebar] Closing sidebar');
        sidebar.classList.remove('active');
        mobileBackdrop.classList.remove('active');
        document.body.classList.remove('menu-open');
    }
    
    // トグル機能
    function toggleSidebar() {
        console.log('[Sidebar] Toggling sidebar');
        if (sidebar.classList.contains('active')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }
    
    // イベントリスナーを設定（優先度を高くする）
    mobileMenuToggle.addEventListener('click', (e) => {
        console.log('[Sidebar] Mobile menu toggle clicked');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        toggleSidebar();
    }, true); // キャプチャフェーズで処理
    
    // バックドロップクリックで閉じる
    mobileBackdrop.addEventListener('click', (e) => {
        console.log('[Sidebar] Backdrop clicked');
        e.preventDefault();
        e.stopPropagation();
        closeSidebar();
    });
    
    // サイドバー内のリンククリックで閉じる（モバイルのみ）
    sidebar.addEventListener('click', (e) => {
        if (window.innerWidth <= 991 && e.target.closest('.sidebar-link')) {
            console.log('[Sidebar] Sidebar link clicked on mobile');
            setTimeout(closeSidebar, 200); // リンク遷移を待つ
        }
    });
    
    // ESCキーで閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            console.log('[Sidebar] ESC key pressed');
            closeSidebar();
        }
    });
    
    // ウィンドウリサイズ時の処理
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth > 991 && sidebar.classList.contains('active')) {
                console.log('[Sidebar] Window resized to desktop, closing mobile sidebar');
                closeSidebar();
            }
        }, 250);
    });
    
    console.log('[Sidebar] Initialization complete');
});

// グローバル関数として公開
window.toggleSidebar = function() {
    const sidebar = document.querySelector('.sidebar');
    const mobileBackdrop = document.querySelector('.mobile-backdrop');
    
    if (sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        mobileBackdrop.classList.remove('active');
        document.body.classList.remove('menu-open');
    } else {
        sidebar.classList.add('active');
        mobileBackdrop.classList.add('active');
        document.body.classList.add('menu-open');
    }
};