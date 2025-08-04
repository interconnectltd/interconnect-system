/**
 * Referral Table Fix
 * invitationsテーブルの正しい構造に対応
 */

// ReferralManagerのloadReferralHistoryメソッドを修正
if (window.ReferralManager) {
    window.ReferralManager.prototype.loadReferralHistory = async function() {
        console.log('[Referral] 紹介履歴読み込み中...');
        const filter = document.getElementById('status-filter')?.value || 'all';
        console.log('[Referral] フィルター:', filter);

        try {
            // 基本クエリ - profilesテーブルをJOINして招待された人の情報を取得
            let query = supabase
                .from('invitations')
                .select(`
                    *,
                    accepted_user:profiles!invitations_accepted_by_fkey(
                        id,
                        name,
                        email,
                        company,
                        avatar_url
                    )
                `)
                .eq('inviter_id', this.user.id)
                .order('sent_at', { ascending: false })
                .limit(20);

            // フィルター適用
            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data: referrals, error } = await query;

            console.log('[Referral] 紹介履歴取得結果:', { referrals, error });

            if (error) {
                console.error('[Referral] 紹介履歴エラー:', error);
                // エラーが外部キー関連の場合は、シンプルなクエリで再試行
                if (error.message.includes('fkey')) {
                    const simpleQuery = await supabase
                        .from('invitations')
                        .select('*')
                        .eq('inviter_id', this.user.id)
                        .order('sent_at', { ascending: false })
                        .limit(20);
                    
                    if (simpleQuery.data) {
                        this.displayReferralHistory(simpleQuery.data);
                        return;
                    }
                }
                throw error;
            }

            this.displayReferralHistory(referrals);
        } catch (error) {
            console.error('[Referral] 紹介履歴の読み込みエラー:', error);
            console.error('[Referral] エラー詳細:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            
            // エラー時は空の状態を表示
            const referralsList = document.getElementById('referral-list');
            if (referralsList) {
                referralsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>紹介履歴の読み込みに失敗しました</p>
                        <small>${error.message}</small>
                    </div>
                `;
            }
        }
    };

    // 紹介履歴の表示を修正
    window.ReferralManager.prototype.displayReferralHistory = function(referrals) {
        const referralsList = document.getElementById('referral-list');
        if (!referralsList) {
            console.error('[Referral] referral-list要素が見つかりません');
            return;
        }
        
        if (!referrals || referrals.length === 0) {
            referralsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-friends"></i>
                    <p>紹介履歴がありません</p>
                </div>
            `;
            console.log('[Referral] 紹介履歴が0件です');
            return;
        }

        console.log(`[Referral] ${referrals.length}件の紹介履歴を表示`);
        
        referralsList.innerHTML = referrals.map(referral => {
            const statusClass = this.getStatusClass(referral.status);
            const statusText = this.getStatusText(referral.status);
            
            // 招待された人の情報（登録済みの場合）
            const inviteeName = referral.accepted_user?.name || referral.invitee_email;
            const inviteeCompany = referral.accepted_user?.company || '';
            const inviteeAvatar = referral.accepted_user?.avatar_url || 'images/default-avatar.svg';
            
            // 日付のフォーマット
            const sentDate = referral.sent_at ? new Date(referral.sent_at).toLocaleDateString('ja-JP') : '';
            const acceptedDate = referral.accepted_at ? new Date(referral.accepted_at).toLocaleDateString('ja-JP') : '';
            
            return `
                <div class="referral-item" data-id="${referral.id}">
                    <div class="referral-avatar">
                        <img src="${inviteeAvatar}" alt="${inviteeName}">
                    </div>
                    <div class="referral-info">
                        <h4>${inviteeName}</h4>
                        ${inviteeCompany ? `<p class="company">${inviteeCompany}</p>` : ''}
                        <p class="meta">
                            <span>招待日: ${sentDate}</span>
                            ${acceptedDate ? `<span> | 登録日: ${acceptedDate}</span>` : ''}
                        </p>
                        ${referral.custom_message ? `<p class="message">${referral.custom_message}</p>` : ''}
                    </div>
                    <div class="referral-status">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                        ${referral.points_earned ? `<p class="points">+${referral.points_earned}pt</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    };
}

// 招待作成関数も修正
window.createInvitation = async function(email, message) {
    console.log('[Referral] 招待作成開始:', { email, message });
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('ログインが必要です');
        
        const { data, error } = await supabase
            .rpc('create_invitation', {
                p_inviter_id: user.id,
                p_invitee_email: email,
                p_custom_message: message || null
            });
            
        if (error) throw error;
        
        console.log('[Referral] 招待作成成功:', data);
        return data;
    } catch (error) {
        console.error('[Referral] 招待作成エラー:', error);
        throw error;
    }
};

console.log('[Referral] Table Fix loaded');