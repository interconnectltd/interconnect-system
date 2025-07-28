/**
 * Dashboard Event Debug
 * イベント統計のデバッグとテスト
 */

(function() {
    'use strict';

    window.dashboardEventDebug = {
        /**
         * イベントテーブルの構造を確認
         */
        async checkEventTable() {
            console.log('=== イベントテーブル構造確認 ===');
            
            try {
                const { data, error } = await window.supabase
                    .from('events')
                    .select('*')
                    .limit(1);

                if (error) {
                    console.error('エラー:', error);
                    return;
                }

                if (data && data.length > 0) {
                    console.log('サンプルデータ:', data[0]);
                    console.log('カラム一覧:', Object.keys(data[0]));
                    
                    // 日付フィールドの確認
                    const hasEventDate = 'event_date' in data[0];
                    const hasDate = 'date' in data[0];
                    
                    console.log('event_dateフィールド:', hasEventDate ? '存在する' : '存在しない');
                    console.log('dateフィールド:', hasDate ? '存在する' : '存在しない');
                    
                    if (hasEventDate) {
                        console.log('event_dateの値:', data[0].event_date);
                    }
                    if (hasDate) {
                        console.log('dateの値:', data[0].date);
                    }
                } else {
                    console.log('テーブルは空です');
                }
            } catch (error) {
                console.error('予期しないエラー:', error);
            }
        },

        /**
         * 今月のイベントを取得してテスト
         */
        async testCurrentMonthEvents() {
            console.log('=== 今月のイベント取得テスト ===');
            
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            const startDate = this.formatDate(startOfMonth);
            const endDate = this.formatDate(endOfMonth);
            
            console.log(`期間: ${startDate} ~ ${endDate}`);
            
            try {
                // event_dateで試す
                let result = await window.supabase
                    .from('events')
                    .select('*')
                    .gte('event_date', startDate)
                    .lte('event_date', endDate);

                if (result.error && result.error.message.includes('event_date')) {
                    console.log('event_dateフィールドが存在しません。dateで再試行...');
                    
                    // dateで試す
                    result = await window.supabase
                        .from('events')
                        .select('*')
                        .gte('date', startDate)
                        .lte('date', endDate);
                }

                if (result.error) {
                    console.error('エラー:', result.error);
                    return;
                }

                console.log(`今月のイベント数: ${result.data.length}`);
                console.log('イベント一覧:');
                result.data.forEach((event, index) => {
                    console.log(`${index + 1}. ${event.title} - ${event.event_date || event.date}`);
                });
            } catch (error) {
                console.error('予期しないエラー:', error);
            }
        },

        /**
         * 統計計算をテスト
         */
        async testEventCalculator() {
            console.log('=== イベント統計計算テスト ===');
            
            if (window.dashboardEventCalculator) {
                const stats = await window.dashboardEventCalculator.calculateEventStats();
                console.log('計算結果:', stats);
            } else {
                console.error('dashboardEventCalculatorが読み込まれていません');
            }
        },

        /**
         * 日付フォーマット
         */
        formatDate(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },

        /**
         * すべてのテストを実行
         */
        async runAllTests() {
            console.log('===== イベント統計デバッグ開始 =====');
            await this.checkEventTable();
            console.log('');
            await this.testCurrentMonthEvents();
            console.log('');
            await this.testEventCalculator();
            console.log('===== デバッグ終了 =====');
        }
    };

    // コンソールで使用できるようにする
    console.log('イベントデバッグツールが利用可能です:');
    console.log('- dashboardEventDebug.runAllTests() : すべてのテストを実行');
    console.log('- dashboardEventDebug.checkEventTable() : テーブル構造確認');
    console.log('- dashboardEventDebug.testCurrentMonthEvents() : 今月のイベント取得テスト');
    console.log('- dashboardEventDebug.testEventCalculator() : 統計計算テスト');

})();