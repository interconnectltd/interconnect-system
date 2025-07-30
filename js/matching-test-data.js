/**
 * マッチング機能のテストデータ生成
 * 開発環境でのみ使用
 */

(function() {
    'use strict';

    // テストモードのチェック
    const isTestMode = localStorage.getItem('testMode') === 'true';
    
    if (!isTestMode) {
        console.log('[TestData] テストモードが無効です。有効化: localStorage.setItem("testMode", "true")');
        return;
    }

    class MatchingTestData {
        constructor() {
            this.testProfiles = this.generateTestProfiles();
        }

        /**
         * テストプロフィールを生成
         */
        generateTestProfiles() {
            const companies = [
                '株式会社テクノロジー', 'AIソリューションズ', 'デジタルイノベーション',
                'クラウドシステムズ', 'スタートアップX', 'グローバルテック'
            ];
            
            const titles = [
                'CEO', 'CTO', 'マーケティング部長', '事業開発マネージャー',
                'プロダクトマネージャー', 'エンジニアリングリード'
            ];
            
            const industries = ['tech', 'finance', 'healthcare', 'retail'];
            const locations = ['tokyo', 'osaka', 'nagoya', 'fukuoka'];
            
            const profiles = [];
            
            for (let i = 0; i < 12; i++) {
                profiles.push({
                    id: `test-user-${i}`,
                    name: `テストユーザー ${i + 1}`,
                    title: titles[i % titles.length],
                    company: companies[i % companies.length],
                    avatar_url: null,
                    industry: industries[i % industries.length],
                    location: locations[i % locations.length],
                    skills: this.generateRandomSkills(),
                    bio: `テストプロフィール ${i + 1} の説明文です。`,
                    matchingScore: 50 + Math.floor(Math.random() * 50),
                    scoreBreakdown: this.generateScoreBreakdown()
                });
            }
            
            return profiles;
        }

        /**
         * ランダムなスキルを生成
         */
        generateRandomSkills() {
            const allSkills = [
                'AI', 'ML', 'DX', 'IoT', 'ブロックチェーン', 'クラウド',
                'マーケティング', 'セールス', 'UI/UX', 'データ分析'
            ];
            
            const count = 3 + Math.floor(Math.random() * 3);
            const skills = [];
            
            for (let i = 0; i < count; i++) {
                const skill = allSkills[Math.floor(Math.random() * allSkills.length)];
                if (!skills.includes(skill)) {
                    skills.push(skill);
                }
            }
            
            return skills;
        }

        /**
         * スコアの内訳を生成
         */
        generateScoreBreakdown() {
            return {
                businessSynergy: 40 + Math.floor(Math.random() * 60),
                solutionMatch: 40 + Math.floor(Math.random() * 60),
                businessTrends: 40 + Math.floor(Math.random() * 60),
                growthPhaseMatch: 40 + Math.floor(Math.random() * 60),
                urgencyAlignment: 40 + Math.floor(Math.random() * 60),
                resourceComplement: 40 + Math.floor(Math.random() * 60)
            };
        }

        /**
         * テスト議事録データを生成
         */
        generateTestMinutes(userId) {
            const templates = [
                {
                    content: `議事録: 新規事業開発会議
                    日時: ${new Date().toLocaleDateString()}
                    
                    【議題】
                    1. AI活用による業務効率化システムの開発
                    2. クラウドプラットフォームの選定
                    
                    【課題】
                    - エンジニア人材の不足
                    - マーケティング戦略の立案が必要
                    - 資金調達の準備
                    
                    【決定事項】
                    - MVPを3ヶ月以内に開発
                    - シードラウンドの資金調達を開始
                    
                    【次回予定】
                    来週月曜日 14:00`
                },
                {
                    content: `議事録: 事業戦略会議
                    
                    【現状】
                    - SaaSプロダクトの成長フェーズ
                    - 月次成長率 20%
                    
                    【トレンド】
                    - ChatGPT, GPT-4の活用検討
                    - SDGsへの取り組み強化
                    
                    【緊急対応】
                    - カスタマーサポート体制の強化が急務
                    - 今月中にCS担当を採用
                    
                    【リソース】
                    - データ分析チームを拡充
                    - UI/UXデザイナーが必要`
                }
            ];
            
            return templates[Math.floor(Math.random() * templates.length)];
        }

        /**
         * マッチングページにテストデータを注入
         */
        async injectTestData() {
            console.log('[TestData] テストデータを注入中...');
            
            // 元のloadProfilesメソッドを保存
            if (window.matchingSupabase && !window.matchingSupabase._originalLoadProfiles) {
                window.matchingSupabase._originalLoadProfiles = window.matchingSupabase.loadProfiles;
                
                // loadProfilesをオーバーライド
                window.matchingSupabase.loadProfiles = async function() {
                    console.log('[TestData] テストプロフィールを読み込み中...');
                    
                    // テストデータを使用
                    const testData = window.matchingTestData.testProfiles;
                    
                    // スコア計算
                    const scoredProfiles = await window.matchingSupabase.calculateMatchingScores(testData);
                    
                    // プロフィールを保存
                    window.matchingSupabase.allProfiles = scoredProfiles;
                    window.matchingSupabase.filteredProfiles = scoredProfiles;
                    
                    // 表示
                    window.matchingSupabase.displayProfiles();
                    
                    console.log('[TestData] テストプロフィール読み込み完了:', scoredProfiles.length);
                };
            }
            
            // 議事録データのモック
            if (window.minutesBasedMatchingScorer && !window.minutesBasedMatchingScorer._originalGetUserMinutesData) {
                window.minutesBasedMatchingScorer._originalGetUserMinutesData = window.minutesBasedMatchingScorer.getUserMinutesData;
                
                window.minutesBasedMatchingScorer.getUserMinutesData = async function(userId) {
                    const minutesData = window.matchingTestData.generateTestMinutes(userId);
                    return {
                        messages: [{
                            content: minutesData.content,
                            created_at: new Date().toISOString()
                        }],
                        profile: {
                            id: userId,
                            name: `テストユーザー ${userId.split('-').pop()}`
                        }
                    };
                };
            }
        }

        /**
         * テストモードを無効化
         */
        disable() {
            // 元のメソッドを復元
            if (window.matchingSupabase?._originalLoadProfiles) {
                window.matchingSupabase.loadProfiles = window.matchingSupabase._originalLoadProfiles;
                delete window.matchingSupabase._originalLoadProfiles;
            }
            
            if (window.minutesBasedMatchingScorer?._originalGetUserMinutesData) {
                window.minutesBasedMatchingScorer.getUserMinutesData = window.minutesBasedMatchingScorer._originalGetUserMinutesData;
                delete window.minutesBasedMatchingScorer._originalGetUserMinutesData;
            }
            
            localStorage.removeItem('testMode');
            console.log('[TestData] テストモードを無効化しました');
        }
    }

    // グローバルに公開
    window.matchingTestData = new MatchingTestData();
    
    // 自動的にテストデータを注入
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => window.matchingTestData.injectTestData(), 1000);
        });
    } else {
        setTimeout(() => window.matchingTestData.injectTestData(), 1000);
    }

    console.log('[TestData] テストモード有効');
    console.log('[TestData] 無効化: window.matchingTestData.disable()');

})();