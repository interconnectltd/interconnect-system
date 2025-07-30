/**
 * Matching Supabase Integration - Optimized Version
 * サーバーサイドページネーション対応版
 */

(function() {
    'use strict';

    // 既存のmatching-supabase.jsの先頭に追加する最適化コード
    
    // オリジナルのloadProfilesメソッドをオーバーライド
    if (window.matchingSupabase) {
        const originalInstance = window.matchingSupabase;
        
        // サーバーサイドでフィルタリングとページネーションを行う新しいメソッド
        originalInstance.loadProfilesOptimized = async function(page = 1) {
            const { filters, sortOrder } = this;
            const CONFIG = window.MATCHING_CONFIG || { ITEMS_PER_PAGE: 6 };
            const offset = (page - 1) * CONFIG.ITEMS_PER_PAGE;
            
            this.showLoading();
            
            try {
                const { data: { user } } = await window.supabase.auth.getUser();
                
                // クエリを構築
                let query = window.supabase
                    .from('profiles')
                    .select('*', { count: 'exact' });
                
                // 自分以外を取得
                if (user) {
                    query = query.neq('id', user.id);
                }
                
                // 公開プロフィールのみ
                query = query.eq('is_public', true);
                
                // フィルター適用（サーバーサイド）
                if (filters.industry) {
                    query = query.eq('industry', filters.industry);
                }
                if (filters.location) {
                    query = query.eq('location', filters.location);
                }
                if (filters.interest) {
                    // スキル配列に対する検索
                    const interestMap = {
                        'collaboration': ['協業', 'パートナーシップ', 'コラボレーション'],
                        'investment': ['投資', 'ファンディング', '資金調達'],
                        'mentoring': ['メンタリング', 'コーチング', '指導'],
                        'networking': ['ネットワーキング', '人脈', '交流']
                    };
                    
                    const keywords = interestMap[filters.interest] || [];
                    if (keywords.length > 0) {
                        query = query.contains('skills', keywords);
                    }
                }
                
                // ソート（サーバーサイド）
                switch (sortOrder) {
                    case 'newest':
                        query = query.order('created_at', { ascending: false });
                        break;
                    case 'active':
                        query = query.order('last_active_at', { ascending: false, nullsFirst: false });
                        break;
                    default:
                        // スコア順はクライアントサイドで計算が必要
                        query = query.order('updated_at', { ascending: false });
                }
                
                // ページネーション
                query = query.range(offset, offset + CONFIG.ITEMS_PER_PAGE - 1);
                
                const { data: profiles, error, count } = await query;
                
                if (error) throw error;
                
                // 総件数を保存
                this.totalCount = count || 0;
                
                // マッチングスコアを計算
                const scoredProfiles = this.calculateMatchingScores(profiles || []);
                
                // スコア順の場合はクライアントサイドでソート
                if (sortOrder === 'score') {
                    scoredProfiles.sort((a, b) => b.matchingScore - a.matchingScore);
                }
                
                this.currentProfiles = scoredProfiles;
                this.currentPage = page;
                
                // 表示
                await this.renderProfilesOptimized();
                
            } catch (error) {
                console.error('[MatchingSupabase] Optimized load error:', error);
                this.showError(
                    'データの読み込みに失敗しました',
                    'ネットワーク接続を確認してください',
                    error
                );
            } finally {
                this.hideLoading();
            }
        };
        
        // 最適化されたレンダリングメソッド
        originalInstance.renderProfilesOptimized = async function() {
            const grid = document.querySelector('.matching-grid');
            if (!grid) return;
            
            // 結果件数を更新
            const resultsCount = document.querySelector('.results-count');
            if (resultsCount) {
                resultsCount.textContent = `${this.totalCount}件のマッチング候補`;
            }
            
            const profiles = this.currentProfiles;
            
            if (profiles.length === 0) {
                grid.innerHTML = this.getEmptyStateHTML();
                this.updatePaginationOptimized(0);
                return;
            }
            
            // 既にコネクト済みのユーザーを確認
            const connectedUsers = await this.checkExistingConnections(profiles.map(p => p.id));
            
            // カードを生成
            const cardsHTML = profiles.map((profile, index) => 
                this.createMatchingCard(profile, connectedUsers.includes(profile.id), index)
            ).join('');
            
            grid.innerHTML = cardsHTML;
            
            // ページネーションを更新
            const totalPages = Math.ceil(this.totalCount / CONFIG.ITEMS_PER_PAGE);
            this.updatePaginationOptimized(totalPages);
            
            // カードのイベントリスナーを設定
            this.attachCardEventListeners();
        };
        
        // 最適化されたページネーション更新
        originalInstance.updatePaginationOptimized = function(totalPages) {
            const pagination = document.querySelector('.pagination');
            if (!pagination) return;
            
            const prevBtn = pagination.querySelector('.btn-outline:first-child');
            const nextBtn = pagination.querySelector('.btn-outline:last-child');
            const pageNumbers = pagination.querySelector('.page-numbers');
            
            // 前へ/次へボタンの状態
            if (prevBtn) {
                prevBtn.disabled = this.currentPage === 1 || this.isLoading;
                prevBtn.onclick = () => {
                    if (this.currentPage > 1) {
                        this.loadProfilesOptimized(this.currentPage - 1);
                    }
                };
            }
            if (nextBtn) {
                nextBtn.disabled = this.currentPage === totalPages || totalPages === 0 || this.isLoading;
                nextBtn.onclick = () => {
                    if (this.currentPage < totalPages) {
                        this.loadProfilesOptimized(this.currentPage + 1);
                    }
                };
            }
            
            // ページ番号
            if (pageNumbers && totalPages > 0) {
                const pages = this.generatePageNumbers(totalPages);
                pageNumbers.innerHTML = pages.map(page => {
                    if (page === '...') {
                        return '<span class="page-ellipsis">...</span>';
                    }
                    return `<button class="page-number ${page === this.currentPage ? 'active' : ''}" 
                            onclick="window.matchingSupabase.loadProfilesOptimized(${page})">${page}</button>`;
                }).join('');
            }
        };
        
        // フィルター適用メソッドをオーバーライド
        originalInstance.applyFilters = function() {
            const filterSelects = {
                industry: document.querySelector('.filter-group select[name="industry"]'),
                location: document.querySelector('.filter-group select[name="location"]'),
                interest: document.querySelector('.filter-group select[name="interest"]')
            };
            
            this.filters.industry = filterSelects.industry?.value || '';
            this.filters.location = filterSelects.location?.value || '';
            this.filters.interest = filterSelects.interest?.value || '';
            
            console.log('[MatchingSupabase] Applying filters (optimized):', this.filters);
            
            // サーバーサイドフィルタリングで再読み込み
            this.currentPage = 1;
            this.loadProfilesOptimized(1);
        };
        
        // loadProfilesメソッドをオーバーライドして最適化版を使用
        originalInstance.loadProfiles = function() {
            console.log('[MatchingSupabase] Using optimized loadProfiles');
            this.loadProfilesOptimized(1);
        };
        
        console.log('[MatchingSupabase] Optimized methods injected');
    }
    
})();