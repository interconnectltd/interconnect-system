/**
 * Super Admin Master JavaScript
 * 神レベル管理画面用JavaScript
 */

(function() {
    'use strict';

    // Global admin state
    window.SuperAdmin = {
        state: {
            sidebarCollapsed: false,
            currentPage: 'dashboard',
            notifications: [],
            isDarkMode: false,
            isMobile: window.innerWidth <= 768
        },
        components: {},
        utils: {}
    };

    /**
     * Initialize Super Admin App
     */
    document.addEventListener('DOMContentLoaded', function() {
        initializeApp();
    });

    /**
     * Main initialization function
     */
    function initializeApp() {
        console.log('🚀 Super Admin Interface Loading...');
        
        // Show loading screen
        showLoadingScreen();
        
        // Initialize components in sequence
        setTimeout(() => {
            initializeNavigation();
            initializeSidebar();
            initializeTopbar();
            initializeNotifications();
            initializeModals();
            initializeKPICards();
            initializeCharts();
            initializeResponsive();
            initializeKeyboardShortcuts();
            initializeTooltips();
            initializeSearch();
            
            // Hide loading screen after initialization
            setTimeout(hideLoadingScreen, 1000);
            
            console.log('✅ Super Admin Interface Ready');
        }, 500);
    }

    /**
     * Loading Screen Management
     */
    function showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }

    function hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    /**
     * Navigation Management
     */
    function initializeNavigation() {
        const navLinks = document.querySelectorAll('.nav-link[data-page]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const page = this.getAttribute('data-page');
                navigateToPage(page);
            });
        });
    }

    function navigateToPage(page) {
        // Update active navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-page="${page}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Update page content
        document.querySelectorAll('.page-content').forEach(content => {
            content.classList.remove('active');
        });

        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update breadcrumb
        updateBreadcrumb(page);
        
        // Update state
        SuperAdmin.state.currentPage = page;
        
        // Load page-specific content if needed
        loadPageContent(page);
    }

    function updateBreadcrumb(page) {
        const breadcrumb = document.getElementById('currentPageBreadcrumb');
        if (breadcrumb) {
            const pageNames = {
                'dashboard': 'ダッシュボード',
                'analytics': '分析',
                'site-settings': 'サイト設定',
                'content-editor': 'コンテンツ編集',
                'media-manager': 'メディア管理',
                'users': 'ユーザー一覧',
                'roles': '権限管理',
                'moderation': 'モデレーション',
                'logs': 'ログ監視',
                'backups': 'バックアップ',
                'security': 'セキュリティ'
            };
            breadcrumb.textContent = pageNames[page] || page;
        }
    }

    function loadPageContent(page) {
        // Simulate dynamic content loading
        console.log(`Loading content for: ${page}`);
        
        // Add page-specific initialization here
        switch(page) {
            case 'analytics':
                initializeAnalytics();
                break;
            case 'site-settings':
                initializeSiteSettings();
                break;
            case 'users':
                initializeUserManagement();
                break;
            default:
                break;
        }
    }

    /**
     * Sidebar Management
     */
    function initializeSidebar() {
        const sidebar = document.getElementById('adminSidebar');
        const collapseBtn = document.getElementById('superAdminCollapseBtn');
        const toggleBtn = document.getElementById('superAdminToggleBtn');
        const mobileToggle = document.getElementById('superAdminMobileToggle');
        const overlay = document.getElementById('mobileOverlay');

        // Desktop collapse
        if (collapseBtn) {
            collapseBtn.addEventListener('click', function() {
                sidebar.classList.toggle('collapsed');
                SuperAdmin.state.sidebarCollapsed = !SuperAdmin.state.sidebarCollapsed;
                
                // Save preference
                localStorage.setItem('adminSidebarCollapsed', SuperAdmin.state.sidebarCollapsed);
            });
        }

        // Desktop toggle
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                if (SuperAdmin.state.isMobile) {
                    sidebar.classList.toggle('mobile-active');
                    overlay.classList.toggle('active');
                } else {
                    sidebar.classList.toggle('collapsed');
                    SuperAdmin.state.sidebarCollapsed = !SuperAdmin.state.sidebarCollapsed;
                }
            });
        }

        // Mobile toggle
        if (mobileToggle) {
            mobileToggle.addEventListener('click', function() {
                this.classList.toggle('active');
                sidebar.classList.toggle('mobile-active');
                overlay.classList.toggle('active');
                document.body.style.overflow = sidebar.classList.contains('mobile-active') ? 'hidden' : '';
            });
        }

        // Overlay click
        if (overlay) {
            overlay.addEventListener('click', function() {
                closeMobileSidebar();
            });
        }

        // Profile menu in sidebar
        const profileMenuBtn = document.getElementById('profileMenuBtn');
        const profileDropdown = document.getElementById('profileDropdown');
        
        if (profileMenuBtn && profileDropdown) {
            profileMenuBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                profileDropdown.classList.toggle('show');
            });
        }

        // Load saved preference
        const savedCollapsed = localStorage.getItem('adminSidebarCollapsed');
        if (savedCollapsed === 'true') {
            sidebar.classList.add('collapsed');
            SuperAdmin.state.sidebarCollapsed = true;
        }
    }

    function closeMobileSidebar() {
        const sidebar = document.getElementById('adminSidebar');
        const overlay = document.getElementById('mobileOverlay');
        const mobileToggle = document.getElementById('mobileMenuToggle');
        
        sidebar.classList.remove('mobile-active');
        overlay.classList.remove('active');
        mobileToggle.classList.remove('active');
        document.body.style.overflow = '';
    }

    /**
     * Topbar Management
     */
    function initializeTopbar() {
        // Profile menu
        const profileBtn = document.getElementById('profileBtn');
        const topProfileDropdown = document.getElementById('topProfileDropdown');
        
        if (profileBtn && topProfileDropdown) {
            profileBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                topProfileDropdown.classList.toggle('show');
            });
        }

        // Close dropdowns when clicking outside
        document.addEventListener('click', function() {
            document.querySelectorAll('.profile-dropdown').forEach(dropdown => {
                dropdown.classList.remove('show');
            });
        });
    }

    /**
     * Notifications Management
     */
    function initializeNotifications() {
        const notificationBtn = document.getElementById('notificationBtn');
        const notificationPanel = document.getElementById('notificationPanel');
        const markAllReadBtn = document.querySelector('.mark-all-read');

        if (notificationBtn && notificationPanel) {
            notificationBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                notificationPanel.classList.toggle('show');
                
                if (notificationPanel.classList.contains('show')) {
                    loadNotifications();
                }
            });
        }

        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', function() {
                markAllNotificationsRead();
            });
        }

        // Close notification panel when clicking outside
        document.addEventListener('click', function(e) {
            if (!notificationPanel.contains(e.target) && !notificationBtn.contains(e.target)) {
                notificationPanel.classList.remove('show');
            }
        });

        // Initialize notification polling
        initializeNotificationPolling();
    }

    function loadNotifications() {
        // Simulate loading notifications
        console.log('Loading notifications...');
        
        // In a real app, this would be an API call
        SuperAdmin.state.notifications = [
            {
                id: 1,
                type: 'user-plus',
                message: '新規ユーザーが登録されました',
                time: '2分前',
                unread: true
            },
            {
                id: 2,
                type: 'exclamation-triangle',
                message: 'システムエラーが発生しました',
                time: '15分前',
                unread: false
            }
        ];
        
        updateNotificationBadge();
    }

    function updateNotificationBadge() {
        const unreadCount = SuperAdmin.state.notifications.filter(n => n.unread).length;
        const badges = document.querySelectorAll('.notification-badge');
        
        badges.forEach(badge => {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        });
    }

    function markAllNotificationsRead() {
        SuperAdmin.state.notifications.forEach(notification => {
            notification.unread = false;
        });
        
        // Update UI
        document.querySelectorAll('.notification-item').forEach(item => {
            item.classList.remove('unread');
        });
        
        updateNotificationBadge();
        
        console.log('All notifications marked as read');
    }

    function initializeNotificationPolling() {
        // Poll for new notifications every 30 seconds
        setInterval(() => {
            // In a real app, this would check for new notifications
            console.log('Checking for new notifications...');
        }, 30000);
    }

    /**
     * Modal Management
     */
    function initializeModals() {
        const quickAddBtn = document.getElementById('quickAddBtn');
        const quickAddModal = document.getElementById('quickAddModal');
        const quickAddModalClose = document.getElementById('quickAddModalClose');

        if (quickAddBtn && quickAddModal) {
            quickAddBtn.addEventListener('click', function() {
                quickAddModal.classList.add('show');
                document.body.style.overflow = 'hidden';
            });
        }

        if (quickAddModalClose) {
            quickAddModalClose.addEventListener('click', function() {
                closeModal(quickAddModal);
            });
        }

        // Close modal on backdrop click
        if (quickAddModal) {
            quickAddModal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeModal(this);
                }
            });
        }

        // Quick add button handlers
        document.querySelectorAll('.quick-add-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.getAttribute('data-type');
                handleQuickAdd(type);
            });
        });
    }

    function closeModal(modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }

    function handleQuickAdd(type) {
        console.log(`Quick add: ${type}`);
        
        // Simulate action
        const actions = {
            'user': 'ユーザー追加画面を開きます',
            'event': 'イベント作成画面を開きます',
            'announcement': 'お知らせ投稿画面を開きます',
            'backup': 'バックアップを実行します'
        };
        
        showToast(actions[type] || 'アクションを実行しました', 'info');
        closeModal(document.getElementById('quickAddModal'));
    }

    /**
     * KPI Cards Management
     */
    function initializeKPICards() {
        const kpiCards = document.querySelectorAll('.kpi-card');
        
        kpiCards.forEach(card => {
            // Add hover effects
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-8px)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(-4px)';
            });
            
            // Menu button functionality
            const menuBtn = card.querySelector('.kpi-menu-btn');
            if (menuBtn) {
                menuBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    console.log('KPI card menu clicked');
                });
            }
        });

        // Animate numbers on load
        animateKPINumbers();
    }

    function animateKPINumbers() {
        const kpiValues = document.querySelectorAll('.kpi-value');
        
        kpiValues.forEach(value => {
            const target = parseInt(value.textContent.replace(/[^\d]/g, ''));
            const duration = 2000;
            const increment = target / (duration / 16);
            let current = 0;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                
                // Format number with commas
                const formatted = Math.floor(current).toLocaleString();
                
                // Preserve currency symbol if present
                if (value.textContent.includes('¥')) {
                    value.textContent = `¥${formatted}`;
                } else {
                    value.textContent = formatted;
                }
            }, 16);
        });
    }

    /**
     * Charts Management
     */
    function initializeCharts() {
        // Initialize mini charts in KPI cards
        initializeMiniCharts();
        
        // Initialize main charts
        initializeMainCharts();
    }

    function initializeMiniCharts() {
        const miniCharts = document.querySelectorAll('.mini-chart');
        
        miniCharts.forEach(chart => {
            const type = chart.getAttribute('data-chart');
            createMiniChart(chart, type);
        });
    }

    function createMiniChart(container, type) {
        // Create simple SVG chart
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', '0 0 200 60');
        
        // Generate sample data
        const data = generateSampleData(type);
        const path = createSVGPath(data, 200, 60);
        
        // Create path element
        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', path);
        pathElement.setAttribute('fill', 'none');
        pathElement.setAttribute('stroke', getChartColor(type));
        pathElement.setAttribute('stroke-width', '2');
        
        // Add gradient fill
        const gradient = createGradient(svg, getChartColor(type));
        const fillPath = pathElement.cloneNode();
        fillPath.setAttribute('fill', `url(#gradient-${type})`);
        fillPath.setAttribute('d', path + ' L200,60 L0,60 Z');
        
        svg.appendChild(gradient);
        svg.appendChild(fillPath);
        svg.appendChild(pathElement);
        container.appendChild(svg);
    }

    function generateSampleData(type) {
        const points = 20;
        const data = [];
        
        for (let i = 0; i < points; i++) {
            const trend = type === 'users' ? 0.7 : type === 'revenue' ? 0.8 : 0.6;
            const base = 30 + (i * trend);
            const variance = Math.random() * 10 - 5;
            data.push(Math.max(5, base + variance));
        }
        
        return data;
    }

    function createSVGPath(data, width, height) {
        const maxValue = Math.max(...data);
        const minValue = Math.min(...data);
        const range = maxValue - minValue;
        
        let path = '';
        
        data.forEach((value, index) => {
            const x = (index / (data.length - 1)) * width;
            const y = height - ((value - minValue) / range) * (height - 10) - 5;
            
            if (index === 0) {
                path += `M ${x} ${y}`;
            } else {
                path += ` L ${x} ${y}`;
            }
        });
        
        return path;
    }

    function createGradient(svg, color) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        
        gradient.setAttribute('id', `gradient-${Date.now()}`);
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '0%');
        gradient.setAttribute('y2', '100%');
        
        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', color);
        stop1.setAttribute('stop-opacity', '0.3');
        
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', color);
        stop2.setAttribute('stop-opacity', '0');
        
        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
        
        return defs;
    }

    function getChartColor(type) {
        const colors = {
            'users': '#3b82f6',
            'revenue': '#10b981',
            'matches': '#f59e0b',
            'events': '#8b5cf6'
        };
        return colors[type] || '#6366f1';
    }

    function initializeMainCharts() {
        // Initialize main dashboard charts
        // In a real app, you would use a charting library like Chart.js or D3.js
        console.log('Initializing main charts...');
    }

    /**
     * Responsive Management
     */
    function initializeResponsive() {
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial check
    }

    function handleResize() {
        const wasMobile = SuperAdmin.state.isMobile;
        SuperAdmin.state.isMobile = window.innerWidth <= 768;
        
        if (wasMobile !== SuperAdmin.state.isMobile) {
            // Mobile state changed
            if (!SuperAdmin.state.isMobile) {
                // Switched to desktop
                closeMobileSidebar();
            }
        }
    }

    /**
     * Keyboard Shortcuts
     */
    function initializeKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                focusSearch();
            }
            
            // Ctrl/Cmd + B for sidebar toggle
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                toggleSidebar();
            }
            
            // Ctrl/Cmd + N for quick add
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                openQuickAdd();
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                closeAllModals();
            }
        });
    }

    function focusSearch() {
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    function toggleSidebar() {
        const collapseBtn = document.getElementById('sidebarCollapseBtn');
        if (collapseBtn) {
            collapseBtn.click();
        }
    }

    function openQuickAdd() {
        const quickAddBtn = document.getElementById('quickAddBtn');
        if (quickAddBtn) {
            quickAddBtn.click();
        }
    }

    function closeAllModals() {
        document.querySelectorAll('.modal.show').forEach(modal => {
            closeModal(modal);
        });
        
        document.querySelectorAll('.notification-panel.show').forEach(panel => {
            panel.classList.remove('show');
        });
        
        document.querySelectorAll('.profile-dropdown.show').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }

    /**
     * Tooltips
     */
    function initializeTooltips() {
        const tooltipElements = document.querySelectorAll('[title]');
        
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', showTooltip);
            element.addEventListener('mouseleave', hideTooltip);
        });
    }

    function showTooltip(e) {
        const text = e.target.getAttribute('title');
        if (!text) return;
        
        // Remove title to prevent default tooltip
        e.target.setAttribute('data-title', text);
        e.target.removeAttribute('title');
        
        // Create custom tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = text;
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = e.target.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
    }

    function hideTooltip(e) {
        const title = e.target.getAttribute('data-title');
        if (title) {
            e.target.setAttribute('title', title);
            e.target.removeAttribute('data-title');
        }
        
        const tooltip = document.querySelector('.custom-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    /**
     * Search Functionality
     */
    function initializeSearch() {
        const searchInput = document.getElementById('globalSearch');
        
        if (searchInput) {
            let searchTimeout;
            
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    performSearch(this.value);
                }, 300);
            });
            
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    performSearch(this.value);
                }
            });
        }
    }

    function performSearch(query) {
        if (query.length < 2) return;
        
        console.log(`Searching for: ${query}`);
        
        // Implement search logic here
        // This could search through users, content, logs, etc.
    }

    /**
     * Toast Notifications
     */
    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        // トーストコンテンツを安全に作成
        const toastContent = document.createElement('div');
        toastContent.className = 'toast-content';
        
        const icon = document.createElement('i');
        icon.className = `fas fa-${getToastIcon(type)}`;
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        
        toastContent.appendChild(icon);
        toastContent.appendChild(messageSpan);
        
        // 閉じるボタンを作成
        const closeButton = document.createElement('button');
        closeButton.className = 'toast-close';
        const closeIcon = document.createElement('i');
        closeIcon.className = 'fas fa-times';
        closeButton.appendChild(closeIcon);
        
        toast.appendChild(toastContent);
        toast.appendChild(closeButton);
        
        // Add styles
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 1080;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            removeToast(toast);
        });
        
        // Auto remove
        setTimeout(() => {
            removeToast(toast);
        }, duration);
    }

    function removeToast(toast) {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    function getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-triangle',
            'warning': 'exclamation-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * Page-specific initialization functions
     */
    function initializeAnalytics() {
        console.log('Initializing analytics page...');
        // Add analytics-specific functionality
    }

    function initializeSiteSettings() {
        console.log('Initializing site settings page...');
        // Add site settings functionality
    }

    function initializeUserManagement() {
        console.log('Initializing user management page...');
        // Add user management functionality
    }

    /**
     * Logout function
     */
    function superAdminLogout() {
        if (confirm('ログアウトしますか？')) {
            showToast('ログアウトしています...', 'info');
            
            // Clear session data
            sessionStorage.clear();
            localStorage.removeItem('adminSession');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    }
    
    // Export for global access
    window.superAdminLogout = superAdminLogout;

    /**
     * Public API
     */
    window.SuperAdmin.api = {
        navigateToPage,
        showToast,
        updateNotificationBadge,
        toggleSidebar: () => {
            const sidebar = document.getElementById('adminSidebar');
            sidebar.classList.toggle('collapsed');
        }
    };

    /**
     * Error handling
     */
    window.addEventListener('error', function(e) {
        console.error('Super Admin Error:', e.error);
        showToast('システムエラーが発生しました', 'error');
    });

    /**
     * Performance monitoring
     */
    if ('performance' in window) {
        window.addEventListener('load', function() {
            const loadTime = performance.now();
            console.log(`⚡ Super Admin loaded in ${Math.round(loadTime)}ms`);
        });
    }

})();