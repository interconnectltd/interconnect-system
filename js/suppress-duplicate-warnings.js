/**
 * 重複実行警告の抑制
 * console-history-loggerの設定を変更
 */

(function() {
    'use strict';
    
    // ConsoleHistoryが存在するまで待つ
    function suppressWarnings() {
        if (window.ConsoleHistory && window.ConsoleHistory.config) {
            // 重複実行警告を無効化
            window.ConsoleHistory.config.showDuplicateWarnings = false;
            console.log('[SuppressWarnings] 重複実行警告を無効化しました');
        } else {
            // まだ準備できていない場合は再試行
            setTimeout(suppressWarnings, 100);
        }
    }
    
    // DOMContentLoadedを待つ
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', suppressWarnings);
    } else {
        suppressWarnings();
    }
})();