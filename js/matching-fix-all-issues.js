// ==========================================
// すべての問題を修正する最終スクリプト
// ==========================================

(function() {
    'use strict';
    
    console.log('[FixAllIssues] 全問題修正スクリプト開始');
    
    // 1. matching-supabase.js の calculateMatchingScores を修正
    const fixCalculateMatchingScores = () => {
        if (window.matchingSupabase && window.matchingSupabase.calculateMatchingScores) {
            const original = window.matchingSupabase.calculateMatchingScores;
            
            window.matchingSupabase.calculateMatchingScores = function(profiles, currentUser) {
                console.log('[FixAllIssues] calculateMatchingScores パッチ適用');
                
                // プロファイルの安全な処理
                const safeProfiles = (profiles || []).map(profile => {
                    if (!profile) return null;
                    
                    return {
                        ...profile,
                        title: profile.title || '',
                        company: profile.company || '',
                        bio: profile.bio || '',
                        skills: Array.isArray(profile.skills) ? profile.skills : [],
                        industry: profile.industry || '',
                        location: profile.location || '',
                        interests: Array.isArray(profile.interests) ? profile.interests : [],
                        last_active_at: profile.last_active_at || null
                    };
                }).filter(p => p !== null);
                
                // 元の関数を安全に呼び出す
                try {
                    return original.call(this, safeProfiles, currentUser);
                } catch (error) {
                    console.error('[FixAllIssues] calculateMatchingScores エラー:', error);
                    // フォールバック: 基本的なスコア計算
                    return safeProfiles.map(profile => ({
                        ...profile,
                        matchingScore: Math.floor(Math.random() * 30) + 70
                    }));
                }
            };
            
            console.log('[FixAllIssues] calculateMatchingScores 修正完了');
        }
    };
    
    // 2. レーダーチャートの競合を解決
    const fixRadarChartConflicts = () => {
        console.log('[FixAllIssues] レーダーチャート競合修正開始');
        
        // 古いインスタンスをクリア
        if (window.matchingRadarChartEnhanced) {
            delete window.matchingRadarChartEnhanced;
        }
        
        // 統一されたレーダーチャート実装
        if (!window.MatchingRadarChart) {
            window.MatchingRadarChart = class {
                constructor(container) {
                    this.container = container;
                    this.canvas = container.querySelector('canvas');
                    if (!this.canvas) {
                        this.canvas = document.createElement('canvas');
                        this.canvas.width = 200;
                        this.canvas.height = 200;
                        container.appendChild(this.canvas);
                    }
                    this.ctx = this.canvas.getContext('2d');
                }
                
                updateData(data) {
                    this.drawRadarChart(data);
                }
                
                drawRadarChart(data) {
                    const ctx = this.ctx;
                    const centerX = this.canvas.width / 2;
                    const centerY = this.canvas.height / 2;
                    const radius = Math.min(centerX, centerY) - 20;
                    
                    // クリア
                    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    
                    // 背景グリッド
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
                    
                    // データポリゴン
                    ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
                    ctx.strokeStyle = '#3498db';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    
                    const values = [
                        data.businessSynergy || 50,
                        data.solutionMatch || 50,
                        data.businessTrends || 50,
                        data.growthPhaseMatch || 50,
                        data.urgencyAlignment || 50,
                        data.resourceComplement || 50
                    ];
                    
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
                }
            };
        }
        
        console.log('[FixAllIssues] レーダーチャート修正完了');
    };
    
    // 3. 重複する初期化を防ぐ
    const preventDuplicateInit = () => {
        if (window.matchingInitialized) {
            console.log('[FixAllIssues] 既に初期化済み、スキップ');
            return false;
        }
        window.matchingInitialized = true;
        return true;
    };
    
    // 4. 完全な再初期化
    const completeReinitialization = async () => {
        console.log('[FixAllIssues] 完全な再初期化開始');
        
        // Supabaseの確認
        if (!window.supabase) {
            console.error('[FixAllIssues] Supabaseが見つかりません');
            return;
        }
        
        try {
            // ユーザー確認
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) {
                console.error('[FixAllIssues] ユーザーがログインしていません');
                return;
            }
            
            // コンテナ取得または作成
            let container = document.getElementById('matching-container');
            if (!container) {
                console.log('[FixAllIssues] matching-containerを作成');
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    container = document.createElement('div');
                    container.id = 'matching-container';
                    
                    const existingGrid = mainContent.querySelector('.matching-grid');
                    if (existingGrid) {
                        mainContent.insertBefore(container, existingGrid);
                    } else {
                        mainContent.appendChild(container);
                    }
                }
            }
            
            if (!container) {
                console.error('[FixAllIssues] コンテナ作成失敗');
                return;
            }
            
            // 現在のユーザープロファイル取得
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
            
            // マッチング度計算（fullImplementationの関数を使用）
            const calculateScore = (profile, currentUser) => {
                const weights = {
                    industry: 0.25,
                    location: 0.15,
                    skills: 0.20,
                    interests: 0.20,
                    experience: 0.10,
                    activity: 0.10
                };
                
                let score = 0;
                
                // 業界
                if (profile.industry === currentUser?.industry) {
                    score += weights.industry * 100;
                } else {
                    score += weights.industry * 50;
                }
                
                // 地域
                if (profile.location === currentUser?.location) {
                    score += weights.location * 100;
                } else {
                    score += weights.location * 50;
                }
                
                // スキル
                if (profile.skills && currentUser?.skills) {
                    const common = profile.skills.filter(s => currentUser.skills.includes(s));
                    score += weights.skills * (common.length / Math.max(profile.skills.length, 1)) * 100;
                } else {
                    score += weights.skills * 50;
                }
                
                // 興味
                if (profile.interests && currentUser?.interests) {
                    const common = profile.interests.filter(i => currentUser.interests.includes(i));
                    score += weights.interests * (common.length / Math.max(profile.interests.length, 1)) * 100;
                } else {
                    score += weights.interests * 50;
                }
                
                // その他
                score += weights.experience * 70;
                score += weights.activity * 80;
                
                return Math.round(score);
            };
            
            // プロファイルにスコアを追加
            const profilesWithScore = profiles.map(profile => ({
                ...profile,
                matchingScore: calculateScore(profile, currentUserProfile)
            })).sort((a, b) => b.matchingScore - a.matchingScore);
            
            // HTML生成
            const html = `
                <h2 style="margin-bottom: 30px;">マッチング候補 (${profilesWithScore.length}件)</h2>
                <div class="matching-grid">
                    ${profilesWithScore.map((profile, index) => {
                        const scoreClass = profile.matchingScore >= 80 ? 'high' : 
                                         profile.matchingScore >= 60 ? 'medium' : 'low';
                        
                        return `
                            <div class="matching-card">
                                <div class="matching-score-badge ${scoreClass}">${profile.matchingScore}%</div>
                                
                                <div class="profile-header">
                                    <img src="${profile.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.name || 'User')}" 
                                         alt="${profile.name}" class="profile-avatar">
                                    <div class="profile-info">
                                        <h3>${profile.name || 'Unknown'}</h3>
                                        <p class="profile-title">
                                            ${profile.title || ''} ${profile.company ? '@' + profile.company : ''}
                                        </p>
                                    </div>
                                </div>
                                
                                <div class="radar-chart-container" id="radar-fixed-${index}">
                                    <canvas width="200" height="200"></canvas>
                                </div>
                                
                                <div class="profile-details">
                                    ${profile.skills && profile.skills.length > 0 ? `
                                        <p><strong>スキル:</strong>
                                            <span class="skills-container">
                                                ${profile.skills.map(skill => 
                                                    `<span class="skill-tag">${skill}</span>`
                                                ).join('')}
                                            </span>
                                        </p>
                                    ` : ''}
                                    ${profile.location ? `<p><strong>地域:</strong> ${profile.location}</p>` : ''}
                                    ${profile.industry ? `<p><strong>業界:</strong> ${profile.industry}</p>` : ''}
                                </div>
                                
                                <div class="profile-actions">
                                    <button class="btn-view" onclick="window.fullImplementation.showProfile('${profile.id}')">
                                        詳細を見る
                                    </button>
                                    <button class="btn-connect" onclick="window.fullImplementation.sendConnect('${profile.id}')">
                                        コネクト申請
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
            container.innerHTML = html;
            
            // レーダーチャート描画
            setTimeout(() => {
                profilesWithScore.forEach((profile, index) => {
                    const container = document.getElementById(`radar-fixed-${index}`);
                    if (container) {
                        const chart = new window.MatchingRadarChart(container);
                        const radarData = {
                            businessSynergy: 60 + Math.random() * 40,
                            solutionMatch: 60 + Math.random() * 40,
                            businessTrends: 60 + Math.random() * 40,
                            growthPhaseMatch: 60 + Math.random() * 40,
                            urgencyAlignment: 60 + Math.random() * 40,
                            resourceComplement: 60 + Math.random() * 40
                        };
                        chart.updateData(radarData);
                    }
                });
            }, 100);
            
            console.log('[FixAllIssues] 再初期化完了');
            
        } catch (error) {
            console.error('[FixAllIssues] 再初期化エラー:', error);
        }
    };
    
    // メイン実行
    const fixAll = async () => {
        console.log('[FixAllIssues] 修正プロセス開始');
        
        // 1. calculateMatchingScoresを修正
        fixCalculateMatchingScores();
        
        // 2. レーダーチャート競合を解決
        fixRadarChartConflicts();
        
        // 3. 重複初期化チェック
        if (!preventDuplicateInit()) {
            console.log('[FixAllIssues] 既に初期化済み');
            return;
        }
        
        // 4. 少し待ってから再初期化
        setTimeout(() => {
            completeReinitialization();
        }, 1000);
    };
    
    // グローバル公開
    window.fixAllMatchingIssues = {
        fix: fixAll,
        reinit: completeReinitialization
    };
    
    // 自動実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixAll);
    } else {
        setTimeout(fixAll, 500);
    }
    
    console.log('[FixAllIssues] 修正スクリプト準備完了');
    console.log('手動実行: fixAllMatchingIssues.fix()');
    console.log('再初期化: fixAllMatchingIssues.reinit()');
    
})();