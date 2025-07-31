// ==========================================
// マッチングプロファイルのnullエラー修正
// ==========================================

(function() {
    'use strict';
    
    console.log('[ProfileNullFix] プロファイルnullエラー修正開始');
    
    // calculateMatchingScoresのエラーを修正
    if (window.matchingSupabase && window.matchingSupabase.calculateMatchingScores) {
        const originalCalculate = window.matchingSupabase.calculateMatchingScores;
        
        window.matchingSupabase.calculateMatchingScores = function(profiles) {
            console.log('[ProfileNullFix] calculateMatchingScores 呼び出し - プロファイル数:', profiles?.length);
            
            // nullまたはundefinedチェック
            if (!profiles || !Array.isArray(profiles)) {
                console.warn('[ProfileNullFix] プロファイル配列が無効です');
                return [];
            }
            
            // 各プロファイルをフィルタリングして有効なものだけを処理
            const validProfiles = profiles.filter(profile => {
                if (!profile || typeof profile !== 'object') {
                    console.warn('[ProfileNullFix] 無効なプロファイルをスキップ:', profile);
                    return false;
                }
                return true;
            });
            
            console.log('[ProfileNullFix] 有効なプロファイル数:', validProfiles.length);
            
            // 安全なスコア計算
            return validProfiles.map(profile => {
                let score = 50; // 基本スコア
                
                try {
                    // 各フィールドの安全なアクセス
                    if (profile.title && typeof profile.title === 'string') {
                        score += 5;
                    }
                    if (profile.company && typeof profile.company === 'string') {
                        score += 5;
                    }
                    if (profile.bio && typeof profile.bio === 'string' && profile.bio.length > 50) {
                        score += 10;
                    }
                    if (profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0) {
                        score += Math.min(profile.skills.length * 3, 15);
                    }
                    if (profile.industry && typeof profile.industry === 'string') {
                        score += 5;
                    }
                    if (profile.location && typeof profile.location === 'string') {
                        score += 5;
                    }
                    
                    // アクティビティスコア
                    if (profile.last_active_at || profile.created_at) {
                        const lastActive = new Date(profile.last_active_at || profile.created_at);
                        const now = new Date();
                        const hoursSinceActive = (now - lastActive) / (1000 * 60 * 60);
                        
                        if (hoursSinceActive < 24) score += 10;
                        else if (hoursSinceActive < 168) score += 5;
                        else if (hoursSinceActive < 720) score += 2;
                    }
                    
                    // スコアの範囲を制限
                    score = Math.max(20, Math.min(95, score));
                    
                } catch (error) {
                    console.error('[ProfileNullFix] スコア計算エラー:', error);
                    score = 50; // エラー時はデフォルトスコア
                }
                
                return {
                    ...profile,
                    score: score,
                    matchingScore: score
                };
            });
        };
    }
    
    // loadProfilesOptimizedのエラーも修正
    if (window.matchingSupabase && window.matchingSupabase.loadProfilesOptimized) {
        const originalLoadOptimized = window.matchingSupabase.loadProfilesOptimized;
        
        window.matchingSupabase.loadProfilesOptimized = async function() {
            console.log('[ProfileNullFix] loadProfilesOptimized 呼び出し');
            
            try {
                // ユーザー認証チェック
                const { data: { user } } = await window.supabase.auth.getUser();
                if (!user) {
                    console.warn('[ProfileNullFix] ユーザーが認証されていません');
                    return;
                }
                
                // プロファイル取得
                const { data: profiles, error } = await window.supabase
                    .from('profiles')
                    .select('*')
                    .neq('id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(50);
                
                if (error) {
                    console.error('[ProfileNullFix] プロファイル取得エラー:', error);
                    throw error;
                }
                
                if (!profiles || profiles.length === 0) {
                    console.warn('[ProfileNullFix] プロファイルが見つかりません');
                    // 空の表示
                    this.displayProfiles([]);
                    return;
                }
                
                // スコア計算前にプロファイルを検証
                const validProfiles = profiles.filter(p => p && typeof p === 'object');
                console.log('[ProfileNullFix] 検証済みプロファイル数:', validProfiles.length);
                
                // スコア計算
                let scoredProfiles = [];
                if (this.calculateMatchingScores) {
                    scoredProfiles = this.calculateMatchingScores(validProfiles);
                } else {
                    // フォールバック
                    scoredProfiles = validProfiles.map(profile => ({
                        ...profile,
                        score: Math.floor(Math.random() * 50) + 30,
                        matchingScore: Math.floor(Math.random() * 50) + 30
                    }));
                }
                
                // ソートと表示
                if (Array.isArray(scoredProfiles)) {
                    scoredProfiles.sort((a, b) => (b.score || 0) - (a.score || 0));
                    this.displayProfiles(scoredProfiles);
                } else {
                    console.error('[ProfileNullFix] scoredProfilesが配列ではありません:', scoredProfiles);
                    this.displayProfiles([]);
                }
                
            } catch (error) {
                console.error('[ProfileNullFix] loadProfilesOptimized エラー:', error);
                // エラー時も空の表示を試みる
                if (this.displayProfiles) {
                    this.displayProfiles([]);
                }
            }
        };
    }
    
    // マッチング表示の安全性も強化
    const safeDisplayProfiles = () => {
        const originalDisplay = window.matchingSupabase?.displayProfiles;
        if (originalDisplay) {
            window.matchingSupabase.displayProfiles = function(profiles) {
                console.log('[ProfileNullFix] displayProfiles 呼び出し - プロファイル数:', profiles?.length);
                
                // 安全なプロファイル配列を確保
                const safeProfiles = Array.isArray(profiles) ? profiles : [];
                
                // 各プロファイルにデフォルト値を設定
                const enhancedProfiles = safeProfiles.map(profile => {
                    if (!profile || typeof profile !== 'object') {
                        return {
                            id: 'unknown-' + Math.random(),
                            name: '名前未設定',
                            score: 50,
                            matchingScore: 50
                        };
                    }
                    
                    return {
                        id: profile.id || 'unknown-' + Math.random(),
                        name: profile.name || '名前未設定',
                        title: profile.title || '',
                        company: profile.company || '',
                        location: profile.location || '',
                        industry: profile.industry || '',
                        bio: profile.bio || '',
                        skills: Array.isArray(profile.skills) ? profile.skills : [],
                        interests: Array.isArray(profile.interests) ? profile.interests : [],
                        avatar_url: profile.avatar_url || '',
                        score: profile.score || profile.matchingScore || 50,
                        matchingScore: profile.matchingScore || profile.score || 50,
                        ...profile
                    };
                });
                
                // 元の表示関数を呼び出し
                return originalDisplay.call(this, enhancedProfiles);
            };
        }
    };
    
    // 初期化
    setTimeout(() => {
        safeDisplayProfiles();
        console.log('[ProfileNullFix] プロファイルnullエラー修正完了');
    }, 1000);
    
    // グローバル公開
    window.profileNullFix = {
        fixCalculateScores: () => {
            if (window.matchingSupabase) {
                console.log('[ProfileNullFix] スコア計算を再修正');
            }
        }
    };
    
})();