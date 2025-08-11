/**
 * Register NextStep Final Fix
 * nextStep関数の最終修正（読み取り専用エラーの完全解決）
 */

(function() {
    'use strict';
    
    // console.log('[RegisterNextStepFinalFix] 初期化開始');
    
    // 既存のnextStep関数を保存
    const originalNextStep = window.nextStep;
    
    // 新しいnextStep関数
    function newNextStep() {
        // console.log('[RegisterNextStepFinalFix] nextStep() が呼び出されました');
        
        const currentStepElement = document.querySelector('.form-step.active');
        if (!currentStepElement) {
            console.error('[RegisterNextStepFinalFix] 現在のステップが見つかりません');
            return;
        }
        
        const currentStep = parseInt(currentStepElement.dataset.step);
        // console.log('[RegisterNextStepFinalFix] 現在のステップ:', currentStep);
        
        // バリデーション
        if (!validateCurrentStep(currentStep)) {
            // console.log('[RegisterNextStepFinalFix] バリデーションエラー');
            return;
        }
        
        // 次のステップへ
        const nextStep = currentStep + 1;
        const nextStepElement = document.querySelector(`.form-step[data-step="${nextStep}"]`);
        
        if (nextStepElement) {
            // console.log('[RegisterNextStepFinalFix] 次のステップへ移動:', nextStep);
            
            // 現在のステップを非表示
            currentStepElement.classList.remove('active');
            currentStepElement.style.display = 'none';
            
            // 次のステップを表示
            nextStepElement.classList.add('active');
            nextStepElement.style.display = 'block';
            
            // プログレスバーを更新
            updateProgressBar(nextStep);
            
            // スクロール位置を調整
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // console.log('[RegisterNextStepFinalFix] これが最後のステップです');
            // 最後のステップの場合は送信処理
            submitRegistration();
        }
    }
    
    // バリデーション関数
    function validateCurrentStep(step) {
        // console.log('[RegisterNextStepFinalFix] ステップ', step, 'のバリデーション開始');
        
        // window.validateStep が存在する場合はそちらを使用（register-enhanced-validation.js）
        if (window.validateStep && typeof window.validateStep === 'function') {
            return window.validateStep(step);
        }
        
        const stepElement = document.querySelector(`.form-step[data-step="${step}"]`);
        if (!stepElement) return true;
        
        // 必須フィールドのチェック
        const requiredFields = stepElement.querySelectorAll('[required]');
        for (let field of requiredFields) {
            if (!field.value || field.value.trim() === '') {
                // console.log('[RegisterNextStepFinalFix] 必須フィールドが空です:', field.name);
                field.classList.add('error');
                field.focus();
                showError('必須項目を入力してください');
                return false;
            }
            field.classList.remove('error');
        }
        
        // 特定のステップごとのバリデーション
        switch(step) {
            case 1:
                // メールアドレスのバリデーション
                const email = stepElement.querySelector('input[name="email"]');
                if (email && !isValidEmail(email.value)) {
                    // console.log('[RegisterNextStepFinalFix] 無効なメールアドレス');
                    email.classList.add('error');
                    email.focus();
                    showError('有効なメールアドレスを入力してください');
                    return false;
                }
                
                // パスワードのバリデーション
                const password = stepElement.querySelector('input[name="password"]');
                const confirmPassword = stepElement.querySelector('input[name="password-confirm"]');
                if (password && confirmPassword) {
                    if (password.value.length < 8) {
                        // console.log('[RegisterNextStepFinalFix] パスワードが短すぎます');
                        password.classList.add('error');
                        password.focus();
                        showError('パスワードは8文字以上で入力してください');
                        return false;
                    }
                    if (password.value !== confirmPassword.value) {
                        // console.log('[RegisterNextStepFinalFix] パスワードが一致しません');
                        confirmPassword.classList.add('error');
                        confirmPassword.focus();
                        showError('パスワードが一致しません');
                        return false;
                    }
                }
                break;
                
            case 5:
                // 利用規約の同意チェック
                const agreeCheckbox = stepElement.querySelector('input[name="agree"]');
                if (agreeCheckbox && !agreeCheckbox.checked) {
                    // console.log('[RegisterNextStepFinalFix] 利用規約に同意していません');
                    showError('利用規約に同意してください');
                    return false;
                }
                break;
        }
        
        // console.log('[RegisterNextStepFinalFix] バリデーション成功');
        return true;
    }
    
    // メールアドレスの検証
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // エラーメッセージ表示
    function showError(message) {
        // 既存のエラーメッセージを削除
        const existingError = document.querySelector('.validation-error');
        if (existingError) {
            existingError.remove();
        }
        
        // 新しいエラーメッセージを作成
        const errorDiv = document.createElement('div');
        errorDiv.className = 'validation-error';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            color: #e74c3c;
            background: #fee;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
            text-align: center;
            animation: shake 0.3s;
        `;
        
        const activeStep = document.querySelector('.form-step.active');
        if (activeStep) {
            activeStep.insertBefore(errorDiv, activeStep.firstChild);
        }
        
        // 3秒後に自動削除
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }
    
    // プログレスバー更新
    function updateProgressBar(step) {
        const progressSteps = document.querySelectorAll('.progress-step');
        progressSteps.forEach((el, index) => {
            if (index < step) {
                el.classList.add('completed');
            } else if (index === step - 1) {
                el.classList.add('active');
                el.classList.remove('completed');
            } else {
                el.classList.remove('completed', 'active');
            }
        });
        
        const progressBar = document.querySelector('.progress-bar-fill');
        if (progressBar) {
            const totalSteps = document.querySelectorAll('.form-step').length;
            const progress = (step / totalSteps) * 100;
            progressBar.style.width = `${progress}%`;
        }
    }
    
    // 登録送信処理
    function submitRegistration() {
        // console.log('[RegisterNextStepFinalFix] 登録処理を開始');
        const form = document.getElementById('registrationForm');
        if (form) {
            // フォームを送信
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
    }
    
    // nextStep関数を置き換え
    try {
        // Object.definePropertyで設定されている場合の対処
        if (Object.getOwnPropertyDescriptor(window, 'nextStep')) {
            Object.defineProperty(window, 'nextStep', {
                value: newNextStep,
                writable: true,
                configurable: true
            });
        } else {
            window.nextStep = newNextStep;
        }
        // console.log('[RegisterNextStepFinalFix] nextStep関数を正常に置き換えました');
    } catch (e) {
        console.error('[RegisterNextStepFinalFix] nextStep関数の置き換えに失敗:', e);
        // フォールバック: イベントリスナーで対応
        document.addEventListener('DOMContentLoaded', function() {
            const nextButtons = document.querySelectorAll('button[onclick="nextStep()"]');
            nextButtons.forEach(button => {
                button.removeAttribute('onclick');
                button.addEventListener('click', newNextStep);
            });
            // console.log('[RegisterNextStepFinalFix] イベントリスナーでnextStepを設定しました');
        });
    }
    
    // prevStep関数も同様に修正
    function newPrevStep() {
        // console.log('[RegisterNextStepFinalFix] prevStep() が呼び出されました');
        
        const currentStepElement = document.querySelector('.form-step.active');
        if (!currentStepElement) return;
        
        const currentStep = parseInt(currentStepElement.dataset.step);
        const prevStep = currentStep - 1;
        const prevStepElement = document.querySelector(`.form-step[data-step="${prevStep}"]`);
        
        if (prevStepElement) {
            currentStepElement.classList.remove('active');
            currentStepElement.style.display = 'none';
            
            prevStepElement.classList.add('active');
            prevStepElement.style.display = 'block';
            
            updateProgressBar(prevStep);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    
    // prevStep関数も置き換え
    try {
        // 既存のprevStepを削除してから再定義
        if (window.prevStep) {
            delete window.prevStep;
        }
        window.prevStep = newPrevStep;
    } catch (e) {
        console.error('[RegisterNextStepFinalFix] prevStep関数の置き換えに失敗:', e);
        // フォールバック: 直接上書き
        try {
            window.prevStep = newPrevStep;
        } catch (e2) {
            console.error('[RegisterNextStepFinalFix] prevStep関数の上書きも失敗:', e2);
        }
    }
    
    // CSS追加
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }
        
        .error {
            border-color: #e74c3c !important;
            background-color: #fee !important;
        }
        
        .validation-error {
            animation: shake 0.3s;
        }
    `;
    document.head.appendChild(style);
    
    // console.log('[RegisterNextStepFinalFix] 初期化完了');
    
})();