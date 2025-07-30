/**
 * AI スコアリングの実際の統合
 * matching-supabase.jsと連携して動作させる
 */

(function() {
    'use strict';

    // DOMContentLoaded後に実行
    document.addEventListener('DOMContentLoaded', function() {
        
        if (window.matchingSupabase && window.aiMatchingScorer) {
            
            // calculateMatchingScoresメソッドを拡張
            const originalCalculateScores = window.matchingSupabase.calculateMatchingScores.bind(window.matchingSupabase);
            
            window.matchingSupabase.calculateMatchingScores = async function(profiles) {
                // まず基本スコアを計算
                const scoredProfiles = originalCalculateScores(profiles);
                
                try {
                    // 現在のユーザーを取得
                    const { data: { user } } = await window.supabase.auth.getUser();
                    if (!user) return scoredProfiles;
                    
                    // 各プロフィールに対してAIスコアを計算
                    const aiScoredProfiles = await Promise.all(
                        scoredProfiles.map(async (profile) => {
                            try {
                                // キャッシュをチェック
                                const cacheKey = `ai_score_${user.id}_${profile.id}`;
                                const cached = localStorage.getItem(cacheKey);
                                
                                if (cached) {
                                    const cachedData = JSON.parse(cached);
                                    // 7日間有効
                                    if (Date.now() - cachedData.timestamp < 7 * 24 * 60 * 60 * 1000) {
                                        profile.matchingScore = cachedData.score;
                                        profile.scoreBreakdown = cachedData.breakdown;
                                        return profile;
                                    }
                                }
                                
                                // シンプルAIスコアを計算（感情分析なし）
                                const aiResult = window.simpleAIMatchingScorer ? 
                                    await window.simpleAIMatchingScorer.calculateSimpleScore(user.id, profile.id) :
                                    await window.aiMatchingScorer.calculateAdvancedScore(user.id, profile.id);
                                
                                // 基本スコアとAIスコアを組み合わせる
                                if (aiResult.score > 0) {
                                    // AIスコアが有効な場合は70%の重みで採用
                                    profile.matchingScore = Math.round(
                                        profile.matchingScore * 0.3 + aiResult.score * 0.7
                                    );
                                    profile.scoreBreakdown = aiResult.breakdown;
                                    
                                    // キャッシュに保存
                                    localStorage.setItem(cacheKey, JSON.stringify({
                                        score: profile.matchingScore,
                                        breakdown: aiResult.breakdown,
                                        timestamp: Date.now()
                                    }));
                                }
                                
                            } catch (error) {
                                console.warn('[AIIntegration] Score calculation failed for profile:', profile.id, error);
                                // エラーの場合は基本スコアを維持
                            }
                            
                            return profile;
                        })
                    );
                    
                    console.log('[AIIntegration] AI scoring completed for', aiScoredProfiles.length, 'profiles');
                    return aiScoredProfiles;
                    
                } catch (error) {
                    console.error('[AIIntegration] Failed to apply AI scoring:', error);
                    // エラーの場合は基本スコアを返す
                    return scoredProfiles;
                }
            };
            
            // マッチングカードにスコア詳細を表示する機能を追加
            const originalCreateCard = window.matchingSupabase.createMatchingCard.bind(window.matchingSupabase);
            
            window.matchingSupabase.createMatchingCard = function(profile, isConnected, index) {
                let cardHTML = originalCreateCard(profile, isConnected, index);
                
                // スコア詳細がある場合はツールチップを追加
                if (profile.scoreBreakdown) {
                    const breakdown = profile.scoreBreakdown;
                    const tooltip = `
                        <div class="score-tooltip">
                            <div class="tooltip-content">
                                <h4>マッチング詳細</h4>
                                <div class="score-item">
                                    <span>共通の話題</span>
                                    <span>${Math.round(breakdown.commonTopics || 0)}%</span>
                                </div>
                                <div class="score-item">
                                    <span>コミュニケーション相性</span>
                                    <span>${Math.round(breakdown.communicationStyle || 0)}%</span>
                                </div>
                                <div class="score-item">
                                    <span>感情の同期性</span>
                                    <span>${Math.round(breakdown.emotionalSync || 0)}%</span>
                                </div>
                                <div class="score-item">
                                    <span>活動時間の重なり</span>
                                    <span>${Math.round(breakdown.activityOverlap || 0)}%</span>
                                </div>
                                <div class="score-item">
                                    <span>プロフィール一致度</span>
                                    <span>${Math.round(breakdown.profileMatch || 0)}%</span>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    // マッチングスコアの部分にツールチップを追加
                    cardHTML = cardHTML.replace(
                        '<div class="matching-score">',
                        '<div class="matching-score has-tooltip" title="クリックで詳細表示">' + tooltip
                    );
                }
                
                return cardHTML;
            };
            
            // ツールチップのスタイルを追加
            const style = document.createElement('style');
            style.textContent = `
                .matching-score.has-tooltip {
                    cursor: help;
                    position: relative;
                }
                
                .score-tooltip {
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 16px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 1000;
                    min-width: 250px;
                    margin-top: 8px;
                }
                
                .matching-score.has-tooltip:hover .score-tooltip {
                    display: block;
                }
                
                .tooltip-content h4 {
                    margin: 0 0 12px 0;
                    font-size: 14px;
                    color: #333;
                }
                
                .score-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 4px 0;
                    font-size: 13px;
                    color: #666;
                }
                
                .score-item span:last-child {
                    font-weight: 600;
                    color: #3b82f6;
                }
            `;
            document.head.appendChild(style);
            
            console.log('[AIIntegration] AI scoring integration activated');
            
            // 初回読み込み時に再計算をトリガー
            setTimeout(() => {
                if (window.matchingSupabase.allProfiles && window.matchingSupabase.allProfiles.length > 0) {
                    console.log('[AIIntegration] Recalculating scores with AI...');
                    window.matchingSupabase.loadProfiles();
                }
            }, 2000);
        }
    });
    
})();