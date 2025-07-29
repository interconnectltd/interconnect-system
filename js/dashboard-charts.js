/**
 * Dashboard Charts
 * ダッシュボードのデータビジュアライゼーション
 */

(function() {
    'use strict';

    class DashboardCharts {
        constructor() {
            this.charts = {};
            this.chartColors = {
                primary: '#2563eb',
                secondary: '#10b981',
                accent: '#f59e0b',
                danger: '#ef4444',
                gray: '#6b7280'
            };
            
            this.init();
        }

        async init() {
            // Chart.jsが読み込まれているか確認
            if (typeof Chart === 'undefined') {
                console.warn('[DashboardCharts] Chart.js not loaded. Loading from CDN...');
                await this.loadChartJS();
            }

            // チャートコンテナを作成
            this.createChartContainers();
            
            // データを読み込んでチャートを作成
            await this.loadDataAndCreateCharts();
            
            console.log('[DashboardCharts] Initialized');
        }

        /**
         * Chart.jsを動的に読み込む
         */
        async loadChartJS() {
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }

        /**
         * チャートコンテナを作成
         */
        createChartContainers() {
            // 統計カードの後に新しいセクションを追加
            const mainContent = document.querySelector('.dashboard-content');
            if (!mainContent) return;

            const chartsSection = document.createElement('div');
            chartsSection.className = 'charts-section';
            chartsSection.innerHTML = `
                <div class="charts-grid">
                    <!-- メンバー成長チャート -->
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3>メンバー成長推移</h3>
                            <select class="chart-period-select" data-chart="memberGrowth">
                                <option value="week">過去1週間</option>
                                <option value="month" selected>過去1ヶ月</option>
                                <option value="year">過去1年</option>
                            </select>
                        </div>
                        <div class="chart-body">
                            <canvas id="memberGrowthChart"></canvas>
                        </div>
                    </div>

                    <!-- イベント参加率チャート -->
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3>イベント参加統計</h3>
                            <select class="chart-period-select" data-chart="eventStats">
                                <option value="week">今週</option>
                                <option value="month" selected>今月</option>
                                <option value="quarter">四半期</option>
                            </select>
                        </div>
                        <div class="chart-body">
                            <canvas id="eventStatsChart"></canvas>
                        </div>
                    </div>

                    <!-- 業界別分布チャート -->
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3>業界別メンバー分布</h3>
                        </div>
                        <div class="chart-body">
                            <canvas id="industryChart"></canvas>
                        </div>
                    </div>

                    <!-- アクティビティヒートマップ -->
                    <div class="chart-card chart-card-wide">
                        <div class="chart-header">
                            <h3>週間アクティビティ</h3>
                        </div>
                        <div class="chart-body">
                            <canvas id="activityHeatmapChart"></canvas>
                        </div>
                    </div>
                </div>
            `;

            // 統計カードの後に挿入
            const statsContainer = document.querySelector('.stats-container');
            if (statsContainer && statsContainer.parentNode) {
                statsContainer.parentNode.insertBefore(chartsSection, statsContainer.nextSibling);
            }

            // イベントリスナーを設定
            chartsSection.querySelectorAll('.chart-period-select').forEach(select => {
                select.addEventListener('change', (e) => {
                    this.handlePeriodChange(e.target.dataset.chart, e.target.value);
                });
            });
        }

        /**
         * データを読み込んでチャートを作成
         */
        async loadDataAndCreateCharts() {
            // メンバー成長チャート
            await this.createMemberGrowthChart();
            
            // イベント参加統計チャート
            await this.createEventStatsChart();
            
            // 業界別分布チャート
            await this.createIndustryChart();
            
            // アクティビティヒートマップ
            await this.createActivityHeatmapChart();
        }

        /**
         * メンバー成長チャートを作成
         */
        async createMemberGrowthChart() {
            const ctx = document.getElementById('memberGrowthChart');
            if (!ctx) return;

            // ダミーデータ（実際はSupabaseから取得）
            const data = this.generateMemberGrowthData('month');

            this.charts.memberGrowth = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: '総メンバー数',
                        data: data.total,
                        borderColor: this.chartColors.primary,
                        backgroundColor: this.chartColors.primary + '20',
                        fill: true,
                        tension: 0.4
                    }, {
                        label: '新規メンバー',
                        data: data.new,
                        borderColor: this.chartColors.secondary,
                        backgroundColor: this.chartColors.secondary + '20',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: '#ddd',
                            borderWidth: 1
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }

        /**
         * イベント参加統計チャートを作成
         */
        async createEventStatsChart() {
            const ctx = document.getElementById('eventStatsChart');
            if (!ctx) return;

            // ダミーデータ
            const data = this.generateEventStatsData('month');

            this.charts.eventStats = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'オンライン',
                        data: data.online,
                        backgroundColor: this.chartColors.primary,
                        borderRadius: 4
                    }, {
                        label: 'オフライン',
                        data: data.offline,
                        backgroundColor: this.chartColors.secondary,
                        borderRadius: 4
                    }, {
                        label: 'ハイブリッド',
                        data: data.hybrid,
                        backgroundColor: this.chartColors.accent,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            stacked: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            stacked: true,
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }

        /**
         * 業界別分布チャートを作成
         */
        async createIndustryChart() {
            const ctx = document.getElementById('industryChart');
            if (!ctx) return;

            // ダミーデータ（実際はSupabaseから集計）
            const data = {
                labels: ['IT/テクノロジー', '金融', '製造業', 'サービス業', 'その他'],
                values: [35, 25, 20, 15, 5]
            };

            this.charts.industry = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: data.labels,
                    datasets: [{
                        data: data.values,
                        backgroundColor: [
                            this.chartColors.primary,
                            this.chartColors.secondary,
                            this.chartColors.accent,
                            this.chartColors.danger,
                            this.chartColors.gray
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: ${value}人 (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        /**
         * アクティビティヒートマップチャートを作成
         */
        async createActivityHeatmapChart() {
            const ctx = document.getElementById('activityHeatmapChart');
            if (!ctx) return;

            // ダミーデータ
            const data = this.generateActivityHeatmapData();

            this.charts.activityHeatmap = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['月', '火', '水', '木', '金', '土', '日'],
                    datasets: data.datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                title: function(tooltipItems) {
                                    const item = tooltipItems[0];
                                    return `${item.label} ${item.dataset.label}時`;
                                },
                                label: function(context) {
                                    return `アクティビティ: ${context.parsed.y}件`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }

        /**
         * 期間変更を処理
         */
        handlePeriodChange(chartName, period) {
            switch (chartName) {
                case 'memberGrowth':
                    this.updateMemberGrowthChart(period);
                    break;
                case 'eventStats':
                    this.updateEventStatsChart(period);
                    break;
            }
        }

        /**
         * メンバー成長チャートを更新
         */
        updateMemberGrowthChart(period) {
            const chart = this.charts.memberGrowth;
            if (!chart) return;

            const data = this.generateMemberGrowthData(period);
            chart.data.labels = data.labels;
            chart.data.datasets[0].data = data.total;
            chart.data.datasets[1].data = data.new;
            chart.update();
        }

        /**
         * イベント統計チャートを更新
         */
        updateEventStatsChart(period) {
            const chart = this.charts.eventStats;
            if (!chart) return;

            const data = this.generateEventStatsData(period);
            chart.data.labels = data.labels;
            chart.data.datasets[0].data = data.online;
            chart.data.datasets[1].data = data.offline;
            chart.data.datasets[2].data = data.hybrid;
            chart.update();
        }

        /**
         * メンバー成長データを生成（ダミー）
         */
        generateMemberGrowthData(period) {
            const data = { labels: [], total: [], new: [] };
            let days = 30;
            
            switch (period) {
                case 'week':
                    days = 7;
                    break;
                case 'year':
                    days = 365;
                    break;
            }

            let total = 1000;
            const now = new Date();
            
            for (let i = days; i >= 0; i -= Math.max(1, Math.floor(days / 10))) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                
                const newMembers = Math.floor(Math.random() * 10) + 5;
                total += newMembers;
                
                data.labels.push(date.toLocaleDateString('ja-JP', { 
                    month: 'numeric', 
                    day: 'numeric' 
                }));
                data.total.push(total);
                data.new.push(newMembers);
            }

            return data;
        }

        /**
         * イベント統計データを生成（ダミー）
         */
        generateEventStatsData(period) {
            const data = { labels: [], online: [], offline: [], hybrid: [] };
            let items = 4;
            
            switch (period) {
                case 'week':
                    data.labels = ['月', '火', '水', '木', '金', '土', '日'];
                    items = 7;
                    break;
                case 'month':
                    data.labels = ['第1週', '第2週', '第3週', '第4週'];
                    items = 4;
                    break;
                case 'quarter':
                    data.labels = ['1月', '2月', '3月'];
                    items = 3;
                    break;
            }

            for (let i = 0; i < items; i++) {
                data.online.push(Math.floor(Math.random() * 20) + 10);
                data.offline.push(Math.floor(Math.random() * 15) + 5);
                data.hybrid.push(Math.floor(Math.random() * 10) + 2);
            }

            return data;
        }

        /**
         * アクティビティヒートマップデータを生成（ダミー）
         */
        generateActivityHeatmapData() {
            const hours = Array.from({ length: 24 }, (_, i) => i);
            const datasets = hours.map(hour => ({
                label: hour.toString(),
                data: Array.from({ length: 7 }, () => Math.floor(Math.random() * 50)),
                backgroundColor: this.getHeatmapColor(hour),
                borderWidth: 0,
                barPercentage: 1,
                categoryPercentage: 1
            }));

            return { datasets };
        }

        /**
         * ヒートマップの色を取得
         */
        getHeatmapColor(hour) {
            // 活動時間帯に応じて色を変える
            if (hour >= 9 && hour <= 18) {
                return this.chartColors.primary + '80';
            } else if (hour >= 6 && hour < 9 || hour > 18 && hour <= 22) {
                return this.chartColors.secondary + '60';
            } else {
                return this.chartColors.gray + '30';
            }
        }
    }

    // グローバルに公開
    window.DashboardCharts = DashboardCharts;

    // DOMContentLoaded時に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.dashboardCharts = new DashboardCharts();
        });
    } else {
        window.dashboardCharts = new DashboardCharts();
    }

})();