/**
 * Supabase Tables Checker
 * Supabaseに必要なテーブルが存在するかチェック
 */

(function() {
    'use strict';

    class SupabaseTableChecker {
        constructor() {
            this.requiredTables = [
                'events',
                'event_participants',
                'notifications',
                'activities'
            ];
            
            this.requiredViews = [
                'member_growth_stats',
                'event_stats',
                'industry_distribution'
            ];
        }

        async checkTables() {
            console.log('=== Supabase Table Check ===');
            
            if (!window.supabase) {
                console.error('Supabase client not initialized');
                return;
            }

            // 各テーブルの存在確認
            for (const table of this.requiredTables) {
                await this.checkTable(table);
            }

            // 各ビューの存在確認
            console.log('\n=== Checking Views ===');
            for (const view of this.requiredViews) {
                await this.checkView(view);
            }

            // サンプルデータ確認
            console.log('\n=== Checking Sample Data ===');
            await this.checkSampleData();
        }

        async checkTable(tableName) {
            try {
                const { data, error, count } = await window.supabase
                    .from(tableName)
                    .select('*', { count: 'exact', head: true });

                if (error) {
                    console.error(`❌ Table '${tableName}' check failed:`, error.message);
                    if (error.message.includes('relation') && error.message.includes('does not exist')) {
                        console.log(`   → Table '${tableName}' does not exist in database`);
                    }
                } else {
                    console.log(`✅ Table '${tableName}' exists`);
                    
                    // テーブル構造を確認
                    const { data: sample, error: sampleError } = await window.supabase
                        .from(tableName)
                        .select('*')
                        .limit(1);
                    
                    if (sample && sample.length > 0) {
                        console.log(`   → Columns: ${Object.keys(sample[0]).join(', ')}`);
                    }
                    
                    // レコード数を表示
                    const { count: recordCount } = await window.supabase
                        .from(tableName)
                        .select('*', { count: 'exact', head: true });
                    
                    console.log(`   → Records: ${recordCount || 0}`);
                }
            } catch (err) {
                console.error(`❌ Error checking table '${tableName}':`, err);
            }
        }

        async checkView(viewName) {
            try {
                const { data, error } = await window.supabase
                    .from(viewName)
                    .select('*')
                    .limit(1);

                if (error) {
                    console.error(`❌ View '${viewName}' check failed:`, error.message);
                } else {
                    console.log(`✅ View '${viewName}' exists`);
                }
            } catch (err) {
                console.error(`❌ Error checking view '${viewName}':`, err);
            }
        }

        async checkSampleData() {
            // イベントデータの確認
            try {
                const { data: events, error } = await window.supabase
                    .from('events')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(3);

                if (!error && events && events.length > 0) {
                    console.log(`✅ Found ${events.length} sample events:`);
                    events.forEach(event => {
                        console.log(`   - ${event.title} (${event.event_date})`);
                    });
                } else {
                    console.log('❌ No sample events found');
                }
            } catch (err) {
                console.error('Error checking sample events:', err);
            }

            // 通知データの確認
            try {
                const { data: notifications, error } = await window.supabase
                    .from('notifications')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(3);

                if (!error && notifications && notifications.length > 0) {
                    console.log(`✅ Found ${notifications.length} sample notifications`);
                } else {
                    console.log('❌ No sample notifications found');
                }
            } catch (err) {
                console.error('Error checking sample notifications:', err);
            }
        }

        // RLSポリシーの確認
        async checkRLSPolicies() {
            console.log('\n=== Checking RLS Policies ===');
            
            // 現在のユーザー情報を確認
            const { data: { user }, error } = await window.supabase.auth.getUser();
            
            if (user) {
                console.log(`✅ Authenticated as: ${user.email}`);
                
                // 自分のイベントを作成できるか確認
                try {
                    const testEvent = {
                        title: 'RLS Test Event',
                        description: 'Testing RLS policies',
                        event_type: 'online',
                        event_date: new Date().toISOString(),
                        start_time: '14:00',
                        end_time: '16:00',
                        organizer_id: user.id,
                        organizer_name: 'Test User'
                    };

                    const { data, error } = await window.supabase
                        .from('events')
                        .insert(testEvent)
                        .select();

                    if (error) {
                        console.error('❌ RLS test failed:', error.message);
                    } else {
                        console.log('✅ RLS allows event creation');
                        
                        // テストイベントを削除
                        if (data && data[0]) {
                            await window.supabase
                                .from('events')
                                .delete()
                                .eq('id', data[0].id);
                        }
                    }
                } catch (err) {
                    console.error('RLS test error:', err);
                }
            } else {
                console.log('❌ Not authenticated - cannot test RLS policies');
            }
        }

        // SQLファイルの実行手順を表示
        showSetupInstructions() {
            console.log('\n=== Setup Instructions ===');
            console.log('1. Go to your Supabase dashboard');
            console.log('2. Navigate to SQL Editor');
            console.log('3. Click "New query"');
            console.log('4. Copy and paste the contents of setup-all-tables.sql');
            console.log('5. Click "Run" to execute the SQL');
            console.log('6. Refresh this page and run the check again');
            console.log('\nFile location: /setup-all-tables.sql');
        }
    }

    // グローバルに公開
    window.SupabaseTableChecker = SupabaseTableChecker;

    // コンソールコマンドとして使えるようにする
    window.checkSupabaseTables = async function() {
        const checker = new SupabaseTableChecker();
        await checker.checkTables();
        await checker.checkRLSPolicies();
        checker.showSetupInstructions();
    };

    console.log('Supabase table checker loaded. Run `checkSupabaseTables()` in console to check tables.');

})();