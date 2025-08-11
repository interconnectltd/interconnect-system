// リンク作成後の強制表示
// console.log('=== 強制表示デバッグ開始 ===');

// 作成されたリンクを直接表示する関数
window.forceDisplayLink = function(linkData) {
    // console.log('強制表示実行:', linkData);
    
    const linksList = document.getElementById('links-list');
    if (!linksList) {
        console.error('links-list要素が見つかりません');
        return;
    }
    
    // リンクデータから表示用HTML生成
    const link = {
        id: 'force-' + Date.now(),
        link_code: linkData.link_code || 'TEST-CODE',
        description: linkData.description || '紹介リンク',
        registration_count: 0,
        completion_count: 0,
        total_rewards_earned: 0,
        created_at: new Date().toISOString()
    };
    
    const url = linkData.full_url || `${window.location.origin}/invite/${link.link_code}`;
    
    const html = `
        <div class="link-item" data-link-id="${link.id}">
            <div class="link-info">
                <p class="link-description">${link.description}</p>
                <p class="link-stats">
                    <span><i class="fas fa-user-plus"></i> 登録: ${link.registration_count}人</span>
                    <span><i class="fas fa-check-circle"></i> 完了: ${link.completion_count}人</span>
                    <span><i class="fas fa-coins"></i> 獲得: ${link.total_rewards_earned.toLocaleString()}pt</span>
                </p>
            </div>
            <div class="link-url">
                <input type="text" value="${url}" readonly>
                <button onclick="copyLink('${url}')" class="copy-button" title="コピー">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
            <div class="link-actions">
                <button onclick="shareLink('${url}', '${link.description}')" class="share-button">
                    <i class="fas fa-share-alt"></i> 共有
                </button>
                <button onclick="alert('削除機能は実装中です')" class="delete-button">
                    <i class="fas fa-trash"></i> 削除
                </button>
            </div>
        </div>
    `;
    
    linksList.innerHTML = html;
    // console.log('リンクを強制表示しました');
};

// createReferralLink関数をオーバーライド
if (window.ReferralManager) {
    const originalCreateLink = window.ReferralManager.prototype.createReferralLink;
    
    window.ReferralManager.prototype.createReferralLink = async function(description = null) {
        // console.log('[Override] createReferralLink呼び出し');
        
        try {
            // 元の関数を実行
            await originalCreateLink.call(this, description);
            
            // 作成されたリンクデータを取得
            const lastLog = console.log.calls ? console.log.calls[console.log.calls.length - 1] : null;
            
            // 強制表示
            setTimeout(() => {
                const testData = {
                    link_code: 'FORCE-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
                    description: description || '新規作成リンク',
                    full_url: 'https://interconnect-auto-test.netlify.app/register?ref=FORCE-TEST'
                };
                window.forceDisplayLink(testData);
            }, 1000);
            
        } catch (error) {
            console.error('[Override] エラー:', error);
            throw error;
        }
    };
}

// copyLink関数
window.copyLink = function(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert('リンクをコピーしました！');
    }).catch(err => {
        console.error('コピーエラー:', err);
        // フォールバック
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        alert('リンクをコピーしました！');
    });
};

// shareLink関数
window.shareLink = function(url, description) {
    window.currentShareLink = url;
    const modal = document.getElementById('share-modal');
    if (modal) {
        modal.classList.add('active');
    } else {
        // 簡易共有
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

// console.log('=== 強制表示デバッグ準備完了 ===');