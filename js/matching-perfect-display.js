// ==========================================
// マッチング表示の完璧な実装
// ==========================================

(function() {
    'use strict';
    
    console.log('[PerfectDisplay] 完璧な表示実装開始');
    
    // プロファイル情報の完全性チェック
    const ensureCompleteProfile = (profile) => {
        return {
            ...profile,
            name: profile.name || '名前未設定',
            title: profile.title || '',
            company: profile.company || '',
            bio: profile.bio || '',
            skills: Array.isArray(profile.skills) ? profile.skills : [],
            interests: Array.isArray(profile.interests) ? profile.interests : [],
            location: profile.location || '',
            industry: profile.industry || '',
            avatar_url: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=random`,
            last_active_at: profile.last_active_at || new Date().toISOString()
        };
    };
    
    // マッチングカードの完璧なHTML生成
    const createPerfectMatchingCard = (profile, index, matchingScore) => {
        const completeProfile = ensureCompleteProfile(profile);
        const scoreClass = matchingScore >= 80 ? 'high' : matchingScore >= 60 ? 'medium' : 'low';
        
        // プロファイルの充実度を確認
        const hasSkills = completeProfile.skills.length > 0;
        const hasLocation = completeProfile.location !== '';
        const hasIndustry = completeProfile.industry !== '';
        const hasTitle = completeProfile.title !== '';
        const hasCompany = completeProfile.company !== '';
        
        // 情報が少ない場合のメッセージ
        const needsMoreInfo = !hasSkills && !hasLocation && !hasIndustry;
        
        return `
            <div class="matching-card perfect-card" data-profile-id="${completeProfile.id}">
                <div class="matching-score-badge ${scoreClass}">${matchingScore}%</div>
                
                <div class="profile-header">
                    <img src="${completeProfile.avatar_url}" 
                         alt="${completeProfile.name}" 
                         class="profile-avatar"
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(completeProfile.name)}&background=random'">
                    <div class="profile-info">
                        <h3>${completeProfile.name}</h3>
                        <p class="profile-title">
                            ${hasTitle || hasCompany ? 
                                `${completeProfile.title}${hasTitle && hasCompany ? ' @ ' : ''}${completeProfile.company}` : 
                                '<span style="color: #999; font-style: italic;">役職・会社未設定</span>'
                            }
                        </p>
                    </div>
                </div>
                
                <!-- レーダーチャート -->
                <div class="radar-chart-container" id="radar-perfect-${index}">
                    <canvas width="200" height="200"></canvas>
                </div>
                
                <div class="profile-details ${needsMoreInfo ? 'profile-incomplete' : ''}">
                    ${needsMoreInfo ? `
                        <div style="
                            background: #fff3cd;
                            border: 1px solid #ffeaa7;
                            padding: 15px;
                            border-radius: 8px;
                            margin-bottom: 15px;
                            text-align: center;
                        ">
                            <p style="color: #856404; margin: 0; font-size: 14px;">
                                <i class="fas fa-info-circle"></i>
                                プロファイル情報が不足しています
                            </p>
                        </div>
                    ` : ''}
                    
                    ${hasSkills ? `
                        <div class="detail-row">
                            <strong>スキル:</strong>
                            <div class="skills-container">
                                ${completeProfile.skills.map(skill => 
                                    `<span class="skill-tag">${skill}</span>`
                                ).join('')}
                            </div>
                        </div>
                    ` : `
                        <div class="detail-row empty-info">
                            <strong>スキル:</strong>
                            <span style="color: #999; font-style: italic;">未設定</span>
                        </div>
                    `}
                    
                    ${hasLocation || hasIndustry ? `
                        <div class="detail-grid">
                            ${hasLocation ? `
                                <div class="detail-item">
                                    <i class="fas fa-map-marker-alt" style="color: #e74c3c; margin-right: 5px;"></i>
                                    <strong>地域:</strong> ${completeProfile.location}
                                </div>
                            ` : ''}
                            ${hasIndustry ? `
                                <div class="detail-item">
                                    <i class="fas fa-building" style="color: #3498db; margin-right: 5px;"></i>
                                    <strong>業界:</strong> ${completeProfile.industry}
                                </div>
                            ` : ''}
                        </div>
                    ` : `
                        <div class="detail-grid empty-info">
                            <div class="detail-item">
                                <i class="fas fa-map-marker-alt" style="color: #ccc; margin-right: 5px;"></i>
                                <strong>地域:</strong> <span style="color: #999;">未設定</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-building" style="color: #ccc; margin-right: 5px;"></i>
                                <strong>業界:</strong> <span style="color: #999;">未設定</span>
                            </div>
                        </div>
                    `}
                    
                    ${completeProfile.interests.length > 0 ? `
                        <div class="detail-row" style="margin-top: 10px;">
                            <strong>興味・関心:</strong>
                            <div class="interests-container">
                                ${completeProfile.interests.map(interest => 
                                    `<span class="interest-tag">${interest}</span>`
                                ).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="profile-actions">
                    <button class="btn-view" onclick="window.perfectDisplay.showProfile('${completeProfile.id}')">
                        <i class="fas fa-user"></i> 詳細を見る
                    </button>
                    <button class="btn-connect" onclick="window.perfectDisplay.sendConnect('${completeProfile.id}')">
                        <i class="fas fa-link"></i> コネクト申請
                    </button>
                </div>
            </div>
        `;
    };
    
    // 追加のCSS
    const injectPerfectStyles = () => {
        if (document.getElementById('perfect-display-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'perfect-display-styles';
        style.textContent = `
            .perfect-card {
                transition: all 0.3s ease;
            }
            
            .profile-incomplete {
                position: relative;
            }
            
            .detail-row {
                margin: 10px 0;
                display: flex;
                flex-wrap: wrap;
                align-items: flex-start;
                gap: 10px;
            }
            
            .detail-row strong {
                min-width: 70px;
                color: #2c3e50;
            }
            
            .detail-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin: 15px 0;
            }
            
            .detail-item {
                display: flex;
                align-items: center;
                font-size: 14px;
            }
            
            .detail-item strong {
                margin-left: 5px;
                margin-right: 5px;
            }
            
            .empty-info {
                opacity: 0.6;
            }
            
            .skills-container,
            .interests-container {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                flex: 1;
            }
            
            .skill-tag,
            .interest-tag {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 16px;
                font-size: 12px;
                font-weight: 500;
                transition: all 0.2s ease;
            }
            
            .skill-tag {
                background: #e3f2fd;
                color: #1976d2;
            }
            
            .skill-tag:hover {
                background: #1976d2;
                color: white;
                transform: translateY(-1px);
            }
            
            .interest-tag {
                background: #f3e5f5;
                color: #7b1fa2;
            }
            
            .interest-tag:hover {
                background: #7b1fa2;
                color: white;
                transform: translateY(-1px);
            }
            
            .profile-actions button {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }
            
            .profile-actions button i {
                font-size: 14px;
            }
            
            @media (max-width: 480px) {
                .detail-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    };
    
    // 完璧な表示更新
    const updatePerfectDisplay = async () => {
        console.log('[PerfectDisplay] 表示更新開始');
        
        injectPerfectStyles();
        
        const container = document.getElementById('matching-container');
        if (!container) {
            console.error('[PerfectDisplay] matching-containerが見つかりません');
            return;
        }
        
        try {
            // ユーザー確認
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) throw new Error('ログインが必要です');
            
            // 現在のユーザープロファイル
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
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (error) throw error;
            
            // マッチング度計算
            const profilesWithScore = profiles.map(profile => {
                const score = calculateAdvancedMatchingScore(profile, currentUserProfile);
                return { ...profile, matchingScore: score };
            }).sort((a, b) => b.matchingScore - a.matchingScore);
            
            // HTML生成
            const html = `
                <div class="matching-header" style="margin-bottom: 30px;">
                    <h2 style="margin-bottom: 10px;">マッチング候補</h2>
                    <p style="color: #7f8c8d; margin: 0;">
                        ${profilesWithScore.length}件の候補が見つかりました
                    </p>
                </div>
                <div class="matching-grid">
                    ${profilesWithScore.map((profile, index) => 
                        createPerfectMatchingCard(profile, index, profile.matchingScore)
                    ).join('')}
                </div>
            `;
            
            container.innerHTML = html;
            
            // レーダーチャート描画
            setTimeout(() => {
                profilesWithScore.forEach((profile, index) => {
                    drawPerfectRadarChart(index, profile.matchingScore);
                });
            }, 100);
            
        } catch (error) {
            console.error('[PerfectDisplay] エラー:', error);
            container.innerHTML = `
                <div class="matching-error">
                    <h3>エラーが発生しました</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="window.perfectDisplay.update()">
                        再試行
                    </button>
                </div>
            `;
        }
    };
    
    // 高度なマッチング度計算
    const calculateAdvancedMatchingScore = (profile, currentUser) => {
        let score = 50; // 基本スコア
        
        const profile1 = ensureCompleteProfile(profile);
        const profile2 = ensureCompleteProfile(currentUser || {});
        
        // 業界マッチング
        if (profile1.industry && profile2.industry) {
            if (profile1.industry === profile2.industry) {
                score += 15;
            } else {
                // 関連業界
                const relatedIndustries = {
                    'IT・テクノロジー': ['金融・コンサルティング', '商社・流通'],
                    '金融・コンサルティング': ['IT・テクノロジー'],
                    '医療・ヘルスケア': ['IT・テクノロジー']
                };
                
                if (relatedIndustries[profile1.industry]?.includes(profile2.industry)) {
                    score += 8;
                }
            }
        }
        
        // 地域
        if (profile1.location && profile2.location) {
            if (profile1.location === profile2.location) {
                score += 10;
            } else {
                // 近隣地域
                const nearbyAreas = {
                    '東京': ['横浜', '千葉', '埼玉'],
                    '大阪': ['京都', '神戸']
                };
                
                if (nearbyAreas[profile1.location]?.includes(profile2.location)) {
                    score += 5;
                }
            }
        }
        
        // スキルマッチング
        if (profile1.skills.length > 0 && profile2.skills.length > 0) {
            const commonSkills = profile1.skills.filter(skill => 
                profile2.skills.includes(skill)
            );
            score += Math.min(commonSkills.length * 5, 15);
        }
        
        // 興味マッチング
        if (profile1.interests.length > 0 && profile2.interests.length > 0) {
            const commonInterests = profile1.interests.filter(interest => 
                profile2.interests.includes(interest)
            );
            score += Math.min(commonInterests.length * 5, 10);
        }
        
        // プロファイル充実度ボーナス
        const completeness1 = calculateProfileCompleteness(profile1);
        if (completeness1 > 0.8) score += 5;
        
        return Math.min(Math.round(score), 99);
    };
    
    // プロファイル充実度計算
    const calculateProfileCompleteness = (profile) => {
        let filled = 0;
        const fields = ['name', 'title', 'company', 'bio', 'skills', 'location', 'industry', 'interests'];
        
        fields.forEach(field => {
            if (field === 'skills' || field === 'interests') {
                if (profile[field] && profile[field].length > 0) filled++;
            } else {
                if (profile[field] && profile[field] !== '') filled++;
            }
        });
        
        return filled / fields.length;
    };
    
    // レーダーチャート描画
    const drawPerfectRadarChart = (index, matchingScore) => {
        const container = document.getElementById(`radar-perfect-${index}`);
        if (!container) return;
        
        const canvas = container.querySelector('canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = 100;
        const centerY = 100;
        const radius = 80;
        
        // クリア
        ctx.clearRect(0, 0, 200, 200);
        
        // 背景
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, 200, 200);
        
        // グリッド
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
        
        // データ（マッチング度に基づいて生成）
        const baseValue = matchingScore / 100;
        const values = [
            baseValue * 90 + Math.random() * 10,
            baseValue * 85 + Math.random() * 15,
            baseValue * 80 + Math.random() * 20,
            baseValue * 85 + Math.random() * 15,
            baseValue * 90 + Math.random() * 10,
            baseValue * 80 + Math.random() * 20
        ];
        
        // データポリゴン
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(52, 152, 219, 0.4)');
        gradient.addColorStop(1, 'rgba(52, 152, 219, 0.1)');
        
        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
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
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    };
    
    // グローバル公開
    window.perfectDisplay = {
        update: updatePerfectDisplay,
        showProfile: (id) => {
            if (window.fullImplementation && window.fullImplementation.showProfile) {
                window.fullImplementation.showProfile(id);
            } else {
                alert('プロファイル詳細機能は準備中です');
            }
        },
        sendConnect: (id) => {
            if (window.fullImplementation && window.fullImplementation.sendConnect) {
                window.fullImplementation.sendConnect(id);
            } else {
                alert('コネクト申請機能は準備中です');
            }
        }
    };
    
    // 初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updatePerfectDisplay);
    } else {
        setTimeout(updatePerfectDisplay, 1500);
    }
    
    console.log('[PerfectDisplay] 準備完了');
    console.log('手動更新: perfectDisplay.update()');
    
})();