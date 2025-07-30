/**
 * LLMベースの高度な議事録解析
 * ブラウザ内でLLMを使用して自然言語処理を実行
 */

class LLMMinutesAnalyzer {
    constructor() {
        // プロンプトテンプレート
        this.analysisPrompt = `以下の議事録を分析して、JSON形式で構造化されたビジネス情報を抽出してください。

議事録:
{content}

以下の形式で出力してください:
{
    "businessInfo": {
        "mainServices": ["主要なサービス・製品"],
        "coreStrengths": ["中核的な強み・専門性"],
        "currentChallenges": ["現在の課題・ニーズ"],
        "businessPhase": "seed|mvp|growth|mature",
        "urgentNeeds": ["緊急度の高い項目"],
        "requiredResources": ["必要なリソース"],
        "industryKeywords": ["業界キーワード"],
        "trendAlignment": ["注目しているトレンド"],
        "potentialSolutions": ["提供可能なソリューション"]
    },
    "insights": {
        "businessDirection": "事業の方向性の要約",
        "collaborationPotential": "協業可能性の分析",
        "timeRelevance": "情報の新鮮度（最新/標準/古い）"
    }
}`;

        // マッチング分析プロンプト
        this.matchingPrompt = `2つの企業のビジネス情報を比較し、マッチングの可能性を分析してください。

企業A:
{businessA}

企業B:
{businessB}

以下の観点で分析し、JSON形式で出力してください:
{
    "matchingScore": {
        "overall": 0-100,
        "breakdown": {
            "businessSynergy": 0-100,
            "solutionFit": 0-100,
            "resourceComplement": 0-100,
            "trendAlignment": 0-100,
            "urgencyMatch": 0-100,
            "growthCompatibility": 0-100
        }
    },
    "opportunities": [
        {
            "type": "solution|collaboration|resource",
            "description": "具体的な機会の説明",
            "priority": "high|medium|low",
            "actionable": "推奨されるアクション"
        }
    ],
    "risks": [
        {
            "type": "competition|mismatch|timing",
            "description": "潜在的なリスク",
            "mitigation": "リスク軽減策"
        }
    ],
    "recommendations": [
        "具体的な推奨事項"
    ]
}`;
    }

    /**
     * LLM APIを呼び出して議事録を解析
     * 注: 実際の実装では、適切なLLM APIエンドポイントが必要
     */
    async analyzeMeetingMinutes(minutesContent) {
        try {
            // ここでは仮想的なLLM APIの呼び出しを示します
            // 実際には、OpenAI API、Claude API、またはローカルLLMなどを使用
            
            const prompt = this.analysisPrompt.replace('{content}', minutesContent);
            
            // 仮想的なAPI呼び出し
            const response = await this.callLLMAPI(prompt);
            
            // レスポンスをパース
            return JSON.parse(response);
        } catch (error) {
            console.error('[LLMAnalyzer] Analysis failed:', error);
            // フォールバック: 従来のパターンマッチング
            return this.fallbackAnalysis(minutesContent);
        }
    }

    /**
     * 2つのビジネスのマッチング分析
     */
    async analyzeBusinessMatching(businessInfoA, businessInfoB) {
        try {
            const prompt = this.matchingPrompt
                .replace('{businessA}', JSON.stringify(businessInfoA, null, 2))
                .replace('{businessB}', JSON.stringify(businessInfoB, null, 2));
            
            const response = await this.callLLMAPI(prompt);
            return JSON.parse(response);
        } catch (error) {
            console.error('[LLMAnalyzer] Matching analysis failed:', error);
            return this.fallbackMatchingAnalysis(businessInfoA, businessInfoB);
        }
    }

