// 紹介システムのメイン機能（詳細ログ付き）
console.log('[Referral] Script loaded');

class ReferralManager {
    constructor() {
        console.log('[Referral] ReferralManager constructor called');
        this.user = null;
        this.stats = null;
        this.currentShareLink = null;
        this.init();
    }

    async init() {
        console.log('[Referral] 初期化開始...');
        
        try {
            // ユーザー認証確認
            console.log('[Referral] ユーザー認証確認中...');
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error) {
                console.error('[Referral] 認証エラー:', error);
                console.error('[Referral] エラー詳細:', {
                    message: error.message,
                    status: error.status,
                    statusText: error.statusText
                });
                this.showNotification('認証エラーが発生しました', 'error');
                window.location.href = '/login.html';
                return;
            }
            
            if (!user) {
                console.log('[Referral] 未ログイン - ログインページへリダイレクト');
                window.location.href = '/login.html';
                return;
            }
            
            console.log('[Referral] ログインユーザー:', {
                id: user.id,
                email: user.email,
                role: user.role
            });
            this.user = user;

            // DOM要素の確認
            console.log('[Referral] DOM要素の確認...');
            this.checkDOMElements();

            // イベントリスナー設定
            console.log('[Referral] イベントリスナー設定中...');
            this.setupEventListeners();

            // データ読み込み
            console.log('[Referral] データ読み込み開始...');
            await this.loadStats();
            await this.loadReferralLinks();
            await this.loadReferralHistory();
            await this.loadCashoutHistory();

            // リアルタイム更新設定
            console.log('[Referral] リアルタイム更新設定中...');
            this.setupRealtimeSubscriptions();

            console.log('[Referral] 初期化完了');
        } catch (error) {
            console.error('[Referral] 初期化エラー:', error);
            console.error('[Referral] スタックトレース:', error.stack);
        }
    }

    checkDOMElements() {
        const elements = {
            'create-link-btn': document.getElementById('create-link-btn'),
            'cashout-btn': document.getElementById('cashout-btn'),
            'link-form': document.getElementById('link-form'),
            'link-description': document.getElementById('link-description'),
            'status-filter': document.getElementById('status-filter'),
            'available-points': document.getElementById('available-points'),
            'total-earned': document.getElementById('total-earned'),
            'referral-count': document.getElementById('referral-count'),
            'conversion-rate': document.getElementById('conversion-rate'),
            'links-list': document.getElementById('links-list'),
            'referral-list': document.getElementById('referral-list'),
            'cashout-list': document.getElementById('cashout-list')
        };

        for (const [id, element] of Object.entries(elements)) {
            if (element) {
                console.log(`[Referral] ✓ DOM要素 '${id}' が見つかりました`);
            } else {
                console.warn(`[Referral] ✗ DOM要素 '${id}' が見つかりません`);
            }
        }
    }

    setupEventListeners() {
        // リンク作成
        const createLinkBtn = document.getElementById('create-link-btn');
        if (createLinkBtn) {
            createLinkBtn.addEventListener('click', () => {
                console.log('[Referral] リンク作成ボタンクリック');
                const linkForm = document.getElementById('link-form');
                if (linkForm) {
                    linkForm.style.display = 'block';
                    const linkDescription = document.getElementById('link-description');
                    if (linkDescription) linkDescription.focus();
                } else {
                    console.error('[Referral] link-form要素が見つかりません');
                }
            });
        } else {
            console.warn('[Referral] create-link-btnが見つかりません');
        }

        // キャッシュアウト
        const cashoutBtn = document.getElementById('cashout-btn');
        if (cashoutBtn) {
            cashoutBtn.addEventListener('click', () => {
                console.log('[Referral] キャッシュアウトボタンクリック');
                if (window.cashoutModal) {
                    window.cashoutModal.open(this.stats?.available_points || 0);
                } else {
                    console.error('[Referral] cashoutModalが定義されていません');
                }
            });
        }

        // キャッシュアウトフォーム
        const cashoutForm = document.getElementById('cashout-form');
        if (cashoutForm) {
            cashoutForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('[Referral] キャッシュアウトフォーム送信');
                this.submitCashout();
            });
        }

        // ポイント数変更時の計算
        const cashoutPoints = document.getElementById('cashout-points');
        if (cashoutPoints) {
            cashoutPoints.addEventListener('input', (e) => {
                this.calculateCashout(e.target.value);
            });
        }

        // ステータスフィルター
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                console.log('[Referral] ステータスフィルター変更:', statusFilter.value);
                this.loadReferralHistory();
            });
        }
    }

    async loadStats() {
        console.log('[Referral] 統計情報読み込み中...');
        try {
            // 統計情報を取得
            const { data, error } = await supabase
                .rpc('get_referral_stats', { p_user_id: this.user.id });

            console.log('[Referral] 統計取得結果:', { data, error });

            if (error) {
                console.error('[Referral] 統計取得エラー:', error);
                throw error;
            }

            if (data && data.length > 0) {
                const stats = data[0];
                this.stats = stats;
                console.log('[Referral] 統計データ:', stats);

                // UI更新
                this.updateElement('available-points', (stats.available_points || 0).toLocaleString());
                this.updateElement('total-earned', (stats.total_points_earned || 0).toLocaleString());
                this.updateElement('referral-count', stats.total_completions || 0);
                this.updateElement('conversion-rate', (stats.conversion_rate || 0).toFixed(2));

                // キャッシュアウトボタンの有効化
                const cashoutBtn = document.getElementById('cashout-btn');
                if (cashoutBtn) {
                    if (stats.available_points >= 5000) {
                        cashoutBtn.disabled = false;
                        cashoutBtn.classList.add('enabled');
                        console.log('[Referral] キャッシュアウトボタン有効化');
                    } else {
                        cashoutBtn.disabled = true;
                        cashoutBtn.classList.remove('enabled');
                        console.log('[Referral] キャッシュアウトボタン無効化（ポイント不足）');
                    }
                }
            } else {
                console.log('[Referral] 統計データが空です');
            }
        } catch (error) {
            console.error('[Referral] 統計の読み込みエラー:', error);
            console.error('[Referral] エラー詳細:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            this.showNotification('統計の読み込みに失敗しました', 'error');
        }
    }

    async loadReferralLinks() {
        console.log('[Referral] 紹介リンク読み込み中...');
        try {
            const { data: links, error } = await supabase
                .from('invite_links')
                .select('*')
                .eq('created_by', this.user.id)
                .order('created_at', { ascending: false });

            console.log('[Referral] リンク取得結果:', { links, error });

            if (error) {
                console.error('[Referral] リンク取得エラー:', error);
                throw error;
            }

            const linksList = document.getElementById('links-list');
            if (!linksList) {
                console.error('[Referral] links-list要素が見つかりません');
                return;
            }
            
            if (!links || links.length === 0) {
                linksList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-link"></i>
                        <p>まだ紹介リンクがありません</p>
                        <p class="text-muted">「新しいリンクを作成」ボタンから作成してください</p>
                    </div>
                `;
                console.log('[Referral] 紹介リンクが0件です');
            } else {
                console.log(`[Referral] ${links.length}件の紹介リンクを表示`);
                linksList.innerHTML = links.map(link => this.renderLinkItem(link)).join('');
            }
        } catch (error) {
            console.error('[Referral] リンク読み込みエラー:', error);
            console.error('[Referral] エラー詳細:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
        }
    }
    
    async createReferralLink(description = null) {
        console.log('[Referral] 紹介リンク作成開始...', { description });
        try {
            const { data, error } = await supabase
                .rpc('create_invite_link', {
                    p_user_id: this.user.id,
                    p_description: description || null
                });
                
            console.log('[Referral] リンク作成結果:', { data, error });
                
            if (error) {
                console.error('[Referral] リンク作成エラー:', error);
                throw error;
            }
            
            console.log('[Referral] 作成されたリンク:', data);
            
            // リンクリストを再読み込み
            await this.loadReferralLinks();
            
            // フォームを隠す
            const linkForm = document.getElementById('link-form');
            if (linkForm) linkForm.style.display = 'none';
            
            const linkDescription = document.getElementById('link-description');
            if (linkDescription) linkDescription.value = '';
            
            this.showNotification('紹介リンクを作成しました', 'success');
        } catch (error) {
            console.error('[Referral] リンク作成エラー:', error);
            console.error('[Referral] エラー詳細:', {
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
        console.log('[Referral] リンクアイテムレンダリング:', { link_code: link.link_code, url });
        
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
                    <button onclick="deleteLink('${link.id}')" 
                            class="delete-button">
                        <i class="fas fa-trash"></i> 削除
                    </button>
                </div>
            </div>
        `;
    }

    async loadReferralHistory() {
        console.log('[Referral] 紹介履歴読み込み中...');
        const filter = document.getElementById('status-filter')?.value || 'all';
        console.log('[Referral] フィルター:', filter);

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
            } else if (filter === 'registered') {
                query = query.eq('status', 'registered');
            } else if (filter === 'completed') {
                query = query.eq('status', 'completed');
            } else if (filter === 'cancelled') {
                query = query.eq('status', 'cancelled');
            }

            const { data: referrals, error } = await query;

            console.log('[Referral] 紹介履歴取得結果:', { referrals, error });

            if (error) {
                console.error('[Referral] 紹介履歴エラー:', error);
                throw error;
            }

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
            } else {
                console.log(`[Referral] ${referrals.length}件の紹介履歴を表示`);
                referralsList.innerHTML = referrals.map(ref => this.renderReferralItem(ref)).join('');
            }
        } catch (error) {
            console.error('[Referral] 紹介履歴の読み込みエラー:', error);
            console.error('[Referral] エラー詳細:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
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
                        `<span class="reward-amount">+${referral.reward_points || 1000}pt</span>` : 
                        ''}
                </div>
            </div>
        `;
    }

    async loadCashoutHistory() {
        console.log('[Referral] キャッシュアウト履歴読み込み中...');
        try {
            const { data: cashouts, error } = await supabase
                .from('cashout_requests')
                .select('*')
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            console.log('[Referral] キャッシュアウト履歴取得結果:', { cashouts, error });

            if (error) {
                // 404エラーの場合はテーブルが存在しない
                if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
                    console.log('[Referral] cashout_requestsテーブルが存在しません');
                    const cashoutList = document.getElementById('cashout-list');
                    if (cashoutList) {
                        cashoutList.innerHTML = `
                            <div class="empty-state">
                                <i class="fas fa-money-check-alt"></i>
                                <p>キャッシュアウト履歴がありません</p>
                            </div>
                        `;
                    }
                    return;
                }
                throw error;
            }

            const cashoutList = document.getElementById('cashout-list');
            if (!cashoutList) {
                console.error('[Referral] cashout-list要素が見つかりません');
                return;
            }
            
            if (!cashouts || cashouts.length === 0) {
                cashoutList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-money-check-alt"></i>
                        <p>キャッシュアウト履歴がありません</p>
                    </div>
                `;
                console.log('[Referral] キャッシュアウト履歴が0件です');
            } else {
                console.log(`[Referral] ${cashouts.length}件のキャッシュアウト履歴を表示`);
                cashoutList.innerHTML = cashouts.map(cashout => this.renderCashoutItem(cashout)).join('');
            }
        } catch (error) {
            console.error('[Referral] キャッシュアウト履歴の読み込みエラー:', error);
            console.error('[Referral] エラー詳細:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
        }
    }

    renderCashoutItem(cashout) {
        const statusClass = this.getCashoutStatusClass(cashout.status);
        const statusText = this.getCashoutStatusText(cashout.status);
        
        return `
            <div class="cashout-item ${statusClass}">
                <div class="cashout-info">
                    <p class="cashout-amount">${cashout.amount.toLocaleString()}ポイント</p>
                    <p class="cashout-date">${this.formatDate(cashout.created_at)}</p>
                </div>
                <div class="cashout-details">
                    <p class="net-amount">振込額: ¥${cashout.net_amount.toLocaleString()}</p>
                    <p class="tax-amount">源泉徴収: ¥${cashout.tax_amount.toLocaleString()}</p>
                </div>
                <div class="cashout-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
        `;
    }

    setupRealtimeSubscriptions() {
        console.log('[Referral] リアルタイム更新設定中...');
        
        // 招待リンクの更新を監視
        supabase
            .channel('invite_links_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'invite_links',
                filter: `created_by=eq.${this.user.id}`
            }, (payload) => {
                console.log('[Referral] invite_links更新:', payload);
                this.loadReferralLinks();
            })
            .subscribe();

        // 招待状態の更新を監視
        supabase
            .channel('invitations_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'invitations',
                filter: `inviter_id=eq.${this.user.id}`
            }, (payload) => {
                console.log('[Referral] invitations更新:', payload);
                this.loadReferralHistory();
                this.loadStats();
            })
            .subscribe();
    }

    calculateCashout(points) {
        console.log('[Referral] キャッシュアウト計算:', points);
        const tax = Math.floor(points * 0.1021);
        const net = points - tax;
        
        const calcDiv = document.getElementById('cashout-calculation');
        if (calcDiv) {
            calcDiv.innerHTML = `
                <p>申請ポイント: ${points.toLocaleString()}pt</p>
                <p>源泉徴収税: -${tax.toLocaleString()}pt</p>
                <p class="net-amount">振込額: ¥${net.toLocaleString()}</p>
            `;
        }
    }

    async submitCashout() {
        console.log('[Referral] キャッシュアウト申請開始...');
        // 実装は省略
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            console.log(`[Referral] ${id}を更新: ${value}`);
        } else {
            console.warn(`[Referral] 要素 '${id}' が見つかりません`);
        }
    }

    getReferralStatusClass(referral) {
        if (referral.status === 'completed') return 'completed';
        if (referral.status === 'registered') return 'active';
        if (referral.status === 'cancelled') return 'cancelled';
        return 'pending';
    }

    getReferralStatusText(referral) {
        if (referral.status === 'completed') return '面談完了';
        if (referral.status === 'registered') return '登録済み';
        if (referral.status === 'cancelled') return 'キャンセル';
        return '登録待ち';
    }

    getCashoutStatusClass(status) {
        if (status === 'completed') return 'completed';
        if (status === 'processing') return 'processing';
        if (status === 'rejected') return 'rejected';
        return 'pending';
    }

    getCashoutStatusText(status) {
        if (status === 'completed') return '振込完了';
        if (status === 'processing') return '処理中';
        if (status === 'rejected') return '却下';
        return '申請中';
    }

    maskEmail(email) {
        if (!email) return '';
        const [name, domain] = email.split('@');
        const maskedName = name.substring(0, 2) + '***';
        return `${maskedName}@${domain}`;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    showNotification(message, type = 'info') {
        console.log(`[Referral] 通知表示 [${type}]:`, message);
        
        if (typeof INTERCONNECT !== 'undefined' && INTERCONNECT.showNotification) {
            INTERCONNECT.showNotification(message, type);
        } else {
            // フォールバック
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    }
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Referral] DOMContentLoaded - 初期化開始');
    window.referralManager = new ReferralManager();
});

