// Event Registration Functionality
document.addEventListener('DOMContentLoaded', function() {
    // 参加申込ボタンの処理
    const registrationButtons = document.querySelectorAll('.btn-primary.btn-block');
    
    registrationButtons.forEach(button => {
        if (button.textContent.trim() === '参加申込') {
            button.addEventListener('click', handleEventRegistration);
        }
    });
    
    // イベント参加申込処理
    function handleEventRegistration(e) {
        e.preventDefault();
        const button = e.target;
        const eventCard = button.closest('.event-card');
        
        if (!eventCard) {
            console.error('Event card not found');
            return;
        }
        
        // イベント情報を取得
        const eventTitle = eventCard.querySelector('.event-title')?.textContent || 'イベント';
        const eventDate = eventCard.querySelector('.event-date-tag span')?.textContent || '';
        
        // ボタンの状態を変更
        button.disabled = true;
        // 安全にローディング状態を表示
        button.textContent = '';
        const spinner = document.createElement('i');
        spinner.className = 'fas fa-spinner fa-spin';
        const text = document.createTextNode(' 処理中...');
        button.appendChild(spinner);
        button.appendChild(text);
        
        // 申込処理をシミュレート（実際はAPIコール）
        setTimeout(() => {
            // 成功時の処理
            // 安全に完了状態を表示
            button.textContent = '';
            const checkIcon = document.createElement('i');
            checkIcon.className = 'fas fa-check';
            const completeText = document.createTextNode(' 申込完了');
            button.appendChild(checkIcon);
            button.appendChild(completeText);
            button.classList.remove('btn-primary');
            button.classList.add('btn-success');
            
            // トースト通知を表示
            showEventToast(`「${eventTitle}」への参加申込が完了しました`, 'success');
            
            // 参加者数を更新
            updateParticipantCount(eventCard);
            
            // 3秒後にボタンテキストを変更
            setTimeout(() => {
                // 安全に申込済み状態を表示
                button.textContent = '';
                const checkCircleIcon = document.createElement('i');
                checkCircleIcon.className = 'fas fa-check-circle';
                const doneText = document.createTextNode(' 申込済み');
                button.appendChild(checkCircleIcon);
                button.appendChild(doneText);
                button.classList.add('btn-disabled');
            }, 3000);
            
        }, 1500);
    }
    
    // 参加者数を更新
    function updateParticipantCount(eventCard) {
        const participantElement = eventCard.querySelector('.meta-item .fa-users')?.parentElement;
        if (participantElement) {
            const span = participantElement.querySelector('span');
            if (span) {
                const match = span.textContent.match(/参加者：(\d+)\/(\d+)名/);
                if (match) {
                    const current = parseInt(match[1]);
                    const max = parseInt(match[2]);
                    if (current < max) {
                        span.textContent = `参加者：${current + 1}/${max}名`;
                    }
                }
            }
        }
    }
    
    // トースト通知を表示
    function showEventToast(message, type = 'info') {
        // 既存のトースト機能を使用するか、新規作成
        if (window.INTERCONNECT && window.INTERCONNECT.utils && window.INTERCONNECT.utils.showToast) {
            window.INTERCONNECT.utils.showToast(message, type);
        } else {
            // フォールバック: シンプルな通知を作成
            const toast = document.createElement('div');
            toast.className = `event-toast ${type}`;
            // アイコンを安全に作成
            const icon = document.createElement('i');
            const iconClass = type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
            icon.className = `fas ${iconClass}`;
            
            // メッセージを安全に作成
            const messageSpan = document.createElement('span');
            messageSpan.textContent = message;
            
            // 要素を追加
            toast.appendChild(icon);
            toast.appendChild(messageSpan);
            
            // スタイルを追加
            Object.assign(toast.style, {
                position: 'fixed',
                top: '20px',
                right: '20px',
                background: type === 'success' ? '#10b981' : '#0066ff',
                color: 'white',
                padding: '16px 24px',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '16px',
                fontWeight: '500',
                zIndex: '10000',
                animation: 'slideInRight 0.3s ease',
                maxWidth: '400px'
            });
            
            document.body.appendChild(toast);
            
            // 3秒後に削除
            setTimeout(() => {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }
    
    // キャンセル処理（申込済みの場合）
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-disabled') && e.target.textContent.includes('申込済み')) {
            if (confirm('参加申込をキャンセルしますか？')) {
                const button = e.target;
                const eventCard = button.closest('.event-card');
                const eventTitle = eventCard?.querySelector('.event-title')?.textContent || 'イベント';
                
                // キャンセル処理
                button.disabled = true;
                // 安全にローディング状態を表示
                button.textContent = '';
                const spinner2 = document.createElement('i');
                spinner2.className = 'fas fa-spinner fa-spin';
                const text2 = document.createTextNode(' 処理中...');
                button.appendChild(spinner2);
                button.appendChild(text2);
                
                setTimeout(() => {
                    button.textContent = '参加申込';
                    button.classList.remove('btn-success', 'btn-disabled');
                    button.classList.add('btn-primary');
                    button.disabled = false;
                    
                    showEventToast(`「${eventTitle}」の参加申込をキャンセルしました`, 'info');
                    
                    // 参加者数を減らす
                    if (eventCard) {
                        const participantElement = eventCard.querySelector('.meta-item .fa-users')?.parentElement;
                        if (participantElement) {
                            const span = participantElement.querySelector('span');
                            if (span) {
                                const match = span.textContent.match(/参加者：(\d+)\/(\d+)名/);
                                if (match) {
                                    const current = parseInt(match[1]);
                                    const max = parseInt(match[2]);
                                    if (current > 0) {
                                        span.textContent = `参加者：${current - 1}/${max}名`;
                                    }
                                }
                            }
                        }
                    }
                }, 1000);
            }
        }
    });
});

// アニメーションの定義
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
    
    .btn-success {
        background: #10b981 !important;
        border-color: #10b981 !important;
        color: white !important;
    }
    
    .btn-disabled {
        opacity: 0.8;
        cursor: default;
    }
    
    .btn-disabled:hover {
        transform: none !important;
        box-shadow: none !important;
    }
`;
document.head.appendChild(style);