// 正しいユーザーIDを強制的に使用
console.log('=== 正しいユーザーID強制適用 ===');

// 確認されたユーザーID
const CORRECT_USER_ID = 'c0b97b9e-4c33-4cec-a393-5c2d20998cf9';

// ReferralManagerの修正
if (window.ReferralManager) {
    // initメソッドをオーバーライド
    const originalInit = window.ReferralManager.prototype.init;
    
    window.ReferralManager.prototype.init = async function() {
        console.log('[Force-UserID] 初期化開始');
        
        // 元のinitを実行
        await originalInit.call(this);
        
        // ユーザーIDを修正
        if (this.user) {
            console.log('[Force-UserID] 現在のユーザーID:', this.user.id);
            console.log('[Force-UserID] 正しいユーザーID:', CORRECT_USER_ID);
            
            // 正しいIDに更新
            this.user.id = CORRECT_USER_ID;
            console.log('[Force-UserID] ユーザーIDを更新しました');
            
            // データを再読み込み
            await this.loadData();
        }
    };
    
    // loadReferralLinksもオーバーライド
    const originalLoadLinks = window.ReferralManager.prototype.loadReferralLinks;
    
    window.ReferralManager.prototype.loadReferralLinks = async function() {
        console.log('[Force-UserID] リンク読み込み開始');
        
        // ユーザーIDを確認・修正
        if (this.user && this.user.id !== CORRECT_USER_ID) {
            console.log('[Force-UserID] ユーザーIDを修正:', this.user.id, '→', CORRECT_USER_ID);
            this.user.id = CORRECT_USER_ID;
        }
        
        // 元の関数を実行
        await originalLoadLinks.call(this);
    };
}

// 即座にリンクを取得して表示
window.forceLoadLinks = async function() {
    console.log('[Force-UserID] 強制読み込み開始');
    
    try {
        // 直接SQLでリンクを取得
        const { data: links, error } = await window.supabaseClient
            .from('invite_links')
            .select('*')
            .eq('created_by', CORRECT_USER_ID)
            .order('created_at', { ascending: false });
        
        console.log('[Force-UserID] 取得結果:', {
            links,
            count: links?.length || 0,
            error
        });
        
        if (links && links.length > 0) {
            // リンクを表示
            const linksList = document.getElementById('links-list');
            if (linksList) {
                const html = links.map(link => {
                    const url = `${window.location.origin}/invite/${link.link_code}`;
                    return `
                        <div class="link-item" data-link-id="${link.id}">
                            <div class="link-info">
                                <p class="link-description">${link.description || '紹介リンク'}</p>
                                <p class="link-stats">
                                    <span><i class="fas fa-calendar"></i> ${new Date(link.created_at).toLocaleDateString()}</span>
                                    <span><i class="fas fa-link"></i> ${link.link_code}</span>
                                </p>
                            </div>
                            <div class="link-url">
                                <input type="text" value="${url}" readonly>
                                <button onclick="copyLink('${url}')" class="copy-button" title="コピー">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                            <div class="link-actions">
                                <button onclick="shareLink('${url}', '${link.description || '紹介リンク'}')" 
                                        class="share-button">
                                    <i class="fas fa-share-alt"></i> 共有
                                </button>
                                <button onclick="deleteLink('${link.id}')" class="delete-button">
                                    <i class="fas fa-trash"></i> 削除
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
                
                linksList.innerHTML = html;
                console.log('[Force-UserID] ' + links.length + '件のリンクを表示しました');
                
                // copyLink関数を確実に定義
                window.copyLink = function(url) {
                    const button = event.currentTarget;
                    
                    navigator.clipboard.writeText(url).then(() => {
                        // コピー成功アニメーション
                        button.classList.add('copied');
                        const originalHTML = button.innerHTML;
                        button.innerHTML = '<i class="fas fa-check"></i>';
                        
                        setTimeout(() => {
                            button.classList.remove('copied');
                            button.innerHTML = originalHTML;
                        }, 1500);
                    }).catch(err => {
                        console.error('コピーエラー:', err);
                        // フォールバック
                        const input = document.createElement('input');
                        input.value = url;
                        document.body.appendChild(input);
                        input.select();
                        document.execCommand('copy');
                        document.body.removeChild(input);
                        
                        // アニメーション
                        button.classList.add('copied');
                        const originalHTML = button.innerHTML;
                        button.innerHTML = '<i class="fas fa-check"></i>';
                        
                        setTimeout(() => {
                            button.classList.remove('copied');
                            button.innerHTML = originalHTML;
                        }, 1500);
                    });
                };
                
                // shareLink関数も定義
                window.shareLink = function(url, description) {
                    window.currentShareLink = url;
                    const modal = document.getElementById('share-modal');
                    if (modal) {
                        modal.classList.add('active');
                    } else {
                        if (navigator.share) {
                            navigator.share({
                                title: 'INTERCONNECT紹介リンク',
                                text: description,
                                url: url
                            });
                        } else {
                            alert('共有用URL: ' + url);
                        }
                    }
                };
                
                // deleteLink関数を定義
                window.deleteLink = async function(linkId) {
                    if (!confirm('このリンクを削除してもよろしいですか？')) {
                        return;
                    }
                    
                    const linkItem = document.querySelector(`[data-link-id="${linkId}"]`);
                    if (linkItem) {
                        linkItem.classList.add('loading');
                    }
                    
                    try {
                        const { error } = await window.supabaseClient
                            .from('invite_links')
                            .delete()
                            .eq('id', linkId)
                            .eq('created_by', CORRECT_USER_ID);
                        
                        if (error) {
                            throw error;
                        }
                        
                        // 成功したら要素を削除
                        if (linkItem) {
                            linkItem.style.animation = 'slideOutDown 0.5s ease-out';
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
                            }, 500);
                        }
                        
                    } catch (error) {
                        console.error('[Force-UserID] 削除エラー:', error);
                        alert('削除に失敗しました');
                        if (linkItem) {
                            linkItem.classList.remove('loading');
                        }
                    }
                };
            }
        }
        
    } catch (error) {
        console.error('[Force-UserID] エラー:', error);
    }
};

// ページ読み込み後に自動実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(forceLoadLinks, 2000);
    });
} else {
    setTimeout(forceLoadLinks, 2000);
}

console.log('=== 強制適用準備完了 ===');
console.log('forceLoadLinks() で手動実行も可能です');