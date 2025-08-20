/**
 * コンソール履歴管理システム
 * 
 * 機能：
 * 1. すべてのコンソールログをタイムスタンプ付きで記録
 * 2. 関数呼び出し回数の追跡
 * 3. 重複実行の検出と警告
 * 4. エラー発生パターンの分析
 * 5. Service Workerログのフィルタリング
 */

(function() {
    'use strict';

    // 履歴管理オブジェクト
    window.ConsoleHistory = {
        logs: [],
        functionCalls: {},
        errors: [],
        warnings: [],
        startTime: Date.now(),
        maxLogs: 1000, // 最大ログ保持数
        
        // 設定
        config: {
            trackFunctionCalls: true,
            filterServiceWorker: true,
            showDuplicateWarnings: true,
            logToLocalStorage: true
        }
    };

    // オリジナルのconsoleメソッドを保存（既に保存されていれば再利用）
    if (!window.__originalConsole) {
        window.__originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info,
            debug: console.debug
        };
    }
    const originalConsole = window.__originalConsole;
    
    // console上書きフラグをセット
    window.__consoleAlreadyWrapped = true;

    // タイムスタンプフォーマット
    function getTimestamp() {
        const now = new Date();
        const elapsed = Date.now() - window.ConsoleHistory.startTime;
        return {
            time: now.toLocaleTimeString('ja-JP', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                fractionalSecondDigits: 3 
            }),
            elapsed: `+${(elapsed / 1000).toFixed(3)}s`
        };
    }

    // スタックトレースから呼び出し元を取得
    function getCallerInfo() {
        const stack = new Error().stack;
        const lines = stack.split('\n');
        // console.logの呼び出し元を探す（3-4行目あたり）
        for (let i = 3; i < Math.min(lines.length, 6); i++) {
            const line = lines[i];
            if (line && !line.includes('console-history-logger.js')) {
                const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)/);
                if (match) {
                    return {
                        function: match[1] || 'anonymous',
                        file: match[2].split('/').pop(),
                        line: match[3],
                        column: match[4]
                    };
                }
            }
        }
        return null;
    }

    // Service Workerログをフィルタリング
    function shouldFilterLog(args) {
        if (!window.ConsoleHistory.config.filterServiceWorker) return false;
        
        const message = args.join(' ');
        const serviceWorkerPatterns = [
            'Skipping cache for invalid URL scheme: chrome-extension',
            'Service Worker:',
            'SW:',
            'serviceWorker'
        ];
        
        return serviceWorkerPatterns.some(pattern => message.includes(pattern));
    }

    // 関数呼び出しを追跡
    function trackFunctionCall(callerInfo) {
        if (!callerInfo || !window.ConsoleHistory.config.trackFunctionCalls) return;
        
        const key = `${callerInfo.function}@${callerInfo.file}:${callerInfo.line}`;
        if (!window.ConsoleHistory.functionCalls[key]) {
            window.ConsoleHistory.functionCalls[key] = {
                count: 0,
                firstCall: Date.now(),
                lastCall: null,
                function: callerInfo.function,
                location: `${callerInfo.file}:${callerInfo.line}`
            };
        }
        
        const callInfo = window.ConsoleHistory.functionCalls[key];
        callInfo.count++;
        callInfo.lastCall = Date.now();
        
        // 短時間での重複実行を検出
        if (callInfo.count > 1 && callInfo.lastCall - callInfo.firstCall < 1000) {
            if (window.ConsoleHistory.config.showDuplicateWarnings) {
                originalConsole.warn(
                    `⚠️ [重複実行検出] ${callerInfo.function} が ${callInfo.count}回実行されました`,
                    `場所: ${callerInfo.file}:${callerInfo.line}`
                );
            }
        }
    }

    // ログエントリを作成
    function createLogEntry(type, args, callerInfo) {
        const timestamp = getTimestamp();
        const entry = {
            type,
            timestamp: timestamp.time,
            elapsed: timestamp.elapsed,
            message: args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' '),
            caller: callerInfo,
            raw: args
        };
        
        return entry;
    }

    // ログを保存
    function saveLog(entry) {
        window.ConsoleHistory.logs.push(entry);
        
        // 最大数を超えたら古いログを削除
        if (window.ConsoleHistory.logs.length > window.ConsoleHistory.maxLogs) {
            window.ConsoleHistory.logs.shift();
        }
        
        // エラーと警告は別途保存
        if (entry.type === 'error') {
            window.ConsoleHistory.errors.push(entry);
        } else if (entry.type === 'warn') {
            window.ConsoleHistory.warnings.push(entry);
        }
        
        // LocalStorageに保存（オプション）
        if (window.ConsoleHistory.config.logToLocalStorage) {
            try {
                localStorage.setItem('console-history-latest', JSON.stringify(entry));
            } catch (e) {
                // ストレージエラーは無視
            }
        }
    }

    // consoleメソッドをオーバーライド
    function overrideConsoleMethod(method) {
        console[method] = function(...args) {
            // Service Workerログをフィルタリング
            if (shouldFilterLog(args)) {
                return;
            }
            
            // コメントアウトされたログを検出してスキップ
            const callerInfo = getCallerInfo();
            if (callerInfo && callerInfo.file) {
                // スタックトレースにコメント記号が含まれている場合はスキップ
                const stack = new Error().stack;
                if (stack && stack.includes('//')) {
                    // コメントアウトされた行からの呼び出しの可能性があるため無視
                    return;
                }
            }
            
            trackFunctionCall(callerInfo);
            
            const entry = createLogEntry(method, args, callerInfo);
            saveLog(entry);
            
            // オリジナルのconsoleメソッドを呼び出し
            originalConsole[method].apply(console, args);
        };
    }

    // すべてのconsoleメソッドをオーバーライド
    Object.keys(originalConsole).forEach(method => {
        overrideConsoleMethod(method);
    });

    // ユーティリティ関数
    window.ConsoleHistory.utils = {
        // 履歴をクリア
        clear() {
            window.ConsoleHistory.logs = [];
            window.ConsoleHistory.functionCalls = {};
            window.ConsoleHistory.errors = [];
            window.ConsoleHistory.warnings = [];
            originalConsole.log('📋 コンソール履歴をクリアしました');
        },
        
        // 履歴を表示
        show(filter = null) {
            const logs = filter 
                ? window.ConsoleHistory.logs.filter(log => log.type === filter)
                : window.ConsoleHistory.logs;
                
            originalConsole.log('📋 === コンソール履歴 ===');
            logs.forEach(log => {
                const caller = log.caller ? `[${log.caller.function} @ ${log.caller.file}:${log.caller.line}]` : '';
                originalConsole.log(`${log.timestamp} ${log.elapsed} [${log.type}] ${caller} ${log.message}`);
            });
            originalConsole.log(`合計: ${logs.length}件`);
        },
        
        // エラーのみ表示
        showErrors() {
            this.show('error');
        },
        
        // 関数呼び出し統計を表示
        showFunctionStats() {
            originalConsole.log('📊 === 関数呼び出し統計 ===');
            const sorted = Object.entries(window.ConsoleHistory.functionCalls)
                .sort((a, b) => b[1].count - a[1].count);
                
            sorted.forEach(([key, info]) => {
                if (info.count > 1) {
                    originalConsole.log(
                        `${info.function} - ${info.count}回`,
                        `場所: ${info.location}`,
                        `期間: ${((info.lastCall - info.firstCall) / 1000).toFixed(2)}秒`
                    );
                }
            });
        },
        
        // 重複実行を検出
        findDuplicates(threshold = 2) {
            originalConsole.log('🔍 === 重複実行検出 ===');
            const duplicates = Object.entries(window.ConsoleHistory.functionCalls)
                .filter(([key, info]) => info.count >= threshold)
                .sort((a, b) => b[1].count - a[1].count);
                
            if (duplicates.length === 0) {
                originalConsole.log('重複実行は検出されませんでした');
            } else {
                duplicates.forEach(([key, info]) => {
                    originalConsole.warn(
                        `⚠️ ${info.function} - ${info.count}回実行`,
                        `場所: ${info.location}`
                    );
                });
            }
        },
        
        // 履歴をエクスポート
        export() {
            const data = {
                logs: window.ConsoleHistory.logs,
                functionCalls: window.ConsoleHistory.functionCalls,
                errors: window.ConsoleHistory.errors,
                warnings: window.ConsoleHistory.warnings,
                exportTime: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `console-history-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            originalConsole.log('📥 コンソール履歴をエクスポートしました');
        }
    };

    // グローバルにアクセスできるショートカット
    window.ch = window.ConsoleHistory.utils;

    // 初期メッセージ（無効化）
    // originalConsole.log(
    //     '🎯 コンソール履歴管理システムが有効になりました\n' +
    //     '使い方:\n' +
    //     '  ch.show() - すべての履歴を表示\n' +
    //     '  ch.showErrors() - エラーのみ表示\n' +
    //     '  ch.showFunctionStats() - 関数呼び出し統計\n' +
    //     '  ch.findDuplicates() - 重複実行を検出\n' +
    //     '  ch.export() - 履歴をエクスポート\n' +
    //     '  ch.clear() - 履歴をクリア'
    // );

})();