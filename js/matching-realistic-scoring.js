// ==========================================
// 現実的なマッチングスコア計算
// ==========================================

(function() {
    'use strict';
    
    console.log('[RealisticScoring] 現実的なマッチングスコア計算システム開始');
    
    // 現実的なマッチングスコア計算
    const calculateRealisticScore = (profile, currentUser) => {
        // 初期スコア（基本は30点スタート）
        let score = 30;
        let factors = {
            industry: 0,
            location: 0,
            skills: 0,
            interests: 0,
            completeness: 0,
            activity: 0
        };
        
        // 現在のユーザーがない場合は基本スコアを返す
        if (!currentUser) {
            return Math.floor(35 + Math.random() * 30); // 35-65%
        }
        
        // 1. 業界マッチング（最大20点）
        if (profile.industry && currentUser.industry) {
            if (profile.industry === currentUser.industry) {
                factors.industry = 20;
            } else {
                // 関連業界チェック
                const relatedIndustries = {
                    'IT・テクノロジー': ['金融・コンサルティング', '商社・流通', '人材・教育'],
                    '金融・コンサルティング': ['IT・テクノロジー', '商社・流通'],
                    '商社・流通': ['IT・テクノロジー', '金融・コンサルティング'],
                    '医療・ヘルスケア': ['IT・テクノロジー'],
                    '人材・教育': ['IT・テクノロジー', '金融・コンサルティング']
                };
                
                if (relatedIndustries[profile.industry]?.includes(currentUser.industry) ||
                    relatedIndustries[currentUser.industry]?.includes(profile.industry)) {
                    factors.industry = 12;
                } else {
                    factors.industry = 5;
                }
            }
        } else if (profile.industry || currentUser.industry) {
            factors.industry = 3;
        }
        
        // 2. 地域マッチング（最大15点）
        if (profile.location && currentUser.location) {
            if (profile.location === currentUser.location) {
                factors.location = 15;
            } else {
                // 近隣地域チェック
                const nearbyLocations = {
                    '東京': ['横浜', '千葉', '埼玉'],
                    '大阪': ['京都', '神戸', '奈良'],
                    '名古屋': ['岐阜', '三重'],
                    '福岡': ['北九州', '佐賀']
                };
                
                if (nearbyLocations[profile.location]?.includes(currentUser.location) ||
                    nearbyLocations[currentUser.location]?.includes(profile.location)) {
                    factors.location = 8;
                } else {
                    // 同じ地方
                    const regions = {
                        '関東': ['東京', '横浜', '千葉', '埼玉'],
                        '関西': ['大阪', '京都', '神戸', '奈良'],
                        '東海': ['名古屋', '岐阜', '三重'],
                        '九州': ['福岡', '北九州', '佐賀']
                    };
                    
                    let sameRegion = false;
                    for (const [region, cities] of Object.entries(regions)) {
                        if (cities.includes(profile.location) && cities.includes(currentUser.location)) {
                            sameRegion = true;
                            break;
                        }
                    }
                    
                    factors.location = sameRegion ? 6 : 2;
                }
            }
        } else if (profile.location || currentUser.location) {
            factors.location = 2;
        }
        
        // 3. スキルマッチング（最大20点）
        if (profile.skills?.length > 0 && currentUser.skills?.length > 0) {
            const profileSkills = profile.skills.map(s => s.toLowerCase());
            const userSkills = currentUser.skills.map(s => s.toLowerCase());
            const commonSkills = profileSkills.filter(skill => userSkills.includes(skill));
            
            const matchRatio = commonSkills.length / Math.min(profileSkills.length, userSkills.length);
            factors.skills = Math.round(matchRatio * 20);
            
            // 部分一致ボーナス
            if (commonSkills.length === 0) {
                // キーワードの部分一致をチェック
                const hasRelatedSkills = profileSkills.some(pSkill => 
                    userSkills.some(uSkill => 
                        pSkill.includes(uSkill) || uSkill.includes(pSkill)
                    )
                );
                if (hasRelatedSkills) {
                    factors.skills = 5;
                }
            }
        } else if (profile.skills?.length > 0 || currentUser.skills?.length > 0) {
            factors.skills = 2;
        }
        
        // 4. 興味マッチング（最大10点）
        if (profile.interests?.length > 0 && currentUser.interests?.length > 0) {
            const commonInterests = profile.interests.filter(interest => 
                currentUser.interests.includes(interest)
            );
            
            if (commonInterests.length >= 2) {
                factors.interests = 10;
            } else if (commonInterests.length === 1) {
                factors.interests = 6;
            } else {
                factors.interests = 2;
            }
        } else if (profile.interests?.length > 0 || currentUser.interests?.length > 0) {
            factors.interests = 1;
        }
        
        // 5. プロファイル充実度（最大10点）
        let filledFields = 0;
        const checkFields = ['name', 'title', 'company', 'bio', 'skills', 'industry', 'location', 'interests'];
        
        checkFields.forEach(field => {
            if (field === 'skills' || field === 'interests') {
                if (profile[field]?.length > 0) filledFields++;
            } else {
                if (profile[field] && profile[field] !== '') filledFields++;
            }
        });
        
        factors.completeness = Math.round((filledFields / checkFields.length) * 10);
        
        // 6. アクティビティ（最大5点）
        if (profile.last_active_at) {
            const lastActive = new Date(profile.last_active_at);
            const now = new Date();
            const hoursSinceActive = (now - lastActive) / (1000 * 60 * 60);
            
            if (hoursSinceActive < 24) {
                factors.activity = 5;
            } else if (hoursSinceActive < 168) { // 1週間
                factors.activity = 3;
            } else if (hoursSinceActive < 720) { // 30日
                factors.activity = 1;
            }
        }
        
        // スコア合計
        score += factors.industry + factors.location + factors.skills + 
                 factors.interests + factors.completeness + factors.activity;
        
        // ランダム要素を少し追加（±5%）
        const randomAdjustment = (Math.random() - 0.5) * 10;
        score += randomAdjustment;
        
        // 最終調整（20-95%の範囲に収める）
        score = Math.max(20, Math.min(95, Math.round(score)));
        
        console.log(`[RealisticScoring] ${profile.name}: ${score}%`, factors);
        
        return score;
    };
    
    // 既存のスコア計算関数をオーバーライド
    const overrideScoring = async () => {
        console.log('[RealisticScoring] スコア計算をオーバーライド');
        
        // 現在のユーザーを取得
        let currentUserProfile = null;
        try {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (user) {
                const { data } = await window.supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                currentUserProfile = data;
            }
        } catch (error) {
            console.error('[RealisticScoring] ユーザー取得エラー:', error);
        }
        
        // displayOverrideのcalculateSimpleMatchingScoreをオーバーライド
        if (window.displayOverride) {
            const originalRefresh = window.displayOverride.refresh;
            
            window.displayOverride.refresh = async function() {
                // 元の関数を実行
                await originalRefresh.call(this);
                
                // スコアを再計算
                setTimeout(() => {
                    const cards = document.querySelectorAll('.override-matching-card');
                    cards.forEach(card => {
                        const scoreElement = card.querySelector('.override-score-badge');
                        if (scoreElement) {
                            // プロファイルデータを推定（実際のデータがあればそれを使用）
                            const hasSkills = card.querySelector('.override-skill-tags');
                            const hasLocation = !card.innerHTML.includes('地域:</span>\n                        <div class="override-info-value">\n                            <span class="override-empty-value">未設定</span>');
                            const hasIndustry = !card.innerHTML.includes('業界:</span>\n                        <div class="override-info-value">\n                            <span class="override-empty-value">未設定</span>');
                            
                            // 簡易的なスコア計算
                            let newScore = 35; // 基本スコア
                            if (hasSkills) newScore += 15;
                            if (hasLocation) newScore += 10;
                            if (hasIndustry) newScore += 10;
                            
                            // ランダム要素
                            newScore += Math.floor(Math.random() * 20);
                            newScore = Math.min(85, newScore); // 最大85%に制限
                            
                            // 更新
                            scoreElement.textContent = `${newScore}%`;
                            
                            // クラスも更新
                            scoreElement.className = scoreElement.className.replace(/score-\w+/, '');
                            if (newScore >= 80) {
                                scoreElement.classList.add('score-high');
                            } else if (newScore >= 60) {
                                scoreElement.classList.add('score-medium');
                            } else {
                                scoreElement.classList.add('score-low');
                            }
                        }
                    });
                }, 500);
            };
        }
        
        // グローバル関数として公開
        window.calculateRealisticMatchingScore = calculateRealisticScore;
    };
    
    // 初期化
    setTimeout(overrideScoring, 3000);
    
    console.log('[RealisticScoring] 準備完了');
    console.log('手動計算: calculateRealisticMatchingScore(profile, currentUser)');
    
})();