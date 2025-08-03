// Enhanced Registration Flow with Profile Integration

// 名前空間を使用してグローバル汚染を防ぐ
window.InterConnect = window.InterConnect || {};
window.InterConnect.Registration = {
    currentStep: 1,
    
    nextStep: function() {
        const currentStepElement = document.querySelector('.form-step.active');
        if (!currentStepElement) return;
        
        const currentStepNum = parseInt(currentStepElement.getAttribute('data-step'));
        
        if (window.InterConnect.Registration.validateCurrentStep(currentStepNum)) {
            window.InterConnect.Registration.moveToStep(currentStepNum + 1);
        }
    },

    prevStep: function() {
        const currentStepElement = document.querySelector('.form-step.active');
        if (!currentStepElement) return;
        
        const currentStepNum = parseInt(currentStepElement.getAttribute('data-step'));
        window.InterConnect.Registration.moveToStep(currentStepNum - 1);
    }
};

// nextStep/prevStep は global-functions.js で定義済み
// InterConnect.Registration の関数を global-functions.js の関数から呼び出すように設定
window.addEventListener('DOMContentLoaded', function() {
    // global-functions.js のステップ変更イベントを監視
    window.addEventListener('stepChanged', function(e) {
        // 必要に応じて registration-flow.js 側の処理を実行
        console.log('Step changed:', e.detail);
    });
});

// 関数を名前空間内に移動
window.InterConnect.Registration.moveToStep = function(step) {
    const currentStepElement = document.querySelector('.form-step.active');
    if (!currentStepElement) return;
    
    const currentStepNum = parseInt(currentStepElement.getAttribute('data-step'));
    
    if (step < 1 || step > 5) return;
    
    // 現在のステップを非表示
    const currentStep = document.querySelector(`.form-step[data-step="${currentStepNum}"]`);
    const currentProgress = document.querySelector(`.progress-step[data-step="${currentStepNum}"]`);
    
    if (currentStep) {
        currentStep.classList.remove('active');
        // 非アクティブなステップのrequired属性を一時的に無効化
        currentStep.querySelectorAll('[required]').forEach(field => {
            field.setAttribute('data-required', 'true');
            field.removeAttribute('required');
        });
    }
    if (currentProgress) currentProgress.classList.remove('active');
    
    // 完了したステップをマーク
    if (step > currentStepNum && currentProgress) {
        currentProgress.classList.add('completed');
    }
    
    // 新しいステップを表示
    const newStep = document.querySelector(`.form-step[data-step="${step}"]`);
    const progressStep = document.querySelector(`.progress-step[data-step="${step}"]`);
    
    if (newStep) {
        newStep.classList.add('active');
        // アクティブなステップのrequired属性を復元
        newStep.querySelectorAll('[data-required="true"]').forEach(field => {
            field.setAttribute('required', '');
            field.removeAttribute('data-required');
        });
    }
    if (progressStep) progressStep.classList.add('active');
    
    // アニメーション
    if (newStep) {
        if (step > currentStepNum) {
            newStep.classList.add('slide-right');
        } else {
            newStep.classList.add('slide-left');
        }
    }
    
    // スクロールトップ
    if (window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // currentStepを更新
    window.InterConnect.Registration.currentStep = step;
};

// バリデーション関数も名前空間内に移動
window.InterConnect.Registration.validateCurrentStep = function(stepNum) {
    const currentStepElement = document.querySelector(`.form-step[data-step="${stepNum}"]`);
    if (!currentStepElement) return false;
    
    const requiredFields = currentStepElement.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        // 非表示の要素はスキップ
        if (field.offsetParent === null) return;
        
        if (!field.value.trim()) {
            window.InterConnect.Registration.showFieldError(field, '必須項目です');
            isValid = false;
        } else {
            window.InterConnect.Registration.clearFieldError(field);
        }
    });
    
    // ステップ固有のバリデーション
    if (stepNum === 1) {
        // メールアドレスの検証
        const email = document.getElementById('email');
        if (email && email.value && !window.InterConnect.Registration.validateEmail(email.value)) {
            window.InterConnect.Registration.showFieldError(email, '有効なメールアドレスを入力してください');
            isValid = false;
        }
        
        // パスワードの検証
        const password = document.getElementById('password');
        const passwordConfirm = document.getElementById('password-confirm');
        
        if (password && password.value.length < 8) {
            window.InterConnect.Registration.showFieldError(password, 'パスワードは8文字以上で入力してください');
            isValid = false;
        }
        
        if (password && passwordConfirm && password.value !== passwordConfirm.value) {
            window.InterConnect.Registration.showFieldError(passwordConfirm, 'パスワードが一致しません');
            isValid = false;
        }
    } else if (stepNum === 2) {
        // 少なくとも1つの課題を選択しているか確認
        const checkedChallenges = currentStepElement.querySelectorAll('input[name="challenges"]:checked');
        
        if (checkedChallenges.length === 0) {
            window.InterConnect.Registration.showToast('少なくとも1つの事業課題を選択してください', 'error');
            isValid = false;
        }
        
        // テキストエリアの文字数検証
        const textareas = currentStepElement.querySelectorAll('textarea[minlength]');
        textareas.forEach(textarea => {
            const minLength = parseInt(textarea.getAttribute('minlength'));
            if (textarea.value.length < minLength) {
                window.InterConnect.Registration.showFieldError(textarea, `${minLength}文字以上入力してください`);
                isValid = false;
            }
        });
        
        // 予算の検証
        const budget = document.getElementById('budget');
        if (budget && (!budget.value || parseInt(budget.value) <= 0)) {
            window.InterConnect.Registration.showFieldError(budget, '有効な金額を入力してください');
            isValid = false;
        }
    }
    
    return isValid;
};

