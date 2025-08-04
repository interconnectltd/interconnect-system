// ===========================
// デバッグ用直接テスト関数
// ===========================

// コンソールから手動実行可能な関数群

// 1. 直接データベースクエリテスト
window.testDirectDB = async function() {
    console.log('=== 直接データベーステスト ===');
    
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        console.log('現在のユーザー:', user);
        
        // すべてのリンクを取得（RLS無視）
        const { data: allLinks, error: allError } = await supabaseClient
            .from('invite_links')
            .select('*');
        console.log('全てのリンク:', allLinks);
        console.log('全てのリンクエラー:', allError);
        
        // ユーザー指定リンク取得
        const { data: userLinks, error: userError } = await supabaseClient
            .from('invite_links')
            .select('*')
            .eq('created_by', user.id);
        console.log('ユーザーリンク:', userLinks);
        console.log('ユーザーリンクエラー:', userError);
        
    } catch (error) {
        console.error('テストエラー:', error);
    }
};

// 2. 手動リンク作成テスト
window.testCreateLink = async function(description = '手動テストリンク') {
    console.log('=== 手動リンク作成テスト ===');
    
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        console.log('ユーザー:', user);
        
        const { data, error } = await supabaseClient
            .rpc('create_invite_link', {
                p_user_id: user.id,
                p_description: description
            });
            
        console.log('RPC結果:', { data, error });
        console.log('RPC詳細:', JSON.stringify(data, null, 2));
        
        return data;
    } catch (error) {
        console.error('作成エラー:', error);
    }
};

// 3. テーブル構造確認
window.testTableStructure = async function() {
    console.log('=== テーブル構造確認 ===');
    
    try {
        // RLSポリシー確認
        const { data: policies, error: policyError } = await supabaseClient
            .rpc('execute_sql', { 
                sql: `SELECT policyname, cmd, permissive, roles, qual FROM pg_policies WHERE tablename = 'invite_links'`
            });
        console.log('RLSポリシー:', policies);
        console.log('ポリシーエラー:', policyError);
        
    } catch (error) {
        console.error('構造確認エラー:', error);
    }
};

// 4. 統合テスト
window.runFullTest = async function() {
    console.log('🚀 完全テスト開始');
    
    console.log('--- 1. テーブル構造確認 ---');
    await testTableStructure();
    
    console.log('--- 2. 直接DB確認 ---');
    await testDirectDB();
    
    console.log('--- 3. リンク作成テスト ---');
    const result = await testCreateLink('フルテストリンク');
    
    console.log('--- 4. 作成後確認 ---');
    await testDirectDB();
    
    console.log('🏁 完全テスト終了');
    return result;
};

// ページ読み込み後に利用可能メッセージ表示
setTimeout(() => {
    if (window.location.pathname.includes('referral')) {
        console.log(`
🔧 デバッグ関数が利用可能です:
- testDirectDB() : データベース直接確認
- testCreateLink() : 手動リンク作成
- testTableStructure() : テーブル構造確認
- runFullTest() : 全テスト実行
        `);
    }
}, 2000);