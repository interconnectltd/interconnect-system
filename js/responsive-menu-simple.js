// Responsive Menu JavaScript
// 統合元: responsive-menu.js + responsive-menu-simple.js

document.addEventListener('DOMContentLoaded', function() {
    // Get elements - 複数のセレクタに対応
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle, .navbar-toggler');
    const mobileNav = document.querySelector('.mobile-nav, .navbar-nav');
    const mobileBackdrop = document.querySelector('.mobile-backdrop');
    const mobileNavClose = document.querySelector('.mobile-nav-close');
    const body = document.body;
    const isNavbarType = mobileMenuToggle && mobileMenuToggle.classList.contains('navbar-toggler');

    // Check if elements exist - mobileBackdropは必須ではない
    if (!mobileNav) {
        return;
    }

    // navbar用バックドロップを動的生成
    let navBackdrop = null;
    if (isNavbarType && !mobileBackdrop) {
        navBackdrop = document.getElementById('navMenuBackdrop');
        if (!navBackdrop) {
            navBackdrop = document.createElement('div');
            navBackdrop.id = 'navMenuBackdrop';
            navBackdrop.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:1850;display:none;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);';
            document.body.appendChild(navBackdrop);
        }
    }

    // navbar要素を取得（z-index制御用）
    const navbar = isNavbarType ? document.querySelector('nav.navbar') : null;

    // Function to open mobile menu
    function openMobileMenu() {
        mobileNav.classList.add('active');
        if (mobileMenuToggle) mobileMenuToggle.classList.add('active');
        if (mobileBackdrop) {
            mobileBackdrop.classList.add('active');
        }
        if (navBackdrop) navBackdrop.style.display = 'block';
        // navbarのz-indexをバックドロップより上に引き上げる
        if (navbar) navbar.style.zIndex = '2000';
        body.classList.add('menu-open');
    }

    // Function to close mobile menu
    function closeMobileMenu() {
        mobileNav.classList.remove('active');
        if (mobileMenuToggle) mobileMenuToggle.classList.remove('active');
        if (mobileBackdrop) {
            mobileBackdrop.classList.remove('active');
        }
        if (navBackdrop) navBackdrop.style.display = 'none';
        // navbarのz-indexを元に戻す
        if (navbar) navbar.style.zIndex = '';
        body.classList.remove('menu-open');
    }

    // Toggle menu on button click
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (mobileNav.classList.contains('active')) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });
    }

    // Close menu on backdrop click
    if (mobileBackdrop) {
        mobileBackdrop.addEventListener('click', closeMobileMenu);
    }
    if (navBackdrop) {
        navBackdrop.addEventListener('click', closeMobileMenu);
    }

    // Close menu on close button click
    if (mobileNavClose) {
        mobileNavClose.addEventListener('click', closeMobileMenu);
    }

    // Close menu on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
            closeMobileMenu();
        }
    });

    // Close menu on link click (navbar type)
    if (isNavbarType) {
        mobileNav.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                if (mobileNav.classList.contains('active')) {
                    closeMobileMenu();
                }
            });
        });
    }

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            // navbar: 1024px, mobile-nav: 768px
            var threshold = isNavbarType ? 1024 : 768;
            if (window.innerWidth > threshold) {
                closeMobileMenu();
            }
        }, 250);
    });

    // Mark current page as active
    const currentPath = window.location.pathname;
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

    mobileNavLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath ||
            (currentPath.endsWith('/') && link.getAttribute('href') === 'dashboard.html') ||
            (currentPath.includes(link.getAttribute('href')) && link.getAttribute('href') !== '#')) {
            link.classList.add('active');
        }
    });

    // Handle touch events for better mobile experience
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', function(e) {
        if (e.changedTouches && e.changedTouches.length > 0) {
            touchStartX = e.changedTouches[0].screenX;
        }
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
        if (e.changedTouches && e.changedTouches.length > 0) {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 50;
        const swipeDistance = touchEndX - touchStartX;

        // Swipe right to open menu (from left edge)
        if (touchStartX < 20 && swipeDistance > swipeThreshold) {
            openMobileMenu();
        }

        // Swipe left to close menu
        if (mobileNav.classList.contains('active') && swipeDistance < -swipeThreshold) {
            closeMobileMenu();
        }
    }

    // Prevent scrolling on mobile when menu is open
    mobileNav.addEventListener('touchmove', function(e) {
        e.stopPropagation();
    }, { passive: true });
});