// ヘルパー関数も名前空間内に移動
window.InterConnect.Registration.showFieldError = function(field, message) {
    if (!field) return;
    
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;
    
    formGroup.classList.add('error');
    
    let errorElement = formGroup.querySelector('.error-message');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        formGroup.appendChild(errorElement);
    }
    errorElement.textContent = message;
};

window.InterConnect.Registration.clearFieldError = function(field) {
    if (!field) return;
    
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;
    
    formGroup.classList.remove('error');
    const errorElement = formGroup.querySelector('.error-message');
    if (errorElement) {
        errorElement.remove();
    }
};

window.InterConnect.Registration.validateEmail = function(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

window.InterConnect.Registration.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `registration-toast ${type}`;
    
    // アイコンを安全に作成
    const icon = document.createElement('i');
    const iconClass = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    icon.className = `fas ${iconClass}`;
    
    // メッセージを安全に作成
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    
    // 要素を追加
    toast.appendChild(icon);
    toast.appendChild(messageSpan);
    
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#0066ff',
        color: 'white',
        padding: '16px 24px',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '16px',
        fontWeight: '500',
        zIndex: '10000',
        animation: 'slideInRight 0.3s ease'
    });
    
    if (document.body) {
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (document.contains(toast)) {
                    toast.remove();
                }
            }, 300);
        }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registerForm');
    if (!form) return;
    
    let currentStep = 1;
    const totalSteps = 5;
    
    // 招待コードの処理
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('invite') || sessionStorage.getItem('inviteCode');
    const inviterId = sessionStorage.getItem('inviterId');
    
    if (inviteCode) {
        console.log('招待コードが検出されました:', inviteCode);
        // 招待情報を表示
        const inviteNotice = document.createElement('div');
        inviteNotice.className = 'invite-notice';
        inviteNotice.innerHTML = `
            <i class="fas fa-gift"></i>
            <span>招待コードが適用されています: <strong>${inviteCode}</strong></span>
        `;
        inviteNotice.style.cssText = `
            background: #f0f9ff;
            border: 1px solid #667eea;
            color: #667eea;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
        `;
        
        const authForm = document.querySelector('.auth-form');
        if (authForm && authForm.parentElement) {
            authForm.parentElement.insertBefore(inviteNotice, authForm);
        }
    }
    
    // 初期化時に非アクティブなステップのrequired属性を無効化
    document.querySelectorAll('.form-step:not(.active)').forEach(step => {
        step.querySelectorAll('[required]').forEach(field => {
            field.setAttribute('data-required', 'true');
            field.removeAttribute('required');
        });
    });
    
    // スキル管理用の配列
    let selectedSkills = [];
    
    // 文字数カウント機能
    const textareas = document.querySelectorAll('textarea[minlength]');
    textareas.forEach(textarea => {
        const counterId = textarea.id ? textarea.id.replace('-details', '-count') : null;
        const counterElement = counterId ? document.getElementById(counterId) : null;
        
        if (counterElement) {
            const inputHandler = function() {
                const charCount = this.value.length;
                const minLength = parseInt(this.getAttribute('minlength'));
                counterElement.textContent = charCount;
                
                if (counterElement.parentElement) {
                    const charCountWrapper = counterElement.parentElement;
                    if (charCount >= minLength) {
                        charCountWrapper.classList.add('valid');
                        charCountWrapper.classList.remove('invalid');
                    } else {
                        charCountWrapper.classList.add('invalid');
                        charCountWrapper.classList.remove('valid');
                    }
                }
            };
            
            textarea.addEventListener('input', inputHandler);
            
            // イベントリスナーのクリーンアップ用に保存
            textarea._inputHandler = inputHandler;
        }
    });
    
    // ファイルアップロード機能
    const fileInput = document.getElementById('line-qr');
    const filePreview = document.getElementById('qr-preview');
    
    if (fileInput && filePreview) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            
            if (file) {
                // ファイルサイズチェック（5MB）
                if (file.size > 5 * 1024 * 1024) {
                    window.InterConnect.Registration.showToast('ファイルサイズは5MB以下にしてください', 'error');
                    this.value = '';
                    return;
                }
                
                // ファイルタイプチェック
                const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
                if (!allowedTypes.includes(file.type.toLowerCase())) {
                    window.InterConnect.Registration.showToast('PNG、JPG、JPEG形式の画像をアップロードしてください', 'error');
                    this.value = '';
                    return;
                }
                
                // ファイル名の安全性チェック
                const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
                if (safeFileName !== file.name) {
                    console.warn('Unsafe filename detected:', file.name);
                }
                
                // プレビュー表示
                const reader = new FileReader();
                reader.onload = function(e) {
                    if (filePreview) {
                        // 安全に画像を表示
                        filePreview.textContent = ''; // 既存のコンテンツをクリア
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.alt = 'QR Code Preview';
                        filePreview.appendChild(img);
                        filePreview.classList.add('active');
                    }
                };
                reader.onerror = function(e) {
                    console.error('ファイル読み込みエラー:', e);
                    window.InterConnect.Registration.showToast('ファイルの読み込みに失敗しました', 'error');
                };
                reader.readAsDataURL(file);
            } else {
                if (filePreview) {
                    filePreview.textContent = ''; // 安全にクリア
                    filePreview.classList.remove('active');
                }
            }
        });
    }
    
    // ステップナビゲーション
    document.querySelectorAll('[data-action]').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const action = this.getAttribute('data-action');
            
            if (action === 'next-step') {
                if (window.InterConnect.Registration.validateCurrentStep(currentStep)) {
                    window.InterConnect.Registration.moveToStep(currentStep + 1);
                    currentStep = currentStep + 1;
                }
            } else if (action === 'prev-step') {
                window.InterConnect.Registration.moveToStep(currentStep - 1);
                currentStep = currentStep - 1;
            }
        });
    });
    
    // ローカルのmoveToStep関数は削除（グローバルで定義済み）
    
    // ローカルのvalidateCurrentStep関数は削除（グローバルで定義済み）
    
    // フォーム送信処理
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!window.InterConnect.Registration.validateCurrentStep(currentStep)) return;
        
        // 利用規約の同意確認
        const agreeCheckbox = document.querySelector('input[name="agree"]');
        if (!agreeCheckbox || !agreeCheckbox.checked) {
            window.InterConnect.Registration.showToast('利用規約に同意してください', 'error');
            return;
        }
        
        // フォームデータの収集
        const formData = collectFormData();
        
        // 招待コード情報を追加
        if (inviteCode) {
            formData.inviteCode = inviteCode;
            formData.inviterId = inviterId || null;
        }
        
        // 送信ボタンをローディング状態に
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.classList.add('loading');
        submitButton.textContent = '登録処理中...';
        
        try {
            // 実際のAPIコールをシミュレート
            await simulateRegistration(formData);
            
            // 招待コードがある場合、招待記録を作成
            if (inviteCode && window.supabase) {
                try {
                    // 招待リンクの使用回数を更新
                    const { data: inviteLink, error: linkError } = await window.supabase
                        .from('invite_links')
                        .select('id, used_count')
                        .eq('link_code', inviteCode)
                        .single();
                    
                    if (!linkError && inviteLink) {
                        // 使用回数をインクリメント
                        await window.supabase
                            .from('invite_links')
                            .update({ used_count: (inviteLink.used_count || 0) + 1 })
                            .eq('id', inviteLink.id);
                        
                        console.log('招待リンクの使用回数を更新しました');
                    }
                    
                    // セッションストレージをクリア
                    sessionStorage.removeItem('inviteCode');
                    sessionStorage.removeItem('inviterId');
                } catch (error) {
                    console.error('招待記録の作成エラー:', error);
                    // エラーが発生しても登録処理は継続
                }
            }
            
            // 成功時の処理
            window.InterConnect.Registration.showToast('登録が完了しました！', 'success');
            
            // プロフィールデータを保存（ローカルストレージ）
            saveProfileData(formData);
            
            // ダッシュボードへリダイレクト
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            
        } catch (error) {
            console.error('登録エラー:', error);
            window.InterConnect.Registration.showToast('登録に失敗しました: ' + (error.message || '不明なエラー'), 'error');
            submitButton.classList.remove('loading');
            submitButton.textContent = '登録する';
        }
    });
    
    // フォームデータの収集
    function collectFormData() {
        // nullチェックを追加
        const getElementValue = (id) => {
            const elem = document.getElementById(id);
            return elem ? elem.value : '';
        };
        
        const formData = {
            // 基本情報
            name: getElementValue('name'),
            company: getElementValue('company'),
            email: getElementValue('email'),
            position: getElementValue('position'),
            
            // 事業課題
            challenges: Array.from(document.querySelectorAll('input[name="challenges"]:checked'))
                .map(cb => cb.value),
            budget: getElementValue('budget'),
            
            // 事業課題の詳細
            'revenue-details': getElementValue('revenue-details'),
            'hr-details': getElementValue('hr-details'),
            'dx-details': getElementValue('dx-details'),
            'strategy-details': getElementValue('strategy-details'),
            
            // 連絡先
            phone: getElementValue('phone'),
            lineId: getElementValue('line-id'),
            
            // その他
            newsletter: document.querySelector('input[name="newsletter"]')?.checked || false,
            
            // スキル
            skills: Array.from(document.querySelectorAll('input[name="skills"]:checked'))
                .map(cb => cb.value),
            
            // 興味・関心
            interests: Array.from(document.querySelectorAll('input[name="interests"]:checked'))
                .map(cb => cb.value),
            
            // プロフィール用追加データ
            joinDate: new Date().toISOString(),
            profileImage: 'assets/user-placeholder.svg',
            bio: ''
        };
        
        return formData;
    }
    
    // プロフィールデータの保存
    function saveProfileData(data) {
        // 実際の実装では、APIを通じてサーバーに保存
        if (window.safeLocalStorage) {
            window.safeLocalStorage.setJSON('userProfile', data);
            window.safeLocalStorage.setItem('isLoggedIn', 'true');
        } else {
            // フォールバック
            try {
                localStorage.setItem('userProfile', JSON.stringify(data));
                localStorage.setItem('isLoggedIn', 'true');
            } catch (e) {
                console.error('Failed to save profile data:', e);
            }
        }
    }
    
    // 登録処理のシミュレーション
    function simulateRegistration(data) {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('Registration data:', data);
                resolve();
            }, 2000);
        });
    }
    
    // ヘルパー関数は既にグローバルスコープで定義済み
    
    // リアルタイムバリデーション
    document.querySelectorAll('input[required]').forEach(input => {
        input.addEventListener('blur', function() {
            if (!this.value.trim()) {
                window.InterConnect.Registration.showFieldError(this, '必須項目です');
            } else {
                window.InterConnect.Registration.clearFieldError(this);
            }
        });
    });
    
    // パスワード確認のリアルタイムチェック
    const passwordConfirm = document.getElementById('password-confirm');
    if (passwordConfirm) {
        passwordConfirm.addEventListener('input', function() {
            const passwordElement = document.getElementById('password');
            if (passwordElement) {
                const password = passwordElement.value;
                if (this.value && this.value !== password) {
                    window.InterConnect.Registration.showFieldError(this, 'パスワードが一致しません');
                } else {
                    window.InterConnect.Registration.clearFieldError(this);
                }
            }
        });
    }
    
    // LINE登録ボタンの処理は削除（auth-supabase.jsで処理）
    // 競合を避けるため、ここでは何もしない
    console.log('📍 registration-flow.js: LINE button handling delegated to auth-supabase.js');
});