/**
 * Admin Site Settings JavaScript
 * サイト設定管理用JavaScript
 */

(function() {
    'use strict';

    // Settings state management
    const SettingsManager = {
        currentSection: 'basic-info',
        originalData: {},
        modifiedData: {},
        isDirty: false,
        autoSave: true,
        autoSaveInterval: null
    };

    /**
     * Initialize settings page
     */
    document.addEventListener('DOMContentLoaded', function() {
        initializeNavigation();
        initializeFormHandlers();
        initializeAutoSave();
        initializeKeyboardShortcuts();
        loadSettingsData();
        
        // console.log('✅ Site Settings initialized');
    });

    /**
     * Navigation between settings sections
     */
    function initializeNavigation() {
        const navLinks = document.querySelectorAll('.settings-nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const section = this.getAttribute('data-section');
                navigateToSection(section);
            });
        });
    }

    function navigateToSection(section) {
        // Check for unsaved changes
        if (SettingsManager.isDirty) {
            if (!confirm('未保存の変更があります。移動しますか？')) {
                return;
            }
        }

        // Update navigation
        document.querySelectorAll('.settings-nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-section="${section}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Update content
        document.querySelectorAll('.settings-section').forEach(sectionEl => {
            sectionEl.classList.remove('active');
        });

        const targetSection = document.getElementById(section);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        SettingsManager.currentSection = section;
        
        // Reset dirty state
        SettingsManager.isDirty = false;
        updateSaveButtonState();
    }

    /**
     * Form handling and validation
     */
    function initializeFormHandlers() {
        // Basic form inputs
        const inputs = document.querySelectorAll('.form-input, .form-textarea, .form-select');
        inputs.forEach(input => {
            input.addEventListener('input', handleInputChange);
            input.addEventListener('blur', validateInput);
        });

        // File inputs
        const fileInputs = document.querySelectorAll('.file-input');
        fileInputs.forEach(input => {
            input.addEventListener('change', handleFileChange);
        });

        // Toggle switches
        const toggles = document.querySelectorAll('.toggle-switch input');
        toggles.forEach(toggle => {
            toggle.addEventListener('change', handleToggleChange);
        });

        // List editors
        initializeListEditors();

        // Service card toggles
        const cardToggles = document.querySelectorAll('.toggle-card');
        cardToggles.forEach(toggle => {
            toggle.addEventListener('click', function() {
                const card = this.closest('.service-card-editor');
                card.classList.toggle('collapsed');
            });
        });

        // Save buttons
        const saveButtons = document.querySelectorAll('[id^="save"], .btn-primary');
        saveButtons.forEach(button => {
            if (button.textContent.includes('保存')) {
                button.addEventListener('click', handleSave);
            }
        });

        // Character counting
        initializeCharacterCounting();

        // Icon preview
        initializeIconPreview();
    }

    function handleInputChange(e) {
        const input = e.target;
        const section = input.closest('.settings-section').id;
        const fieldName = input.id || input.name;
        
        // Mark as modified
        SettingsManager.isDirty = true;
        input.classList.add('modified');
        
        // Store change
        if (!SettingsManager.modifiedData[section]) {
            SettingsManager.modifiedData[section] = {};
        }
        SettingsManager.modifiedData[section][fieldName] = input.value;
        
        updateSaveButtonState();
        
        // Show real-time preview for certain fields
        if (fieldName === 'site-title') {
            updatePreview('title', input.value);
        }
    }

    function validateInput(e) {
        const input = e.target;
        const value = input.value.trim();
        
        // Remove existing validation classes
        input.classList.remove('invalid', 'valid');
        
        // Basic validation rules
        let isValid = true;
        let errorMessage = '';
        
        if (input.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'この項目は必須です';
        } else if (input.type === 'email' && value && !isValidEmail(value)) {
            isValid = false;
            errorMessage = '有効なメールアドレスを入力してください';
        } else if (input.type === 'tel' && value && !isValidPhone(value)) {
            isValid = false;
            errorMessage = '有効な電話番号を入力してください';
        } else if (input.type === 'url' && value && !isValidURL(value)) {
            isValid = false;
            errorMessage = '有効なURLを入力してください';
        }
        
        // Apply validation styling
        input.classList.add(isValid ? 'valid' : 'invalid');
        
        // Show/hide error message
        let errorEl = input.parentNode.querySelector('.error-message');
        if (!isValid) {
            if (!errorEl) {
                errorEl = document.createElement('div');
                errorEl.className = 'error-message';
                input.parentNode.appendChild(errorEl);
            }
            errorEl.textContent = errorMessage;
        } else if (errorEl) {
            errorEl.remove();
        }
        
        return isValid;
    }

    function handleFileChange(e) {
        const input = e.target;
        const file = input.files[0];
        
        if (file) {
            const display = input.parentNode.querySelector('.file-input-display span');
            if (display) {
                display.textContent = file.name;
            }
            
            // Preview for images
            if (file.type.startsWith('image/')) {
                previewImage(file, input);
            }
            
            handleInputChange(e);
        }
    }

    function handleToggleChange(e) {
        const toggle = e.target;
        const section = toggle.closest('.settings-section').id;
        const fieldName = toggle.closest('.form-group').querySelector('label').textContent;
        
        SettingsManager.isDirty = true;
        
        if (!SettingsManager.modifiedData[section]) {
            SettingsManager.modifiedData[section] = {};
        }
        SettingsManager.modifiedData[section][fieldName] = toggle.checked;
        
        updateSaveButtonState();
    }

    function handleSave(e) {
        e.preventDefault();
        
        const button = e.target;
        const section = button.closest('.settings-section');
        const sectionId = section ? section.id : 'all';
        
        // Validate all inputs in section
        const inputs = section ? section.querySelectorAll('.form-input, .form-textarea') 
                               : document.querySelectorAll('.form-input, .form-textarea');
        
        let isValid = true;
        inputs.forEach(input => {
            if (!validateInput({ target: input })) {
                isValid = false;
            }
        });
        
        if (!isValid) {
            showToast('入力内容に誤りがあります。確認してください。', 'error');
            return;
        }
        
        // Show saving state
        button.classList.add('loading');
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
        
        // Simulate save
        setTimeout(() => {
            saveSettings(sectionId).then(() => {
                // Success
                button.classList.remove('loading');
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-check"></i> 保存完了';
                
                // Reset button after delay
                setTimeout(() => {
                    button.innerHTML = '<i class="fas fa-save"></i> 保存';
                }, 2000);
                
                // Mark as saved
                inputs.forEach(input => {
                    input.classList.remove('modified');
                    input.classList.add('saved');
                    setTimeout(() => input.classList.remove('saved'), 1000);
                });
                
                SettingsManager.isDirty = false;
                updateSaveButtonState();
                
                showToast('設定を保存しました', 'success');
                
            }).catch(error => {
                // Error
                button.classList.remove('loading');
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 保存失敗';
                
                setTimeout(() => {
                    button.innerHTML = '<i class="fas fa-save"></i> 保存';
                }, 3000);
                
                showToast('保存に失敗しました: ' + error.message, 'error');
            });
        }, 1000);
    }

    /**
     * List editor functionality
     */
    function initializeListEditors() {
        const addButtons = document.querySelectorAll('.add-list-item');
        addButtons.forEach(button => {
            button.addEventListener('click', function() {
                const listEditor = this.parentNode;
                addListItem(listEditor);
            });
        });

        const removeButtons = document.querySelectorAll('.remove-item');
        removeButtons.forEach(button => {
            button.addEventListener('click', function() {
                removeListItem(this.parentNode);
            });
        });
    }

    function addListItem(listEditor) {
        const newItem = document.createElement('div');
        newItem.className = 'list-item';
        newItem.innerHTML = `
            <input type="text" class="form-input" placeholder="新しい項目">
            <button type="button" class="btn btn-sm btn-danger remove-item">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        const addButton = listEditor.querySelector('.add-list-item');
        listEditor.insertBefore(newItem, addButton);
        
        // Add event listeners
        const input = newItem.querySelector('.form-input');
        const removeBtn = newItem.querySelector('.remove-item');
        
        input.addEventListener('input', handleInputChange);
        removeBtn.addEventListener('click', function() {
            removeListItem(newItem);
        });
        
        // Focus new input
        input.focus();
        
        // Mark as modified
        SettingsManager.isDirty = true;
        updateSaveButtonState();
    }

    function removeListItem(item) {
        if (confirm('この項目を削除しますか？')) {
            item.remove();
            SettingsManager.isDirty = true;
            updateSaveButtonState();
        }
    }

    /**
     * Character counting
     */
    function initializeCharacterCounting() {
        const countedInputs = document.querySelectorAll('.form-input[id*="meta"], .form-textarea[id*="meta"]');
        
        countedInputs.forEach(input => {
            const counter = input.parentNode.querySelector('.character-count .current');
            if (counter) {
                updateCharacterCount(input, counter);
                input.addEventListener('input', () => updateCharacterCount(input, counter));
            }
        });
    }

    function updateCharacterCount(input, counter) {
        const count = input.value.length;
        counter.textContent = count;
        
        // Add warning class if approaching limit
        const maxEl = counter.parentNode.querySelector('.max');
        const max = parseInt(maxEl.textContent);
        
        counter.parentNode.classList.toggle('warning', count > max * 0.8);
        counter.parentNode.classList.toggle('danger', count > max);
    }

    /**
     * Icon preview
     */
    function initializeIconPreview() {
        const iconInputs = document.querySelectorAll('.icon-input');
        
        iconInputs.forEach(input => {
            input.addEventListener('input', function() {
                const preview = this.parentNode.querySelector('.icon-preview i');
                if (preview) {
                    preview.className = this.value || 'fas fa-question';
                }
            });
        });
    }

    /**
     * Auto-save functionality
     */
    function initializeAutoSave() {
        if (SettingsManager.autoSave) {
            SettingsManager.autoSaveInterval = setInterval(() => {
                if (SettingsManager.isDirty) {
                    autoSaveSettings();
                }
            }, 30000); // Auto-save every 30 seconds
        }
    }

    function autoSaveSettings() {
        const timestamp = new Date().toLocaleTimeString();
        // console.log(`🔄 Auto-saving at ${timestamp}`);
        
        // Save to localStorage as backup
        localStorage.setItem('interconnect_settings_backup', JSON.stringify({
            data: SettingsManager.modifiedData,
            timestamp: Date.now()
        }));
        
        showToast('設定を自動保存しました', 'info', 2000);
    }

    /**
     * Keyboard shortcuts
     */
    function initializeKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Ctrl/Cmd + S for save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                const saveBtn = document.querySelector(`#${SettingsManager.currentSection} .btn-primary`);
                if (saveBtn) {
                    saveBtn.click();
                }
            }
            
            // Ctrl/Cmd + Z for undo (reset field)
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.target.classList.contains('form-input')) {
                e.preventDefault();
                resetField(e.target);
            }
        });
    }

    /**
     * Data management
     */
    function loadSettingsData() {
        // Load from localStorage backup if available
        const backup = localStorage.getItem('interconnect_settings_backup');
        if (backup) {
            try {
                const backupData = JSON.parse(backup);
                const age = Date.now() - backupData.timestamp;
                
                // If backup is less than 1 hour old, offer to restore
                if (age < 3600000 && confirm('未保存の設定データが見つかりました。復元しますか？')) {
                    SettingsManager.modifiedData = backupData.data;
                    restoreFormData();
                }
            } catch (e) {
                console.warn('Failed to load backup data:', e);
            }
        }
        
        // Load original data (simulate API call)
        SettingsManager.originalData = getCurrentFormData();
    }

    function getCurrentFormData() {
        const data = {};
        const sections = document.querySelectorAll('.settings-section');
        
        sections.forEach(section => {
            const sectionId = section.id;
            data[sectionId] = {};
            
            const inputs = section.querySelectorAll('.form-input, .form-textarea, .form-select');
            inputs.forEach(input => {
                const fieldName = input.id || input.name;
                data[sectionId][fieldName] = input.value;
            });
            
            const toggles = section.querySelectorAll('.toggle-switch input');
            toggles.forEach(toggle => {
                const fieldName = toggle.closest('.form-group').querySelector('label').textContent;
                data[sectionId][fieldName] = toggle.checked;
            });
        });
        
        return data;
    }

    function restoreFormData() {
        Object.keys(SettingsManager.modifiedData).forEach(sectionId => {
            const sectionData = SettingsManager.modifiedData[sectionId];
            Object.keys(sectionData).forEach(fieldName => {
                const input = document.getElementById(fieldName);
                if (input) {
                    input.value = sectionData[fieldName];
                    input.classList.add('modified');
                }
            });
        });
        
        SettingsManager.isDirty = true;
        updateSaveButtonState();
    }

    function resetField(input) {
        const section = input.closest('.settings-section').id;
        const fieldName = input.id || input.name;
        
        if (SettingsManager.originalData[section] && SettingsManager.originalData[section][fieldName]) {
            input.value = SettingsManager.originalData[section][fieldName];
            input.classList.remove('modified');
            
            // Remove from modified data
            if (SettingsManager.modifiedData[section]) {
                delete SettingsManager.modifiedData[section][fieldName];
            }
            
            showToast('フィールドをリセットしました', 'info');
        }
    }

    function saveSettings(sectionId) {
        return new Promise((resolve, reject) => {
            // Simulate API call
            const data = sectionId === 'all' ? SettingsManager.modifiedData 
                                             : { [sectionId]: SettingsManager.modifiedData[sectionId] };
            
            // console.log('Saving settings:', data);
            
            // Simulate network delay and potential error
            setTimeout(() => {
                if (Math.random() > 0.1) { // 90% success rate
                    resolve();
                } else {
                    reject(new Error('ネットワークエラー'));
                }
            }, 500);
        });
    }

    /**
     * Utility functions
     */
    function updateSaveButtonState() {
        const saveButtons = document.querySelectorAll('.btn-primary');
        saveButtons.forEach(button => {
            if (button.textContent.includes('保存')) {
                button.disabled = !SettingsManager.isDirty;
                button.classList.toggle('pulse', SettingsManager.isDirty);
            }
        });
    }

    function updatePreview(type, value) {
        // Update live preview (if preview panel exists)
        const preview = document.querySelector('.live-preview');
        if (preview) {
            switch(type) {
                case 'title':
                    const titleEl = preview.querySelector('h1');
                    if (titleEl) titleEl.textContent = value;
                    break;
            }
        }
    }

    function previewImage(file, input) {
        const reader = new FileReader();
        reader.onload = function(e) {
            let preview = input.parentNode.querySelector('.image-preview');
            if (!preview) {
                preview = document.createElement('div');
                preview.className = 'image-preview';
                input.parentNode.appendChild(preview);
            }
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 150px; border-radius: 8px; margin-top: 10px;">`;
        };
        reader.readAsDataURL(file);
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidPhone(phone) {
        return /^[\d\-\(\)\+\s]+$/.test(phone);
    }

    function isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 1080;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 350px;
        `;
        
        const icon = {
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-triangle',
            'warning': 'fas fa-exclamation-circle',
            'info': 'fas fa-info-circle'
        }[type] || 'fas fa-info-circle';
        
        const color = {
            'success': '#10b981',
            'error': '#ef4444',
            'warning': '#f59e0b',
            'info': '#3b82f6'
        }[type] || '#3b82f6';
        
        toast.innerHTML = `
            <i class="${icon}" style="color: ${color}; font-size: 18px;"></i>
            <span style="color: #374151; font-weight: 500;">${message}</span>
            <button onclick="this.parentNode.remove()" style="margin-left: auto; background: none; border: none; color: #9ca3af; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Export functions for external use
     */
    window.AdminSettings = {
        navigateToSection,
        saveSettings,
        resetField,
        getCurrentFormData
    };

    /**
     * Cleanup on page unload
     */
    window.addEventListener('beforeunload', function(e) {
        if (SettingsManager.isDirty) {
            e.preventDefault();
            e.returnValue = '未保存の変更があります。';
        }
        
        // Clear auto-save interval
        if (SettingsManager.autoSaveInterval) {
            clearInterval(SettingsManager.autoSaveInterval);
        }
    });

})();