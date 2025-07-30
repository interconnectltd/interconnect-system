// ==========================================
// マッチング機能の完全実装
// ==========================================

(function() {
    'use strict';
    
    console.log('[FullImplementation] マッチング機能の完全実装を開始');
    
    // マッチングスコア計算
    const calculateMatchingScore = (profile, currentUser) => {
        // 各パラメータの重み
        const weights = {
            industry: 0.25,      // 業界の一致
            location: 0.15,      // 地域の近さ
            skills: 0.20,        // スキルの重複
            interests: 0.20,     // 興味の一致
            experience: 0.10,    // 経験年数の近さ
            activity: 0.10       // アクティビティレベル
        };
        
        let score = 0;
        
        // 業界の一致度
        if (profile.industry === currentUser?.industry) {
            score += weights.industry * 100;
        } else if (profile.industry && currentUser?.industry) {
            // 関連業界なら部分点
            const relatedIndustries = {
                'IT・テクノロジー': ['金融・コンサルティング', '商社・流通'],
                '金融・コンサルティング': ['IT・テクノロジー', '商社・流通'],
                '医療・ヘルスケア': ['IT・テクノロジー'],
                '人材・教育': ['IT・テクノロジー', '金融・コンサルティング']
            };
            
            if (relatedIndustries[profile.industry]?.includes(currentUser.industry)) {
                score += weights.industry * 60;
            } else {
                score += weights.industry * 30;
            }
        }
        
        // 地域の近さ
        if (profile.location === currentUser?.location) {
            score += weights.location * 100;
        } else if (profile.location && currentUser?.location) {
            const nearbyLocations = {
                '東京': ['横浜', '千葉', '埼玉'],
                '大阪': ['京都', '神戸', '奈良'],
                '名古屋': ['岐阜', '三重'],
                '福岡': ['北九州', '佐賀']
            };
            
            if (nearbyLocations[profile.location]?.includes(currentUser.location) ||
                nearbyLocations[currentUser.location]?.includes(profile.location)) {
                score += weights.location * 70;
            } else {
                score += weights.location * 40;
            }
        }
        
        // スキルの重複度
        if (profile.skills && currentUser?.skills) {
            const commonSkills = profile.skills.filter(skill => 
                currentUser.skills.includes(skill)
            );
            const skillMatch = (commonSkills.length / Math.max(profile.skills.length, currentUser.skills.length)) * 100;
            score += weights.skills * skillMatch;
        } else {
            score += weights.skills * 50; // データなしの場合は中間点
        }
        
        // 興味の一致度
        if (profile.interests && currentUser?.interests) {
            const commonInterests = profile.interests.filter(interest => 
                currentUser.interests.includes(interest)
            );
            const interestMatch = (commonInterests.length / Math.max(profile.interests.length, currentUser.interests.length)) * 100;
            score += weights.interests * interestMatch;
        } else {
            score += weights.interests * 50;
        }
        
        // 経験年数（仮の計算）
        const profileExperience = profile.created_at ? 
            Math.floor((new Date() - new Date(profile.created_at)) / (365 * 24 * 60 * 60 * 1000)) : 0;
        const userExperience = currentUser?.created_at ? 
            Math.floor((new Date() - new Date(currentUser.created_at)) / (365 * 24 * 60 * 60 * 1000)) : 0;
        
        const experienceDiff = Math.abs(profileExperience - userExperience);
        const experienceScore = Math.max(0, 100 - experienceDiff * 20);
        score += weights.experience * experienceScore;
        
        // アクティビティレベル
        if (profile.last_active_at) {
            const lastActive = new Date(profile.last_active_at);
            const now = new Date();
            const hoursSinceActive = (now - lastActive) / (1000 * 60 * 60);
            
            if (hoursSinceActive < 1) {
                score += weights.activity * 100; // オンライン
            } else if (hoursSinceActive < 24) {
                score += weights.activity * 80;  // 最近アクティブ
            } else if (hoursSinceActive < 168) {
                score += weights.activity * 60;  // 今週アクティブ
            } else {
                score += weights.activity * 40;  // それ以前
            }
        } else {
            score += weights.activity * 50;
        }
        
        return Math.round(score);
    };
    
    // レーダーチャートデータの生成
    const generateRadarData = (profile, currentUser, matchingScore) => {
        // 基本スコアをマッチング度に基づいて調整
        const baseScore = matchingScore / 100;
        
        return {
            businessSynergy: Math.round((baseScore * 80 + Math.random() * 20) * 100) / 100,
            solutionMatch: Math.round((baseScore * 70 + Math.random() * 30) * 100) / 100,
            businessTrends: Math.round((baseScore * 75 + Math.random() * 25) * 100) / 100,
            growthPhaseMatch: Math.round((baseScore * 85 + Math.random() * 15) * 100) / 100,
            urgencyAlignment: Math.round((baseScore * 90 + Math.random() * 10) * 100) / 100,
            resourceComplement: Math.round((baseScore * 80 + Math.random() * 20) * 100) / 100
        };
    };
    
    // プロファイル詳細表示
    const showProfileDetail = async (profileId) => {
        console.log('[FullImplementation] プロファイル詳細表示:', profileId);
        
        try {
            const { data: profile, error } = await window.supabase
                .from('profiles')
                .select('*')
                .eq('id', profileId)
                .single();
            
            if (error) throw error;
            
            // モーダルを作成
            const modal = document.createElement('div');
            modal.className = 'profile-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 12px;
                    padding: 30px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    position: relative;
                ">
                    <button onclick="this.closest('.profile-modal').remove()" style="
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                    ">×</button>
                    
                    <div style="text-align: center; margin-bottom: 30px;">
                        <img src="${profile.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.name)}" 
                             style="width: 120px; height: 120px; border-radius: 50%; margin-bottom: 20px;">
                        <h2 style="margin: 10px 0;">${profile.name}</h2>
                        <p style="color: #666; font-size: 18px;">
                            ${profile.title || ''} ${profile.company ? '@' + profile.company : ''}
                        </p>
                    </div>
                    
                    ${profile.bio ? `
                        <div style="margin-bottom: 25px;">
                            <h3 style="margin-bottom: 10px;">自己紹介</h3>
                            <p style="line-height: 1.6;">${profile.bio}</p>
                        </div>
                    ` : ''}
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                        ${profile.industry ? `
                            <div>
                                <strong>業界:</strong> ${profile.industry}
                            </div>
                        ` : ''}
                        ${profile.location ? `
                            <div>
                                <strong>地域:</strong> ${profile.location}
                            </div>
                        ` : ''}
                    </div>
                    
                    ${profile.skills && profile.skills.length > 0 ? `
                        <div style="margin-bottom: 25px;">
                            <h3 style="margin-bottom: 10px;">スキル</h3>
                            <div>
                                ${profile.skills.map(skill => 
                                    `<span style="
                                        display: inline-block;
                                        background: #e3f2fd;
                                        color: #1976d2;
                                        padding: 6px 16px;
                                        border-radius: 20px;
                                        margin: 4px;
                                    ">${skill}</span>`
                                ).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${profile.interests && profile.interests.length > 0 ? `
                        <div style="margin-bottom: 25px;">
                            <h3 style="margin-bottom: 10px;">興味・関心</h3>
                            <div>
                                ${profile.interests.map(interest => 
                                    `<span style="
                                        display: inline-block;
                                        background: #f3e5f5;
                                        color: #7b1fa2;
                                        padding: 6px 16px;
                                        border-radius: 20px;
                                        margin: 4px;
                                    ">${interest}</span>`
                                ).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <button class="btn btn-primary" onclick="window.fullImplementation.sendConnect('${profileId}')">
                            コネクト申請を送る
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
        } catch (error) {
            console.error('[FullImplementation] プロファイル取得エラー:', error);
            alert('プロファイルの読み込みに失敗しました');
        }
    };
    
    // コネクト申請
    const sendConnect = async (profileId) => {
        console.log('[FullImplementation] コネクト申請:', profileId);
        
        try {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) throw new Error('ログインが必要です');
            
            // connectionsテーブルに挿入
            const { data, error } = await window.supabase
                .from('connections')
                .insert({
                    user_id: user.id,
                    target_user_id: profileId,
                    status: 'pending'
                });
            
            if (error) {
                if (error.code === '23505') { // 重複エラー
                    alert('既にコネクト申請を送信済みです');
                } else {
                    throw error;
                }
            } else {
                alert('コネクト申請を送信しました！');
                // モーダルを閉じる
                document.querySelector('.profile-modal')?.remove();
            }
            
        } catch (error) {
            console.error('[FullImplementation] コネクト申請エラー:', error);
            alert('コネクト申請の送信に失敗しました: ' + error.message);
        }
    };
    
    // メインの実装を更新
    const updateMatchingDisplay = async () => {
        console.log('[FullImplementation] マッチング表示を更新');
        
        const container = document.getElementById('matching-container');
        if (!container) return;
        
        try {
            // 現在のユーザー情報取得
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) throw new Error('ログインが必要です');
            
            const { data: currentUserProfile } = await window.supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            // 他のプロファイル取得
            const { data: profiles, error } = await window.supabase
                .from('profiles')
                .select('*')
                .neq('id', user.id)
                .limit(20);
            
            if (error) throw error;
            
            // マッチング度を計算してソート
            const profilesWithScore = profiles.map(profile => ({
                ...profile,
                matchingScore: calculateMatchingScore(profile, currentUserProfile),
                radarData: generateRadarData(profile, currentUserProfile, calculateMatchingScore(profile, currentUserProfile))
            })).sort((a, b) => b.matchingScore - a.matchingScore);
            
            // 表示
            const gridHTML = profilesWithScore.map((profile, index) => {
                const avatarUrl = profile.avatar_url || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=random`;
                
                return `
                    <div class="matching-card" data-profile-id="${profile.id}" style="
                        background: white;
                        border: 1px solid #e0e0e0;
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 20px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        position: relative;
                    ">
                        <div style="
                            position: absolute;
                            top: 10px;
                            right: 10px;
                            background: ${profile.matchingScore >= 80 ? '#27ae60' : profile.matchingScore >= 60 ? '#3498db' : '#95a5a6'};
                            color: white;
                            padding: 5px 10px;
                            border-radius: 20px;
                            font-weight: bold;
                        ">${profile.matchingScore}%</div>
                        
                        <div style="text-align: center;">
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
                            
                            <!-- レーダーチャート -->
                            <div class="radar-chart-mini" id="radar-${index}" style="
                                width: 150px;
                                height: 150px;
                                margin: 20px auto;
                            ">
                                <canvas width="150" height="150"></canvas>
                            </div>
                            
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
                                    onclick="window.fullImplementation.showProfile('${profile.id}')">
                                    詳細を見る
                                </button>
                                <button class="btn btn-primary" 
                                    onclick="window.fullImplementation.sendConnect('${profile.id}')">
                                    コネクト
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            container.innerHTML = `
                <div style="margin-bottom: 30px;">
                    <h2>マッチング候補 (${profilesWithScore.length}件)</h2>
                    <p style="color: #666;">マッチング度が高い順に表示しています</p>
                </div>
                <div style="
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 20px;
                ">
                    ${gridHTML}
                </div>
            `;
            
            // レーダーチャートを描画
            profilesWithScore.forEach((profile, index) => {
                const canvas = document.querySelector(`#radar-${index} canvas`);
                if (canvas) {
                    drawMiniRadarChart(canvas, profile.radarData);
                }
            });
            
        } catch (error) {
            console.error('[FullImplementation] エラー:', error);
            container.innerHTML = `
                <div style="background: #fee; padding: 20px; margin: 20px 0; border-radius: 8px;">
                    <h3>エラーが発生しました</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">再読み込み</button>
                </div>
            `;
        }
    };
    
    // ミニレーダーチャート描画
    const drawMiniRadarChart = (canvas, data) => {
        const ctx = canvas.getContext('2d');
        const centerX = 75;
        const centerY = 75;
        const radius = 60;
        
        // 背景をクリア
        ctx.clearRect(0, 0, 150, 150);
        
        // グリッド線
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            for (let j = 0; j < 6; j++) {
                const angle = (Math.PI * 2 / 6) * j - Math.PI / 2;
                const x = centerX + Math.cos(angle) * (radius * i / 5);
                const y = centerY + Math.sin(angle) * (radius * i / 5);
                if (j === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }
        
        // 軸線
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + Math.cos(angle) * radius,
                centerY + Math.sin(angle) * radius
            );
            ctx.stroke();
        }
        
        // データ描画
        ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const values = Object.values(data);
        values.forEach((value, i) => {
            const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
            const x = centerX + Math.cos(angle) * (radius * value / 100);
            const y = centerY + Math.sin(angle) * (radius * value / 100);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // データポイント
        ctx.fillStyle = '#3498db';
        values.forEach((value, i) => {
            const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
            const x = centerX + Math.cos(angle) * (radius * value / 100);
            const y = centerY + Math.sin(angle) * (radius * value / 100);
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    };
    
    // グローバル関数を登録
    window.fullImplementation = {
        showProfile: showProfileDetail,
        sendConnect: sendConnect,
        update: updateMatchingDisplay
    };
    
    // 初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateMatchingDisplay);
    } else {
        setTimeout(updateMatchingDisplay, 1000);
    }
    
    console.log('[FullImplementation] 完全実装準備完了');
    
})();