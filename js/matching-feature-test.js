// ==========================================
// マッチング機能の完全性テスト
// ==========================================

(function() {
    'use strict';
    
    console.log('[FeatureTest] マッチング機能テスト開始');
    
    const testResults = {
        passed: [],
        failed: [],
        warnings: []
    };
    
    // テスト実行
    const runTests = async () => {
        console.log('[FeatureTest] ========== テスト開始 ==========');
        
        // 1. 必要なコンポーネントの存在確認
        testComponentsExist();
        
        // 2. データ取得テスト
        await testDataFetching();
        
        // 3. UI要素の確認
        testUIElements();
        
        // 4. 機能テスト
        await testFunctionality();
        
        // 5. エラーハンドリング
        testErrorHandling();
        
        // 結果表示
        showTestResults();
    };
    
    // コンポーネント存在確認
    const testComponentsExist = () => {
        const components = [
            { name: 'Supabase', obj: window.supabase },
            { name: 'プロファイル詳細モーダル', obj: window.profileDetailModal },
            { name: 'コネクトハンドラー', obj: window.connectHandler },
            { name: 'マッチングスコア修正', obj: window.matchingScoreFix },
            { name: 'ディスプレイオーバーライド', obj: window.displayOverride },
            { name: 'マッチング検索', obj: window.matchingSearch }
        ];
        
        components.forEach(comp => {
            if (comp.obj) {
                testResults.passed.push(`✅ ${comp.name} が存在`);
            } else {
                testResults.failed.push(`❌ ${comp.name} が見つかりません`);
            }
        });
    };
    
    // データ取得テスト
    const testDataFetching = async () => {
        try {
            // ユーザー認証確認
            const { data: { user } } = await window.supabase.auth.getUser();
            if (user) {
                testResults.passed.push('✅ ユーザー認証OK');
                
                // プロファイル取得
                const { data: profiles, error } = await window.supabase
                    .from('profiles')
                    .select('*')
                    .limit(5);
                
                if (!error && profiles) {
                    testResults.passed.push(`✅ プロファイル取得OK (${profiles.length}件)`);
                } else {
                    testResults.failed.push('❌ プロファイル取得エラー');
                }
            } else {
                testResults.warnings.push('⚠️ ユーザー未認証');
            }
        } catch (error) {
            testResults.failed.push(`❌ データ取得エラー: ${error.message}`);
        }
    };
    
    // UI要素確認
    const testUIElements = () => {
        const elements = [
            { selector: '#matching-container', name: 'マッチングコンテナ' },
            { selector: '.matching-filters', name: 'フィルターセクション' },
            { selector: '#matching-search-input', name: '検索入力フィールド' },
            { selector: '.matching-stats', name: '統計表示' },
            { selector: '.override-matching-card', name: 'マッチングカード' }
        ];
        
        elements.forEach(elem => {
            const el = document.querySelector(elem.selector);
            if (el) {
                testResults.passed.push(`✅ ${elem.name} が存在`);
            } else {
                testResults.warnings.push(`⚠️ ${elem.name} が見つかりません`);
            }
        });
    };
    
    // 機能テスト
    const testFunctionality = async () => {
        // マッチングカードの確認
        const cards = document.querySelectorAll('.override-matching-card');
        if (cards.length > 0) {
            testResults.passed.push(`✅ マッチングカード表示 (${cards.length}件)`);
            
            // プロファイルIDの確認
            const hasProfileIds = Array.from(cards).every(card => card.dataset.profileId);
            if (hasProfileIds) {
                testResults.passed.push('✅ すべてのカードにプロファイルID設定');
            } else {
                testResults.failed.push('❌ プロファイルIDが設定されていないカードがあります');
            }
            
            // ボタンの確認
            const detailButtons = document.querySelectorAll('.btn-view');
            const connectButtons = document.querySelectorAll('.btn-connect');
            
            if (detailButtons.length === cards.length) {
                testResults.passed.push('✅ 詳細ボタンが全カードに存在');
            } else {
                testResults.failed.push('❌ 詳細ボタンが不足');
            }
            
            if (connectButtons.length === cards.length) {
                testResults.passed.push('✅ コネクトボタンが全カードに存在');
            } else {
                testResults.failed.push('❌ コネクトボタンが不足');
            }
        } else {
            testResults.warnings.push('⚠️ マッチングカードが表示されていません');
        }
        
        // スコアの多様性チェック
        const scores = Array.from(document.querySelectorAll('.override-score-badge')).map(badge => 
            parseInt(badge.textContent)
        );
        
        if (scores.length > 0) {
            const uniqueScores = [...new Set(scores)];
            if (uniqueScores.length > 2) {
                testResults.passed.push(`✅ スコアの多様性OK (${uniqueScores.length}種類)`);
            } else {
                testResults.warnings.push(`⚠️ スコアの多様性が低い (${uniqueScores.length}種類のみ)`);
            }
        }
    };
    
    // エラーハンドリングテスト
    const testErrorHandling = () => {
        // コンソールエラーチェック
        const errors = [];
        const originalError = console.error;
        console.error = (...args) => {
            errors.push(args.join(' '));
            originalError.apply(console, args);
        };
        
        // テスト実行
        setTimeout(() => {
            console.error = originalError;
            
            if (errors.length === 0) {
                testResults.passed.push('✅ コンソールエラーなし');
            } else {
                testResults.warnings.push(`⚠️ コンソールエラー検出 (${errors.length}件)`);
            }
        }, 1000);
    };
    
    // テスト結果表示
    const showTestResults = () => {
        console.log('[FeatureTest] ========== テスト結果 ==========');
        
        console.log(`✅ 成功: ${testResults.passed.length}件`);
        testResults.passed.forEach(result => console.log(result));
        
        if (testResults.warnings.length > 0) {
            console.log(`\n⚠️ 警告: ${testResults.warnings.length}件`);
            testResults.warnings.forEach(result => console.warn(result));
        }
        
        if (testResults.failed.length > 0) {
            console.log(`\n❌ 失敗: ${testResults.failed.length}件`);
            testResults.failed.forEach(result => console.error(result));
        }
        
        const totalTests = testResults.passed.length + testResults.warnings.length + testResults.failed.length;
        const successRate = Math.round((testResults.passed.length / totalTests) * 100);
        
        console.log(`\n📊 成功率: ${successRate}%`);
        
        if (testResults.failed.length === 0) {
            console.log('🎉 すべての重要なテストに合格しました！');
        } else {
            console.log('⚠️ 修正が必要な項目があります');
        }
    };
    
    // テスト実行
    setTimeout(runTests, 2000);
    
    // グローバル公開
    window.matchingFeatureTest = {
        run: runTests,
        results: testResults
    };
    
})();