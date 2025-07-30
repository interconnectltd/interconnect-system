/**
 * マッチングデータの強制読み込み
 * データが読み込まれない問題を解決
 */

(function() {
    'use strict';
    
    console.log('[ForceLoad] マッチングデータ強制読み込み開始');
    
    // データを強制的に読み込む関数
    async function forceLoadMatchingData() {
        console.log('[ForceLoad] Supabase状態確認...');
        
        // Supabaseの確認
        if (!window.supabase) {
            console.error('[ForceLoad] Supabaseが見つかりません');
            return;
        }
        
        try {
            // 認証状態の確認
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) {
                console.error('[ForceLoad] ユーザーが認証されていません');
                return;
            }
            
            console.log('[ForceLoad] ユーザー認証確認:', user.email);
            
            // プロファイルデータの取得
            console.log('[ForceLoad] プロファイルデータを取得中...');
            const { data: profiles, error } = await window.supabase
                .from('profiles')
                .select('*')
                .neq('id', user.id)
                .limit(20);
                
            if (error) {
                console.error('[ForceLoad] データ取得エラー:', error);
                return;
            }
            
            console.log(`[ForceLoad] ${profiles.length}件のプロファイルを取得`);
            
            // matchingSupabaseが存在する場合は直接データを注入
            if (window.matchingSupabase) {
                console.log('[ForceLoad] matchingSupabaseにデータを注入');
                
                // プロファイルにスコアを追加
                const scoredProfiles = profiles.map(profile => {
                    // 基本スコアを計算
                    let score = 50;
                    if (profile.title) score += 10;
                    if (profile.company) score += 10;
                    if (profile.bio) score += 10;
                    if (profile.skills?.length > 0) score += 10;
                    
                    profile.matchingScore = Math.min(score, 95);
                    return profile;
                });
                
                // データを設定
                window.matchingSupabase.allProfiles = scoredProfiles;
                window.matchingSupabase.filteredProfiles = [...scoredProfiles];
                
                // UIを更新
                if (typeof window.matchingSupabase.renderProfiles === 'function') {
                    console.log('[ForceLoad] UIを更新中...');
                    window.matchingSupabase.renderProfiles();
                } else {
                    // 手動でカードを作成
                    console.log('[ForceLoad] 手動でカードを作成...');
                    createMatchingCards(scoredProfiles);
                }
                
                // レーダーチャートを追加
                setTimeout(() => {
                    console.log('[ForceLoad] レーダーチャートを追加...');
                    if (window.quickTest && window.quickTest.addChart) {
                        window.quickTest.addChart();
                    }
                }, 500);
            }
            
        } catch (error) {
            console.error('[ForceLoad] エラー:', error);
        }
    }
    
    // マッチングカードを手動で作成
    function createMatchingCards(profiles) {
        const grid = document.querySelector('.matching-grid');
        if (!grid) {
            console.error('[ForceLoad] matching-gridが見つかりません');
            return;
        }
        
        // 既存のカードをクリア
        grid.innerHTML = '';
        
        // カードを作成
        profiles.forEach((profile, index) => {
            const card = document.createElement('div');
            card.className = 'matching-card';
            card.innerHTML = `
                <div class="matching-score">${profile.matchingScore || 75}%</div>
                <img src="${profile.avatar_url || 'assets/user-placeholder.svg'}" alt="User" class="matching-avatar">
                <h3>${profile.name || 'ユーザー' + (index + 1)}</h3>
                <p class="matching-title">${profile.title || '役職未設定'}</p>
                <p class="matching-company">${profile.company || '会社未設定'}</p>
                <div class="matching-tags">
                    ${profile.skills && profile.skills.length > 0 ? 
                        profile.skills.slice(0, 3).map(skill => `<span class="tag">${skill}</span>`).join('') : 
                        '<span class="tag">スキル未設定</span>'
                    }
                </div>
                <div class="radar-chart-container" style="width: 200px; height: 200px; margin: 10px auto;"></div>
                <div class="matching-actions">
                    <a href="profile.html?user=${profile.id}" class="btn btn-outline">プロフィール</a>
                    <button class="btn btn-primary" onclick="alert('コネクト申請を送信しました')">コネクト</button>
                </div>
            `;
            grid.appendChild(card);
        });
        
        // 結果カウントを更新
        const resultsCount = document.querySelector('.results-count');
        if (resultsCount) {
            resultsCount.textContent = `${profiles.length}件のマッチング候補`;
        }
    }
    
    // 自動実行またはコマンドで実行
    if (window.location.pathname.includes('matching.html')) {
        // ページ読み込み後に実行
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(forceLoadMatchingData, 2000);
            });
        } else {
            setTimeout(forceLoadMatchingData, 1000);
        }
    }
    
    // グローバルコマンドとして公開
    window.forceLoadMatchingData = forceLoadMatchingData;
    
    console.log('[ForceLoad] 強制読み込みコマンド: forceLoadMatchingData()');
    
})();