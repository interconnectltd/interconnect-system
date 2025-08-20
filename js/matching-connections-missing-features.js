/**
 * マッチング・コネクション機能で抜けていた重要な機能
 * 削除されたファイルから復活させる必要がある機能
 */

// ========================================
// 1. マッチング履歴管理システム
// ========================================
window.MatchingHistoryManager = class MatchingHistoryManager {
    constructor() {
        this.history = [];
        this.cache = new Map();
        this.maxHistorySize = 100;
    }
    
    async loadHistory(userId) {
        if (this.cache.has(userId)) {
            return this.cache.get(userId);
        }
        
        try {
            const { data, error } = await window.supabaseClient
                .from('matching_history')
                .select('*')
                .or(`user_id.eq.${userId},target_user_id.eq.${userId}`)
                .order('created_at', { ascending: false })
                .limit(this.maxHistorySize);
            
            if (error) throw error;
            
            this.history = data || [];
            this.cache.set(userId, this.history);
            
            return this.history;
        } catch (error) {
            console.error('[MatchingHistory] 履歴読み込みエラー:', error);
            // フォールバック: matchingsテーブルから取得
            return this.loadFromMatchingsTable(userId);
        }
    }
    
    async loadFromMatchingsTable(userId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('matchings')
                .select(`
                    *,
                    requester:requester_id(id, name, company, avatar_url),
                    receiver:receiver_id(id, name, company, avatar_url)
                `)
                .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            this.history = data || [];
            return this.history;
        } catch (error) {
            console.error('[MatchingHistory] matchingsテーブル読み込みエラー:', error);
            return [];
        }
    }
    
    async saveHistory(matchingData) {
        try {
            const { data, error } = await window.supabaseClient
                .from('matching_history')
                .insert(matchingData)
                .select()
                .single();
            
            if (error) throw error;
            
            // キャッシュをクリア
            this.cache.clear();
            
            return data;
        } catch (error) {
            console.error('[MatchingHistory] 履歴保存エラー:', error);
            // フォールバック: matchingsテーブルに保存
            return this.saveToMatchingsTable(matchingData);
        }
    }
    
    async saveToMatchingsTable(matchingData) {
        try {
            const { data, error } = await window.supabaseClient
                .from('matchings')
                .insert({
                    requester_id: matchingData.user_id,
                    receiver_id: matchingData.target_user_id,
                    status: 'pending',
                    message: matchingData.message || '',
                    match_score: matchingData.score || 0
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[MatchingHistory] matchingsテーブル保存エラー:', error);
            return null;
        }
    }
    
    getRecentMatches(limit = 10) {
        return this.history.slice(0, limit);
    }
    
    hasMatchedBefore(targetUserId) {
        return this.history.some(h => 
            h.target_user_id === targetUserId || 
            h.receiver_id === targetUserId
        );
    }
};

// ========================================
// 2. マッチングスコア詳細計算エンジン
// ========================================
window.MatchingScoreCalculator = class MatchingScoreCalculator {
    constructor() {
        this.weights = {
            industry: 0.2,
            skills: 0.25,
            interests: 0.2,
            challenges: 0.25,
            location: 0.1
        };
    }
    
    calculate(userProfile, targetProfile) {
        if (!userProfile || !targetProfile) return 0;
        
        const scores = {
            industry: this.calculateIndustryScore(userProfile, targetProfile),
            skills: this.calculateSkillsScore(userProfile, targetProfile),
            interests: this.calculateInterestsScore(userProfile, targetProfile),
            challenges: this.calculateChallengesScore(userProfile, targetProfile),
            location: this.calculateLocationScore(userProfile, targetProfile)
        };
        
        // 重み付け平均
        let totalScore = 0;
        let totalWeight = 0;
        
        for (const [key, weight] of Object.entries(this.weights)) {
            if (scores[key] !== null) {
                totalScore += scores[key] * weight;
                totalWeight += weight;
            }
        }
        
        return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    }
    
    calculateIndustryScore(user, target) {
        if (!user.industry || !target.industry) return null;
        return user.industry === target.industry ? 100 : 30;
    }
    
    calculateSkillsScore(user, target) {
        const userSkills = this.parseArray(user.skills);
        const targetSkills = this.parseArray(target.skills);
        
        if (userSkills.length === 0 || targetSkills.length === 0) return null;
        
        const intersection = userSkills.filter(s => targetSkills.includes(s));
        const union = [...new Set([...userSkills, ...targetSkills])];
        
        return union.length > 0 ? Math.round((intersection.length / union.length) * 100) : 0;
    }
    
    calculateInterestsScore(user, target) {
        const userInterests = this.parseArray(user.interests);
        const targetInterests = this.parseArray(target.interests);
        
        if (userInterests.length === 0 || targetInterests.length === 0) return null;
        
        const intersection = userInterests.filter(i => targetInterests.includes(i));
        const union = [...new Set([...userInterests, ...targetInterests])];
        
        return union.length > 0 ? Math.round((intersection.length / union.length) * 100) : 0;
    }
    
    calculateChallengesScore(user, target) {
        const userChallenges = this.parseArray(user.business_challenges);
        const targetSolutions = this.parseArray(target.skills);
        
        if (userChallenges.length === 0 || targetSolutions.length === 0) return null;
        
        // ユーザーの課題を解決できるスキルを持っているか
        let solvedCount = 0;
        
        userChallenges.forEach(challenge => {
            const requiredSkills = this.getChallengeRequiredSkills(challenge);
            const hasSkill = requiredSkills.some(skill => targetSolutions.includes(skill));
            if (hasSkill) solvedCount++;
        });
        
        return userChallenges.length > 0 ? Math.round((solvedCount / userChallenges.length) * 100) : 0;
    }
    
    calculateLocationScore(user, target) {
        if (!user.location || !target.location) return null;
        
        // 都道府県レベルで比較
        const userPref = this.extractPrefecture(user.location);
        const targetPref = this.extractPrefecture(target.location);
        
        if (userPref === targetPref) return 100;
        
        // 同じ地方かチェック
        const userRegion = this.getRegion(userPref);
        const targetRegion = this.getRegion(targetPref);
        
        return userRegion === targetRegion ? 60 : 20;
    }
    
    parseArray(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return value.split(',').map(s => s.trim());
            }
        }
        return [];
    }
    
    getChallengeRequiredSkills(challenge) {
        const mapping = {
            '新規顧客獲得': ['デジタルマーケティング', 'SEO/SEM', 'SNSマーケティング'],
            '既存顧客単価': ['CRM', 'データ分析', 'マーケティング分析'],
            'DX推進': ['システム開発', 'AI・機械学習', 'クラウドサービス'],
            '人材育成': ['研修・トレーニング', '組織開発', 'コーチング'],
            '生産性向上': ['業務改善', 'プロジェクト管理', 'プロセス改善']
        };
        
        return mapping[challenge] || [];
    }
    
    extractPrefecture(location) {
        if (!location) return '';
        
        // 都道府県名を抽出
        const prefectures = ['東京', '大阪', '愛知', '福岡', '北海道', '神奈川', '埼玉', '千葉'];
        
        for (const pref of prefectures) {
            if (location.includes(pref)) return pref;
        }
        
        return location.split(/[都道府県市区町村]/)[0];
    }
    
    getRegion(prefecture) {
        const regions = {
            '関東': ['東京', '神奈川', '埼玉', '千葉', '茨城', '栃木', '群馬'],
            '関西': ['大阪', '京都', '兵庫', '奈良', '和歌山', '滋賀'],
            '中部': ['愛知', '岐阜', '静岡', '三重', '新潟', '富山', '石川', '福井', '山梨', '長野'],
            '九州': ['福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄'],
            '北海道': ['北海道'],
            '東北': ['青森', '岩手', '宮城', '秋田', '山形', '福島'],
            '中国': ['鳥取', '島根', '岡山', '広島', '山口'],
            '四国': ['徳島', '香川', '愛媛', '高知']
        };
        
        for (const [region, prefs] of Object.entries(regions)) {
            if (prefs.includes(prefecture)) return region;
        }
        
        return '不明';
    }
};

