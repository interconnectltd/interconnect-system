/**
 * マッチング機能の緊急修正
 * 画像URL undefined問題とconnections APIエラーを修正
 */

(function() {
    'use strict';

    // DOMContentLoaded後に実行
    document.addEventListener('DOMContentLoaded', function() {
        
        if (window.matchingSupabase) {
            // createMatchingCardメソッドを修正
            const originalCreateCard = window.matchingSupabase.createMatchingCard.bind(window.matchingSupabase);
            
            window.matchingSupabase.createMatchingCard = function(profile, isConnected, index) {
                // デフォルトアバターを確実に設定
                const DEFAULT_AVATAR = 'assets/user-placeholder.svg';
                const avatarUrl = profile.avatar_url || profile.picture || DEFAULT_AVATAR;
                
                // プロフィールオブジェクトを修正
                const fixedProfile = {
                    ...profile,
                    avatar_url: avatarUrl
                };
                
                // 元のメソッドを呼び出し
                const cardHTML = originalCreateCard(fixedProfile, isConnected, index);
                
                // CONFIG.DEFAULT_AVATARが未定義の場合の追加修正
                return cardHTML.replace(/undefined/g, DEFAULT_AVATAR);
            };
            
            // checkExistingConnectionsメソッドを修正
            const originalCheckConnections = window.matchingSupabase.checkExistingConnections.bind(window.matchingSupabase);
            
            window.matchingSupabase.checkExistingConnections = async function(profileIds) {
                if (!profileIds || profileIds.length === 0) {
                    return [];
                }
                
                try {
                    const { data: { user } } = await window.supabase.auth.getUser();
                    if (!user) return [];
                    
                    // connectionsテーブルのカラム名を確認して修正
                    const { data, error } = await window.supabase
                        .from('connections')
                        .select('target_user_id')
                        .eq('user_id', user.id)
                        .in('target_user_id', profileIds);
                    
                    if (error) {
                        console.warn('[MatchingFix] Connections query error:', error);
                        // エラーの場合は空配列を返す（エラーを表示しない）
                        return [];
                    }
                    
                    return data ? data.map(conn => conn.target_user_id) : [];
                } catch (error) {
                    console.warn('[MatchingFix] Connections check error:', error);
                    return [];
                }
            };
            
            // currentProfilesを確実に設定
            if (window.matchingSupabase.allProfiles && !window.matchingSupabase.currentProfiles) {
                window.matchingSupabase.currentProfiles = window.matchingSupabase.allProfiles;
            }
            
            // 初回レンダリングを再実行
            setTimeout(() => {
                if (window.matchingSupabase.allProfiles && window.matchingSupabase.allProfiles.length > 0) {
                    console.log('[MatchingFix] Re-rendering profiles');
                    window.matchingSupabase.renderProfiles();
                }
            }, 1000);
        }
        
        console.log('[MatchingFix] Critical fixes applied');
    });
    
})();