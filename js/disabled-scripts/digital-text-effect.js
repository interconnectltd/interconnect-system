/**
 * デジタルテキストエフェクト専用スクリプト
 * 完全に動作する順次文字表示アニメーション
 */

document.addEventListener('DOMContentLoaded', function() {
    // console.log('Digital Text Effect: スクリプト開始');
    
    // ローディング完了チェック関数
    function checkLoadingComplete() {
        const loadingScreen = document.querySelector('.loading-screen');
        
        if (!loadingScreen || 
            loadingScreen.style.display === 'none' || 
            !document.contains(loadingScreen) || 
            loadingScreen.classList.contains('fade-out')) {
            
            // console.log('Digital Text Effect: ローディング完了、アニメーション開始');
            setTimeout(startHeroAnimation, 500);
        } else {
            // console.log('Digital Text Effect: ローディング中、100ms後に再チェック');
            setTimeout(checkLoadingComplete, 100);
        }
    }

    // メインアニメーション開始関数
    function startHeroAnimation() {
        const heroTitle = document.querySelector('.hero-title');
        const heroSubtitle = document.querySelector('.hero-subtitle');
        
        // console.log('Digital Text Effect: 要素取得', {
            title: !!heroTitle,
            subtitle: !!heroSubtitle
        });
        
        if (!heroTitle || !heroSubtitle) {
            console.error('Digital Text Effect: 必要な要素が見つかりません');
            return;
        }
        
        // タイトルアニメーション開始
        animateDigitalText(heroTitle, () => {
            // console.log('Digital Text Effect: タイトル完了、サブタイトル開始');
            // タイトル完了後、サブタイトル開始
            setTimeout(() => {
                animateDigitalText(heroSubtitle);
            }, 300);
        });
    }

    // デジタルテキストアニメーション関数
    function animateDigitalText(element, callback) {
        if (!element) {
            console.error('Digital Text Effect: 要素がnullです');
            if (callback) callback();
            return;
        }
        
        // console.log('Digital Text Effect: アニメーション開始', element.className);
        
        // 要素を表示
        element.style.visibility = 'visible';
        element.style.opacity = '1';
        
        // 元のテキストを保存
        const originalHTML = element.innerHTML;
        const textContent = element.textContent || element.innerText || '';
        
        // console.log('Digital Text Effect: 元テキスト', textContent);
        
        // ランダム文字のセット
        const randomChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZあいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
        
        let currentIndex = 0;
        let displayText = '';
        
        // 要素をクリア
        element.innerHTML = '';
        
        function revealNextCharacter() {
            if (currentIndex >= textContent.length) {
                // 全文字表示完了
                element.innerHTML = originalHTML;
                // console.log('Digital Text Effect: アニメーション完了');
                
                // 完了エフェクト
                element.style.textShadow = '0 0 15px #00ff00, 0 0 25px #00ff00';
                setTimeout(() => {
                    element.style.textShadow = '';
                }, 300);
                
                if (callback) {
                    setTimeout(callback, 200);
                }
                return;
            }
            
            const targetChar = textContent[currentIndex];
            let scrambleCount = 0;
            const maxScrambles = Math.floor(Math.random() * 6) + 4; // 4-9回のスクランブル
            
            function scrambleChar() {
                if (scrambleCount < maxScrambles) {
                    // ランダム文字表示
                    const randomChar = randomChars[Math.floor(Math.random() * randomChars.length)];
                    const tempText = displayText + randomChar;
                    
                    // HTMLを考慮してテキストを更新
                    element.innerHTML = originalHTML.replace(textContent, tempText);
                    
                    scrambleCount++;
                    setTimeout(scrambleChar, 60 + Math.random() * 40); // 60-100ms
                } else {
                    // 正しい文字を確定
                    displayText += targetChar;
                    currentIndex++;
                    
                    // 確定エフェクト
                    element.style.textShadow = '0 0 10px #00ffff, 0 0 20px #00ffff';
                    setTimeout(() => {
                        element.style.textShadow = '';
                    }, 150);
                    
                    // console.log('Digital Text Effect: 文字確定', targetChar, `(${currentIndex}/${textContent.length})`);
                    
                    // 次の文字へ
                    setTimeout(revealNextCharacter, 100 + Math.random() * 50); // 100-150ms
                }
            }
            
            scrambleChar();
        }
        
        // アニメーション開始
        setTimeout(revealNextCharacter, 300);
    }
    
    // 初期化開始
    // console.log('Digital Text Effect: 初期化開始');
    checkLoadingComplete();
});