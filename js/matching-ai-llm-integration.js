/**
 * LLMアナライザーを既存のマッチングシステムに統合
 */

(function() {
    'use strict';

    // LLMを使用した高度なマッチングスコアラー
    class LLMEnhancedMatchingScorer {
        constructor() {
            this.baseScorer = window.minutesBasedMatchingScorer;
            this.llmAnalyzer = window.llmMinutesAnalyzer;
            this.useLocalProcessing = true; // LLM APIが利用できない場合のフラグ
        }

        /**
         * LLM強化版のマッチングスコア計算
         */
        async calculateEnhancedScore(userId, targetUserId) {
            try {
                // 基本的なデータ取得
                const [userMinutes, targetMinutes] = await Promise.all([
                    this.getUserMinutesData(userId),
                    this.getUserMinutesData(targetUserId)
                ]);

                if (!userMinutes || !targetMinutes) {
                    return this.baseScorer.calculateMinutesBasedScore(userId, targetUserId);
                }

                // LLMで議事録を解析
                const [userAnalysis, targetAnalysis] = await Promise.all([
                    this.analyzeWithLLM(userMinutes),
                    this.analyzeWithLLM(targetMinutes)
                ]);

                // LLMでマッチング分析
                const matchingAnalysis = await this.llmAnalyzer.analyzeBusinessMatching(
                    userAnalysis.businessInfo,
                    targetAnalysis.businessInfo
                );

                // 詳細な提案を生成
                const suggestions = this.generateDetailedSuggestions(
                    matchingAnalysis,
                    userAnalysis,
                    targetAnalysis
                );

                return {
                    score: matchingAnalysis.matchingScore.overall,
                    breakdown: matchingAnalysis.matchingScore.breakdown,
                    suggestions: suggestions,
                    insights: {
                        opportunities: matchingAnalysis.opportunities,
                        risks: matchingAnalysis.risks,
                        recommendations: matchingAnalysis.recommendations
                    }
                };

            } catch (error) {
                console.warn('[LLMEnhanced] Falling back to base scorer:', error);
                // フォールバック: 基本的なスコアリング
                return this.baseScorer.calculateMinutesBasedScore(userId, targetUserId);
            }
        }

        /**
         * ユーザーの議事録データを取得
         */
        async getUserMinutesData(userId) {
            // messagesテーブルから最近の議事録を取得
            const { data: messages } = await window.supabase
                .from('messages')
                .select('content, created_at')
                .eq('sender_id', userId)
                .or('content.ilike.%議事録%,content.ilike.%meeting%,content.ilike.%打ち合わせ%')
                .order('created_at', { ascending: false })
                .limit(10);

            if (!messages || messages.length === 0) {
                // プロフィールとメッセージから推測
                const { data: profile } = await window.supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                const { data: allMessages } = await window.supabase
                    .from('messages')
                    .select('content')
                    .eq('sender_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(30);

                return { messages: allMessages, profile };
            }

            return { messages, profile: null };
        }

        /**
         * LLMで議事録を解析（ローカル処理を優先）
         */
        async analyzeWithLLM(minutesData) {
            const combinedContent = minutesData.messages
                .map(m => m.content)
                .join('\n\n---\n\n');

            if (this.useLocalProcessing) {
                // ローカルでの高度な解析
                return this.performLocalAnalysis(combinedContent, minutesData.profile);
            } else {
                // LLM APIを使用
                return await this.llmAnalyzer.analyzeMeetingMinutes(combinedContent);
            }
        }

        /**
         * ローカルでの高度な解析（LLM風の構造化）
         */
        performLocalAnalysis(content, profile) {
            // より高度なパターンと重み付け
            const patterns = {
                services: {
                    patterns: [
                        /(?:提供|開発|運営|販売)(?:している|します|中の)(.+?)(?:です|ます|。|\n)/g,
                        /(?:サービス|製品|ソリューション|プロダクト)(?:は|：|として)(.+?)(?:です|ます|。|\n)/g,
                        /(?:事業|ビジネス)(?:内容|概要)(?:は|：)(.+?)(?:です|ます|。|\n)/g
                    ],
                    weight: 1.0
                },
                challenges: {
                    patterns: [
                        /(?:課題|問題|困っている|悩み)(?:は|：|として)(.+?)(?:です|ます|。|\n)/g,
                        /(.+?)(?:が|を)(?:必要|探している|求めている|欲しい)/g,
                        /(?:改善|解決|対策)(?:したい|が必要な)(.+?)(?:です|ます|。|\n)/g
                    ],
                    weight: 1.2
                },
                strengths: {
                    patterns: [
                        /(?:強み|得意|専門|実績)(?:は|：|として)(.+?)(?:です|ます|。|\n)/g,
                        /(?:経験|ノウハウ|知見)(?:が|を)(?:ある|持っている)(.+?)(?:です|ます|。|\n)/g
                    ],
                    weight: 0.9
                },
                trends: {
                    patterns: [
                        /(?:注目|関心|興味)(?:している|がある)(.+?)(?:です|ます|。|\n)/g,
                        /(?:トレンド|最新|新しい)(.+?)(?:に|を|について)/g
                    ],
                    weight: 0.8
                }
            };

            const extractedData = {
                mainServices: [],
                coreStrengths: [],
                currentChallenges: [],
                industryKeywords: [],
                trendAlignment: []
            };

            // パターンマッチングと重要度スコアリング
            Object.entries(patterns).forEach(([category, config]) => {
                const matches = [];
                config.patterns.forEach(pattern => {
                    const results = [...content.matchAll(pattern)];
                    results.forEach(match => {
                        if (match[1]) {
                            matches.push({
                                text: match[1].trim(),
                                score: config.weight
                            });
                        }
                    });
                });

                // カテゴリごとに結果を格納
                switch(category) {
                    case 'services':
                        extractedData.mainServices = matches.map(m => m.text);
                        break;
                    case 'challenges':
                        extractedData.currentChallenges = matches.map(m => m.text);
                        break;
                    case 'strengths':
                        extractedData.coreStrengths = matches.map(m => m.text);
                        break;
                    case 'trends':
                        extractedData.trendAlignment = matches.map(m => m.text);
                        break;
                }
            });

            // 業界キーワードの抽出（拡張版）
            const industryKeywords = this.extractEnhancedKeywords(content);
            extractedData.industryKeywords = industryKeywords;

            // ビジネスフェーズの推定
            const businessPhase = this.estimateBusinessPhase(content, extractedData);

            // 緊急度の分析
            const urgentNeeds = this.analyzeUrgency(content);

            return {
                businessInfo: {
                    ...extractedData,
                    businessPhase: businessPhase,
                    urgentNeeds: urgentNeeds,
                    requiredResources: this.inferRequiredResources(extractedData.currentChallenges),
                    potentialSolutions: this.inferPotentialSolutions(extractedData.coreStrengths)
                },
                insights: {
                    businessDirection: this.summarizeBusinessDirection(extractedData),
                    collaborationPotential: 'ローカル分析による評価',
                    timeRelevance: this.assessTimeRelevance(content)
                }
            };
        }

        /**
         * 拡張されたキーワード抽出
         */
        extractEnhancedKeywords(text) {
            const keywordCategories = {
                technology: ['AI', 'ML', 'DX', 'IoT', 'ブロックチェーン', 'クラウド', 'SaaS', 'API', 'データ分析', 'セキュリティ'],
                business: ['スタートアップ', 'ベンチャー', 'IPO', 'M&A', '資金調達', 'グローバル展開', 'BtoB', 'BtoC', 'D2C'],
                industry: ['フィンテック', 'ヘルステック', 'エドテック', 'アグリテック', 'リテール', '製造業', '物流', '不動産'],
                trend: ['SDGs', 'ESG', 'DX推進', 'リモートワーク', 'ワークライフバランス', 'ダイバーシティ', 'カーボンニュートラル']
            };

            const found = new Set();
            Object.values(keywordCategories).flat().forEach(keyword => {
                if (text.includes(keyword)) {
                    found.add(keyword);
                }
            });

            return Array.from(found);
        }

        /**
         * ビジネスフェーズの推定
         */
        estimateBusinessPhase(content, extractedData) {
            const phaseIndicators = {
                seed: ['アイデア', '構想', '立ち上げ', 'プレシード', '創業'],
                mvp: ['MVP', 'プロトタイプ', 'β版', 'テスト', '検証'],
                growth: ['成長', '拡大', 'スケール', 'シリーズ', '増収'],
                mature: ['安定', '成熟', '確立', '黒字化', '上場']
            };

            let maxScore = 0;
            let estimatedPhase = 'unknown';

            Object.entries(phaseIndicators).forEach(([phase, indicators]) => {
                const score = indicators.filter(indicator => content.includes(indicator)).length;
                if (score > maxScore) {
                    maxScore = score;
                    estimatedPhase = phase;
                }
            });

            return estimatedPhase;
        }

        /**
         * 緊急度の分析
         */
        analyzeUrgency(content) {
            const urgentPhrases = [
                '緊急', '至急', '早急', 'すぐに', '今すぐ', 'ASAP',
                '今月中', '今週中', '明日まで', '本日中',
                '締切', '期限', 'デッドライン'
            ];

            const urgentNeeds = [];
            urgentPhrases.forEach(phrase => {
                if (content.includes(phrase)) {
                    // 前後の文脈を抽出
                    const index = content.indexOf(phrase);
                    const start = Math.max(0, index - 50);
                    const end = Math.min(content.length, index + 50);
                    urgentNeeds.push(content.substring(start, end).trim());
                }
            });

            return urgentNeeds;
        }

        /**
         * 必要なリソースの推測
         */
        inferRequiredResources(challenges) {
            const resourceMap = {
                '人材': ['採用', '人手不足', 'エンジニア不足', 'マネージャー'],
                '資金': ['資金調達', '予算', 'コスト', '投資'],
                '技術': ['システム', '開発', 'インフラ', 'セキュリティ'],
                'マーケティング': ['集客', '認知度', 'ブランディング', 'PR']
            };

            const required = new Set();
            challenges.forEach(challenge => {
                Object.entries(resourceMap).forEach(([resource, keywords]) => {
                    if (keywords.some(keyword => challenge.includes(keyword))) {
                        required.add(resource);
                    }
                });
            });

            return Array.from(required);
        }

        /**
         * 提供可能なソリューションの推測
         */
        inferPotentialSolutions(strengths) {
            return strengths.map(strength => {
                // 強みから提供可能なソリューションを推測
                if (strength.includes('開発')) return 'システム開発支援';
                if (strength.includes('マーケティング')) return 'マーケティング支援';
                if (strength.includes('営業')) return '営業支援・顧客開拓';
                if (strength.includes('資金')) return '資金調達支援';
                return strength;
            }).filter(Boolean);
        }

        /**
         * ビジネスの方向性を要約
         */
        summarizeBusinessDirection(data) {
            const elements = [];
            
            if (data.mainServices.length > 0) {
                elements.push(`${data.mainServices[0]}を中心とした事業展開`);
            }
            
            if (data.trendAlignment.length > 0) {
                elements.push(`${data.trendAlignment[0]}への注力`);
            }
            
            if (data.currentChallenges.length > 0) {
                elements.push(`${data.currentChallenges[0]}の解決`);
            }
            
            return elements.join('、') || '事業内容の詳細は不明';
        }

        /**
         * 時間的関連性の評価
         */
        assessTimeRelevance(content) {
            const recentIndicators = ['最近', '今月', '今週', '本日', '昨日', '先週'];
            const oldIndicators = ['以前', '去年', '昨年', '過去', '当時'];
            
            const recentCount = recentIndicators.filter(ind => content.includes(ind)).length;
            const oldCount = oldIndicators.filter(ind => content.includes(ind)).length;
            
            if (recentCount > oldCount) return '最新';
            if (oldCount > recentCount) return '古い';
            return '標準';
        }

        /**
         * 詳細な提案を生成
         */
        generateDetailedSuggestions(matchingAnalysis, userAnalysis, targetAnalysis) {
            const suggestions = [];

            // 機会を提案に変換
            matchingAnalysis.opportunities.forEach(opp => {
                suggestions.push({
                    type: opp.type,
                    priority: opp.priority,
                    message: opp.description,
                    action: opp.actionable
                });
            });

            // リスクに基づく注意事項
            matchingAnalysis.risks.forEach(risk => {
                suggestions.push({
                    type: 'warning',
                    priority: 'medium',
                    message: `注意: ${risk.description}`,
                    action: risk.mitigation
                });
            });

            // 推奨事項
            matchingAnalysis.recommendations.forEach(rec => {
                suggestions.push({
                    type: 'recommendation',
                    priority: 'high',
                    message: rec,
                    action: '実施を検討してください'
                });
            });

            return suggestions;
        }
    }

    // 既存のシステムに統合
    window.llmEnhancedMatchingScorer = new LLMEnhancedMatchingScorer();

    // matching-ai-integration.jsの拡張
    if (window.matchingSupabase && window.llmEnhancedMatchingScorer) {
        console.log('[LLMIntegration] Enhancing matching system with LLM capabilities...');
        
        // 環境変数やユーザー設定でLLM使用を制御
        const useLLMEnhancement = localStorage.getItem('useLLMMatching') === 'true';
        
        if (useLLMEnhancement) {
            // calculateMinutesBasedScoreメソッドを上書き
            window.minutesBasedMatchingScorer.calculateMinutesBasedScore = 
                window.llmEnhancedMatchingScorer.calculateEnhancedScore.bind(window.llmEnhancedMatchingScorer);
            
            console.log('[LLMIntegration] LLM enhancement activated');
        }
    }

})();