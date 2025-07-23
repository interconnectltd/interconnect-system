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
            sidebarToggle.addEventListener('click', function() {
                sidebar.classList.toggle('show');
            });
            
            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', function(e) {
                if (window.innerWidth <= 1024 && 
                    !sidebar.contains(e.target) && 
                    sidebar.classList.contains('show')) {
                    sidebar.classList.remove('show');
                }
            });
        }
    }

    /**
     * Initialize user menu
     */
    function initUserMenu() {
        const userMenuBtn = document.querySelector('.user-menu-btn');
        const userDropdown = document.querySelector('.user-dropdown');
        
        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function() {
                userDropdown.classList.remove('show');
            });
        }
    }

    /**
     * Update user information
     */
    function updateUserInfo() {
        const userEmail = sessionStorage.getItem('userEmail');
        const userName = userEmail ? userEmail.split('@')[0] : 'ゲスト';
        
        // Update all user name elements
        document.querySelectorAll('.user-name').forEach(element => {
            element.textContent = userName;
        });
    }

    /**
     * Logout function
     * 注意：auth-supabase.jsでも定義されているため、存在チェックを追加
     */
    if (!window.logout) {
        window.logout = function() {
        try {
            if (confirm('ログアウトしますか？')) {
                // Clear session data safely
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.clear();
                }
                
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem('rememberMe');
                    localStorage.removeItem('userProfile');
                    localStorage.removeItem('isLoggedIn');
                }
                
                // Show logout message
                if (window.InterConnect && window.InterConnect.Registration && window.InterConnect.Registration.showToast) {
                    window.InterConnect.Registration.showToast('ログアウトしました', 'success');
                }
                
                // Redirect to index page after a short delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Fallback: force redirect even if there's an error
            window.location.href = 'index.html';
        }
    };
    }

})();