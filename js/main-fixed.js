/**
 * INTERCONNECT Main JavaScript - Memory Leak Fixed Version
 */

(function() {
    'use strict';

    // クリーンアップ用の参照を保持
    let cleanupFunctions = [];
    let observers = [];
    let timeouts = [];
    let eventListeners = [];

    // イベントリスナーの管理用ヘルパー
    function addEventListener(element, event, handler, options) {
        element.addEventListener(event, handler, options);
        eventListeners.push({ element, event, handler, options });
    }

    // タイムアウトの管理用ヘルパー
    function setManagedTimeout(fn, delay) {
        const timeoutId = setTimeout(fn, delay);
        timeouts.push(timeoutId);
        return timeoutId;
    }

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        initializeApp();
    });

    // ページ遷移時のクリーンアップ
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);

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
            const toggleHandler = function() {
                navMenu.classList.toggle('active');
                this.classList.toggle('active');
            };
            addEventListener(navToggler, 'click', toggleHandler);
        }

        // Close mobile menu when clicking outside
        const documentClickHandler = function(e) {
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
        };
        addEventListener(document, 'click', documentClickHandler);

        // Close mobile menu on link click
        navLinks.forEach(link => {
            const linkClickHandler = function() {
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
            };
            addEventListener(link, 'click', linkClickHandler);
        });

        // Navbar scroll effect
        let lastScroll = 0;
        const scrollHandler = function() {
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
        };
        addEventListener(window, 'scroll', scrollHandler, { passive: true });
    }

    /**
     * Initialize scroll effects
     */
    function initScrollEffects() {
        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            const smoothScrollHandler = function(e) {
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
            };
            addEventListener(anchor, 'click', smoothScrollHandler);
        });

        // Scroll indicator click
        const scrollIndicator = document.querySelector('.scroll-indicator');
        if (scrollIndicator) {
            const scrollIndicatorHandler = function() {
                const aboutSection = document.getElementById('about');
                if (aboutSection) {
                    const navHeight = document.querySelector('.navbar').offsetHeight;
                    const targetPosition = aboutSection.offsetTop - navHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            };
            addEventListener(scrollIndicator, 'click', scrollIndicatorHandler);
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
                    observer.unobserve(entry.target); // 一度表示したら監視を停止
                }
            });
        }, observerOptions);

        // Observerを管理リストに追加
        observers.push(observer);

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
            const submitHandler = function(e) {
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
                console.log('Form data:', data);
                
                // Show success message
                alert('お問い合わせを受け付けました。2-3営業日以内にご連絡いたします。');
                
                // Reset form
                contactForm.reset();
            };
            addEventListener(contactForm, 'submit', submitHandler);
        }
    }

    /**
     * Initialize video handling with robust error handling and cleanup
     */
    function initVideoHandling() {
        const heroVideoContainer = document.querySelector('.hero-video-container');
        const heroVideo = document.querySelector('.hero-video');
        
        if (!heroVideo || !heroVideoContainer) {
            console.log('Video elements not found');
            return;
        }

        // Track video load attempts
        let loadAttempts = 0;
        const maxAttempts = 3;
        let loadingTimeout = null;
        let retryTimeout = null;
        
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
            console.log('Showing fallback image');
            heroVideo.style.display = 'none';
            fallbackImage.style.display = 'block';
            // ビデオのソースを解放
            heroVideo.pause();
            heroVideo.removeAttribute('src');
            heroVideo.load();
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
        const errorHandler = function(e) {
            loadAttempts++;
            console.error(`Video load error (attempt ${loadAttempts}/${maxAttempts}):`, e);
            
            if (loadAttempts >= maxAttempts) {
                showFallback();
            } else {
                // Try to reload the video
                retryTimeout = setManagedTimeout(function() {
                    heroVideo.load();
                }, 1000 * loadAttempts);
            }
        };
        addEventListener(heroVideo, 'error', errorHandler);

        // Handle source element errors
        const videoSource = heroVideo.querySelector('source');
        if (videoSource) {
            const sourceErrorHandler = function(e) {
                console.error('Video source error:', e);
                showFallback();
            };
            addEventListener(videoSource, 'error', sourceErrorHandler);
        }

        // Handle successful video load
        const canPlayHandler = function() {
            console.log('Video can play');
            loadAttempts = 0; // Reset attempts on success
            heroVideo.classList.remove('loading');
            heroVideo.classList.add('loaded');
            
            // Try to play the video
            const playPromise = heroVideo.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(function() {
                        console.log('Video autoplay started');
                    })
                    .catch(function(error) {
                        console.warn('Autoplay was prevented:', error);
                    });
            }
        };
        addEventListener(heroVideo, 'canplay', canPlayHandler);

        // Handle slow loading
        loadingTimeout = setManagedTimeout(function() {
            if (heroVideo.readyState < 3) { // HAVE_FUTURE_DATA
                console.warn('Video loading timeout - showing fallback');
                showFallback();
            }
        }, 30000); // 30 second timeout for Netlify CDN

        // Clear timeout if video loads successfully
        const canPlayThroughHandler = function() {
            if (loadingTimeout) {
                clearTimeout(loadingTimeout);
                const index = timeouts.indexOf(loadingTimeout);
                if (index > -1) timeouts.splice(index, 1);
            }
            console.log('Video loaded completely');
        };
        addEventListener(heroVideo, 'canplaythrough', canPlayThroughHandler);

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
        observers.push(videoObserver);

        // クリーンアップ関数を追加
        cleanupFunctions.push(function() {
            if (loadingTimeout) clearTimeout(loadingTimeout);
            if (retryTimeout) clearTimeout(retryTimeout);
            if (heroVideo) {
                heroVideo.pause();
                heroVideo.removeAttribute('src');
                heroVideo.load();
            }
        });
    }

    /**
     * グローバルクリーンアップ関数
     */
    function cleanup() {
        console.log('Cleaning up resources...');
        
        // すべてのタイムアウトをクリア
        timeouts.forEach(timeout => clearTimeout(timeout));
        timeouts = [];
        
        // すべてのObserverを切断
        observers.forEach(observer => observer.disconnect());
        observers = [];
        
        // すべてのイベントリスナーを削除
        eventListeners.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        eventListeners = [];
        
        // カスタムクリーンアップ関数を実行
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions = [];
    }

    // パブリックAPIとして公開（必要に応じて）
    window.INTERCONNECT = {
        cleanup: cleanup
    };

})();