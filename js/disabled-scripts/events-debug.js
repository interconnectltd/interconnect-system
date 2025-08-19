/**
 * イベントページデバッグツール
 * イベント読み込み問題の診断と自動修復
 */

(function() {
    'use strict';

    // console.log('🔧 [EventsDebug] デバッグツール起動');

    // デバッグ情報を収集
    window.EventsDebug = {
        // 診断結果
        diagnosis: {
            supabaseReady: false,
            eventModalReady: false,
            eventsLoaded: false,
            errorCount: 0,
            errors: []
        },

        // 問題診断
        diagnose: async function() {
            // console.log('🏥 [EventsDebug] 診断開始...');
            
            // 1. Supabase接続チェック
            if (window.supabaseClient) {
                this.diagnosis.supabaseReady = true;
                // console.log('✅ Supabase: 接続OK');
                
                // 接続テスト
                try {
                    const { data, error } = await window.supabaseClient
                        .from('event_items')
                        .select('count')
                        .limit(1);
                    
                    if (error) {
                        console.error('❌ Supabase: クエリエラー', error);
                        this.diagnosis.errors.push({
                            type: 'supabase_query',
                            error: error
                        });
                    } else {
                        // console.log('✅ Supabase: クエリテスト成功');
                    }
                } catch (e) {
                    console.error('❌ Supabase: 接続エラー', e);
                    this.diagnosis.errors.push({
                        type: 'supabase_connection',
                        error: e
                    });
                }
            } else {
                console.error('❌ Supabase: 未初期化');
                this.diagnosis.errors.push({
                    type: 'supabase_not_initialized',
                    error: 'supabaseClient is undefined'
                });
            }

            // 2. EventModal存在チェック
            if (window.eventModal) {
                this.diagnosis.eventModalReady = true;
                // console.log('✅ EventModal: 初期化済み');
            } else {
                console.warn('⚠️ EventModal: 未初期化');
                this.diagnosis.errors.push({
                    type: 'event_modal_not_ready',
                    error: 'window.eventModal is undefined'
                });
            }

            // 3. イベントデータチェック
            const eventsGrid = document.querySelector('.events-grid');
            if (eventsGrid) {
                const eventCards = eventsGrid.querySelectorAll('.event-card');
                if (eventCards.length > 0) {
                    this.diagnosis.eventsLoaded = true;
                    // console.log(`✅ イベント: ${eventCards.length}件表示中`);
                } else {
                    console.warn('⚠️ イベント: 0件（データなし）');
                }
            } else {
                console.error('❌ イベント: グリッド要素が見つからない');
                this.diagnosis.errors.push({
                    type: 'dom_element_missing',
                    error: '.events-grid not found'
                });
            }

            // 4. エラー集計
            this.diagnosis.errorCount = this.diagnosis.errors.length;

            // 診断結果を表示
            this.showDiagnosisResult();

            return this.diagnosis;
        },

        // 診断結果表示
        showDiagnosisResult: function() {
            console.group('📊 診断結果');
            console.table({
                'Supabase接続': this.diagnosis.supabaseReady ? '✅' : '❌',
                'EventModal': this.diagnosis.eventModalReady ? '✅' : '❌',
                'イベント表示': this.diagnosis.eventsLoaded ? '✅' : '❌',
                'エラー数': this.diagnosis.errorCount
            });
            
            if (this.diagnosis.errors.length > 0) {
                console.group('🚨 検出されたエラー');
                this.diagnosis.errors.forEach(err => {
                    console.error(`[${err.type}]`, err.error);
                });
                console.groupEnd();
            }
            console.groupEnd();
        },

        // 自動修復試行
        autoFix: async function() {
            // console.log('🔧 [EventsDebug] 自動修復開始...');

            // 1. Supabaseの再初期化
            if (!window.supabaseClient) {
                // console.log('🔄 Supabase再初期化を試行...');
                if (window.initSupabase && typeof window.initSupabase === 'function') {
                    await window.initSupabase();
                    await this.wait(1000);
                }
            }

            // 2. EventModalの再初期化
            if (!window.eventModal) {
                // console.log('🔄 EventModal再初期化を試行...');
                if (window.EventModal) {
                    const modal = new window.EventModal();
                    if (modal.modal) {
                        window.eventModal = modal;
                        // console.log('✅ EventModal再初期化成功');
                    }
                }
            }

            // 3. イベントの再読み込み
            if (window.eventsSupabase) {
                // console.log('🔄 イベント再読み込みを試行...');
                await window.eventsSupabase.loadEvents();
                await window.eventsSupabase.loadPastEvents();
            }

            // 再診断
            await this.wait(2000);
            return await this.diagnose();
        },

        // サンプルデータで強制表示（フォールバック）
        showFallbackEvents: function() {
            // console.log('📦 [EventsDebug] フォールバックイベントを表示...');
            
            const eventsGrid = document.querySelector('.events-grid');
            if (!eventsGrid) return;

            const fallbackHTML = `
                <div class="event-card" data-event-id="fallback-1">
                    <div class="event-image">
                        <img src="assets/user-placeholder.svg" alt="Event">
                        <div class="event-badge">テスト</div>
                    </div>
                    <div class="event-content">
                        <div class="event-date-tag">
                            <i class="fas fa-calendar"></i>
                            <span>${new Date().toLocaleDateString('ja-JP')}</span>
                        </div>
                        <h3 class="event-title">🔧 デバッグ用サンプルイベント</h3>
                        <p class="event-description">
                            このイベントはデバッグ用のフォールバックデータです。
                            Supabaseからデータを取得できない場合に表示されます。
                        </p>
                        <div class="event-meta">
                            <div class="meta-item">
                                <i class="fas fa-info-circle"></i>
                                <span>Supabase接続を確認してください</span>
                            </div>
                        </div>
                        <div class="event-footer">
                            <button class="btn btn-secondary btn-block" onclick="EventsDebug.autoFix()">
                                問題を自動修復
                            </button>
                        </div>
                    </div>
                </div>
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>イベントの読み込みに問題があります</h3>
                    <p>以下の解決策をお試しください：</p>
                    <ol style="text-align: left; max-width: 400px; margin: 20px auto;">
                        <li>ページを再読み込み（Ctrl+Shift+R）</li>
                        <li>ブラウザのキャッシュをクリア</li>
                        <li>しばらく待ってから再度アクセス</li>
                    </ol>
                    <button class="btn btn-primary" onclick="location.reload(true)">
                        ページを再読み込み
                    </button>
                </div>
            `;

            eventsGrid.innerHTML = fallbackHTML;
        },

        // ユーティリティ：待機
        wait: function(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        // 完全リセット
        fullReset: function() {
            // console.log('🔄 [EventsDebug] 完全リセット実行...');
            
            // キャッシュクリア
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                });
            }

            // ローカルストレージの一時クリア
            const userData = localStorage.getItem('user');
            localStorage.clear();
            if (userData) {
                localStorage.setItem('user', userData);
            }

            // 強制リロード
            location.href = location.href.split('?')[0] + '?v=' + Date.now();
        }
    };

    // 自動診断実行
    document.addEventListener('DOMContentLoaded', async function() {
        // 3秒待ってから診断
        await EventsDebug.wait(3000);
        
        const diagnosis = await EventsDebug.diagnose();
        
        // 問題がある場合は自動修復を試行
        if (diagnosis.errorCount > 0 || !diagnosis.eventsLoaded) {
            // console.log('⚠️ 問題を検出しました。自動修復を開始します...');
            
            const fixResult = await EventsDebug.autoFix();
            
            // それでもダメならフォールバック表示
            if (!fixResult.eventsLoaded) {
                EventsDebug.showFallbackEvents();
            }
        }
    });

    // グローバルエラーをキャッチ
    window.addEventListener('error', function(event) {
        if (event.filename && event.filename.includes('calendar-integration')) {
            console.warn('📅 カレンダー関連エラーを検出:', event.message);
            event.preventDefault(); // エラーの伝播を停止
        }
    });

    // コンソールコマンド
    // console.log(`
🛠️ デバッグコマンド:
  EventsDebug.diagnose()     - 問題診断
  EventsDebug.autoFix()      - 自動修復
  EventsDebug.fullReset()    - 完全リセット
  EventsDebug.showFallbackEvents() - フォールバック表示
    `);

})();