/**
 * 紹介プログラム管理画面
 */

class AdminReferralManager {
    constructor() {
        this.currentTab = 'overview';
        this.charts = {};
        this.init();
    }

    async init() {
        // 管理者権限チェック
        await this.checkAdminAuth();
        
        // イベントリスナー設定
        this.setupEventListeners();
        
        // 初期データ読み込み
        await this.loadDashboardData();
        
        // リアルタイム更新の設定
        this.setupRealtimeUpdates();
    }

    async checkAdminAuth() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = '/admin-login.html';
            return;
        }

        // 管理者権限チェック
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!profile?.is_admin) {
            // alert('管理者権限がありません');
            if (window.showError) {
                showError('管理者権限がありません');
            }
            window.location.href = '/dashboard.html';
        }
    }

    setupEventListeners() {
        // タブ切り替え
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // フィルター
        document.getElementById('referral-status-filter')?.addEventListener('change', () => {
            this.filterReferrals();
        });

        document.getElementById('cashout-status-filter')?.addEventListener('change', () => {
            this.filterCashouts();
        });

        document.getElementById('fraud-severity-filter')?.addEventListener('change', () => {
            this.filterFraudFlags();
        });

        // 検索
        document.getElementById('referral-search')?.addEventListener('input', (e) => {
            this.searchReferrals(e.target.value);
        });

        // モーダルクローズ
        document.querySelector('.modal-close')?.addEventListener('click', () => {
            this.closeModal();
        });
    }

    switchTab(tabName) {
        // タブボタンの切り替え
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabName);
        });

        // タブコンテンツの切り替え
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}-tab`);
        });

        this.currentTab = tabName;

        // タブ別のデータ読み込み
        switch (tabName) {
            case 'overview':
                this.loadOverviewData();
                break;
            case 'referrals':
                this.loadReferralsData();
                break;
            case 'cashouts':
                this.loadCashoutsData();
                break;
            case 'fraud':
                this.loadFraudData();
                break;
            case 'analytics':
                this.loadAnalyticsData();
                break;
        }
    }

    async loadDashboardData() {
        try {
            // 統計データの取得
            const [
                totalReferrers,
                successfulReferrals,
                totalRewards,
                suspiciousUsers
            ] = await Promise.all([
                this.getTotalReferrers(),
                this.getSuccessfulReferrals(),
                this.getTotalRewards(),
                this.getSuspiciousUsers()
            ]);

            // 統計表示を更新
            document.getElementById('total-referrers').textContent = totalReferrers.toLocaleString();
            document.getElementById('successful-referrals').textContent = successfulReferrals.toLocaleString();
            document.getElementById('total-rewards').textContent = `¥${totalRewards.toLocaleString()}`;
            document.getElementById('suspicious-users').textContent = suspiciousUsers.toLocaleString();

            // 概要データの読み込み
            await this.loadOverviewData();

        } catch (error) {
            console.error('ダッシュボードデータの読み込みエラー:', error);
            this.showNotification('データの読み込みに失敗しました', 'error');
        }
    }

    async getTotalReferrers() {
        const { count } = await supabase
            .from('invite_links')
            .select('*', { count: 'exact', head: true })
            .gt('used_count', 0);
        return count || 0;
    }

    async getSuccessfulReferrals() {
        const { count } = await supabase
            .from('invitations')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed');
        return count || 0;
    }

    async getTotalRewards() {
        const { data } = await supabase
            .from('user_points')
            .select('total_earned');
        
        return data?.reduce((sum, user) => sum + (user.total_earned || 0), 0) || 0;
    }

    async getSuspiciousUsers() {
        const { count } = await supabase
            .from('fraud_flags')
            .select('*', { count: 'exact', head: true })
            .eq('resolved', false);
        return count || 0;
    }

    async loadOverviewData() {
        // 最新の紹介活動
        await this.loadRecentActivity();
        
        // トップ紹介者
        await this.loadTopReferrers();
    }

    async loadRecentActivity() {
        try {
            const { data: activities } = await supabase
                .from('invitations')
                .select(`
                    *,
                    inviter:profiles!invitations_inviter_id_fkey(name, company),
                    invitee:profiles!invitations_invitee_id_fkey(name, company)
                `)
                .order('created_at', { ascending: false })
                .limit(10);

            const activityHtml = activities?.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon ${this.getActivityIconClass(activity.status)}">
                        <i class="${this.getActivityIcon(activity.status)}"></i>
                    </div>
                    <div class="activity-content">
                        <p class="activity-text">
                            <strong>${activity.inviter?.name || '不明'}</strong> が
                            <strong>${activity.invitee?.name || '未登録'}</strong> を招待
                        </p>
                        <p class="activity-time">${this.formatRelativeTime(activity.created_at)}</p>
                    </div>
                    <div class="activity-status">
                        <span class="status-badge ${activity.status}">
                            ${this.getStatusText(activity.status)}
                        </span>
                    </div>
                </div>
            `).join('') || '<p class="empty-state">活動履歴がありません</p>';

            document.getElementById('recent-activity').innerHTML = activityHtml;

        } catch (error) {
            console.error('最新活動の読み込みエラー:', error);
        }
    }

    async loadTopReferrers() {
        try {
            const { data: referrers } = await supabase
                .rpc('get_top_referrers', { limit_count: 5 });

            const referrersHtml = referrers?.map((referrer, index) => `
                <div class="referrer-item">
                    <div class="referrer-rank">${index + 1}</div>
                    <div class="referrer-info">
                        <p class="referrer-name">${referrer.name}</p>
                        <p class="referrer-company">${referrer.company || '未設定'}</p>
                    </div>
                    <div class="referrer-stats">
                        <span class="stat">
                            <i class="fas fa-user-plus"></i> ${referrer.referral_count}
                        </span>
                        <span class="stat">
                            <i class="fas fa-check-circle"></i> ${referrer.successful_count}
                        </span>
                        <span class="stat">
                            <i class="fas fa-coins"></i> ${referrer.total_points?.toLocaleString() || 0}pt
                        </span>
                    </div>
                </div>
            `).join('') || '<p class="empty-state">データがありません</p>';

            document.getElementById('top-referrers').innerHTML = referrersHtml;

        } catch (error) {
            console.error('トップ紹介者の読み込みエラー:', error);
        }
    }

    async loadReferralsData() {
        try {
            const { data: referrals } = await supabase
                .from('invitations')
                .select(`
                    *,
                    inviter:profiles!invitations_inviter_id_fkey(name, email, company),
                    invitee:profiles!invitations_invitee_id_fkey(name, email, company),
                    reward_status:reward_processing_status(status, reward_amount)
                `)
                .order('created_at', { ascending: false });

            this.renderReferralsTable(referrals || []);

        } catch (error) {
            console.error('紹介一覧の読み込みエラー:', error);
        }
    }

    renderReferralsTable(referrals) {
        const tbody = document.querySelector('#referrals-table tbody');
        
        const html = referrals.map(referral => `
            <tr>
                <td>${this.formatDate(referral.created_at)}</td>
                <td>
                    <div class="user-info">
                        <span class="name">${referral.inviter?.name || '不明'}</span>
                        <span class="email">${referral.inviter?.email || ''}</span>
                    </div>
                </td>
                <td>
                    <div class="user-info">
                        <span class="name">${referral.invitee?.name || '未登録'}</span>
                        <span class="email">${referral.invitee?.email || ''}</span>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${referral.status}">
                        ${this.getStatusText(referral.status)}
                    </span>
                </td>
                <td>
                    ${referral.reward_status?.status === 'completed' 
                        ? `<span class="reward-amount">¥${referral.reward_status.reward_amount.toLocaleString()}</span>`
                        : '<span class="text-muted">-</span>'
                    }
                </td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="adminReferral.viewReferralDetails('${referral.id}')">
                        詳細
                    </button>
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html || '<tr><td colspan="6" class="text-center">データがありません</td></tr>';
    }

    async loadCashoutsData() {
        try {
            const { data: cashouts } = await supabase
                .from('cashout_requests')
                .select(`
                    *,
                    user:profiles!cashout_requests_user_id_fkey(name, email, company)
                `)
                .order('created_at', { ascending: false });

            this.renderCashoutsTable(cashouts || []);

        } catch (error) {
            console.error('キャッシュアウト一覧の読み込みエラー:', error);
        }
    }

    renderCashoutsTable(cashouts) {
        const tbody = document.querySelector('#cashouts-table tbody');
        
        const html = cashouts.map(cashout => `
            <tr>
                <td>${this.formatDate(cashout.created_at)}</td>
                <td>
                    <div class="user-info">
                        <span class="name">${cashout.user?.name || '不明'}</span>
                        <span class="email">${cashout.user?.email || ''}</span>
                    </div>
                </td>
                <td>¥${cashout.amount.toLocaleString()}</td>
                <td class="text-danger">-¥${cashout.tax_amount.toLocaleString()}</td>
                <td class="text-success">¥${cashout.net_amount.toLocaleString()}</td>
                <td>
                    <span class="status-badge ${cashout.status}">
                        ${this.getCashoutStatusText(cashout.status)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="adminReferral.viewCashoutDetails('${cashout.id}')">
                        詳細
                    </button>
                    ${cashout.status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="adminReferral.approveCashout('${cashout.id}')">
                            承認
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminReferral.rejectCashout('${cashout.id}')">
                            却下
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html || '<tr><td colspan="7" class="text-center">データがありません</td></tr>';
    }

    async loadFraudData() {
        // 不正フラグ一覧
        await this.loadFraudFlags();
        
        // IP統計
        await this.loadIPStats();
    }

    async loadFraudFlags() {
        try {
            const { data: flags } = await supabase
                .from('fraud_flags')
                .select(`
                    *,
                    user:profiles!fraud_flags_user_id_fkey(name, email, company)
                `)
                .eq('resolved', false)
                .order('created_at', { ascending: false });

            const flagsHtml = flags?.map(flag => `
                <div class="fraud-flag-item ${flag.severity}">
                    <div class="flag-header">
                        <div class="flag-user">
                            <i class="fas fa-user"></i>
                            <span>${flag.user?.name || '不明'} (${flag.user?.email || ''})</span>
                        </div>
                        <div class="flag-meta">
                            <span class="severity-badge ${flag.severity}">
                                ${flag.severity === 'high' ? '高' : flag.severity === 'medium' ? '中' : '低'}
                            </span>
                            <span class="flag-type">${this.getFlagTypeText(flag.flag_type)}</span>
                        </div>
                    </div>
                    <div class="flag-details">
                        ${this.formatFlagDetails(flag.details)}
                    </div>
                    <div class="flag-actions">
                        <button class="btn btn-sm btn-primary" onclick="adminReferral.investigateUser('${flag.user_id}')">
                            調査
                        </button>
                        <button class="btn btn-sm btn-success" onclick="adminReferral.resolveFlag('${flag.id}')">
                            解決済みにする
                        </button>
                    </div>
                </div>
            `).join('') || '<p class="empty-state">不正フラグはありません</p>';

            document.getElementById('fraud-flags').innerHTML = flagsHtml;

        } catch (error) {
            console.error('不正フラグの読み込みエラー:', error);
        }
    }

    async loadIPStats() {
        try {
            const { data: ipStats } = await supabase
                .from('ip_registration_stats')
                .select('*')
                .order('user_count', { ascending: false })
                .limit(20);

            const ipStatsHtml = ipStats?.map(stat => `
                <div class="ip-stat-item ${stat.user_count > 5 ? 'warning' : ''}">
                    <div class="ip-address">
                        <i class="fas fa-network-wired"></i>
                        <span>${stat.ip_address}</span>
                    </div>
                    <div class="ip-stats">
                        <span class="stat">
                            <i class="fas fa-users"></i> ${stat.user_count} ユーザー
                        </span>
                        <span class="stat">
                            <i class="fas fa-clock"></i> 
                            ${this.formatDate(stat.first_registration)} 〜 
                            ${this.formatDate(stat.last_registration)}
                        </span>
                    </div>
                    <button class="btn btn-sm btn-outline" onclick="adminReferral.viewIPDetails('${stat.ip_address}')">
                        詳細
                    </button>
                </div>
            `).join('') || '<p class="empty-state">データがありません</p>';

            document.getElementById('ip-stats').innerHTML = ipStatsHtml;

        } catch (error) {
            console.error('IP統計の読み込みエラー:', error);
        }
    }

    async loadAnalyticsData() {
        // チャートの初期化
        this.initializeCharts();
        
        // データの読み込み
        await this.updateAnalytics();
    }

    initializeCharts() {
        // 既存のチャートを破棄
        Object.values(this.charts).forEach(chart => chart.destroy());
        
        // チャート設定
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        };

        // 紹介数推移チャート
        const referralsCtx = document.getElementById('referrals-chart').getContext('2d');
        this.charts.referrals = new Chart(referralsCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '紹介数',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }]
            },
            options: chartOptions
        });

        // 報酬額推移チャート
        const rewardsCtx = document.getElementById('rewards-chart').getContext('2d');
        this.charts.rewards = new Chart(rewardsCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: '報酬額',
                    data: [],
                    backgroundColor: '#48bb78'
                }]
            },
            options: chartOptions
        });

        // 成功率推移チャート
        const successRateCtx = document.getElementById('success-rate-chart').getContext('2d');
        this.charts.successRate = new Chart(successRateCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '成功率',
                    data: [],
                    borderColor: '#f56565',
                    backgroundColor: 'rgba(245, 101, 101, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                ...chartOptions,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });

        // ユーザー別分布チャート
        const distributionCtx = document.getElementById('distribution-chart').getContext('2d');
        this.charts.distribution = new Chart(distributionCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#667eea',
                        '#48bb78',
                        '#f56565',
                        '#ed8936',
                        '#38b2ac'
                    ]
                }]
            },
            options: {
                ...chartOptions,
                plugins: {
                    legend: {
                        display: true,
                        position: 'right'
                    }
                }
            }
        });
    }

    async updateAnalytics() {
        const startDate = document.getElementById('analytics-start-date').value || 
                         new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = document.getElementById('analytics-end-date').value || 
                       new Date().toISOString().split('T')[0];

        try {
            // 分析データの取得
            const analyticsData = await supabase
                .rpc('get_referral_analytics', {
                    start_date: startDate,
                    end_date: endDate
                });

            // チャートの更新
            this.updateChartsWithData(analyticsData.data);

        } catch (error) {
            console.error('分析データの読み込みエラー:', error);
        }
    }

    updateChartsWithData(data) {
        if (!data) return;

        // 紹介数推移
        if (data.daily_referrals) {
            this.charts.referrals.data.labels = data.daily_referrals.map(d => d.date);
            this.charts.referrals.data.datasets[0].data = data.daily_referrals.map(d => d.count);
            this.charts.referrals.update();
        }

        // 報酬額推移
        if (data.daily_rewards) {
            this.charts.rewards.data.labels = data.daily_rewards.map(d => d.date);
            this.charts.rewards.data.datasets[0].data = data.daily_rewards.map(d => d.amount);
            this.charts.rewards.update();
        }

        // 成功率推移
        if (data.success_rates) {
            this.charts.successRate.data.labels = data.success_rates.map(d => d.date);
            this.charts.successRate.data.datasets[0].data = data.success_rates.map(d => d.rate);
            this.charts.successRate.update();
        }

        // ユーザー別分布
        if (data.user_distribution) {
            this.charts.distribution.data.labels = data.user_distribution.map(d => d.name);
            this.charts.distribution.data.datasets[0].data = data.user_distribution.map(d => d.count);
            this.charts.distribution.update();
        }
    }

    setupRealtimeUpdates() {
        // 紹介の更新を監視
        supabase
            .channel('admin-referrals')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'invitations'
            }, () => {
                this.loadDashboardData();
            })
            .subscribe();

        // キャッシュアウトの更新を監視
        supabase
            .channel('admin-cashouts')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'cashout_requests'
            }, () => {
                if (this.currentTab === 'cashouts') {
                    this.loadCashoutsData();
                }
            })
            .subscribe();
    }

    // ヘルパーメソッド
    getActivityIconClass(status) {
        const classes = {
            pending: 'pending',
            registered: 'info',
            completed: 'success',
            cancelled: 'danger'
        };
        return classes[status] || 'default';
    }

    getActivityIcon(status) {
        const icons = {
            pending: 'fas fa-clock',
            registered: 'fas fa-user-check',
            completed: 'fas fa-check-circle',
            cancelled: 'fas fa-times-circle'
        };
        return icons[status] || 'fas fa-circle';
    }

    getStatusText(status) {
        const texts = {
            pending: '招待中',
            registered: '登録済み',
            completed: '完了',
            cancelled: 'キャンセル'
        };
        return texts[status] || status;
    }

    getCashoutStatusText(status) {
        const texts = {
            pending: '申請中',
            approved: '承認済み',
            processing: '処理中',
            completed: '完了',
            rejected: '却下'
        };
        return texts[status] || status;
    }

    getFlagTypeText(type) {
        const texts = {
            duplicate_ip: '重複IP',
            rapid_registration: '大量登録',
            suspicious_pattern: '不審なパターン'
        };
        return texts[type] || type;
    }

    formatFlagDetails(details) {
        if (!details) return '';
        
        return Object.entries(details)
            .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
            .join('');
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 60) return `${minutes}分前`;
        if (hours < 24) return `${hours}時間前`;
        return `${days}日前`;
    }

    showNotification(message, type = 'info') {
        // 通知表示の実装
        // console.log(`[${type}] ${message}`);
    }

    // モーダル関連
    async viewReferralDetails(referralId) {
        // 紹介詳細をモーダルで表示
        const { data: referral } = await supabase
            .from('invitations')
            .select(`
                *,
                inviter:profiles!invitations_inviter_id_fkey(*),
                invitee:profiles!invitations_invitee_id_fkey(*),
                invite_link:invite_links!invitations_invite_code_fkey(*)
            `)
            .eq('id', referralId)
            .single();

        this.showDetailModal('紹介詳細', this.renderReferralDetails(referral));
    }

    renderReferralDetails(referral) {
        return `
            <div class="detail-grid">
                <div class="detail-section">
                    <h3>紹介者情報</h3>
                    <p><strong>名前:</strong> ${referral.inviter?.name || '不明'}</p>
                    <p><strong>会社:</strong> ${referral.inviter?.company || '未設定'}</p>
                    <p><strong>メール:</strong> ${referral.inviter?.email || '不明'}</p>
                </div>
                <div class="detail-section">
                    <h3>被紹介者情報</h3>
                    <p><strong>名前:</strong> ${referral.invitee?.name || '未登録'}</p>
                    <p><strong>会社:</strong> ${referral.invitee?.company || '未設定'}</p>
                    <p><strong>メール:</strong> ${referral.invitee?.email || '不明'}</p>
                </div>
                <div class="detail-section">
                    <h3>紹介情報</h3>
                    <p><strong>招待コード:</strong> ${referral.invite_code}</p>
                    <p><strong>作成日:</strong> ${this.formatDate(referral.created_at)}</p>
                    <p><strong>登録日:</strong> ${referral.registered_at ? this.formatDate(referral.registered_at) : '-'}</p>
                    <p><strong>完了日:</strong> ${referral.completed_at ? this.formatDate(referral.completed_at) : '-'}</p>
                </div>
            </div>
        `;
    }

    showDetailModal(title, content, actions = '') {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal-footer').innerHTML = actions || `
            <button class="btn btn-secondary" onclick="adminReferral.closeModal()">閉じる</button>
        `;
        document.getElementById('detail-modal').classList.add('show');
    }

    closeModal() {
        document.getElementById('detail-modal').classList.remove('show');
    }

    // アクション
    async approveCashout(cashoutId) {
        if (!confirm('このキャッシュアウト申請を承認しますか？')) return;

        try {
            const { error } = await supabase
                .from('cashout_requests')
                .update({ 
                    status: 'approved',
                    approved_at: new Date().toISOString(),
                    approved_by: (await supabase.auth.getUser()).data.user.id
                })
                .eq('id', cashoutId);

            if (error) throw error;

            this.showNotification('キャッシュアウトを承認しました', 'success');
            this.loadCashoutsData();

        } catch (error) {
            console.error('承認エラー:', error);
            this.showNotification('承認に失敗しました', 'error');
        }
    }

    async rejectCashout(cashoutId) {
        const reason = prompt('却下理由を入力してください:');
        if (!reason) return;

        try {
            const { error } = await supabase
                .from('cashout_requests')
                .update({ 
                    status: 'rejected',
                    rejection_reason: reason,
                    rejected_at: new Date().toISOString(),
                    rejected_by: (await supabase.auth.getUser()).data.user.id
                })
                .eq('id', cashoutId);

            if (error) throw error;

            // ポイントを返却
            const { data: cashout } = await supabase
                .from('cashout_requests')
                .select('user_id, amount')
                .eq('id', cashoutId)
                .single();

            await supabase.rpc('add_user_points', {
                p_user_id: cashout.user_id,
                p_amount: cashout.amount
            });

            this.showNotification('キャッシュアウトを却下しました', 'success');
            this.loadCashoutsData();

        } catch (error) {
            console.error('却下エラー:', error);
            this.showNotification('却下に失敗しました', 'error');
        }
    }

    async resolveFlag(flagId) {
        if (!confirm('このフラグを解決済みにしますか？')) return;

        try {
            const { error } = await supabase
                .from('fraud_flags')
                .update({ 
                    resolved: true,
                    resolved_at: new Date().toISOString(),
                    resolved_by: (await supabase.auth.getUser()).data.user.id
                })
                .eq('id', flagId);

            if (error) throw error;

            this.showNotification('フラグを解決済みにしました', 'success');
            this.loadFraudData();

        } catch (error) {
            console.error('フラグ解決エラー:', error);
            this.showNotification('フラグの解決に失敗しました', 'error');
        }
    }

    async investigateUser(userId) {
        // ユーザー調査画面へ遷移
        window.location.href = `/admin-user-detail.html?id=${userId}`;
    }

    // データエクスポート
    async exportReferralData() {
        try {
            const { data } = await supabase
                .from('invitations')
                .select(`
                    *,
                    inviter:profiles!invitations_inviter_id_fkey(name, email, company),
                    invitee:profiles!invitations_invitee_id_fkey(name, email, company)
                `)
                .order('created_at', { ascending: false });

            // CSVデータの作成
            const csv = this.convertToCSV(data);
            
            // ダウンロード
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `referral_data_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();

        } catch (error) {
            console.error('エクスポートエラー:', error);
            this.showNotification('エクスポートに失敗しました', 'error');
        }
    }

    convertToCSV(data) {
        if (!data || data.length === 0) return '';

        const headers = [
            '作成日',
            '紹介者名',
            '紹介者メール',
            '紹介者会社',
            '被紹介者名', 
            '被紹介者メール',
            '被紹介者会社',
            'ステータス',
            '登録日',
            '完了日'
        ];

        const rows = data.map(row => [
            this.formatDate(row.created_at),
            row.inviter?.name || '',
            row.inviter?.email || '',
            row.inviter?.company || '',
            row.invitee?.name || '',
            row.invitee?.email || '',
            row.invitee?.company || '',
            this.getStatusText(row.status),
            row.registered_at ? this.formatDate(row.registered_at) : '',
            row.completed_at ? this.formatDate(row.completed_at) : ''
        ]);

        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }
}

// 初期化（Supabase準備完了後）
function initAdminReferral() {
    const adminReferral = new AdminReferralManager();
    window.adminReferral = adminReferral;
    window.exportReferralData = () => adminReferral.exportReferralData();
    window.updateAnalytics = () => adminReferral.updateAnalytics();
}

if (window.supabaseClient) {
    initAdminReferral();
} else {
    window.addEventListener('supabaseReady', initAdminReferral);
}