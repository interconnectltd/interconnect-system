/**
 * マッチング機能の動作確認スクリプト
 * ブラウザのコンソールで実行して、機能が正常に動作するか確認
 */

// テスト結果を記録
const testResults = {
    passed: [],
    failed: [],
    warnings: []
};

// テスト1: Supabaseクライアントの確認
async function testSupabaseClient() {
    console.log('🔍 Test 1: Supabaseクライアントの確認...');
    try {
        if (!window.supabase) {
            throw new Error('Supabaseクライアントが見つかりません');
        }
        
        const { data: { user } } = await window.supabase.auth.getUser();
        if (user) {
            testResults.passed.push('✅ Supabaseクライアント: 正常（ユーザー: ' + user.email + '）');
        } else {
            testResults.warnings.push('⚠️ Supabaseクライアント: 未ログイン状態');
        }
    } catch (error) {
        testResults.failed.push('❌ Supabaseクライアント: ' + error.message);
    }
}

// テスト2: profilesテーブルの構造確認
async function testProfilesTable() {
    console.log('🔍 Test 2: profilesテーブルの確認...');
    try {
        const { data, error } = await window.supabase
            .from('profiles')
            .select('id, name, industry, location, skills')
            .limit(1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            const profile = data[0];
            const requiredFields = ['industry', 'location', 'skills'];
            const missingFields = requiredFields.filter(field => !profile.hasOwnProperty(field));
            
            if (missingFields.length === 0) {
                testResults.passed.push('✅ profilesテーブル: 必要なカラムが全て存在');
            } else {
                testResults.failed.push('❌ profilesテーブル: 不足カラム ' + missingFields.join(', '));
            }
        } else {
            testResults.warnings.push('⚠️ profilesテーブル: データが存在しません');
        }
    } catch (error) {
        testResults.failed.push('❌ profilesテーブル: ' + error.message);
    }
}

// テスト3: connectionsテーブルの確認
async function testConnectionsTable() {
    console.log('🔍 Test 3: connectionsテーブルの確認...');
    try {
        const { data, error } = await window.supabase
            .from('connections')
            .select('id')
            .limit(1);
        
        if (error && error.code === '42P01') {
            testResults.failed.push('❌ connectionsテーブル: テーブルが存在しません');
        } else if (error) {
            testResults.failed.push('❌ connectionsテーブル: ' + error.message);
        } else {
            testResults.passed.push('✅ connectionsテーブル: 正常にアクセス可能');
        }
    } catch (error) {
        testResults.failed.push('❌ connectionsテーブル: ' + error.message);
    }
}

// テスト4: マッチング機能のインスタンス確認
function testMatchingInstance() {
    console.log('🔍 Test 4: マッチング機能のインスタンス確認...');
    try {
        if (!window.matchingSupabase) {
            throw new Error('matchingSupabaseインスタンスが見つかりません');
        }
        
        if (typeof window.matchingSupabase.loadProfiles !== 'function') {
            throw new Error('loadProfilesメソッドが見つかりません');
        }
        
        testResults.passed.push('✅ マッチング機能: インスタンスが正常に初期化されています');
    } catch (error) {
        testResults.failed.push('❌ マッチング機能: ' + error.message);
    }
}

// テスト5: フィルター要素の確認
function testFilterElements() {
    console.log('🔍 Test 5: フィルター要素の確認...');
    try {
        const elements = {
            industry: document.querySelector('.filter-group select[name="industry"]'),
            location: document.querySelector('.filter-group select[name="location"]'),
            interest: document.querySelector('.filter-group select[name="interest"]'),
            searchBtn: document.querySelector('.matching-filters .btn-primary'),
            grid: document.querySelector('.matching-grid')
        };
        
        const missing = Object.entries(elements)
            .filter(([key, el]) => !el)
            .map(([key]) => key);
        
        if (missing.length === 0) {
            testResults.passed.push('✅ DOM要素: 全ての必要な要素が存在');
        } else {
            testResults.failed.push('❌ DOM要素: 不足要素 ' + missing.join(', '));
        }
    } catch (error) {
        testResults.failed.push('❌ DOM要素: ' + error.message);
    }
}

