/**
 * マッチングリアルタイム更新機能
 * 新しいユーザーが登録された際にリアルタイムで更新
 */

(function() {
    'use strict';
    
    let realtimeSubscription = null;
    
    async function setupRealtimeUpdates() {
        // Supabaseの準備を待つ
        if (!window.supabaseClient) {
            setTimeout(setupRealtimeUpdates, 500);
            return;
        }
        
        try {
            // 既存のサブスクリプションをクリーンアップ
            if (realtimeSubscription) {
                await realtimeSubscription.unsubscribe();
            }
            
            // プロファイル更新をリアルタイムで監視
            realtimeSubscription = window.supabaseClient
                .channel('matching-profiles')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'user_profiles'
                }, (payload) => {
                    handleProfileUpdate(payload);
                })
                .subscribe();
                
            // console.log('[MatchingRealtime] リアルタイム更新を開始しました');
            
        } catch (error) {
            console.error('[MatchingRealtime] セットアップエラー:', error);
        }
    }
    
    function handleProfileUpdate(payload) {
        const { eventType, new: newProfile, old: oldProfile } = payload;
        
        switch (eventType) {
            case 'INSERT':
                // 新しいユーザーが追加された
                showNewUserNotification(newProfile);
                // 必要に応じてマッチングリストを更新
                if (window.location.pathname.includes('matching.html')) {
                    addNewProfileToList(newProfile);
                }
                break;
                
            case 'UPDATE':
                // プロファイルが更新された
                if (window.location.pathname.includes('matching.html')) {
                    updateProfileInList(newProfile);
                }
                break;
                
            case 'DELETE':
                // プロファイルが削除された
                if (window.location.pathname.includes('matching.html')) {
                    removeProfileFromList(oldProfile.id);
                }
                break;
        }
    }
    
    function showNewUserNotification(profile) {
        // 通知バナーを表示
        const banner = document.createElement('div');
        banner.className = 'new-user-notification';
        banner.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            animation: slideInRight 0.5s ease;
            cursor: pointer;
            max-width: 350px;
        `;
        
        banner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="
                    width: 40px;
                    height: 40px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <i class="fas fa-user-plus"></i>
                </div>
                <div>
                    <div style="font-weight: 600; margin-bottom: 4px;">
                        新しいユーザーが参加しました！
                    </div>
                    <div style="opacity: 0.9; font-size: 14px;">
                        ${profile.name || '新規ユーザー'} さん
                    </div>
                </div>
            </div>
        `;
        
        // クリックでマッチングページへ
        banner.onclick = () => {
            if (!window.location.pathname.includes('matching.html')) {
                window.location.href = 'matching.html';
            }
            banner.remove();
        };
        
        document.body.appendChild(banner);
        
        // 5秒後に自動削除
        setTimeout(() => {
            banner.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => banner.remove(), 500);
        }, 5000);
    }
    
    function addNewProfileToList(profile) {
        // マッチングリストの先頭に新しいプロファイルを追加
        const container = document.getElementById('matching-container');
        if (!container) return;
        
        const matchingGrid = container.querySelector('.matching-grid');
        if (!matchingGrid) return;
        
        // 新規バッジ付きでカードを作成
        const newCard = createProfileCard(profile, true);
        
        // 最初の要素として挿入
        matchingGrid.insertBefore(newCard, matchingGrid.firstChild);
        
        // アニメーション
        newCard.style.animation = 'fadeInScale 0.5s ease';
        
        // 最後の要素を削除（ページあたりの表示数を維持）
        const cards = matchingGrid.querySelectorAll('.matching-card');
        if (cards.length > 12) {
            cards[cards.length - 1].remove();
        }
    }
    
    function updateProfileInList(profile) {
        const card = document.querySelector(`[data-profile-id="${profile.id}"]`);
        if (card) {
            // カードの内容を更新
            const updatedCard = createProfileCard(profile, false);
            card.parentNode.replaceChild(updatedCard, card);
            
            // 更新アニメーション
            updatedCard.style.animation = 'pulse 0.5s ease';
        }
    }
    
    function removeProfileFromList(profileId) {
        const card = document.querySelector(`[data-profile-id="${profileId}"]`);
        if (card) {
            // フェードアウトアニメーション
            card.style.animation = 'fadeOutScale 0.5s ease';
            setTimeout(() => card.remove(), 500);
        }
    }
    
    function createProfileCard(profile, isNew = false) {
        const card = document.createElement('div');
        card.className = 'matching-card';
        card.dataset.profileId = profile.id;
        
        // 新規バッジ
        const newBadge = isNew ? `
            <div style="
                position: absolute;
                top: 10px;
                right: 10px;
                background: #e74c3c;
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                z-index: 10;
            ">NEW</div>
        ` : '';
        
        card.innerHTML = `
            ${newBadge}
            <div class="card-header">
                <img src="${profile.avatar_url || 'assets/default-avatar.svg'}" 
                     alt="${profile.name}" 
                     class="profile-image">
            </div>
            <div class="card-body">
                <h3 class="profile-name">${profile.name || '名前未設定'}</h3>
                <p class="profile-title">${profile.title || '役職未設定'}</p>
                <p class="profile-company">${profile.company || '会社未設定'}</p>
            </div>
            <div class="card-footer">
                <button class="btn btn-secondary view-profile-btn" data-user-id="${profile.id}">
                    プロフィール
                </button>
                <button class="btn btn-primary connect-btn" data-user-id="${profile.id}">
                    コネクト
                </button>
            </div>
        `;
        
        return card;
    }
    
    // アニメーションCSS追加
    function addAnimationStyles() {
        if (document.getElementById('realtime-animations')) return;
        
        const style = document.createElement('style');
        style.id = 'realtime-animations';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            @keyframes fadeInScale {
                from {
                    opacity: 0;
                    transform: scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            @keyframes fadeOutScale {
                from {
                    opacity: 1;
                    transform: scale(1);
                }
                to {
                    opacity: 0;
                    transform: scale(0.9);
                }
            }
            
            @keyframes pulse {
                0%, 100% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.02);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // クリーンアップ
    window.addEventListener('unload', () => {
        if (realtimeSubscription) {
            realtimeSubscription.unsubscribe();
        }
    });
    
    // 初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            addAnimationStyles();
            setupRealtimeUpdates();
        });
    } else {
        addAnimationStyles();
        setupRealtimeUpdates();
    }
    
})();