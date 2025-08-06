/**
 * イベント参加登録システム
 * 
 * 機能:
 * - イベント参加申込
 * - 参加キャンセル
 * - リマインダー設定
 * - 参加証発行
 */

(function() {
    'use strict';

    console.log('[EventRegistration] イベント参加登録システム初期化');

    // グローバル変数
    let currentUserId = null;
    let currentEventId = null;

    // 初期化
    async function initialize() {
        console.log('[EventRegistration] 初期化開始');

        // Supabaseの準備を待つ
        await window.waitForSupabase();

        // 現在のユーザーを取得
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            console.error('[EventRegistration] ユーザーが認証されていません');
            return;
        }

        currentUserId = user.id;
        console.log('[EventRegistration] ユーザーID:', currentUserId);

        // URLパラメータからイベントIDを取得
        const urlParams = new URLSearchParams(window.location.search);
        currentEventId = urlParams.get('id');

        // イベント詳細ページの場合
        if (currentEventId) {
            await loadEventDetails();
        }

        // イベントリストページの場合
        setupEventListListeners();
    }

    // イベント詳細の読み込み
    async function loadEventDetails() {
        try {
            // イベント情報を取得
            const { data: event, error } = await window.supabaseClient
                .from('events')
                .select('*')
                .eq('id', currentEventId)
                .single();

            if (error) throw error;

            // 参加状況を確認
            const { data: participation } = await window.supabaseClient
                .from('event_participants')
                .select('*')
                .eq('event_id', currentEventId)
                .eq('user_id', currentUserId)
                .single();

            // UIを更新
            updateEventDetailUI(event, participation);

        } catch (error) {
            console.error('[EventRegistration] イベント詳細読み込みエラー:', error);
        }
    }

    // イベント詳細UIの更新
    function updateEventDetailUI(event, participation) {
        const registerBtn = document.getElementById('event-register-btn');
        if (!registerBtn) return;

        // 参加者数の更新
        updateParticipantCount(event.id);

        if (participation) {
            // 既に参加登録済み
            if (participation.attendance_status === 'registered') {
                registerBtn.innerHTML = '<i class="fas fa-check-circle"></i> 参加登録済み';
                registerBtn.classList.remove('btn-primary');
                registerBtn.classList.add('btn-success');
                registerBtn.onclick = () => showCancelModal(event.id);

                // キャンセルボタンを追加
                addCancelButton();
            } else if (participation.attendance_status === 'cancelled') {
                registerBtn.innerHTML = '<i class="fas fa-redo"></i> 再度参加申込';
                registerBtn.onclick = () => registerForEvent(event.id, true);
            }
        } else {
            // 未参加
            registerBtn.innerHTML = '<i class="fas fa-calendar-plus"></i> 参加申込';
            registerBtn.onclick = () => registerForEvent(event.id);
        }

        // リマインダー設定ボタンを追加
        if (participation && participation.attendance_status === 'registered') {
            addReminderButton(event.id);
        }
    }

    // イベントリストのリスナー設定
    function setupEventListListeners() {
        // 動的に生成されるボタンに対応
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('event-register-btn')) {
                const eventId = e.target.dataset.eventId;
                await registerForEvent(eventId);
            }
        });
    }

    // イベント参加登録
    async function registerForEvent(eventId, isReRegister = false) {
        try {
            // イベント情報を取得
            const { data: event } = await window.supabaseClient
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            // 定員チェック
            const { count } = await window.supabaseClient
                .from('event_participants')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', eventId)
                .neq('attendance_status', 'cancelled');

            if (event.max_participants && count >= event.max_participants) {
                showError('このイベントは定員に達しています');
                return;
            }

            // 特別な要望を入力
            const requirements = await showRequirementsModal();

            if (isReRegister) {
                // 再登録の場合は更新
                const { error } = await window.supabaseClient
                    .from('event_participants')
                    .update({
                        attendance_status: 'registered',
                        special_requirements: requirements,
                        registration_date: new Date().toISOString(),
                        cancelled_at: null,
                        cancellation_reason: null
                    })
                    .eq('event_id', eventId)
                    .eq('user_id', currentUserId);

                if (error) throw error;
            } else {
                // 新規登録
                const { error } = await window.supabaseClient
                    .from('event_participants')
                    .insert({
                        event_id: eventId,
                        user_id: currentUserId,
                        attendance_status: 'registered',
                        special_requirements: requirements,
                        payment_status: event.is_free ? 'free' : 'pending'
                    });

                if (error) throw error;
            }

            // 通知を送信
            await sendNotification(
                currentUserId,
                'event',
                `「${event.title}」の参加申込が完了しました`,
                `${formatDate(event.date)}に開催予定のイベントへの参加申込を受け付けました。`,
                `/events.html?id=${eventId}`
            );

            showSuccess('参加申込が完了しました');

            // UIを更新
            if (currentEventId === eventId) {
                await loadEventDetails();
            } else {
                updateEventCardUI(eventId, 'registered');
            }

        } catch (error) {
            console.error('[EventRegistration] 参加登録エラー:', error);
            showError('参加申込に失敗しました');
        }
    }

    // 特別な要望入力モーダル
    function showRequirementsModal() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal requirements-modal';
            modal.innerHTML = `
                <div class="modal-content compact">
                    <div class="modal-header">
                        <h3>特別な要望・質問</h3>
                        <button class="close-button" onclick="this.closest('.modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p>アレルギーや配慮事項、事前質問などがあればご記入ください（任意）</p>
                        <textarea id="requirements" rows="4" placeholder="例：車椅子でのアクセスについて"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">スキップ</button>
                        <button class="btn btn-primary" id="submit-requirements">送信</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            modal.classList.add('active');

            // イベントリスナー
            modal.querySelector('#submit-requirements').addEventListener('click', () => {
                const requirements = modal.querySelector('#requirements').value.trim();
                modal.remove();
                resolve(requirements);
            });

            modal.querySelector('.btn-secondary').addEventListener('click', () => {
                resolve('');
            });
        });
    }

    // キャンセルモーダル表示
    function showCancelModal(eventId) {
        const modal = document.createElement('div');
        modal.className = 'modal cancel-modal';
        modal.innerHTML = `
            <div class="modal-content compact">
                <div class="modal-header">
                    <h3>参加をキャンセルしますか？</h3>
                    <button class="close-button" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>キャンセル理由を教えてください（任意）</p>
                    <select id="cancel-reason" class="form-select">
                        <option value="">選択してください</option>
                        <option value="schedule">予定が合わなくなった</option>
                        <option value="health">体調不良</option>
                        <option value="work">仕事の都合</option>
                        <option value="other">その他</option>
                    </select>
                    <textarea id="cancel-detail" rows="3" placeholder="詳細（任意）" style="margin-top: 12px; display: none;"></textarea>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">戻る</button>
                    <button class="btn btn-danger" onclick="cancelEventRegistration('${eventId}')">
                        <i class="fas fa-times-circle"></i> キャンセルする
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('active');

        // その他選択時の詳細入力表示
        modal.querySelector('#cancel-reason').addEventListener('change', (e) => {
            const detail = modal.querySelector('#cancel-detail');
            detail.style.display = e.target.value === 'other' ? 'block' : 'none';
        });
    }

    // 参加キャンセル
    window.cancelEventRegistration = async function(eventId) {
        const reasonSelect = document.getElementById('cancel-reason');
        const detailTextarea = document.getElementById('cancel-detail');
        const reason = reasonSelect.value === 'other' 
            ? detailTextarea.value 
            : reasonSelect.options[reasonSelect.selectedIndex].text;

        try {
            const { error } = await window.supabaseClient
                .from('event_participants')
                .update({
                    attendance_status: 'cancelled',
                    cancellation_reason: reason,
                    cancelled_at: new Date().toISOString()
                })
                .eq('event_id', eventId)
                .eq('user_id', currentUserId);

            if (error) throw error;

            showSuccess('参加をキャンセルしました');
            
            // モーダルを閉じる
            document.querySelector('.cancel-modal').remove();

            // UIを更新
            if (currentEventId === eventId) {
                await loadEventDetails();
            } else {
                updateEventCardUI(eventId, 'cancelled');
            }

        } catch (error) {
            console.error('[EventRegistration] キャンセルエラー:', error);
            showError('キャンセルに失敗しました');
        }
    };

    // リマインダーボタン追加
    function addReminderButton(eventId) {
        const container = document.querySelector('.event-actions');
        if (!container || document.getElementById('reminder-btn')) return;

        const reminderBtn = document.createElement('button');
        reminderBtn.id = 'reminder-btn';
        reminderBtn.className = 'btn btn-outline';
        reminderBtn.innerHTML = '<i class="fas fa-bell"></i> リマインダー設定';
        reminderBtn.onclick = () => showReminderModal(eventId);

        container.appendChild(reminderBtn);
    }

    // キャンセルボタン追加
    function addCancelButton() {
        const container = document.querySelector('.event-actions');
        if (!container || document.getElementById('cancel-btn')) return;

        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancel-btn';
        cancelBtn.className = 'btn btn-outline btn-danger';
        cancelBtn.innerHTML = '<i class="fas fa-times-circle"></i> 参加をキャンセル';
        cancelBtn.onclick = () => showCancelModal(currentEventId);

        container.appendChild(cancelBtn);
    }

    // リマインダー設定モーダル
    function showReminderModal(eventId) {
        const modal = document.createElement('div');
        modal.className = 'modal reminder-modal';
        modal.innerHTML = `
            <div class="modal-content compact">
                <div class="modal-header">
                    <h3>リマインダー設定</h3>
                    <button class="close-button" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>イベント開始前の通知タイミングを選択してください</p>
                    <div class="reminder-options">
                        <label class="reminder-option">
                            <input type="checkbox" name="reminder" value="1440" checked>
                            <span>1日前</span>
                        </label>
                        <label class="reminder-option">
                            <input type="checkbox" name="reminder" value="180">
                            <span>3時間前</span>
                        </label>
                        <label class="reminder-option">
                            <input type="checkbox" name="reminder" value="60">
                            <span>1時間前</span>
                        </label>
                        <label class="reminder-option">
                            <input type="checkbox" name="reminder" value="15">
                            <span>15分前</span>
                        </label>
                    </div>
                    <div class="reminder-type">
                        <label>通知方法:</label>
                        <select id="reminder-type" class="form-select">
                            <option value="both">メール + アプリ通知</option>
                            <option value="email">メールのみ</option>
                            <option value="notification">アプリ通知のみ</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">キャンセル</button>
                    <button class="btn btn-primary" onclick="saveReminders('${eventId}')">
                        <i class="fas fa-save"></i> 保存
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('active');
    }

    // リマインダー保存
    window.saveReminders = async function(eventId) {
        const checkedReminders = document.querySelectorAll('input[name="reminder"]:checked');
        const reminderType = document.getElementById('reminder-type').value;

        try {
            // 既存のリマインダーを削除
            await window.supabaseClient
                .from('event_reminders')
                .delete()
                .eq('event_id', eventId)
                .eq('user_id', currentUserId);

            // 新しいリマインダーを追加
            const reminders = Array.from(checkedReminders).map(input => ({
                event_id: eventId,
                user_id: currentUserId,
                reminder_type: reminderType,
                reminder_timing: parseInt(input.value)
            }));

            if (reminders.length > 0) {
                const { error } = await window.supabaseClient
                    .from('event_reminders')
                    .insert(reminders);

                if (error) throw error;
            }

            showSuccess('リマインダーを設定しました');
            document.querySelector('.reminder-modal').remove();

        } catch (error) {
            console.error('[EventRegistration] リマインダー保存エラー:', error);
            showError('リマインダーの設定に失敗しました');
        }
    };

    // 参加者数の更新
    async function updateParticipantCount(eventId) {
        try {
            const { count } = await window.supabaseClient
                .from('event_participants')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', eventId)
                .eq('attendance_status', 'registered');

            const countElement = document.querySelector('.participant-count');
            if (countElement) {
                countElement.textContent = `${count || 0}名参加予定`;
            }

        } catch (error) {
            console.error('[EventRegistration] 参加者数取得エラー:', error);
        }
    }

    // イベントカードUIの更新
    function updateEventCardUI(eventId, status) {
        const card = document.querySelector(`[data-event-id="${eventId}"]`);
        if (!card) return;

        const registerBtn = card.querySelector('.event-register-btn');
        if (!registerBtn) return;

        switch (status) {
            case 'registered':
                registerBtn.innerHTML = '<i class="fas fa-check-circle"></i> 参加登録済み';
                registerBtn.classList.remove('btn-primary');
                registerBtn.classList.add('btn-success');
                break;
            case 'cancelled':
                registerBtn.innerHTML = '<i class="fas fa-redo"></i> 再度参加申込';
                registerBtn.classList.remove('btn-success');
                registerBtn.classList.add('btn-primary');
                break;
        }
    }

    // 通知送信
    async function sendNotification(userId, type, title, message, link) {
        if (window.sendNotification) {
            await window.sendNotification(userId, type, title, message, link);
        }
    }

    // ユーティリティ関数
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
    }

    function showSuccess(message) {
        showToast(message, 'success');
    }

    function showError(message) {
        showToast(message, 'error');
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();