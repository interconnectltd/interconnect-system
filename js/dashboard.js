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
        try {
            const userEmail = typeof Storage !== 'undefined' ? sessionStorage.getItem('userEmail') : null;
            const userName = userEmail && userEmail.includes('@') ? userEmail.split('@')[0] : 'ゲスト';
            
            // Update all user name elements
            const userNameElements = document.querySelectorAll('.user-name');
            if (userNameElements.length > 0) {
                userNameElements.forEach(element => {
                    if (element) {
                        element.textContent = userName;
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

})();