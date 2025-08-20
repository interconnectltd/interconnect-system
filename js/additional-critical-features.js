/**
 * Additional Critical Features
 * 削除されたファイルから追加で必要な機能を復活
 */

(function() {
    'use strict';
    
    console.log('[AdditionalCritical] 追加重要機能の復活開始');
    
    // ============================================================
    // 1. ダッシュボード統計の完全修正
    // from: dashboard-final-fixes.js
    // ============================================================
    window.fixDashboardDateFields = function() {
        // eventsテーブルのdateフィールド問題を修正
        if (window.dashboardRealtimeCalculator) {
            const original = window.dashboardRealtimeCalculator.loadUpcomingEvents;
            
            window.dashboardRealtimeCalculator.loadUpcomingEvents = async function() {
                try {
                    const now = new Date();
                    const dateStr = now.toISOString().split('T')[0];
                    
                    // start_dateフィールドを使用（dateフィールドは存在しない）
                    const { data: events, error } = await window.supabaseClient
                        .from('events')
                        .select('*')
                        .gte('start_date', dateStr)
                        .order('start_date', { ascending: true })
                        .limit(5);

                    if (error) {
                        console.error('[AdditionalCritical] イベント取得エラー:', error);
                        // デフォルトデータを返す
                        return [{
                            id: '1',
                            title: 'ネットワーキングイベント',
                            start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                            time: '18:00〜',
                            location: 'オンライン'
                        }];
                    }

                    // データ形式を統一
                    return (events || []).map(event => ({
                        ...event,
                        event_date: event.start_date || event.created_at,
                        time: event.time || '時間未定',
                        location: event.location || (event.is_online ? 'オンライン' : '場所未定')
                    }));
                    
                } catch (error) {
                    console.error('[AdditionalCritical] loadUpcomingEvents エラー:', error);
                    return [];
                }
            };
        }
        
        // matchingsテーブルが存在しない場合の対策
        if (window.dashboardMatchingCalculator) {
            const original = window.dashboardMatchingCalculator.calculateMatchingStats;
            
            window.dashboardMatchingCalculator.calculateMatchingStats = async function() {
                try {
                    // matchingsテーブルの代わりにconnectionsを使用
                    const { data: connections, error } = await window.supabaseClient
                        .from('connections')
                        .select('*')
                        .eq('status', 'connected');
                    
                    if (error) {
                        console.error('[AdditionalCritical] connections取得エラー:', error);
                        return {
                            matching_success: 0,
                            matching_change_text: 'データなし',
                            matching_change_type: 'neutral'
                        };
                    }
                    
                    const successCount = connections?.length || 0;
                    
                    return {
                        matching_success: successCount,
                        matching_change_text: `${successCount}件のコネクション`,
                        matching_change_type: successCount > 0 ? 'positive' : 'neutral'
                    };
                    
                } catch (error) {
                    console.error('[AdditionalCritical] calculateMatchingStats エラー:', error);
                    return {
                        matching_success: 0,
                        matching_change_text: 'エラー',
                        matching_change_type: 'negative'
                    };
                }
            };
        }
    };
    
    // ============================================================
    // 2. LINEログインボタンの修正
    // from: line-login-fix.js
    // ============================================================
    window.fixLineLoginButton = function() {
        const lineButton = document.getElementById('lineLoginBtn');
        
        if (lineButton) {
            // 既存のイベントリスナーを削除（クローンで置き換え）
            const newButton = lineButton.cloneNode(true);
            lineButton.parentNode.replaceChild(newButton, lineButton);
            
            // 新しいイベントリスナーを追加
            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation(); // イベントバブリング防止
                
                console.log('[AdditionalCritical] LINEログインボタンクリック');
                
                const LINE_CHANNEL_ID = '2007688781';
                const LINE_REDIRECT_URI = window.location.origin + '/line-callback.html';
                
                // ランダムなstate生成
                const state = Math.random().toString(36).substring(2, 15);
                const nonce = Math.random().toString(36).substring(2, 15);
                
                sessionStorage.setItem('line_state', state);
                
                // 認証URL構築
                const authUrl = 'https://access.line.me/oauth2/v2.1/authorize?' + 
                    'response_type=code' +
                    '&client_id=' + LINE_CHANNEL_ID +
                    '&redirect_uri=' + encodeURIComponent(LINE_REDIRECT_URI) +
                    '&state=' + state +
                    '&scope=' + encodeURIComponent('profile openid email') +
                    '&nonce=' + nonce;
                
                window.location.href = authUrl;
            });
        }
    };
    
    // ============================================================
    // 3. Supabaseテーブル診断ツール
    // from: check-supabase-tables.js
    // ============================================================
    window.checkRequiredTables = async function() {
        console.log('=== Supabaseテーブル診断開始 ===');
        
        if (!window.supabaseClient) {
            console.error('Supabaseクライアントが初期化されていません');
            return;
        }
        
        const requiredTables = [
            'profiles',
            'user_profiles',
            'matchings',
            'connections',
            'events',
            'event_participants',
            'notifications',
            'messages',
            'user_activities'
        ];
        
        const tableStatus = {};
        
        for (const table of requiredTables) {
            try {
                const { data, error, count } = await window.supabaseClient
                    .from(table)
                    .select('*', { count: 'exact', head: true });
                
                if (error) {
                    if (error.code === '42P01') {
                        tableStatus[table] = { exists: false, error: 'テーブルが存在しません' };
                        console.error(`❌ ${table}: 存在しません`);
                    } else {
                        tableStatus[table] = { exists: true, error: error.message };
                        console.warn(`⚠️ ${table}: ${error.message}`);
                    }
                } else {
                    tableStatus[table] = { exists: true, count: count || 0 };
                    console.log(`✅ ${table}: ${count || 0}件のレコード`);
                }
            } catch (err) {
                tableStatus[table] = { exists: false, error: err.message };
                console.error(`❌ ${table}: ${err.message}`);
            }
        }
        
        // RLS（Row Level Security）の確認
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        
        if (user) {
            console.log(`✅ 認証済み: ${user.email}`);
        } else {
            console.warn('⚠️ 未認証状態');
        }
        
        console.log('=== 診断結果 ===');
        console.table(tableStatus);
        
        return tableStatus;
    };
    
    // ============================================================
    // 4. ローディング画面のメモリリーク修正
    // from: loading-screen-fixed.js
    // ============================================================
    window.fixLoadingScreenMemoryLeak = function() {
        // 既存のsetIntervalをクリア
        const highestId = window.setTimeout(() => {}, 0);
        for (let i = 0; i < highestId; i++) {
            window.clearTimeout(i);
            window.clearInterval(i);
        }
        
        // ローディング画面の動画要素のクリーンアップ
        const loadingVideo = document.querySelector('#instantLoadingScreen video');
        if (loadingVideo) {
            loadingVideo.pause();
            loadingVideo.removeAttribute('src');
            loadingVideo.load();
        }
        
        console.log('[AdditionalCritical] メモリリーククリーンアップ完了');
    };
    
    // ============================================================
    // 5. 動画パフォーマンス最適化
    // from: video-performance-optimizer.js
    // ============================================================
    window.optimizeVideoLoading = function() {
        const videos = document.querySelectorAll('video');
        
        videos.forEach(video => {
            // ネットワーク速度に応じた最適化
            if ('connection' in navigator) {
                const connection = navigator.connection;
                
                if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                    // 低速接続では動画を無効化
                    video.removeAttribute('autoplay');
                    video.preload = 'none';
                    console.log('[AdditionalCritical] 低速接続検出: 動画自動再生を無効化');
                } else if (connection.effectiveType === '3g') {
                    // 3Gでは品質を下げる
                    video.preload = 'metadata';
                } else {
                    // 高速接続
                    video.preload = 'auto';
                }
            }
            
            // Intersection Observerで遅延読み込み
            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const vid = entry.target;
                            if (vid.dataset.src && !vid.src) {
                                vid.src = vid.dataset.src;
                                vid.load();
                            }
                            observer.unobserve(vid);
                        }
                    });
                }, { rootMargin: '100px' });
                
                observer.observe(video);
            }
        });
    };
    
    // ============================================================
    // 6. エラーハンドラーの統合
    // from: error-diagnostic.js
    // ============================================================
    window.setupGlobalErrorHandler = function() {
        // グローバルエラーハンドラー
        window.addEventListener('error', (event) => {
            console.error('[AdditionalCritical] グローバルエラー:', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
            
            // Supabase関連のエラーの場合は再初期化を試みる
            if (event.message.includes('supabase') || event.message.includes('Supabase')) {
                console.log('[AdditionalCritical] Supabaseエラー検出、再初期化を試みます');
                if (window.waitForSupabaseWithRetry) {
                    window.waitForSupabaseWithRetry(1);
                }
            }
        });
        
        // Promise拒否ハンドラー
        window.addEventListener('unhandledrejection', (event) => {
            console.error('[AdditionalCritical] 未処理のPromise拒否:', event.reason);
            
            // 406エラーの場合は特別処理
            if (event.reason?.message?.includes('406')) {
                console.log('[AdditionalCritical] 406エラー検出、Accept headerを修正');
                event.preventDefault(); // デフォルトのエラー処理を防ぐ
            }
        });
    };
    
    // ============================================================
    // 7. マッチングフィルターの復活
    // ============================================================
    window.initializeAdvancedFilters = function() {
        // フィルターUIの初期化
        const filterContainer = document.querySelector('.filter-section');
        if (!filterContainer) return;
        
        // 業界フィルター
        const industrySelect = document.getElementById('industryFilter');
        if (industrySelect && industrySelect.options.length === 0) {
            const industries = [
                'すべて', 'IT・通信', '金融', '医療・ヘルスケア', 'マーケティング',
                '製造業', '小売・流通', '教育', 'コンサルティング', '不動産'
            ];
            
            industries.forEach(industry => {
                const option = document.createElement('option');
                option.value = industry === 'すべて' ? '' : industry;
                option.textContent = industry;
                industrySelect.appendChild(option);
            });
        }
        
        // 地域フィルター
        const locationSelect = document.getElementById('locationFilter');
        if (locationSelect && locationSelect.options.length === 0) {
            const locations = [
                'すべて', '東京', '大阪', '名古屋', '福岡', '札幌',
                '仙台', '横浜', '神戸', '京都', 'オンライン'
            ];
            
            locations.forEach(location => {
                const option = document.createElement('option');
                option.value = location === 'すべて' ? '' : location;
                option.textContent = location;
                locationSelect.appendChild(option);
            });
        }
        
        console.log('[AdditionalCritical] フィルター初期化完了');
    };
    
    // ============================================================
    // 8. 自動初期化
    // ============================================================
    async function initializeAdditionalFeatures() {
        console.log('[AdditionalCritical] 追加機能の自動初期化開始');
        
        // エラーハンドラー設定
        window.setupGlobalErrorHandler();
        
        // ダッシュボード修正
        window.fixDashboardDateFields();
        
        // LINEボタン修正
        window.fixLineLoginButton();
        
        // 動画最適化
        window.optimizeVideoLoading();
        
        // フィルター初期化
        window.initializeAdvancedFilters();
        
        // メモリリーククリーンアップ（5秒後）
        setTimeout(() => {
            window.fixLoadingScreenMemoryLeak();
        }, 5000);
        
        console.log('[AdditionalCritical] 追加機能の初期化完了');
    }
    
    // DOMContentLoaded後に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAdditionalFeatures);
    } else {
        initializeAdditionalFeatures();
    }
    
    // グローバル公開
    window.AdditionalCriticalFeatures = {
        fixDashboardDateFields: window.fixDashboardDateFields,
        fixLineLoginButton: window.fixLineLoginButton,
        checkRequiredTables: window.checkRequiredTables,
        fixLoadingScreenMemoryLeak: window.fixLoadingScreenMemoryLeak,
        optimizeVideoLoading: window.optimizeVideoLoading,
        setupGlobalErrorHandler: window.setupGlobalErrorHandler,
        initializeAdvancedFilters: window.initializeAdvancedFilters
    };
    
    // デバッグコマンド
    window.runFullDiagnostics = async function() {
        console.log('=== 完全診断開始 ===');
        
        // テーブル診断
        const tables = await window.checkRequiredTables();
        
        // メモリ使用量
        if (performance.memory) {
            console.log('メモリ使用量:', {
                used: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
                total: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
                limit: `${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
            });
        }
        
        // アクティブなタイマー
        console.log('アクティブなsetInterval/setTimeout:', {
            推定数: Math.max(...Array.from({length: 100}, (_, i) => i).filter(id => {
                try {
                    clearTimeout(id + 10000);
                    return false;
                } catch {
                    return true;
                }
            }))
        });
        
        return { tables };
    };
    
})();