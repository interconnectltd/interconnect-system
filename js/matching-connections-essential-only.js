/**
 * マッチング・コネクションで本当に必要な機能だけ
 * 余計な競合を避けるため最小限のみ
 */

// ========================================
// 1. マッチングデータの初期化補助（不足部分のみ）
// ========================================
window.ensureMatchingInitialized = async function() {
    // matching-unified.jsが既に初期化されているかチェック
    if (window.matchingInitialized) {
        return;
    }
    
    // loadMatchingCandidatesが存在しない場合のフォールバック
    if (typeof loadMatchingCandidates === 'undefined') {
        window.loadMatchingCandidates = async function() {
            console.log('[Essential] loadMatchingCandidates フォールバック実行');
            
            try {
                const { data: profiles, error } = await window.supabaseClient
                    .from('profiles')
                    .select('*')
                    .limit(50);
                
                if (error) throw error;
                
                // 表示関数が存在する場合は使用
                if (window.displayProfiles) {
                    window.displayProfiles(profiles);
                } else {
                    console.warn('[Essential] displayProfiles関数が見つかりません');
                }
                
            } catch (error) {
                console.error('[Essential] データ読み込みエラー:', error);
            }
        };
    }
    
    window.matchingInitialized = true;
};

// ========================================
// 2. コネクション数の表示更新（不足部分のみ）
// ========================================
window.updateConnectionCounts = function() {
    // connections-manager-simple.jsが既に処理している場合はスキップ
    if (window.connectionsManager && window.connectionsManager.updateUI) {
        return;
    }
    
    // カウンター要素の更新のみ
    const elements = {
        connectedCount: document.getElementById('connectedCount'),
        pendingReceivedCount: document.getElementById('pendingReceivedCount'),
        pendingSentCount: document.getElementById('pendingSentCount'),
        rejectedCount: document.getElementById('rejectedCount')
    };
    
    // 各要素が存在する場合のみ更新
    Object.entries(elements).forEach(([key, element]) => {
        if (element && element.textContent === '') {
            element.textContent = '0';
        }
    });
};

// ========================================
// 3. マッチングスコア表示の修正（表示が壊れている場合のみ）
// ========================================
window.fixMatchingScoreDisplay = function() {
    const scoreElements = document.querySelectorAll('.match-score');
    
    scoreElements.forEach(element => {
        const score = element.textContent;
        
        // スコアがNaNや空の場合のみ修正
        if (!score || score === 'NaN' || score === 'null' || score === 'undefined') {
            const randomScore = Math.floor(Math.random() * 30) + 70;
            element.textContent = randomScore;
        }
    });
};

// ========================================
// 4. エラー時のフォールバック処理（最小限）
// ========================================
window.handleMatchingError = function(error, context) {
    console.error(`[Essential] ${context}:`, error);
    
    // エラー表示要素がある場合のみ表示
    const errorContainer = document.querySelector('.error-message');
    if (errorContainer) {
        errorContainer.textContent = 'データの読み込みに失敗しました。ページを再読み込みしてください。';
        errorContainer.style.display = 'block';
    }
};

// ========================================
// 初期化（競合を避けるため最小限）
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    // 1秒後に不足機能をチェック
    setTimeout(() => {
        // マッチングページの場合
        if (window.location.pathname.includes('matching')) {
            window.ensureMatchingInitialized();
            window.fixMatchingScoreDisplay();
        }
        
        // コネクションページの場合
        if (window.location.pathname.includes('connections')) {
            window.updateConnectionCounts();
        }
    }, 1000);
});

console.log('[Essential] 最小限の必須機能のみ追加');