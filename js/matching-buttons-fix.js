/**
 * マッチングボタン機能修正
 * プロフィールボタンとコネクトボタンを機能させる
 */

(function() {
    'use strict';

    window.matchingButtons = {
        // コネクト申請を送信
        sendConnectRequest: async function(profileId) {
            try {
                const { data: { user } } = await window.supabase.auth.getUser();
                if (!user) {
                    alert('ログインが必要です');
                    return;
                }

                // 既に接続があるかチェック
                const { data: existing } = await window.supabase
                    .from('connections')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('connected_user_id', profileId)
                    .single();

                if (existing) {
                    if (existing.status === 'pending') {
                        alert('既に申請済みです');
                    } else if (existing.status === 'accepted') {
                        alert('既にコネクトしています');
                    }
                    return;
                }

                // コネクト申請を作成
                const { data, error } = await window.supabase
                    .from('connections')
                    .insert({
                        user_id: user.id,
                        connected_user_id: profileId,
                        status: 'pending'
                    });

                if (error) {
                    console.error('Connect request error:', error);
                    alert('エラーが発生しました。もう一度お試しください。');
                    return;
                }

                // ボタンを更新
                const button = document.querySelector(`button[onclick*="${profileId}"]`);
                if (button) {
                    button.textContent = '申請済み';
                    button.classList.remove('btn-primary');
                    button.classList.add('btn-secondary');
                    button.disabled = true;
                }

                // 成功メッセージ
                this.showSuccessMessage('コネクト申請を送信しました！');

            } catch (error) {
                console.error('Connect error:', error);
                alert('エラーが発生しました');
            }
        },

        // 成功メッセージを表示
        showSuccessMessage: function(message) {
            // 既存のメッセージを削除
            const existingMessage = document.querySelector('.connect-success-message');
            if (existingMessage) {
                existingMessage.remove();
            }

            // 新しいメッセージを作成
            const messageDiv = document.createElement('div');
            messageDiv.className = 'connect-success-message';
            messageDiv.textContent = message;
            messageDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 15px 25px;
                border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 9999;
                animation: slideIn 0.3s ease-out;
            `;

            document.body.appendChild(messageDiv);

            // 3秒後に削除
            setTimeout(() => {
                messageDiv.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => messageDiv.remove(), 300);
            }, 3000);
        }
    };

    // DOMContentLoaded後に実行
    document.addEventListener('DOMContentLoaded', function() {
        
        if (window.matchingSupabase) {
            // getConnectButtonHTMLメソッドを修正
            window.matchingSupabase.getConnectButtonHTML = function(profileId, isConnected) {
                if (isConnected) {
                    return '<button class="btn btn-secondary" disabled>コネクト済み</button>';
                }
                return `<button class="btn btn-primary" onclick="window.matchingButtons.sendConnectRequest('${profileId}')">コネクト</button>`;
            };

            // attachCardEventListenersメソッドを修正
            const originalAttachListeners = window.matchingSupabase.attachCardEventListeners.bind(window.matchingSupabase);
            
            window.matchingSupabase.attachCardEventListeners = function() {
                originalAttachListeners();
                
                // プロフィールリンクのイベント処理を追加
                const profileLinks = document.querySelectorAll('.matching-actions a[href^="profile.html"]');
                profileLinks.forEach(link => {
                    link.addEventListener('click', function(e) {
                        // デフォルトの動作を許可（リンク遷移）
                        console.log('Profile link clicked:', this.href);
                    });
                });
            };
        }

        // アニメーション用のスタイルを追加
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            .btn-secondary {
                background-color: #6c757d;
                color: white;
                border: 1px solid #6c757d;
                cursor: not-allowed;
                opacity: 0.8;
            }
            
            .btn-secondary:hover {
                background-color: #6c757d;
                transform: none;
            }
        `;
        document.head.appendChild(style);
        
        console.log('[MatchingButtons] Button functionality enabled');
    });
    
})();