// グローバル関数
window.copyLink = function(url) {
    console.log('[Referral] リンクコピー:', url);
    navigator.clipboard.writeText(url).then(() => {
        window.referralManager.showNotification('リンクをコピーしました', 'success');
    }).catch(err => {
        console.error('[Referral] コピーエラー:', err);
        window.referralManager.showNotification('コピーに失敗しました', 'error');
    });
};

window.shareLink = function(url, description) {
    console.log('[Referral] リンク共有:', { url, description });
    window.referralManager.currentShareLink = url;
    const modal = document.getElementById('share-modal');
    if (modal) {
        modal.classList.add('active');
    } else {
        console.error('[Referral] share-modal要素が見つかりません');
    }
};

window.deleteLink = async function(linkId) {
    console.log('[Referral] リンク削除:', linkId);
    if (!confirm('このリンクを削除しますか？')) return;
    
    try {
        const { error } = await supabase
            .from('invite_links')
            .update({ is_active: false })
            .eq('id', linkId);
            
        if (error) throw error;
        
        window.referralManager.showNotification('リンクを削除しました', 'success');
        window.referralManager.loadReferralLinks();
    } catch (error) {
        console.error('[Referral] リンク削除エラー:', error);
        window.referralManager.showNotification('削除に失敗しました', 'error');
    }
};

