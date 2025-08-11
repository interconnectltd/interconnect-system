/**
 * INTERCONNECT Core - グローバルオブジェクトの初期化
 * このファイルは他のすべてのJavaScriptファイルより前に読み込む必要があります
 */

(function() {
    'use strict';

    // グローバルINTERCONNECTオブジェクトの初期化
    if (typeof window.INTERCONNECT === 'undefined') {
        window.INTERCONNECT = {
            // バージョン情報
            version: '1.0.0',
            
            // 初期化フラグ
            initialized: false,
            
            // モジュール名前空間
            modules: {},
            
            // ユーティリティ名前空間
            utils: {},
            
            // セキュリティ名前空間
            security: {},
            
            // 設定
            config: {
                debug: false,
                apiBaseUrl: window.location.origin,
                sessionTimeout: 30 * 60 * 1000, // 30分
                maxLoginAttempts: 5,
                lockoutTime: 15 * 60 * 1000 // 15分
            },
            
            // 初期化メソッド
            init: function() {
                if (this.initialized) {
                    console.warn('INTERCONNECT already initialized');
                    return;
                }
                
                this.initialized = true;
                // console.log('INTERCONNECT Core initialized v' + this.version);
                
                // デバッグモードの設定
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('debug') === 'true') {
                    this.config.debug = true;
                }
            },
            
            // モジュール登録メソッド
            registerModule: function(name, module) {
                if (this.modules[name]) {
                    console.warn(`Module ${name} already registered`);
                    return false;
                }
                
                this.modules[name] = module;
                // console.log(`Module ${name} registered`);
                return true;
            },
            
            // デバッグログ
            log: function(...args) {
                if (this.config.debug) {
                    // console.log('[INTERCONNECT]', ...args);
                }
            },
            
            // エラーログ
            error: function(...args) {
                console.error('[INTERCONNECT ERROR]', ...args);
            }
        };
        
        // 自動初期化
        window.INTERCONNECT.init();
    }

})();