/**
 * Settings Page - Improved Version
 * メモリリークとXSS脆弱性を修正
 */

(function() {
    'use strict';

    // イベントリスナーを管理するためのマップ
    const eventListeners = new Map();
    const timeouts = new Set();
    const intervals = new Set();

    // ページ離脱時のクリーンアップ
    window.addEventListener('beforeunload', cleanup);

    // タイムアウトの安全な設定
    function safeSetTimeout(callback, delay) {
        const timeoutId = setTimeout(() => {
            timeouts.delete(timeoutId);
            callback();
        }, delay);
        timeouts.add(timeoutId);
        return timeoutId;
    }

    // インターバルの安全な設定
    function safeSetInterval(callback, delay) {
        const intervalId = setInterval(callback, delay);
        intervals.add(intervalId);
        return intervalId;
    }

    // クリーンアップ関数
    function cleanup() {
        // すべてのタイムアウトをクリア
        timeouts.forEach(id => clearTimeout(id));
        timeouts.clear();

        // すべてのインターバルをクリア
        intervals.forEach(id => clearInterval(id));
        intervals.clear();

        // すべてのイベントリスナーを削除
        eventListeners.forEach((listeners, element) => {
            listeners.forEach(({ type, handler }) => {
                element.removeEventListener(type, handler);
            });
        });
        eventListeners.clear();
    }

    // 安全なイベントリスナー追加
    function addSafeEventListener(element, type, handler) {
        if (!element) return;

        element.addEventListener(type, handler);

        // リスナーを記録
        if (!eventListeners.has(element)) {
            eventListeners.set(element, []);
        }
        eventListeners.get(element).push({ type, handler });
    }

    // Initialize settings page
    document.addEventListener('DOMContentLoaded', function() {
        initializeNavigation();
        initializeForms();
        initializeToggles();
        initializeDataManagement();
        initializeAppIntegrations();
        initializePasswordStrength();
        initializeDangerZone();
    });

    // Navigation between settings sections
    function initializeNavigation() {
        const navLinks = document.querySelectorAll('.settings-nav-link');
        const sections = document.querySelectorAll('.settings-section');
        
        navLinks.forEach(link => {
            addSafeEventListener(link, 'click', function(e) {
                e.preventDefault();
                
                // Remove active class from all links and sections
                navLinks.forEach(l => l.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));
                
                // Add active class to clicked link
                this.classList.add('active');
                
                // Show corresponding section
                const targetId = this.getAttribute('data-section');
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.classList.add('active');
                }
            });
        });

        // Show first section by default
        if (navLinks.length > 0 && sections.length > 0) {
            navLinks[0].classList.add('active');
            sections[0].classList.add('active');
        }
    }

    // Form submissions with validation
    function initializeForms() {
        const forms = document.querySelectorAll('.settings-form');
        
        forms.forEach(form => {
            addSafeEventListener(form, 'submit', function(e) {
                e.preventDefault();
                
                if (validateForm(this)) {
                    saveSettings(this);
                }
            });
        });

        // Real-time validation
        const inputs = document.querySelectorAll('.form-input, .form-select, .form-textarea');
        inputs.forEach(input => {
            addSafeEventListener(input, 'blur', function() {
                validateField(this);
            });
        });
    }

    // Toggle switches
    function initializeToggles() {
        const toggles = document.querySelectorAll('.toggle-switch');
        
        toggles.forEach(toggle => {
            addSafeEventListener(toggle, 'click', function() {
                this.classList.toggle('active');
                
                // Save setting
                const settingName = this.getAttribute('data-setting');
                const isActive = this.classList.contains('active');
                saveSetting(settingName, isActive);
            });
        });
    }

    // Data management
    function initializeDataManagement() {
        const exportBtn = document.querySelector('[data-action="export"]');
        const deleteBtn = document.querySelector('[data-action="delete-account"]');
        
        if (exportBtn) {
            addSafeEventListener(exportBtn, 'click', exportData);
        }
        
        if (deleteBtn) {
            addSafeEventListener(deleteBtn, 'click', confirmDeleteAccount);
        }
    }

    // App integrations
    function initializeAppIntegrations() {
        const appButtons = document.querySelectorAll('.app-action-btn');
        
        appButtons.forEach(btn => {
            addSafeEventListener(btn, 'click', function() {
                const appName = this.getAttribute('data-app');
                toggleAppIntegration(appName, this);
            });
        });
    }

    // Password strength indicator
    function initializePasswordStrength() {
        const passwordInput = document.getElementById('new-password');
        const strengthIndicator = document.querySelector('.password-strength');
        
        if (passwordInput && strengthIndicator) {
            addSafeEventListener(passwordInput, 'input', function() {
                const strength = calculatePasswordStrength(this.value);
                updateStrengthIndicator(strengthIndicator, strength);
            });
        }
    }

    // Danger zone actions
    function initializeDangerZone() {
        const dangerButtons = document.querySelectorAll('.danger-zone .btn');
        
        dangerButtons.forEach(btn => {
            addSafeEventListener(btn, 'click', function(e) {
                e.preventDefault();
                const action = this.getAttribute('data-action');
                confirmDangerousAction(action);
            });
        });
    }

    // Form validation
    function validateForm(form) {
        const fields = form.querySelectorAll('[required]');
        let isValid = true;
        
        fields.forEach(field => {
            if (!validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    // Field validation
    function validateField(field) {
        const value = field.value.trim();
        const type = field.type;
        let isValid = true;
        
        // Remove previous error
        const errorElement = field.parentElement.querySelector('.form-error');
        if (errorElement) {
            errorElement.remove();
        }
        
        // Required field
        if (field.hasAttribute('required') && !value) {
            showFieldError(field, 'この項目は必須です');
            isValid = false;
        }
        
        // Email validation
        else if (type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                showFieldError(field, '有効なメールアドレスを入力してください');
                isValid = false;
            }
        }
        
        // Password validation
        else if (type === 'password' && field.id === 'new-password' && value) {
            if (value.length < 8) {
                showFieldError(field, 'パスワードは8文字以上で入力してください');
                isValid = false;
            }
        }
        
        // Password confirmation
        else if (field.id === 'confirm-password') {
            const newPassword = document.getElementById('new-password');
            if (newPassword && value !== newPassword.value) {
                showFieldError(field, 'パスワードが一致しません');
                isValid = false;
            }
        }
        
        return isValid;
    }

    // Show field error
    function showFieldError(field, message) {
        const error = document.createElement('div');
        error.className = 'form-error';
        error.textContent = message;
        field.parentElement.appendChild(error);
        field.classList.add('error');
    }

    // Save settings
    function saveSettings(form) {
        const formData = new FormData(form);
        const settings = {};
        
        for (let [key, value] of formData.entries()) {
            settings[key] = value;
        }
        
        // Show loading state
        const saveBtn = form.querySelector('.btn-save');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '保存中...';
        saveBtn.disabled = true;
        
        // Simulate API call
        safeSetTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            showToast('設定を保存しました', 'success');
        }, 1000);
    }

    // Save individual setting
    function saveSetting(name, value) {
        // Simulate API call
        showToast(`${name}を更新しました`, 'success');
    }

    // Toggle app integration
    function toggleAppIntegration(appName, button) {
        const isConnected = button.textContent === '解除';
        const appItem = button.closest('.app-item');
        
        button.textContent = '処理中...';
        button.disabled = true;
        
        safeSetTimeout(() => {
            if (isConnected) {
                // Disconnect
                button.textContent = '連携';
                button.className = 'btn btn-primary btn-small';
                const status = appItem.querySelector('.app-status');
                status.textContent = '未連携';
                status.className = 'app-status';
                showToast(`${appName}との連携を解除しました`);
            } else {
                // Connect
                button.textContent = '解除';
                button.className = 'btn btn-outline btn-small';
                const status = appItem.querySelector('.app-status');
                status.textContent = '連携済み';
                status.className = 'app-status connected';
                showToast(`${appName}と連携しました`);
            }
            button.disabled = false;
        }, 1500);
    }

    // Export data
    function exportData() {
        const button = event.target;
        const originalText = button.textContent;
        
        button.textContent = 'エクスポート中...';
        button.disabled = true;
        
        safeSetTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
            showToast('データのエクスポートが完了しました', 'success');
            
            // Create download link
            const data = { /* user data */ };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'interconnect-data.json';
            a.click();
            URL.revokeObjectURL(url);
        }, 2000);
    }

    // Calculate password strength
    function calculatePasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        
        return Math.min(Math.floor((strength / 6) * 4), 4);
    }

    // Update strength indicator
    function updateStrengthIndicator(indicator, strength) {
        const strengthTexts = ['弱い', '普通', '強い', '非常に強い'];
        const strengthColors = ['#ef4444', '#f59e0b', '#10b981', '#059669'];
        
        indicator.textContent = strengthTexts[strength - 1] || '';
        indicator.style.color = strengthColors[strength - 1] || '#6b7280';
    }

    // Confirm dangerous action
    function confirmDangerousAction(action) {
        const messages = {
            'delete-account': 'アカウントを削除すると、すべてのデータが失われます。本当に削除しますか？',
            'clear-data': 'すべてのデータをクリアします。この操作は取り消せません。続行しますか？'
        };
        
        if (confirm(messages[action] || '本当に実行しますか？')) {
            executeDangerousAction(action);
        }
    }

    // Execute dangerous action
    function executeDangerousAction(action) {
        showToast(`${action}を実行しました`, 'info');
        
        if (action === 'delete-account') {
            safeSetTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    }

    // Confirm delete account
    function confirmDeleteAccount() {
        if (confirm('アカウントを削除すると、すべてのデータが失われます。本当に削除しますか？')) {
            if (confirm('この操作は取り消せません。本当によろしいですか？')) {
                deleteAccount();
            }
        }
    }

    // Delete account
    function deleteAccount() {
        showToast('アカウントを削除しています...', 'info');
        
        safeSetTimeout(() => {
            // Clear all data
            localStorage.clear();
            sessionStorage.clear();
            
            // Redirect to home
            window.location.href = 'index.html';
        }, 2000);
    }

    // Toast notification (XSS safe)
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // テキストノードとして追加（XSS対策）
        const textNode = document.createTextNode(message);
        toast.appendChild(textNode);
        
        document.body.appendChild(toast);
        
        // Animate in
        safeSetTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove after delay
        safeSetTimeout(() => {
            toast.classList.remove('show');
            safeSetTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

})();