// テスト6: プロフィールデータの品質確認
async function testDataQuality() {
    console.log('🔍 Test 6: データ品質の確認...');
    try {
        const { data: profiles, error } = await window.supabase
            .from('profiles')
            .select('industry, location, skills')
            .not('industry', 'is', null)
            .not('location', 'is', null)
            .not('skills', 'is', null)
            .limit(10);
        
        if (error) throw error;
        
        if (profiles.length === 0) {
            testResults.warnings.push('⚠️ データ品質: マッチング可能なプロフィールが存在しません');
        } else {
            const validIndustries = ['tech', 'finance', 'healthcare', 'retail'];
            const validLocations = ['tokyo', 'osaka', 'nagoya', 'fukuoka'];
            
            const invalidData = profiles.filter(p => 
                !validIndustries.includes(p.industry) || 
                !validLocations.includes(p.location) ||
                !Array.isArray(p.skills) || p.skills.length === 0
            );
            
            if (invalidData.length === 0) {
                testResults.passed.push('✅ データ品質: プロフィールデータが正常');
            } else {
                testResults.warnings.push(`⚠️ データ品質: ${invalidData.length}件の不正なデータ`);
            }
        }
    } catch (error) {
        testResults.failed.push('❌ データ品質: ' + error.message);
    }
}

// 全テストを実行
async function runAllTests() {
    console.log('🚀 マッチング機能の動作確認を開始します...\n');
    
    await testSupabaseClient();
    await testProfilesTable();
    await testConnectionsTable();
    testMatchingInstance();
    testFilterElements();
    await testDataQuality();
    
    // 結果を表示
    console.log('\n📊 テスト結果サマリー:');
    console.log('=====================================');
    
    if (testResults.passed.length > 0) {
        console.log('\n✅ 成功したテスト:');
        testResults.passed.forEach(result => console.log(result));
    }
    
    if (testResults.warnings.length > 0) {
        console.log('\n⚠️ 警告:');
        testResults.warnings.forEach(result => console.log(result));
    }
    
    if (testResults.failed.length > 0) {
        console.log('\n❌ 失敗したテスト:');
        testResults.failed.forEach(result => console.log(result));
        
        console.log('\n🔧 推奨される対処法:');
        console.log('1. execute-all-matching-sql.sqlをSupabaseで実行してください');
        console.log('2. ページをリロードしてください');
        console.log('3. ログイン状態を確認してください');
    } else if (testResults.warnings.length === 0) {
        console.log('\n🎉 全てのテストが成功しました！');
    }
    
    return testResults;
}

// 手動でフィルターをテスト
async function testFilterFunctionality() {
    console.log('\n🔍 フィルター機能の動作テスト...');
    
    if (!window.matchingSupabase) {
        console.error('matchingSupabaseが初期化されていません');
        return;
    }
    
    // 業界フィルターをテスト
    const industrySelect = document.querySelector('.filter-group select[name="industry"]');
    if (industrySelect) {
        console.log('業界フィルターを「IT・テクノロジー」に設定...');
        industrySelect.value = 'tech';
        industrySelect.dispatchEvent(new Event('change'));
        
        // 結果を確認
        setTimeout(() => {
            const cards = document.querySelectorAll('.matching-card');
            console.log(`フィルター結果: ${cards.length}件のマッチング候補`);
        }, 1000);
    }
}

// コンソールで実行
console.log('テストを実行するには、以下のコマンドを実行してください:');
console.log('runAllTests() - 全ての自動テストを実行');
console.log('testFilterFunctionality() - フィルター機能をテスト');

// グローバルに公開
window.matchingTests = {
    runAllTests,
    testFilterFunctionality,
    results: testResults
};