// リンク作成後の取得問題を修正
console.log('=== 紹介リンク最終修正 ===');

// ReferralManagerのloadReferralLinksメソッドを拡張
if (window.ReferralManager) {
    const originalLoad = window.ReferralManager.prototype.loadReferralLinks;
    
    window.ReferralManager.prototype.loadReferralLinks = async function() {
        console.log('[Fix] loadReferralLinks呼び出し');
        
        try {
            // まず通常の取得を試みる
            await originalLoad.call(this);
            
            // リンクが0件の場合、別の方法で確認
            const linksList = document.getElementById('links-list');
            if (linksList && linksList.innerHTML.includes('まだ紹介リンクがありません')) {
                console.log('[Fix] リンクが表示されていないため、詳細確認実行');
                
                // 直接SQLでカウント確認
                const { data: countData, error: countError } = await window.supabaseClient
                    .rpc('test_direct_insert', {
                        p_user_id: this.user.id
                    });
                    
                console.log('[Fix] 直接カウント結果:', countData);
                
                // RLSなしで全データ取得を試みる（デバッグ用）
                const { data: debugData, error: debugError } = await window.supabaseClient
                    .from('invite_links')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(100);
                    
                console.log('[Fix] 全データ（RLS適用）:', debugData);
                
                if (debugData) {
                    const userLinks = debugData.filter(link => link.created_by === this.user.id);
                    console.log('[Fix] 現在のユーザーのリンク:', userLinks);
                    
                    // ユーザーのリンクが存在する場合、手動で表示
                    if (userLinks.length > 0) {
                        console.log('[Fix] 手動でリンクを表示します');
                        displayLinksManually(userLinks);
                    }
                }
            }
            
        } catch (error) {
            console.error('[Fix] エラー:', error);
        }
    };
    
    // createReferralLinkメソッドも修正
    const originalCreate = window.ReferralManager.prototype.createReferralLink;
    
    window.ReferralManager.prototype.createReferralLink = async function(description = null) {
        console.log('[Fix] createReferralLink呼び出し');
        
        try {
            // 元の関数を実行
            await originalCreate.call(this, description);
            
            // 作成後、少し待ってから再読み込み
            setTimeout(async () => {
                console.log('[Fix] 遅延再読み込み実行');
                await this.loadReferralLinks();
            }, 1000);
            
        } catch (error) {
            console.error('[Fix] 作成エラー:', error);
            throw error;
        }
    };
}

// 手動でリンクを表示する関数
function displayLinksManually(links) {
    const linksList = document.getElementById('links-list');
    if (!linksList) return;
    
    const html = links.map(link => {
        const url = `${window.location.origin}/invite/${link.link_code}`;
        return `
            <div class="link-item" data-link-id="${link.id}">
                <div class="link-info">
                    <p class="link-description">${link.description || '紹介リンク'}</p>
                    <p class="link-stats">
                        <span><i class="fas fa-user-plus"></i> 登録: ${link.registration_count || 0}人</span>
                        <span><i class="fas fa-check-circle"></i> 完了: ${link.completion_count || 0}人</span>
                        <span><i class="fas fa-coins"></i> 獲得: ${(link.total_rewards_earned || 0).toLocaleString()}pt</span>
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
                    <button onclick="alert('削除機能は実装中です')" 
                            class="delete-button">
                        <i class="fas fa-trash"></i> 削除
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    linksList.innerHTML = html;
    console.log('[Fix] リンクを手動表示しました');
}

// デバッグ用：RLS詳細確認
window.checkRLSDetails = async function() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            console.error('ユーザーがログインしていません');
            return;
        }
        
        console.log('=== RLS詳細確認 ===');
        console.log('現在のユーザーID:', user.id);
        
        // 様々な方法でデータ取得を試みる
        
        // 1. 通常のSELECT
        const { data: normal, error: normalError } = await window.supabaseClient
            .from('invite_links')
            .select('*')
            .eq('created_by', user.id);
        console.log('1. 通常SELECT:', { normal, normalError });
        
        // 2. created_byなしでSELECT
        const { data: noFilter, error: noFilterError } = await window.supabaseClient
            .from('invite_links')
            .select('*');
        console.log('2. フィルタなしSELECT:', { noFilter, noFilterError });
        
        // 3. 特定のカラムのみ
        const { data: columns, error: columnsError } = await window.supabaseClient
            .from('invite_links')
            .select('id, link_code, created_by');
        console.log('3. 特定カラムSELECT:', { columns, columnsError });
        
        // 4. カウントのみ
        const { count, error: countError } = await window.supabaseClient
            .from('invite_links')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', user.id);
        console.log('4. カウント:', { count, countError });
        
    } catch (error) {
        console.error('RLS確認エラー:', error);
    }
};

console.log('=== 修正適用完了 ===');
console.log('checkRLSDetails() を実行してRLSの詳細を確認できます');