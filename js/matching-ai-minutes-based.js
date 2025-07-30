/**
 * 議事録ベースのAIマッチングスコアリング
 * 事業相性と課題解決の可能性を分析
 */

class MinutesBasedMatchingScorer {
    constructor() {
        this.weights = {
            businessSynergy: 0.25,         // 事業の相性
            solutionMatch: 0.25,           // 課題解決の可能性
            businessTrends: 0.15,          // 事業トレンドの一致
            growthPhaseMatch: 0.15,        // 成長フェーズの適合性
            urgencyAlignment: 0.10,        // 緊急度の一致
            resourceComplement: 0.10       // リソースの補完性
        };
        
        // 時期による重み付け（日数）
        this.recencyWeights = [
            { days: 30, weight: 1.0 },      // 1ヶ月以内: 100%
            { days: 90, weight: 0.8 },      // 3ヶ月以内: 80%
            { days: 180, weight: 0.6 },     // 6ヶ月以内: 60%
            { days: 365, weight: 0.4 },     // 1年以内: 40%
            { days: 730, weight: 0.2 },     // 2年以内: 20%
            { days: Infinity, weight: 0.1 } // それ以上: 10%
        ];
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
                this.calculateBusinessTrends(userMinutes, targetMinutes),
                this.calculateGrowthPhaseMatch(userMinutes, targetMinutes),
                this.calculateUrgencyAlignment(userMinutes, targetMinutes),
                this.calculateResourceComplement(userMinutes, targetMinutes)
            ]);

            // 重み付けスコアの計算
            const finalScore = Math.round(
                scores[0] * this.weights.businessSynergy +
                scores[1] * this.weights.solutionMatch +
                scores[2] * this.weights.businessTrends +
                scores[3] * this.weights.growthPhaseMatch +
                scores[4] * this.weights.urgencyAlignment +
                scores[5] * this.weights.resourceComplement
            );

            return {
                score: finalScore,
                breakdown: {
                    businessSynergy: scores[0],
                    solutionMatch: scores[1],
                    businessTrends: scores[2],
                    growthPhaseMatch: scores[3],
                    urgencyAlignment: scores[4],
                    resourceComplement: scores[5]
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
                .limit(50);  // より多くの履歴を取得

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
            trends: [],
            urgentNeeds: [],
            resources: [],
            growthStage: null,
            timeline: [],
            profile: profile
        };

        minutes.forEach(minute => {
            const content = minute.content || '';
            const createdAt = new Date(minute.created_at);
            const daysAgo = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
            const recencyWeight = this.getRecencyWeight(daysAgo);
            
            // タイムライン情報の追加
            businessData.timeline.push({
                date: createdAt,
                daysAgo: daysAgo,
                weight: recencyWeight,
                content: content.substring(0, 100) + '...'
            });
            
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
            
            // トレンドワードの抽出
            const trends = this.extractTrendKeywords(content);
            businessData.trends.push(...trends.map(t => ({ word: t, weight: recencyWeight })));
            
            // 緊急度の高い課題の抽出
            const urgentPatterns = [
                /緊急|至急|早急|すぐに|今すぐ|ASAP/g,
                /今月中|今週中|明日まで|本日中/g,
                /締切|期限|デッドライン/g
            ];
            
            urgentPatterns.forEach(pattern => {
                if (pattern.test(content)) {
                    businessData.urgentNeeds.push({
                        content: content.substring(0, 100),
                        daysAgo: daysAgo,
                        weight: recencyWeight
                    });
                }
            });
            
            // リソース・必要なものの抽出
            const resourcePatterns = [
                /人材|エンジニア|デザイナー|マーケター|営業/g,
                /資金|投資|予算|コスト/g,
                /技術|ツール|システム|プラットフォーム/g,
                /パートナー|協力|連携|提携/g
            ];
            
            resourcePatterns.forEach(pattern => {
                const matches = content.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        businessData.resources.push({
                            type: match,
                            weight: recencyWeight
                        });
                    });
                }
            });
            
            // 成長ステージの判定
            if (!businessData.growthStage || recencyWeight > 0.5) {
                if (/シード|アイデア|構想|立ち上げ/.test(content)) {
                    businessData.growthStage = 'seed';
                } else if (/MVP|プロトタイプ|β版|ベータ/.test(content)) {
                    businessData.growthStage = 'mvp';
                } else if (/成長|拡大|スケール|グロース/.test(content)) {
                    businessData.growthStage = 'growth';
                } else if (/安定|成熟|確立/.test(content)) {
                    businessData.growthStage = 'mature';
                }
            }
        });

        // 重複を削除と重み付け集計
        businessData.services = this.deduplicateWithWeight(businessData.services);
        businessData.challenges = this.deduplicateWithWeight(businessData.challenges);
        businessData.strengths = this.deduplicateWithWeight(businessData.strengths);
        businessData.keywords = [...new Set(businessData.keywords)];
        businessData.trends = this.aggregateTrends(businessData.trends);
        businessData.resources = this.aggregateResources(businessData.resources);

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
     * 時期による重み付けを取得
     */
    getRecencyWeight(daysAgo) {
        for (const { days, weight } of this.recencyWeights) {
            if (daysAgo <= days) {
                return weight;
            }
        }
        return this.recencyWeights[this.recencyWeights.length - 1].weight;
    }

    /**
     * 重複除去と重み付け集計
     */
    deduplicateWithWeight(items) {
        if (!Array.isArray(items)) return [];
        return [...new Set(items)];
    }

    /**
     * トレンドの集計
     */
    aggregateTrends(trends) {
        const trendMap = new Map();
        trends.forEach(({ word, weight }) => {
            if (trendMap.has(word)) {
                trendMap.set(word, trendMap.get(word) + weight);
            } else {
                trendMap.set(word, weight);
            }
        });
        
        return Array.from(trendMap.entries())
            .map(([word, totalWeight]) => ({ word, totalWeight }))
            .sort((a, b) => b.totalWeight - a.totalWeight)
            .slice(0, 10); // トップ10のトレンド
    }

    /**
     * リソースの集計
     */
    aggregateResources(resources) {
        const resourceMap = new Map();
        resources.forEach(({ type, weight }) => {
            if (resourceMap.has(type)) {
                resourceMap.set(type, resourceMap.get(type) + weight);
            } else {
                resourceMap.set(type, weight);
            }
        });
        
        return Array.from(resourceMap.entries())
            .map(([type, totalWeight]) => ({ type, totalWeight }))
            .sort((a, b) => b.totalWeight - a.totalWeight);
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
     * トレンドキーワードの抽出
     */
    extractTrendKeywords(text) {
        const trendKeywords = [
            'ChatGPT', 'GPT-4', 'LLM', '生成AI', 'プロンプト',
            'Web3', 'NFT', 'メタバース', 'VR', 'AR', 'XR',
            'SDGs', 'ESG', 'カーボンニュートラル', 'サステナブル',
            'リモートワーク', 'ハイブリッドワーク', 'ワーケーション',
            'D2C', 'OMO', 'CX', 'UX', 'DX推進',
            'ノーコード', 'ローコード', 'マイクロサービス',
            'サブスク', 'リカーリング', 'LTV', 'CAC'
        ];

        const found = [];
        trendKeywords.forEach(keyword => {
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
     * ビジネストレンドの一致を計算
     */
    calculateBusinessTrends(userData, targetData) {
        let score = 0;
        
        // トレンドキーワードの重み付け比較
        const userTrends = new Map(userData.trends.map(t => [t.word, t.totalWeight]));
        const targetTrends = new Map(targetData.trends.map(t => [t.word, t.totalWeight]));
        
        let commonWeight = 0;
        let totalWeight = 0;
        
        userTrends.forEach((weight, word) => {
            totalWeight += weight;
            if (targetTrends.has(word)) {
                commonWeight += Math.min(weight, targetTrends.get(word));
            }
        });
        
        targetTrends.forEach((weight, word) => {
            if (!userTrends.has(word)) {
                totalWeight += weight;
            }
        });
        
        if (totalWeight > 0) {
            score = (commonWeight / totalWeight) * 100;
        }
        
        // 最新トレンドへの適応度
        const latestTrends = ['ChatGPT', 'GPT-4', '生成AI', 'Web3', 'SDGs'];
        const userHasLatest = latestTrends.some(trend => userTrends.has(trend));
        const targetHasLatest = latestTrends.some(trend => targetTrends.has(trend));
        
        if (userHasLatest && targetHasLatest) {
            score += 20;
        }
        
        return Math.min(score, 100);
    }

    /**
     * 成長フェーズのマッチングを計算
     */
    calculateGrowthPhaseMatch(userData, targetData) {
        const phaseScores = {
            'seed-seed': 100,
            'seed-mvp': 80,
            'mvp-mvp': 100,
            'mvp-growth': 80,
            'growth-growth': 100,
            'growth-mature': 70,
            'mature-mature': 100,
            'seed-growth': 60,
            'seed-mature': 40,
            'mvp-mature': 50
        };
        
        const userPhase = userData.growthStage || 'unknown';
        const targetPhase = targetData.growthStage || 'unknown';
        
        const key = `${userPhase}-${targetPhase}`;
        const reverseKey = `${targetPhase}-${userPhase}`;
        
        return phaseScores[key] || phaseScores[reverseKey] || 50;
    }

    /**
     * 緊急度の一致を計算
     */
    calculateUrgencyAlignment(userData, targetData) {
        // 緊急ニーズの数と鮮度を評価
        const userUrgency = this.calculateUrgencyScore(userData.urgentNeeds);
        const targetUrgency = this.calculateUrgencyScore(targetData.urgentNeeds);
        
        // 緊急度が近いほど高スコア
        const diff = Math.abs(userUrgency - targetUrgency);
        return Math.max(0, 100 - diff);
    }

    calculateUrgencyScore(urgentNeeds) {
        if (!urgentNeeds || urgentNeeds.length === 0) return 0;
        
        let score = 0;
        urgentNeeds.forEach(need => {
            // 鮮度が高いほど重要
            score += need.weight * 10;
        });
        
        return Math.min(score, 100);
    }

    /**
     * リソースの補完性を計算
     */
    calculateResourceComplement(userData, targetData) {
        let score = 0;
        
        // ユーザーAが持っているリソース
        const userResources = new Set(userData.resources.map(r => r.type));
        // ユーザーBが必要としているリソース（課題から推測）
        const targetNeeds = this.inferResourceNeeds(targetData.challenges);
        
        // 補完関係のチェック
        targetNeeds.forEach(need => {
            if (userResources.has(need)) {
                score += 20;
            }
        });
        
        // 逆方向もチェック
        const userNeeds = this.inferResourceNeeds(userData.challenges);
        const targetResources = new Set(targetData.resources.map(r => r.type));
        
        userNeeds.forEach(need => {
            if (targetResources.has(need)) {
                score += 20;
            }
        });
        
        return Math.min(score, 100);
    }

    inferResourceNeeds(challenges) {
        const needs = new Set();
        const needsMap = {
            '集客': ['マーケティング', 'PR', '広告'],
            '開発': ['エンジニア', 'システム'],
            'デザイン': ['デザイナー', 'UI/UX'],
            '資金': ['投資', '資金調達'],
            '人材': ['採用', 'HR'],
            '営業': ['セールス', '営業']
        };
        
        challenges.forEach(challenge => {
            Object.entries(needsMap).forEach(([key, resources]) => {
                if (challenge.includes(key)) {
                    resources.forEach(r => needs.add(r));
                }
            });
        });
        
        return Array.from(needs);
    }

    /**
     * マッチング提案を生成
     */
    generateMatchingSuggestions(userData, targetData) {
        const suggestions = [];

        // 課題解決の提案
        if (this.solutionMatches && this.solutionMatches.length > 0) {
            this.solutionMatches.slice(0, 3).forEach(match => {
                if (match.solver === 'target') {
                    suggestions.push({
                        type: 'solution',
                        priority: 'high',
                        message: `${targetData.profile?.name || '相手'}の「${match.solution}」があなたの「${match.challenge}」の課題を解決できそうです`
                    });
                } else {
                    suggestions.push({
                        type: 'solution',
                        priority: 'high',
                        message: `あなたの「${match.solution}」が${targetData.profile?.name || '相手'}の「${match.challenge}」の課題を解決できそうです`
                    });
                }
            });
        }

        // トレンドの一致
        const commonTrends = userData.trends
            .filter(ut => targetData.trends.some(tt => tt.word === ut.word))
            .slice(0, 3);
        
        if (commonTrends.length > 0) {
            suggestions.push({
                type: 'trend',
                priority: 'medium',
                message: `共通の注目トレンド：${commonTrends.map(t => t.word).join('、')}`
            });
        }

        // 成長フェーズの提案
        if (userData.growthStage && targetData.growthStage) {
            const phaseMessages = {
                'seed-mvp': 'アイデア段階からMVP開発の知見を共有できます',
                'mvp-growth': 'MVPから成長フェーズへの移行経験を共有できます',
                'growth-mature': 'スケールアップから安定化のノウハウを共有できます'
            };
            
            const phaseKey = `${userData.growthStage}-${targetData.growthStage}`;
            if (phaseMessages[phaseKey]) {
                suggestions.push({
                    type: 'phase',
                    priority: 'medium',
                    message: phaseMessages[phaseKey]
                });
            }
        }

        // 緊急ニーズのマッチ
        if (userData.urgentNeeds.length > 0 && targetData.strengths.length > 0) {
            const recentUrgent = userData.urgentNeeds
                .filter(n => n.daysAgo < 30)
                .slice(0, 1);
            
            if (recentUrgent.length > 0) {
                suggestions.push({
                    type: 'urgent',
                    priority: 'high',
                    message: '緊急のニーズに対応できる可能性があります'
                });
            }
        }

        // リソースの補完関係
        const resourceMatches = this.findResourceComplements(userData, targetData);
        if (resourceMatches.length > 0) {
            suggestions.push({
                type: 'resource',
                priority: 'medium',
                message: `リソースの補完：${resourceMatches.slice(0, 2).join('、')}`
            });
        }

        // 優先度でソート
        return suggestions.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        });
    }

    findResourceComplements(userData, targetData) {
        const complements = [];
        const userResources = new Set(userData.resources.map(r => r.type));
        const targetNeeds = this.inferResourceNeeds(targetData.challenges);
        
        targetNeeds.forEach(need => {
            if (userResources.has(need)) {
                complements.push(`あなたの${need}能力`);
            }
        });
        
        return complements;
    }
}

// グローバルに公開
window.minutesBasedMatchingScorer = new MinutesBasedMatchingScorer();

console.log('[MinutesBasedMatchingScorer] 議事録ベースのマッチングスコアリング初期化');