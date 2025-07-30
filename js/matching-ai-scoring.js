/**
 * AI駆動マッチングスコアリング
 * 会話データを基にした高度なマッチング率計算
 */

class AIMatchingScorer {
    constructor() {
        this.weights = {
            commonTopics: 0.3,      // 共通の話題
            communicationStyle: 0.2, // コミュニケーションスタイル
            emotionalSync: 0.2,      // 感情の同期性
            activityOverlap: 0.15,   // 活動時間の重なり
            profileMatch: 0.15      // 基本プロフィールの一致
        };
    }

    /**
     * 会話データベースのマッチングスコアを計算
     */
    async calculateAdvancedScore(userId, targetUserId) {
        try {
            const scores = await Promise.all([
                this.calculateTopicSimilarity(userId, targetUserId),
                this.calculateCommunicationStyle(userId, targetUserId),
                this.calculateEmotionalSync(userId, targetUserId),
                this.calculateActivityOverlap(userId, targetUserId),
                this.calculateProfileMatch(userId, targetUserId)
            ]);

            // 重み付けスコアの計算
            const finalScore = scores.reduce((total, score, index) => {
                const weightKey = Object.keys(this.weights)[index];
                return total + (score * this.weights[weightKey]);
            }, 0);

            return {
                score: Math.round(finalScore),
                breakdown: {
                    commonTopics: scores[0],
                    communicationStyle: scores[1],
                    emotionalSync: scores[2],
                    activityOverlap: scores[3],
                    profileMatch: scores[4]
                }
            };
        } catch (error) {
            console.error('[AIScoring] Error:', error);
            // エラー時は基本スコアを返す
            return { score: 50, breakdown: {} };
        }
    }

    /**
     * 話題の類似性を計算
     */
    async calculateTopicSimilarity(userId, targetUserId) {
        // ユーザーの興味関心データを取得
        const [userInterests, targetInterests] = await Promise.all([
            this.getUserInterests(userId),
            this.getUserInterests(targetUserId)
        ]);

        if (!userInterests.length || !targetInterests.length) {
            return 50; // データがない場合は中間値
        }

        // 共通の話題を見つける
        const userTopics = new Set(userInterests.map(i => i.topic));
        const targetTopics = new Set(targetInterests.map(i => i.topic));
        const commonTopics = [...userTopics].filter(topic => targetTopics.has(topic));

        // Jaccard係数（類似度）を計算
        const union = new Set([...userTopics, ...targetTopics]);
        const similarity = (commonTopics.length / union.size) * 100;

        return Math.min(similarity * 1.5, 100); // 最大100点
    }

    /**
     * コミュニケーションスタイルの一致度
     */
    async calculateCommunicationStyle(userId, targetUserId) {
        const [userStyle, targetStyle] = await Promise.all([
            this.getCommunicationStyle(userId),
            this.getCommunicationStyle(targetUserId)
        ]);

        if (!userStyle || !targetStyle) {
            return 50;
        }

        let score = 100;
        
        // メッセージ長の差異
        const lengthDiff = Math.abs(userStyle.avgLength - targetStyle.avgLength);
        score -= Math.min(lengthDiff / 10, 20);

        // 返信速度の差異
        const speedDiff = Math.abs(userStyle.responseTime - targetStyle.responseTime);
        score -= Math.min(speedDiff / 60, 20); // 分単位

        // 絵文字使用率の差異
        const emojiDiff = Math.abs(userStyle.emojiRate - targetStyle.emojiRate);
        score -= Math.min(emojiDiff * 100, 20);

        return Math.max(score, 0);
    }

    /**
     * 感情の同期性を計算
     */
    async calculateEmotionalSync(userId, targetUserId) {
        // 会話履歴から感情パターンを分析
        const conversations = await this.getConversationHistory(userId, targetUserId);
        
        if (!conversations.length) {
            return 50;
        }

        // 感情の遷移パターンを分析
        let syncScore = 0;
        for (let i = 1; i < conversations.length; i++) {
            const prevSentiment = conversations[i-1].sentiment;
            const currSentiment = conversations[i].sentiment;
            
            // 感情が同じ方向に動いている場合にスコア加算
            if (Math.sign(prevSentiment) === Math.sign(currSentiment)) {
                syncScore += 1;
            }
        }

        return Math.min((syncScore / conversations.length) * 100, 100);
    }

    /**
     * 活動時間の重なりを計算
     */
    async calculateActivityOverlap(userId, targetUserId) {
        const [userActivity, targetActivity] = await Promise.all([
            this.getActivityPattern(userId),
            this.getActivityPattern(targetUserId)
        ]);

        if (!userActivity || !targetActivity) {
            return 50;
        }

        // 時間帯別の活動パターンを比較
        let overlap = 0;
        for (let hour = 0; hour < 24; hour++) {
            const userActive = userActivity[hour] || 0;
            const targetActive = targetActivity[hour] || 0;
            
            if (userActive > 0 && targetActive > 0) {
                overlap += Math.min(userActive, targetActive);
            }
        }

        return Math.min((overlap / 24) * 100, 100);
    }

    /**
     * 基本プロフィールの一致度
     */
    async calculateProfileMatch(userId, targetUserId) {
        const [userProfile, targetProfile] = await Promise.all([
            this.getProfile(userId),
            this.getProfile(targetUserId)
        ]);

        if (!userProfile || !targetProfile) {
            return 50;
        }

        let score = 0;
        let factors = 0;

        // 業界の一致
        if (userProfile.industry === targetProfile.industry) {
            score += 30;
        }
        factors++;

        // 地域の近さ
        if (userProfile.location === targetProfile.location) {
            score += 30;
        } else if (this.isNearbyLocation(userProfile.location, targetProfile.location)) {
            score += 15;
        }
        factors++;

        // スキルの重なり
        const commonSkills = this.getCommonElements(
            userProfile.skills || [],
            targetProfile.skills || []
        );
        score += Math.min(commonSkills.length * 10, 40);
        factors++;

        return Math.min(score, 100);
    }

    // ヘルパーメソッド
    async getUserInterests(userId) {
        const { data } = await window.supabase
            .from('user_interests')
            .select('*')
            .eq('user_id', userId)
            .order('score', { ascending: false })
            .limit(20);
        
        return data || [];
    }

    async getCommunicationStyle(userId) {
        // 実装例: messagesテーブルから統計を取得
        const { data } = await window.supabase
            .rpc('get_communication_style', { user_id: userId });
        
        return data?.[0] || null;
    }

    async getConversationHistory(userId, targetUserId) {
        const { data } = await window.supabase
            .from('conversations')
            .select('*')
            .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
            .or(`user_id.eq.${targetUserId},partner_id.eq.${targetUserId}`)
            .order('created_at', { ascending: true })
            .limit(100);
        
        return data || [];
    }

    async getActivityPattern(userId) {
        const { data } = await window.supabase
            .rpc('get_activity_pattern', { user_id: userId });
        
        return data?.[0] || null;
    }

    async getProfile(userId) {
        const { data } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        return data;
    }

    isNearbyLocation(loc1, loc2) {
        const nearby = {
            'tokyo': ['kanagawa', 'saitama', 'chiba'],
            'osaka': ['kyoto', 'kobe', 'nara']
        };
        
        return nearby[loc1]?.includes(loc2) || nearby[loc2]?.includes(loc1);
    }

    getCommonElements(arr1, arr2) {
        return arr1.filter(item => arr2.includes(item));
    }
}

// グローバルに公開
window.aiMatchingScorer = new AIMatchingScorer();

console.log('[AIMatchingScorer] Advanced scoring system initialized');