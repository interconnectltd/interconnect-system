// 紹介システムのメイン機能
class ReferralManager {
    constructor() {
        this.user = null;
        this.stats = null;
        this.currentShareLink = null;
        this.init();
    }

    async init() {
        // ユーザー認証確認
        console.log('紹介システム初期化中...');
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('認証エラー:', error);
            this.showNotification('認証エラーが発生しました', 'error');
            window.location.href = '/login.html';
            return;
        }
        
        if (!user) {
            console.log('未ログイン - ログインページへリダイレクト');
            window.location.href = '/login.html';
            return;
        }
        
        console.log('ログインユーザー:', user.email);
        this.user = user;

        // イベントリスナー設定
        this.setupEventListeners();

        // データ読み込み
        await this.loadStats();
        await this.loadReferralLinks();
        await this.loadReferralHistory();
        await this.loadCashoutHistory();

        // リアルタイム更新設定
        this.setupRealtimeSubscriptions();
    }

    setupEventListeners() {
        // リンク作成
        document.getElementById('create-link-btn').addEventListener('click', () => {
            document.getElementById('link-form').style.display = 'block';
            document.getElementById('link-description').focus();
        });

        // キャッシュアウト
        document.getElementById('cashout-btn').addEventListener('click', () => {
            if (window.cashoutModal) {
                window.cashoutModal.open(this.stats.available_points || 0);
            }
        });

        // キャッシュアウトフォーム
        document.getElementById('cashout-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitCashout();
        });

        // ポイント数変更時の計算
        document.getElementById('cashout-points').addEventListener('input', (e) => {
            this.calculateCashout(e.target.value);
        });

        // ステータスフィルター
        document.getElementById('status-filter').addEventListener('change', () => {
            this.loadReferralHistory();
        });
    }

    async loadStats() {
        try {
            // 統計情報を取得
            const { data, error } = await supabase
                .rpc('get_referral_stats', { p_user_id: this.user.id });

            if (error) throw error;

            if (data && data.length > 0) {
                const stats = data[0];
                this.stats = stats;

                // UI更新
                document.getElementById('available-points').textContent = 
                    (stats.available_points || 0).toLocaleString();
                document.getElementById('total-earned').textContent = 
                    (stats.total_points_earned || 0).toLocaleString();
                document.getElementById('referral-count').textContent = 
                    stats.total_completions || 0;
                document.getElementById('conversion-rate').textContent = 
                    (stats.conversion_rate || 0).toFixed(2);

                // キャッシュアウトボタンの有効化
                const cashoutBtn = document.getElementById('cashout-btn');
                if (stats.available_points >= 5000) {
                    cashoutBtn.disabled = false;
                    cashoutBtn.classList.add('enabled');
                } else {
                    cashoutBtn.disabled = true;
                    cashoutBtn.classList.remove('enabled');
                }
            }
        } catch (error) {
            console.error('統計の読み込みエラー:', error);
            console.error('エラー詳細:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            this.showNotification('統計の読み込みに失敗しました', 'error');
        }
    }

    async loadReferralLinks() {
        try {
            const { data: links, error } = await supabase
                .from('invite_links')
                .select('*')
                .eq('created_by', this.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const linksList = document.getElementById('links-list');
            
            if (links.length === 0) {
                linksList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-link"></i>
                        <p>まだ紹介リンクがありません</p>
                        <p class="text-muted">「新しいリンクを作成」ボタンから作成してください</p>
                    </div>
                `;
            } else {
                linksList.innerHTML = links.map(link => this.renderLinkItem(link)).join('');
            }
        } catch (error) {
            console.error('リンク読み込みエラー:', error);
        }
    }
    
    async createReferralLink(description = null) {
        try {
            console.log('紹介リンク作成中...', { description });
            
            const { data, error } = await supabase
                .rpc('create_invite_link', {
                    p_user_id: this.user.id,
                    p_description: description || null
                });
                
            if (error) throw error;
            
            console.log('作成されたリンク:', data);
            
            // リンクリストを再読み込み
            await this.loadReferralLinks();
            
            // フォームを隠す
            document.getElementById('link-form').style.display = 'none';
            document.getElementById('link-description').value = '';
            
            this.showNotification('紹介リンクを作成しました', 'success');
        } catch (error) {
            console.error('リンク作成エラー:', error);
            console.error('エラー詳細:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            this.showNotification('リンク作成に失敗しました', 'error');
        }
    }

    renderLinkItem(link) {
        const url = `${window.location.origin}/invite/${link.link_code}`;
        return `
            <div class="link-item" data-link-id="${link.id}">
                <div class="link-info">
                    <p class="link-description">${link.description || '紹介リンク'}</p>
                    <p class="link-stats">
                        <span><i class="fas fa-user-plus"></i> 登録: ${link.registration_count || 0}人</span>
                        <span><i class="fas fa-check-circle"></i> 完了: ${link.completion_count || 0}人</span>
                        <span><i class="fas fa-coins"></i> 獲得: ${(link.total_rewards_earned || 0).toLocaleString()}pt</span>
                    </p>
                </div>
                <div class="link-url">
                    <input type="text" value="${url}" readonly>
                    <button onclick="copyLink('${url}')" class="copy-button" title="コピー">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <div class="link-actions">
                    <button onclick="shareLink('${url}', '${link.description || '紹介リンク'}')" 
                            class="share-button">
                        <i class="fas fa-share-alt"></i> 共有
                    </button>
                    <button onclick="generateQR('${url}')" class="qr-button">
                        <i class="fas fa-qrcode"></i> QR
                    </button>
                    <button onclick="deleteLink('${link.id}')" class="delete-button" title="削除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    async createReferralLink() {
        const description = document.getElementById('link-description').value.trim();

        try {
            // リンクコードを生成
            const linkCode = this.generateLinkCode();

            const { data, error } = await supabase
                .from('invite_links')
                .insert({
                    created_by: this.user.id,
                    link_code: linkCode,
                    description: description || '紹介リンク',
                    is_active: true,
                    metadata: {
                        created_via: 'referral_system',
                        created_at: new Date().toISOString()
                    }
                })
                .select()
                .single();

            if (error) throw error;

            this.showNotification('リンクを作成しました', 'success');
            document.getElementById('link-description').value = '';
            document.getElementById('link-form').style.display = 'none';
            
            // リンク一覧を再読み込み
            await this.loadReferralLinks();
        } catch (error) {
            console.error('リンク作成エラー:', error);
            this.showNotification('リンクの作成に失敗しました', 'error');
        }
    }

    generateLinkCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    async loadReferralHistory() {
        const filter = document.getElementById('status-filter').value;

        try {
            let query = supabase
                .from('invitations')
                .select('*')
                .eq('inviter_id', this.user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            // フィルター適用
            if (filter === 'pending') {
                query = query.eq('status', 'pending');
            } else if (filter === 'accepted') {
                query = query.eq('status', 'accepted').eq('reward_status', 'pending');
            } else if (filter === 'earned') {
                query = query.eq('reward_status', 'earned');
            }

            const { data: referrals, error } = await query;

            if (error) throw error;

            const referralsList = document.getElementById('referral-list');
            
            if (!referrals || referrals.length === 0) {
                referralsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-friends"></i>
                        <p>紹介履歴がありません</p>
                    </div>
                `;
            } else {
                referralsList.innerHTML = referrals.map(ref => this.renderReferralItem(ref)).join('');
            }
        } catch (error) {
            console.error('紹介履歴の読み込みエラー:', error);
        }
    }

    renderReferralItem(referral) {
        const statusClass = this.getReferralStatusClass(referral);
        const statusText = this.getReferralStatusText(referral);
        const displayEmail = this.maskEmail(referral.invitee_email);
        
        return `
            <div class="referral-item ${statusClass}">
                <div class="referral-info">
                    <p class="referral-email">${displayEmail}</p>
                    <p class="referral-date">${this.formatDate(referral.created_at)}</p>
                </div>
                <div class="referral-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    ${referral.reward_status === 'earned' ? 
                        `<span class="reward-amount">+${referral.reward_points}pt</span>` : 
                        ''}
                </div>
            </div>
        `;
    }

    getReferralStatusClass(referral) {
        if (referral.reward_status === 'earned') return 'status-earned';
        if (referral.status === 'accepted') return 'status-accepted';
        if (referral.status === 'pending') return 'status-pending';
        return 'status-cancelled';
    }

    getReferralStatusText(referral) {
        if (referral.reward_status === 'earned') return '報酬獲得';
        if (referral.status === 'accepted') return '登録済み';
        if (referral.status === 'pending') return '招待中';
        return 'キャンセル';
    }

    async loadCashoutHistory() {
        try {
            const { data: cashouts, error } = await supabase
                .from('cashout_requests')
                .select('*')
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            const cashoutList = document.getElementById('cashout-list');
            
            if (!cashouts || cashouts.length === 0) {
                cashoutList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-money-bill-wave"></i>
                        <p>キャッシュアウト履歴はありません</p>
                    </div>
                `;
            } else {
                cashoutList.innerHTML = cashouts.map(cashout => 
                    this.renderCashoutItem(cashout)
                ).join('');
            }
        } catch (error) {
            console.error('キャッシュアウト履歴の読み込みエラー:', error);
        }
    }

    renderCashoutItem(cashout) {
        const statusClass = this.getCashoutStatusClass(cashout.status);
        const statusText = this.getCashoutStatusText(cashout.status);
        
        return `
            <div class="cashout-item">
                <div class="cashout-info">
                    <p class="cashout-number">${cashout.request_number}</p>
                    <p class="cashout-date">${this.formatDate(cashout.created_at)}</p>
                </div>
                <div class="cashout-amount">
                    <p class="points">${cashout.points_amount.toLocaleString()}pt</p>
                    <p class="net-amount">¥${cashout.net_amount.toLocaleString()}</p>
                </div>
                <div class="cashout-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
        `;
    }

    getCashoutStatusClass(status) {
        const classes = {
            'pending': 'status-pending',
            'reviewing': 'status-reviewing',
            'approved': 'status-approved',
            'processing': 'status-processing',
            'completed': 'status-completed',
            'rejected': 'status-rejected',
            'cancelled': 'status-cancelled'
        };
        return classes[status] || 'status-unknown';
    }

    getCashoutStatusText(status) {
        const texts = {
            'pending': '申請中',
            'reviewing': '審査中',
            'approved': '承認済み',
            'processing': '処理中',
            'completed': '完了',
            'rejected': '却下',
            'cancelled': 'キャンセル'
        };
        return texts[status] || '不明';
    }

    // 新しいキャッシュアウトモーダルを使用するため、古いメソッドは削除

    calculateCashout(points) {
        const pointsNum = parseInt(points) || 0;
        const taxRate = 0.1021;
        const taxAmount = Math.floor(pointsNum * taxRate);
        const netAmount = pointsNum - taxAmount;

        const calculation = document.getElementById('cashout-calculation');
        calculation.innerHTML = `
            <div class="calculation-row">
                <span>交換ポイント:</span>
                <span>${pointsNum.toLocaleString()}pt</span>
            </div>
            <div class="calculation-row">
                <span>源泉徴収税 (10.21%):</span>
                <span class="text-danger">-${taxAmount.toLocaleString()}円</span>
            </div>
            <div class="calculation-row total">
                <span>振込金額:</span>
                <span class="text-primary">¥${netAmount.toLocaleString()}</span>
            </div>
        `;
    }

    async submitCashout() {
        const form = document.getElementById('cashout-form');
        const submitButton = form.querySelector('button[type="submit"]');
        
        // ボタンを無効化
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 処理中...';

        try {
            const cashoutData = {
                user_id: this.user.id,
                request_number: this.generateRequestNumber(),
                points_amount: parseInt(document.getElementById('cashout-points').value),
                cash_amount: parseInt(document.getElementById('cashout-points').value),
                tax_amount: Math.floor(parseInt(document.getElementById('cashout-points').value) * 0.1021),
                net_amount: parseInt(document.getElementById('cashout-points').value) - Math.floor(parseInt(document.getElementById('cashout-points').value) * 0.1021),
                bank_details: {
                    bank_name: document.getElementById('bank-name').value,
                    branch_name: document.getElementById('branch-name').value,
                    account_type: document.getElementById('account-type').value,
                    account_number: document.getElementById('account-number').value,
                    account_holder: document.getElementById('account-holder').value
                },
                tax_info: {
                    withholding_rate: 0.1021,
                    calculation_date: new Date().toISOString()
                },
                status: 'pending'
            };

            const { error } = await supabase
                .from('cashout_requests')
                .insert(cashoutData);

            if (error) throw error;

            // ポイントを減算
            const { error: pointError } = await supabase
                .from('point_transactions')
                .insert({
                    user_id: this.user.id,
                    transaction_type: 'withdrawn',
                    points: -cashoutData.points_amount,
                    reason: `キャッシュアウト申請: ${cashoutData.request_number}`,
                    related_id: cashoutData.id,
                    related_type: 'cashout'
                });

            if (pointError) throw pointError;

            this.showNotification('キャッシュアウト申請を受け付けました', 'success');
            this.closeCashoutModal();
            
            // データを再読み込み
            await this.loadStats();
            await this.loadCashoutHistory();

        } catch (error) {
            console.error('キャッシュアウト申請エラー:', error);
            this.showNotification('申請に失敗しました', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> 申請する';
        }
    }

    generateRequestNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `CO${year}${month}${random}`;
    }

    setupRealtimeSubscriptions() {
        // ポイント残高の更新を監視
        supabase
            .channel('user-points-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'user_points',
                filter: `user_id=eq.${this.user.id}`
            }, () => {
                this.loadStats();
            })
            .subscribe();

        // 招待状態の更新を監視
        supabase
            .channel('invitation-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'invitations',
                filter: `inviter_id=eq.${this.user.id}`
            }, () => {
                this.loadReferralHistory();
                this.loadStats();
            })
            .subscribe();
    }

    // ユーティリティメソッド
    maskEmail(email) {
        if (!email) return '';
        const [name, domain] = email.split('@');
        if (!name || !domain) return email;
        const maskedName = name.substring(0, 2) + '***';
        return `${maskedName}@${domain}`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);

        // アニメーション
        setTimeout(() => notification.classList.add('show'), 10);

        // 自動削除
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// グローバル関数
window.copyLink = function(url) {
    navigator.clipboard.writeText(url).then(() => {
        window.referralManager.showNotification('リンクをコピーしました', 'success');
    }).catch(() => {
        // フォールバック
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        window.referralManager.showNotification('リンクをコピーしました', 'success');
    });
};

window.shareLink = function(url, description) {
    window.referralManager.currentShareLink = url;
    const modal = document.getElementById('share-modal');
    modal.classList.add('active');
};

window.generateQR = function(url) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    window.open(qrUrl, '_blank');
};

window.deleteLink = async function(linkId) {
    if (!confirm('このリンクを削除しますか？')) return;

    try {
        const { error } = await supabase
            .from('invite_links')
            .update({ is_active: false })
            .eq('id', linkId);

        if (error) throw error;

        window.referralManager.showNotification('リンクを削除しました', 'success');
        await window.referralManager.loadReferralLinks();
    } catch (error) {
        console.error('リンク削除エラー:', error);
        window.referralManager.showNotification('削除に失敗しました', 'error');
    }
};

window.createReferralLink = function() {
    const description = document.getElementById('link-description').value;
    window.referralManager.createReferralLink(description);
};

window.cancelLinkCreation = function() {
    document.getElementById('link-description').value = '';
    document.getElementById('link-form').style.display = 'none';
};

// 新しいキャッシュアウトモーダルを使用するため、古い関数は削除

window.closeShareModal = function() {
    const modal = document.getElementById('share-modal');
    modal.classList.remove('active');
};

// SNS共有関数
window.shareToTwitter = function() {
    const url = window.referralManager.currentShareLink;
    const text = document.getElementById('share-message').value;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    window.closeShareModal();
};

window.shareToLine = function() {
    const url = window.referralManager.currentShareLink;
    const text = document.getElementById('share-message').value;
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text + '\n' + url)}`;
    window.open(lineUrl, '_blank');
    window.closeShareModal();
};

window.shareToFacebook = function() {
    const url = window.referralManager.currentShareLink;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
    window.closeShareModal();
};

window.shareByEmail = function() {
    const url = window.referralManager.currentShareLink;
    const text = document.getElementById('share-message').value;
    const subject = 'INTERCONNECTへの招待';
    const body = `${text}\n\n${url}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.closeShareModal();
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    window.referralManager = new ReferralManager();
});