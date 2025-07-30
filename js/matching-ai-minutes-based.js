/**
 * 議事録ベースのAIマッチングスコアリング
 * 事業相性と課題解決の可能性を分析
 */

class MinutesBasedMatchingScorer {
    constructor() {
        this.weights = {
            businessSynergy: 0.4,      // 事業の相性
            solutionMatch: 0.4,        // 課題解決の可能性
            commonInterests: 0.2       // 共通の関心事
        };
    }

    /**
     * 議事録ベースのマッチングスコアを計算
     */
    async calculateMinutesBasedScore(userId, targetUserId) {
        try {
            // 両ユーザーの議事録データを取得
            const [userMinutes, targetMinutes] = await Promise.all([
                this.getUserMinutesData(userId),
                this.getUserMinutesData(targetUserId)
            ]);

            if (!userMinutes || !targetMinutes) {
                return { score: 50, breakdown: {} };
            }

            // 各要素のスコアを計算
            const scores = await Promise.all([
                this.calculateBusinessSynergy(userMinutes, targetMinutes),
                this.calculateSolutionMatch(userMinutes, targetMinutes),
                this.calculateCommonInterests(userMinutes, targetMinutes)
            ]);

            // 重み付けスコアの計算
            const finalScore = Math.round(
                scores[0] * this.weights.businessSynergy +
                scores[1] * this.weights.solutionMatch +
                scores[2] * this.weights.commonInterests
            );

            return {
                score: finalScore,
                breakdown: {
                    businessSynergy: scores[0],
                    solutionMatch: scores[1],
                    commonInterests: scores[2]
                },
                suggestions: this.generateMatchingSuggestions(userMinutes, targetMinutes)
            };
        } catch (error) {
            console.error('[MinutesBasedScoring] Error:', error);
            return { score: 50, breakdown: {}, suggestions: [] };
        }
    }

