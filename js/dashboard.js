/**
 * Dashboard JavaScript
 */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        checkAuth();
        initSidebar();
        initUserMenu();
        updateUserInfo();
        
        // ProfileSyncが準備できたら再度更新
        if (window.ProfileSync) {
            setTimeout(() => updateUserInfo(), 1000);
        }
        
        // supabaseReadyイベントでも更新
        window.addEventListener('supabaseReady', function() {
            console.log('Dashboard: supabaseReady event received, updating user info');
            setTimeout(() => updateUserInfo(), 500);
        });
    });

    /**
     * Check authentication
     */
    function checkAuth() {
        // Authentication check disabled for testing
        // const isLoggedIn = sessionStorage.getItem('isLoggedIn');
        // 
        // if (!isLoggedIn || isLoggedIn !== 'true') {
        //     window.location.href = 'login.html';
        // }
    }

    /**
     * Initialize sidebar
     */
    function initSidebar() {
        // Only initialize desktop sidebar toggle, not mobile menu toggle
        const sidebarToggle = document.querySelector('.sidebar .sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (sidebarToggle && sidebar) {
            const sidebarToggleHandler = function() {
                sidebar.classList.toggle('show');
            };
            
            sidebarToggle.addEventListener('click', sidebarToggleHandler);
            
            // Close sidebar when clicking outside on mobile
            const outsideClickHandler = function(e) {
                if (window.innerWidth <= 1024 && 
                    !sidebar.contains(e.target) && 
                    sidebar.classList.contains('show')) {
                    sidebar.classList.remove('show');
                }
            };
            
            document.addEventListener('click', outsideClickHandler);
            
            // クリーンアップ用にハンドラーを保存
            window._sidebarHandlers = {
                toggle: sidebarToggleHandler,
                outside: outsideClickHandler
            };
        }
    }

    /**
     * Initialize user menu
     */
    function initUserMenu() {
        const userMenuBtn = document.querySelector('.user-menu-btn');
        const userDropdown = document.querySelector('.user-dropdown');
        
        if (userMenuBtn && userDropdown) {
            const menuClickHandler = function(e) {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            };
            
            userMenuBtn.addEventListener('click', menuClickHandler);
            
            // Close dropdown when clicking outside
            const dropdownCloseHandler = function() {
                if (userDropdown) {
                    userDropdown.classList.remove('show');
                }
            };
            
            document.addEventListener('click', dropdownCloseHandler);
            
            // クリーンアップ用にハンドラーを保存
            window._userMenuHandlers = {
                click: menuClickHandler,
                close: dropdownCloseHandler
            };
        }
    }

    /**
     * Update user information
     */
    function updateUserInfo() {
        console.log('[Dashboard] updateUserInfo called at', new Date().toISOString());
        try {
            // まずlocalStorageから完全なユーザー情報を取得
            let userName = 'ゲスト';
            let userPicture = null;
            
            if (typeof Storage !== 'undefined') {
                const userDataStr = localStorage.getItem('user');
                console.log('[Dashboard] Raw user data from localStorage:', userDataStr);
                if (userDataStr) {
                    try {
                        const userData = JSON.parse(userDataStr);
                        console.log('[Dashboard] Parsed user data:', userData);
                        
                        // 名前の優先順位: name > display_name > emailの@前
                        userName = userData.name || userData.display_name || userData.email?.split('@')[0] || 'ゲスト';
                        
                        // LINE IDの場合の対処
                        if (userName.startsWith('line_') && userData.display_name && !userData.display_name.startsWith('line_')) {
                            userName = userData.display_name;
                            // 修正したデータを保存
                            userData.name = userData.display_name;
                            localStorage.setItem('user', JSON.stringify(userData));
                        }
                        
                        userPicture = userData.picture || userData.picture_url;
                        console.log('[Dashboard] Extracted userName:', userName);
                        console.log('[Dashboard] Extracted userPicture:', userPicture);
                    } catch (e) {
                        console.error('[Dashboard] Failed to parse user data:', e);
                    }
                }
                
                // フォールバック: sessionStorageのemail
                if (userName === 'ゲスト' || userName.startsWith('line_')) {
                    const userEmail = sessionStorage.getItem('userEmail');
                    console.log('[Dashboard] Fallback to sessionStorage email:', userEmail);
                    if (userEmail && userEmail.includes('@')) {
                        userName = userEmail.split('@')[0];
                    }
                }
            }
            
            // Update all user name elements
            const userNameElements = document.querySelectorAll('.user-name');
            console.log('Found user name elements:', userNameElements.length);
            if (userNameElements.length > 0) {
                userNameElements.forEach((element, index) => {
                    if (element) {
                        console.log(`Updating element ${index}:`, element);
                        console.log(`  Parent:`, element.parentElement);
                        console.log(`  Old text:`, element.textContent);
                        element.textContent = userName;
                        console.log(`  New text:`, element.textContent);
                    }
                });
            }
            
            // プロフィール画像も更新（存在する場合）
            if (userPicture) {
                const profileImages = document.querySelectorAll('.user-menu-btn img, .user-avatar img, .profile-pic img');
                profileImages.forEach(img => {
                    if (img) {
                        img.src = userPicture;
                        img.onerror = function() {
                            // 画像読み込みエラー時はデフォルト画像
                            this.src = 'assets/user-placeholder.svg';
                        };
                    }
                });
            }
        } catch (error) {
            console.error('ユーザー情報の更新エラー:', error);
        }
    }

    /**
     * Logout function は global-functions.js で定義済み
     * 重複を避けるためここでは定義しない
     */
    
    // グローバルに公開（デバッグ用）
    window.updateDashboardUserInfo = updateUserInfo;

})();