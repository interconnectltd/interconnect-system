/**
 * Dashboard Load Order Optimizer
 * スクリプトの読み込み順序と競合を管理
 */

// 即座に実行してChrome拡張機能エラーを抑制
(function() {
    'use strict';
    
    // 最初にコンソールエラーを抑制
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = function(...args) {
        const errorString = args.map(arg => String(arg)).join(' ');
        const ignoredPatterns = [
            'runtime.lastError',
            'message port closed',
            'Extension context invalidated',
            'chrome-extension://',
            'AUTORO Assistant'
        ];
        
        if (ignoredPatterns.some(pattern => errorString.includes(pattern))) {
            return;
        }
        
        originalError.apply(console, args);
    };
    
    console.warn = function(...args) {
        const warnString = args.map(arg => String(arg)).join(' ');
        if (warnString.includes('chrome-extension://')) {
            return;
        }
        originalWarn.apply(console, args);
    };
    
    console.log('[LoadOptimizer] コンソールエラー抑制を適用');
})();