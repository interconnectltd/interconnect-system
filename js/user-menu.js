// ユーザーメニュー機能
// console.log('[UserMenu] user-menu.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
    // console.log('[UserMenu] DOM loaded, initializing user menu');
    
    // Supabaseの初期化を待つ
    if (typeof window.waitForSupabase === 'function') {
        await window.waitForSupabase();
    }
    
    // ユーザー情報を取得
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        // console.log('[UserMenu] Current user:', user?.email || 'Not logged in');
        
        if (user) {
            // プロファイル情報を取得
            const { data: profile } = await window.supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
                
            // console.log('[UserMenu] Profile data:', profile);
            
            // ユーザー情報を表示
            updateUserDisplay(user, profile);
        }
    } catch (error) {
        console.error('[UserMenu] Error getting user info:', error);
    }
    
    // ユーザーメニューのトグル設定
    const menuToggles = document.querySelectorAll('.user-menu-toggle');
    // console.log(`[UserMenu] Found ${menuToggles.length} menu toggles`);
    
    menuToggles.forEach((toggle, index) => {
        // console.log(`[UserMenu] Setting up menu toggle ${index}`);
        
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // console.log('[UserMenu] Menu toggle clicked');
            
            const userMenu = toggle.closest('.user-menu');
            if (userMenu) {
                const dropdown = userMenu.querySelector('.user-menu-dropdown');
                if (dropdown) {
                    dropdown.classList.toggle('active');
                    // console.log('[UserMenu] Dropdown toggled, active:', dropdown.classList.contains('active'));
                } else {
                    console.error('[UserMenu] Dropdown not found');
                }
            } else {
                console.error('[UserMenu] User menu container not found');
            }
        });
    });
    
    // クリック外で閉じる
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-menu')) {
            // console.log('[UserMenu] Click outside menu, closing all dropdowns');
            document.querySelectorAll('.user-menu-dropdown').forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
    });
});

// ユーザー情報を表示
function updateUserDisplay(user, profile) {
    // console.log('[UserMenu] Updating user display');
    
    // ユーザー名を更新
    const userNameElements = document.querySelectorAll('.user-name, #sidebarUserName, #user-name');
    userNameElements.forEach(el => {
        if (el) {
            el.textContent = profile?.name || user.email.split('@')[0];
            // console.log('[UserMenu] Updated user name element');
        }
    });
    
    // メールアドレスを更新
    const userEmailElements = document.querySelectorAll('.user-email, #sidebarUserEmail');
    userEmailElements.forEach(el => {
        if (el) {
            el.textContent = user.email;
            // console.log('[UserMenu] Updated user email element');
        }
    });
    
    // アバターを更新
    const avatarElements = document.querySelectorAll('.user-avatar, #sidebarUserAvatar, #user-avatar');
    avatarElements.forEach(el => {
        if (el && el.tagName === 'IMG') {
            if (profile?.avatar_url) {
                el.src = profile.avatar_url;
                // console.log('[UserMenu] Updated avatar with profile image');
            } else {
                el.src = 'images/default-avatar.svg';
                // console.log('[UserMenu] Using default avatar');
            }
            
            // エラー時のフォールバック
            el.onerror = () => {
                // console.log('[UserMenu] Avatar load error, using fallback');
                el.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxOCIgZmlsbD0iI2U1ZTdlYiIvPgogIDxjaXJjbGUgY3g9IjIwIiBjeT0iMTYiIHI9IjYiIGZpbGw9IiM5Y2EzYWYiLz4KICA8ZWxsaXBzZSBjeD0iMjAiIGN5PSIyOCIgcng9IjEwIiByeT0iNiIgZmlsbD0iIzljYTNhZiIvPgo8L3N2Zz4=';
            };
        }
    });
}

// ログアウト機能
window.logout = async function() {
    // console.log('[UserMenu] Logout initiated');
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // console.log('[UserMenu] Logout successful');
        window.location.href = '/login.html';
    } catch (error) {
        console.error('[UserMenu] Logout error:', error);
        alert('ログアウトに失敗しました');
    }
};

// console.log('[UserMenu] user-menu.js setup complete');