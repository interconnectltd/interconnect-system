// Enhanced Auth Functionality
document.addEventListener('DOMContentLoaded', function() {
    // パスワード表示/非表示の切り替え
    const passwordToggles = document.querySelectorAll('.password-toggle');
    
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const wrapper = this.closest('.password-input-wrapper');
            const input = wrapper ? wrapper.querySelector('input[type="password"], input[type="text"]') : null;
            const icon = this.querySelector('i');
            
            if (!input || !icon) {
                console.error('Password input or icon not found');
                return;
            }
            
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
    
    // フォームバリデーション
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const emailInput = this.email;
            const passwordInput = this.password;
            
            if (!emailInput || !passwordInput) {
                console.error('Form inputs not found');
                return;
            }
            
            const email = emailInput.value;
            const password = passwordInput.value;
            const submitButton = this.querySelector('button[type="submit"]');
            
            // バリデーション
            let isValid = true;
            
            // メールアドレスのバリデーション
            const emailGroup = emailInput.closest('.form-group');
            if (emailGroup && !validateEmail(email)) {
                showError(emailGroup, '有効なメールアドレスを入力してください');
                isValid = false;
            } else if (emailGroup) {
                clearError(emailGroup);
            }
            
            // パスワードのバリデーション
            const passwordGroup = passwordInput.closest('.form-group');
            if (passwordGroup && password.length < 6) {
                showError(passwordGroup, 'パスワードは6文字以上で入力してください');
                isValid = false;
            } else if (passwordGroup) {
                clearError(passwordGroup);
            }
            
            if (isValid) {
                // ローディング状態
                submitButton.classList.add('loading');
                submitButton.textContent = 'ログイン中...';
                
                // ログイン処理をシミュレート
                setTimeout(() => {
                    // 成功時はダッシュボードへ
                    window.location.href = 'dashboard.html';
                }, 1500);
            }
        });
    }
    
    // メールアドレスのバリデーション関数
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // エラー表示
    function showError(formGroup, message) {
        formGroup.classList.add('error');
        formGroup.classList.remove('success');
        
        // 既存のエラーメッセージを削除
        const existingError = formGroup.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // 新しいエラーメッセージを追加
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        formGroup.appendChild(errorDiv);
    }
    
    // エラークリア
    function clearError(formGroup) {
        formGroup.classList.remove('error');
        const errorMessage = formGroup.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }
    
    // 入力フィールドのリアルタイムバリデーション
    const inputs = document.querySelectorAll('.form-group input');
    
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            const formGroup = this.closest('.form-group');
            
            if (this.type === 'email' && this.value) {
                if (validateEmail(this.value)) {
                    formGroup.classList.add('success');
                    clearError(formGroup);
                } else {
                    formGroup.classList.remove('success');
                }
            } else if (this.type === 'password' && this.value) {
                if (this.value.length >= 6) {
                    formGroup.classList.add('success');
                    clearError(formGroup);
                } else {
                    formGroup.classList.remove('success');
                }
            }
        });
    });
    
    // ゲストログインボタン
    const guestButton = document.querySelector('.guest-button');
    if (guestButton) {
        guestButton.addEventListener('click', function(e) {
            e.preventDefault();
            this.classList.add('loading');
            // 安全にローディング状態を表示
            this.textContent = '';
            const spinner = document.createElement('i');
            spinner.className = 'fas fa-spinner fa-spin';
            const text = document.createTextNode(' ゲストログイン中...');
            this.appendChild(spinner);
            this.appendChild(text);
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        });
    }
    
    // Enterキーでのフォーカス移動
    inputs.forEach((input, index) => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                
                if (index < inputs.length - 1) {
                    inputs[index + 1].focus();
                } else {
                    loginForm.querySelector('button[type="submit"]').click();
                }
            }
        });
    });
    
    // マウス追従アニメーションを削除
});