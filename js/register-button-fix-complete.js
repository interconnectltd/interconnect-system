/**
 * Register Button Fix Complete
 * 新規登録ページのnextStepボタンの完全修正とデバッグログ
 */

(function() {
    'use strict';
    
    // console.log('[RegisterButtonFix] 修正スクリプト開始');
    
    // グローバルnextStep関数を上書き（デバッグログ付き）
    window.nextStep = function() {
        // console.log('[RegisterButtonFix] nextStep() が呼び出されました');
        
        const currentStepElement = document.querySelector('.form-step.active');
        if (!currentStepElement) {
            console.error('[RegisterButtonFix] アクティブなステップが見つかりません');
            return;
        }
        
        const currentStepNum = parseInt(currentStepElement.getAttribute('data-step'));
        // console.log('[RegisterButtonFix] 現在のステップ:', currentStepNum);
        
        // 現在のステップのバリデーション
        if (!validateCurrentStep(currentStepNum)) {
            // console.log('[RegisterButtonFix] バリデーションエラー');
            return;
        }
        
        // console.log('[RegisterButtonFix] バリデーション成功、次のステップへ移動');
        moveToStep(currentStepNum + 1);
    };
    
    // prevStep関数も定義
    try {
        if (window.prevStep) {
            delete window.prevStep;
        }
    } catch (e) {
        // console.log('[RegisterButtonFix] 既存のprevStep削除時のエラー（無視）:', e);
    }
    window.prevStep = function() {
        // console.log('[RegisterButtonFix] prevStep() が呼び出されました');
        
        const currentStepElement = document.querySelector('.form-step.active');
        if (!currentStepElement) {
            console.error('[RegisterButtonFix] アクティブなステップが見つかりません');
            return;
        }
        
        const currentStepNum = parseInt(currentStepElement.getAttribute('data-step'));
        // console.log('[RegisterButtonFix] 現在のステップ:', currentStepNum);
        
        if (currentStepNum > 1) {
            moveToStep(currentStepNum - 1);
        }
    };
    
    // ステップ移動関数
    function moveToStep(step) {
        // console.log('[RegisterButtonFix] ステップ', step, 'へ移動');
        
        if (step < 1 || step > 5) {
            console.error('[RegisterButtonFix] 無効なステップ番号:', step);
            return;
        }
        
        // すべてのステップを非表示
        document.querySelectorAll('.form-step').forEach(el => {
            el.classList.remove('active');
        });
        
        // すべてのプログレスステップを非アクティブに
        document.querySelectorAll('.progress-step').forEach(el => {
            el.classList.remove('active', 'completed');
        });
        
        // 新しいステップを表示
        const nextStep = document.querySelector(`.form-step[data-step="${step}"]`);
        const nextProgress = document.querySelector(`.progress-step[data-step="${step}"]`);
        
        if (nextStep) {
            nextStep.classList.add('active');
            // console.log('[RegisterButtonFix] ステップ', step, 'をアクティブに設定');
        } else {
            console.error('[RegisterButtonFix] ステップ', step, 'の要素が見つかりません');
        }
        
        if (nextProgress) {
            nextProgress.classList.add('active');
            
            // 前のステップも完了状態に
            for (let i = 1; i < step; i++) {
                const prevProgress = document.querySelector(`.progress-step[data-step="${i}"]`);
                if (prevProgress) {
                    prevProgress.classList.add('completed');
                }
            }
        }
        
        // スクロールトップ
        window.scrollTo(0, 0);
    }
    
    // バリデーション関数
    function validateCurrentStep(step) {
        // console.log('[RegisterButtonFix] ステップ', step, 'のバリデーション開始');
        
        switch(step) {
            case 1:
                // 基本情報のバリデーション
                const name = document.getElementById('name');
                const company = document.getElementById('company');
                const email = document.getElementById('email');
                const password = document.getElementById('password');
                const passwordConfirm = document.getElementById('password-confirm');
                
                // console.log('[RegisterButtonFix] 入力値チェック:', {
                    name: name?.value,
                    company: company?.value,
                    email: email?.value,
                    passwordLength: password?.value?.length,
                    passwordConfirmLength: passwordConfirm?.value?.length
                });
                
                if (!name?.value || !company?.value || !email?.value || !password?.value || !passwordConfirm?.value) {
                    alert('すべての項目を入力してください');
                    return false;
                }
                
                if (password.value !== passwordConfirm.value) {
                    alert('パスワードが一致しません');
                    return false;
                }
                
                if (password.value.length < 8) {
                    alert('パスワードは8文字以上で入力してください');
                    return false;
                }
                
                // console.log('[RegisterButtonFix] ステップ1のバリデーション成功');
                return true;
                
            case 2:
                // 事業課題のバリデーション
                const checkedChallenges = document.querySelectorAll('input[name="challenges"]:checked');
                // console.log('[RegisterButtonFix] 選択された課題数:', checkedChallenges.length);
                
                if (checkedChallenges.length === 0) {
                    alert('少なくとも1つの事業課題を選択してください');
                    return false;
                }
                
                // 詳細テキストエリアのチェック
                const detailFields = ['revenue-details', 'hr-details', 'dx-details', 'strategy-details'];
                for (const fieldId of detailFields) {
                    const field = document.getElementById(fieldId);
                    if (field && field.hasAttribute('required')) {
                        if (!field.value || field.value.length < 50) {
                            alert(`${field.previousElementSibling.textContent}を50文字以上で入力してください`);
                            return false;
                        }
                    }
                }
                
                // console.log('[RegisterButtonFix] ステップ2のバリデーション成功');
                return true;
                
            case 3:
            case 4:
            case 5:
                // 他のステップのバリデーション
                // console.log('[RegisterButtonFix] ステップ', step, 'のバリデーション成功（追加実装予定）');
                return true;
                
            default:
                return true;
        }
    }
    
    // DOMContentLoaded時の処理
    document.addEventListener('DOMContentLoaded', function() {
        // console.log('[RegisterButtonFix] DOM読み込み完了');
        
        // すべての「次へ」ボタンにイベントリスナーを追加
        const nextButtons = document.querySelectorAll('button[onclick="nextStep()"]');
        // console.log('[RegisterButtonFix] 次へボタンの数:', nextButtons.length);
        
        nextButtons.forEach((button, index) => {
            // console.log('[RegisterButtonFix] ボタン', index + 1, 'にイベントリスナーを追加');
            
            // 既存のonclick属性を削除
            button.removeAttribute('onclick');
            
            // 新しいイベントリスナーを追加
            button.addEventListener('click', function(e) {
                e.preventDefault();
                // console.log('[RegisterButtonFix] 次へボタンがクリックされました（ボタン', index + 1, '）');
                window.nextStep();
            });
        });
        
        // 戻るボタンも同様に処理
        const prevButtons = document.querySelectorAll('button[onclick="prevStep()"]');
        // console.log('[RegisterButtonFix] 戻るボタンの数:', prevButtons.length);
        
        prevButtons.forEach((button, index) => {
            button.removeAttribute('onclick');
            button.addEventListener('click', function(e) {
                e.preventDefault();
                // console.log('[RegisterButtonFix] 戻るボタンがクリックされました（ボタン', index + 1, '）');
                window.prevStep();
            });
        });
        
        // パスワード表示/非表示トグル
        const passwordToggles = document.querySelectorAll('.password-toggle');
        // console.log('[RegisterButtonFix] パスワードトグルボタンの数:', passwordToggles.length);
        
        passwordToggles.forEach((toggle, index) => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                // console.log('[RegisterButtonFix] パスワードトグルがクリックされました（トグル', index + 1, '）');
                
                const input = this.previousElementSibling;
                const icon = this.querySelector('i');
                
                if (input && input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                    // console.log('[RegisterButtonFix] パスワードを表示');
                } else if (input) {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                    // console.log('[RegisterButtonFix] パスワードを非表示');
                }
            });
        });
        
        // 文字数カウント機能は無効化（register-char-count.jsが処理）
        /*
        const textareas = document.querySelectorAll('textarea[minlength]');
        // console.log('[RegisterButtonFix] 文字数カウント対象のテキストエリア数:', textareas.length);
        
        textareas.forEach((textarea, index) => {
            const countElement = document.getElementById(textarea.id.replace('-details', '-count'));
            if (countElement) {
                textarea.addEventListener('input', function() {
                    countElement.textContent = this.value.length;
                    // console.log('[RegisterButtonFix] テキストエリア', index + 1, '文字数:', this.value.length);
                });
            }
        });
        */
        
        // 初期ステップの確認
        const activeStep = document.querySelector('.form-step.active');
        if (activeStep) {
            const stepNum = activeStep.getAttribute('data-step');
            // console.log('[RegisterButtonFix] 初期アクティブステップ:', stepNum);
        } else {
            console.warn('[RegisterButtonFix] 初期アクティブステップが見つかりません');
        }
    });
    
    // console.log('[RegisterButtonFix] 修正スクリプト読み込み完了');
    
})();