// Responsive Menu JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Get elements - 複数のセレクタに対応
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle, .navbar-toggler');
    const mobileNav = document.querySelector('.mobile-nav, .navbar-nav');
    const mobileBackdrop = document.querySelector('.mobile-backdrop');
    const mobileNavClose = document.querySelector('.mobile-nav-close');
    const body = document.body;
    
    // Check if elements exist - mobileBackdropは必須ではない
    if (!mobileNav) {
        return;
    }

    // Function to open mobile menu
    function openMobileMenu() {
        mobileNav.classList.add('active');
        if (mobileBackdrop) {
            mobileBackdrop.classList.add('active');
        }
        body.classList.add('menu-open');
    }

    // Function to close mobile menu
    function closeMobileMenu() {
        mobileNav.classList.remove('active');
        if (mobileBackdrop) {
            mobileBackdrop.classList.remove('active');
        }
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

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (window.innerWidth > 768) {
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