/**
 * Enhanced User Menu Functionality
 * ユーザーメニューの改善版 - z-index問題を修正
 */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        initializeUserMenus();
    });

    function initializeUserMenus() {
        // すべてのユーザーメニューボタンを取得
        const userMenuButtons = document.querySelectorAll('.user-menu-btn');
        
        userMenuButtons.forEach(button => {
            const userMenu = button.closest('.user-menu');
            if (!userMenu) return;
            
            let dropdown = userMenu.querySelector('.user-dropdown');
            
            // ドロップダウンが存在しない場合はスキップ
            if (!dropdown) return;
            
            // バックドロップを作成
            let backdrop = document.querySelector('.user-dropdown-backdrop');
            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.className = 'user-dropdown-backdrop';
                document.body.appendChild(backdrop);
            }
            
            // ボタンクリックイベント
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // 他のドロップダウンを閉じる
                closeAllDropdowns(dropdown);
                
                // トグル
                const isOpen = dropdown.classList.contains('show');
                if (isOpen) {
                    closeDropdown(dropdown, backdrop);
                } else {
                    openDropdown(dropdown, backdrop, button);
                }
            });
            
            // ドロップダウン内のクリックは閉じない
            dropdown.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        });
        
        // 外部クリックで閉じる
        document.addEventListener('click', function() {
            closeAllDropdowns();
        });
        
        // ESCキーで閉じる
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeAllDropdowns();
            }
        });
    }
    
    // ドロップダウンを開く
    function openDropdown(dropdown, backdrop, button) {
        // 位置を調整
        adjustDropdownPosition(dropdown, button);
        
        // 表示
        dropdown.classList.add('show');
        backdrop.classList.add('show');
        
        // アクセシビリティ
        button.setAttribute('aria-expanded', 'true');
        
        // フォーカス管理
        const firstLink = dropdown.querySelector('a');
        if (firstLink) {
            setTimeout(() => firstLink.focus(), 100);
        }
    }
    
    // ドロップダウンを閉じる
    function closeDropdown(dropdown, backdrop) {
        dropdown.classList.remove('show');
        if (backdrop) {
            backdrop.classList.remove('show');
        }
        
        // アクセシビリティ
        const button = dropdown.closest('.user-menu').querySelector('.user-menu-btn');
        if (button) {
            button.setAttribute('aria-expanded', 'false');
        }
    }
    
    // すべてのドロップダウンを閉じる
    function closeAllDropdowns(except = null) {
        const dropdowns = document.querySelectorAll('.user-dropdown.show');
        const backdrop = document.querySelector('.user-dropdown-backdrop');
        
        dropdowns.forEach(dropdown => {
            if (dropdown !== except) {
                closeDropdown(dropdown, backdrop);
            }
        });
    }
    
    // ドロップダウンの位置を調整
    function adjustDropdownPosition(dropdown, button) {
        const rect = button.getBoundingClientRect();
        const dropdownRect = dropdown.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // モバイルの場合
        if (viewportWidth <= 768) {
            // CSSで位置が設定されているのでそのまま
            return;
        }
        
        // デスクトップの場合の位置調整
        // 右端からはみ出る場合
        if (rect.right - dropdownRect.width < 0) {
            dropdown.style.right = '0';
            dropdown.style.left = 'auto';
        }
        
        // 下端からはみ出る場合
        if (rect.bottom + dropdownRect.height > viewportHeight) {
            dropdown.style.bottom = '100%';
            dropdown.style.top = 'auto';
            dropdown.style.marginBottom = 'var(--space-sm)';
            dropdown.style.marginTop = '0';
        }
    }
    
    // キーボードナビゲーション
    document.addEventListener('keydown', function(e) {
        const activeDropdown = document.querySelector('.user-dropdown.show');
        if (!activeDropdown) return;
        
        const links = Array.from(activeDropdown.querySelectorAll('a'));
        const currentIndex = links.indexOf(document.activeElement);
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = currentIndex + 1 < links.length ? currentIndex + 1 : 0;
            links[nextIndex].focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : links.length - 1;
            links[prevIndex].focus();
        }
    });

})();