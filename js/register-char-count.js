/**
 * 登録フォームの文字カウント機能
 */

document.addEventListener('DOMContentLoaded', function() {
    // デバッグ用 
    const DEBUG = false; 
    // console.log('[CharCount] 🚀 Initializing character count feature...');
    // console.log('[CharCount] ⏰ DOMContentLoaded at:', new Date().toISOString());
    
    // 文字カウントが必要な要素の設定
    const charCountFields = [
        { id: 'revenue-details', countId: 'revenue-count', min: 50 },
        { id: 'hr-details', countId: 'hr-count', min: 50 },
        { id: 'dx-details', countId: 'dx-count', min: 50 },
        { id: 'strategy-details', countId: 'strategy-count', min: 50 },
        { id: 'skills-pr', countId: 'skills-pr-count', min: 100 },
        { id: 'interests-details', countId: 'interests-details-count', min: 100 }
    ];

    // 各フィールドにイベントリスナーを設定
    charCountFields.forEach(field => {
        const textarea = document.getElementById(field.id);
        const countElement = document.getElementById(field.countId);
        
        if (DEBUG) console.log(`[CharCount] Setting up ${field.id}:`, { 
            textarea: !!textarea, 
            countElement: !!countElement,
            textareaId: field.id,
            countId: field.countId,
            textareaDisabled: textarea ? textarea.disabled : 'N/A'
        });
        
        if (textarea && countElement) {
            // console.log(`[CharCount] ✅ Found elements for ${field.id}`);
            // 初期値設定
            updateCharCount(textarea, countElement, field.min);
            // console.log(`[CharCount] ✅ Initial count set for ${field.id}`);
            
            // 既存のイベントリスナーをクリアしてから新規追加
            // ただしcloneNodeは使わない（disabled状態もコピーされるため）
            
            // 既存のイベントリスナーを上書き
            const inputHandler = function(e) {
                // console.log(`[CharCount] ✅ Input event triggered for ${field.id}, length: ${this.value.length}`);
                const count = document.getElementById(field.countId);
                if (count) {
                    updateCharCount(this, count, field.min);
                    // console.log(`[CharCount] ✅ Updated count display to: ${this.value.length}`);
                } else {
                    // console.error(`[CharCount] ❌ Count element not found: ${field.countId}`);
                }
                // ローカルのバリデーション関数を呼び出し
                validateCharCountStep();
            };
            
            // inputイベントを両方の方法で設定（確実性のため）
            textarea.oninput = inputHandler;
            textarea.addEventListener('input', inputHandler);
            
            // デバッグ: リスナー追加後の確認
            // console.log(`[CharCount] 📎 Added input listener to ${field.id}, disabled: ${textarea.disabled}`);
            
            // デバッグ: getEventListenersがある場合は確認
            // if (typeof getEventListeners !== 'undefined') {
            //     console.log(`[CharCount] Current listeners on ${field.id}:`, getEventListeners(textarea));
            // }
            
            // キーアップイベントは削除（inputイベントで十分）
        } else {
            if (DEBUG) console.error(`[CharCount] Missing elements for ${field.id}:`, {
                textarea: textarea,
                countElement: countElement
            });
        }
    });

    // 文字カウント更新関数
    function updateCharCount(textarea, countElement, minLength) {
        const currentLength = textarea.value.length;
        countElement.textContent = currentLength;
        // console.log(`[updateCharCount] Setting ${countElement.id} to ${currentLength}`);
        
        // 親要素の.char-countを取得
        const charCountWrapper = countElement.closest('.char-count');
        if (charCountWrapper) {
            // textareaがdisabledの場合は非表示
            if (textarea.disabled) {
                charCountWrapper.style.display = 'none';
                return;
            } else {
                charCountWrapper.style.display = '';
            }
            
            // 初期状態（0文字）の場合はエラークラスを付けない
            if (currentLength === 0) {
                charCountWrapper.classList.remove('error');
                charCountWrapper.classList.remove('success');
            } else if (currentLength >= minLength) {
                charCountWrapper.classList.remove('error');
                charCountWrapper.classList.add('success');
            } else {
                charCountWrapper.classList.remove('success');
                charCountWrapper.classList.add('error');
            }
        }
    }

    // ステップバリデーション関数（ローカル用）
    function validateCharCountStep() {
        const activeStep = document.querySelector('.form-step.active');
        if (!activeStep) return;

        const stepNumber = activeStep.dataset.step;
        let isValid = true;

        // ステップごとのバリデーション
        switch(stepNumber) {
            case '1':
                // 基本情報
                isValid = validateBasicInfo();
                break;
            case '2':
                // 事業課題
                isValid = validateChallenges();
                break;
            case '3':
                // 連絡先
                isValid = validateContact();
                break;
            case '4':
                // スキル
                isValid = validateSkills();
                break;
            case '5':
                // 興味・関心
                isValid = validateInterests();
                break;
        }

        // 次へボタンの有効/無効切り替え
        const nextButton = activeStep.querySelector('.auth-button:not(.auth-button-outline)');
        if (nextButton && nextButton.textContent.includes('次へ')) {
            if (isValid) {
                nextButton.disabled = false;
                nextButton.classList.remove('disabled');
                nextButton.style.opacity = '';
                nextButton.style.cursor = '';
            } else {
                nextButton.disabled = true;
                nextButton.classList.add('disabled');
                nextButton.style.opacity = '0.5';
                nextButton.style.cursor = 'not-allowed';
            }
        }
    }

    // 基本情報のバリデーション
    function validateBasicInfo() {
        const requiredFields = ['name', 'company', 'email', 'password', 'password-confirm'];
        let isValid = true;

        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field || !field.value.trim()) {
                isValid = false;
            }
        });

        // パスワード一致確認
        const password = document.getElementById('password');
        const passwordConfirm = document.getElementById('password-confirm');
        if (password && passwordConfirm && password.value !== passwordConfirm.value) {
            isValid = false;
        }

        // メールアドレスの形式確認
        const email = document.getElementById('email');
        if (email && !isValidEmail(email.value)) {
            isValid = false;
        }

        return isValid;
    }

    // 事業課題のバリデーション
    function validateChallenges() {
        // 少なくとも1つのチャレンジが選択されているか
        const checkedChallenges = document.querySelectorAll('input[name="challenges"]:checked');
        if (checkedChallenges.length === 0) {
            return false;
        }

        // 予算が入力されているか
        const budget = document.getElementById('budget');
        if (!budget || !budget.value.trim()) {
            return false;
        }

        // 詳細が必要な場合の文字数チェック
        const detailFields = ['revenue-details', 'hr-details', 'dx-details', 'strategy-details'];
        for (let fieldId of detailFields) {
            const field = document.getElementById(fieldId);
            if (field && field.value.trim() && field.value.length < 50) {
                return false;
            }
        }

        return true;
    }

    // 連絡先のバリデーション
    function validateContact() {
        const requiredFields = ['phone', 'line-id', 'position'];
        let isValid = true;

        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field || !field.value.trim()) {
                isValid = false;
            }
        });

        // ファイルアップロードのチェック
        const fileInput = document.getElementById('line-qr');
        if (fileInput && !fileInput.files.length) {
            isValid = false;
        }

        return isValid;
    }

    // スキルのバリデーション
    function validateSkills() {
        // 少なくとも1つのスキルが選択されているか
        const checkedSkills = document.querySelectorAll('input[name="skills"]:checked');
        if (checkedSkills.length === 0) {
            return false;
        }

        // PRテキストの文字数チェック
        const skillsPr = document.getElementById('skills-pr');
        if (!skillsPr || skillsPr.value.length < 100) {
            return false;
        }

        return true;
    }

    // 興味・関心のバリデーション
    function validateInterests() {
        // 少なくとも1つの興味が選択されているか
        const checkedInterests = document.querySelectorAll('input[name="interests"]:checked');
        if (checkedInterests.length === 0) {
            return false;
        }

        // 詳細テキストの文字数チェック
        const interestsDetails = document.getElementById('interests-details');
        if (!interestsDetails || interestsDetails.value.length < 100) {
            return false;
        }

        // 利用規約への同意
        const agreeCheckbox = document.querySelector('input[name="agree"]');
        if (!agreeCheckbox || !agreeCheckbox.checked) {
            return false;
        }

        return true;
    }

    // メールアドレスの形式確認
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // 全ての入力フィールドに対してイベントリスナーを設定（textareaは除く、上で既に設定済み）
    const allInputs = document.querySelectorAll('#registerForm input:not([type="file"]), #registerForm select');
    allInputs.forEach(input => {
        input.addEventListener('input', validateCharCountStep);
        input.addEventListener('change', validateCharCountStep);
    });

    // 初期バリデーション実行を無効化（ユーザーが入力を始めてからバリデーション開始）
    // validateStep();
    
    // 初期表示は上で既に実行済みなので、ここでは重複実行しない

    // ファイルアップロード処理
    const fileInput = document.getElementById('line-qr');
    const filePreview = document.getElementById('qr-preview');
    
    if (fileInput && filePreview) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // ファイルサイズチェック（5MB以下）
                if (file.size > 5 * 1024 * 1024) {
                    alert('ファイルサイズは5MB以下にしてください');
                    fileInput.value = '';
                    return;
                }

                // ファイルタイプチェック
                if (!file.type.match(/^image\/(png|jpg|jpeg)$/i)) {
                    alert('PNG、JPG、JPEG形式の画像をアップロードしてください');
                    fileInput.value = '';
                    return;
                }

                // プレビュー表示
                const reader = new FileReader();
                reader.onload = function(e) {
                    filePreview.innerHTML = `<img src="${e.target.result}" alt="QRコードプレビュー">`;
                };
                reader.readAsDataURL(file);

                // ラベルテキスト更新
                const label = document.querySelector('label[for="line-qr"] span');
                if (label) {
                    label.textContent = file.name;
                }
            }

            // バリデーション更新
            validateCharCountStep();
        });
    }
});