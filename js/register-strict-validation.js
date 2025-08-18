/**
 * Register Strict Validation
 * 登録フォームの厳密なバリデーションとボタン制御
 */

(function() {
    'use strict';
    
    // console.log('[RegisterStrictValidation] 初期化開始');
    
    // バリデーション状態を管理
    const validationState = {
        step1: {
            name: false,
            company: false,
            email: false,
            password: false,
            passwordConfirm: false
        },
        step2: {
            challenges: false,
            revenueDetails: false,
            hrDetails: false,
            dxDetails: false,
            strategyDetails: false,
            budget: false
        },
        step3: {
            phone: false,
            lineId: false,
            lineQr: false,
            position: false
        },
        step4: {
            skillsPr: false
        },
        step5: {
            interestsDetails: false,
            agree: false
        }
    };
    
    // ステップごとの必須チェック項目
    const stepRequirements = {
        1: ['name', 'company', 'email', 'password', 'passwordConfirm'],
        2: ['challenges', 'budget'], // テキストエリアは条件付き
        3: ['phone', 'lineId', 'lineQr', 'position'],
        4: ['skillsPr'],
        5: ['interestsDetails', 'agree']
    };
    
    // 現在のステップのバリデーション状態をチェック
    function isStepValid(stepNum) {
        const requirements = stepRequirements[stepNum];
        if (!requirements) return false;
        
        const stepKey = `step${stepNum}`;
        const stepState = validationState[stepKey];
        
        // ステップ2の特別処理
        if (stepNum === 2) {
            // 必須項目のチェック
            if (!stepState.challenges || !stepState.budget) return false;
            
            // 各課題グループのチェック（:has()を使わない方法）
            const groups = ['revenue', 'hr', 'dx', 'strategy'];
            for (const group of groups) {
                // textareaのIDから親のchallenge-groupを探す
                const textarea = document.getElementById(`${group}-details`);
                if (!textarea) continue;
                
                const challengeGroup = textarea.closest('.challenge-group');
                if (!challengeGroup) continue;
                
                const noChallengeCheckbox = challengeGroup.querySelector('input[value="現状課題なし"]:checked');
                const otherChallenges = challengeGroup.querySelectorAll('input[name="challenges"]:checked:not([value="現状課題なし"])');
                
                // 「現状課題なし」でない場合、詳細が必要
                if (!noChallengeCheckbox && otherChallenges.length > 0) {
                    if (!stepState[`${group}Details`]) return false;
                }
            }
            return true;
        }
        
        // その他のステップは全ての必須項目をチェック
        return requirements.every(req => stepState[req]);
    }
    
    // ボタンの有効/無効を切り替え
    function updateButtonState(stepNum) {
        const stepElement = document.querySelector(`.form-step[data-step="${stepNum}"]`);
        if (!stepElement) return;
        
        const nextButton = stepElement.querySelector('.auth-button:not(.auth-button-outline)');
        if (!nextButton || nextButton.type === 'submit') return;
        
        const isValid = isStepValid(stepNum);
        
        // console.log(`[RegisterStrictValidation] Step ${stepNum} validation:`, {
            isValid,
            state: validationState[`step${stepNum}`]
        });
        
        if (isValid) {
            nextButton.disabled = false;
            nextButton.classList.remove('disabled');
            nextButton.style.opacity = '1';
            nextButton.style.cursor = 'pointer';
        } else {
            nextButton.disabled = true;
            nextButton.classList.add('disabled');
            nextButton.style.opacity = '0.5';
            nextButton.style.cursor = 'not-allowed';
        }
    }
    
    // フィールドのバリデーション
    function validateField(field) {
        const stepElement = field.closest('.form-step');
        if (!stepElement) return;
        
        const stepNum = parseInt(stepElement.getAttribute('data-step'));
        const stepKey = `step${stepNum}`;
        let fieldKey = '';
        let isValid = false;
        
        // フィールドタイプごとの処理
        switch (field.id) {
            case 'name':
            case 'company':
                fieldKey = field.id;
                isValid = field.value.trim().length > 0;
                break;
                
            case 'email':
                fieldKey = 'email';
                isValid = field.value.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);
                break;
                
            case 'password':
                fieldKey = 'password';
                isValid = field.value.length >= 8;
                // パスワード変更時は確認フィールドも再検証
                const confirmField = document.getElementById('password-confirm');
                if (confirmField && confirmField.value) {
                    validateField(confirmField);
                }
                break;
                
            case 'password-confirm':
                fieldKey = 'passwordConfirm';
                const passwordField = document.getElementById('password');
                isValid = field.value.length >= 8 && field.value === passwordField.value;
                break;
                
            case 'budget':
                fieldKey = 'budget';
                isValid = /^\d+$/.test(field.value.trim()) && parseInt(field.value) > 0;
                break;
                
            case 'phone':
                fieldKey = 'phone';
                isValid = field.value.trim().length > 0;
                break;
                
            case 'line-id':
                fieldKey = 'lineId';
                isValid = field.value.trim().length > 0;
                break;
                
            case 'line-qr':
                fieldKey = 'lineQr';
                isValid = field.files && field.files.length > 0;
                break;
                
            case 'position':
                fieldKey = 'position';
                isValid = field.value.trim().length > 0;
                break;
                
            case 'revenue-details':
            case 'hr-details':
            case 'dx-details':
            case 'strategy-details':
                fieldKey = field.id.replace('-', '').replace('details', 'Details');
                isValid = field.value.trim().length >= 50;
                break;
                
            case 'skills-pr':
                fieldKey = 'skillsPr';
                isValid = field.value.trim().length >= 100;
                break;
                
            case 'interests-details':
                fieldKey = 'interestsDetails';
                isValid = field.value.trim().length >= 100;
                break;
        }
        
        if (fieldKey && validationState[stepKey]) {
            validationState[stepKey][fieldKey] = isValid;
        }
        
        updateButtonState(stepNum);
    }
    
    // チェックボックスのバリデーション
    function validateCheckboxes(stepNum) {
        const stepElement = document.querySelector(`.form-step[data-step="${stepNum}"]`);
        if (!stepElement) return;
        
        if (stepNum === 2) {
            // 各課題グループで少なくとも1つチェックされているか確認
            const groups = stepElement.querySelectorAll('.challenge-group');
            let allGroupsValid = true;
            
            groups.forEach(group => {
                const checkedBoxes = group.querySelectorAll('input[name="challenges"]:checked');
                if (checkedBoxes.length === 0) {
                    allGroupsValid = false;
                } else {
                    // 「現状課題なし」がチェックされている場合はtextareaのvalidationStateをtrueに
                    const noChallengeChecked = group.querySelector('input[value="現状課題なし"]:checked');
                    const textarea = group.querySelector('textarea');
                    if (noChallengeChecked && textarea) {
                        const fieldKey = textarea.id.replace('-', '').replace('details', 'Details');
                        validationState.step2[fieldKey] = true;
                    }
                }
            });
            
            validationState.step2.challenges = allGroupsValid;
        } else if (stepNum === 5) {
            // 利用規約の同意
            const agreeCheckbox = stepElement.querySelector('input[name="agree"]');
            validationState.step5.agree = agreeCheckbox && agreeCheckbox.checked;
        }
        
        updateButtonState(stepNum);
    }
    
    // リアルタイム文字数カウンターの更新（register-char-count.jsと重複するため無効化）
    /*
    function updateCharCounter(textarea) {
        // IDベースでカウント要素を特定（より確実）
        const idMap = {
            'revenue-details': 'revenue-count',
            'hr-details': 'hr-count',
            'dx-details': 'dx-count',
            'strategy-details': 'strategy-count',
            'skills-pr': 'skills-pr-count',
            'interests-details': 'interests-details-count'
        };
        
        const countId = idMap[textarea.id];
        let countElement = countId ? document.getElementById(countId) : null;
        
        if (!countElement) {
            // フォールバック: 親要素から探す
            const countSpan = textarea.parentElement.querySelector('.char-count span');
            if (countSpan) {
                countElement = countSpan;
            } else {
                return;
            }
        }
        
        const currentLength = textarea.value.trim().length;
        const minLength = parseInt(textarea.getAttribute('minlength') || '0');
        
        countElement.textContent = currentLength;
        
        // 文字数に応じてスタイルを変更
        const charCountElement = countElement.closest('.char-count');
        if (charCountElement) {
            if (currentLength >= minLength) {
                charCountElement.style.color = '#10b981'; // 緑
            } else {
                charCountElement.style.color = '#ef4444'; // 赤
            }
        }
        
        // バリデーション実行
        validateField(textarea);
    }
    */
    
    // nextStep実行前のバリデーションフック
    // global-functions.jsのnextStepに処理を委譲
    const originalNextStep = window.nextStep;
    if (originalNextStep) {
        // 既存のnextStepをラップしてバリデーションを追加
        const wrappedNextStep = originalNextStep;
        window.nextStep = function() {
            const currentStepElement = document.querySelector('.form-step.active');
            if (!currentStepElement) return;
            
            const currentStepNum = parseInt(currentStepElement.getAttribute('data-step'));
            
            // 厳密なバリデーションチェック
            if (!isStepValid(currentStepNum)) {
                // エラーメッセージを表示
                const errors = [];
                const stepKey = `step${currentStepNum}`;
                const stepState = validationState[stepKey];
                
                // 各フィールドのエラーをチェック
                Object.keys(stepState).forEach(key => {
                    if (!stepState[key]) {
                        switch(key) {
                            case 'name': errors.push('お名前を入力してください'); break;
                            case 'company': errors.push('会社名を入力してください'); break;
                            case 'email': errors.push('有効なメールアドレスを入力してください'); break;
                            case 'password': errors.push('パスワードは8文字以上で入力してください'); break;
                            case 'passwordConfirm': errors.push('パスワードが一致しません'); break;
                            case 'challenges': errors.push('各カテゴリーで少なくとも1つの課題を選択してください'); break;
                            case 'budget': errors.push('年間予算規模を数字で入力してください'); break;
                            case 'phone': errors.push('電話番号を入力してください'); break;
                            case 'lineId': errors.push('LINE IDまたはURLを入力してください'); break;
                            case 'lineQr': errors.push('LINE QRコードをアップロードしてください'); break;
                            case 'position': errors.push('役職を入力してください'); break;
                            case 'revenueDetails': errors.push('売上・収益課題の詳細を50文字以上で入力してください'); break;
                            case 'hrDetails': errors.push('組織・人材課題の詳細を50文字以上で入力してください'); break;
                            case 'dxDetails': errors.push('業務効率・DX課題の詳細を50文字以上で入力してください'); break;
                            case 'strategyDetails': errors.push('事業戦略課題の詳細を50文字以上で入力してください'); break;
                            case 'skillsPr': errors.push('スキル・専門分野のPRを100文字以上で入力してください'); break;
                            case 'interestsDetails': errors.push('興味・困りごとの詳細を100文字以上で入力してください'); break;
                            case 'agree': errors.push('利用規約に同意してください'); break;
                        }
                    }
                });
                
                if (errors.length > 0) {
                    alert('以下の項目を確認してください：\n\n' + errors.join('\n'));
                    return;
                }
            }
            
            // 元のnextStep関数を呼び出す
            wrappedNextStep();
        };
    }
    
    // 初期化
    function init() {
        // 全てのステップのボタンを初期状態に設定
        // 初期状態では無効化しない（ユーザーが入力を始めてからバリデーション開始）
        // for (let i = 1; i <= 5; i++) {
        //     updateButtonState(i);
        // }
        
        // テキストフィールドのイベントリスナー
        document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="tel"]').forEach(field => {
            field.addEventListener('input', () => validateField(field));
            field.addEventListener('blur', () => validateField(field));
        });
        
        // budgetフィールド専用の処理（確実にイベントリスナーを追加）
        const budgetField = document.getElementById('budget');
        if (budgetField) {
            // console.log('[RegisterStrict] Adding validation to budget field');
            budgetField.addEventListener('input', () => validateField(budgetField));
            budgetField.addEventListener('blur', () => validateField(budgetField));
        }
        
        // テキストエリアのイベントリスナー
        // register-char-count.jsで処理するため、ここではバリデーションのみ
        // ただし、register-char-count.jsで既にcloneNodeしているので、ここでは追加しない
        
        // チェックボックスのイベントリスナー
        document.addEventListener('change', function(e) {
            if (e.target.matches('input[type="checkbox"][name="challenges"]')) {
                validateCheckboxes(2);
                
                // 「現状課題なし」の処理
                const group = e.target.closest('.challenge-group');
                const textarea = group.querySelector('textarea');
                
                if (e.target.value === '現状課題なし') {
                    if (e.target.checked && textarea) {
                        const fieldKey = textarea.id.replace('-', '').replace('details', 'Details');
                        validationState.step2[fieldKey] = true; // 現状課題なしの場合は詳細不要
                    } else if (!e.target.checked && textarea) {
                        // 現状課題なしのチェックを外した場合
                        const fieldKey = textarea.id.replace('-', '').replace('details', 'Details');
                        validationState.step2[fieldKey] = false;
                    }
                } else {
                    // 他の課題が選択された場合
                    const noChallengeCheckbox = group.querySelector('input[value="現状課題なし"]:checked');
                    const otherChecked = group.querySelectorAll('input[name="challenges"]:checked:not([value="現状課題なし"])').length > 0;
                    
                    if (textarea) {
                        const fieldKey = textarea.id.replace('-', '').replace('details', 'Details');
                        if (noChallengeCheckbox) {
                            // 現状課題なしがチェックされている場合は詳細不要
                            validationState.step2[fieldKey] = true;
                        } else if (otherChecked) {
                            // 他の課題が選択されている場合はvalidateFieldで検証
                            validateField(textarea);
                        } else {
                            // 何も選択されていない場合
                            validationState.step2[fieldKey] = false;
                        }
                    }
                }
                
                updateButtonState(2);
            } else if (e.target.matches('input[name="agree"]')) {
                validateCheckboxes(5);
            }
        });
        
        // ファイル入力のイベントリスナー
        const fileInput = document.getElementById('line-qr');
        if (fileInput) {
            fileInput.addEventListener('change', () => validateField(fileInput));
        }
        
        // 初期バリデーション実行を削除（ユーザーが入力を始めてからバリデーション開始）
        // 値がすでに入力されているフィールドのみバリデーション実行
        document.querySelectorAll('.form-step.active input, .form-step.active textarea').forEach(field => {
            // 値がある場合のみバリデーション実行
            if (field.value && field.value.trim().length > 0) {
                validateField(field);
            }
        });
        
        // チェックボックスの初期状態も値がある場合のみ確認
        const activeStep = document.querySelector('.form-step.active');
        if (activeStep) {
            const stepNum = parseInt(activeStep.getAttribute('data-step'));
            // チェックボックスが選択されている場合のみバリデーション
            const hasChecked = activeStep.querySelector('input[type="checkbox"]:checked');
            if (hasChecked && (stepNum === 2 || stepNum === 5)) {
                validateCheckboxes(stepNum);
            }
        }
    }
    
    // DOMContentLoadedで初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // console.log('[RegisterStrictValidation] 初期化完了');
    
})();