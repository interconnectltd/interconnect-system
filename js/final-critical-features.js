/**
 * Final Critical Features - 最終辛口チェックで見つかった必須機能
 * これ以上ない完全版
 */

(function() {
    'use strict';
    
    console.log('[FinalCritical] 最終必須機能の復活開始');
    
    // ============================================================
    // 1. AI駆動マッチングスコアリング（完全版）
    // from: backup/old-matching/matching-ai-scoring.js
    // ============================================================
    
    window.AIMatchingScorer = class {
        constructor() {
            this.weights = {
                commonTopics: 0.3,
                communicationStyle: 0.2,
                emotionalSync: 0.2,
                activityOverlap: 0.15,
                profileMatch: 0.15
            };
        }
        
        async calculateAdvancedScore(userId, targetUserId) {
            try {
                const [userProfile, targetProfile] = await Promise.all([
                    this.getUserProfile(userId),
                    this.getUserProfile(targetUserId)
                ]);
                
                if (!userProfile || !targetProfile) {
                    return { score: 50, breakdown: {} };
                }
                
                const scores = {
                    commonTopics: this.calculateTopicSimilarity(userProfile, targetProfile),
                    communicationStyle: this.calculateCommunicationCompatibility(userProfile, targetProfile),
                    emotionalSync: this.calculatePersonalityMatch(userProfile, targetProfile),
                    activityOverlap: this.calculateScheduleCompatibility(userProfile, targetProfile),
                    profileMatch: this.calculateBasicProfileMatch(userProfile, targetProfile)
                };
                
                const finalScore = Object.entries(scores).reduce((total, [key, score]) => {
                    return total + (score * this.weights[key]);
                }, 0);
                
                return {
                    score: Math.round(finalScore),
                    breakdown: scores,
                    recommendation: this.generateRecommendation(finalScore)
                };
                
            } catch (error) {
                console.error('[FinalCritical] AIスコアリングエラー:', error);
                return { score: 50, breakdown: {} };
            }
        }
        
        async getUserProfile(userId) {
            const client = window.supabaseClient;
            if (!client) return null;
            
            const { data } = await client
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
                
            return data;
        }
        
        calculateTopicSimilarity(user1, user2) {
            const interests1 = new Set(user1.interests || []);
            const interests2 = new Set(user2.interests || []);
            const skills1 = new Set(user1.skills || []);
            const skills2 = new Set(user2.skills || []);
            
            const commonInterests = [...interests1].filter(i => interests2.has(i));
            const commonSkills = [...skills1].filter(s => skills2.has(s));
            
            const totalCommon = commonInterests.length + commonSkills.length;
            const totalUnique = interests1.size + interests2.size + skills1.size + skills2.size;
            
            if (totalUnique === 0) return 50;
            
            return Math.min((totalCommon / totalUnique) * 200, 100);
        }
        
        calculateCommunicationCompatibility(user1, user2) {
            let score = 70; // ベーススコア
            
            // 業界が同じなら+15点
            if (user1.industry === user2.industry) score += 15;
            
            // 地域が近いなら+15点
            if (user1.location && user2.location) {
                if (user1.location === user2.location) score += 15;
                else if (this.areLocationNear(user1.location, user2.location)) score += 8;
            }
            
            return Math.min(score, 100);
        }
        
        calculatePersonalityMatch(user1, user2) {
            // プロフィール完成度からパーソナリティを推測
            const completeness1 = this.getProfileCompleteness(user1);
            const completeness2 = this.getProfileCompleteness(user2);
            
            const diff = Math.abs(completeness1 - completeness2);
            return Math.max(100 - diff, 0);
        }
        
        calculateScheduleCompatibility(user1, user2) {
            const lastLogin1 = new Date(user1.last_login || user1.updated_at);
            const lastLogin2 = new Date(user2.last_login || user2.updated_at);
            
            const hourDiff = Math.abs(lastLogin1.getHours() - lastLogin2.getHours());
            
            // 活動時間が近いほど高スコア
            return Math.max(100 - (hourDiff * 4), 0);
        }
        
        calculateBasicProfileMatch(user1, user2) {
            let score = 0;
            let factors = 0;
            
            // タイトルマッチ
            if (user1.title && user2.title) {
                factors++;
                if (this.areTitlesCompatible(user1.title, user2.title)) score += 100;
            }
            
            // 会社規模マッチ
            if (user1.company && user2.company) {
                factors++;
                if (this.areCompaniesCompatible(user1.company, user2.company)) score += 100;
            }
            
            // ビジネス課題マッチ
            if (user1.business_challenges && user2.skills) {
                factors++;
                const match = this.calculateChallengeSkillMatch(user1.business_challenges, user2.skills);
                score += match;
            }
            
            return factors > 0 ? score / factors : 50;
        }
        
        getProfileCompleteness(profile) {
            const fields = ['name', 'title', 'company', 'bio', 'skills', 'interests', 'avatar_url', 'location', 'industry'];
            const completed = fields.filter(f => profile[f] && profile[f].length > 0).length;
            return (completed / fields.length) * 100;
        }
        
        areLocationNear(loc1, loc2) {
            const regions = {
                '関東': ['東京', '神奈川', '埼玉', '千葉'],
                '関西': ['大阪', '京都', '兵庫', '奈良'],
                '中部': ['愛知', '岐阜', '静岡', '三重']
            };
            
            for (const [region, prefectures] of Object.entries(regions)) {
                if (prefectures.some(p => loc1.includes(p)) && 
                    prefectures.some(p => loc2.includes(p))) {
                    return true;
                }
            }
            return false;
        }
        
        areTitlesCompatible(title1, title2) {
            const executiveTitles = ['CEO', '代表', '社長', '役員', 'CTO', 'CFO', 'COO'];
            const managerTitles = ['マネージャー', '部長', '課長', 'リーダー', 'ディレクター'];
            
            const isExec1 = executiveTitles.some(t => title1.includes(t));
            const isExec2 = executiveTitles.some(t => title2.includes(t));
            const isManager1 = managerTitles.some(t => title1.includes(t));
            const isManager2 = managerTitles.some(t => title2.includes(t));
            
            return (isExec1 && isExec2) || (isManager1 && isManager2) || 
                   (!isExec1 && !isManager1 && !isExec2 && !isManager2);
        }
        
        areCompaniesCompatible(company1, company2) {
            // 簡易的な会社規模推定
            const isLarge = (company) => company.includes('株式会社') || company.includes('Inc') || company.includes('Corp');
            const isStartup = (company) => company.includes('スタートアップ') || company.includes('ベンチャー');
            
            return (isLarge(company1) === isLarge(company2)) || 
                   (isStartup(company1) === isStartup(company2));
        }
        
        calculateChallengeSkillMatch(challenges, skills) {
            if (!challenges || !skills) return 50;
            
            const challengeArray = Array.isArray(challenges) ? challenges : challenges.split(',');
            const skillArray = Array.isArray(skills) ? skills : skills.split(',');
            
            let matchScore = 0;
            const challengeSkillMap = {
                '売上向上': ['マーケティング', '営業', 'セールス'],
                '業務効率化': ['自動化', 'AI', 'システム開発'],
                '人材育成': ['研修', 'コーチング', 'マネジメント'],
                '新規事業': ['事業開発', '戦略', 'イノベーション']
            };
            
            challengeArray.forEach(challenge => {
                const relatedSkills = challengeSkillMap[challenge] || [];
                if (skillArray.some(skill => relatedSkills.some(rs => skill.includes(rs)))) {
                    matchScore += 100 / challengeArray.length;
                }
            });
            
            return Math.min(matchScore, 100);
        }
        
        generateRecommendation(score) {
            if (score >= 80) return '非常に相性が良いマッチングです！積極的にコンタクトを取ることをお勧めします。';
            if (score >= 60) return '良いマッチングです。共通点を活かしたコミュニケーションが期待できます。';
            if (score >= 40) return '潜在的な可能性があります。まずはカジュアルな交流から始めてみましょう。';
            return '新しい視点を得られる可能性があります。お互いの違いを活かせるかもしれません。';
        }
    };
    
    // ============================================================
    // 2. レーダーチャート描画（Canvas完全実装）
    // from: backup/radar-charts/matching-radar-chart.js
    // ============================================================
    
    window.MatchingRadarChart = class {
        constructor() {
            this.canvasSize = 200;
            this.centerX = this.canvasSize / 2;
            this.centerY = this.canvasSize / 2;
            this.radius = 80;
            this.levels = 5;
            
            this.parameters = [
                { label: '事業相性', key: 'businessSynergy' },
                { label: '課題解決', key: 'solutionMatch' },
                { label: 'トレンド', key: 'businessTrends' },
                { label: '成長適合', key: 'growthPhaseMatch' },
                { label: '緊急度', key: 'urgencyAlignment' },
                { label: 'リソース', key: 'resourceComplement' }
            ];
            
            this.colors = {
                grid: '#e5e7eb',
                gridDark: '#9ca3af',
                fill: 'rgba(59, 130, 246, 0.2)',
                stroke: '#3b82f6',
                text: '#374151',
                background: '#ffffff'
            };
        }
        
        drawRadarChart(canvas, data) {
            if (!canvas || !canvas.getContext) {
                console.error('[FinalCritical] Canvas要素が無効です');
                return;
            }
            
            const ctx = canvas.getContext('2d');
            canvas.width = this.canvasSize;
            canvas.height = this.canvasSize;
            
            ctx.fillStyle = this.colors.background;
            ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);
            
            this.drawGrid(ctx);
            this.drawAxisLabels(ctx);
            
            if (data) {
                this.drawData(ctx, data);
            }
        }
        
        drawGrid(ctx) {
            const angleStep = (Math.PI * 2) / 6;
            
            for (let level = 1; level <= this.levels; level++) {
                const levelRadius = (this.radius / this.levels) * level;
                
                ctx.beginPath();
                ctx.strokeStyle = level === this.levels ? this.colors.gridDark : this.colors.grid;
                ctx.lineWidth = level === this.levels ? 2 : 1;
                
                for (let i = 0; i <= 6; i++) {
                    const angle = angleStep * i - Math.PI / 2;
                    const x = this.centerX + Math.cos(angle) * levelRadius;
                    const y = this.centerY + Math.sin(angle) * levelRadius;
                    
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
            }
            
            for (let i = 0; i < 6; i++) {
                const angle = angleStep * i - Math.PI / 2;
                const x = this.centerX + Math.cos(angle) * this.radius;
                const y = this.centerY + Math.sin(angle) * this.radius;
                
                ctx.beginPath();
                ctx.strokeStyle = this.colors.grid;
                ctx.lineWidth = 1;
                ctx.moveTo(this.centerX, this.centerY);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        }
        
        drawAxisLabels(ctx) {
            const angleStep = (Math.PI * 2) / 6;
            const labelRadius = this.radius + 20;
            
            ctx.font = '12px "Noto Sans JP", sans-serif';
            ctx.fillStyle = this.colors.text;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            this.parameters.forEach((param, i) => {
                const angle = angleStep * i - Math.PI / 2;
                const x = this.centerX + Math.cos(angle) * labelRadius;
                const y = this.centerY + Math.sin(angle) * labelRadius;
                
                if (i === 0) ctx.textBaseline = 'bottom';
                else if (i === 3) ctx.textBaseline = 'top';
                else ctx.textBaseline = 'middle';
                
                ctx.fillText(param.label, x, y);
            });
        }
        
        drawData(ctx, data) {
            const angleStep = (Math.PI * 2) / 6;
            const points = [];
            
            this.parameters.forEach((param, i) => {
                const value = data[param.key] || 0;
                const normalizedValue = Math.min(100, Math.max(0, value)) / 100;
                const radius = this.radius * normalizedValue;
                
                const angle = angleStep * i - Math.PI / 2;
                const x = this.centerX + Math.cos(angle) * radius;
                const y = this.centerY + Math.sin(angle) * radius;
                
                points.push({ x, y, value });
            });
            
            // 塗りつぶし
            ctx.beginPath();
            ctx.fillStyle = this.colors.fill;
            points.forEach((point, i) => {
                if (i === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            });
            ctx.closePath();
            ctx.fill();
            
            // 線
            ctx.beginPath();
            ctx.strokeStyle = this.colors.stroke;
            ctx.lineWidth = 2;
            points.forEach((point, i) => {
                if (i === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            });
            ctx.closePath();
            ctx.stroke();
            
            // 点
            points.forEach(point => {
                ctx.beginPath();
                ctx.fillStyle = this.colors.stroke;
                ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    };
    
    // ============================================================
    // 3. トースト通知システム（showSuccess, showError, showInfo, showWarning）
    // HTMLで参照されているが存在しない関数
    // ============================================================
    
    window.showSuccess = function(message, duration = 3000) {
        showToast(message, 'success', duration);
    };
    
    window.showError = function(message, duration = 5000) {
        showToast(message, 'error', duration);
    };
    
    window.showInfo = function(message, duration = 3000) {
        showToast(message, 'info', duration);
    };
    
    window.showWarning = function(message, duration = 4000) {
        showToast(message, 'warning', duration);
    };
    
    function showToast(message, type = 'info', duration = 3000) {
        // トーストコンテナを取得または作成
        let container = document.getElementById('toast-notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-notifications';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 100000;
                display: flex;
                flex-direction: column-reverse;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        
        // トースト要素を作成
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const colors = {
            success: { bg: '#10b981', icon: 'fa-check-circle' },
            error: { bg: '#ef4444', icon: 'fa-exclamation-circle' },
            info: { bg: '#3b82f6', icon: 'fa-info-circle' },
            warning: { bg: '#f59e0b', icon: 'fa-exclamation-triangle' }
        };
        
        const config = colors[type] || colors.info;
        
        toast.style.cssText = `
            background: ${config.bg};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06);
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 250px;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
            pointer-events: auto;
            cursor: pointer;
        `;
        
        toast.innerHTML = `
            <i class="fas ${config.icon}" style="font-size: 18px;"></i>
            <span style="flex: 1;">${message}</span>
        `;
        
        // クリックで即座に削除
        toast.onclick = () => toast.remove();
        
        container.appendChild(toast);
        
        // 自動削除
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    // ============================================================
    // 4. ログアウト関数（HTMLで参照されているが存在しない）
    // ============================================================
    
    window.logout = async function() {
        try {
            if (window.supabaseClient) {
                await window.supabaseClient.auth.signOut();
            }
            
            // セッション情報をクリア
            localStorage.clear();
            sessionStorage.clear();
            
            // ログインページへリダイレクト
            window.location.href = '/login.html';
            
        } catch (error) {
            console.error('[FinalCritical] ログアウトエラー:', error);
            // エラーでも強制的にログインページへ
            window.location.href = '/login.html';
        }
    };
    
    // ============================================================
    // 5. グローバル関数の互換性確保
    // ============================================================
    
    // drawRadarChart関数（テストページで使用）
    window.drawRadarChart = function(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`[FinalCritical] Canvas要素が見つかりません: ${canvasId}`);
            return;
        }
        
        const chart = new window.MatchingRadarChart();
        chart.drawRadarChart(canvas, data);
    };
    
    // drawRadarChartForUser関数（テストページで使用）
    window.drawRadarChartForUser = async function(canvasId, userId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        // ユーザーデータを取得してレーダーチャートを描画
        try {
            const scorer = new window.AIMatchingScorer();
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            
            if (user) {
                const result = await scorer.calculateAdvancedScore(user.id, userId);
                
                const chartData = {
                    businessSynergy: result.breakdown.profileMatch || 50,
                    solutionMatch: result.breakdown.commonTopics || 50,
                    businessTrends: result.breakdown.communicationStyle || 50,
                    growthPhaseMatch: result.breakdown.emotionalSync || 50,
                    urgencyAlignment: result.breakdown.activityOverlap || 50,
                    resourceComplement: result.score || 50
                };
                
                window.drawRadarChart(canvasId, chartData);
            }
        } catch (error) {
            console.error('[FinalCritical] レーダーチャート描画エラー:', error);
        }
    };
    
    // ============================================================
    // 6. アニメーションスタイル追加
    // ============================================================
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .toast {
            transition: all 0.3s ease;
        }
        
        .toast:hover {
            transform: translateX(-5px);
        }
    `;
    document.head.appendChild(style);
    
    // ============================================================
    // 7. 初期化
    // ============================================================
    
    async function initializeFinalFeatures() {
        console.log('[FinalCritical] 最終必須機能の初期化開始');
        
        // AIスコアラーを初期化
        window.aiMatchingScorer = new window.AIMatchingScorer();
        
        // レーダーチャートを初期化
        window.matchingRadarChart = new window.MatchingRadarChart();
        
        console.log('[FinalCritical] 最終必須機能の初期化完了');
        console.log('[FinalCritical] 利用可能な関数:');
        console.log('- showSuccess, showError, showInfo, showWarning');
        console.log('- logout');
        console.log('- drawRadarChart, drawRadarChartForUser');
        console.log('- AIMatchingScorer');
        console.log('- MatchingRadarChart');
    }
    
    // DOMContentLoaded後に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFinalFeatures);
    } else {
        initializeFinalFeatures();
    }
    
})();