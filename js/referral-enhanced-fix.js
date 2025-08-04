/**
 * Referral Enhanced Fix
 * 関数オーバーロード問題の修正版
 */

// 既存のreferral-enhanced.jsの修正箇所のみ

// createReferralLink関数の修正（シンプル版）
async function createReferralLinkFixed(description = null) {
    console.log('[Referral] 紹介リンク作成開始...', { description });
    try {
        // ユーザー認証確認
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            throw new Error('ログインが必要です');
        }
        
        // シンプルなパラメータ
        const { data, error } = await supabaseClient
            .rpc('create_invite_link', {
                p_user_id: user.id,
                p_description: description || 'マイ紹介リンク'
            });
            
        console.log('[Referral] リンク作成結果:', { data, error });
            
        if (error) {
            console.error('[Referral] リンク作成エラー:', error);
            throw new Error(error.message || 'リンク作成に失敗しました');
        }
        
        // JSONレスポンスの処理
        if (data && typeof data === 'object' && data.success === false) {
            throw new Error(data.error || 'リンク作成に失敗しました');
        }
        
        return data;
    } catch (error) {
        console.error('[Referral] リンク作成エラー:', error);
        throw error;
    }
}

// get_referral_stats呼び出しの修正
async function getReferralStatsFixed(userId) {
    console.log('[Referral] 統計情報取得開始...', { userId });
    try {
        // パラメータを明示的に指定
        const params = {
            p_user_id: userId
        };
        
        console.log('[Referral] RPC呼び出しパラメータ:', params);
        
        const { data, error } = await supabase
            .rpc('get_referral_stats', params);
            
        console.log('[Referral] 統計取得結果:', { data, error });
            
        if (error) {
            console.error('[Referral] 統計取得エラー:', error);
            
            // エラーメッセージを分かりやすく
            if (error.code === '42883') {
                throw new Error('統計取得関数が見つかりません。データベースの更新が必要です。');
            }
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('[Referral] 統計取得エラー:', error);
        throw error;
    }
}

// 既存の関数をオーバーライド
if (window.ReferralManager) {
    // createReferralLinkメソッドをオーバーライド
    window.ReferralManager.prototype.createReferralLink = async function(description = null) {
        try {
            const data = await createReferralLinkFixed(description);
            
            // リンクリストを再読み込み
            await this.loadReferralLinks();
            
            // フォームを隠す
            const linkForm = document.getElementById('link-form');
            if (linkForm) linkForm.style.display = 'none';
            
            const linkDescription = document.getElementById('link-description');
            if (linkDescription) linkDescription.value = '';
            
            this.showNotification('紹介リンクを作成しました', 'success');
        } catch (error) {
            this.showNotification(error.message || 'リンク作成に失敗しました', 'error');
        }
    };
    
    // loadStatsメソッドをオーバーライド
    window.ReferralManager.prototype.loadStats = async function() {
        console.log('[Referral] 統計情報読み込み中...');
        try {
            const data = await getReferralStatsFixed(this.user.id);
            
            if (data && data.length > 0) {
                const stats = data[0];
                console.log('[Referral] 統計データ:', stats);
                
                // DOM要素を更新
                const elements = {
                    'available-points': stats.available_points || 0,
                    'total-earned': stats.total_points_earned || 0,
                    'referral-count': stats.total_referrals || 0,
                    'conversion-rate': stats.conversion_rate || 0
                };
                
                for (const [id, value] of Object.entries(elements)) {
                    const element = document.getElementById(id);
                    if (element) {
                        element.textContent = value.toLocaleString();
                    }
                }
                
                // キャッシュアウトボタンの状態を更新
                this.updateCashoutButton(stats.available_points || 0);
            }
        } catch (error) {
            console.error('[Referral] 統計の読み込みエラー:', error);
            this.showNotification('統計の読み込みに失敗しました', 'error');
        }
    };
}

// グローバル関数も修正
window.createReferralLink = async function() {
    console.log('[Referral] createReferralLink関数呼び出し');
    const description = document.getElementById('link-description')?.value || null;
    
    if (window.referralManager) {
        await window.referralManager.createReferralLink(description);
    } else {
        console.error('[Referral] ReferralManagerが初期化されていません');
    }
};

console.log('[Referral] Enhanced Fix loaded');