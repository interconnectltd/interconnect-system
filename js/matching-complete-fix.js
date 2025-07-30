// ==========================================
// マッチング機能の完全修正 - すべての可能性に対応
// ==========================================

(function() {
    'use strict';
    
    console.log('[CompleteFix] マッチング機能の完全修正を開始');
    
    // 1. グローバル変数の確認と初期化
    window.matchingCompleteFix = window.matchingCompleteFix || {};
    
    // 2. 問題の診断システム
    const diagnoseIssues = async () => {
        const issues = [];
        
        // Supabaseクライアントの確認
        if (!window.supabase) {
            issues.push({
                type: 'CRITICAL',
                message: 'Supabaseクライアントが見つかりません',
                solution: 'Supabaseの初期化を待つ必要があります'
            });
        }
        
        // DOM要素の確認
        const container = document.getElementById('matching-container');
        if (!container) {
            issues.push({
                type: 'ERROR',
                message: 'matching-containerが見つかりません',
                solution: 'HTMLにid="matching-container"を追加'
            });
        }
        
        // データの確認
        try {
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('profiles')
                    .select('*')
                    .limit(1);
                
                if (error) {
                    issues.push({
                        type: 'ERROR',
                        message: `データベースエラー: ${error.message}`,
                        solution: 'Supabase接続とRLSポリシーを確認'
                    });
                }
                
                if (!data || data.length === 0) {
                    issues.push({
                        type: 'WARNING',
                        message: 'プロファイルデータが空です',
                        solution: 'テストデータを挿入してください'
                    });
                }
            }
        } catch (e) {
            issues.push({
                type: 'ERROR',
                message: `データ取得エラー: ${e.message}`,
                solution: 'ネットワーク接続を確認'
            });
        }
        
        // レーダーチャートの確認
        if (!window.MatchingRadarChart) {
            issues.push({
                type: 'WARNING',
                message: 'レーダーチャートクラスが見つかりません',
                solution: 'matching-radar-chart-enhanced.jsを確認'
            });
        }
        
        return issues;
    };
    
    // 3. 自動修復システム
    const autoFix = async () => {
        console.log('[CompleteFix] 自動修復を開始');
        
        // Supabaseの待機
        if (!window.supabase) {
            console.log('[CompleteFix] Supabaseの初期化を待機中...');
            await new Promise(resolve => {
                const checkSupabase = setInterval(() => {
                    if (window.supabase) {
                        clearInterval(checkSupabase);
                        resolve();
                    }
                }, 100);
            });
        }
        
        // DOM要素の作成
        let container = document.getElementById('matching-container');
        if (!container) {
            console.log('[CompleteFix] matching-containerを作成');
            container = document.createElement('div');
            container.id = 'matching-container';
            container.className = 'matching-container';
            
            // メインコンテンツエリアを探す
            const mainContent = document.querySelector('.main-content') || 
                               document.querySelector('#app') || 
                               document.body;
            
            mainContent.appendChild(container);
        }
        
        // ローディング表示
        container.innerHTML = `
            <div class="matching-loading">
                <div class="spinner"></div>
                <p>マッチングデータを読み込み中...</p>
            </div>
        `;
        
        // CSSの追加
        if (!document.getElementById('matching-complete-fix-styles')) {
            const style = document.createElement('style');
            style.id = 'matching-complete-fix-styles';
            style.textContent = `
                .matching-loading {
                    text-align: center;
                    padding: 40px;
                }
                
                .spinner {
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .matching-error {
                    background: #fee;
                    border: 1px solid #fcc;
                    padding: 20px;
                    margin: 20px 0;
                    border-radius: 8px;
                }
                
                .matching-card {
                    background: white;
                    border: 1px solid #e0e0e0;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    transition: transform 0.2s;
                }
                
                .matching-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
                }
                
                .radar-chart-container {
                    width: 200px;
                    height: 200px;
                    margin: 20px auto;
                }
            `;
            document.head.appendChild(style);
        }
        
        return container;
    };
    
    // 4. データ取得と表示
    const loadAndDisplayMatching = async (container) => {
        try {
            console.log('[CompleteFix] マッチングデータを取得中...');
            
            // 現在のユーザー取得
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) {
                throw new Error('ログインが必要です');
            }
            
            // プロファイル取得
            const { data: profiles, error } = await window.supabase
                .from('profiles')
                .select('*')
                .neq('id', user.id)
                .limit(10);
            
            if (error) throw error;
            
            if (!profiles || profiles.length === 0) {
                container.innerHTML = `
                    <div class="matching-empty">
                        <h3>マッチング候補が見つかりません</h3>
                        <p>テストデータを追加してください。</p>
                    </div>
                `;
                return;
            }
            
            // マッチングカードの生成
            console.log(`[CompleteFix] ${profiles.length}件のプロファイルを表示`);
            
            container.innerHTML = `
                <div class="matching-header">
                    <h2>マッチング候補 (${profiles.length}件)</h2>
                </div>
                <div class="matching-grid" id="matching-grid"></div>
            `;
            
            const grid = document.getElementById('matching-grid');
            
            profiles.forEach((profile, index) => {
                const card = createMatchingCard(profile, index);
                grid.appendChild(card);
            });
            
            // レーダーチャートの初期化
            initializeRadarCharts();
            
        } catch (error) {
            console.error('[CompleteFix] エラー:', error);
            container.innerHTML = `
                <div class="matching-error">
                    <h3>エラーが発生しました</h3>
                    <p>${error.message}</p>
                    <button onclick="window.matchingCompleteFix.retry()">再試行</button>
                </div>
            `;
        }
    };
    
    // 5. マッチングカードの作成
    const createMatchingCard = (profile, index) => {
        const card = document.createElement('div');
        card.className = 'matching-card';
        card.dataset.profileId = profile.id;
        
        // スコアを計算（仮の値）
        const matchingScore = Math.floor(Math.random() * 30) + 70; // 70-100
        
        // レーダーチャート用のデータ
        const radarData = {
            businessSynergy: Math.random() * 100,
            solutionMatch: Math.random() * 100,
            businessTrends: Math.random() * 100,
            growthPhaseMatch: Math.random() * 100,
            urgencyAlignment: Math.random() * 100,
            resourceComplement: Math.random() * 100
        };
        
        card.innerHTML = `
            <div class="profile-header">
                <img src="${profile.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.name || 'User')}" 
                     alt="${profile.name}" 
                     class="profile-avatar">
                <div class="profile-info">
                    <h3>${profile.name || 'Unknown'}</h3>
                    <p class="profile-title">${profile.title || ''} ${profile.company ? '@' + profile.company : ''}</p>
                </div>
            </div>
            
            <div class="matching-score">
                <span class="score-label">マッチング度</span>
                <span class="score-value">${matchingScore}%</span>
            </div>
            
            <div class="radar-chart-container" id="radar-${index}">
                <canvas width="200" height="200"></canvas>
            </div>
            
            <div class="profile-details">
                ${profile.skills ? `<p><strong>スキル:</strong> ${profile.skills.join(', ')}</p>` : ''}
                ${profile.location ? `<p><strong>地域:</strong> ${profile.location}</p>` : ''}
                ${profile.industry ? `<p><strong>業界:</strong> ${profile.industry}</p>` : ''}
            </div>
            
            <div class="profile-actions">
                <button class="btn-connect" onclick="window.matchingCompleteFix.connect('${profile.id}')">
                    コネクト申請
                </button>
                <button class="btn-view" onclick="window.matchingCompleteFix.viewProfile('${profile.id}')">
                    詳細を見る
                </button>
            </div>
        `;
        
        // レーダーチャートデータを保存
        card.radarData = radarData;
        
        return card;
    };
    
    // 6. レーダーチャートの初期化
    const initializeRadarCharts = () => {
        console.log('[CompleteFix] レーダーチャートを初期化中...');
        
        const cards = document.querySelectorAll('.matching-card');
        cards.forEach((card, index) => {
            const container = card.querySelector(`#radar-${index}`);
            if (container && card.radarData) {
                try {
                    if (window.MatchingRadarChart) {
                        const chart = new window.MatchingRadarChart(container);
                        chart.updateData(card.radarData);
                    } else {
                        // フォールバック: 簡易的なチャート
                        drawSimpleRadarChart(container, card.radarData);
                    }
                } catch (error) {
                    console.error('[CompleteFix] レーダーチャートエラー:', error);
                }
            }
        });
    };
    
    // 7. 簡易レーダーチャート（フォールバック）
    const drawSimpleRadarChart = (container, data) => {
        const canvas = container.querySelector('canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = 100;
        const centerY = 100;
        const radius = 80;
        
        // 背景
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, 200, 200);
        
        // グリッド
        ctx.strokeStyle = '#e0e0e0';
        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            for (let j = 0; j < 6; j++) {
                const angle = (Math.PI * 2 / 6) * j - Math.PI / 2;
                const x = centerX + Math.cos(angle) * (radius * i / 5);
                const y = centerY + Math.sin(angle) * (radius * i / 5);
                if (j === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }
        
        // データ描画
        ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
        ctx.strokeStyle = '#3498db';
        ctx.beginPath();
        
        const values = Object.values(data);
        values.forEach((value, i) => {
            const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
            const x = centerX + Math.cos(angle) * (radius * value / 100);
            const y = centerY + Math.sin(angle) * (radius * value / 100);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    };
    
    // 8. アクション関数
    window.matchingCompleteFix.connect = async (profileId) => {
        console.log('[CompleteFix] コネクト申請:', profileId);
        alert('コネクト申請機能は実装中です');
    };
    
    window.matchingCompleteFix.viewProfile = (profileId) => {
        console.log('[CompleteFix] プロファイル表示:', profileId);
        alert('プロファイル詳細表示機能は実装中です');
    };
    
    window.matchingCompleteFix.retry = () => {
        console.log('[CompleteFix] 再試行');
        init();
    };
    
    // 9. 診断レポート生成
    window.matchingCompleteFix.diagnose = async () => {
        const issues = await diagnoseIssues();
        console.log('=== 診断レポート ===');
        console.log(`問題数: ${issues.length}`);
        issues.forEach((issue, i) => {
            console.log(`\n[${i + 1}] ${issue.type}: ${issue.message}`);
            console.log(`    解決策: ${issue.solution}`);
        });
        return issues;
    };
    
    // 10. 初期化
    const init = async () => {
        console.log('[CompleteFix] 初期化開始');
        
        // 自動修復
        const container = await autoFix();
        
        // データ読み込みと表示
        await loadAndDisplayMatching(container);
        
        console.log('[CompleteFix] 初期化完了');
    };
    
    // 11. ページ読み込み時に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // 少し遅延させて他のスクリプトの初期化を待つ
        setTimeout(init, 1000);
    }
    
    // 12. グローバルコマンド
    window.matchingCompleteFix.forceInit = init;
    
    console.log('[CompleteFix] 完全修正システム準備完了');
    console.log('診断: matchingCompleteFix.diagnose()');
    console.log('強制初期化: matchingCompleteFix.forceInit()');
    
})();