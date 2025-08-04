// 即座に実行可能なデバッグコード
console.log('=== 簡易デバッグ開始 ===');

// 1. supabaseClient確認
console.log('supabaseClient存在確認:', typeof window.supabaseClient);

// 2. 直接テスト
(async () => {
    try {
        // ユーザー確認
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        console.log('現在のユーザー:', user);
        
        if (!user) {
            console.error('ユーザーがログインしていません');
            return;
        }
        
        // invite_linksテーブル確認
        console.log('--- invite_linksテーブル確認 ---');
        const { data: links, error: linksError } = await window.supabaseClient
            .from('invite_links')
            .select('*')
            .eq('created_by', user.id);
            
        console.log('取得結果:', { links, linksError });
        console.log('リンク数:', links ? links.length : 0);
        
        if (links && links.length > 0) {
            console.log('最初のリンク詳細:', links[0]);
        }
        
        // 新規リンク作成テスト
        console.log('--- 新規リンク作成テスト ---');
        const { data: newLink, error: createError } = await window.supabaseClient
            .rpc('create_invite_link', {
                p_user_id: user.id,
                p_description: '簡易テストリンク'
            });
            
        console.log('作成結果:', { newLink, createError });
        
        // 作成後の再確認
        if (newLink && !createError) {
            console.log('--- 作成後の再確認 ---');
            const { data: afterLinks, error: afterError } = await window.supabaseClient
                .from('invite_links')
                .select('*')
                .eq('created_by', user.id)
                .order('created_at', { ascending: false });
                
            console.log('作成後のリンク数:', afterLinks ? afterLinks.length : 0);
            if (afterLinks && afterLinks.length > 0) {
                console.log('最新リンク:', afterLinks[0]);
            }
        }
        
    } catch (error) {
        console.error('エラー発生:', error);
    }
    
    console.log('=== 簡易デバッグ終了 ===');
})();