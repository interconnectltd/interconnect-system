// サイドバートグル機能
// console.log('[Sidebar] sidebar-toggle.js loaded');

document.addEventListener('DOMContentLoaded', () => {
    // console.log('[Sidebar] DOM loaded, initializing sidebar toggles');
    
    // ダッシュボード用の特別処理（disabled-scripts/sidebar-toggle-fixed.jsから救出）
    const dashboardToggle = document.getElementById('dashboardSidebarToggle');
    if (dashboardToggle) {
        // console.log('[Sidebar] Dashboard toggle found, setting up with priority');
        
        // モバイルバックドロップを作成（存在しない場合）
        let mobileBackdrop = document.querySelector('.mobile-backdrop');
        if (!mobileBackdrop) {
            mobileBackdrop = document.createElement('div');
            mobileBackdrop.className = 'mobile-backdrop';
            document.body.appendChild(mobileBackdrop);
            // console.log('[Sidebar] Mobile backdrop created for dashboard');
        }
        
        // ダッシュボード用の開閉関数
        function openDashboardSidebar() {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.classList.add('active');
                mobileBackdrop.classList.add('active');
                document.body.classList.add('menu-open');
            }
        }
        
        function closeDashboardSidebar() {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.classList.remove('active');
                mobileBackdrop.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        }
        
        // キャプチャフェーズで優先的に処理（disabled-scripts/sidebar-toggle-fixed.jsから）
        dashboardToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            const sidebar = document.querySelector('.sidebar');
            if (sidebar && sidebar.classList.contains('active')) {
                closeDashboardSidebar();
            } else {
                openDashboardSidebar();
            }
        }, true); // キャプチャフェーズで処理
        
        // バックドロップクリックで閉じる
        mobileBackdrop.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeDashboardSidebar();
        });
        
        // サイドバー内のリンククリックで閉じる（モバイルのみ）
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.addEventListener('click', (e) => {
                if (window.innerWidth <= 991 && e.target.closest('.sidebar-link')) {
                    setTimeout(closeDashboardSidebar, 200); // リンク遷移を待つ
                }
            });
        }
    }
    
    // すべてのサイドバートグルボタンを取得（ダッシュボード以外）
    const toggleButtons = document.querySelectorAll('.mobile-menu-toggle:not(#dashboardSidebarToggle)');
    // console.log(`[Sidebar] Found ${toggleButtons.length} toggle buttons`);
    
    toggleButtons.forEach((button, index) => {
        // console.log(`[Sidebar] Setting up toggle button ${index}:`, button.id || 'no-id');
        
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // console.log('[Sidebar] Toggle button clicked');
            
            // サイドバーを探す
            const sidebar = document.querySelector('.sidebar');
            const mobileNav = document.querySelector('.mobile-nav');
            
            if (sidebar) {
                sidebar.classList.toggle('active');
                // console.log('[Sidebar] Sidebar toggled, active:', sidebar.classList.contains('active'));
            } else {
                console.error('[Sidebar] Sidebar element not found');
            }
            
            if (mobileNav) {
                mobileNav.classList.toggle('active');
                // console.log('[Sidebar] Mobile nav toggled, active:', mobileNav.classList.contains('active'));
            }
            
            // オーバーレイの処理
            let overlay = document.querySelector('.sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay';
                document.body.appendChild(overlay);
                // console.log('[Sidebar] Overlay created');
            }
            
            if (sidebar && sidebar.classList.contains('active')) {
                overlay.classList.add('active');
                overlay.addEventListener('click', closeSidebar);
            } else {
                overlay.classList.remove('active');
                overlay.removeEventListener('click', closeSidebar);
            }
        });
    });
    
    // サイドバーを閉じる関数
    function closeSidebar() {
        // console.log('[Sidebar] Closing sidebar');
        const sidebar = document.querySelector('.sidebar');
        const mobileNav = document.querySelector('.mobile-nav');
        const overlay = document.querySelector('.sidebar-overlay');
        
        if (sidebar) sidebar.classList.remove('active');
        if (mobileNav) mobileNav.classList.remove('active');
        if (overlay) {
            overlay.classList.remove('active');
            overlay.removeEventListener('click', closeSidebar);
        }
    }
    
    // ESCキーでサイドバーを閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // console.log('[Sidebar] ESC key pressed');
            closeSidebar();
        }
    });
    
    // ウィンドウリサイズ時の処理
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            // console.log('[Sidebar] Window resized, width:', window.innerWidth);
            if (window.innerWidth > 991) {
                closeSidebar();
            }
        }, 250);
    });
});

// console.log('[Sidebar] sidebar-toggle.js setup complete');