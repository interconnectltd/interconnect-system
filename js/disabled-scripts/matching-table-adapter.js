/**
 * Matching Table Adapter
 * 既存のmatchingsテーブルを活用してマッチング機能を提供
 * profilesテーブルとmatchingsテーブルの両方を使用
 */

(function() {
    'use strict';
    
    console.log('[MatchingTableAdapter] 初期化開始');
    
    class MatchingTableAdapter {
        constructor() {
            this.currentUserId = null;
            this.initialized = false;
        }
        
        /**
         * 初期化
         */
        async init() {
            if (this.initialized) return;
            
            try {
                // 現在のユーザー取得
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                if (!user) {
                    console.error('[MatchingTableAdapter] ユーザーが認証されていません');
                    return;
                }
                
                this.currentUserId = user.id;
                this.initialized = true;
                
                console.log('[MatchingTableAdapter] 初期化完了', {
                    userId: this.currentUserId
                });
                
                // マッチング履歴の確認
                await this.checkMatchingHistory();
                
            } catch (error) {
                console.error('[MatchingTableAdapter] 初期化エラー:', error);
            }
        }
        
        /**
         * マッチング履歴の確認
         */
        async checkMatchingHistory() {
            try {
                // matchingsテーブルから自分に関連するマッチングを取得
                const { data: matchings, error } = await window.supabaseClient
                    .from('matchings')
                    .select('*')
                    .or(`requester_id.eq.${this.currentUserId},receiver_id.eq.${this.currentUserId}`)
                    .order('created_at', { ascending: false });
                
                if (error) {
                    console.error('[MatchingTableAdapter] マッチング履歴取得エラー:', error);
                    return;
                }
                
                console.log('[MatchingTableAdapter] マッチング履歴:', {
                    total: matchings?.length || 0,
                    pending: matchings?.filter(m => m.status === 'pending').length || 0,
                    accepted: matchings?.filter(m => m.status === 'accepted').length || 0,
                    rejected: matchings?.filter(m => m.status === 'rejected').length || 0
                });
                
                // グローバルに公開
                window.matchingHistory = matchings || [];
                
                return matchings;
                
            } catch (error) {
                console.error('[MatchingTableAdapter] マッチング履歴確認エラー:', error);
                return [];
            }
        }
        
        /**
         * マッチングリクエストを送信
         */
        async sendMatchingRequest(targetUserId, message = '') {
            try {
                // 既存のマッチングをチェック
                const { data: existing, error: checkError } = await window.supabaseClient
                    .from('matchings')
                    .select('*')
                    .eq('requester_id', this.currentUserId)
                    .eq('receiver_id', targetUserId)
                    .single();
                
                if (existing && !checkError) {
                    console.log('[MatchingTableAdapter] 既存のマッチングリクエストが存在します');
                    return { success: false, message: '既にマッチングリクエストを送信済みです' };
                }
                
                // 新しいマッチングリクエストを作成
                const { data: matching, error } = await window.supabaseClient
                    .from('matchings')
                    .insert({
                        requester_id: this.currentUserId,
                        receiver_id: targetUserId,
                        status: 'pending',
                        message: message,
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single();
                
                if (error) {
                    console.error('[MatchingTableAdapter] マッチングリクエスト送信エラー:', error);
                    return { success: false, error };
                }
                
                console.log('[MatchingTableAdapter] マッチングリクエスト送信成功:', matching);
                
                // 通知を作成
                await this.createNotification(targetUserId, 'matching_request', {
                    requester_id: this.currentUserId,
                    matching_id: matching.id
                });
                
                return { success: true, data: matching };
                
            } catch (error) {
                console.error('[MatchingTableAdapter] マッチングリクエスト送信エラー:', error);
                return { success: false, error };
            }
        }
        
        /**
         * マッチングリクエストに応答
         */
        async respondToMatchingRequest(matchingId, accept = true) {
            try {
                const status = accept ? 'accepted' : 'rejected';
                
                const { data: matching, error } = await window.supabaseClient
                    .from('matchings')
                    .update({
                        status: status,
                        responded_at: new Date().toISOString()
                    })
                    .eq('id', matchingId)
                    .eq('receiver_id', this.currentUserId)
                    .select()
                    .single();
                
                if (error) {
                    console.error('[MatchingTableAdapter] マッチング応答エラー:', error);
                    return { success: false, error };
                }
                
                console.log('[MatchingTableAdapter] マッチング応答成功:', matching);
                
                // 承認の場合、connectionsテーブルにも追加
                if (accept && matching) {
                    await this.createConnection(matching.requester_id);
                }
                
                // 通知を作成
                await this.createNotification(
                    matching.requester_id, 
                    accept ? 'matching_accepted' : 'matching_rejected',
                    { matching_id: matchingId }
                );
                
                return { success: true, data: matching };
                
            } catch (error) {
                console.error('[MatchingTableAdapter] マッチング応答エラー:', error);
                return { success: false, error };
            }
        }
        
        /**
         * コネクションを作成
         */
        async createConnection(targetUserId) {
            try {
                // 双方向のコネクションを作成
                const { error: error1 } = await window.supabaseClient
                    .from('connections')
                    .insert({
                        user_id: this.currentUserId,
                        connected_user_id: targetUserId,
                        status: 'connected',
                        created_at: new Date().toISOString()
                    });
                
                const { error: error2 } = await window.supabaseClient
                    .from('connections')
                    .insert({
                        user_id: targetUserId,
                        connected_user_id: this.currentUserId,
                        status: 'connected',
                        created_at: new Date().toISOString()
                    });
                
                if (error1 || error2) {
                    console.error('[MatchingTableAdapter] コネクション作成エラー:', error1 || error2);
                    return false;
                }
                
                console.log('[MatchingTableAdapter] コネクション作成成功');
                return true;
                
            } catch (error) {
                console.error('[MatchingTableAdapter] コネクション作成エラー:', error);
                return false;
            }
        }
        
        /**
         * 通知を作成
         */
        async createNotification(userId, type, data = {}) {
            try {
                const { error } = await window.supabaseClient
                    .from('notifications')
                    .insert({
                        user_id: userId,
                        type: type,
                        data: data,
                        is_read: false,
                        created_at: new Date().toISOString()
                    });
                
                if (error) {
                    console.error('[MatchingTableAdapter] 通知作成エラー:', error);
                }
                
            } catch (error) {
                console.error('[MatchingTableAdapter] 通知作成エラー:', error);
            }
        }
        
        /**
         * マッチング候補を取得（スコア計算付き）
         */
        async getMatchingCandidates() {
            try {
                // profilesテーブルから全ユーザーを取得
                const { data: profiles, error: profileError } = await window.supabaseClient
                    .from('profiles')
                    .select('*')
                    .neq('id', this.currentUserId);
                
                if (profileError) {
                    console.error('[MatchingTableAdapter] プロフィール取得エラー:', profileError);
                    return [];
                }
                
                // 既存のマッチングを取得
                const { data: existingMatchings, error: matchingError } = await window.supabaseClient
                    .from('matchings')
                    .select('*')
                    .or(`requester_id.eq.${this.currentUserId},receiver_id.eq.${this.currentUserId}`);
                
                if (matchingError) {
                    console.error('[MatchingTableAdapter] マッチング取得エラー:', matchingError);
                }
                
                // マッチング済みのユーザーIDを抽出
                const matchedUserIds = new Set();
                if (existingMatchings) {
                    existingMatchings.forEach(m => {
                        if (m.status === 'accepted') {
                            matchedUserIds.add(m.requester_id === this.currentUserId ? m.receiver_id : m.requester_id);
                        }
                    });
                }
                
                // マッチング候補をフィルタリング
                const candidates = profiles.filter(profile => !matchedUserIds.has(profile.id));
                
                console.log('[MatchingTableAdapter] マッチング候補:', {
                    total_profiles: profiles.length,
                    matched: matchedUserIds.size,
                    candidates: candidates.length
                });
                
                return candidates;
                
            } catch (error) {
                console.error('[MatchingTableAdapter] マッチング候補取得エラー:', error);
                return [];
            }
        }
        
        /**
         * 保留中のマッチングリクエストを取得
         */
        async getPendingRequests() {
            try {
                const { data: requests, error } = await window.supabaseClient
                    .from('matchings')
                    .select(`
                        *,
                        requester:profiles!matchings_requester_id_fkey(*)
                    `)
                    .eq('receiver_id', this.currentUserId)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false });
                
                if (error) {
                    console.error('[MatchingTableAdapter] 保留中リクエスト取得エラー:', error);
                    return [];
                }
                
                console.log('[MatchingTableAdapter] 保留中のリクエスト:', requests?.length || 0);
                return requests || [];
                
            } catch (error) {
                console.error('[MatchingTableAdapter] 保留中リクエスト取得エラー:', error);
                return [];
            }
        }
    }
    
    // グローバルに公開
    window.matchingTableAdapter = new MatchingTableAdapter();
    
    // Supabase準備完了後に初期化
    if (window.supabaseClient) {
        window.matchingTableAdapter.init();
    } else {
        document.addEventListener('supabaseReady', () => {
            window.matchingTableAdapter.init();
        });
    }
    
    // デバッグコマンド
    window.debugMatchingTable = async () => {
        console.log('=== Matching Table Debug ===');
        const adapter = window.matchingTableAdapter;
        
        if (!adapter.initialized) {
            await adapter.init();
        }
        
        const history = await adapter.checkMatchingHistory();
        const candidates = await adapter.getMatchingCandidates();
        const pending = await adapter.getPendingRequests();
        
        console.log('History:', history);
        console.log('Candidates:', candidates);
        console.log('Pending Requests:', pending);
        
        return {
            history,
            candidates,
            pending
        };
    };
    
})();