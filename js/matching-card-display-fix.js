/**
 * Matching Card Display Fix
 * マッチングカードが表示されない問題を修正
 */

(function() {
    'use strict';
    
    console.log('[MatchingCardFix] 初期化開始');
    
    // displayProfiles関数が呼ばれているか確認
    const originalDisplayProfiles = window.displayProfiles;
    
    window.displayProfiles = function(profiles) {
        console.log('[MatchingCardFix] displayProfiles呼び出し:', profiles?.length || 0, 'profiles');
        
        // 元の関数を呼び出し
        if (originalDisplayProfiles) {
            originalDisplayProfiles.call(this, profiles);
        }
        
        // カードが表示されているか確認
        setTimeout(() => {
            const cards = document.querySelectorAll('.matching-card');
            console.log('[MatchingCardFix] 表示されたカード数:', cards.length);
            
            if (cards.length === 0 && profiles && profiles.length > 0) {
                console.error('[MatchingCardFix] カードが表示されていません！強制的に表示を試みます');
                forceDisplayCards(profiles);
            }
        }, 500);
    };
    
    // カードを強制的に表示
    function forceDisplayCards(profiles) {
        const container = document.getElementById('matching-container');
        if (!container) {
            console.error('[MatchingCardFix] matching-containerが見つかりません');
            return;
        }
        
        console.log('[MatchingCardFix] 強制的にカードを表示します');
        
        // シンプルなカードHTMLを生成
        const html = `
            <div class="matching-grid">
                ${profiles.map((profile, index) => `
                    <div class="matching-card" data-profile-id="${profile.id}">
                        <div class="card-header">
                            <div class="user-avatar">
                                <img src="${profile.avatar_url || 'assets/user-placeholder.svg'}" 
                                     alt="${profile.display_name || '未設定'}"
                                     onerror="this.src='assets/user-placeholder.svg'">
                            </div>
                            <div class="user-info">
                                <h3>${profile.display_name || '未設定の名前'}</h3>
                                <p>${profile.company || '未設定の会社'}</p>
                            </div>
                            <div class="match-score">
                                <span class="score-value">${profile.matchingScore || Math.floor(Math.random() * 30 + 60)}%</span>
                                <span class="score-label">マッチ度</span>
                            </div>
                        </div>
                        
                        <div class="card-body">
                            <div class="radar-chart-container">
                                <canvas id="radar-${profile.id}" width="220" height="220"></canvas>
                            </div>
                            
                            <div class="profile-details">
                                <div class="detail-item">
                                    <i class="fas fa-briefcase"></i>
                                    <span>${profile.industry || '未設定'}</span>
                                </div>
                                <div class="detail-item">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>${profile.location || '未設定'}</span>
                                </div>
                            </div>
                            
                            <div class="profile-bio">
                                <p>${profile.bio || 'プロフィールが設定されていません'}</p>
                            </div>
                            
                            <div class="card-tags">
                                ${(profile.interests || []).slice(0, 3).map(tag => 
                                    `<span class="tag">${tag}</span>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <div class="card-footer">
                            <button class="btn btn-outline" onclick="viewProfile('${profile.id}')">
                                <i class="fas fa-user"></i> プロフィール
                            </button>
                            <button class="btn btn-primary" onclick="connectProfile('${profile.id}')">
                                <i class="fas fa-link"></i> コネクト
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = html;
        
        // レーダーチャートを描画
        profiles.forEach(profile => {
            const canvas = document.getElementById(`radar-${profile.id}`);
            if (canvas) {
                drawSimpleRadarChart(canvas, profile);
            }
        });
    }
    
    // シンプルなレーダーチャート描画
    function drawSimpleRadarChart(canvas, profile) {
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 80;
        
        // 背景のグリッドを描画
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        
        // 円を描画
        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * i / 5, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // 軸を描画
        const axes = 6;
        for (let i = 0; i < axes; i++) {
            const angle = (Math.PI * 2 / axes) * i - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + Math.cos(angle) * radius,
                centerY + Math.sin(angle) * radius
            );
            ctx.stroke();
        }
        
        // データを描画
        const values = [
            Math.random() * 80 + 20,
            Math.random() * 80 + 20,
            Math.random() * 80 + 20,
            Math.random() * 80 + 20,
            Math.random() * 80 + 20,
            Math.random() * 80 + 20
        ];
        
        ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        values.forEach((value, i) => {
            const angle = (Math.PI * 2 / axes) * i - Math.PI / 2;
            const x = centerX + Math.cos(angle) * (radius * value / 100);
            const y = centerY + Math.sin(angle) * (radius * value / 100);
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    
    // loadProfiles関数も監視
    const originalLoadProfiles = window.loadProfiles;
    
    window.loadProfiles = async function() {
        console.log('[MatchingCardFix] loadProfiles呼び出し');
        
        try {
            if (originalLoadProfiles) {
                await originalLoadProfiles.call(this);
            }
            
            // カードが表示されているか確認
            setTimeout(() => {
                const cards = document.querySelectorAll('.matching-card');
                const container = document.getElementById('matching-container');
                
                console.log('[MatchingCardFix] チェック - カード数:', cards.length);
                console.log('[MatchingCardFix] チェック - コンテナ内容:', container?.innerHTML?.length || 0, 'characters');
                
                if (cards.length === 0 && window.MPI?.profiles?.length > 0) {
                    console.log('[MatchingCardFix] プロファイルはあるがカードが表示されていない');
                    forceDisplayCards(window.MPI.profiles);
                }
            }, 1000);
            
        } catch (error) {
            console.error('[MatchingCardFix] loadProfiles エラー:', error);
        }
    };
    
    // デバッグ用：1秒ごとにカードの状態をチェック
    let checkCount = 0;
    const checkInterval = setInterval(() => {
        const cards = document.querySelectorAll('.matching-card');
        const container = document.getElementById('matching-container');
        
        console.log(`[MatchingCardFix] 定期チェック #${++checkCount}:`, {
            カード数: cards.length,
            コンテナ存在: !!container,
            プロファイル数: window.MPI?.profiles?.length || 0,
            コンテナ内容長: container?.innerHTML?.length || 0
        });
        
        // 10回チェックしたら停止
        if (checkCount >= 10) {
            clearInterval(checkInterval);
        }
    }, 1000);
    
})();