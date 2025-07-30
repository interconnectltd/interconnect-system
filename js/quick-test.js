/**
 * クイックテストスクリプト
 * production-ready-check.jsの簡易版
 */

console.log('🔍 クイックテスト開始...\n');

// 1. Supabase接続確認
if (window.supabase) {
    console.log('✅ Supabaseクライアント: OK');
} else {
    console.log('❌ Supabaseクライアント: 未初期化');
}

// 2. 認証状態確認
const userData = localStorage.getItem('supabase_user');
if (userData) {
    const user = JSON.parse(userData);
    console.log('✅ 認証済みユーザー:', user.email);
} else {
    console.log('⚠️ 未認証');
}

// 3. マッチング機能確認
if (window.matchingSupabase) {
    console.log('✅ マッチング機能: 初期化済み');
    if (window.matchingSupabase.currentProfiles) {
        console.log('✅ 読み込まれたプロフィール数:', window.matchingSupabase.currentProfiles.length);
    }
} else {
    console.log('❌ マッチング機能: 未初期化');
}

// 4. 最適化機能確認
if (window.matchingSupabase && typeof window.matchingSupabase.loadProfilesOptimized === 'function') {
    console.log('✅ サーバーサイドページネーション: 実装済み');
} else {
    console.log('⚠️ サーバーサイドページネーション: 未実装');
}

// 5. UI要素確認
const elements = {
    '.matching-grid': 'マッチンググリッド',
    '.matching-filters': 'フィルター',
    '.pagination': 'ページネーション'
};

console.log('\n📋 UI要素チェック:');
Object.entries(elements).forEach(([selector, name]) => {
    const el = document.querySelector(selector);
    console.log(el ? `✅ ${name}: OK` : `❌ ${name}: 見つかりません`);
});

// 6. エラーハンドリング確認
if (window.matchingSupabase && typeof window.matchingSupabase.escapeHtml === 'function') {
    console.log('\n✅ XSS対策: 実装済み');
}

// 7. 設定ファイル確認
if (window.MATCHING_CONFIG) {
    console.log('✅ 設定ファイル: 読み込み済み');
    console.log('  - 1ページあたりの表示数:', window.MATCHING_CONFIG.ITEMS_PER_PAGE);
    console.log('  - サーバーサイドページネーション:', window.MATCHING_CONFIG.USE_SERVER_PAGINATION ? '有効' : '無効');
}

console.log('\n✨ テスト完了！');
console.log('詳細な本番環境チェックを実行するには:');
console.log('1. ページをリロード');
console.log('2. productionReadyCheck.runAllChecks() を実行');