/**
 * Dashboard Event Details Handler
 * イベント詳細表示機能
 */

(function() {
    'use strict';

    class EventDetailsHandler {
        constructor() {
            this.modal = null;
            this.currentEventId = null;
            this.init();
        }

        init() {
            // モーダル要素を取得
            this.modal = document.getElementById('eventDetailModal');
            if (!this.modal) {
                console.error('[EventDetails] モーダル要素が見つかりません');
                return;
            }

            // viewEventDetailsメソッドを上書き
            if (window.dashboardUI) {
                window.dashboardUI.viewEventDetails = this.viewEventDetails.bind(this);
                window.dashboardUI.closeEventModal = this.closeModal.bind(this);
            }
        }

        /**
         * イベント詳細を表示
         */
        async viewEventDetails(eventId) {
            // console.log('[EventDetails] イベント詳細を取得:', eventId);
            
            this.currentEventId = eventId;
            this.showLoadingState();
            
            try {
                // イベント情報を取得
                const eventData = await this.fetchEventDetails(eventId);
                
                if (eventData) {
                    this.displayEventDetails(eventData);
                } else {
                    this.showErrorState('イベント情報が見つかりません');
                }
                
            } catch (error) {
                console.error('[EventDetails] エラー:', error);
                this.showErrorState('イベント情報の取得に失敗しました');
            }
        }

        /**
         * イベント詳細を取得
         */
        async fetchEventDetails(eventId) {
            try {
                // Supabaseから取得を試みる
                if (window.supabaseClient) {
                    const { data, error } = await window.supabase
                        .from('events')
                        .select('*')
                        .eq('id', eventId)
                        .single();
                    
                    if (!error && data) {
                        return data;
                    }
                }
                
                // フォールバック: ダミーデータ
                const dummyEvents = {
                    '1': {
                        id: '1',
                        title: '経営戦略セミナー',
                        description: '中小企業向けの経営戦略セミナーです。最新のビジネストレンドと実践的な戦略立案方法を学びます。',
                        event_type: 'seminar',
                        start_date: '2025-07-15',
                        end_date: '2025-07-15',
                        time: '14:00〜16:00',
                        location: 'オンライン開催',
                        is_online: true,
                        meeting_url: 'https://zoom.us/j/xxxxx',
                        max_participants: 100,
                        current_participants: 45,
                        price: 0,
                        requirements: '特になし',
                        tags: ['経営', '戦略', 'オンライン']
                    },
                    '2': {
                        id: '2',
                        title: '交流ランチ会',
                        description: 'カジュアルな雰囲気でビジネス交流を楽しむランチ会です。',
                        event_type: 'networking',
                        start_date: '2025-07-18',
                        end_date: '2025-07-18',
                        time: '12:00〜14:00',
                        location: '東京・丸の内 レストランXXX',
                        is_online: false,
                        max_participants: 20,
                        current_participants: 12,
                        price: 3000,
                        currency: 'JPY',
                        requirements: '名刺をご持参ください',
                        tags: ['交流', 'ランチ', '東京']
                    },
                    '3': {
                        id: '3',
                        title: '新規事業ピッチ大会',
                        description: 'スタートアップ企業による新規事業のピッチ大会です。投資家との出会いの場も提供します。',
                        event_type: 'pitch',
                        start_date: '2025-07-25',
                        end_date: '2025-07-25',
                        time: '18:00〜21:00',
                        location: '大阪・梅田 イノベーションセンター',
                        is_online: false,
                        max_participants: 200,
                        current_participants: 89,
                        price: 1000,
                        currency: 'JPY',
                        requirements: 'ピッチ参加者は事前申込が必要です',
                        tags: ['ピッチ', 'スタートアップ', '大阪']
                    }
                };
                
                return dummyEvents[eventId] || null;
                
            } catch (error) {
                console.error('[EventDetails] fetchEventDetails エラー:', error);
                return null;
            }
        }

        /**
         * イベント詳細を表示
         */
        displayEventDetails(event) {
            // モーダルタイトル
            const titleElement = document.getElementById('modalEventTitle');
            if (titleElement) {
                titleElement.textContent = event.title;
            }

            // モーダルボディ
            const bodyElement = document.getElementById('modalEventBody');
            if (bodyElement) {
                const eventDate = new Date(event.start_date);
                const formattedDate = eventDate.toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                });

                const participantRate = event.max_participants > 0 
                    ? Math.round((event.current_participants / event.max_participants) * 100)
                    : 0;

                bodyElement.innerHTML = `
                    <div class="event-detail-content">
                        <div class="event-detail-section">
                            <h3>概要</h3>
                            <p>${event.description || 'イベントの詳細情報はありません。'}</p>
                        </div>

                        <div class="event-detail-info">
                            <div class="event-detail-item">
                                <i class="fas fa-calendar"></i>
                                <div>
                                    <strong>開催日</strong>
                                    <p>${formattedDate}</p>
                                </div>
                            </div>

                            <div class="event-detail-item">
                                <i class="fas fa-clock"></i>
                                <div>
                                    <strong>時間</strong>
                                    <p>${event.time || '時間未定'}</p>
                                </div>
                            </div>

                            <div class="event-detail-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <div>
                                    <strong>場所</strong>
                                    <p>${event.location || '場所未定'}</p>
                                    ${event.is_online ? '<span class="badge badge-info">オンライン</span>' : ''}
                                </div>
                            </div>

                            <div class="event-detail-item">
                                <i class="fas fa-users"></i>
                                <div>
                                    <strong>参加状況</strong>
                                    <p>${event.current_participants} / ${event.max_participants || '∞'} 名</p>
                                    <div class="progress">
                                        <div class="progress-bar" style="width: ${participantRate}%"></div>
                                    </div>
                                </div>
                            </div>

                            ${event.price > 0 ? `
                                <div class="event-detail-item">
                                    <i class="fas fa-yen-sign"></i>
                                    <div>
                                        <strong>参加費</strong>
                                        <p>${event.price.toLocaleString()} 円</p>
                                    </div>
                                </div>
                            ` : ''}

                            ${event.requirements ? `
                                <div class="event-detail-item">
                                    <i class="fas fa-info-circle"></i>
                                    <div>
                                        <strong>参加条件・持ち物</strong>
                                        <p>${event.requirements}</p>
                                    </div>
                                </div>
                            ` : ''}
                        </div>

                        ${event.tags && event.tags.length > 0 ? `
                            <div class="event-detail-tags">
                                ${event.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
            }

            // アクションボタンの更新
            const actionBtn = document.getElementById('eventActionBtn');
            if (actionBtn) {
                if (event.current_participants >= event.max_participants) {
                    actionBtn.textContent = '満席';
                    actionBtn.disabled = true;
                    actionBtn.className = 'btn btn-disabled';
                } else {
                    actionBtn.textContent = '参加する';
                    actionBtn.disabled = false;
                    actionBtn.className = 'btn btn-primary';
                    actionBtn.onclick = () => this.joinEvent(event.id);
                }
            }

            // モーダルを表示
            this.showModal();
        }

        /**
         * イベントに参加
         */
        async joinEvent(eventId) {
            // console.log('[EventDetails] イベントに参加:', eventId);
            
            // TODO: 実際の参加処理を実装
            // alert('イベントへの参加登録機能は準備中です。');
            if (window.showInfo) {
                showInfo('イベントへの参加登録機能は準備中です。');
            }
            
            // モーダルを閉じる
            this.closeModal();
        }

        /**
         * ローディング状態を表示
         */
        showLoadingState() {
            const bodyElement = document.getElementById('modalEventBody');
            if (bodyElement) {
                bodyElement.innerHTML = `
                    <div class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>イベント情報を読み込んでいます...</p>
                    </div>
                `;
            }
            this.showModal();
        }

        /**
         * エラー状態を表示
         */
        showErrorState(message) {
            const bodyElement = document.getElementById('modalEventBody');
            if (bodyElement) {
                bodyElement.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>${message}</p>
                    </div>
                `;
            }
        }

        /**
         * モーダルを表示
         */
        showModal() {
            if (this.modal) {
                this.modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }

        /**
         * モーダルを閉じる
         */
        closeModal() {
            if (this.modal) {
                this.modal.classList.remove('active');
                document.body.style.overflow = '';
                this.currentEventId = null;
            }
        }
    }

    // DOMContentLoaded後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.eventDetailsHandler = new EventDetailsHandler();
        });
    } else {
        window.eventDetailsHandler = new EventDetailsHandler();
    }

})();