/**
 * シンプル版AIマッチングスコアリング
 * 感情分析を除いた実用的な実装
 */

class SimpleAIMatchingScorer {
    constructor() {
        this.weights = {
            commonTopics: 0.35,      // 共通の話題（最重要）
            communicationStyle: 0.25, // コミュニケーションスタイル
            activityOverlap: 0.2,    // 活動時間の重なり
            profileMatch: 0.2        // 基本プロフィールの一致
        };
    }

    /**
     * シンプルなマッチングスコアを計算
     */
    async calculateSimpleScore(userId, targetUserId) {
        try {
            const scores = await Promise.all([
                this.calculateTopicSimilarity(userId, targetUserId),
                this.calculateCommunicationCompatibility(userId, targetUserId),
                this.calculateActivityOverlap(userId, targetUserId),
                this.calculateProfileMatch(userId, targetUserId)
            ]);

            // 重み付けスコアの計算
            const finalScore = Math.round(
                scores[0] * this.weights.commonTopics +
                scores[1] * this.weights.communicationStyle +
                scores[2] * this.weights.activityOverlap +
                scores[3] * this.weights.profileMatch
            );

            return {
                score: finalScore,
                breakdown: {
                    commonTopics: scores[0],
                    communicationStyle: scores[1],
                    activityOverlap: scores[2],
                    profileMatch: scores[3]
                }
            };
        } catch (error) {
            console.error('[SimpleAIScoring] Error:', error);
            return { score: 50, breakdown: {} };
        }
    }

    /**
     * 話題の類似性を計算（messagesテーブルから直接）
     */
    async calculateTopicSimilarity(userId, targetUserId) {
        try {
            // 両ユーザーの最近のメッセージから話題を抽出
            const [userTopics, targetTopics] = await Promise.all([
                this.extractTopicsFromMessages(userId),
                this.extractTopicsFromMessages(targetUserId)
            ]);

            if (!userTopics.length || !targetTopics.length) {
                return 50;
            }

            // 共通の話題を見つける
            const commonTopics = userTopics.filter(topic => 
                targetTopics.includes(topic)
            );

            // 類似度スコア
            const allTopics = [...new Set([...userTopics, ...targetTopics])];
            const similarity = (commonTopics.length / allTopics.length) * 100;

            return Math.min(similarity * 1.5, 100);
        } catch (error) {
            console.error('[SimpleAIScoring] Topic similarity error:', error);
            return 50;
        }
    }