window.createReferralLink = function() {
    console.log('[Referral] createReferralLink関数呼び出し');
    const description = document.getElementById('link-description')?.value;
    window.referralManager.createReferralLink(description);
};

window.cancelLinkCreation = function() {
    console.log('[Referral] リンク作成キャンセル');
    const linkDescription = document.getElementById('link-description');
    if (linkDescription) linkDescription.value = '';
    
    const linkForm = document.getElementById('link-form');
    if (linkForm) linkForm.style.display = 'none';
};

window.closeShareModal = function() {
    console.log('[Referral] 共有モーダルクローズ');
    const modal = document.getElementById('share-modal');
    if (modal) {
        modal.classList.remove('active');
    }
};

// SNS共有関数
window.shareToTwitter = function() {
    const url = window.referralManager.currentShareLink;
    const text = document.getElementById('share-message')?.value || '';
    console.log('[Referral] Twitter共有:', { url, text });
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    window.closeShareModal();
};

window.shareToLine = function() {
    const url = window.referralManager.currentShareLink;
    const text = document.getElementById('share-message')?.value || '';
    console.log('[Referral] LINE共有:', { url, text });
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text + '\n' + url)}`;
    window.open(lineUrl, '_blank');
    window.closeShareModal();
};

window.shareToFacebook = function() {
    const url = window.referralManager.currentShareLink;
    console.log('[Referral] Facebook共有:', url);
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
    window.closeShareModal();
};

window.shareByEmail = function() {
    const url = window.referralManager.currentShareLink;
    const text = document.getElementById('share-message')?.value || '';
    console.log('[Referral] メール共有:', { url, text });
    const subject = 'INTERCONNECTへの招待';
    const body = `${text}\n\n${url}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.closeShareModal();
};

console.log('[Referral] Script setup complete');