// 最終デバッグ - ユーザーIDとリンク取得の確認
// console.log('=== 最終デバッグ開始 ===');

window.finalDebug = async function() {
    try {
        // 1. 現在のユーザー情報を取得
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        // console.log('認証ユーザー:', user);
        
        if (!user) {
            console.error('ユーザーがログインしていません');
            return;
        }
        
        // 2. profilesテーブルから情報を取得
        const { data: profile, error: profileError } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
        // console.log('プロファイル情報:', { profile, profileError });
        
        // 3. 直接SQLでリンクを取得
        const { data: directLinks, error: directError } = await window.supabaseClient
            .from('invite_links')
            .select('*')
            .eq('created_by', user.id)
            .order('created_at', { ascending: false });
            
        // console.log('直接SELECT結果:', { 
            directLinks, 
            directError,
            count: directLinks?.length || 0 
        });
        
        // 4. RPC関数で取得
        const { data: rpcLinks, error: rpcError } = await window.supabaseClient
            .rpc('get_user_invite_links', {
                p_user_id: user.id
            });
            
        // console.log('RPC関数結果:', { 
            rpcLinks, 
            rpcError,
            count: rpcLinks?.length || 0 
        });
        
        // 5. 全リンクを取得（RLSの影響を確認）
        const { data: allLinks, error: allError } = await window.supabaseClient
            .from('invite_links')
            .select('id, link_code, created_by')
            .limit(20);
            
        // console.log('全リンク取得（RLS適用）:', { 
            allLinks, 
            allError,
            count: allLinks?.length || 0 
        });
        
        // 6. もしリンクが取得できた場合、手動で表示
        if (directLinks && directLinks.length > 0) {
            // console.log('=== リンクを手動表示 ===');
            const linksList = document.getElementById('links-list');
            if (linksList) {
                const html = directLinks.map(link => {
                    const url = `${window.location.origin}/invite/${link.link_code}`;
                    return `
                        <div class="link-item" data-link-id="${link.id}">
                            <div class="link-info">
                                <p class="link-description">${link.description || '紹介リンク'}</p>
                                <p class="link-stats">
                                    <span><i class="fas fa-calendar"></i> 作成: ${new Date(link.created_at).toLocaleDateString()}</span>
                                    <span><i class="fas fa-link"></i> コード: ${link.link_code}</span>
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
                            </div>
                        </div>
                    `;
                }).join('');
                
                linksList.innerHTML = html;
                // console.log('リンクを表示しました');
            }
        }
        
    } catch (error) {
        console.error('デバッグエラー:', error);
    }
};

// 新しいリンク作成テスト
window.testCreateLink = async function(description = 'デバッグテストリンク') {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            console.error('ユーザーがログインしていません');
            return;
        }
        
        // console.log('リンク作成開始...');
        
        const { data, error } = await window.supabaseClient
            .rpc('create_invite_link', {
                p_user_id: user.id,
                p_description: description
            });
            
        // console.log('作成結果:', { data, error });
        
        if (data && data.success) {
            // console.log('作成成功！リンクコード:', data.link_code);
            
            // 作成後すぐに再取得
            setTimeout(() => finalDebug(), 1000);
        }
        
    } catch (error) {
        console.error('作成エラー:', error);
    }
};

// ページ読み込み時に自動実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(finalDebug, 2000);
    });
} else {
    setTimeout(finalDebug, 2000);
}

// console.log('=== デバッグ関数準備完了 ===');
// console.log('使用可能なコマンド:');
// console.log('- finalDebug() : 詳細デバッグ実行');
// console.log('- testCreateLink("説明") : 新規リンク作成テスト');