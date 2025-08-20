/**
 * コネクションページのデバッグヘルパー
 * ブラウザのコンソールで実行してください
 */

// コネクションデータを手動で再読み込み
async function debugConnections() {
    console.log('=== コネクションデバッグ開始 ===');
    
    // Supabaseクライアントの確認
    if (!window.supabaseClient) {
        console.error('Supabaseクライアントが見つかりません');
        return;
    }
    
    // 現在のユーザー
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) {
        console.error('ログインしていません');
        return;
    }
    
    console.log('現在のユーザー:', user.email, user.id);
    
    // connectionsテーブルのデータを取得
    const { data: connections, error } = await window.supabaseClient
        .from('connections')
        .select('*')
        .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`);
    
    if (error) {
        console.error('データ取得エラー:', error);
        return;
    }
    
    console.log('取得したコネクション数:', connections ? connections.length : 0);
    
    if (connections && connections.length > 0) {
        // ステータス別に分類
        const pending = connections.filter(c => c.status === 'pending');
        const accepted = connections.filter(c => c.status === 'accepted');
        const rejected = connections.filter(c => c.status === 'rejected');
        
        console.log('ステータス別:');
        console.log('- pending（申請中）:', pending.length);
        console.log('- accepted（承認済み）:', accepted.length);
        console.log('- rejected（拒否）:', rejected.length);
        
        // 申請中の詳細
        if (pending.length > 0) {
            console.log('\n申請中の詳細:');
            pending.forEach((conn, i) => {
                const isReceived = conn.connected_user_id === user.id;
                console.log(`${i + 1}. ${isReceived ? '受信' : '送信'}`);
                console.log('  - ID:', conn.id);
                console.log('  - 送信者:', conn.user_id);
                console.log('  - 受信者:', conn.connected_user_id);
                console.log('  - 作成日:', conn.created_at);
            });
        }
        
        // ConnectionsManagerインスタンスの確認
        if (window.connectionsManager) {
            console.log('\nConnectionsManagerの状態:');
            console.log('- received:', window.connectionsManager.connections.received.length);
            console.log('- sent:', window.connectionsManager.connections.sent.length);
            console.log('- connected:', window.connectionsManager.connections.connected.length);
            console.log('- rejected:', window.connectionsManager.connections.rejected.length);
            
            // データを再読み込み
            console.log('\nデータを再読み込みします...');
            await window.connectionsManager.loadAllConnectionsSimple();
            
            console.log('再読み込み後:');
            console.log('- received:', window.connectionsManager.connections.received.length);
            console.log('- sent:', window.connectionsManager.connections.sent.length);
            console.log('- connected:', window.connectionsManager.connections.connected.length);
            console.log('- rejected:', window.connectionsManager.connections.rejected.length);
        } else {
            console.warn('ConnectionsManagerインスタンスが見つかりません');
            console.log('手動で作成します...');
            window.connectionsManager = new ConnectionsManager();
        }
    }
    
    console.log('=== デバッグ完了 ===');
}

// テスト申請を作成
async function createTestPendingConnection() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) {
        console.error('ログインしてください');
        return;
    }
    
    // 他のユーザーを取得
    const { data: profiles } = await window.supabaseClient
        .from('profiles')
        .select('id, name')
        .neq('id', user.id)
        .limit(1);
    
    if (!profiles || profiles.length === 0) {
        console.error('他のユーザーが見つかりません');
        return;
    }
    
    const targetUser = profiles[0];
    
    // 既存の申請を確認
    const { data: existing } = await window.supabaseClient
        .from('connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('connected_user_id', targetUser.id)
        .single();
    
    if (existing) {
        console.log('既に申請が存在します:', existing);
        return;
    }
    
    // テスト申請を作成（messageカラムなし）
    const { data, error } = await window.supabaseClient
        .from('connections')
        .insert({
            user_id: user.id,
            connected_user_id: targetUser.id,
            status: 'pending'
        })
        .select();
    
    if (error) {
        console.error('作成エラー:', error);
    } else {
        console.log('テスト申請を作成しました:', data);
        // ページをリロード
        location.reload();
    }
}

// グローバルに公開
window.debugConnections = debugConnections;
window.createTestPendingConnection = createTestPendingConnection;

console.log('デバッグコマンド:');
console.log('- debugConnections() : コネクションデータをデバッグ');
console.log('- createTestPendingConnection() : テスト申請を作成');