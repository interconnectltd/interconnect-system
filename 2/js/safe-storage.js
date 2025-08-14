/**
 * Safe Storage Utilities
 * localStorage/sessionStorageの安全なアクセス
 */

(function() {
    'use strict';

    // ストレージが利用可能かチェック
    function isStorageAvailable(storage) {
        try {
            const testKey = '__storage_test__';
            storage.setItem(testKey, 'test');
            storage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }

    // 安全なストレージラッパー
    class SafeStorage {
        constructor(storage) {
            this.storage = storage;
            this.available = storage ? isStorageAvailable(storage) : false;
            this.prefix = 'interconnect_'; // キーのプレフィックス
        }

        // キーにプレフィックスを付ける
        _key(key) {
            return this.prefix + key;
        }

        // アイテムを取得
        getItem(key, defaultValue = null) {
            if (!this.available) {
                console.warn('Storage not available');
                return defaultValue;
            }

            try {
                const value = this.storage.getItem(this._key(key));
                return value !== null ? value : defaultValue;
            } catch (e) {
                console.error('Storage getItem error:', e);
                return defaultValue;
            }
        }

        // JSONとして取得
        getJSON(key, defaultValue = null) {
            const value = this.getItem(key);
            if (value === null) return defaultValue;

            try {
                return JSON.parse(value);
            } catch (e) {
                console.error('JSON parse error in storage:', e);
                return defaultValue;
            }
        }

        // アイテムを設定
        setItem(key, value) {
            if (!this.available) {
                console.warn('Storage not available');
                return false;
            }

            try {
                this.storage.setItem(this._key(key), String(value));
                return true;
            } catch (e) {
                // クォータ超過エラーの場合
                if (e.name === 'QuotaExceededError') {
                    console.error('Storage quota exceeded');
                    // 古いデータを削除して再試行
                    this._cleanupOldData();
                    try {
                        this.storage.setItem(this._key(key), String(value));
                        return true;
                    } catch (retryError) {
                        console.error('Storage setItem retry failed:', retryError);
                        return false;
                    }
                }
                console.error('Storage setItem error:', e);
                return false;
            }
        }

        // JSONとして設定
        setJSON(key, value) {
            try {
                const jsonString = JSON.stringify(value);
                return this.setItem(key, jsonString);
            } catch (e) {
                console.error('JSON stringify error:', e);
                return false;
            }
        }

        // アイテムを削除
        removeItem(key) {
            if (!this.available) {
                console.warn('Storage not available');
                return false;
            }

            try {
                this.storage.removeItem(this._key(key));
                return true;
            } catch (e) {
                console.error('Storage removeItem error:', e);
                return false;
            }
        }

        // すべてクリア（プレフィックス付きのみ）
        clear() {
            if (!this.available) {
                console.warn('Storage not available');
                return false;
            }

            try {
                const keysToRemove = [];
                for (let i = 0; i < this.storage.length; i++) {
                    const key = this.storage.key(i);
                    if (key && key.startsWith(this.prefix)) {
                        keysToRemove.push(key);
                    }
                }

                keysToRemove.forEach(key => {
                    this.storage.removeItem(key);
                });

                return true;
            } catch (e) {
                console.error('Storage clear error:', e);
                return false;
            }
        }

        // キーの存在確認
        hasItem(key) {
            return this.getItem(key) !== null;
        }

        // ストレージのサイズを取得（概算）
        getSize() {
            if (!this.available) return 0;

            let size = 0;
            try {
                for (let i = 0; i < this.storage.length; i++) {
                    const key = this.storage.key(i);
                    if (key && key.startsWith(this.prefix)) {
                        const value = this.storage.getItem(key);
                        size += key.length + (value ? value.length : 0);
                    }
                }
            } catch (e) {
                console.error('Storage size calculation error:', e);
            }
            return size;
        }

        // 古いデータを削除（クォータ超過時の対策）
        _cleanupOldData() {
            try {
                // タイムスタンプ付きのキーを探して古いものから削除
                const timestampedKeys = [];
                
                for (let i = 0; i < this.storage.length; i++) {
                    const key = this.storage.key(i);
                    if (key && key.startsWith(this.prefix)) {
                        const value = this.storage.getItem(key);
                        try {
                            const data = JSON.parse(value);
                            if (data && data._timestamp) {
                                timestampedKeys.push({ key, timestamp: data._timestamp });
                            }
                        } catch (e) {
                            // JSONでない場合は無視
                        }
                    }
                }

                // 古い順にソート
                timestampedKeys.sort((a, b) => a.timestamp - b.timestamp);

                // 古いものから20%削除
                const removeCount = Math.ceil(timestampedKeys.length * 0.2);
                for (let i = 0; i < removeCount && i < timestampedKeys.length; i++) {
                    this.storage.removeItem(timestampedKeys[i].key);
                }
            } catch (e) {
                console.error('Cleanup error:', e);
            }
        }

        // タイムスタンプ付きで保存
        setItemWithTimestamp(key, value) {
            const data = {
                value: value,
                _timestamp: Date.now()
            };
            return this.setJSON(key, data);
        }

        // タイムスタンプ付きで取得
        getItemWithTimestamp(key, defaultValue = null) {
            const data = this.getJSON(key);
            if (data && data.value !== undefined) {
                return data.value;
            }
            return defaultValue;
        }

        // 有効期限付きで保存
        setItemWithExpiry(key, value, expiryMs) {
            const data = {
                value: value,
                _expiry: Date.now() + expiryMs
            };
            return this.setJSON(key, data);
        }

        // 有効期限をチェックして取得
        getItemWithExpiry(key, defaultValue = null) {
            const data = this.getJSON(key);
            if (data && data.value !== undefined && data._expiry) {
                if (Date.now() < data._expiry) {
                    return data.value;
                } else {
                    // 期限切れなので削除
                    this.removeItem(key);
                }
            }
            return defaultValue;
        }
    }

    // グローバルに公開
    try {
        window.safeLocalStorage = new SafeStorage(typeof localStorage !== 'undefined' ? localStorage : null);
        window.safeSessionStorage = new SafeStorage(typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    } catch (e) {
        console.error('SafeStorage initialization error:', e);
        // フォールバック
        window.safeLocalStorage = new SafeStorage(null);
        window.safeSessionStorage = new SafeStorage(null);
    }

    // 互換性のためのエイリアス
    window.SafeStorage = {
        local: window.safeLocalStorage,
        session: window.safeSessionStorage
    };

})();