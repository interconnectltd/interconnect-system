/**
 * Dashboard Debug Helper
 * ダッシュボードのデバッグ支援ツール
 */

(function() {
    'use strict';

    // グローバルにデバッグ関数を登録
    window.debugDashboard = async function() {
        console.log('=== Dashboard Debug Tool ===');
        
        // 1. Supabase接続確認
        console.log('\n1. Checking Supabase connection...');
        if (window.supabase) {
            console.log('✓ Supabase is available');
            
            // Supabase URL確認
            const supabaseUrl = window.supabase.supabaseUrl || 'Unknown';
            console.log('  Supabase URL:', supabaseUrl);
        } else {
            console.error('✗ Supabase is NOT available');
            return;
        }
        
        // 2. 認証状態確認
        console.log('\n2. Checking authentication...');
        try {
            const { data: { user }, error: authError } = await window.supabase.auth.getUser();
            if (authError) {
                console.warn('✗ Auth error:', authError.message);
            } else if (!user) {
                console.warn('✗ No authenticated user');
            } else {
                console.log('✓ Authenticated as:', user.email);
                console.log('  User ID:', user.id);
            }
        } catch (e) {
            console.error('✗ Auth check failed:', e);
        }
        
        // 3. dashboard_statsテーブルアクセス確認
        console.log('\n3. Testing dashboard_stats table access...');
        try {
            // まずテーブルの存在確認
            const { data, error, count } = await window.supabase
                .from('dashboard_stats')
                .select('*', { count: 'exact' });
                
            if (error) {
                console.error('✗ Table access error:', error.message);
                console.error('  Error code:', error.code);
                console.error('  Error details:', error.details);
                console.error('  Error hint:', error.hint);
                
                // RLSエラーかテーブル不存在エラーか判定
                if (error.code === '42P01') {
                    console.error('  → Table does not exist. Please create dashboard_stats table.');
                } else if (error.code === '42501') {
                    console.error('  → RLS policy error. Check your Row Level Security policies.');
                }
            } else {
                console.log('✓ Table access successful');
                console.log('  Row count:', count);
                console.log('  Data:', data);
                
                if (data && data.length > 0) {
                    console.log('  First row:', data[0]);
                } else {
                    console.warn('  → Table is empty. Insert initial data.');
                }
            }
        } catch (e) {
            console.error('✗ Table test failed:', e);
        }
        
        // 4. 手動で統計データを更新
        console.log('\n4. Testing manual stats update...');
        try {
            // 実際の値を設定
            const manualStats = {
                total_members: 2,  // 手動で設定
                monthly_events: 5,
                matching_success: 10,
                unread_messages: 3,
                member_growth_percentage: 15.5,
                event_increase: 2,
                pending_invitations: 1
            };
            
            console.log('  Attempting to update stats with:', manualStats);
            
            // 既存のレコードを更新
            const { data: updateData, error: updateError } = await window.supabase
                .from('dashboard_stats')
                .update(manualStats)
                .eq('id', (await window.supabase.from('dashboard_stats').select('id').limit(1).single()).data?.id)
                .select();
                
            if (updateError) {
                console.error('✗ Update failed:', updateError);
                
                // 更新できない場合は挿入を試みる
                console.log('  Trying to insert instead...');
                const { data: insertData, error: insertError } = await window.supabase
                    .from('dashboard_stats')
                    .insert([manualStats])
                    .select();
                    
                if (insertError) {
                    console.error('✗ Insert also failed:', insertError);
                } else {
                    console.log('✓ Insert successful:', insertData);
                }
            } else {
                console.log('✓ Update successful:', updateData);
            }
        } catch (e) {
            console.error('✗ Manual update failed:', e);
        }
        
        // 5. ダッシュボードUIを強制更新
        console.log('\n5. Forcing dashboard UI update...');
        if (window.dashboardUI && window.dashboardUI.updateStatCards) {
            const testStats = {
                total_members: 999,
                monthly_events: 88,
                matching_success: 77,
                unread_messages: 66,
                member_growth_percentage: 55.5,
                event_increase: 44
            };
            
            console.log('  Updating UI with test values:', testStats);
            window.dashboardUI.updateStatCards(testStats);
            console.log('✓ UI updated with test values');
            console.log('  Check if the dashboard shows 999 members');
        } else {
            console.error('✗ Dashboard UI not available');
        }
        
        console.log('\n=== Debug Complete ===');
        console.log('If the dashboard still shows 1,234, the issue is:');
        console.log('1. Dashboard updater is not initializing properly');
        console.log('2. OR the UI is not connected to the data layer');
        console.log('3. OR there\'s a caching issue');
    };

    // ページ読み込み完了後に自動実行オプション
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[Dashboard Debug] Ready. Run debugDashboard() to diagnose issues.');
        
        // URLパラメータでデバッグモード
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug') === 'true') {
            console.log('[Dashboard Debug] Auto-running debug...');
            setTimeout(() => {
                window.debugDashboard();
            }, 2000);
        }
    });

})();