/**
 * Profile Sync with Supabase
 * プロフィール情報をSupabaseと同期
 */

(function() {
    'use strict';
    
    // Supabaseからユーザー情報を取得して更新
    async function syncUserProfile() {
        if (!window.supabase) {
            console.error('Supabase client not initialized');
            return;
        }
        
        try {
            // 現在のユーザーを取得
            const { data: { user }, error } = await window.supabase.auth.getUser();
            
            if (error) {
                console.error('Error getting user:', error);
                return;
            }
            
            if (!user) {
                console.log('No authenticated user');
                return;
            }
            
            console.log('Current Supabase user:', user);
            
            // ユーザーメタデータから情報を取得
            const userData = {
                id: user.id,
                email: user.email,
                name: user.user_metadata?.name || user.user_metadata?.display_name || user.email?.split('@')[0],
                display_name: user.user_metadata?.display_name || user.user_metadata?.name,
                picture: user.user_metadata?.picture,
                picture_url: user.user_metadata?.picture_url,
                provider: user.user_metadata?.provider || 'email',
                line_user_id: user.user_metadata?.line_user_id
            };
            
            // LINE IDが名前として設定されている場合の対処
            if (userData.name && userData.name.startsWith('line_')) {
                console.log('Detected LINE ID as name, checking for display_name');
                if (userData.display_name && !userData.display_name.startsWith('line_')) {
                    userData.name = userData.display_name;
                }
            }
            
            console.log('Synced user data:', userData);
            
            // localStorageを更新
            localStorage.setItem('user', JSON.stringify(userData));
            
            // sessionStorageも更新
            sessionStorage.setItem('userEmail', user.email);
            sessionStorage.setItem('isLoggedIn', 'true');
            
            // DOMを更新
            updateUserDisplay(userData);
            
            return userData;
            
        } catch (err) {
            console.error('Profile sync error:', err);
        }
    }
    
    // ユーザー情報をDOMに反映
    function updateUserDisplay(userData) {
        console.log('[ProfileSync] updateUserDisplay called with:', userData);
        
        // 名前の更新
        const userNameElements = document.querySelectorAll('.user-name');
        console.log('[ProfileSync] Found user-name elements:', userNameElements.length);
        
        userNameElements.forEach((element, index) => {
            if (element) {
                const newName = userData.name || userData.display_name || 'ゲスト';
                console.log(`[ProfileSync] Updating element ${index}: ${element.textContent} -> ${newName}`);
                element.textContent = newName;
            }
        });
        
        // プロフィール画像の更新
        const profileImages = document.querySelectorAll('.user-avatar img, .profile-pic img, .user-menu-btn img');
        profileImages.forEach(img => {
            if (img && (userData.picture_url || userData.picture)) {
                img.src = userData.picture_url || userData.picture;
                img.onerror = function() {
                    this.src = 'assets/user-placeholder.svg';
                };
            }
        });
        
        // メールアドレスの更新
        const emailElements = document.querySelectorAll('.user-email');
        emailElements.forEach(element => {
            if (element) {
                element.textContent = userData.email;
            }
        });
    }
    
    // プロフィール更新機能
    async function updateProfile(updates) {
        if (!window.supabase) {
            console.error('Supabase client not initialized');
            return { error: 'Supabase not initialized' };
        }
        
        try {
            const { data, error } = await window.supabase.auth.updateUser({
                data: updates
            });
            
            if (error) {
                console.error('Profile update error:', error);
                return { error };
            }
            
            console.log('Profile updated successfully:', data);
            
            // 更新後に同期
            await syncUserProfile();
            
            return { data };
            
        } catch (err) {
            console.error('Update profile error:', err);
            return { error: err };
        }
    }
    
    // 初期化
    function init() {
        console.log('ProfileSync init called');
        
        // 即座にlocalStorageから読み込んで表示を更新
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                console.log('Immediate update with localStorage data:', userData);
                updateUserDisplay(userData);
            } catch (e) {
                console.error('Failed to parse immediate user data:', e);
            }
        }
        
        // Supabaseが準備できたら同期
        if (window.supabase) {
            syncUserProfile();
        } else {
            window.addEventListener('supabaseReady', syncUserProfile);
        }
        
        // 定期的に同期（5分ごと）
        setInterval(syncUserProfile, 5 * 60 * 1000);
    }
    
    // できるだけ早く初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // さらに早く実行（DOMContentLoaded前）
    if (typeof Storage !== 'undefined') {
        const userStr = localStorage.getItem('user');
        console.log('[ProfileSync] Early sync - localStorage user:', userStr);
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                
                // LINE IDが名前になっている場合の修正
                if (userData.name && userData.name.startsWith('line_')) {
                    if (userData.display_name && !userData.display_name.startsWith('line_')) {
                        userData.name = userData.display_name;
                        // 修正したデータを保存
                        localStorage.setItem('user', JSON.stringify(userData));
                    }
                }
                
                // DOMが準備できたらすぐに更新
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                    console.log('[ProfileSync] DOM ready, updating immediately');
                    updateUserDisplay(userData);
                } else {
                    console.log('[ProfileSync] Waiting for DOMContentLoaded');
                    document.addEventListener('DOMContentLoaded', () => {
                        console.log('[ProfileSync] DOMContentLoaded fired - updating display');
                        updateUserDisplay(userData);
                    });
                }
            } catch (e) {
                console.error('Early sync error:', e);
            }
        }
    }
    
    // グローバルAPIとして公開
    window.ProfileSync = {
        sync: syncUserProfile,
        update: updateProfile,
        updateDisplay: updateUserDisplay
    };
    
    // 確実に実行するため、短い遅延後にも実行
    setTimeout(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                console.log('[ProfileSync] Delayed update (500ms)');
                updateUserDisplay(userData);
            } catch (e) {
                console.error('[ProfileSync] Delayed update error:', e);
            }
        }
    }, 500);
    
})();