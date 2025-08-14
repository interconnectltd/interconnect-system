/**
 * Supabase Dashboard Tables Setup Script
 * This script creates necessary tables for the dashboard
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get Supabase URL and anon key from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase URL or Anon Key not found in .env file');
    process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.log('⚠️  No authenticated user. Tables will be created but some operations may fail.');
        console.log('   Please ensure you are logged in through the web app first.');
    } else if (user) {
        console.log('✅ Authenticated as:', user.email);
    }
}

async function checkTable(tableName) {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
        
        if (error) {
            if (error.code === '42P01') {
                return { exists: false, error: 'Table does not exist' };
            }
            return { exists: false, error: error.message };
        }
        
        return { exists: true, count: data?.length || 0 };
    } catch (e) {
        return { exists: false, error: e.message };
    }
}

async function createInitialData() {
    console.log('\n📊 Creating initial dashboard data...');
    
    // Check dashboard_stats
    const statsCheck = await checkTable('dashboard_stats');
    if (!statsCheck.exists) {
        console.log('❌ dashboard_stats table does not exist. Please run SQL script in Supabase Dashboard.');
        return false;
    }
    
    // Check if data already exists
    const { data: existingStats } = await supabase
        .from('dashboard_stats')
        .select('*')
        .limit(1);
    
    if (!existingStats || existingStats.length === 0) {
        // Create initial stats
        const { error } = await supabase
            .from('dashboard_stats')
            .insert([{
                total_members: 1,
                monthly_events: 0,
                matching_success: 0,
                unread_messages: 0,
                member_growth_percentage: 0,
                event_increase: 0
            }]);
        
        if (error) {
            console.log('❌ Failed to create initial stats:', error.message);
        } else {
            console.log('✅ Initial dashboard stats created');
        }
    } else {
        console.log('ℹ️  Dashboard stats already exist');
    }
    
    // Create sample events
    const eventsCheck = await checkTable('events');
    if (eventsCheck.exists) {
        const { data: existingEvents } = await supabase
            .from('events')
            .select('*')
            .limit(1);
        
        if (!existingEvents || existingEvents.length === 0) {
            const today = new Date();
            const sampleEvents = [
                {
                    title: '経営戦略セミナー',
                    description: 'ビジネス戦略について学ぶセミナーです',
                    event_date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    time: '14:00〜16:00',
                    location: 'オンライン開催',
                    status: 'active'
                },
                {
                    title: '交流ランチ会',
                    description: 'メンバー同士の交流を深めるランチ会です',
                    event_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    time: '12:00〜14:00',
                    location: '東京・丸の内',
                    status: 'active'
                },
                {
                    title: '新規事業ピッチ大会',
                    description: '新規事業のアイデアを競うピッチ大会です',
                    event_date: new Date(today.getTime() + 17 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    time: '18:00〜20:00',
                    location: '大阪・梅田',
                    status: 'active'
                }
            ];
            
            const { error } = await supabase
                .from('events')
                .insert(sampleEvents);
            
            if (error) {
                console.log('❌ Failed to create sample events:', error.message);
            } else {
                console.log('✅ Sample events created');
                
                // Update event count in stats
                await supabase
                    .from('dashboard_stats')
                    .update({ 
                        monthly_events: sampleEvents.length,
                        event_increase: sampleEvents.length
                    })
                    .eq('id', existingStats?.[0]?.id || (await supabase.from('dashboard_stats').select('id').limit(1)).data[0].id);
            }
        } else {
            console.log('ℹ️  Events already exist');
        }
    }
    
    return true;
}

async function main() {
    console.log('🚀 INTERCONNECT Dashboard Setup Script');
    console.log('=====================================\n');
    
    console.log('📌 Supabase Project:', supabaseUrl);
    
    // Check authentication
    await checkAuth();
    
    // Check tables
    console.log('\n📋 Checking tables...');
    const tables = ['dashboard_stats', 'user_activities', 'events', 'messages'];
    let allTablesExist = true;
    
    for (const table of tables) {
        const result = await checkTable(table);
        if (result.exists) {
            console.log(`✅ ${table}: OK (${result.count} records)`);
        } else {
            console.log(`❌ ${table}: ${result.error}`);
            allTablesExist = false;
        }
    }
    
    if (!allTablesExist) {
        console.log('\n⚠️  Some tables are missing!');
        console.log('\n📝 Please follow these steps:');
        console.log('1. Go to Supabase Dashboard: https://app.supabase.com');
        console.log('2. Select your project');
        console.log('3. Open SQL Editor');
        console.log('4. Copy and paste the contents of create-dashboard-tables.sql');
        console.log('5. Click Run');
        console.log('\nThen run this script again.');
        return;
    }
    
    // Create initial data
    await createInitialData();
    
    console.log('\n✨ Setup complete!');
    console.log('\n🔗 Next steps:');
    console.log('1. Visit https://interconnect-auto-test.netlify.app/dashboard.html');
    console.log('2. Log in if not already logged in');
    console.log('3. Check that real data is displayed');
}

// Run the script
main().catch(console.error);