/**
 * Dashboard Event Display Enhancer
 * イベント詳細表示のSupabaseデータ完全対応
 */

(function() {
    'use strict';

    // console.log('[EventDisplayEnhancer] イベント表示強化を初期化...');

    // displayEventDetailsメソッドを強化
    const enhanceEventDisplay = () => {
        if (!window.eventDetailsHandler) {
            console.error('[EventDisplayEnhancer] eventDetailsHandlerが見つかりません');
            return;
        }

        // 元のdisplayEventDetailsメソッドを保存
        const originalDisplay = window.eventDetailsHandler.displayEventDetails;

        // 新しいdisplayEventDetailsメソッド
        window.eventDetailsHandler.displayEventDetails = function(event) {
            // console.log('[EventDisplayEnhancer] Supabaseイベントデータ:', event);

            // データの正規化と日本語表示の強化
            const normalizedEvent = normalizeEventData(event);
            
            // モーダルタイトル
            const titleElement = document.getElementById('modalEventTitle');
            if (titleElement) {
                titleElement.textContent = normalizedEvent.title;
            }

            // モーダルボディ
            const bodyElement = document.getElementById('modalEventBody');
            if (bodyElement) {
                bodyElement.innerHTML = generateEnhancedEventHTML(normalizedEvent);
            }

            // アクションボタンの更新
            updateActionButton(normalizedEvent);

            // モーダルを表示
            this.showModal();
        };
    };

    /**
     * イベントデータを正規化
     */
    const normalizeEventData = (event) => {
        // 日付フィールドの自動検出と正規化
        const startDate = event.start_date || event.event_date || event.date || event.created_at;
        const endDate = event.end_date || startDate;

        // 時間フィールドの処理
        let timeDisplay = event.time || '';
        if (!timeDisplay && event.start_time) {
            timeDisplay = event.start_time;
            if (event.end_time) {
                timeDisplay += `〜${event.end_time}`;
            }
        }
        if (!timeDisplay) {
            timeDisplay = '時間未定';
        }

        // 場所の処理
        let locationDisplay = event.location || '';
        if (!locationDisplay && event.venue) {
            locationDisplay = event.venue;
        }
        if (!locationDisplay && event.is_online) {
            locationDisplay = 'オンライン開催';
        }
        if (!locationDisplay) {
            locationDisplay = '場所未定';
        }

        // 参加人数の処理
        const currentParticipants = event.current_participants || event.participants_count || 0;
        const maxParticipants = event.max_participants || event.capacity || null;

        // 価格の処理
        const price = event.price || event.fee || 0;
        const currency = event.currency || 'JPY';

        // タグの処理
        let tags = event.tags || [];
        if (typeof tags === 'string') {
            try {
                tags = JSON.parse(tags);
            } catch {
                tags = tags.split(',').map(tag => tag.trim());
            }
        }

        // イベントタイプの日本語変換
        const eventTypeMap = {
            'seminar': 'セミナー',
            'workshop': 'ワークショップ',
            'networking': '交流会',
            'conference': 'カンファレンス',
            'meetup': 'ミートアップ',
            'pitch': 'ピッチイベント',
            'hackathon': 'ハッカソン',
            'webinar': 'ウェビナー'
        };

        const eventType = eventTypeMap[event.event_type] || event.event_type || 'イベント';

        return {
            ...event,
            start_date: startDate,
            end_date: endDate,
            time: timeDisplay,
            location: locationDisplay,
            current_participants: currentParticipants,
            max_participants: maxParticipants,
            price: price,
            currency: currency,
            tags: tags,
            event_type_display: eventType
        };
    };

    /**
     * 強化されたイベントHTMLを生成
     */
    const generateEnhancedEventHTML = (event) => {
        // 日付のフォーマット
        const startDate = new Date(event.start_date);
        const endDate = new Date(event.end_date);
        
        const dateOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        };

        const formattedStartDate = startDate.toLocaleDateString('ja-JP', dateOptions);
        const formattedEndDate = endDate.toLocaleDateString('ja-JP', dateOptions);

        // 複数日にまたがるイベントかチェック
        const isMultiDay = startDate.toDateString() !== endDate.toDateString();

        // 参加率の計算
        const participantRate = event.max_participants 
            ? Math.round((event.current_participants / event.max_participants) * 100)
            : 0;

        // 残席数
        const remainingSeats = event.max_participants 
            ? Math.max(0, event.max_participants - event.current_participants)
            : null;

        return `
            <div class="event-detail-content">
                <!-- イベントタイプバッジ -->
                <div class="event-type-badge">
                    <span class="badge badge-primary">${event.event_type_display}</span>
                    ${event.is_online ? '<span class="badge badge-info">オンライン</span>' : ''}
                    ${event.price === 0 ? '<span class="badge badge-success">無料</span>' : ''}
                </div>

                <!-- 概要 -->
                <div class="event-detail-section">
                    <h3><i class="fas fa-info-circle"></i> 概要</h3>
                    <p>${event.description || 'イベントの詳細情報はありません。'}</p>
                </div>

                <!-- 基本情報 -->
                <div class="event-detail-info">
                    <!-- 開催日時 -->
                    <div class="event-detail-item">
                        <i class="fas fa-calendar-alt"></i>
                        <div>
                            <strong>開催日時</strong>
                            ${isMultiDay ? `
                                <p>${formattedStartDate}</p>
                                <p>〜 ${formattedEndDate}</p>
                            ` : `
                                <p>${formattedStartDate}</p>
                            `}
                            <p class="time-info"><i class="fas fa-clock"></i> ${event.time}</p>
                        </div>
                    </div>

                    <!-- 場所 -->
                    <div class="event-detail-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <div>
                            <strong>開催場所</strong>
                            <p>${event.location}</p>
                            ${event.address ? `<p class="small text-muted">${event.address}</p>` : ''}
                            ${event.meeting_url ? `
                                <a href="${event.meeting_url}" target="_blank" class="meeting-link">
                                    <i class="fas fa-video"></i> オンライン会議室
                                </a>
                            ` : ''}
                        </div>
                    </div>

                    <!-- 参加状況 -->
                    <div class="event-detail-item">
                        <i class="fas fa-users"></i>
                        <div>
                            <strong>参加状況</strong>
                            ${event.max_participants ? `
                                <p>${event.current_participants} / ${event.max_participants} 名</p>
                                <div class="progress">
                                    <div class="progress-bar ${participantRate >= 80 ? 'bg-warning' : ''} ${participantRate >= 100 ? 'bg-danger' : ''}" 
                                         style="width: ${Math.min(participantRate, 100)}%"></div>
                                </div>
                                ${remainingSeats !== null && remainingSeats > 0 ? `
                                    <p class="remaining-seats ${remainingSeats <= 5 ? 'text-danger' : ''}">
                                        残り${remainingSeats}席
                                    </p>
                                ` : ''}
                            ` : `
                                <p>参加人数: ${event.current_participants} 名</p>
                                <p class="small text-muted">定員なし</p>
                            `}
                        </div>
                    </div>

                    <!-- 参加費 -->
                    ${event.price !== undefined ? `
                        <div class="event-detail-item">
                            <i class="fas fa-yen-sign"></i>
                            <div>
                                <strong>参加費</strong>
                                ${event.price > 0 ? `
                                    <p class="price-display">${event.price.toLocaleString()} 円</p>
                                    ${event.payment_info ? `<p class="small text-muted">${event.payment_info}</p>` : ''}
                                ` : `
                                    <p class="price-display">無料</p>
                                `}
                            </div>
                        </div>
                    ` : ''}

                    <!-- 主催者 -->
                    ${event.organizer || event.host ? `
                        <div class="event-detail-item">
                            <i class="fas fa-user-tie"></i>
                            <div>
                                <strong>主催者</strong>
                                <p>${event.organizer || event.host}</p>
                                ${event.organizer_info ? `<p class="small text-muted">${event.organizer_info}</p>` : ''}
                            </div>
                        </div>
                    ` : ''}

                    <!-- 参加条件・持ち物 -->
                    ${event.requirements || event.prerequisites ? `
                        <div class="event-detail-item">
                            <i class="fas fa-clipboard-list"></i>
                            <div>
                                <strong>参加条件・持ち物</strong>
                                <p>${event.requirements || event.prerequisites}</p>
                            </div>
                        </div>
                    ` : ''}

                    <!-- 対象者 -->
                    ${event.target_audience ? `
                        <div class="event-detail-item">
                            <i class="fas fa-user-friends"></i>
                            <div>
                                <strong>対象者</strong>
                                <p>${event.target_audience}</p>
                            </div>
                        </div>
                    ` : ''}

                    <!-- 申込締切 -->
                    ${event.registration_deadline ? `
                        <div class="event-detail-item">
                            <i class="fas fa-hourglass-half"></i>
                            <div>
                                <strong>申込締切</strong>
                                <p>${new Date(event.registration_deadline).toLocaleDateString('ja-JP', dateOptions)}</p>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- タグ -->
                ${event.tags && event.tags.length > 0 ? `
                    <div class="event-detail-tags">
                        <i class="fas fa-tags"></i>
                        ${event.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                    </div>
                ` : ''}

                <!-- その他の情報 -->
                ${event.notes || event.additional_info ? `
                    <div class="event-detail-section">
                        <h3><i class="fas fa-sticky-note"></i> その他の情報</h3>
                        <p>${event.notes || event.additional_info}</p>
                    </div>
                ` : ''}
            </div>
        `;
    };

    /**
     * アクションボタンを更新
     */
    const updateActionButton = (event) => {
        const actionBtn = document.getElementById('eventActionBtn');
        if (!actionBtn) return;

        // 申込締切のチェック
        if (event.registration_deadline) {
            const deadline = new Date(event.registration_deadline);
            if (deadline < new Date()) {
                actionBtn.textContent = '申込終了';
                actionBtn.disabled = true;
                actionBtn.className = 'btn btn-disabled';
                return;
            }
        }

        // 開催済みのチェック
        const eventDate = new Date(event.end_date || event.start_date);
        if (eventDate < new Date()) {
            actionBtn.textContent = '開催済み';
            actionBtn.disabled = true;
            actionBtn.className = 'btn btn-disabled';
            return;
        }

        // 満席のチェック
        if (event.max_participants && event.current_participants >= event.max_participants) {
            actionBtn.textContent = '満席';
            actionBtn.disabled = true;
            actionBtn.className = 'btn btn-disabled';
            return;
        }

        // 参加可能
        actionBtn.textContent = '参加する';
        actionBtn.disabled = false;
        actionBtn.className = 'btn btn-primary';
    };

    // 追加のスタイル
    const style = document.createElement('style');
    style.textContent = `
        .event-type-badge {
            margin-bottom: 1.5rem;
        }

        .event-type-badge .badge {
            margin-right: 0.5rem;
        }

        .time-info {
            color: #666;
            font-size: 0.95rem;
            margin-top: 0.25rem;
        }

        .meeting-link {
            display: inline-block;
            margin-top: 0.5rem;
            color: #007bff;
            text-decoration: none;
        }

        .meeting-link:hover {
            text-decoration: underline;
        }

        .price-display {
            font-size: 1.2rem;
            font-weight: 600;
            color: #333;
        }

        .remaining-seats {
            font-size: 0.9rem;
            margin-top: 0.5rem;
        }

        .remaining-seats.text-danger {
            color: #dc3545;
            font-weight: 600;
        }

        .event-detail-tags {
            margin-top: 1.5rem;
            padding-top: 1rem;
            border-top: 1px solid #e0e0e0;
        }

        .event-detail-tags i {
            margin-right: 0.5rem;
            color: #666;
        }
    `;
    document.head.appendChild(style);

    // 初期化
    setTimeout(() => {
        enhanceEventDisplay();
        // console.log('[EventDisplayEnhancer] 強化完了');
    }, 1500);

})();