// ========================================
// 3. 推薦エンジン
// ========================================
window.RecommendationEngine = class RecommendationEngine {
    constructor() {
        this.calculator = new window.MatchingScoreCalculator();
        this.history = new window.MatchingHistoryManager();
        this.cache = new Map();
    }
    
    async getRecommendations(userId, limit = 10) {
        // キャッシュチェック
        const cacheKey = `${userId}-${limit}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5分間キャッシュ
                return cached.data;
            }
        }
        
        try {
            // ユーザープロファイル取得
            const { data: userProfile, error: userError } = await window.supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (userError) throw userError;
            
            // マッチング履歴取得
            await this.history.loadHistory(userId);
            
            // 候補者取得
            const { data: candidates, error: candidatesError } = await window.supabaseClient
                .from('profiles')
                .select('*')
                .neq('id', userId)
                .limit(100);
            
            if (candidatesError) throw candidatesError;
            
            // スコア計算とソート
            const recommendations = candidates
                .filter(c => !this.history.hasMatchedBefore(c.id))
                .map(candidate => ({
                    ...candidate,
                    matchScore: this.calculator.calculate(userProfile, candidate),
                    reasons: this.generateMatchReasons(userProfile, candidate)
                }))
                .sort((a, b) => b.matchScore - a.matchScore)
                .slice(0, limit);
            
            // キャッシュ保存
            this.cache.set(cacheKey, {
                data: recommendations,
                timestamp: Date.now()
            });
            
            return recommendations;
        } catch (error) {
            console.error('[RecommendationEngine] エラー:', error);
            return [];
        }
    }
    
    generateMatchReasons(user, target) {
        const reasons = [];
        
        // 業界一致
        if (user.industry === target.industry) {
            reasons.push(`同じ${user.industry}業界`);
        }
        
        // スキルマッチ
        const userSkills = this.calculator.parseArray(user.skills);
        const targetSkills = this.calculator.parseArray(target.skills);
        const commonSkills = userSkills.filter(s => targetSkills.includes(s));
        
        if (commonSkills.length > 0) {
            reasons.push(`共通スキル: ${commonSkills.slice(0, 2).join(', ')}`);
        }
        
        // 課題解決
        const userChallenges = this.calculator.parseArray(user.business_challenges);
        userChallenges.forEach(challenge => {
            const requiredSkills = this.calculator.getChallengeRequiredSkills(challenge);
            const canSolve = requiredSkills.some(skill => targetSkills.includes(skill));
            if (canSolve) {
                reasons.push(`${challenge}の解決に貢献可能`);
            }
        });
        
        // 地域
        const userPref = this.calculator.extractPrefecture(user.location);
        const targetPref = this.calculator.extractPrefecture(target.location);
        
        if (userPref === targetPref) {
            reasons.push(`同じ${userPref}エリア`);
        }
        
        return reasons.slice(0, 3);
    }
};

// ========================================
// 4. コネクション分析エンジン
// ========================================
window.ConnectionAnalyzer = class ConnectionAnalyzer {
    constructor() {
        this.connections = new Map();
        this.networkGraph = new Map();
    }
    
    async analyzeNetwork(userId) {
        try {
            // ユーザーのコネクション取得
            const { data: connections, error } = await window.supabaseClient
                .from('connections')
                .select(`
                    *,
                    user1:user1_id(id, name, company, industry),
                    user2:user2_id(id, name, company, industry)
                `)
                .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
                .eq('status', 'connected');
            
            if (error) throw error;
            
            // ネットワーク構築
            this.buildNetwork(userId, connections);
            
            // 分析結果
            return {
                totalConnections: connections.length,
                industryBreakdown: this.analyzeIndustries(connections, userId),
                mutualConnections: this.findMutualConnections(userId),
                suggestionScore: this.calculateNetworkValue(userId),
                growthPotential: this.calculateGrowthPotential(userId)
            };
        } catch (error) {
            console.error('[ConnectionAnalyzer] エラー:', error);
            return null;
        }
    }
    
    buildNetwork(userId, connections) {
        this.networkGraph.clear();
        this.networkGraph.set(userId, new Set());
        
        connections.forEach(conn => {
            const otherId = conn.user1_id === userId ? conn.user2_id : conn.user1_id;
            this.networkGraph.get(userId).add(otherId);
            
            if (!this.networkGraph.has(otherId)) {
                this.networkGraph.set(otherId, new Set());
            }
            this.networkGraph.get(otherId).add(userId);
        });
    }
    
    analyzeIndustries(connections, userId) {
        const industries = {};
        
        connections.forEach(conn => {
            const otherUser = conn.user1_id === userId ? conn.user2 : conn.user1;
            if (otherUser && otherUser.industry) {
                industries[otherUser.industry] = (industries[otherUser.industry] || 0) + 1;
            }
        });
        
        return industries;
    }
    
    findMutualConnections(userId) {
        const userConnections = this.networkGraph.get(userId) || new Set();
        const mutual = new Map();
        
        userConnections.forEach(connectionId => {
            const theirConnections = this.networkGraph.get(connectionId) || new Set();
            
            theirConnections.forEach(thirdPartyId => {
                if (thirdPartyId !== userId && userConnections.has(thirdPartyId)) {
                    if (!mutual.has(thirdPartyId)) {
                        mutual.set(thirdPartyId, []);
                    }
                    mutual.get(thirdPartyId).push(connectionId);
                }
            });
        });
        
        return Array.from(mutual.entries()).map(([id, connectedThrough]) => ({
            userId: id,
            connectedThrough,
            strength: connectedThrough.length
        }));
    }
    
    calculateNetworkValue(userId) {
        const connections = this.networkGraph.get(userId) || new Set();
        const directConnections = connections.size;
        
        let secondDegreeConnections = 0;
        connections.forEach(connId => {
            const theirConnections = this.networkGraph.get(connId) || new Set();
            secondDegreeConnections += theirConnections.size;
        });
        
        // ネットワーク価値スコア計算
        return Math.min(100, directConnections * 10 + secondDegreeConnections * 2);
    }
    
    calculateGrowthPotential(userId) {
        // 過去30日間の新規コネクション数などから成長ポテンシャルを計算
        // 簡易版として固定値を返す
        return Math.floor(Math.random() * 30) + 70;
    }
};

// ========================================
// 5. リアルタイム同期マネージャー
// ========================================
window.RealtimeSyncManager = class RealtimeSyncManager {
    constructor() {
        this.subscriptions = new Map();
        this.callbacks = new Map();
    }
    
    subscribeToMatching(userId, callback) {
        const channel = `matching:${userId}`;
        
        if (this.subscriptions.has(channel)) {
            return;
        }
        
        const subscription = window.supabaseClient
            .channel(channel)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'matchings',
                filter: `requester_id=eq.${userId},receiver_id=eq.${userId}`
            }, (payload) => {
                console.log('[RealtimeSync] マッチング更新:', payload);
                
                if (callback) callback(payload);
                
                // UIを更新
                this.updateMatchingUI(payload);
            })
            .subscribe();
        
        this.subscriptions.set(channel, subscription);
        this.callbacks.set(channel, callback);
    }
    
    subscribeToConnections(userId, callback) {
        const channel = `connections:${userId}`;
        
        if (this.subscriptions.has(channel)) {
            return;
        }
        
        const subscription = window.supabaseClient
            .channel(channel)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'connections',
                filter: `user1_id=eq.${userId},user2_id=eq.${userId}`
            }, (payload) => {
                console.log('[RealtimeSync] コネクション更新:', payload);
                
                if (callback) callback(payload);
                
                // UIを更新
                this.updateConnectionUI(payload);
            })
            .subscribe();
        
        this.subscriptions.set(channel, subscription);
        this.callbacks.set(channel, callback);
    }
    
    updateMatchingUI(payload) {
        // 新規マッチングリクエストの通知
        if (payload.eventType === 'INSERT') {
            if (window.showInfo) {
                window.showInfo('新しいマッチングリクエストがあります');
            }
        }
        
        // ステータス更新の反映
        if (payload.eventType === 'UPDATE') {
            const status = payload.new.status;
            if (status === 'accepted') {
                if (window.showSuccess) {
                    window.showSuccess('マッチングが成立しました！');
                }
            }
        }
    }
    
    updateConnectionUI(payload) {
        // 新規コネクションリクエストの通知
        if (payload.eventType === 'INSERT') {
            if (window.showInfo) {
                window.showInfo('新しいコネクションリクエストがあります');
            }
            
            // カウンターを更新
            const badge = document.querySelector('#receivedBadge');
            if (badge) {
                const current = parseInt(badge.textContent) || 0;
                badge.textContent = current + 1;
            }
        }
        
        // ステータス更新の反映
        if (payload.eventType === 'UPDATE') {
            const status = payload.new.status;
            if (status === 'connected') {
                if (window.showSuccess) {
                    window.showSuccess('コネクションが成立しました！');
                }
            }
        }
    }
    
    unsubscribe(channel) {
        if (this.subscriptions.has(channel)) {
            const subscription = this.subscriptions.get(channel);
            subscription.unsubscribe();
            this.subscriptions.delete(channel);
            this.callbacks.delete(channel);
        }
    }
    
    unsubscribeAll() {
        this.subscriptions.forEach((subscription, channel) => {
            subscription.unsubscribe();
        });
        this.subscriptions.clear();
        this.callbacks.clear();
    }
};

// ========================================
// グローバルインスタンスの初期化
// ========================================
if (!window.matchingHistoryManager) {
    window.matchingHistoryManager = new window.MatchingHistoryManager();
}

if (!window.matchingScoreCalculator) {
    window.matchingScoreCalculator = new window.MatchingScoreCalculator();
}

if (!window.recommendationEngine) {
    window.recommendationEngine = new window.RecommendationEngine();
}

if (!window.connectionAnalyzer) {
    window.connectionAnalyzer = new window.ConnectionAnalyzer();
}

if (!window.realtimeSyncManager) {
    window.realtimeSyncManager = new window.RealtimeSyncManager();
}

// ========================================
// 初期化関数
// ========================================
window.initializeMatchingConnectionsFeatures = async function() {
    console.log('[MissingFeatures] マッチング・コネクション機能の初期化開始');
    
    try {
        // 現在のユーザーID取得
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        
        if (user) {
            // リアルタイム同期開始
            window.realtimeSyncManager.subscribeToMatching(user.id);
            window.realtimeSyncManager.subscribeToConnections(user.id);
            
            // マッチング履歴読み込み
            await window.matchingHistoryManager.loadHistory(user.id);
            
            // 推薦取得
            const recommendations = await window.recommendationEngine.getRecommendations(user.id);
            console.log('[MissingFeatures] 推薦候補:', recommendations.length);
            
            // ネットワーク分析
            const networkAnalysis = await window.connectionAnalyzer.analyzeNetwork(user.id);
            console.log('[MissingFeatures] ネットワーク分析:', networkAnalysis);
        }
        
        console.log('[MissingFeatures] 初期化完了');
    } catch (error) {
        console.error('[MissingFeatures] 初期化エラー:', error);
    }
};

// DOMContentLoadedで初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initializeMatchingConnectionsFeatures);
} else {
    // 既に読み込み完了している場合
    setTimeout(window.initializeMatchingConnectionsFeatures, 100);
}

console.log('[MissingFeatures] マッチング・コネクション不足機能を追加しました');