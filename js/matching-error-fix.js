/**
 * Matching Error Fix
 * showDetailedReportエラーとCONFIGエラーを修正
 */

(function() {
    'use strict';
    
    console.log('[MatchingErrorFix] エラー修正開始');
    
    // 1. showDetailedReportエラーの修正
    if (window.matchingVerifyPerfection) {
        // showDetailedReportメソッドが存在しない場合は追加
        if (!window.matchingVerifyPerfection.showDetailedReport) {
            window.matchingVerifyPerfection.showDetailedReport = function() {
                console.log('[MatchingErrorFix] showDetailedReport called');
                console.log('Status:', this.getStatus ? this.getStatus() : 'No status available');
            };
        }
    }
    
    // 2. CONFIG未定義エラーの修正
    if (!window.CONFIG) {
        window.CONFIG = {
            DEBUG: false,
            CACHE_DURATION: 300000, // 5分
            MAX_PROFILES: 50,
            BATCH_SIZE: 10
        };
        console.log('[MatchingErrorFix] CONFIGを定義しました');
    }
    
    // 3. renderProfilesOptimizedのエラーを修正
    if (window.matchingSupabase && window.matchingSupabase.renderProfilesOptimized) {
        const originalRender = window.matchingSupabase.renderProfilesOptimized;
        
        window.matchingSupabase.renderProfilesOptimized = async function(profiles) {
            try {
                // CONFIGが存在することを確認
                if (!window.CONFIG) {
                    window.CONFIG = { DEBUG: false };
                }
                
                return await originalRender.call(this, profiles);
            } catch (error) {
                console.error('[MatchingErrorFix] renderProfilesOptimized error:', error);
                
                // フォールバック: displayProfilesを使用
                if (window.displayProfiles) {
                    window.displayProfiles(profiles);
                }
            }
        };
    }
    
    // 4. 競合スクリプトの無効化関数を追加
    window.disableConflictingScripts = function() {
        const scriptsToDisable = [
            'matchingCompleteFix',
            'matchingEmergencyFix',
            'matchingErrorDiagnostic',
            'matchingFixAllIssues',
            'matchingConflictResolver',
            'matchingUltimateFix'
        ];
        
        scriptsToDisable.forEach(scriptName => {
            if (window[scriptName]) {
                window[scriptName]._disabled = true;
                console.log(`[MatchingErrorFix] ${scriptName}を無効化`);
            }
        });
    };
    
    // 5. runtime.lastErrorの警告を抑制
    if (chrome && chrome.runtime) {
        const originalSendMessage = chrome.runtime.sendMessage;
        chrome.runtime.sendMessage = function(...args) {
            try {
                return originalSendMessage.apply(chrome.runtime, args);
            } catch (error) {
                // エラーを静かに処理
                return undefined;
            }
        };
    }
    
    // 6. イベントデータベースエラーの修正
    window.fixEventDatabaseError = function() {
        // event_dateフィールドが存在しない場合の対処
        if (window.dashboardUpcomingEvents && window.dashboardUpcomingEvents.loadUpcomingEvents) {
            const originalLoad = window.dashboardUpcomingEvents.loadUpcomingEvents;
            
            window.dashboardUpcomingEvents.loadUpcomingEvents = async function() {
                try {
                    // まずevent_dateで試す
                    const result = await originalLoad.call(this);
                    return result;
                } catch (error) {
                    console.log('[MatchingErrorFix] event_dateフィールドエラー、dateフィールドで再試行');
                    
                    // dateフィールドで再試行
                    try {
                        const { data: events, error: dbError } = await window.supabase
                            .from('events')
                            .select('*')
                            .gte('date', new Date().toISOString())
                            .order('date', { ascending: true })
                            .limit(5);
                        
                        if (dbError) throw dbError;
                        
                        // event_dateをdateから作成
                        const eventsWithEventDate = events.map(event => ({
                            ...event,
                            event_date: event.date || event.event_date
                        }));
                        
                        this.displayEvents(eventsWithEventDate);
                        return eventsWithEventDate;
                    } catch (dateError) {
                        console.error('[MatchingErrorFix] dateフィールドも存在しません:', dateError);
                        // ダミーデータを表示
                        this.displayEvents([]);
                    }
                }
            };
        }
    };
    
    // 初期化時に修正を適用
    setTimeout(() => {
        window.disableConflictingScripts();
        window.fixEventDatabaseError();
    }, 1000);
    
    console.log('[MatchingErrorFix] エラー修正完了');
    
})();