// invite_linksテーブルの詳細デバッグ
// console.log('=== invite_linksテーブル詳細デバッグ ===');

async function debugInviteLinks() {
    try {
        // 1. 現在のユーザー確認
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        // console.log('現在のユーザー:', user);
        
        if (!user) {
            console.error('ユーザーがログインしていません');
            return;
        }
        
        // 2. RLSを無視してすべてのレコードを取得（管理者権限が必要）
        // console.log('--- すべてのinvite_linksレコード確認 ---');
        const { data: allLinks, error: allError } = await window.supabaseClient
            .from('invite_links')
            .select('*');
            
        // console.log('すべてのレコード取得結果:', { allLinks, allError });
        
        if (allLinks) {
            // console.log('レコード総数:', allLinks.length);
            // console.log('現在のユーザーのレコード:');
            const userLinks = allLinks.filter(link => link.created_by === user.id);
            // console.log(userLinks);
        }
        
        // 3. 通常のRLSありクエリ
        // console.log('--- RLSありでの取得 ---');
        const { data: rlsLinks, error: rlsError } = await window.supabaseClient
            .from('invite_links')
            .select('*')
            .eq('created_by', user.id);
            
        // console.log('RLS適用結果:', { rlsLinks, rlsError });
        
        // 4. テーブルのRLSポリシー確認
        // console.log('--- RLSポリシー確認 ---');
        const { data: policies, error: policyError } = await window.supabaseClient
            .rpc('check_invite_links_policies', {
                p_user_id: user.id
            });
            
        // console.log('RLSポリシー:', { policies, policyError });
        
        // 5. 直接SQLでの確認
        // console.log('--- 直接SQL実行 ---');
        const { data: sqlResult, error: sqlError } = await window.supabaseClient
            .rpc('debug_invite_links', {
                p_user_id: user.id
            });
            
        // console.log('SQL実行結果:', { sqlResult, sqlError });
        
    } catch (error) {
        console.error('デバッグエラー:', error);
    }
}

// RLSポリシーを確認する関数を作成
async function createDebugFunctions() {
    const sql = `
        -- デバッグ用関数
        CREATE OR REPLACE FUNCTION debug_invite_links(p_user_id UUID)
        RETURNS JSON AS $$
        DECLARE
            result JSON;
        BEGIN
            SELECT json_build_object(
                'total_count', (SELECT COUNT(*) FROM invite_links),
                'user_count', (SELECT COUNT(*) FROM invite_links WHERE created_by = p_user_id),
                'user_links', (
                    SELECT json_agg(row_to_json(t))
                    FROM (
                        SELECT id, link_code, description, created_by, created_at
                        FROM invite_links
                        WHERE created_by = p_user_id
                        ORDER BY created_at DESC
                        LIMIT 10
                    ) t
                )
            ) INTO result;
            
            RETURN result;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        -- RLSポリシー確認用関数
        CREATE OR REPLACE FUNCTION check_invite_links_policies(p_user_id UUID)
        RETURNS JSON AS $$
        DECLARE
            result JSON;
        BEGIN
            SELECT json_build_object(
                'table_rls_enabled', (
                    SELECT relrowsecurity 
                    FROM pg_class 
                    WHERE relname = 'invite_links'
                ),
                'policies', (
                    SELECT json_agg(row_to_json(t))
                    FROM (
                        SELECT polname, polcmd, polroles::text
                        FROM pg_policy
                        WHERE polrelid = 'invite_links'::regclass
                    ) t
                )
            ) INTO result;
            
            RETURN result;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // console.log('デバッグ用SQL関数:', sql);
}

// グローバル関数として登録
window.debugInviteLinks = debugInviteLinks;
window.createDebugFunctions = createDebugFunctions;

// console.log('=== デバッグ関数準備完了 ===');
// console.log('以下のコマンドを実行してください:');
// console.log('- debugInviteLinks() : invite_linksテーブルの詳細確認');
// console.log('- createDebugFunctions() : デバッグ用SQL関数の作成コード表示');