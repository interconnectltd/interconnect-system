// Settings Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeSettings();
});

function initializeSettings() {
    // Initialize settings navigation
    initSettingsNav();
    
    // Initialize toggle switches
    initToggleSwitches();
    
    // Initialize theme selector
    initThemeSelector();
    
    // Initialize form validation
    initFormValidation();
}

function initSettingsNav() {
    const navItems = document.querySelectorAll('.settings-nav-item');
    const sections = document.querySelectorAll('.settings-section');
    
    // Handle navigation clicks
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            showSection(targetId);
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Show default section (account)
    showSection('account');
}

function showSection(sectionId) {
    const sections = document.querySelectorAll('.settings-section');
    
    sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === sectionId) {
            section.classList.add('active');
        }
    });
    
    // Scroll to top of content
    const settingsContent = document.querySelector('.settings-content');
    if (settingsContent) {
        settingsContent.scrollTop = 0;
    }
}

function initToggleSwitches() {
    const toggles = document.querySelectorAll('.toggle-input');
    
    toggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const settingName = this.closest('.toggle-group').querySelector('strong').textContent;
            const isEnabled = this.checked;
            
            // Here you would typically save the setting
            // console.log(`Setting "${settingName}" ${isEnabled ? 'enabled' : 'disabled'}`);
            
            // Show feedback
            showToast(`${settingName}を${isEnabled ? '有効' : '無効'}にしました`);
        });
    });
}

function initThemeSelector() {
    const themeInputs = document.querySelectorAll('input[name="theme"]');
    
    themeInputs.forEach(input => {
        input.addEventListener('change', function() {
            const theme = this.value;
            
            // Apply theme (this would be more complex in a real app)
            // console.log(`Theme changed to: ${theme}`);
            
            // Show feedback
            showToast(`テーマを${getThemeName(theme)}に変更しました`);
        });
    });
}

function getThemeName(theme) {
    const names = {
        'light': 'ライト',
        'dark': 'ダーク',
        'auto': 'システム設定'
    };
    return names[theme] || theme;
}

function initFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (validateForm(this)) {
                saveSettings(this);
            }
        });
    });
    
    // Real-time validation for inputs
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
    });
}

function validateForm(form) {
    let isValid = true;
    const inputs = form.querySelectorAll('.form-input[required]');
    
    inputs.forEach(input => {
        if (!validateField(input)) {
            isValid = false;
        }
    });
    
    return isValid;
}

function validateField(field) {
    const value = field.value.trim();
    const type = field.type;
    let isValid = true;
    let errorMessage = '';
    
    // Remove existing error
    removeFieldError(field);
    
    // Required validation
    if (field.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = 'この項目は必須です';
    }
    
    // Email validation
    else if (type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            errorMessage = '有効なメールアドレスを入力してください';
        }
    }
    
    // Password validation
    else if (type === 'password' && value) {
        if (value.length < 8) {
            isValid = false;
            errorMessage = 'パスワードは8文字以上である必要があります';
        }
    }
    
    if (!isValid) {
        showFieldError(field, errorMessage);
    }
    
    return isValid;
}

function showFieldError(field, message) {
    field.classList.add('error');
    field.style.borderColor = '#dc2626';
    
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.style.color = '#dc2626';
    errorElement.style.fontSize = '0.875rem';
    errorElement.style.marginTop = '4px';
    errorElement.textContent = message;
    
    field.parentNode.appendChild(errorElement);
}

function removeFieldError(field) {
    field.classList.remove('error');
    field.style.borderColor = '';
    
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
        errorElement.remove();
    }
}

function saveSettings(form) {
    // Show loading state
    const submitBtn = form.querySelector('.btn-primary');
    if (submitBtn) {
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '保存中...';
        submitBtn.disabled = true;
        
        // Simulate API call
        setTimeout(() => {
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            
            // Show success message
            showToast('設定を保存しました', 'success');
        }, 1000);
    }
}

function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#0066ff'};
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        font-weight: 500;
        transform: translateX(400px);
        transition: transform 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}

// Handle session termination
function terminateSession(button) {
    const sessionItem = button.closest('.activity-item');
    const deviceName = sessionItem.querySelector('.activity-device span').textContent;
    
    if (confirm(`${deviceName}のセッションを終了しますか？`)) {
        // Simulate API call
        button.textContent = '終了中...';
        button.disabled = true;
        
        setTimeout(() => {
            sessionItem.style.opacity = '0.5';
            sessionItem.style.pointerEvents = 'none';
            button.textContent = '終了済み';
            showToast(`${deviceName}のセッションを終了しました`);
        }, 1000);
    }
}

// Handle app integration
function toggleAppIntegration(button) {
    const appItem = button.closest('.app-item');
    const appName = appItem.querySelector('.app-details strong').textContent;
    const isConnected = button.textContent === '解除';
    
    // Simulate API call
    button.textContent = isConnected ? '解除中...' : '連携中...';
    button.disabled = true;
    
    setTimeout(() => {
        if (isConnected) {
            // Disconnect
            button.textContent = '連携';
            button.className = 'btn btn-primary btn-small';
            const status = appItem.querySelector('.app-status');
            status.textContent = '未連携';
            status.className = 'app-status';
            status.style.background = '#f3f4f6';
            status.style.color = '#6b7280';
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
    const button = document.querySelector('.data-export .btn');
    if (button) {
        const originalText = button.textContent;
        
        button.textContent = 'エクスポート中...';
        button.disabled = true;
        
        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
            showToast('データのエクスポートが完了しました', 'success');
            
            // In a real app, this would trigger a download
            // console.log('Data export completed');
        }, 2000);
    }
}

// Delete account
function deleteAccount() {
    if (confirm('アカウントを削除してもよろしいですか？この操作は元に戻せません。')) {
        if (confirm('本当に削除しますか？すべてのデータが失われます。')) {
            showToast('アカウント削除の処理を開始しました');
            // In a real app, this would redirect to a confirmation page
            // console.log('Account deletion initiated');
        }
    }
}

// Make functions globally available
window.terminateSession = terminateSession;
window.toggleAppIntegration = toggleAppIntegration;
window.exportData = exportData;
window.deleteAccount = deleteAccount;