// ==========================================
// マッチング機能の検索実装
// ==========================================

(function() {
    'use strict';
    
    console.log('[MatchingSearch] 検索機能初期化開始');
    
    // 検索フィールドを追加
    const addSearchField = () => {
        const filtersSection = document.querySelector('.matching-filters');
        if (!filtersSection) {
            console.error('[MatchingSearch] フィルターセクションが見つかりません');
            return;
        }
        
        // 既存の検索フィールドがあるかチェック
        if (filtersSection.querySelector('.search-field-group')) {
            return;
        }
        
        // 検索フィールドを最初に追加
        const searchFieldHTML = `
            <div class="filter-group search-field-group" style="grid-column: span 2;">
                <label>キーワード検索</label>
                <div style="position: relative;">
                    <input type="text" 
                           id="matching-search-input"
                           class="form-control" 
                           placeholder="名前、会社名、スキル、地域などで検索..."
                           style="
                               width: 100%;
                               padding: 10px 40px 10px 15px;
                               border: 1px solid #ddd;
                               border-radius: 8px;
                               font-size: 14px;
                           ">
                    <i class="fas fa-search" style="
                        position: absolute;
                        right: 15px;
                        top: 50%;
                        transform: translateY(-50%);
                        color: #999;
                        pointer-events: none;
                    "></i>
                </div>
            </div>
        `;
        
        // 最初の要素として追加
        filtersSection.insertAdjacentHTML('afterbegin', searchFieldHTML);
        
        // 検索イベントを設定
        const searchInput = document.getElementById('matching-search-input');
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch(e.target.value);
            }, 300); // 300ms のデバウンス
        });
        
        // Enterキーでも検索
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(searchTimeout);
                performSearch(e.target.value);
            }
        });
    };
    
    // 検索の実行
    const performSearch = async (searchTerm) => {
        console.log('[MatchingSearch] 検索実行:', searchTerm);
        
        try {
            // 現在のユーザーを取得
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) {
                console.error('[MatchingSearch] ログインが必要です');
                return;
            }
            
            let query = window.supabase
                .from('profiles')
                .select('*')
                .neq('id', user.id);
            
            // 検索条件を適用
            if (searchTerm && searchTerm.trim() !== '') {
                const searchLower = searchTerm.toLowerCase().trim();
                
                // OR条件で複数のフィールドを検索
                query = query.or(`name.ilike.%${searchLower}%,company.ilike.%${searchLower}%,title.ilike.%${searchLower}%,location.ilike.%${searchLower}%,industry.ilike.%${searchLower}%,bio.ilike.%${searchLower}%`);
            }
            
            // フィルター条件も適用
            const industryFilter = document.querySelector('select[name="industry"]')?.value;
            const locationFilter = document.querySelector('select[name="location"]')?.value;
            const interestFilter = document.querySelector('select[name="interest"]')?.value;
            
            if (industryFilter) {
                query = query.eq('industry', industryFilter);
            }
            if (locationFilter) {
                query = query.eq('location', locationFilter);
            }
            if (interestFilter) {
                // interests配列に含まれるかチェック
                query = query.contains('interests', [interestFilter]);
            }
            
            // データ取得
            const { data: profiles, error } = await query.order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // 結果を表示
            updateMatchingDisplay(profiles, searchTerm);
            
        } catch (error) {
            console.error('[MatchingSearch] 検索エラー:', error);
            showSearchError(error.message);
        }
    };
    
    // 検索結果の表示更新
    const updateMatchingDisplay = (profiles, searchTerm) => {
        const container = document.getElementById('matching-container');
        if (!container) return;
        
        // 検索結果の統計を更新
        const statsElement = document.querySelector('.matching-stats .results-count');
        if (statsElement) {
            if (searchTerm) {
                statsElement.textContent = `"${searchTerm}" の検索結果: ${profiles.length}件`;
            } else {
                statsElement.textContent = `${profiles.length}件のマッチング候補`;
            }
        }
        
        // displayOverrideの関数を使って再描画
        if (window.displayOverride && window.displayOverride.generateOptimizedDisplay) {
            window.displayOverride.generateOptimizedDisplay(container, profiles);
        } else {
            // フォールバック: 基本的な表示
            if (profiles.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px;">
                        <i class="fas fa-search" style="font-size: 48px; color: #ddd; margin-bottom: 20px;"></i>
                        <h3>検索結果が見つかりませんでした</h3>
                        <p style="color: #999;">別のキーワードで検索してみてください。</p>
                    </div>
                `;
            } else {
                // displayOverrideを呼び出す
                window.displayOverride.refresh();
            }
        }
    };
    
    // エラー表示
    const showSearchError = (message) => {
        const container = document.getElementById('matching-container');
        if (!container) return;
        
        container.innerHTML = `
            <div style="background: #fee; padding: 20px; border-radius: 8px; text-align: center;">
                <h3>検索エラー</h3>
                <p>${message}</p>
                <button onclick="window.matchingSearch.reset()" style="
                    padding: 10px 20px;
                    background: #3498db;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-top: 10px;
                ">リセット</button>
            </div>
        `;
    };
    
    // 検索リセット
    const resetSearch = () => {
        const searchInput = document.getElementById('matching-search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // すべてのフィルターもリセット
        document.querySelectorAll('.matching-filters select').forEach(select => {
            select.value = '';
        });
        
        // 表示を更新
        if (window.displayOverride && window.displayOverride.refresh) {
            window.displayOverride.refresh();
        }
    };
    
    // displayOverrideの拡張
    const extendDisplayOverride = () => {
        if (!window.displayOverride) {
            console.warn('[MatchingSearch] displayOverrideがまだ読み込まれていません');
            setTimeout(extendDisplayOverride, 1000);
            return;
        }
        
        const originalGenerateDisplay = window.displayOverride.generateOptimizedDisplay || function() {};
        
        // generateOptimizedDisplayを公開
        window.displayOverride.generateOptimizedDisplay = function(container, profiles, user) {
            // 元のgenerateOptimizedDisplay関数の内容を再実装
            console.log('[MatchingSearch] 検索結果表示:', profiles.length);
            
            // マッチング度を計算
            const profilesWithScore = profiles.map(profile => {
                const score = calculateSimpleMatchingScore(profile);
                return { ...profile, matchingScore: score };
            }).sort((a, b) => b.matchingScore - a.matchingScore);
            
            // HTML生成（displayOverrideと同じ）
            const html = `
                <div class="override-matching-grid">
                    ${profilesWithScore.map((profile, index) => createOverrideCard(profile, index)).join('')}
                </div>
            `;
            
            container.innerHTML = html;
            
            // レーダーチャート描画
            setTimeout(() => {
                profilesWithScore.forEach((profile, index) => {
                    drawSimpleRadar(index, profile.matchingScore);
                });
            }, 100);
        };
    };
    
    // displayOverrideから必要な関数をコピー
    const calculateSimpleMatchingScore = (profile) => {
        let score = 25;
        if (profile.skills && profile.skills.length > 0) {
            score += Math.min(profile.skills.length * 3, 15);
        }
        if (profile.location) score += 8;
        if (profile.industry) score += 8;
        if (profile.title) score += 5;
        if (profile.company) score += 5;
        if (profile.bio && profile.bio.length > 50) score += 7;
        if (profile.interests && profile.interests.length > 0) {
            score += Math.min(profile.interests.length * 2, 6);
        }
        const randomAdjustment = Math.floor((Math.random() - 0.5) * 10);
        score += randomAdjustment;
        return Math.max(20, Math.min(85, score));
    };
    
    const createOverrideCard = (profile, index) => {
        const scoreClass = profile.matchingScore >= 80 ? 'score-high' : 
                          profile.matchingScore >= 60 ? 'score-medium' : 'score-low';
        
        const hasSkills = profile.skills && profile.skills.length > 0;
        const hasLocation = profile.location && profile.location !== '';
        const hasIndustry = profile.industry && profile.industry !== '';
        const hasTitle = profile.title && profile.title !== '';
        const hasCompany = profile.company && profile.company !== '';
        const isIncomplete = !hasSkills && !hasLocation && !hasIndustry;
        
        return `
            <div class="override-matching-card" data-profile-id="${profile.id}">
                <div class="override-score-badge ${scoreClass}">${profile.matchingScore}%</div>
                
                <div class="override-profile-header">
                    <img src="${profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=random`}" 
                         alt="${profile.name}" 
                         class="override-avatar">
                    <h3 style="margin: 10px 0;">${profile.name || '名前未設定'}</h3>
                    <p style="color: #666; margin: 5px 0;">
                        ${hasTitle || hasCompany ? 
                            `${profile.title || ''}${hasTitle && hasCompany ? ' @ ' : ''}${profile.company || ''}` : 
                            '<span class="override-empty-value">役職・会社未設定</span>'
                        }
                    </p>
                </div>
                
                <div class="override-radar-container" id="override-radar-${index}">
                    <canvas width="180" height="180"></canvas>
                </div>
                
                <div class="override-info-section ${isIncomplete ? 'override-info-incomplete' : ''}">
                    ${isIncomplete ? `
                        <div class="override-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            プロファイル情報が不足しています
                        </div>
                    ` : ''}
                    
                    <div class="override-info-row">
                        <span class="override-info-label">スキル:</span>
                        <div class="override-info-value">
                            ${hasSkills ? `
                                <div class="override-skill-tags">
                                    ${profile.skills.map(skill => 
                                        `<span class="override-skill-tag">${skill}</span>`
                                    ).join('')}
                                </div>
                            ` : '<span class="override-empty-value">未設定</span>'}
                        </div>
                    </div>
                    
                    <div class="override-info-row">
                        <span class="override-info-label">地域:</span>
                        <div class="override-info-value">
                            ${hasLocation ? profile.location : '<span class="override-empty-value">未設定</span>'}
                        </div>
                    </div>
                    
                    <div class="override-info-row">
                        <span class="override-info-label">業界:</span>
                        <div class="override-info-value">
                            ${hasIndustry ? profile.industry : '<span class="override-empty-value">未設定</span>'}
                        </div>
                    </div>
                </div>
                
                <div class="override-actions">
                    <button class="override-btn override-btn-secondary btn-view">
                        詳細を見る
                    </button>
                    <button class="override-btn override-btn-primary btn-connect">
                        コネクト申請
                    </button>
                </div>
            </div>
        `;
    };
    
    const drawSimpleRadar = (index, score) => {
        const canvas = document.querySelector(`#override-radar-${index} canvas`);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = 90;
        const centerY = 90;
        const radius = 70;
        
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, 180, 180);
        
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        
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
        
        const baseValue = score / 100;
        const values = Array(6).fill(0).map(() => 
            Math.round(baseValue * 70 + Math.random() * 30)
        );
        
        ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
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
    
    // 既存のフィルターにイベントを追加
    const attachFilterEvents = () => {
        const filters = document.querySelectorAll('.matching-filters select');
        filters.forEach(filter => {
            filter.addEventListener('change', () => {
                const searchTerm = document.getElementById('matching-search-input')?.value || '';
                performSearch(searchTerm);
            });
        });
        
        // 検索ボタンのイベントも更新
        const searchButton = document.querySelector('.matching-filters .btn-primary');
        if (searchButton) {
            searchButton.addEventListener('click', (e) => {
                e.preventDefault();
                const searchTerm = document.getElementById('matching-search-input')?.value || '';
                performSearch(searchTerm);
            });
        }
    };
    
    // 初期化
    const init = () => {
        console.log('[MatchingSearch] 初期化実行');
        
        // 検索フィールドを追加
        addSearchField();
        
        // displayOverrideを拡張
        extendDisplayOverride();
        
        // フィルターイベントを設定
        attachFilterEvents();
    };
    
    // DOMContentLoadedまたは遅延実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 1000);
    }
    
    // グローバル公開
    window.matchingSearch = {
        search: performSearch,
        reset: resetSearch,
        init: init
    };
    
    console.log('[MatchingSearch] 検索機能準備完了');
    
})();