/**
 * Register Enhanced Validation
 * 新規登録ページの強化されたバリデーション機能
 */

(function() {
    'use strict';
    
    // console.log('[RegisterEnhancedValidation] 初期化開始');
    
    // 現在のステップ
    let currentStep = 1;
    
    // 文字数カウンター更新
    // この関数は無効化（register-char-count.js で統一処理）
    function updateCharCount(textarea) {
        // 何もしない（register-char-count.js が処理）
        return;
    }
    
    // 「現状課題なし」チェックボックスの処理
    function handleNoChallengeCheckbox(checkbox) {
        const group = checkbox.closest('.challenge-group');
        const otherCheckboxes = group.querySelectorAll('input[type="checkbox"][name="challenges"]:not([value="現状課題なし"])');
        const textarea = group.querySelector('textarea');
        
        if (checkbox.checked) {
            // 他のチェックボックスを無効化（現状課題なし以外）
            otherCheckboxes.forEach(cb => {
                cb.checked = false;
                cb.disabled = true;
            });
            // テキストエリアを無効化してクリア
            if (textarea) {
                textarea.value = '';
                textarea.disabled = true;
                textarea.removeAttribute('data-required');
                // updateCharCountは存在しないので削除
            }
        } else {
            // 他のチェックボックスを有効化
            otherCheckboxes.forEach(cb => {
                cb.disabled = false;
            });
            // テキストエリアを有効化
            if (textarea) {
                textarea.disabled = false;
            }
        }
    }
    
    // 課題チェックボックスの処理
    function handleChallengeCheckbox(checkbox) {
        const group = checkbox.closest('.challenge-group');
        const noChallengeCheckbox = group.querySelector('input[value="現状課題なし"]');
        const textarea = group.querySelector('textarea');
        const checkedBoxes = group.querySelectorAll('input[name="challenges"]:checked:not([value="現状課題なし"])');
        
        // 「現状課題なし」のチェックを外す
        if (noChallengeCheckbox && noChallengeCheckbox.checked) {
            noChallengeCheckbox.checked = false;
            const otherCheckboxes = group.querySelectorAll('input[type="checkbox"][name="challenges"]');
            otherCheckboxes.forEach(cb => cb.disabled = false);
            if (textarea) textarea.disabled = false;
        }
        
        // 課題が選択されている場合、テキストエリアを必須にする
        if (textarea) {
            if (checkedBoxes.length > 0) {
                textarea.setAttribute('data-required', 'true');
            } else {
                textarea.removeAttribute('data-required');
            }
        }
    }
    
    // バリデーション
    function validateStep(step) {
        const stepElement = document.querySelector(`.form-step[data-step="${step}"]`);
        if (!stepElement) return true;
        
        const errors = [];
        
        // 必須フィールドのチェック
        const requiredFields = stepElement.querySelectorAll('[data-required="true"]:not(:disabled)');
        requiredFields.forEach(field => {
            if (field.type === 'checkbox') {
                if (!field.checked) {
                    errors.push('利用規約に同意してください');
                }
            } else if (field.type === 'file') {
                if (!field.files || field.files.length === 0) {
                    errors.push(`${field.closest('.form-group').querySelector('label').textContent.replace('*', '').trim()}を選択してください`);
                }
            } else if (field.tagName === 'TEXTAREA') {
                const minLength = parseInt(field.getAttribute('minlength') || '0');
                if (field.value.trim().length < minLength) {
                    errors.push(`${field.closest('.form-group').querySelector('label').textContent.replace('*', '').trim()}は${minLength}文字以上で入力してください`);
                }
            } else {
                if (!field.value.trim()) {
                    errors.push(`${field.closest('.form-group').querySelector('label').textContent.replace('*', '').trim()}を入力してください`);
                }
            }
        });
        
        // ステップ2の特別なバリデーション
        if (step === 2) {
            const challengeGroups = stepElement.querySelectorAll('.challenge-group');
            challengeGroups.forEach(group => {
                const noChallengeChecked = group.querySelector('input[value="現状課題なし"]:checked');
                const otherChallengesChecked = group.querySelectorAll('input[name="challenges"]:checked:not([value="現状課題なし"])');
                
                if (!noChallengeChecked && otherChallengesChecked.length === 0) {
                    const groupTitle = group.querySelector('h4').textContent.trim();
                    errors.push(`${groupTitle}の項目を選択するか、「現状課題なし」を選択してください`);
                }
            });
            
            // 予算の検証
            const budgetInput = stepElement.querySelector('#budget');
            if (budgetInput) {
                const value = budgetInput.value.trim();
                if (!value) {
                    errors.push('年間予算規模を入力してください');
                } else if (!/^\d+$/.test(value)) {
                    errors.push('年間予算規模は数字のみで入力してください');
                }
            }
        }
        
        // ステップ4の特別なバリデーション（PR欄）
        if (step === 4) {
            const prTextarea = stepElement.querySelector('#skills-pr');
            if (prTextarea && prTextarea.value.trim().length < 100) {
                errors.push('スキル・専門分野のPRは100文字以上で入力してください');
            }
        }
        
        // ステップ5の特別なバリデーション（詳細欄）
        if (step === 5) {
            const detailsTextarea = stepElement.querySelector('#interests-details');
            if (detailsTextarea && detailsTextarea.value.trim().length < 100) {
                errors.push('興味・困りごとの詳細は100文字以上で入力してください');
            }
        }
        
        // エラー表示
        if (errors.length > 0) {
            // alert(errors.join('\n'));
            if (window.showError) {
                showError(errors.join('\n'));
            }
            return false;
        }
        
        return true;
    }
    
    // 初期化
    function init() {
        // 文字数カウンターの初期化は無効化（register-char-count.jsが処理）
        /*
        document.querySelectorAll('textarea[minlength]').forEach(textarea => {
            textarea.addEventListener('input', function() {
                updateCharCount(this);
            });
            updateCharCount(textarea);
        });
        */
        
        // 初期状態のチェック - 「現状課題なし」がチェックされていたら処理
        console.log('[RegisterEnhanced] 🔍 Checking initial checkbox states...');
        document.querySelectorAll('input[value="現状課題なし"]').forEach(checkbox => {
            console.log(`[RegisterEnhanced] Checkbox "現状課題なし" checked: ${checkbox.checked}`);
            if (checkbox.checked) {
                console.log('[RegisterEnhanced] ⚠️ Processing checked "現状課題なし"');
                handleNoChallengeCheckbox(checkbox);
            }
        });
        
        // チェックボックスのイベントリスナー
        document.addEventListener('change', function(e) {
            if (e.target.matches('input[type="checkbox"][name="challenges"]')) {
                if (e.target.value === '現状課題なし') {
                    handleNoChallengeCheckbox(e.target);
                } else {
                    handleChallengeCheckbox(e.target);
                }
            }
        });
        
        // 予算フィールドの数字のみ入力制限
        const budgetInput = document.getElementById('budget');
        if (budgetInput) {
            budgetInput.addEventListener('input', function() {
                this.value = this.value.replace(/[^\d]/g, '');
            });
        }
        
        // グローバル関数として公開
        window.validateStep = validateStep;
    }
    
    // DOMContentLoadedで初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // console.log('[RegisterEnhancedValidation] 初期化完了');
    
})();