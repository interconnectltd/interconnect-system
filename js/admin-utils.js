/**
 * Admin Utilities - 管理画面共通ユーティリティ
 * 共通関数とヘルパーメソッドを提供
 */

(function() {
    'use strict';

    // グローバル名前空間の初期化（安全な方法）
    if (typeof window.INTERCONNECT === 'undefined') {
        window.INTERCONNECT = {};
    }
    if (typeof window.INTERCONNECT.Utils === 'undefined') {
        window.INTERCONNECT.Utils = {};
    }
    
    // ユーティリティ関数の追加（既存関数を上書きしない）
    Object.assign(window.INTERCONNECT.Utils, {
        // Toast通知システム
        toast: {
            show: function(message, type = 'info', duration = 3000) {
                const toast = document.createElement('div');
                toast.className = `interconnect-toast toast-${type}`;
                
                const colors = {
                    'success': '#10b981',
                    'error': '#ef4444',
                    'warning': '#f59e0b',
                    'info': '#3b82f6'
                };
                
                const icons = {
                    'success': 'fas fa-check-circle',
                    'error': 'fas fa-exclamation-triangle',
                    'warning': 'fas fa-exclamation-circle',
                    'info': 'fas fa-info-circle'
                };
                
                toast.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    z-index: 9999;
                    transform: translateX(100%);
                    transition: transform 0.3s ease;
                    max-width: 400px;
                    border-left: 4px solid ${colors[type]};
                `;
                
                // アイコンを安全に作成
                const toastIcon = document.createElement('i');
                toastIcon.className = icons[type];
                toastIcon.style.cssText = `color: ${colors[type]}; font-size: 18px;`;
                
                // メッセージを安全に作成
                const toastMessage = document.createElement('span');
                toastMessage.style.cssText = 'color: #374151; font-weight: 500; flex: 1;';
                toastMessage.textContent = message;
                
                // 閉じるボタンを安全に作成
                const closeButton = document.createElement('button');
                closeButton.style.cssText = 'margin-left: auto; background: none; border: none; color: #9ca3af; cursor: pointer; padding: 4px;';
                closeButton.onclick = function() { toast.remove(); };
                
                const closeIcon = document.createElement('i');
                closeIcon.className = 'fas fa-times';
                closeButton.appendChild(closeIcon);
                
                // 要素を追加
                toast.appendChild(toastIcon);
                toast.appendChild(toastMessage);
                toast.appendChild(closeButton);
                
                document.body.appendChild(toast);
                
                // アニメーション
                setTimeout(() => {
                    toast.style.transform = 'translateX(0)';
                }, 100);
                
                // 自動削除
                setTimeout(() => {
                    toast.style.transform = 'translateX(100%)';
                    setTimeout(() => toast.remove(), 300);
                }, duration);
                
                return toast;
            }
        },

        // ローディング表示
        loading: {
            show: function(element, message = '読み込み中...') {
                const loader = document.createElement('div');
                loader.className = 'interconnect-loader';
                loader.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    z-index: 1000;
                    border-radius: 8px;
                `;
                
                // スピナーを安全に作成
                const spinner = document.createElement('div');
                spinner.style.cssText = `
                    width: 40px;
                    height: 40px;
                    border: 3px solid #e5e7eb;
                    border-top: 3px solid #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 12px;
                `;
                
                // メッセージを安全に作成
                const messageSpan = document.createElement('span');
                messageSpan.style.cssText = 'color: #6b7280; font-size: 14px;';
                messageSpan.textContent = message;
                
                // 要素を追加
                loader.appendChild(spinner);
                loader.appendChild(messageSpan);
                
                // スピンアニメーション追加
                if (!document.getElementById('interconnect-spin-style')) {
                    const style = document.createElement('style');
                    style.id = 'interconnect-spin-style';
                    style.textContent = `
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                element.style.position = 'relative';
                element.appendChild(loader);
                return loader;
            },
            
            hide: function(element) {
                const loader = element.querySelector('.interconnect-loader');
                if (loader) {
                    loader.remove();
                }
            }
        },

        // モーダル管理
        modal: {
            show: function(title, content, options = {}) {
                const modal = document.createElement('div');
                modal.className = 'interconnect-modal';
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                `;
                
                const modalContent = document.createElement('div');
                modalContent.style.cssText = `
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    width: 90%;
                    max-width: ${options.maxWidth || '500px'};
                    max-height: 90vh;
                    overflow-y: auto;
                    transform: scale(0.9);
                    transition: transform 0.3s ease;
                `;
                
                // ヘッダーを安全に作成
                const header = document.createElement('div');
                header.style.cssText = 'padding: 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;';
                
                const titleElement = document.createElement('h3');
                titleElement.style.cssText = 'margin: 0; font-size: 18px; font-weight: 600; color: #111827;';
                titleElement.textContent = title;
                
                const closeButton = document.createElement('button');
                closeButton.style.cssText = 'background: #f3f4f6; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280;';
                closeButton.onclick = function() { modal.remove(); };
                
                const closeIcon = document.createElement('i');
                closeIcon.className = 'fas fa-times';
                closeButton.appendChild(closeIcon);
                
                header.appendChild(titleElement);
                header.appendChild(closeButton);
                
                // コンテンツを安全に作成
                const contentDiv = document.createElement('div');
                contentDiv.style.cssText = 'padding: 24px;';
                
                // contentがHTML文字列の場合はサニタイズが必要
                if (typeof content === 'string') {
                    // シンプルなテキストの場合
                    contentDiv.textContent = content;
                } else if (content instanceof HTMLElement) {
                    // DOM要素の場合
                    contentDiv.appendChild(content);
                }
                
                // 要素を追加
                modalContent.appendChild(header);
                modalContent.appendChild(contentDiv);
                
                modal.appendChild(modalContent);
                document.body.appendChild(modal);
                
                // アニメーション
                setTimeout(() => {
                    modal.style.opacity = '1';
                    modalContent.style.transform = 'scale(1)';
                }, 10);
                
                // 背景クリックで閉じる
                modal.addEventListener('click', function(e) {
                    if (e.target === modal) {
                        modal.remove();
                    }
                });
                
                return modal;
            }
        },

        // フォームバリデーション
        validate: {
            email: function(email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            
            phone: function(phone) {
                return /^[\d\-\(\)\+\s]+$/.test(phone);
            },
            
            url: function(url) {
                try {
                    new URL(url);
                    return true;
                } catch {
                    return false;
                }
            },
            
            required: function(value) {
                return value && value.toString().trim().length > 0;
            },
            
            minLength: function(value, min) {
                return value && value.toString().length >= min;
            },
            
            maxLength: function(value, max) {
                return !value || value.toString().length <= max;
            }
        },

        // 日付・時刻ユーティリティ
        date: {
            format: function(date, format = 'YYYY-MM-DD') {
                const d = new Date(date);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                
                return format
                    .replace('YYYY', year)
                    .replace('MM', month)
                    .replace('DD', day)
                    .replace('HH', hours)
                    .replace('mm', minutes);
            },
            
            timeAgo: function(date) {
                const now = new Date();
                const diff = now - new Date(date);
                const minutes = Math.floor(diff / 60000);
                const hours = Math.floor(diff / 3600000);
                const days = Math.floor(diff / 86400000);
                
                if (minutes < 1) return 'たった今';
                if (minutes < 60) return `${minutes}分前`;
                if (hours < 24) return `${hours}時間前`;
                if (days < 7) return `${days}日前`;
                return this.format(date, 'MM-DD');
            }
        },

        // ストレージ管理
        storage: {
            get: function(key, defaultValue = null) {
                try {
                    const value = localStorage.getItem(`interconnect_${key}`);
                    return value ? JSON.parse(value) : defaultValue;
                } catch (e) {
                    return defaultValue;
                }
            },
            
            set: function(key, value) {
                try {
                    localStorage.setItem(`interconnect_${key}`, JSON.stringify(value));
                    return true;
                } catch (e) {
                    console.error('Storage error:', e);
                    return false;
                }
            },
            
            remove: function(key) {
                localStorage.removeItem(`interconnect_${key}`);
            },
            
            clear: function() {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('interconnect_')) {
                        localStorage.removeItem(key);
                    }
                });
            }
        },

        // DOM操作ヘルパー
        dom: {
            ready: function(callback) {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', callback);
                } else {
                    callback();
                }
            },
            
            createElement: function(tag, attributes = {}, content = '') {
                const element = document.createElement(tag);
                
                Object.keys(attributes).forEach(key => {
                    if (key === 'style' && typeof attributes[key] === 'object') {
                        Object.assign(element.style, attributes[key]);
                    } else {
                        element.setAttribute(key, attributes[key]);
                    }
                });
                
                if (content) {
                    // contentが文字列の場合はテキストとして設定
                    if (typeof content === 'string') {
                        element.textContent = content;
                    } else if (content instanceof HTMLElement) {
                        element.appendChild(content);
                    }
                }
                
                return element;
            },
            
            addEventListenerOnce: function(element, event, handler) {
                if (!element.dataset.listenerAdded) {
                    element.addEventListener(event, handler);
                    element.dataset.listenerAdded = 'true';
                }
            }
        },

        // パフォーマンス監視
        performance: {
            measure: function(name, fn) {
                const start = performance.now();
                const result = fn();
                const end = performance.now();
                console.log(`⏱️ ${name}: ${Math.round(end - start)}ms`);
                return result;
            },
            
            debounce: function(func, wait) {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        clearTimeout(timeout);
                        func(...args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            },
            
            throttle: function(func, limit) {
                let inThrottle;
                return function() {
                    const args = arguments;
                    const context = this;
                    if (!inThrottle) {
                        func.apply(context, args);
                        inThrottle = true;
                        setTimeout(() => inThrottle = false, limit);
                    }
                };
            }
        },

        // 数値フォーマット
        format: {
            number: function(num, locale = 'ja-JP') {
                return new Intl.NumberFormat(locale).format(num);
            },
            
            currency: function(num, currency = 'JPY', locale = 'ja-JP') {
                return new Intl.NumberFormat(locale, {
                    style: 'currency',
                    currency: currency
                }).format(num);
            },
            
            percentage: function(num, decimals = 1) {
                return `${Number(num).toFixed(decimals)}%`;
            },
            
            bytes: function(bytes, decimals = 2) {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const dm = decimals < 0 ? 0 : decimals;
                const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
            }
        }
    });

    // 統一ログアウト関数
    // NOTE: global-functions.js の window.logout を使用してください
    // この実装は古いバージョンのため無効化されています
    /*
    window.INTERCONNECT.logout = function() {
        if (confirm('ログアウトしますか？')) {
            window.INTERCONNECT.Utils.toast.show('ログアウトしています...', 'info');
            
            // セッションデータクリア
            sessionStorage.clear();
            window.INTERCONNECT.Utils.storage.clear();
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    };
    */

    console.log('✅ INTERCONNECT Utils loaded');

})();