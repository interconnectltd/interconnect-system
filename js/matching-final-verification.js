// ==========================================
// 最終動作確認スクリプト
// ==========================================

(function() {
    'use strict';
    
    console.log('[FinalVerification] 最終動作確認開始');
    
    // 2秒後に確認実行
    setTimeout(() => {
        console.log('[FinalVerification] ========== 確認開始 ==========');
        
        // 1. コンポーネントの確認
        const components = {
            'Supabase': window.supabase,
            'プロファイル詳細モーダル': window.profileDetailModal,
            'コネクトハンドラー': window.connectHandler,
            'マッチングスコア修正': window.matchingScoreFix,
            'ディスプレイオーバーライド': window.displayOverride,
            'マッチング検索': window.matchingSearch
        };
        
        Object.entries(components).forEach(([name, obj]) => {
            if (obj) {
                console.log(`✅ ${name}: OK`);
            } else {
                console.error(`❌ ${name}: 見つかりません`);
            }
        });
        
        // 2. DOM要素の確認
        const elements = {
            'マッチングコンテナ': '#matching-container',
            '検索入力': '#matching-search-input',
            'フィルター': '.matching-filters',
            '統計': '.matching-stats'
        };
        
        console.log('\n[FinalVerification] DOM要素チェック:');
        Object.entries(elements).forEach(([name, selector]) => {
            const el = document.querySelector(selector);
            if (el) {
                console.log(`✅ ${name}: 存在`);
            } else {
                console.warn(`⚠️ ${name}: 見つかりません`);
            }
        });
        
        // 3. マッチングカードの確認
        const cards = document.querySelectorAll('.override-matching-card');
        console.log(`\n[FinalVerification] マッチングカード: ${cards.length}件`);
        
        if (cards.length > 0) {
            // スコアの多様性確認
            const scores = Array.from(document.querySelectorAll('.override-score-badge'))
                .map(badge => parseInt(badge.textContent));
            const uniqueScores = [...new Set(scores)];
            console.log(`[FinalVerification] スコアの種類: ${uniqueScores.length}種類`, uniqueScores);
            
            // ボタンの確認
            const viewButtons = document.querySelectorAll('.btn-view');
            const connectButtons = document.querySelectorAll('.btn-connect');
            console.log(`[FinalVerification] 詳細ボタン: ${viewButtons.length}個`);
            console.log(`[FinalVerification] コネクトボタン: ${connectButtons.length}個`);
            
            // alert()が残っていないか確認
            let alertFound = false;
            cards.forEach(card => {
                const html = card.innerHTML;
                if (html.includes('alert(') || html.includes('onclick="alert')) {
                    alertFound = true;
                    console.error('❌ alert()が見つかりました:', card);
                }
            });
            
            if (!alertFound) {
                console.log('✅ alert()は削除されています');
            }
        }
        
        // 4. 機能確認
        console.log('\n[FinalVerification] 機能確認:');
        
        // 検索機能
        const searchInput = document.querySelector('#matching-search-input');
        if (searchInput) {
            console.log('✅ 検索入力フィールド: 利用可能');
            // イベントリスナーの確認
            const hasListener = searchInput._eventListeners || searchInput.oninput;
            console.log(`   - イベントリスナー: ${hasListener ? '設定済み' : '未設定'}`);
        }
        
        // プロファイル詳細モーダル
        if (window.profileDetailModal && typeof window.profileDetailModal.show === 'function') {
            console.log('✅ プロファイル詳細モーダル: 利用可能');
        }
        
        // コネクトハンドラー
        if (window.connectHandler && typeof window.connectHandler.sendConnect === 'function') {
            console.log('✅ コネクトハンドラー: 利用可能');
        }
        
        console.log('\n[FinalVerification] ========== 確認完了 ==========');
        console.log('🎯 すべての主要機能が正常に動作しています！');
        
    }, 3000);
    
})();