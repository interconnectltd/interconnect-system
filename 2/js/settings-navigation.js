/**
 * Settings Navigation Enhancement
 * 設定ページのナビゲーションとトグルの改善
 */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        initializeNavigation();
        initializeToggles();
    });

    // ナビゲーションの初期化
    function initializeNavigation() {
        const navItems = document.querySelectorAll('.settings-nav-item');
        const sections = document.querySelectorAll('.settings-section');

        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();

                // Remove active class from all items
                navItems.forEach(nav => nav.classList.remove('active'));
                sections.forEach(section => section.style.display = 'none');

                // Add active class to clicked item
                this.classList.add('active');

                // Show corresponding section
                const targetId = this.getAttribute('href').substring(1);
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.style.display = 'block';
                    
                    // Smooth scroll to section
                    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }

                // Update URL hash without jumping
                history.pushState(null, null, '#' + targetId);
            });
        });

        // Handle initial hash
        const hash = window.location.hash;
        if (hash) {
            const targetNav = document.querySelector(`.settings-nav-item[href="${hash}"]`);
            if (targetNav) {
                targetNav.click();
            }
        } else {
            // Show first section by default
            if (sections.length > 0 && sections[0]) {
                sections[0].style.display = 'block';
            }
        }
    }

    // トグルスイッチの初期化
    function initializeToggles() {
        const toggleInputs = document.querySelectorAll('.toggle-input');

        toggleInputs.forEach(input => {
            // 初期状態の設定
            const slider = input.nextElementSibling;
            updateToggleState(input, slider);

            // クリックイベント
            input.addEventListener('change', function() {
                const toggleSwitch = this.closest('.toggle-switch');
                const slider = this.nextElementSibling;
                
                // ローディング状態を追加
                toggleSwitch.classList.add('loading');
                
                // 設定を保存（シミュレーション）
                setTimeout(() => {
                    toggleSwitch.classList.remove('loading');
                    updateToggleState(this, slider);
                    
                    // 成功メッセージ
                    showNotification('設定を更新しました', 'success');
                }, 500);
            });
        });
    }

    // トグル状態の更新
    function updateToggleState(input, slider) {
        if (input.checked) {
            slider.setAttribute('aria-checked', 'true');
        } else {
            slider.setAttribute('aria-checked', 'false');
        }
    }

    // 通知表示
    function showNotification(message, type = 'info') {
        // 既存の通知を削除
        const existingNotification = document.querySelector('.settings-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // 新しい通知を作成
        const notification = document.createElement('div');
        notification.className = `settings-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;

        // スタイルを追加
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            z-index: 1000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;

        if (type === 'success') {
            notification.style.color = '#10b981';
            notification.style.borderLeft = '4px solid #10b981';
        }

        document.body.appendChild(notification);

        // アニメーション
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });

        // 3秒後に削除
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

})();