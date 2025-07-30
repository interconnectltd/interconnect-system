/**
 * マッチングデータの整合性確保
 * すべてのスコアリングシステムでデータの一貫性を保証
 */

class MatchingDataIntegrity {
    constructor() {
        // データスキーマ定義
        this.scoreSchema = {
            // 新しい6軸評価（議事録ベース）
            businessSynergy: { min: 0, max: 100, default: 50, required: true },
            solutionMatch: { min: 0, max: 100, default: 50, required: true },
            businessTrends: { min: 0, max: 100, default: 50, required: true },
            growthPhaseMatch: { min: 0, max: 100, default: 50, required: true },
            urgencyAlignment: { min: 0, max: 100, default: 50, required: true },
            resourceComplement: { min: 0, max: 100, default: 50, required: true },
            
            // 旧式の5軸評価（後方互換性）
            commonTopics: { min: 0, max: 100, default: 50, required: false },
            communicationStyle: { min: 0, max: 100, default: 50, required: false },
            emotionalSync: { min: 0, max: 100, default: 50, required: false },
            activityOverlap: { min: 0, max: 100, default: 50, required: false },
            profileMatch: { min: 0, max: 100, default: 50, required: false }
        };

        // データ変換マッピング
        this.conversionMap = {
            // 旧式から新式への変換
            oldToNew: {
                commonTopics: ['businessTrends', 'businessSynergy'],
                communicationStyle: ['urgencyAlignment'],
                emotionalSync: ['growthPhaseMatch'],
                activityOverlap: ['urgencyAlignment'],
                profileMatch: ['resourceComplement', 'solutionMatch']
            },
            // 新式から旧式への変換（表示互換性のため）
            newToOld: {
                businessSynergy: 'profileMatch',
                solutionMatch: 'profileMatch',
                businessTrends: 'commonTopics',
                growthPhaseMatch: 'emotionalSync',
                urgencyAlignment: 'activityOverlap',
                resourceComplement: 'communicationStyle'
            }
        };

        // 監査ログ
        this.auditLog = [];
        
        // 初期化
        this.init();
    }

    /**
     * 初期化処理
     */
    init() {
        // すべてのスコアリングシステムに介入
        this.interceptScoringMethods();
        
        // データ検証の自動化
        this.setupAutoValidation();
        
        console.log('[DataIntegrity] データ整合性システム初期化完了');
    }

    /**
     * スコアリングメソッドへの介入
     */
    interceptScoringMethods() {
        // 基本スコアリング
        if (window.matchingSupabase) {
            const original = window.matchingSupabase.calculateMatchingScores;
            window.matchingSupabase.calculateMatchingScores = async (profiles) => {
                const result = await original.call(window.matchingSupabase, profiles);
                return this.validateAndNormalizeProfiles(result);
            };
        }

        // 議事録ベーススコアリング
        if (window.minutesBasedMatchingScorer) {
            const original = window.minutesBasedMatchingScorer.calculateMinutesBasedScore;
            window.minutesBasedMatchingScorer.calculateMinutesBasedScore = async (userId, targetUserId) => {
                const result = await original.call(window.minutesBasedMatchingScorer, userId, targetUserId);
                return this.validateAndNormalizeScore(result);
            };
        }

        // LLMスコアリング
        if (window.llmEnhancedMatchingScorer) {
            const original = window.llmEnhancedMatchingScorer.calculateEnhancedScore;
            window.llmEnhancedMatchingScorer.calculateEnhancedScore = async (userId, targetUserId) => {
                const result = await original.call(window.llmEnhancedMatchingScorer, userId, targetUserId);
                return this.validateAndNormalizeScore(result);
            };
        }
    }

