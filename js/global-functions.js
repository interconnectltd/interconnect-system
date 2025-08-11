/**
 * Global Functions Manager
 * グローバル関数の重複を防ぐための統一管理
 */

(function() {
    'use strict';
    
    // グローバル名前空間の保護
    window.INTERCONNECT = window.INTERCONNECT || {};
    
    /**
     * ログアウト処理（統一版）
     */
    window.logout = async function() {
        // console.log('Logout initiated');
        
        try {
            // Supabaseからログアウト
            if (window.supabaseClient) {
                const { error } = await window.supabaseClient.auth.signOut();
                if (error) {
                    console.error('Logout error:', error);
                    throw error;
                }
            }
            
            // セッションクリア
            sessionStorage.clear();
            localStorage.removeItem('supabase.auth.token');
            
            // クッキーをクリア
            document.cookie.split(";").forEach(function(c) { 
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            });
            
            // ログインページへリダイレクト
            window.location.href = '/login.html';
            
        } catch (error) {
            console.error('Logout failed:', error);
            // エラーが発生してもログインページへ
            window.location.href = '/login.html';
        }
    };
    
    /**
     * 登録フローのステップ管理（統一版）
     */
    let currentStep = 1;
    const totalSteps = 4; // 必要に応じて調整
    
    window.nextStep = function() {
        const currentStepElement = document.getElementById(`step${currentStep}`);
        const nextStepElement = document.getElementById(`step${currentStep + 1}`);
        
        if (currentStepElement && nextStepElement && currentStep < totalSteps) {
            // 現在のステップを非表示
            currentStepElement.style.display = 'none';
            currentStepElement.classList.remove('active');
            
            // 次のステップを表示
            nextStepElement.style.display = 'block';
            nextStepElement.classList.add('active');
            
            currentStep++;
            updateProgressBar();
            
            // ステップ変更イベントを発火
            window.dispatchEvent(new CustomEvent('stepChanged', { 
                detail: { currentStep, totalSteps } 
            }));
        }
    };
    
    window.prevStep = function() {
        const currentStepElement = document.getElementById(`step${currentStep}`);
        const prevStepElement = document.getElementById(`step${currentStep - 1}`);
        
        if (currentStepElement && prevStepElement && currentStep > 1) {
            // 現在のステップを非表示
            currentStepElement.style.display = 'none';
            currentStepElement.classList.remove('active');
            
            // 前のステップを表示
            prevStepElement.style.display = 'block';
            prevStepElement.classList.add('active');
            
            currentStep--;
            updateProgressBar();
            
            // ステップ変更イベントを発火
            window.dispatchEvent(new CustomEvent('stepChanged', { 
                detail: { currentStep, totalSteps } 
            }));
        }
    };
    
    /**
     * プログレスバーの更新
     */
    function updateProgressBar() {
        const progressBar = document.querySelector('.progress-bar');
        const progressSteps = document.querySelectorAll('.progress-step');
        
        if (progressBar) {
            const progress = (currentStep / totalSteps) * 100;
            progressBar.style.width = `${progress}%`;
        }
        
        if (progressSteps.length > 0) {
            progressSteps.forEach((step, index) => {
                if (index < currentStep) {
                    step.classList.add('completed');
                } else {
                    step.classList.remove('completed');
                }
                
                if (index === currentStep - 1) {
                    step.classList.add('active');
                } else {
                    step.classList.remove('active');
                }
            });
        }
    }
    
    /**
     * 現在のステップを取得
     */
    window.getCurrentStep = function() {
        return currentStep;
    };
    
    /**
     * ステップをリセット
     */
    window.resetSteps = function() {
        currentStep = 1;
        updateProgressBar();
    };
    
    /**
     * 初期化完了を通知
     */
    // console.log('Global functions initialized');
    
    // 他のスクリプトが重複定義しないように警告
    Object.defineProperty(window, 'logout', {
        writable: false,
        configurable: false
    });
    
    // nextStep関数は後から上書き可能にする
    Object.defineProperty(window, 'nextStep', {
        writable: true,
        configurable: true
    });
    
    Object.defineProperty(window, 'prevStep', {
        writable: false,
        configurable: false
    });
    
})();