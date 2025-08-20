/**
 * マッチング・コネクションページの見逃し機能
 * 削除されたファイルから重要機能をサルベージ
 */

(function() {
    'use strict';
    
    // === 1. コネクション承認通知システム ===
    async function sendConnectionNotification(type, recipientId, senderName) {
        if (!window.sendNotification) return;
        
        try {
            const messages = {
                'connection_request': `${senderName}さんからコネクト申請が届きました`,
                'connection_accepted': `${senderName}さんがコネクト申請を承認しました`,
                'connection_rejected': `コネクト申請が承認されませんでした`
            };
            
            await window.sendNotification(
                recipientId,
                type,
                messages[type] || '新しい通知があります',
                null,
                '/connections.html'
            );
        } catch (error) {
            console.error('[MissingFeatures] 通知送信エラー:', error);
        }
    }
    
    // === 2. カードアニメーション遅延 ===
    function addCardAnimationDelay() {
        const cards = document.querySelectorAll('.matching-card');
        cards.forEach((card, index) => {
            if (!card.style.animationDelay) {
                card.style.animationDelay = `${index * 50}ms`;
                card.style.animation = 'fadeInUp 0.5s ease forwards';
            }
        });
    }
    
    // === 3. プロファイル画像の遅延読み込み強化 ===
    function setupAdvancedLazyLoading() {
        // 既存のIntersectionObserverが無い場合のみ設定
        if (window.__advancedLazyLoadingSetup) return;
        window.__advancedLazyLoadingSetup = true;
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    
                    // プレースホルダーから実画像へ
                    if (img.dataset.lazySrc && !img.dataset.loaded) {
                        const tempImg = new Image();
                        tempImg.onload = () => {
                            img.src = img.dataset.lazySrc;
                            img.classList.add('image-loaded');
                            img.dataset.loaded = 'true';
                        };
                        tempImg.onerror = () => {
                            img.src = 'assets/default-avatar.svg';
                            img.classList.add('image-error');
                        };
                        tempImg.src = img.dataset.lazySrc;
                    }
                    
                    imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: '100px',
            threshold: 0.01
        });
        
        // 既存の画像を監視
        document.querySelectorAll('img[data-lazy-src]').forEach(img => {
            imageObserver.observe(img);
        });
        
        // 新規追加画像も監視
        const container = document.getElementById('matching-container');
        if (container) {
            const mutationObserver = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            const images = node.querySelectorAll('img[data-lazy-src]');
                            images.forEach(img => imageObserver.observe(img));
                        }
                    });
                });
            });
            
            mutationObserver.observe(container, {
                childList: true,
                subtree: true
            });
        }
    }
    
    // === 4. 高度な検索機能 ===
    window.advancedSearch = {
        // 複数条件AND/OR検索
        multiCriteriaSearch: function(profiles, criteria) {
            return profiles.filter(profile => {
                const results = [];
                
                if (criteria.skills && criteria.skills.length > 0) {
                    const hasSkill = criteria.skills.some(skill => 
                        profile.skills?.includes(skill)
                    );
                    results.push(criteria.skillsOperator === 'OR' ? hasSkill : 
                        criteria.skills.every(skill => profile.skills?.includes(skill))
                    );
                }
                
                if (criteria.interests && criteria.interests.length > 0) {
                    const hasInterest = criteria.interests.some(interest => 
                        profile.interests?.includes(interest)
                    );
                    results.push(criteria.interestsOperator === 'OR' ? hasInterest :
                        criteria.interests.every(interest => profile.interests?.includes(interest))
                    );
                }
                
                if (criteria.location) {
                    results.push(profile.location === criteria.location);
                }
                
                if (criteria.industry) {
                    results.push(profile.industry === criteria.industry);
                }
                
                // AND/OR条件で結合
                return criteria.globalOperator === 'OR' ? 
                    results.some(r => r) : results.every(r => r);
            });
        },
        
        // ファジー検索
        fuzzySearch: function(profiles, searchTerm) {
            const term = searchTerm.toLowerCase();
            return profiles.filter(profile => {
                const searchableText = [
                    profile.name,
                    profile.title,
                    profile.company,
                    profile.bio,
                    ...(profile.skills || []),
                    ...(profile.interests || [])
                ].join(' ').toLowerCase();
                
                // 部分一致または類似度チェック
                return searchableText.includes(term) || 
                       this.calculateSimilarity(searchableText, term) > 0.6;
            });
        },
        
        // 文字列類似度計算（簡易版）
        calculateSimilarity: function(str1, str2) {
            const longer = str1.length > str2.length ? str1 : str2;
            const shorter = str1.length > str2.length ? str2 : str1;
            
            if (longer.length === 0) return 1.0;
            
            const editDistance = this.levenshteinDistance(longer, shorter);
            return (longer.length - editDistance) / longer.length;
        },
        
        // レーベンシュタイン距離
        levenshteinDistance: function(str1, str2) {
            const matrix = [];
            
            for (let i = 0; i <= str2.length; i++) {
                matrix[i] = [i];
            }
            
            for (let j = 0; j <= str1.length; j++) {
                matrix[0][j] = j;
            }
            
            for (let i = 1; i <= str2.length; i++) {
                for (let j = 1; j <= str1.length; j++) {
                    if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j - 1] + 1,
                            matrix[i][j - 1] + 1,
                            matrix[i - 1][j] + 1
                        );
                    }
                }
            }
            
            return matrix[str2.length][str1.length];
        }
    };
    
    // === 5. コネクション管理強化 ===
    window.connectionEnhancement = {
        // 相互コネクション確認
        checkMutualConnection: async function(userId1, userId2) {
            if (!window.supabaseClient) return false;
            
            try {
                const { data } = await window.supabaseClient
                    .from('connections')
                    .select('*')
                    .or(`and(user_id.eq.${userId1},connected_user_id.eq.${userId2}),and(user_id.eq.${userId2},connected_user_id.eq.${userId1})`)
                    .eq('status', 'accepted');
                
                return data && data.length >= 2;
            } catch (error) {
                console.error('[ConnectionEnhancement] エラー:', error);
                return false;
            }
        },
        
        // コネクション推薦
        getSuggestedConnections: async function(userId, limit = 5) {
            if (!window.supabaseClient) return [];
            
            try {
                // 現在のコネクションを取得
                const { data: connections } = await window.supabaseClient
                    .from('connections')
                    .select('connected_user_id')
                    .eq('user_id', userId)
                    .eq('status', 'accepted');
                
                const connectedIds = connections?.map(c => c.connected_user_id) || [];
                
                // コネクションのコネクションを取得（2次つながり）
                const { data: secondDegree } = await window.supabaseClient
                    .from('connections')
                    .select('connected_user_id')
                    .in('user_id', connectedIds)
                    .eq('status', 'accepted')
                    .not('connected_user_id', 'eq', userId)
                    .not('connected_user_id', 'in', `(${connectedIds.join(',')})`);
                
                // 重複を除去して返す
                const uniqueIds = [...new Set(secondDegree?.map(c => c.connected_user_id) || [])];
                return uniqueIds.slice(0, limit);
                
            } catch (error) {
                console.error('[ConnectionEnhancement] 推薦エラー:', error);
                return [];
            }
        }
    };
    
    // === 6. UIフィードバック強化 ===
    function enhanceUIFeedback() {
        // ボタンクリック時のフィードバック
        document.querySelectorAll('.btn').forEach(btn => {
            if (!btn.dataset.feedbackAdded) {
                btn.dataset.feedbackAdded = 'true';
                
                btn.addEventListener('click', function() {
                    // リップルエフェクト
                    const ripple = document.createElement('span');
                    ripple.className = 'button-ripple';
                    ripple.style.cssText = `
                        position: absolute;
                        border-radius: 50%;
                        background: rgba(255, 255, 255, 0.5);
                        transform: scale(0);
                        animation: ripple 0.6s ease-out;
                        pointer-events: none;
                    `;
                    
                    const rect = this.getBoundingClientRect();
                    const size = Math.max(rect.width, rect.height);
                    ripple.style.width = ripple.style.height = size + 'px';
                    
                    this.style.position = 'relative';
                    this.style.overflow = 'hidden';
                    this.appendChild(ripple);
                    
                    setTimeout(() => ripple.remove(), 600);
                });
            }
        });
    }
    
    // === 7. スタイル追加 ===
    function addEnhancementStyles() {
        if (document.getElementById('missing-features-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'missing-features-styles';
        styles.textContent = `
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            
            .image-loaded {
                animation: fadeIn 0.3s ease;
            }
            
            .image-error {
                opacity: 0.5;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // === 初期化 ===
    function init() {
        addEnhancementStyles();
        addCardAnimationDelay();
        setupAdvancedLazyLoading();
        enhanceUIFeedback();
        
        // グローバル関数として公開
        window.sendConnectionNotification = sendConnectionNotification;
        
        console.log('[MissingFeatures] サルベージ機能を適用しました');
    }
    
    // DOMContentLoadedで初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();