    /**
     * プロファイルリストの検証と正規化
     */
    validateAndNormalizeProfiles(profiles) {
        return profiles.map(profile => {
            if (profile.scoreBreakdown) {
                const validated = this.validateScoreBreakdown(profile.scoreBreakdown);
                profile.scoreBreakdown = validated.data;
                
                // 監査ログに記録
                if (validated.issues.length > 0) {
                    this.recordAudit('profile_validation', {
                        profileId: profile.id,
                        issues: validated.issues,
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                // スコアブレークダウンがない場合はデフォルト値を設定
                profile.scoreBreakdown = this.getDefaultScoreBreakdown();
            }
            
            return profile;
        });
    }

    /**
     * 個別スコアの検証と正規化
     */
    validateAndNormalizeScore(scoreData) {
        if (!scoreData || typeof scoreData !== 'object') {
            return this.getDefaultScoreData();
        }

        // breakdownの検証
        if (scoreData.breakdown) {
            const validated = this.validateScoreBreakdown(scoreData.breakdown);
            scoreData.breakdown = validated.data;
            
            if (validated.issues.length > 0) {
                this.recordAudit('score_validation', {
                    issues: validated.issues,
                    original: scoreData.breakdown,
                    timestamp: new Date().toISOString()
                });
            }
        } else {
            scoreData.breakdown = this.getDefaultScoreBreakdown();
        }

        // 総合スコアの再計算
        scoreData.score = this.calculateOverallScore(scoreData.breakdown);

        return scoreData;
    }

    /**
     * スコアブレークダウンの検証
     */
    validateScoreBreakdown(breakdown) {
        const issues = [];
        const validated = {};
        
        // 新形式のチェック
        const hasNewFormat = Object.keys(breakdown).some(key => 
            ['businessSynergy', 'solutionMatch', 'businessTrends'].includes(key)
        );
        
        // 旧形式のチェック
        const hasOldFormat = Object.keys(breakdown).some(key => 
            ['commonTopics', 'communicationStyle', 'emotionalSync'].includes(key)
        );

        if (hasOldFormat && !hasNewFormat) {
            // 旧形式から新形式に変換
            const converted = this.convertOldToNew(breakdown);
            Object.assign(validated, converted);
            issues.push({
                type: 'format_conversion',
                message: '旧形式から新形式に変換しました'
            });
        } else if (hasNewFormat) {
            // 新形式の検証
            Object.entries(this.scoreSchema).forEach(([key, schema]) => {
                if (schema.required && key in this.conversionMap.newToOld) {
                    const value = breakdown[key];
                    
                    if (value === undefined || value === null) {
                        validated[key] = schema.default;
                        issues.push({
                            type: 'missing_value',
                            field: key,
                            action: 'default_applied'
                        });
                    } else if (typeof value !== 'number') {
                        validated[key] = schema.default;
                        issues.push({
                            type: 'invalid_type',
                            field: key,
                            expected: 'number',
                            actual: typeof value
                        });
                    } else if (value < schema.min || value > schema.max) {
                        validated[key] = Math.max(schema.min, Math.min(schema.max, value));
                        issues.push({
                            type: 'out_of_range',
                            field: key,
                            original: value,
                            corrected: validated[key]
                        });
                    } else {
                        validated[key] = Math.round(value);
                    }
                }
            });
        } else {
            // どちらの形式でもない場合はデフォルト値
            Object.assign(validated, this.getDefaultScoreBreakdown());
            issues.push({
                type: 'unknown_format',
                action: 'default_applied'
            });
        }

        return { data: validated, issues };
    }

    /**
     * 旧形式から新形式への変換
     */
    convertOldToNew(oldBreakdown) {
        const newBreakdown = {};
        
        // デフォルト値で初期化
        Object.keys(this.conversionMap.newToOld).forEach(key => {
            newBreakdown[key] = this.scoreSchema[key].default;
        });
        
        // 変換ロジック
        Object.entries(this.conversionMap.oldToNew).forEach(([oldKey, newKeys]) => {
            const oldValue = oldBreakdown[oldKey];
            if (typeof oldValue === 'number') {
                // 複数の新キーに分配
                newKeys.forEach(newKey => {
                    newBreakdown[newKey] = Math.round(
                        (newBreakdown[newKey] + oldValue) / 2
                    );
                });
            }
        });
        
        return newBreakdown;
    }

    /**
     * 総合スコアの計算
     */
    calculateOverallScore(breakdown) {
        const weights = {
            businessSynergy: 0.25,
            solutionMatch: 0.25,
            businessTrends: 0.15,
            growthPhaseMatch: 0.15,
            urgencyAlignment: 0.10,
            resourceComplement: 0.10
        };
        
        let totalScore = 0;
        let totalWeight = 0;
        
        Object.entries(weights).forEach(([key, weight]) => {
            if (typeof breakdown[key] === 'number') {
                totalScore += breakdown[key] * weight;
                totalWeight += weight;
            }
        });
        
        // 重みの正規化
        if (totalWeight > 0) {
            return Math.round(totalScore / totalWeight);
        }
        
        return 50; // デフォルト
    }

    /**
     * デフォルトのスコアブレークダウン
     */
    getDefaultScoreBreakdown() {
        const breakdown = {};
        Object.entries(this.scoreSchema).forEach(([key, schema]) => {
            if (schema.required) {
                breakdown[key] = schema.default;
            }
        });
        return breakdown;
    }

    /**
     * デフォルトのスコアデータ
     */
    getDefaultScoreData() {
        return {
            score: 50,
            breakdown: this.getDefaultScoreBreakdown(),
            suggestions: []
        };
    }

    /**
     * 自動検証の設定
     */
    setupAutoValidation() {
        // レーダーチャート描画前の検証
        if (window.matchingRadarChart) {
            const original = window.matchingRadarChart.drawData;
            window.matchingRadarChart.drawData = (ctx, data) => {
                const validated = this.validateScoreBreakdown(data);
                return original.call(window.matchingRadarChart, ctx, validated.data);
            };
        }

        // データ保存前の検証
        this.interceptStorageOperations();
    }

    /**
     * ストレージ操作の介入
     */
    interceptStorageOperations() {
        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
            if (key.startsWith('ai_score_')) {
                try {
                    const data = JSON.parse(value);
                    if (data.breakdown) {
                        const integrity = window.matchingDataIntegrity;
                        const validated = integrity.validateScoreBreakdown(data.breakdown);
                        data.breakdown = validated.data;
                        value = JSON.stringify(data);
                    }
                } catch (e) {
                    // JSON解析エラーは無視
                }
            }
            return originalSetItem.call(this, key, value);
        };
    }

    /**
     * 監査ログの記録
     */
    recordAudit(type, details) {
        const entry = {
            type,
            details,
            timestamp: new Date().toISOString()
        };
        
        this.auditLog.push(entry);
        
        // コンソールに警告を出力（開発環境のみ）
        if (localStorage.getItem('debugMode') === 'true') {
            console.warn('[DataIntegrity]', type, details);
        }
        
        // ログが大きくなりすぎないように制限
        if (this.auditLog.length > 100) {
            this.auditLog = this.auditLog.slice(-50);
        }
    }

    /**
     * データ整合性レポート
     */
    generateReport() {
        const report = {
            totalValidations: this.auditLog.length,
            issuesByType: {},
            recentIssues: this.auditLog.slice(-10),
            recommendations: []
        };

        // 問題の種類別集計
        this.auditLog.forEach(entry => {
            const type = entry.details.issues?.[0]?.type || entry.type;
            report.issuesByType[type] = (report.issuesByType[type] || 0) + 1;
        });

        // 推奨事項
        if (report.issuesByType.format_conversion > 10) {
            report.recommendations.push('多くの旧形式データが検出されました。データ移行を検討してください。');
        }
        
        if (report.issuesByType.missing_value > 20) {
            report.recommendations.push('欠損データが多く検出されました。データ収集プロセスを見直してください。');
        }

        return report;
    }

    /**
     * 手動でのデータ修復
     */
    async repairAllData() {
        console.log('[DataIntegrity] データ修復を開始します...');
        
        // ローカルストレージのスコアデータを修復
        const keys = Object.keys(localStorage).filter(key => key.startsWith('ai_score_'));
        let repaired = 0;
        
        keys.forEach(key => {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data.breakdown) {
                    const validated = this.validateScoreBreakdown(data.breakdown);
                    if (validated.issues.length > 0) {
                        data.breakdown = validated.data;
                        localStorage.setItem(key, JSON.stringify(data));
                        repaired++;
                    }
                }
            } catch (e) {
                // 破損データは削除
                localStorage.removeItem(key);
                repaired++;
            }
        });
        
        console.log(`[DataIntegrity] ${repaired}件のデータを修復しました`);
        return repaired;
    }
}

// グローバルに公開
window.matchingDataIntegrity = new MatchingDataIntegrity();

// 開発者向けコマンド
console.log('[DataIntegrity] データ整合性チェック有効');
console.log('[DataIntegrity] レポート生成: window.matchingDataIntegrity.generateReport()');
console.log('[DataIntegrity] データ修復: window.matchingDataIntegrity.repairAllData()');