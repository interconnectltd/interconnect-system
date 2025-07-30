// ==========================================
// 緊急修正 - 即座に実行される修正コード
// ==========================================

console.log('[EmergencyFix] 緊急修正を開始');

// すぐに実行される関数
(async function() {
    'use strict';
    
    // Supabaseの待機
    const waitForSupabase = async () => {
        let attempts = 0;
        while (!window.supabase && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        if (!window.supabase) {
            console.error('[EmergencyFix] Supabaseが見つかりません');
            return false;
        }
        return true;
    };
    
    // メイン処理
    const emergencyFix = async () => {
        console.log('[EmergencyFix] 処理開始');
        
        // Supabaseを待つ
        const supabaseReady = await waitForSupabase();
        if (!supabaseReady) {
            console.error('[EmergencyFix] Supabaseの初期化に失敗');
            return;
        }
        
        // コンテナを探すか作成
        let container = document.getElementById('matching-container');
        if (!container) {
            // 既存のmatching-gridを探す
            const existingGrid = document.querySelector('.matching-grid');
            if (existingGrid && existingGrid.parentElement) {
                container = document.createElement('div');
                container.id = 'matching-container';
                existingGrid.parentElement.insertBefore(container, existingGrid);
            } else {
                console.error('[EmergencyFix] 適切な場所が見つかりません');
                return;
            }
        }
        
        // ローディング表示
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                <p>マッチングデータを読み込み中...</p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        try {
            // ユーザー確認
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) {
                container.innerHTML = `
                    <div style="background: #fee; padding: 20px; margin: 20px 0; border-radius: 8px;">
                        <h3>ログインが必要です</h3>
                        <p>マッチング機能を利用するにはログインしてください。</p>
                        <a href="login.html" class="btn btn-primary">ログインページへ</a>
                    </div>
                `;
                return;
            }
            
            console.log('[EmergencyFix] ユーザー確認OK:', user.email);
            
            // プロファイル取得
            const { data: profiles, error } = await window.supabase
                .from('profiles')
                .select('*')
                .neq('id', user.id)
                .limit(10);
            
            if (error) {
                console.error('[EmergencyFix] データ取得エラー:', error);
                container.innerHTML = `
                    <div style="background: #fee; padding: 20px; margin: 20px 0; border-radius: 8px;">
                        <h3>データ取得エラー</h3>
                        <p>${error.message}</p>
                        <button class="btn btn-primary" onclick="location.reload()">再読み込み</button>
                    </div>
                `;
                return;
            }
            
            console.log('[EmergencyFix] 取得したプロファイル数:', profiles?.length || 0);
            
            if (!profiles || profiles.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <h3>マッチング候補が見つかりません</h3>
                        <p>現在、表示できるプロファイルがありません。</p>
                        <p style="color: #666; font-size: 14px;">
                            テストデータが必要な場合は、Supabaseでテストデータ用SQLを実行してください。
                        </p>
                    </div>
                `;
                return;
            }
            
            // マッチングカードを表示
            const gridHTML = profiles.map((profile, index) => {
                const matchingScore = Math.floor(Math.random() * 30) + 70;
                const avatarUrl = profile.avatar_url || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=random`;
                
                return `
                    <div class="matching-card" style="
                        background: white;
                        border: 1px solid #e0e0e0;
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 20px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    ">
                        <div style="text-align: center;">
                            <div style="
                                position: absolute;
                                top: 10px;
                                right: 10px;
                                background: #3498db;
                                color: white;
                                padding: 5px 10px;
                                border-radius: 20px;
                                font-weight: bold;
                            ">${matchingScore}%</div>
                            
                            <img src="${avatarUrl}" alt="${profile.name}" style="
                                width: 80px;
                                height: 80px;
                                border-radius: 50%;
                                margin-bottom: 15px;
                            ">
                            
                            <h3 style="margin: 10px 0;">${profile.name || 'Unknown'}</h3>
                            <p style="color: #666; margin: 5px 0;">
                                ${profile.title || ''} ${profile.company ? '@' + profile.company : ''}
                            </p>
                            
                            ${profile.skills && profile.skills.length > 0 ? `
                                <div style="margin: 15px 0;">
                                    ${profile.skills.slice(0, 3).map(skill => 
                                        `<span style="
                                            display: inline-block;
                                            background: #e3f2fd;
                                            color: #1976d2;
                                            padding: 4px 12px;
                                            border-radius: 16px;
                                            font-size: 12px;
                                            margin: 2px;
                                        ">${skill}</span>`
                                    ).join('')}
                                </div>
                            ` : ''}
                            
                            <div style="margin-top: 20px;">
                                <button class="btn btn-outline" style="margin-right: 10px;" 
                                    onclick="alert('プロファイル表示機能は実装中です')">
                                    プロファイル
                                </button>
                                <button class="btn btn-primary" 
                                    onclick="alert('コネクト申請機能は実装中です')">
                                    コネクト
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            container.innerHTML = `
                <div style="margin-bottom: 30px;">
                    <h2>マッチング候補 (${profiles.length}件)</h2>
                </div>
                <div style="
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 20px;
                ">
                    ${gridHTML}
                </div>
            `;
            
            console.log('[EmergencyFix] 表示完了');
            
        } catch (error) {
            console.error('[EmergencyFix] エラー:', error);
            container.innerHTML = `
                <div style="background: #fee; padding: 20px; margin: 20px 0; border-radius: 8px;">
                    <h3>予期しないエラー</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">再読み込み</button>
                </div>
            `;
        }
    };
    
    // DOMContentLoadedを待つ
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', emergencyFix);
    } else {
        // 既に読み込まれている場合は少し待ってから実行
        setTimeout(emergencyFix, 500);
    }
    
})();

// グローバルコマンド
window.emergencyFix = () => {
    console.log('[EmergencyFix] 手動実行');
    location.reload();
};

console.log('[EmergencyFix] 緊急修正システム準備完了');
console.log('手動実行: emergencyFix()');