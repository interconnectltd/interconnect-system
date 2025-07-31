// ==========================================
// マッチング表示の完全オーバーライド
// ==========================================

(function() {
    'use strict';
    
    console.log('[DisplayOverride] マッチング表示の完全オーバーライド開始');
    
    // すべての既存表示をクリアして新しい表示に置き換える
    const overrideAllDisplay = async () => {
        // 既存のコンテナをクリア
        const container = document.getElementById('matching-container');
        if (!container) {
            console.error('[DisplayOverride] matching-containerが見つかりません');
            return;
        }
        
        // ローディング表示
        container.innerHTML = `
            <div style="text-align: center; padding: 60px;">
                <div class="spinner" style="
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                <p>最適化されたマッチング表示を読み込み中...</p>
            </div>
        `;
        
        try {
            // Supabaseからデータ取得
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) throw new Error('ログインが必要です');
            
            // プロファイル取得
            const { data: profiles, error } = await window.supabase
                .from('profiles')
                .select('*')
                .neq('id', user.id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // 表示を生成
            generateOptimizedDisplay(container, profiles, user);
            
        } catch (error) {
            console.error('[DisplayOverride] エラー:', error);
            container.innerHTML = `
                <div style="background: #fee; padding: 20px; border-radius: 8px; text-align: center;">
                    <h3>エラーが発生しました</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" style="
                        padding: 10px 20px;
                        background: #3498db;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    ">再読み込み</button>
                </div>
            `;
        }
    };
    
    // 最適化された表示を生成
    const generateOptimizedDisplay = (container, profiles, currentUser) => {
        console.log('[DisplayOverride] プロファイル数:', profiles.length);
        
        // マッチング度を計算
        const profilesWithScore = profiles.map(profile => {
            const score = calculateSimpleMatchingScore(profile);
            return { ...profile, matchingScore: score };
        }).sort((a, b) => b.matchingScore - a.matchingScore);
        
        // HTML生成
        const html = `
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .override-matching-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                    gap: 24px;
                    margin-top: 30px;
                }
                
                .override-matching-card {
                    background: white;
                    border: 1px solid #e0e0e0;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    transition: all 0.3s ease;
                    position: relative;
                }
                
                .override-matching-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 6px 20px rgba(0,0,0,0.12);
                }
                
                .override-score-badge {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-weight: 600;
                    font-size: 14px;
                    color: white;
                }
                
                .score-high { background: #27ae60; }
                .score-medium { background: #3498db; }
                .score-low { background: #95a5a6; }
                
                .override-profile-header {
                    text-align: center;
                    margin-bottom: 20px;
                }
                
                .override-avatar {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    margin-bottom: 15px;
                    border: 3px solid #f0f0f0;
                }
                
                .override-radar-container {
                    width: 180px;
                    height: 180px;
                    margin: 20px auto;
                    background: #f8f9fa;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .override-info-section {
                    background: #f8f9fa;
                    border-radius: 8px;
                    padding: 16px;
                    margin: 16px 0;
                }
                
                .override-info-incomplete {
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                }
                
                .override-warning {
                    color: #856404;
                    text-align: center;
                    font-size: 14px;
                    margin-bottom: 12px;
                }
                
                .override-info-row {
                    margin: 8px 0;
                    display: flex;
                    align-items: flex-start;
                }
                
                .override-info-label {
                    font-weight: 600;
                    color: #2c3e50;
                    min-width: 80px;
                    margin-right: 10px;
                }
                
                .override-info-value {
                    flex: 1;
                }
                
                .override-empty-value {
                    color: #999;
                    font-style: italic;
                }
                
                .override-skill-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                
                .override-skill-tag {
                    background: #e3f2fd;
                    color: #1976d2;
                    padding: 4px 12px;
                    border-radius: 16px;
                    font-size: 12px;
                    font-weight: 500;
                }
                
                .override-actions {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-top: 20px;
                }
                
                .override-btn {
                    padding: 10px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .override-btn-secondary {
                    background: #f0f0f0;
                    color: #2c3e50;
                }
                
                .override-btn-secondary:hover {
                    background: #e0e0e0;
                }
                
                .override-btn-primary {
                    background: #3498db;
                    color: white;
                }
                
                .override-btn-primary:hover {
                    background: #2980b9;
                }
            </style>
            
            <div style="margin-bottom: 30px;">
                <h2 style="margin-bottom: 10px;">マッチング候補</h2>
                <p style="color: #7f8c8d;">${profilesWithScore.length}件の候補が見つかりました</p>
            </div>
            
            <div class="override-matching-grid">
                ${profilesWithScore.map((profile, index) => createOverrideCard(profile, index)).join('')}
            </div>
        `;
        
        container.innerHTML = html;
        
        // レーダーチャート描画
        setTimeout(() => {
            profilesWithScore.forEach((profile, index) => {
                drawSimpleRadar(index, profile.matchingScore);
            });
        }, 100);
    };
    
    // カード生成
    const createOverrideCard = (profile, index) => {
        const scoreClass = profile.matchingScore >= 80 ? 'score-high' : 
                          profile.matchingScore >= 60 ? 'score-medium' : 'score-low';
        
        // 情報の有無をチェック
        const hasSkills = profile.skills && profile.skills.length > 0;
        const hasLocation = profile.location && profile.location !== '';
        const hasIndustry = profile.industry && profile.industry !== '';
        const hasTitle = profile.title && profile.title !== '';
        const hasCompany = profile.company && profile.company !== '';
        
        // 情報不足かどうか
        const isIncomplete = !hasSkills && !hasLocation && !hasIndustry;
        
        return `
            <div class="override-matching-card">
                <div class="override-score-badge ${scoreClass}">${profile.matchingScore}%</div>
                
                <div class="override-profile-header">
                    <img src="${profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=random`}" 
                         alt="${profile.name}" 
                         class="override-avatar">
                    <h3 style="margin: 10px 0;">${profile.name || '名前未設定'}</h3>
                    <p style="color: #666; margin: 5px 0;">
                        ${hasTitle || hasCompany ? 
                            `${profile.title || ''}${hasTitle && hasCompany ? ' @ ' : ''}${profile.company || ''}` : 
                            '<span class="override-empty-value">役職・会社未設定</span>'
                        }
                    </p>
                </div>
                
                <div class="override-radar-container" id="override-radar-${index}">
                    <canvas width="180" height="180"></canvas>
                </div>
                
                <div class="override-info-section ${isIncomplete ? 'override-info-incomplete' : ''}">
                    ${isIncomplete ? `
                        <div class="override-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            プロファイル情報が不足しています
                        </div>
                    ` : ''}
                    
                    <div class="override-info-row">
                        <span class="override-info-label">スキル:</span>
                        <div class="override-info-value">
                            ${hasSkills ? `
                                <div class="override-skill-tags">
                                    ${profile.skills.map(skill => 
                                        `<span class="override-skill-tag">${skill}</span>`
                                    ).join('')}
                                </div>
                            ` : '<span class="override-empty-value">未設定</span>'}
                        </div>
                    </div>
                    
                    <div class="override-info-row">
                        <span class="override-info-label">地域:</span>
                        <div class="override-info-value">
                            ${hasLocation ? profile.location : '<span class="override-empty-value">未設定</span>'}
                        </div>
                    </div>
                    
                    <div class="override-info-row">
                        <span class="override-info-label">業界:</span>
                        <div class="override-info-value">
                            ${hasIndustry ? profile.industry : '<span class="override-empty-value">未設定</span>'}
                        </div>
                    </div>
                </div>
                
                <div class="override-actions">
                    <button class="override-btn override-btn-secondary" 
                            onclick="alert('プロファイル詳細表示は準備中です')">
                        詳細を見る
                    </button>
                    <button class="override-btn override-btn-primary" 
                            onclick="alert('コネクト申請機能は準備中です')">
                        コネクト申請
                    </button>
                </div>
            </div>
        `;
    };
    
    // シンプルなマッチング度計算
    const calculateSimpleMatchingScore = (profile) => {
        // 基本スコアは25%スタート
        let score = 25;
        
        // プロフィールの充実度で加点
        if (profile.skills && profile.skills.length > 0) {
            score += Math.min(profile.skills.length * 3, 15); // 最大15点
        }
        if (profile.location) score += 8;
        if (profile.industry) score += 8;
        if (profile.title) score += 5;
        if (profile.company) score += 5;
        if (profile.bio && profile.bio.length > 50) score += 7;
        if (profile.interests && profile.interests.length > 0) {
            score += Math.min(profile.interests.length * 2, 6); // 最大6点
        }
        
        // ランダム要素（±5%）
        const randomAdjustment = Math.floor((Math.random() - 0.5) * 10);
        score += randomAdjustment;
        
        // 20%〜85%の範囲に収める
        return Math.max(20, Math.min(85, score));
    };
    
    // シンプルなレーダーチャート
    const drawSimpleRadar = (index, score) => {
        const canvas = document.querySelector(`#override-radar-${index} canvas`);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = 90;
        const centerY = 90;
        const radius = 70;
        
        // 背景
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, 180, 180);
        
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
        
        // データ
        const baseValue = score / 100;
        const values = Array(6).fill(0).map(() => 
            Math.round(baseValue * 70 + Math.random() * 30)
        );
        
        // データポリゴン
        ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
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
    };
    
    // 初期化
    setTimeout(overrideAllDisplay, 2000);
    
    // グローバル公開
    window.displayOverride = {
        refresh: overrideAllDisplay,
        generateOptimizedDisplay: generateOptimizedDisplay,
        createOverrideCard: createOverrideCard,
        drawSimpleRadar: drawSimpleRadar,
        calculateSimpleMatchingScore: calculateSimpleMatchingScore
    };
    
    console.log('[DisplayOverride] 準備完了');
    console.log('手動更新: displayOverride.refresh()');
    
})();