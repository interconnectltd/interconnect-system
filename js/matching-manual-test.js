/**
 * マッチング機能の手動テストスクリプト
 * コンソールから実行してマッチング機能をテスト
 */

(function() {
    'use strict';
    
    // テストデータを強制的に読み込んで表示
    window.manualMatchingTest = async function() {
        console.log('[ManualTest] マッチングテスト開始');
        
        // 1. Supabaseクライアントの確認
        if (!window.supabase) {
            console.error('[ManualTest] Supabaseクライアントが見つかりません');
            return;
        }
        console.log('[ManualTest] ✓ Supabaseクライアント確認OK');
        
        // 2. 認証状態の確認
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) {
            console.error('[ManualTest] ユーザーが認証されていません');
            return;
        }
        console.log('[ManualTest] ✓ ユーザー認証確認OK:', user.email);
        
        // 3. プロファイルデータを取得
        console.log('[ManualTest] プロファイルデータ取得中...');
        const { data: profiles, error } = await window.supabase
            .from('profiles')
            .select('*')
            .neq('id', user.id)
            .limit(10);
            
        if (error) {
            console.error('[ManualTest] プロファイル取得エラー:', error);
            return;
        }
        
        console.log(`[ManualTest] ✓ ${profiles.length}件のプロファイルを取得`);
        console.log('[ManualTest] プロファイルサンプル:', profiles[0]);
        
        // 4. マッチングカードを手動で作成
        const grid = document.querySelector('.matching-grid');
        if (!grid) {
            console.error('[ManualTest] matching-gridが見つかりません');
            return;
        }
        
        // 既存のカードをクリア
        grid.innerHTML = '';
        
        // 5. 各プロファイルに対してカードを作成
        profiles.forEach((profile, index) => {
            // マッチングスコアを計算
            const score = calculateScore(profile);
            
            // レーダーチャートデータを生成
            const radarData = {
                businessSynergy: Math.floor(Math.random() * 40 + 60),
                solutionMatch: Math.floor(Math.random() * 40 + 60),
                businessTrends: Math.floor(Math.random() * 40 + 60),
                growthPhaseMatch: Math.floor(Math.random() * 40 + 60),
                urgencyAlignment: Math.floor(Math.random() * 40 + 60),
                resourceComplement: Math.floor(Math.random() * 40 + 60)
            };
            
            // カードHTML作成
            const card = document.createElement('div');
            card.className = 'matching-card';
            card.innerHTML = `
                <div class="matching-score">${score}%</div>
                <img src="${profile.avatar_url || 'assets/user-placeholder.svg'}" alt="${profile.name}" class="matching-avatar">
                <h3>${profile.name || 'ユーザー' + (index + 1)}</h3>
                <p class="matching-title">${profile.title || '役職未設定'}</p>
                <p class="matching-company">${profile.company || '会社未設定'}</p>
                <div class="matching-tags">
                    ${generateTags(profile)}
                </div>
                <div class="radar-chart-container" style="width: 200px; height: 200px; margin: 10px auto;">
                    <canvas id="radar-${profile.id}" width="200" height="200"></canvas>
                </div>
                <div class="matching-actions">
                    <a href="profile.html?user=${profile.id}" class="btn btn-outline">プロフィール</a>
                    <button class="btn btn-primary" onclick="handleConnect('${profile.id}')">コネクト</button>
                </div>
            `;
            
            grid.appendChild(card);
            
            // レーダーチャートを描画
            setTimeout(() => {
                drawRadarChart(`radar-${profile.id}`, radarData);
            }, 100 * index);
        });
        
        // 6. 結果カウントを更新
        const resultsCount = document.querySelector('.results-count');
        if (resultsCount) {
            resultsCount.textContent = `${profiles.length}件のマッチング候補`;
        }
        
        console.log('[ManualTest] ✓ マッチングカード作成完了');
    };
    
    // スコア計算関数
    function calculateScore(profile) {
        let score = 50;
        if (profile.name) score += 10;
        if (profile.title) score += 10;
        if (profile.company) score += 10;
        if (profile.bio) score += 10;
        if (profile.skills && profile.skills.length > 0) score += 10;
        return Math.min(score, 95);
    }
    
    // タグ生成関数
    function generateTags(profile) {
        if (profile.skills && profile.skills.length > 0) {
            return profile.skills.slice(0, 3)
                .map(skill => `<span class="tag">${skill}</span>`)
                .join('');
        }
        return '<span class="tag">スキル未設定</span>';
    }
    
    // レーダーチャート描画関数
    function drawRadarChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = 100;
        const centerY = 100;
        const radius = 80;
        
        // 背景をクリア
        ctx.clearRect(0, 0, 200, 200);
        
        // パラメータ
        const parameters = [
            { label: '事業相性', key: 'businessSynergy' },
            { label: '課題解決', key: 'solutionMatch' },
            { label: 'トレンド', key: 'businessTrends' },
            { label: '成長適合', key: 'growthPhaseMatch' },
            { label: '緊急度', key: 'urgencyAlignment' },
            { label: 'リソース', key: 'resourceComplement' }
        ];
        
        // グリッドを描画
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        
        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            for (let j = 0; j < 6; j++) {
                const angle = (Math.PI * 2 / 6) * j - Math.PI / 2;
                const x = centerX + Math.cos(angle) * (radius * i / 5);
                const y = centerY + Math.sin(angle) * (radius * i / 5);
                if (j === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();
        }
        
        // 軸を描画
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + Math.cos(angle) * radius,
                centerY + Math.sin(angle) * radius
            );
            ctx.stroke();
        }
        
        // データポイントを描画
        ctx.fillStyle = 'rgba(0, 123, 255, 0.3)';
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        parameters.forEach((param, i) => {
            const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
            const value = data[param.key] / 100;
            const x = centerX + Math.cos(angle) * (radius * value);
            const y = centerY + Math.sin(angle) * (radius * value);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // ラベルを描画
        ctx.fillStyle = '#333';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        
        parameters.forEach((param, i) => {
            const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
            const labelX = centerX + Math.cos(angle) * (radius + 15);
            const labelY = centerY + Math.sin(angle) * (radius + 15);
            
            ctx.fillText(param.label, labelX, labelY + 3);
        });
    }
    
    // コネクトハンドラー
    window.handleConnect = function(profileId) {
        console.log('[ManualTest] コネクト申請:', profileId);
        alert('コネクト申請を送信しました');
    };
    
    // 実行コマンドをログ
    console.log('[ManualTest] 実行するには: manualMatchingTest()');
    
})();