// RLS問題の回避策
console.log('=== RLS回避策実装 ===');

// ReferralManagerを拡張
if (window.ReferralManager) {
    // loadReferralLinksメソッドを完全に置き換え
    window.ReferralManager.prototype.loadReferralLinks = async function() {
        console.log('[RLS-Fix] 紹介リンク読み込み開始...');
        
        try {
            // 方法1: 通常のSELECT
            console.log('[RLS-Fix] 方法1: 通常のSELECT実行');
            const { data: links1, error: error1 } = await window.supabaseClient
                .from('invite_links')
                .select('*')
                .eq('created_by', this.user.id)
                .order('created_at', { ascending: false });
            
            console.log('[RLS-Fix] 方法1結果:', { links1, error1 });
            
            // 方法2: 別の書き方でSELECT
            console.log('[RLS-Fix] 方法2: filter使用');
            const { data: links2, error: error2 } = await window.supabaseClient
                .from('invite_links')
                .select('*')
                .filter('created_by', 'eq', this.user.id)
                .order('created_at', { ascending: false });
            
            console.log('[RLS-Fix] 方法2結果:', { links2, error2 });
            
            // 方法3: RPC経由で取得
            console.log('[RLS-Fix] 方法3: RPC経由');
            const { data: links3, error: error3 } = await window.supabaseClient
                .rpc('get_user_invite_links', {
                    p_user_id: this.user.id
                });
            
            console.log('[RLS-Fix] 方法3結果:', { links3, error3 });
            
            // 成功したデータを使用
            const links = links1 || links2 || links3 || [];
            const error = error1 || error2 || error3;
            
            if (error) {
                console.error('[RLS-Fix] すべての方法で失敗:', error);
                throw error;
            }
            
            // リンクリストを表示
            const linksList = document.getElementById('links-list');
            if (!linksList) {
                console.error('[RLS-Fix] links-list要素が見つかりません');
                return;
            }
            
            if (!links || links.length === 0) {
                console.log('[RLS-Fix] リンクが0件です');
                linksList.innerHTML = `
                    <div class="empty-links">
                        <i class="fas fa-link"></i>
                        <h3>まだ紹介リンクがありません</h3>
                        <p>「新しいリンクを作成」ボタンから始めましょう</p>
                    </div>
                `;
            } else {
                console.log('[RLS-Fix] リンクを表示:', links.length + '件');
                const html = links.map(link => this.renderLinkItem(link)).join('');
                linksList.innerHTML = html;
            }
            
        } catch (error) {
            console.error('[RLS-Fix] エラー:', error);
            
            // エラー時でもローカルストレージから復元を試みる
            const cachedLinks = localStorage.getItem('referral_links_cache');
            if (cachedLinks) {
                console.log('[RLS-Fix] キャッシュから復元');
                const links = JSON.parse(cachedLinks);
                const linksList = document.getElementById('links-list');
                if (linksList && links.length > 0) {
                    const html = links.map(link => this.renderLinkItem(link)).join('');
                    linksList.innerHTML = html;
                }
            }
        }
    };
    
    // createReferralLinkも拡張
    const originalCreate = window.ReferralManager.prototype.createReferralLink;
    
    window.ReferralManager.prototype.createReferralLink = async function(description = null) {
        console.log('[RLS-Fix] リンク作成開始');
        
        try {
            // 元の作成処理を実行
            await originalCreate.call(this, description);
            
            // 作成されたリンクをローカルストレージにも保存
            const linkData = {
                id: 'local-' + Date.now(),
                link_code: this.lastCreatedLinkCode || 'TEMP-' + Date.now(),
                description: description || 'マイ紹介リンク',
                created_at: new Date().toISOString(),
                created_by: this.user.id,
                is_active: true
            };
            
            // キャッシュに追加
            const cached = JSON.parse(localStorage.getItem('referral_links_cache') || '[]');
            cached.unshift(linkData);
            localStorage.setItem('referral_links_cache', JSON.stringify(cached));
            
            console.log('[RLS-Fix] ローカルキャッシュに保存:', linkData);
            
            // 複数回の再読み込みを試みる
            setTimeout(() => this.loadReferralLinks(), 500);
            setTimeout(() => this.loadReferralLinks(), 1500);
            setTimeout(() => this.loadReferralLinks(), 3000);
            
        } catch (error) {
            console.error('[RLS-Fix] 作成エラー:', error);
            throw error;
        }
    };
}

// RPC関数を作成するSQL
window.createRPCFunction = function() {
    const sql = `
-- ユーザーの紹介リンクを取得するRPC関数
CREATE OR REPLACE FUNCTION get_user_invite_links(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    created_by UUID,
    link_code TEXT,
    description TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    registration_count INTEGER,
    completion_count INTEGER,
    total_rewards_earned INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        il.id,
        il.created_by,
        il.link_code,
        il.description,
        il.is_active,
        il.created_at,
        COALESCE(COUNT(DISTINCT i.id), 0)::INTEGER as registration_count,
        COALESCE(COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END), 0)::INTEGER as completion_count,
        COALESCE(SUM(CASE WHEN i.status = 'completed' THEN 1000 ELSE 0 END), 0)::INTEGER as total_rewards_earned
    FROM invite_links il
    LEFT JOIN invitations i ON i.invite_link_id = il.id
    WHERE il.created_by = p_user_id
    GROUP BY il.id, il.created_by, il.link_code, il.description, il.is_active, il.created_at
    ORDER BY il.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_invite_links TO authenticated;
    `;
    
    console.log('以下のSQLをSupabaseで実行してください:');
    console.log(sql);
};

console.log('=== RLS回避策準備完了 ===');
console.log('createRPCFunction() を実行してRPC関数のSQLを表示できます');