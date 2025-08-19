/**
 * INTERCONNECT Main JavaScript
 */

(function() {
    'use strict';

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        initializeApp();
    });

    /**
     * Initialize all app features
     */
    function initializeApp() {
        initNavigation();
        initScrollEffects();
        initContactForm();
        initVideoHandling();
    }

    /**
     * Initialize navigation
     */
    function initNavigation() {
        const navbar = document.querySelector('.navbar');
        const navToggler = document.querySelector('.navbar-toggler');
        const navMenu = document.querySelector('.navbar-nav');
        const navLinks = document.querySelectorAll('.nav-link');

        // Mobile menu toggle
        if (navToggler) {
            navToggler.addEventListener('click', function() {
                navMenu.classList.toggle('active');
                this.classList.toggle('active');
            });
        }

        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e) {
            if (navToggler && navMenu && 
                !navToggler.contains(e.target) && 
                !navMenu.contains(e.target)) {
                navMenu.classList.remove('show');
                
                // Reset hamburger
                const spans = navToggler.querySelectorAll('span');
                if (spans && spans.length >= 3) {
                    spans[0].style.transform = '';
                    spans[1].style.opacity = '';
                    spans[2].style.transform = '';
                }
            }
        });

        // Close mobile menu on link click
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (navMenu.classList.contains('show')) {
                    navMenu.classList.remove('active');
                    
                    // Reset hamburger
                    if (navToggler) {
                        const spans = navToggler.querySelectorAll('span');
                        if (spans && spans.length >= 3) {
                            spans[0].style.transform = '';
                            spans[1].style.opacity = '';
                            spans[2].style.transform = '';
                        }
                    }
                }
            });
        });

        // Navbar scroll effect
        let lastScroll = 0;
        window.addEventListener('scroll', function() {
            const currentScroll = window.pageYOffset;
            
            if (navbar) {
                if (currentScroll > 100) {
                    navbar.style.background = 'rgba(255, 255, 255, 0.98)';
                    navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                } else {
                    navbar.style.background = 'rgba(255, 255, 255, 0.95)';
                    navbar.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                }
            }
            
            lastScroll = currentScroll;
        });
    }

    /**
     * Initialize scroll effects
     */
    function initScrollEffects() {
        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const navbar = document.querySelector('.navbar');
                    const navHeight = navbar ? navbar.offsetHeight : 0;
                    const targetPosition = targetElement.offsetTop - navHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });

        // Scroll indicator click
        const scrollIndicator = document.querySelector('.scroll-indicator');
        if (scrollIndicator) {
            scrollIndicator.addEventListener('click', function() {
                const aboutSection = document.getElementById('about');
                if (aboutSection) {
                    const navHeight = document.querySelector('.navbar').offsetHeight;
                    const targetPosition = aboutSection.offsetTop - navHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        }

        // Intersection Observer for animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe elements
        const animatedElements = document.querySelectorAll('.about-item, .feature-card, .event-card, .achievement-item');
        animatedElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }

    /**
     * Initialize contact form
     */
    function initContactForm() {
        const contactForm = document.getElementById('contactForm');
        
        if (contactForm) {
            contactForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Get form data
                const formData = new FormData(contactForm);
                const data = {
                    name: formData.get('name'),
                    company: formData.get('company'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    message: formData.get('message')
                };
                
                // Validate email
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(data.email)) {
                    alert('有効なメールアドレスを入力してください。');
                    return;
                }
                
                // Here you would normally send the data to a server
                // console.log('Form data:', data);
                
                // Show success message
                alert('お問い合わせを受け付けました。2-3営業日以内にご連絡いたします。');
                
                // Reset form
                contactForm.reset();
            });
        }
    }

    /**
     * Initialize video handling with robust error handling and fallback
     */
    function initVideoHandling() {
        const heroVideoContainer = document.querySelector('.hero-video-container');
        const heroVideo = document.querySelector('.hero-video');
        
        if (!heroVideo || !heroVideoContainer) {
            // console.log('Video elements not found');
            return;
        }

        // Track video load attempts
        let loadAttempts = 0;
        const maxAttempts = 3;
        
        // Create fallback image element
        const fallbackImage = document.createElement('div');
        fallbackImage.className = 'hero-fallback-image';
        fallbackImage.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('assets/hero-fallback.svg');
            background-size: cover;
            background-position: center;
            display: none;
            z-index: 0;
        `;
        heroVideoContainer.appendChild(fallbackImage);

        // Function to show fallback
        function showFallback() {
            // console.log('Showing fallback image');
            heroVideo.style.display = 'none';
            fallbackImage.style.display = 'block';
        }

        // Function to check video source
        function checkVideoSource() {
            const videoSource = heroVideo.querySelector('source');
            if (!videoSource) {
                console.error('No video source found');
                showFallback();
                return false;
            }
            return true;
        }

        // Initial check
        if (!checkVideoSource()) {
            return;
        }

        // Handle various video errors
        heroVideo.addEventListener('error', function(e) {
            loadAttempts++;
            console.error(`Video load error (attempt ${loadAttempts}/${maxAttempts}):`, e);
            
            if (loadAttempts >= maxAttempts) {
                showFallback();
            } else {
                // Try to reload the video
                setTimeout(function() {
                    heroVideo.load();
                }, 1000 * loadAttempts);
            }
        });

        // Handle source element errors
        const videoSource = heroVideo.querySelector('source');
        if (videoSource) {
            videoSource.addEventListener('error', function(e) {
                console.error('Video source error:', e);
                showFallback();
            });
        }

        // Check if video can be played
        heroVideo.addEventListener('loadedmetadata', function() {
            // console.log('Video metadata loaded successfully');
        });

        // Handle successful video load
        heroVideo.addEventListener('canplay', function() {
            // console.log('Video can play');
            loadAttempts = 0; // Reset attempts on success
            heroVideo.classList.remove('loading');
            heroVideo.classList.add('loaded');
            
            // homepage-perfect-final.jsで再生するため、ここでは再生しない
            // 重複再生を防ぐ
        });

        // Handle stalled video
        heroVideo.addEventListener('stalled', function() {
            console.warn('Video stalled');
        });

        // Handle slow loading
        let loadingTimeout = setTimeout(function() {
            if (heroVideo.readyState < 3) { // HAVE_FUTURE_DATA
                console.warn('Video loading timeout - showing fallback');
                showFallback();
            }
        }, 30000); // 30 second timeout for Netlify CDN

        // Clear timeout if video loads successfully
        heroVideo.addEventListener('canplaythrough', function() {
            clearTimeout(loadingTimeout);
            // console.log('Video loaded completely');
        });

        // Performance optimization: pause video when not visible
        let videoObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    if (heroVideo.paused && heroVideo.readyState >= 3) {
                        heroVideo.play().catch(function() {
                            // Ignore autoplay errors when returning to view
                        });
                    }
                } else {
                    if (!heroVideo.paused) {
                        heroVideo.pause();
                    }
                }
            });
        }, { threshold: 0.25 });

        videoObserver.observe(heroVideo);

        // Check network status - skip for Netlify test environment
        const isNetlify = window.location.hostname.includes('netlify') || window.location.hostname.includes('netlify.app');
        
        if (!isNetlify && 'connection' in navigator) {
            const connection = navigator.connection;
            if (connection.saveData || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                // console.log('Slow connection detected - showing fallback');
                showFallback();
            }
        }
    }

})();