    /**
     * メッセージから話題を抽出（シンプル版）
     */
    async extractTopicsFromMessages(userId) {
        const { data: messages } = await window.supabase
            .from('messages')
            .select('content')
            .eq('sender_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (!messages || !messages.length) return [];

        // キーワードベースの話題抽出
        const topicKeywords = {
            'AI': ['AI', '人工知能', '機械学習', 'ChatGPT'],
            'スタートアップ': ['スタートアップ', '起業', 'ベンチャー', '創業'],
            'ビジネス': ['ビジネス', '事業', '経営', '戦略'],
            'テクノロジー': ['テクノロジー', 'テック', 'IT', 'DX'],
            '投資': ['投資', 'ファンディング', '資金調達', 'VC'],
            'マーケティング': ['マーケティング', 'マーケ', '広告', 'PR'],
            'デザイン': ['デザイン', 'UI', 'UX', 'クリエイティブ'],
            '開発': ['開発', 'プログラミング', 'エンジニア', 'コーディング']
        };

        const foundTopics = new Set();
        
        messages.forEach(msg => {
            const content = msg.content || '';
            Object.entries(topicKeywords).forEach(([topic, keywords]) => {
                if (keywords.some(keyword => content.includes(keyword))) {
                    foundTopics.add(topic);
                }
            });
        });

        return Array.from(foundTopics);
    }

    /**
     * コミュニケーションの相性（返信率とスピード）
     */
    async calculateCommunicationCompatibility(userId, targetUserId) {
        try {
            // メッセージの統計情報を取得
            const { data: stats } = await window.supabase
                .rpc('get_message_stats', { 
                    user1_id: userId, 
                    user2_id: targetUserId 
                });

            if (!stats || !stats[0]) {
                return 50;
            }

            const { message_count, avg_response_time_hours } = stats[0];
            
            let score = 50;
            
            // メッセージ数が多いほど高スコア
            if (message_count > 20) score += 20;
            else if (message_count > 10) score += 15;
            else if (message_count > 5) score += 10;
            
            // 返信が早いほど高スコア
            if (avg_response_time_hours < 1) score += 20;
            else if (avg_response_time_hours < 6) score += 15;
            else if (avg_response_time_hours < 24) score += 10;
            
            return Math.min(score, 100);
        } catch (error) {
            console.error('[SimpleAIScoring] Communication compatibility error:', error);
            return 50;
        }
    }

    /**
     * 活動時間の重なり（messagesの送信時間から）
     */
    async calculateActivityOverlap(userId, targetUserId) {
        try {
            const [userActivity, targetActivity] = await Promise.all([
                this.getActivityHours(userId),
                this.getActivityHours(targetUserId)
            ]);

            if (!userActivity.length || !targetActivity.length) {
                return 50;
            }

            // 活動時間帯の重なりを計算
            const commonHours = userActivity.filter(hour => 
                targetActivity.includes(hour)
            );

            const overlap = (commonHours.length / 24) * 100;
            return Math.min(overlap * 2, 100);
        } catch (error) {
            console.error('[SimpleAIScoring] Activity overlap error:', error);
            return 50;
        }
    }

    /**
     * ユーザーの活動時間を取得
     */
    async getActivityHours(userId) {
        const { data: messages } = await window.supabase
            .from('messages')
            .select('created_at')
            .eq('sender_id', userId)
            .order('created_at', { ascending: false })
            .limit(100);

        if (!messages || !messages.length) return [];

        // 時間帯別のメッセージ数を集計
        const hourCounts = {};
        messages.forEach(msg => {
            const hour = new Date(msg.created_at).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        // アクティブな時間帯（メッセージが1件以上）
        return Object.keys(hourCounts)
            .map(h => parseInt(h))
            .filter(h => hourCounts[h] > 0);
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

        // 業界の一致
        if (userProfile.industry === targetProfile.industry && userProfile.industry) {
            score += 40;
        }

        // 地域の一致
        if (userProfile.location === targetProfile.location && userProfile.location) {
            score += 30;
        }

        // スキルの重なり
        if (userProfile.skills && targetProfile.skills) {
            const commonSkills = userProfile.skills.filter(skill => 
                targetProfile.skills.includes(skill)
            );
            score += Math.min(commonSkills.length * 10, 30);
        }

        return score;
    }

    async getProfile(userId) {
        const { data } = await window.supabase
            .from('profiles')
            .select('industry, location, skills')
            .eq('id', userId)
            .single();
        
        return data;
    }
}

// RPC関数（Supabaseで作成する必要あり）
const CREATE_MESSAGE_STATS_FUNCTION = `
CREATE OR REPLACE FUNCTION get_message_stats(user1_id UUID, user2_id UUID)
RETURNS TABLE (
    message_count INT,
    avg_response_time_hours FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INT as message_count,
        AVG(
            EXTRACT(EPOCH FROM (
                lead(created_at) OVER (ORDER BY created_at) - created_at
            )) / 3600
        )::FLOAT as avg_response_time_hours
    FROM messages
    WHERE 
        (sender_id = user1_id AND receiver_id = user2_id) OR
        (sender_id = user2_id AND receiver_id = user1_id);
END;
$$ LANGUAGE plpgsql;
`;

// グローバルに公開
window.simpleAIMatchingScorer = new SimpleAIMatchingScorer();

console.log('[SimpleAIMatchingScorer] Initialized (without sentiment analysis)');