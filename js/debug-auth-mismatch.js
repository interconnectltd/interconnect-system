// auth.usersとprofilesのID不一致を調査
// console.log('=== Auth ID不一致調査 ===');

window.debugAuthMismatch = async function() {
    try {
        // 1. 現在の認証ユーザー
        const { data: { user: authUser } } = await window.supabaseClient.auth.getUser();
        // console.log('1. Auth User:', {
            id: authUser?.id,
            email: authUser?.email,
            created_at: authUser?.created_at
        });
        
        if (!authUser) {
            console.error('認証されていません');
            return;
        }
        
        // 2. authユーザーIDでprofilesを検索
        const { data: profileByAuthId, error: error1 } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();
            
        // console.log('2. Profile by Auth ID:', {
            found: !!profileByAuthId,
            profile: profileByAuthId,
            error: error1
        });
        
        // 3. emailでprofilesを検索
        const { data: profileByEmail, error: error2 } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('email', authUser.email)
            .single();
            
        // console.log('3. Profile by Email:', {
            found: !!profileByEmail,
            profile: profileByEmail,
            error: error2
        });
        
        // 4. IDの比較
        if (profileByEmail) {
            // console.log('4. ID比較:', {
                authUserId: authUser.id,
                profileId: profileByEmail.id,
                match: authUser.id === profileByEmail.id
            });
        }
        
        // 5. 正しいIDでinvite_linksを取得
        const correctUserId = profileByEmail?.id || authUser.id;
        // console.log('5. 使用するユーザーID:', correctUserId);
        
        // 方法A: 直接SELECT
        const { data: linksA, error: errorA } = await window.supabaseClient
            .from('invite_links')
            .select('*')
            .eq('created_by', correctUserId)
            .order('created_at', { ascending: false });
            
        // console.log('6. 直接SELECT結果:', {
            links: linksA,
            count: linksA?.length || 0,
            error: errorA
        });
        
        // 方法B: RLSを回避するためのRPC
        const { data: linksB, error: errorB } = await window.supabaseClient
            .rpc('get_user_invite_links', {
                p_user_id: correctUserId
            });
            
        // console.log('7. RPC結果:', {
            links: linksB,
            count: linksB?.length || 0,
            error: errorB
        });
        
        // 6. ReferralManagerのユーザーIDを確認
        if (window.referralManager) {
            // console.log('8. ReferralManager User:', {
                id: window.referralManager.user?.id,
                email: window.referralManager.user?.email
            });
            
            // 正しいIDに更新
            if (window.referralManager.user && profileByEmail) {
                window.referralManager.user.id = profileByEmail.id;
                // console.log('9. ReferralManager UserID更新完了');
                
                // 再読み込み
                await window.referralManager.loadReferralLinks();
            }
        }
        
    } catch (error) {
        console.error('デバッグエラー:', error);
    }
};

// 自動実行
setTimeout(() => {
    // console.log('Auth不一致調査を開始します...');
    debugAuthMismatch();
}, 1500);

// console.log('debugAuthMismatch() で手動実行も可能です');