    /**
     * LLM APIの呼び出し（実装例）
     * 注: 実際の使用には適切なAPIキーとエンドポイントが必要
     */
    async callLLMAPI(prompt) {
        // オプション1: OpenAI API（ブラウザから直接は推奨されない）
        // const response = await fetch('https://api.openai.com/v1/chat/completions', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Authorization': 'Bearer YOUR_API_KEY'
        //     },
        //     body: JSON.stringify({
        //         model: 'gpt-4',
        //         messages: [{ role: 'user', content: prompt }]
        //     })
        // });

        // オプション2: Edge Functions経由（Supabase Edge Functions）
        const response = await window.supabase.functions.invoke('analyze-minutes', {
            body: { prompt }
        });

        if (response.error) throw response.error;
        return response.data.result;
    }

    /**
     * ブラウザ内で実行可能な軽量LLM（将来的な実装）
     */
    async runLocalLLM(prompt) {
        // WebLLM、ONNX Runtime、TensorFlow.jsなどを使用
        // 例: https://github.com/mlc-ai/web-llm
        
        // 現在は未実装
        throw new Error('Local LLM not implemented');
    }

    /**
     * フォールバック: 従来のパターンマッチング
     */
    fallbackAnalysis(content) {
        // 既存のmatching-ai-minutes-based.jsの実装を活用
        const analyzer = window.minutesBasedMatchingScorer;
        const mockMinutes = [{ content, created_at: new Date() }];
        const businessData = analyzer.extractBusinessDataFromMinutes(mockMinutes, {});
        
        return {
            businessInfo: {
                mainServices: businessData.services,
                coreStrengths: businessData.strengths,
                currentChallenges: businessData.challenges,
                businessPhase: businessData.growthStage || 'unknown',
                urgentNeeds: businessData.urgentNeeds?.map(n => n.content) || [],
                requiredResources: businessData.resources?.map(r => r.type) || [],
                industryKeywords: businessData.keywords,
                trendAlignment: businessData.trends?.map(t => t.word) || [],
                potentialSolutions: []
            },
            insights: {
                businessDirection: '詳細な分析にはLLM APIが必要です',
                collaborationPotential: '基本的なパターンマッチングによる分析',
                timeRelevance: '標準'
            }
        };
    }

    /**
     * フォールバック: 基本的なマッチング分析
     */
    fallbackMatchingAnalysis(businessA, businessB) {
        // 簡易的なスコア計算
        const commonKeywords = businessA.industryKeywords.filter(k => 
            businessB.industryKeywords.includes(k)
        );
        
        const solutionFit = businessA.currentChallenges.some(challenge =>
            businessB.coreStrengths.some(strength => 
                this.isRelated(challenge, strength)
            )
        );
        
        return {
            matchingScore: {
                overall: 70,
                breakdown: {
                    businessSynergy: commonKeywords.length * 10,
                    solutionFit: solutionFit ? 80 : 40,
                    resourceComplement: 60,
                    trendAlignment: 50,
                    urgencyMatch: 50,
                    growthCompatibility: 60
                }
            },
            opportunities: [{
                type: 'collaboration',
                description: '基本的なマッチング分析による提案',
                priority: 'medium',
                actionable: '詳細な分析にはLLM統合が必要です'
            }],
            risks: [],
            recommendations: [
                'より精度の高い分析にはLLM APIの設定が必要です'
            ]
        };
    }

    isRelated(term1, term2) {
        // 簡易的な関連性チェック
        return term1.includes(term2) || term2.includes(term1);
    }
}

// Supabase Edge Function の例（別ファイルで実装）
/*
// supabase/functions/analyze-minutes/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.1.0'

serve(async (req) => {
    const { prompt } = await req.json()
    
    const openai = new OpenAIApi(new Configuration({
        apiKey: Deno.env.get('OPENAI_API_KEY')
    }))
    
    const completion = await openai.createChatCompletion({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
    })
    
    return new Response(
        JSON.stringify({ result: completion.data.choices[0].message.content }),
        { headers: { 'Content-Type': 'application/json' } }
    )
})
*/

// グローバルに公開
window.llmMinutesAnalyzer = new LLMMinutesAnalyzer();

console.log('[LLMAnalyzer] LLMベースの議事録解析エンジン初期化');