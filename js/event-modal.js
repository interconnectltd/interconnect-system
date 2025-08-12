/**
 * Event Modal Management
 * イベント詳細モーダルの管理
 */

(function() {
    'use strict';

    class EventModal {
        constructor() {
            this.modal = document.getElementById('eventDetailModal');
            this.modalTitle = document.getElementById('modalEventTitle');
            this.modalBody = document.getElementById('modalEventBody');
            this.eventActionBtn = document.getElementById('eventActionBtn');
            this.currentEvent = null;
            
            this.init();
        }

        init() {
            // モーダルオーバーレイクリックで閉じる
            const overlay = this.modal.querySelector('.modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', () => this.close());
            }

            // アクションボタンのイベント
            if (this.eventActionBtn) {
                this.eventActionBtn.addEventListener('click', () => this.handleEventAction());
            }

            // console.log('[EventModal] Initialized');
        }

        /**
         * イベント詳細を表示
         */
        async show(eventId) {
            // console.log('[EventModal] Showing event:', eventId);

            try {
                // ローディング状態を表示
                this.showLoading();
                this.modal.classList.add('show');

                // Supabaseからイベント詳細を取得
                const { data: event, error } = await window.supabaseClient
                    .from('event_items')
                    .select('*')
                    .eq('id', eventId)
                    .single();

                if (error) {
                    console.error('[EventModal] Error fetching event:', error);
                    console.error('[EventModal] Error details:', {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                        hint: error.hint,
                        table: 'event_items',
                        eventId: eventId
                    });
                    this.showError('イベント情報の取得に失敗しました');
                    return;
                }

                if (!event) {
                    this.showError('イベントが見つかりませんでした');
                    return;
                }

                this.currentEvent = event;
                // モーダルにイベントIDを保存
                if (this.modal) {
                    this.modal.dataset.eventId = eventId;
                }
                this.displayEventDetails(event);

                // 参加者数を取得
                await this.fetchParticipantsCount(eventId);

                // ユーザーの参加状況を確認
                await this.checkUserParticipation(eventId);

            } catch (error) {
                console.error('[EventModal] Error:', error);
                this.showError('エラーが発生しました');
            }
        }

        /**
         * イベント詳細を表示
         */
        displayEventDetails(event) {
            // タイトルを設定
            this.modalTitle.textContent = event.title || 'イベント詳細';

            // 日付のフォーマット
            const eventDate = new Date(event.event_date);
            const dateStr = eventDate.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
            });

            // ステータスの判定
            const now = new Date();
            const isUpcoming = eventDate > now;
            const isToday = eventDate.toDateString() === now.toDateString();
            
            let status = 'upcoming';
            let statusText = '開催予定';
            let statusClass = 'upcoming';
            
            if (isToday) {
                status = 'ongoing';
                statusText = '本日開催';
                statusClass = 'ongoing';
            } else if (!isUpcoming) {
                status = 'ended';
                statusText = '終了';
                statusClass = 'ended';
            }

            // 詳細コンテンツのHTML
            const detailHTML = `
                <div class="event-detail-content">
                    <!-- イベントヒーローセクション -->
                    <div class="event-hero">
                        <div class="event-date-large">
                            <div class="date">${eventDate.getDate()}</div>
                            <div class="month">${eventDate.getMonth() + 1}月</div>
                        </div>
                        <h2 class="event-title-large">${event.title}</h2>
                        <div class="event-meta">
                            <div class="event-meta-item">
                                <i class="fas fa-clock"></i>
                                <span>${event.time || '時間未定'}</span>
                            </div>
                            <div class="event-meta-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${event.location || '場所未定'}</span>
                            </div>
                            <div class="event-meta-item">
                                <span class="event-status ${statusClass}">
                                    ${statusText}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- イベント説明 -->
                    <div class="event-info-section">
                        <h3><i class="fas fa-info-circle"></i> イベント概要</h3>
                        <p class="event-description">
                            ${event.description || 'イベントの詳細情報はまだ登録されていません。'}
                        </p>
                    </div>

                    <!-- 参加者情報 -->
                    <div class="event-info-section">
                        <h3><i class="fas fa-users"></i> 参加者情報</h3>
                        <div class="event-stats">
                            <div class="event-stat">
                                <span class="event-stat-value" id="participantCount">-</span>
                                <span class="event-stat-label">参加者数</span>
                            </div>
                            <div class="event-stat">
                                <span class="event-stat-value">${event.max_participants || '∞'}</span>
                                <span class="event-stat-label">定員</span>
                            </div>
                            <div class="event-stat">
                                <span class="event-stat-value" id="remainingSeats">-</span>
                                <span class="event-stat-label">残席</span>
                            </div>
                        </div>
                        <div class="participant-list" id="participantList">
                            <!-- 参加者アバターがここに表示される -->
                        </div>
                    </div>

                    <!-- 詳細情報 -->
                    ${this.renderAdditionalInfo(event)}

                    <!-- タグ -->
                    ${this.renderTags(event)}
                </div>
            `;

            this.modalBody.innerHTML = detailHTML;

            // アクションボタンの設定
            this.updateActionButton(event, status);
        }

        /**
         * 追加情報のレンダリング
         */
        renderAdditionalInfo(event) {
            const info = [];

            if (event.organizer) {
                info.push(`
                    <div class="event-info-section">
                        <h3><i class="fas fa-user-tie"></i> 主催者</h3>
                        <p>${event.organizer}</p>
                    </div>
                `);
            }

            if (event.requirements) {
                info.push(`
                    <div class="event-info-section">
                        <h3><i class="fas fa-check-circle"></i> 参加条件</h3>
                        <p>${event.requirements}</p>
                    </div>
                `);
            }

            if (event.agenda) {
                info.push(`
                    <div class="event-info-section">
                        <h3><i class="fas fa-list-ul"></i> アジェンダ</h3>
                        <pre style="white-space: pre-wrap; font-family: inherit;">${event.agenda}</pre>
                    </div>
                `);
            }

            return info.join('');
        }

        /**
         * タグのレンダリング
         */
        renderTags(event) {
            if (!event.tags || event.tags.length === 0) {
                return '';
            }

            const tagsHTML = event.tags.map(tag => 
                `<span class="event-tag">${tag}</span>`
            ).join('');

            return `
                <div class="event-info-section">
                    <h3><i class="fas fa-tags"></i> タグ</h3>
                    <div class="event-tags">${tagsHTML}</div>
                </div>
            `;
        }

        /**
         * 参加者数を取得
         */
        async fetchParticipantsCount(eventId) {
            try {
                // event_participantsテーブルから参加者数を取得
                const { count, error } = await window.supabaseClient
                    .from('event_participants')
                    .select('*', { count: 'exact', head: true })
                    .eq('event_id', eventId)
                    .eq('status', 'confirmed');

                if (!error && count !== null) {
                    const participantCountEl = document.getElementById('participantCount');
                    const remainingSeatsEl = document.getElementById('remainingSeats');
                    
                    if (participantCountEl) {
                        participantCountEl.textContent = count;
                    }
                    
                    if (remainingSeatsEl && this.currentEvent.max_participants) {
                        const remaining = Math.max(0, this.currentEvent.max_participants - count);
                        remainingSeatsEl.textContent = remaining;
                        
                        // 満席の場合はボタンを無効化
                        if (remaining === 0) {
                            this.eventActionBtn.textContent = '満席';
                            this.eventActionBtn.disabled = true;
                            this.eventActionBtn.classList.remove('btn-primary');
                            this.eventActionBtn.classList.add('btn-secondary');
                        }
                    } else if (remainingSeatsEl) {
                        remainingSeatsEl.textContent = '∞';
                    }

                    // 参加者のプレビューを表示（最大5名）
                    await this.fetchParticipantPreviews(eventId);
                }
            } catch (error) {
                console.error('[EventModal] Error fetching participants:', error);
            }
        }

        /**
         * 参加者プレビューを取得
         */
        async fetchParticipantPreviews(eventId) {
            try {
                const { data: participants, error } = await window.supabaseClient
                    .from('event_participants')
                    .select('user_id')
                    .eq('event_id', eventId)
                    .eq('status', 'confirmed')
                    .limit(5);

                if (!error && participants) {
                    const participantListEl = document.getElementById('participantList');
                    if (participantListEl) {
                        const avatarsHTML = participants.map((p, index) => {
                            // ユーザーIDの最初の2文字を使用
                            const initial = p.user_id ? p.user_id.substring(0, 2).toUpperCase() : '?';
                            return `
                                <div class="participant-avatar" title="参加者">
                                    ${initial}
                                </div>
                            `;
                        }).join('');

                        // 5人以上いる場合は+表示
                        const totalCount = parseInt(document.getElementById('participantCount').textContent);
                        const moreCount = totalCount - 5;
                        const moreHTML = moreCount > 0 ? `
                            <div class="participant-avatar participant-more">
                                +${moreCount}
                            </div>
                        ` : '';

                        participantListEl.innerHTML = avatarsHTML + moreHTML;
                    }
                }
            } catch (error) {
                console.error('[EventModal] Error fetching participant previews:', error);
            }
        }

        /**
         * ユーザーの参加状況を確認
         */
        async checkUserParticipation(eventId) {
            try {
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                if (!user) return;

                const { data: participation } = await window.supabaseClient
                    .from('event_participants')
                    .select('status')
                    .eq('event_id', eventId)
                    .eq('user_id', user.id)
                    .single();

                if (participation && participation.status !== 'cancelled') {
                    this.eventActionBtn.textContent = '参加登録済み';
                    this.eventActionBtn.classList.remove('btn-primary');
                    this.eventActionBtn.classList.add('btn-success');
                    this.eventActionBtn.disabled = true;
                }
            } catch (error) {
                // エラーは無視（未参加として扱う）
                // console.log('[EventModal] User not registered for this event');
            }
        }

        /**
         * アクションボタンの更新
         */
        updateActionButton(event, status) {
            if (status === 'ended') {
                this.eventActionBtn.textContent = '終了済み';
                this.eventActionBtn.disabled = true;
                this.eventActionBtn.classList.remove('btn-primary');
                this.eventActionBtn.classList.add('btn-secondary');
            } else {
                this.eventActionBtn.textContent = '参加する';
                this.eventActionBtn.disabled = false;
                this.eventActionBtn.classList.add('btn-primary');
                this.eventActionBtn.classList.remove('btn-secondary', 'btn-success');
            }
        }

        /**
         * イベントアクションの処理
         */
        async handleEventAction() {
            if (!this.currentEvent || this.eventActionBtn.disabled) return;

            try {
                // ユーザー認証チェック
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                if (!user) {
                    alert('ログインが必要です');
                    window.location.href = 'login.html';
                    return;
                }

                this.eventActionBtn.disabled = true;
                this.eventActionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 処理中...';

                // 既に参加登録しているかチェック
                const { data: existing, error: checkError } = await window.supabaseClient
                    .from('event_participants')
                    .select('id, status')
                    .eq('event_id', this.currentEvent.id)
                    .eq('user_id', user.id)
                    .maybeSingle();
                
                if (checkError && checkError.code !== 'PGRST116') {
                    console.error('[EventModal] 参加状況確認エラー:', checkError);
                    throw checkError;
                }

                if (existing) {
                    if (existing.status === 'cancelled') {
                        // キャンセル済みの場合は再登録
                        const { error: updateError } = await window.supabaseClient
                            .from('event_participants')
                            .update({ 
                                status: 'registered',
                                registration_date: new Date().toISOString()
                            })
                            .eq('id', existing.id);

                        if (updateError) throw updateError;
                    } else {
                        alert('既に参加登録済みです');
                        this.eventActionBtn.textContent = '参加登録済み';
                        this.eventActionBtn.classList.remove('btn-primary');
                        this.eventActionBtn.classList.add('btn-success');
                        return;
                    }
                } else {
                    // 新規登録
                    const { error: insertError } = await window.supabaseClient
                        .from('event_participants')
                        .insert({
                            event_id: this.currentEvent.id,
                            user_id: user.id,
                            status: 'registered'
                        });

                    if (insertError) throw insertError;
                }

                this.eventActionBtn.textContent = '参加登録済み';
                this.eventActionBtn.classList.remove('btn-primary');
                this.eventActionBtn.classList.add('btn-success');

                // 参加者数を再取得
                await this.fetchParticipantsCount(this.currentEvent.id);

            } catch (error) {
                console.error('[EventModal] Error handling action:', error);
                alert('エラーが発生しました。もう一度お試しください。');
                this.updateActionButton(this.currentEvent, 'upcoming');
            }
        }

        /**
         * ローディング表示
         */
        showLoading() {
            this.modalBody.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <div class="loading-message">イベント情報を読み込んでいます...</div>
                </div>
            `;
        }

        /**
         * エラー表示
         */
        showError(message) {
            this.modalBody.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="error-message">${message}</div>
                </div>
            `;
        }

        /**
         * モーダルを閉じる
         */
        close() {
            this.modal.classList.remove('show');
            this.currentEvent = null;
            
            // 少し待ってからコンテンツをクリア
            setTimeout(() => {
                this.modalBody.innerHTML = '';
                this.modalTitle.textContent = 'イベント詳細';
            }, 300);
        }
    }

    // グローバルに公開
    window.EventModal = EventModal;
    window.eventModal = new EventModal();

    // dashboardUIのメソッドを更新
    if (window.dashboardUI) {
        window.dashboardUI.viewEventDetails = function(eventId) {
            window.eventModal.show(eventId);
        };
        
        window.dashboardUI.closeEventModal = function() {
            window.eventModal.close();
        };
    }

    // console.log('[EventModal] Module loaded');

})();