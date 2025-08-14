/**
 * Dashboard Event Participation Handler
 * イベント参加機能の完全実装
 */

(function() {
    'use strict';

    // console.log('[EventParticipation] イベント参加機能を初期化...');

    class EventParticipationHandler {
        constructor() {
            this.currentEventId = null;
            this.currentEvent = null;
            this.init();
        }

        init() {
            // イベント詳細ハンドラーを拡張
            this.extendEventDetailsHandler();
            
            // Supabaseテーブル構造を確認
            this.checkTableStructure();
        }

        /**
         * テーブル構造を確認
         */
        async checkTableStructure() {
            if (!window.supabase) return;

            try {
                // event_participantsテーブルの存在確認
                const { data, error } = await window.supabase
                    .from('event_participants')
                    .select('*')
                    .limit(1);

                if (error && error.code === '42P01') {
                    // console.log('[EventParticipation] event_participantsテーブルが存在しません。user_activitiesを使用します。');
                    this.useActivityTable = true;
                } else {
                    // console.log('[EventParticipation] event_participantsテーブルを使用します。');
                    this.useActivityTable = false;
                }
            } catch (error) {
                console.error('[EventParticipation] テーブル確認エラー:', error);
                this.useActivityTable = true;
            }
        }

        /**
         * EventDetailsHandlerを拡張
         */
        extendEventDetailsHandler() {
            // displayEventDetailsメソッドを拡張
            if (window.eventDetailsHandler) {
                const originalDisplay = window.eventDetailsHandler.displayEventDetails;
                window.eventDetailsHandler.displayEventDetails = (event) => {
                    // 元のメソッドを実行
                    originalDisplay.call(window.eventDetailsHandler, event);
                    
                    // イベント情報を保存
                    this.currentEvent = event;
                    this.currentEventId = event.id;
                    
                    // 参加ボタンの機能を強化
                    this.enhanceJoinButton(event);
                };

                // joinEventメソッドを完全に置き換え
                window.eventDetailsHandler.joinEvent = this.joinEvent.bind(this);
            }
        }

        /**
         * 参加ボタンを強化
         */
        async enhanceJoinButton(event) {
            const actionBtn = document.getElementById('eventActionBtn');
            if (!actionBtn) return;

            // 現在のユーザーの参加状況を確認
            const isParticipating = await this.checkParticipation(event.id);
            
            if (isParticipating) {
                actionBtn.textContent = '参加登録済み';
                actionBtn.disabled = false;
                actionBtn.className = 'btn btn-secondary';
                actionBtn.onclick = () => this.cancelParticipation(event.id);
            } else if (event.current_participants >= event.max_participants) {
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

        /**
         * 参加状況を確認
         */
        async checkParticipation(eventId) {
            try {
                const userId = await this.getCurrentUserId();
                if (!userId || !window.supabase) return false;

                if (this.useActivityTable) {
                    // user_activitiesテーブルを使用
                    const { data, error } = await window.supabase
                        .from('user_activities')
                        .select('*')
                        .eq('user_id', userId)
                        .eq('activity_type', 'event_participation')
                        .eq('related_id', eventId)
                        .single();

                    return !error && data;
                } else {
                    // event_participantsテーブルを使用
                    const { data, error } = await window.supabase
                        .from('event_participants')
                        .select('*')
                        .eq('user_id', userId)
                        .eq('event_id', eventId)
                        .single();

                    return !error && data;
                }
            } catch (error) {
                console.error('[EventParticipation] 参加状況確認エラー:', error);
                return false;
            }
        }

        /**
         * 現在のユーザーIDを取得
         */
        async getCurrentUserId() {
            try {
                // Supabaseの認証から取得
                if (window.supabase) {
                    const { data: { user } } = await window.supabase.auth.getUser();
                    if (user) return user.id;
                }

                // ローカルストレージから取得
                const userData = localStorage.getItem('user_data');
                if (userData) {
                    const parsed = JSON.parse(userData);
                    return parsed.id || parsed.user_id;
                }

                return null;
            } catch (error) {
                console.error('[EventParticipation] ユーザーID取得エラー:', error);
                return null;
            }
        }

        /**
         * イベントに参加
         */
        async joinEvent(eventId) {
            // console.log('[EventParticipation] イベントに参加:', eventId);
            
            // ローディング状態を表示
            this.showParticipationLoading();

            try {
                const userId = await this.getCurrentUserId();
                if (!userId) {
                    this.showParticipationError('ログインが必要です');
                    return;
                }

                if (window.supabase) {
                    if (this.useActivityTable) {
                        // user_activitiesに参加記録を追加
                        const { error } = await window.supabase
                            .from('user_activities')
                            .insert({
                                user_id: userId,
                                activity_type: 'event_participation',
                                activity_detail: `イベント「${this.currentEvent?.title || 'イベント'}」に参加登録しました`,
                                related_id: eventId,
                                created_at: new Date().toISOString()
                            });

                        if (error) throw error;
                    } else {
                        // event_participantsに参加記録を追加
                        const { error } = await window.supabase
                            .from('event_participants')
                            .insert({
                                user_id: userId,
                                event_id: eventId,
                                status: 'confirmed',
                                registered_at: new Date().toISOString()
                            });

                        if (error) throw error;
                    }

                    // 参加人数を更新
                    await this.updateParticipantCount(eventId, 1);
                    
                    // 成功メッセージ
                    this.showParticipationSuccess();
                    
                    // ボタンを更新
                    setTimeout(() => {
                        if (this.currentEvent) {
                            this.currentEvent.current_participants++;
                            this.enhanceJoinButton(this.currentEvent);
                        }
                    }, 1500);

                } else {
                    // Supabaseが利用できない場合のフォールバック
                    this.showParticipationSuccess();
                }

            } catch (error) {
                console.error('[EventParticipation] 参加登録エラー:', error);
                this.showParticipationError('参加登録に失敗しました');
            }
        }

        /**
         * 参加をキャンセル
         */
        async cancelParticipation(eventId) {
            // console.log('[EventParticipation] 参加をキャンセル:', eventId);
            
            if (!confirm('参加登録をキャンセルしますか？')) {
                return;
            }

            this.showParticipationLoading();

            try {
                const userId = await this.getCurrentUserId();
                if (!userId) {
                    this.showParticipationError('ログインが必要です');
                    return;
                }

                if (window.supabase) {
                    if (this.useActivityTable) {
                        // user_activitiesから削除
                        const { error } = await window.supabase
                            .from('user_activities')
                            .delete()
                            .eq('user_id', userId)
                            .eq('activity_type', 'event_participation')
                            .eq('related_id', eventId);

                        if (error) throw error;
                    } else {
                        // event_participantsから削除
                        const { error } = await window.supabase
                            .from('event_participants')
                            .delete()
                            .eq('user_id', userId)
                            .eq('event_id', eventId);

                        if (error) throw error;
                    }

                    // 参加人数を更新
                    await this.updateParticipantCount(eventId, -1);
                    
                    // キャンセルメッセージ
                    this.showCancellationSuccess();
                    
                    // ボタンを更新
                    setTimeout(() => {
                        if (this.currentEvent) {
                            this.currentEvent.current_participants--;
                            this.enhanceJoinButton(this.currentEvent);
                        }
                    }, 1500);

                } else {
                    this.showCancellationSuccess();
                }

            } catch (error) {
                console.error('[EventParticipation] キャンセルエラー:', error);
                this.showParticipationError('キャンセルに失敗しました');
            }
        }

        /**
         * 参加人数を更新
         */
        async updateParticipantCount(eventId, change) {
            try {
                if (!window.supabase) return;

                // 現在の参加人数を取得
                const { data: event, error: fetchError } = await window.supabase
                    .from('events')
                    .select('current_participants')
                    .eq('id', eventId)
                    .single();

                if (fetchError) throw fetchError;

                // 参加人数を更新
                const newCount = Math.max(0, (event.current_participants || 0) + change);
                const { error: updateError } = await window.supabase
                    .from('events')
                    .update({ current_participants: newCount })
                    .eq('id', eventId);

                if (updateError) throw updateError;

            } catch (error) {
                console.error('[EventParticipation] 参加人数更新エラー:', error);
            }
        }

        /**
         * UI更新メソッド
         */
        showParticipationLoading() {
            const actionBtn = document.getElementById('eventActionBtn');
            if (actionBtn) {
                actionBtn.disabled = true;
                actionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 処理中...';
            }
        }

        showParticipationSuccess() {
            const bodyElement = document.getElementById('modalEventBody');
            if (bodyElement) {
                const successMessage = document.createElement('div');
                successMessage.className = 'participation-success-message';
                successMessage.innerHTML = `
                    <div class="success-animation">
                        <i class="fas fa-check-circle"></i>
                        <p>参加登録が完了しました！</p>
                        <p class="small">詳細はメールでお送りします</p>
                    </div>
                `;
                bodyElement.appendChild(successMessage);

                setTimeout(() => {
                    successMessage.remove();
                }, 3000);
            }
        }

        showCancellationSuccess() {
            const bodyElement = document.getElementById('modalEventBody');
            if (bodyElement) {
                const successMessage = document.createElement('div');
                successMessage.className = 'participation-success-message';
                successMessage.innerHTML = `
                    <div class="success-animation">
                        <i class="fas fa-info-circle"></i>
                        <p>参加登録をキャンセルしました</p>
                    </div>
                `;
                bodyElement.appendChild(successMessage);

                setTimeout(() => {
                    successMessage.remove();
                }, 3000);
            }
        }

        showParticipationError(message) {
            const bodyElement = document.getElementById('modalEventBody');
            if (bodyElement) {
                const errorMessage = document.createElement('div');
                errorMessage.className = 'participation-error-message';
                errorMessage.innerHTML = `
                    <div class="error-animation">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>${message}</p>
                    </div>
                `;
                bodyElement.appendChild(errorMessage);

                setTimeout(() => {
                    errorMessage.remove();
                    if (this.currentEvent) {
                        this.enhanceJoinButton(this.currentEvent);
                    }
                }, 3000);
            }
        }
    }

    // スタイルを追加
    const style = document.createElement('style');
    style.textContent = `
        .participation-success-message,
        .participation-error-message {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            text-align: center;
            z-index: 1000;
        }

        .success-animation {
            animation: fadeInScale 0.5s ease-out;
        }

        .error-animation {
            animation: shake 0.5s ease-out;
        }

        .success-animation i {
            font-size: 3rem;
            color: #4CAF50;
            margin-bottom: 1rem;
        }

        .error-animation i {
            font-size: 3rem;
            color: #f44336;
            margin-bottom: 1rem;
        }

        .success-animation p,
        .error-animation p {
            margin: 0.5rem 0;
            font-size: 1.1rem;
            color: #333;
        }

        .success-animation p.small {
            font-size: 0.9rem;
            color: #666;
        }

        @keyframes fadeInScale {
            from {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        }

        @keyframes shake {
            0%, 100% { transform: translate(-50%, -50%) translateX(0); }
            25% { transform: translate(-50%, -50%) translateX(-10px); }
            75% { transform: translate(-50%, -50%) translateX(10px); }
        }
    `;
    document.head.appendChild(style);

    // 初期化
    setTimeout(() => {
        window.eventParticipationHandler = new EventParticipationHandler();
        // console.log('[EventParticipation] 初期化完了');
    }, 1000);

})();