    /**
     * ユーザーの議事録データを取得・解析
     */
    async getUserMinutesData(userId) {
        try {
            // messagesテーブルから議事録タイプのメッセージを取得
            const { data: messages } = await window.supabase
                .from('messages')
                .select('content, created_at')
                .eq('sender_id', userId)
                .ilike('content', '%議事録%')
                .order('created_at', { ascending: false })
                .limit(20);

            // プロフィール情報も取得
            const { data: profile } = await window.supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (!messages || messages.length === 0) {
                // 議事録がない場合はプロフィールとメッセージから推測
                const { data: allMessages } = await window.supabase
                    .from('messages')
                    .select('content')
                    .eq('sender_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(50);

                return this.extractBusinessDataFromMessages(allMessages, profile);
            }

            // 議事録から事業情報を抽出
            return this.extractBusinessDataFromMinutes(messages, profile);
        } catch (error) {
            console.error('[MinutesBasedScoring] Data fetch error:', error);
            return null;
        }
    }

    /**
     * 議事録から事業情報を抽出
     */
    extractBusinessDataFromMinutes(minutes, profile) {
        const businessData = {
            services: [],
            challenges: [],
            strengths: [],
            interests: [],
            keywords: [],
            profile: profile
        };

        minutes.forEach(minute => {
            const content = minute.content || '';
            
            // サービス・製品の抽出
            const servicePatterns = [
                /提供している(.+?)(?:です|ます|。)/g,
                /サービス(?:は|：)(.+?)(?:です|ます|。)/g,
                /製品(?:は|：)(.+?)(?:です|ます|。)/g,
                /事業(?:は|：)(.+?)(?:です|ます|。)/g
            ];
            
            servicePatterns.forEach(pattern => {
                const matches = content.matchAll(pattern);
                for (const match of matches) {
                    if (match[1]) businessData.services.push(match[1].trim());
                }
            });

            // 課題・ニーズの抽出
            const challengePatterns = [
                /課題(?:は|：)(.+?)(?:です|ます|。)/g,
                /困っている(.+?)(?:です|ます|。)/g,
                /ニーズ(?:は|：)(.+?)(?:です|ます|。)/g,
                /探している(.+?)(?:です|ます|。)/g,
                /(.+?)が必要/g,
                /(.+?)を改善したい/g
            ];
            
            challengePatterns.forEach(pattern => {
                const matches = content.matchAll(pattern);
                for (const match of matches) {
                    if (match[1]) businessData.challenges.push(match[1].trim());
                }
            });

            // 強み・専門性の抽出
            const strengthPatterns = [
                /強み(?:は|：)(.+?)(?:です|ます|。)/g,
                /得意(?:な|分野は)(.+?)(?:です|ます|。)/g,
                /専門(?:は|：)(.+?)(?:です|ます|。)/g,
                /実績(?:は|：)(.+?)(?:です|ます|。)/g
            ];
            
            strengthPatterns.forEach(pattern => {
                const matches = content.matchAll(pattern);
                for (const match of matches) {
                    if (match[1]) businessData.strengths.push(match[1].trim());
                }
            });

            // キーワード抽出（業界用語）
            const keywords = this.extractBusinessKeywords(content);
            businessData.keywords.push(...keywords);
        });

        // 重複を削除
        businessData.services = [...new Set(businessData.services)];
        businessData.challenges = [...new Set(businessData.challenges)];
        businessData.strengths = [...new Set(businessData.strengths)];
        businessData.keywords = [...new Set(businessData.keywords)];

        return businessData;
    }

    /**
     * メッセージから事業情報を推測
     */
    extractBusinessDataFromMessages(messages, profile) {
        const businessData = {
            services: [],
            challenges: [],
            strengths: [],
            interests: [],
            keywords: [],
            profile: profile
        };

        // プロフィールから基本情報を取得
        if (profile) {
            if (profile.company) businessData.services.push(profile.company);
            if (profile.title) businessData.strengths.push(profile.title);
            if (profile.skills) businessData.keywords.push(...profile.skills);
        }

        // メッセージからキーワードを抽出
        messages?.forEach(msg => {
            const keywords = this.extractBusinessKeywords(msg.content || '');
            businessData.keywords.push(...keywords);
        });

        businessData.keywords = [...new Set(businessData.keywords)];
        return businessData;
    }

    /**
     * ビジネスキーワードの抽出
     */
    extractBusinessKeywords(text) {
        const businessKeywords = [
            'AI', 'DX', 'SaaS', 'IoT', 'ブロックチェーン', 'クラウド',
            'マーケティング', 'セールス', 'カスタマーサクセス',
            'データ分析', 'UI/UX', 'アプリ開発', 'システム開発',
            'コンサルティング', 'スタートアップ', 'ベンチャー',
            'EC', 'フィンテック', 'ヘルステック', 'エドテック',
            'HR', '人事', '採用', '教育', '研修',
            'ブランディング', 'PR', '広報', 'デザイン',
            '業務効率化', '自動化', 'RPA', 'API連携'
        ];

        const found = [];
        businessKeywords.forEach(keyword => {
            if (text.includes(keyword)) {
                found.push(keyword);
            }
        });

        return found;
    }

    /**
     * 事業の相性を計算
     */
    calculateBusinessSynergy(userData, targetData) {
        let score = 0;

        // 業界の関連性
        const userKeywords = new Set(userData.keywords);
        const targetKeywords = new Set(targetData.keywords);
        const commonKeywords = [...userKeywords].filter(k => targetKeywords.has(k));
        
        // 共通キーワードが多いほど高スコア
        score += Math.min(commonKeywords.length * 10, 40);

        // 補完関係のチェック
        const complementaryPairs = [
            ['マーケティング', 'システム開発'],
            ['デザイン', 'エンジニア'],
            ['セールス', 'カスタマーサクセス'],
            ['コンサルティング', 'システム開発'],
            ['PR', 'ブランディング'],
            ['データ分析', 'マーケティング']
        ];

        complementaryPairs.forEach(([skill1, skill2]) => {
            if ((userKeywords.has(skill1) && targetKeywords.has(skill2)) ||
                (userKeywords.has(skill2) && targetKeywords.has(skill1))) {
                score += 15;
            }
        });

        // プロフィールの業界一致
        if (userData.profile?.industry === targetData.profile?.industry) {
            score += 20;
        }

        return Math.min(score, 100);
    }

    /**
     * 課題解決マッチングを計算
     */
    calculateSolutionMatch(userData, targetData) {
        let score = 0;
        const matches = [];

        // ユーザーAの課題をユーザーBのサービス・強みで解決できるか
        userData.challenges.forEach(challenge => {
            targetData.services.concat(targetData.strengths).forEach(solution => {
                if (this.canSolve(challenge, solution)) {
                    score += 25;
                    matches.push({
                        challenge: challenge,
                        solution: solution,
                        solver: 'target'
                    });
                }
            });
        });

        // 逆方向もチェック（ユーザーBの課題をユーザーAが解決）
        targetData.challenges.forEach(challenge => {
            userData.services.concat(userData.strengths).forEach(solution => {
                if (this.canSolve(challenge, solution)) {
                    score += 25;
                    matches.push({
                        challenge: challenge,
                        solution: solution,
                        solver: 'user'
                    });
                }
            });
        });

        // マッチング情報を保存（提案生成用）
        this.solutionMatches = matches;

        return Math.min(score, 100);
    }

    /**
     * 課題と解決策のマッチング判定
     */
    canSolve(challenge, solution) {
        // 課題と解決策のマッピング
        const solutionMap = {
            'マーケティング': ['集客', '認知度', 'PR', '広告', 'ブランディング'],
            'システム開発': ['システム', 'アプリ', '自動化', '効率化', 'DX'],
            'デザイン': ['UI', 'UX', 'ブランド', 'ビジュアル', 'クリエイティブ'],
            'データ分析': ['分析', 'レポート', '可視化', 'インサイト', 'KPI'],
            'セールス': ['営業', '売上', '新規開拓', '顧客獲得'],
            'カスタマーサクセス': ['顧客満足', 'リテンション', 'サポート', 'フォロー'],
            '採用': ['人材', '人事', 'リクルーティング', 'チーム拡大'],
            '資金調達': ['資金', '投資', 'ファンディング', '資本']
        };

        // キーワードマッチング
        for (const [solutionKey, challengeKeywords] of Object.entries(solutionMap)) {
            if (solution.includes(solutionKey)) {
                for (const keyword of challengeKeywords) {
                    if (challenge.includes(keyword)) {
                        return true;
                    }
                }
            }
        }

        // 直接的なキーワードマッチング
        const challengeWords = challenge.split(/[、。\s]+/);
        const solutionWords = solution.split(/[、。\s]+/);
        
        return challengeWords.some(cWord => 
            solutionWords.some(sWord => 
                cWord.length > 2 && sWord.includes(cWord)
            )
        );
    }

    /**
     * 共通の関心事を計算
     */
    calculateCommonInterests(userData, targetData) {
        const userInterests = new Set([
            ...userData.keywords,
            ...userData.services,
            ...userData.strengths
        ]);
        
        const targetInterests = new Set([
            ...targetData.keywords,
            ...targetData.services,
            ...targetData.strengths
        ]);

        const common = [...userInterests].filter(i => targetInterests.has(i));
        
        return Math.min((common.length / Math.min(userInterests.size, targetInterests.size)) * 100, 100);
    }

    /**
     * マッチング提案を生成
     */
    generateMatchingSuggestions(userData, targetData) {
        const suggestions = [];

        // 課題解決の提案
        if (this.solutionMatches && this.solutionMatches.length > 0) {
            this.solutionMatches.forEach(match => {
                if (match.solver === 'target') {
                    suggestions.push({
                        type: 'solution',
                        message: `${targetData.profile?.name || '相手'}の「${match.solution}」があなたの「${match.challenge}」の課題を解決できそうです`
                    });
                } else {
                    suggestions.push({
                        type: 'solution',
                        message: `あなたの「${match.solution}」が${targetData.profile?.name || '相手'}の「${match.challenge}」の課題を解決できそうです`
                    });
                }
            });
        }

        // 事業シナジーの提案
        const commonKeywords = userData.keywords.filter(k => targetData.keywords.includes(k));
        if (commonKeywords.length > 0) {
            suggestions.push({
                type: 'synergy',
                message: `共通の関心分野：${commonKeywords.slice(0, 3).join('、')}`
            });
        }

        return suggestions;
    }
}

// グローバルに公開
window.minutesBasedMatchingScorer = new MinutesBasedMatchingScorer();

console.log('[MinutesBasedMatchingScorer] 議事録ベースのマッチングスコアリング初期化');