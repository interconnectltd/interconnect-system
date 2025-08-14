/**
 * Typewriter Effect
 * ローディング完了後にタイプライター効果を開始（3倍速）
 */

document.addEventListener('DOMContentLoaded', function() {
    // console.log('[Typewriter] 初期化開始');
    
    // ローディング画面の監視
    const loadingScreen = document.getElementById('instantLoadingScreen');
    
    if (loadingScreen) {
        // ローディング画面の透明度を監視
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style') {
                    // opacity が 0 になったらローディング完了
                    if (loadingScreen.style.opacity === '0' || 
                        loadingScreen.style.display === 'none') {
                        // console.log('[Typewriter] ローディング完了を検知');
                        observer.disconnect();
                        // 少し遅延を入れてから開始
                        setTimeout(startTypewriter, 500);
                    }
                }
            });
        });
        
        observer.observe(loadingScreen, { 
            attributes: true,
            attributeFilter: ['style']
        });
    } else {
        // ローディング画面がない場合は即座に開始
        // console.log('[Typewriter] ローディング画面なし、即座に開始');
        setTimeout(startTypewriter, 1000);
    }
    
    function startTypewriter() {
        // console.log('[Typewriter] タイプライター開始');
        
        // タイプライター効果を適用する要素
        const elements = [
            { selector: '.section-badge', delay: 0 },
            { selector: '.hero-title', delay: 300 },
            { selector: '.hero-subtitle', delay: 1200 }
        ];
        
        elements.forEach(item => {
            const element = document.querySelector(item.selector);
            if (element) {
                // 元のテキストを保存
                const originalText = element.textContent;
                const originalHTML = element.innerHTML;
                
                // 子要素（アイコンなど）を保持
                const hasIcon = originalHTML.includes('<i');
                let iconHTML = '';
                if (hasIcon) {
                    const iconMatch = originalHTML.match(/<i[^>]*>.*?<\/i>/);
                    if (iconMatch) {
                        iconHTML = iconMatch[0] + ' ';
                    }
                }
                
                // テキストをクリア
                element.textContent = '';
                element.style.visibility = 'visible';
                element.style.opacity = '1';
                
                // タイプライター効果
                setTimeout(() => {
                    typeWriter(element, originalText.trim(), iconHTML);
                }, item.delay);
            }
        });
    }
    
    function typeWriter(element, text, iconHTML = '') {
        let index = 0;
        const speed = 30; // 3倍速（通常90ms → 30ms）
        
        // アイコンがある場合は最初に表示
        if (iconHTML) {
            element.innerHTML = iconHTML;
        }
        
        function type() {
            if (index < text.length) {
                if (iconHTML) {
                    // アイコンの後にテキストを追加
                    const currentText = element.textContent.replace(/\s+/g, ' ').trim();
                    const iconText = currentText.split(' ')[0] || '';
                    const newText = iconHTML + text.substring(0, index + 1);
                    element.innerHTML = newText;
                } else {
                    element.textContent = text.substring(0, index + 1);
                }
                index++;
                setTimeout(type, speed);
            } else {
                // タイプライター完了後にボタンを表示
                if (element.classList.contains('hero-subtitle')) {
                    setTimeout(() => {
                        const buttons = document.querySelector('.hero-buttons');
                        if (buttons) {
                            buttons.style.opacity = '1';
                            buttons.style.visibility = 'visible';
                            buttons.style.transform = 'translateY(0)';
                        }
                    }, 200);
                }
            }
        }
        
        type();
    }
    
});