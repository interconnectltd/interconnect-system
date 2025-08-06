/**
 * マッチング機能デバッグ
 * user_profilesテーブルのデータ取得テスト
 */

(function() {
    'use strict';

    console.log('[MatchingDebug] デバッグ開始');

    // Supabaseの初期化を待つ
    window.addEventListener('supabaseReady', async () => {
        console.log('[MatchingDebug] Supabase準備完了');
        
        try {
            // 現在のユーザー取得
            const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();
            if (userError) throw userError;
            
            console.log('[MatchingDebug] 現在のユーザー:', user?.id);

            // user_profilesテーブル全体を確認
            const { data: allProfiles, error: allError } = await window.supabaseClient
                .from('user_profiles')
                .select('*')
                .limit(5);

            if (allError) {
                console.error('[MatchingDebug] user_profilesテーブル取得エラー:', allError);
                return;
            }

            console.log('[MatchingDebug] user_profilesテーブル（最初の5件）:', allProfiles);

            // 現在のユーザー以外の取得（本来のクエリ）
            const { data: otherProfiles, error: otherError } = await window.supabaseClient
                .from('user_profiles')
                .select(`
                    *,
                    skills
                `)
                .neq('id', user?.id)
                .limit(10);

            if (otherError) {
                console.error('[MatchingDebug] 他ユーザー取得エラー:', otherError);
                return;
            }

            console.log('[MatchingDebug] 他のユーザープロフィール:', otherProfiles);
            console.log('[MatchingDebug] 取得件数:', otherProfiles?.length);

            // テストデータを挿入
            if (otherProfiles?.length === 0) {
                console.log('[MatchingDebug] テストデータがないため、サンプルデータを表示します');
                displayTestData();
            }

        } catch (error) {
            console.error('[MatchingDebug] エラー:', error);
        }
    });

    // テストデータ表示
    function displayTestData() {
        const container = document.getElementById('matching-container');
        if (!container) return;

        const testData = [
            {
                id: 'test-1',
                name: '田中太郎',
                company: 'テスト株式会社',
                position: 'CEO',
                industry: 'IT・テクノロジー',
                skills: ['AI', 'データ分析', 'マーケティング']
            },
            {
                id: 'test-2',
                name: '佐藤花子',
                company: 'サンプル企業',
                position: 'CTO',
                industry: '金融',
                skills: ['ブロックチェーン', 'フィンテック', 'セキュリティ']
            }
        ];

        container.innerHTML = `
            <div class="debug-message" style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 1rem; border-radius: 8px; margin-bottom: 2rem;">
                <h4>🔧 デバッグモード</h4>
                <p>実際のユーザーデータが見つからないため、テストデータを表示しています。</p>
                <p>コンソールで詳細なデバッグ情報を確認してください。</p>
            </div>
            <div class="matching-grid">
                ${testData.map(user => createTestCard(user)).join('')}
            </div>
        `;
    }

    function createTestCard(user) {
        const matchScore = Math.floor(Math.random() * 30 + 70);

        return `
            <div class="matching-card" data-user-id="${user.id}">
                <div class="matching-score">${matchScore}%</div>
                <img src="assets/user-placeholder.svg" alt="User" class="matching-avatar">
                <h3>${user.name}</h3>
                <p class="matching-title">${user.position}</p>
                <p class="matching-company">${user.company}</p>
                <div class="matching-tags">
                    ${user.skills.map(skill => `<span class="tag">${skill}</span>`).join('')}
                </div>
                <div class="matching-actions">
                    <button class="btn btn-outline" onclick="alert('テストモード: プロフィール表示')">プロフィール</button>
                    <button class="btn btn-primary" onclick="alert('テストモード: コネクト申請')">コネクト</button>
                </div>
            </div>
        `;
    }

    console.log('[MatchingDebug] デバッグファイル読み込み完了');
})();