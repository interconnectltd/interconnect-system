/**
 * Register Functions Fix
 * 新規登録ページの機能修正
 */

(function() {
    'use strict';
    
    // console.log('[RegisterFix] 初期化開始');
    
    // nextStep関数をグローバルに定義（既存の関数が無い場合）
    if (!window.nextStep) {
        window.nextStep = function() {
            const currentStepElement = document.querySelector('.form-step.active');
            if (!currentStepElement) return;
            
            const currentStepNum = parseInt(currentStepElement.getAttribute('data-step'));
            
            // 現在のステップのバリデーション
            if (validateCurrentStep(currentStepNum)) {
                moveToStep(currentStepNum + 1);
            }
        };
    }
    
    // prevStep関数をグローバルに定義（既存の関数が無い場合）
    if (!window.prevStep) {
        window.prevStep = function() {
            const currentStepElement = document.querySelector('.form-step.active');
            if (!currentStepElement) return;
            
            const currentStepNum = parseInt(currentStepElement.getAttribute('data-step'));
            moveToStep(currentStepNum - 1);
        };
    }
    
    // moveToStep関数
    function moveToStep(step) {
        if (step < 1 || step > 5) return;
        
        // すべてのステップを非表示
        document.querySelectorAll('.form-step').forEach(el => {
            el.classList.remove('active');
        });
        
        // すべてのプログレスステップを非アクティブに
        document.querySelectorAll('.progress-step').forEach(el => {
            el.classList.remove('active');
        });
        
        // 新しいステップを表示
        const nextStep = document.querySelector(`.form-step[data-step="${step}"]`);
        const nextProgress = document.querySelector(`.progress-step[data-step="${step}"]`);
        
        if (nextStep) {
            nextStep.classList.add('active');
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
        switch(step) {
            case 1:
                // 基本情報のバリデーション
                const name = document.getElementById('name');
                const company = document.getElementById('company');
                const email = document.getElementById('email');
                const password = document.getElementById('password');
                const passwordConfirm = document.getElementById('password-confirm');
                
                if (!name.value || !company.value || !email.value || !password.value || !passwordConfirm.value) {
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
                
                return true;
                
            case 2:
                // 事業課題のバリデーション
                const checkedChallenges = document.querySelectorAll('input[name="challenges"]:checked');
                if (checkedChallenges.length === 0) {
                    alert('少なくとも1つの事業課題を選択してください');
                    return false;
                }
                return true;
                
            case 3:
            case 4:
            case 5:
                // 他のステップのバリデーション
                return true;
                
            default:
                return true;
        }
    }
    
    // パスワード表示/非表示トグル
    document.addEventListener('DOMContentLoaded', function() {
        const passwordToggles = document.querySelectorAll('.password-toggle');
        
        passwordToggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                const input = this.previousElementSibling;
                const icon = this.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
        
        // 文字数カウント機能
        const textareas = document.querySelectorAll('textarea[minlength]');
        textareas.forEach(textarea => {
            const countElement = document.getElementById(textarea.id.replace('-details', '-count'));
            if (countElement) {
                textarea.addEventListener('input', function() {
                    countElement.textContent = this.value.length;
                });
            }
        });
    });
    
    // console.log('[RegisterFix] 初期化完了');
    
})();