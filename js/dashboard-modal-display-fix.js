/**
 * Dashboard Modal Display Fix
 * イベント詳細モーダルが表示されない問題を修正
 */

(function() {
    'use strict';

    console.log('[ModalDisplayFix] モーダル表示修正を適用...');

    // イベント詳細ハンドラーの修正
    const fixEventDetailsHandler = () => {
        if (!window.eventDetailsHandler) {
            console.error('[ModalDisplayFix] eventDetailsHandlerが見つかりません');
            return;
        }

        // fetchEventDetailsを完全に再実装
        window.eventDetailsHandler.fetchEventDetails = async function(eventId) {
            try {
                console.log('[ModalDisplayFix] イベント詳細を取得:', eventId);
                
                // UUID形式の場合
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                
                if (window.supabase && uuidRegex.test(eventId)) {
                    const { data, error } = await window.supabase
                        .from('events')
                        .select('*')
                        .eq('id', eventId)
                        .single();
                    
                    if (!error && data) {
                        console.log('[ModalDisplayFix] Supabaseから取得成功:', data);
                        
                        // データ形式を調整
                        return {
                            ...data,
                            event_date: data.start_date || data.created_at,
                            time: data.time || '時間未定',
                            location: data.location || (data.is_online ? 'オンライン' : '場所未定'),
                            tags: data.tags || []
                        };
                    } else {
                        console.error('[ModalDisplayFix] Supabaseエラー:', error);
                    }
                }
                
                // フォールバック: ダミーデータ
                console.log('[ModalDisplayFix] ダミーデータを使用');
                return {
                    id: eventId,
                    title: 'サンプルイベント',
                    description: 'このイベントの詳細情報は現在準備中です。',
                    event_type: 'seminar',
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: new Date().toISOString().split('T')[0],
                    time: '14:00〜16:00',
                    location: 'オンライン開催',
                    is_online: true,
                    max_participants: 100,
                    current_participants: 45,
                    price: 0,
                    requirements: '特になし',
                    tags: ['サンプル', 'テスト']
                };
                
            } catch (error) {
                console.error('[ModalDisplayFix] fetchEventDetails エラー:', error);
                
                // エラー時のフォールバック
                return {
                    id: eventId,
                    title: 'エラー: イベント情報を取得できません',
                    description: 'イベント情報の取得中にエラーが発生しました。',
                    event_type: 'error',
                    start_date: new Date().toISOString().split('T')[0],
                    time: '---',
                    location: '---',
                    is_online: false,
                    max_participants: 0,
                    current_participants: 0,
                    price: 0,
                    tags: []
                };
            }
        };

        // viewEventDetailsメソッドも確認・修正
        const originalViewEventDetails = window.eventDetailsHandler.viewEventDetails;
        window.eventDetailsHandler.viewEventDetails = async function(eventId) {
            console.log('[ModalDisplayFix] viewEventDetails呼び出し:', eventId);
            
            this.currentEventId = eventId;
            this.showLoadingState();
            
            try {
                const eventData = await this.fetchEventDetails(eventId);
                console.log('[ModalDisplayFix] 取得したイベントデータ:', eventData);
                
                if (eventData) {
                    this.displayEventDetails(eventData);
                    console.log('[ModalDisplayFix] displayEventDetails実行完了');
                } else {
                    this.showErrorState('イベント情報が見つかりません');
                }
                
            } catch (error) {
                console.error('[ModalDisplayFix] viewEventDetails エラー:', error);
                this.showErrorState('イベント情報の取得に失敗しました');
            }
        };

        // showModalメソッドの確認
        if (!window.eventDetailsHandler.showModal) {
            window.eventDetailsHandler.showModal = function() {
                const modal = document.getElementById('eventDetailModal');
                if (modal) {
                    console.log('[ModalDisplayFix] モーダルを表示');
                    modal.classList.add('active');
                    modal.style.display = 'block';
                    document.body.style.overflow = 'hidden';
                } else {
                    console.error('[ModalDisplayFix] モーダル要素が見つかりません');
                }
            };
        }

        // closeModalメソッドの確認
        if (!window.eventDetailsHandler.closeModal) {
            window.eventDetailsHandler.closeModal = function() {
                const modal = document.getElementById('eventDetailModal');
                if (modal) {
                    console.log('[ModalDisplayFix] モーダルを閉じる');
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                    this.currentEventId = null;
                }
            };
        }
    };

    // モーダルのCSSを確認・追加
    const ensureModalStyles = () => {
        if (!document.getElementById('modal-display-fix-styles')) {
            const style = document.createElement('style');
            style.id = 'modal-display-fix-styles';
            style.textContent = `
                .modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 9999;
                }
                
                .modal.active {
                    display: flex !important;
                    align-items: center;
                    justify-content: center;
                }
                
                .modal-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    cursor: pointer;
                }
                
                .modal-content {
                    position: relative;
                    background: white;
                    border-radius: 8px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                }
                
                .modal-header {
                    padding: 1.5rem;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .modal-body {
                    padding: 1.5rem;
                }
                
                .modal-footer {
                    padding: 1.5rem;
                    border-top: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                }
                
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #666;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                
                .modal-close:hover {
                    background: #f5f5f5;
                    color: #333;
                }
            `;
            document.head.appendChild(style);
            console.log('[ModalDisplayFix] モーダルスタイルを追加');
        }
    };

    // デバッグ用: モーダル表示テスト関数
    window.testEventModal = function(eventId) {
        if (window.eventDetailsHandler) {
            window.eventDetailsHandler.viewEventDetails(eventId || 'd952cfa0-f8f2-41ca-b58d-3777b353d948');
        } else {
            console.error('eventDetailsHandlerが見つかりません');
        }
    };

    // 初期化
    const init = () => {
        console.log('[ModalDisplayFix] 初期化開始');
        
        // スタイルを確保
        ensureModalStyles();
        
        // ハンドラーを修正
        setTimeout(() => {
            fixEventDetailsHandler();
            console.log('[ModalDisplayFix] 修正完了');
            console.log('テスト: コンソールで testEventModal() を実行してモーダルをテスト');
        }, 1000);
    };

    // DOMContentLoaded後に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();