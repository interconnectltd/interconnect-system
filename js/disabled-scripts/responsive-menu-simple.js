// Responsive Menu JavaScript - Simple Version

document.addEventListener('DOMContentLoaded', function() {
    // Get mobile menu button by ID
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    
    // Add click event to toggle button
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Get menu elements
            const mobileNav = document.querySelector('.mobile-nav');
            const mobileBackdrop = document.querySelector('.mobile-backdrop');
            const body = document.body;
            
            // Toggle active classes
            if (mobileNav && mobileBackdrop) {
                mobileNav.classList.toggle('active');
                mobileBackdrop.classList.toggle('active');
                body.classList.toggle('menu-open');
            }
        });
    }
    
    // Close menu when clicking backdrop
    const mobileBackdrop = document.querySelector('.mobile-backdrop');
    if (mobileBackdrop) {
        mobileBackdrop.addEventListener('click', function() {
            const mobileNav = document.querySelector('.mobile-nav');
            const body = document.body;
            
            mobileNav.classList.remove('active');
            mobileBackdrop.classList.remove('active');
            body.classList.remove('menu-open');
        });
    }
    
    // Close menu when clicking close button
    const mobileNavClose = document.querySelector('.mobile-nav-close');
    if (mobileNavClose) {
        mobileNavClose.addEventListener('click', function() {
            const mobileNav = document.querySelector('.mobile-nav');
            const mobileBackdrop = document.querySelector('.mobile-backdrop');
            const body = document.body;
            
            mobileNav.classList.remove('active');
            mobileBackdrop.classList.remove('active');
            body.classList.remove('menu-open');
        });
    }
});