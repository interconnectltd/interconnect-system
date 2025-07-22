/**
 * LINE Button Test Script
 * 新規登録ページのLINEボタンの問題を診断
 */

console.log('🔍 LINE Button Test Script Starting...');

// すべての読み込みが完了してから実行
window.addEventListener('load', function() {
    console.log('\n📋 === COMPREHENSIVE LINE BUTTON TEST ===');
    console.log('Time:', new Date().toISOString());
    console.log('Page:', window.location.pathname);
    
    // 1. ボタンの存在確認
    console.log('\n1️⃣ Button Existence Check:');
    const lineRegisterBtn = document.getElementById('lineRegisterBtn');
    const lineLoginBtn = document.getElementById('lineLoginBtn');
    
    if (lineRegisterBtn) {
        console.log('✅ lineRegisterBtn found');
        console.log('   - Tag:', lineRegisterBtn.tagName);
        console.log('   - Type:', lineRegisterBtn.type);
        console.log('   - ID:', lineRegisterBtn.id);
        console.log('   - Classes:', lineRegisterBtn.className);
        console.log('   - Text:', lineRegisterBtn.textContent.trim());
        console.log('   - Disabled:', lineRegisterBtn.disabled);
        console.log('   - Hidden:', lineRegisterBtn.hidden);
        console.log('   - Display:', window.getComputedStyle(lineRegisterBtn).display);
        console.log('   - Visibility:', window.getComputedStyle(lineRegisterBtn).visibility);
        console.log('   - Pointer Events:', window.getComputedStyle(lineRegisterBtn).pointerEvents);
        console.log('   - Z-Index:', window.getComputedStyle(lineRegisterBtn).zIndex);
        console.log('   - Position:', window.getComputedStyle(lineRegisterBtn).position);
        console.log('   - Opacity:', window.getComputedStyle(lineRegisterBtn).opacity);
    } else {
        console.log('❌ lineRegisterBtn NOT found');
    }
    
    if (lineLoginBtn) {
        console.log('✅ lineLoginBtn found');
    } else {
        console.log('❌ lineLoginBtn NOT found');
    }
    
    // 2. イベントリスナーの確認
    console.log('\n2️⃣ Event Listeners Check:');
    if (lineRegisterBtn) {
        // Chrome DevToolsで確認可能
        console.log('   - Use Chrome DevTools > Elements > Event Listeners to check');
        
        // テストクリックイベントを追加
        const testHandler = function(e) {
            console.log('🖱️ TEST CLICK HANDLER TRIGGERED!');
            console.log('   Event:', e);
            console.log('   Target:', e.target);
            console.log('   Current Target:', e.currentTarget);
        };
        
        lineRegisterBtn.addEventListener('click', testHandler);
        console.log('   - Test click handler added');
    }
    
    // 3. Supabase準備状態の確認
    console.log('\n3️⃣ Supabase Status:');
    console.log('   - window.supabase:', typeof window.supabase);
    console.log('   - Supabase object:', window.supabase ? 'Available' : 'Not available');
    
    // 4. グローバル関数の確認
    console.log('\n4️⃣ Global Functions:');
    console.log('   - initializeAuth:', typeof initializeAuth);
    console.log('   - handleLineLogin:', typeof handleLineLogin);
    console.log('   - window.handleLineLogin:', typeof window.handleLineLogin);
    
    // 5. LINE Channel IDの確認
    console.log('\n5️⃣ LINE Configuration:');
    console.log('   - LINE_CHANNEL_ID:', typeof LINE_CHANNEL_ID !== 'undefined' ? LINE_CHANNEL_ID : 'UNDEFINED');
    
    // 6. 親要素の確認
    console.log('\n6️⃣ Parent Elements Check:');
    if (lineRegisterBtn) {
        let parent = lineRegisterBtn.parentElement;
        let level = 1;
        while (parent && level <= 5) {
            console.log(`   Level ${level}: ${parent.tagName}.${parent.className}`);
            const styles = window.getComputedStyle(parent);
            if (styles.pointerEvents === 'none' || styles.display === 'none' || styles.visibility === 'hidden') {
                console.log(`   ⚠️ Parent at level ${level} has blocking styles:`);
                console.log(`      - pointer-events: ${styles.pointerEvents}`);
                console.log(`      - display: ${styles.display}`);
                console.log(`      - visibility: ${styles.visibility}`);
            }
            parent = parent.parentElement;
            level++;
        }
    }
    
    // 7. 重なっている要素の確認
    console.log('\n7️⃣ Overlapping Elements Check:');
    if (lineRegisterBtn) {
        const rect = lineRegisterBtn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const elementAtPoint = document.elementFromPoint(centerX, centerY);
        
        console.log('   - Button rect:', rect);
        console.log('   - Center point:', { x: centerX, y: centerY });
        console.log('   - Element at center:', elementAtPoint);
        
        if (elementAtPoint !== lineRegisterBtn) {
            console.log('   ⚠️ Another element is on top of the button!');
            console.log('   - Overlapping element:', elementAtPoint.tagName + '.' + elementAtPoint.className);
        } else {
            console.log('   ✅ Button is clickable (no overlapping elements)');
        }
    }
    
    // 8. 手動でイベントをトリガー
    console.log('\n8️⃣ Manual Event Trigger Test:');
    if (lineRegisterBtn && typeof window.handleLineLogin === 'function') {
        console.log('   - Manually calling handleLineLogin in 2 seconds...');
        setTimeout(() => {
            console.log('   📍 Calling handleLineLogin manually...');
            try {
                window.handleLineLogin();
                console.log('   ✅ handleLineLogin called successfully');
            } catch (error) {
                console.log('   ❌ Error calling handleLineLogin:', error);
            }
        }, 2000);
    } else {
        console.log('   ❌ Cannot test - button or function not available');
    }
    
    // 9. DOMContentLoadedとsupabaseReadyの順序確認
    console.log('\n9️⃣ Event Order Check:');
    let domReady = false;
    let supabaseReady = false;
    
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        domReady = true;
        console.log('   - DOM already loaded');
    }
    
    document.addEventListener('DOMContentLoaded', () => {
        domReady = true;
        console.log('   📍 DOMContentLoaded fired');
        checkBothReady();
    });
    
    window.addEventListener('supabaseReady', () => {
        supabaseReady = true;
        console.log('   📍 supabaseReady fired');
        checkBothReady();
    });
    
    function checkBothReady() {
        if (domReady && supabaseReady) {
            console.log('   ✅ Both DOM and Supabase are ready');
            
            // initializeAuthが呼ばれているか確認
            setTimeout(() => {
                const btn = document.getElementById('lineRegisterBtn');
                if (btn) {
                    // クリックをシミュレート
                    console.log('   📍 Simulating button click...');
                    const clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    btn.dispatchEvent(clickEvent);
                }
            }, 1000);
        }
    }
    
    console.log('\n✅ Test script completed. Check console for results.');
});

// すぐに実行される部分
console.log('📍 Immediate check:');
console.log('   - Document state:', document.readyState);
console.log('   - Scripts loaded:', document.scripts.length);