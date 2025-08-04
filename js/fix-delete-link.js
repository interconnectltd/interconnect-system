// 削除ボタンの修正
console.log('=== 削除機能修正 ===');

// グローバルなdeleteLink関数を上書き
window.deleteLink = async function(linkId) {
    console.log('[DeleteFix] リンク削除開始:', linkId);
    
    if (!confirm('このリンクを削除してもよろしいですか？')) {
        console.log('[DeleteFix] 削除キャンセル');
        return;
    }
    
    // 削除中の表示
    const linkItem = document.querySelector(`[data-link-id="${linkId}"]`);
    const deleteButton = linkItem?.querySelector('.delete-button');
    
    if (deleteButton) {
        deleteButton.disabled = true;
        deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 削除中...';
    }
    
    if (linkItem) {
        linkItem.classList.add('loading');
        linkItem.style.opacity = '0.6';
    }
    
    try {
        // まずソフトデリート（is_activeをfalseに）を試みる
        console.log('[DeleteFix] ソフトデリートを実行...');
        const { data: updateData, error: updateError } = await window.supabaseClient
            .from('invite_links')
            .update({ 
                is_active: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', linkId)
            .select();
        
        if (updateError) {
            console.error('[DeleteFix] ソフトデリートエラー:', updateError);
            
            // ハードデリートを試みる
            console.log('[DeleteFix] ハードデリートを実行...');
            const { error: deleteError } = await window.supabaseClient
                .from('invite_links')
                .delete()
                .eq('id', linkId);
            
            if (deleteError) {
                console.error('[DeleteFix] ハードデリートもエラー:', deleteError);
                throw deleteError;
            }
        }
        
        console.log('[DeleteFix] 削除成功:', updateData);
        
        // アニメーション付きで要素を削除
        if (linkItem) {
            linkItem.style.animation = 'fadeOut 0.5s ease-out';
            linkItem.style.transformOrigin = 'center';
            
            setTimeout(() => {
                linkItem.remove();
                
                // リストが空になったら空メッセージを表示
                const linksList = document.getElementById('links-list');
                if (linksList && linksList.children.length === 0) {
                    linksList.innerHTML = `
                        <div class="empty-links">
                            <i class="fas fa-link"></i>
                            <h3>まだ紹介リンクがありません</h3>
                            <p>「新しいリンクを作成」ボタンから始めましょう</p>
                        </div>
                    `;
                }
                
                // 統計を更新
                updateLinkCount();
            }, 500);
        }
        
        // 成功通知
        showNotification('リンクを削除しました', 'success');
        
    } catch (error) {
        console.error('[DeleteFix] 削除エラー:', error);
        
        // エラー時の表示を戻す
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.innerHTML = '<i class="fas fa-trash"></i> 削除';
        }
        
        if (linkItem) {
            linkItem.classList.remove('loading');
            linkItem.style.opacity = '1';
        }
        
        // エラー通知
        showNotification('削除に失敗しました。もう一度お試しください。', 'error');
    }
};

// リンク数を更新する関数
function updateLinkCount() {
    const linksList = document.getElementById('links-list');
    if (linksList) {
        const activeLinks = linksList.querySelectorAll('.link-item').length;
        console.log('[DeleteFix] アクティブリンク数:', activeLinks);
        
        // 他の統計更新関数があれば呼び出し
        if (window.referralManager && typeof window.referralManager.updateStats === 'function') {
            window.referralManager.updateStats();
        }
    }
}

// 通知表示関数（既存の関数がない場合のフォールバック）
function showNotification(message, type = 'info') {
    // 既存のshowNotification関数を使用
    if (window.showNotification && typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else if (window.referralManager && typeof window.referralManager.showNotification === 'function') {
        window.referralManager.showNotification(type, message);
    } else {
        // フォールバック：シンプルなアラート
        console.log(`[Notification] ${type}: ${message}`);
        
        // 簡易的な通知UI
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// アニメーション用CSS追加
if (!document.getElementById('delete-fix-styles')) {
    const style = document.createElement('style');
    style.id = 'delete-fix-styles';
    style.textContent = `
        @keyframes fadeOut {
            from {
                opacity: 1;
                transform: scale(1);
            }
            to {
                opacity: 0;
                transform: scale(0.9);
            }
        }
        
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
        
        .link-item.loading {
            pointer-events: none;
            position: relative;
            overflow: hidden;
        }
        
        .link-item.loading::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.5);
            pointer-events: none;
        }
        
        .delete-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);
}

console.log('=== 削除機能修正完了 ===');