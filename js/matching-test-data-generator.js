/**
 * マッチング用テストデータジェネレーター
 * Supabaseにサンプルプロファイルデータを生成
 */

(function() {
    'use strict';
    
    // テストプロファイルのテンプレート
    const testProfiles = [
        {
            name: '田中 太郎',
            title: 'CEO',
            company: '株式会社テクノロジー',
            bio: 'AI・機械学習を活用した新規事業開発に注力しています。',
            skills: ['AI', 'スタートアップ', '新規事業開発', 'マネジメント'],
            industry: 'IT・テクノロジー',
            location: '東京',
            interests: ['協業', '投資']
        },
        {
            name: '鈴木 花子',
            title: 'マーケティング部長',
            company: 'グローバル商事株式会社',
            bio: 'デジタルマーケティングとブランディング戦略のスペシャリストです。',
            skills: ['マーケティング', 'ブランディング', 'DX', 'グローバル戦略'],
            industry: '商社・流通',
            location: '東京',
            interests: ['協業', 'ネットワーキング']
        },
        {
            name: '佐藤 健一',
            title: '事業開発マネージャー',
            company: 'イノベーション株式会社',
            bio: 'SaaSプロダクトの事業開発とパートナーシップ構築を担当しています。',
            skills: ['新規事業', 'パートナーシップ', 'SaaS', 'プロダクト開発'],
            industry: 'IT・テクノロジー',
            location: '大阪',
            interests: ['協業', 'メンタリング']
        },
        {
            name: '山田 美咲',
            title: 'CFO',
            company: 'ファイナンス・アドバイザリー',
            bio: 'スタートアップの資金調達とM&Aアドバイザリーを専門としています。',
            skills: ['財務', '投資', 'M&A', '資金調達'],
            industry: '金融・コンサルティング',
            location: '東京',
            interests: ['投資', 'メンタリング']
        },
        {
            name: '高橋 修',
            title: 'プロダクトマネージャー',
            company: 'デジタルソリューションズ',
            bio: 'ユーザー中心設計とアジャイル開発でプロダクトの成長を推進しています。',
            skills: ['プロダクト開発', 'UX/UI', 'アジャイル', 'データ分析'],
            industry: 'IT・テクノロジー',
            location: '福岡',
            interests: ['協業', 'ネットワーキング']
        },
        {
            name: '伊藤 さくら',
            title: '人事部長',
            company: 'タレントマネジメント株式会社',
            bio: '組織開発と人材育成プログラムの設計・実行を担当しています。',
            skills: ['人材開発', '組織開発', '採用', 'ダイバーシティ'],
            industry: '人材・教育',
            location: '名古屋',
            interests: ['メンタリング', 'ネットワーキング']
        },
        {
            name: '中村 智也',
            title: 'CTO',
            company: 'クラウドイノベーション',
            bio: 'クラウドインフラとマイクロサービスアーキテクチャの専門家です。',
            skills: ['クラウド', 'DevOps', 'アーキテクチャ', 'セキュリティ'],
            industry: 'IT・テクノロジー',
            location: '東京',
            interests: ['協業', '技術共有']
        },
        {
            name: '小林 理恵',
            title: '経営戦略室長',
            company: 'ヘルスケアイノベーション',
            bio: '医療DXと予防医療サービスの事業開発を推進しています。',
            skills: ['ヘルスケア', 'DX', '事業戦略', '規制対応'],
            industry: '医療・ヘルスケア',
            location: '大阪',
            interests: ['協業', '投資']
        }
    ];
    
    // テストデータを生成してSupabaseに保存
    window.generateTestProfiles = async function() {
        console.log('[TestDataGenerator] テストプロファイル生成開始');
        
        if (!window.supabase) {
            console.error('[TestDataGenerator] Supabaseクライアントが見つかりません');
            return;
        }
        
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) {
            console.error('[TestDataGenerator] ユーザーが認証されていません');
            return;
        }
        
        console.log('[TestDataGenerator] 現在のユーザー:', user.email);
        
        // 既存のテストデータを確認
        const { data: existingProfiles, error: checkError } = await window.supabase
            .from('profiles')
            .select('email')
            .like('email', 'test_%@interconnect.com');
            
        if (checkError) {
            console.error('[TestDataGenerator] 確認エラー:', checkError);
            return;
        }
        
        console.log(`[TestDataGenerator] 既存のテストプロファイル: ${existingProfiles.length}件`);
        
        // 新しいプロファイルを作成
        const newProfiles = [];
        const createdEmails = [];
        
        for (let i = 0; i < testProfiles.length; i++) {
            const profile = testProfiles[i];
            const email = `test_${i + 1}@interconnect.com`;
            
            // 既に存在する場合はスキップ
            if (existingProfiles.some(p => p.email === email)) {
                console.log(`[TestDataGenerator] ${email} は既に存在します`);
                continue;
            }
            
            // 新しいユーザーIDを生成（UUID v4形式）
            const userId = generateUUID();
            
            const newProfile = {
                id: userId,
                email: email,
                name: profile.name,
                title: profile.title,
                company: profile.company,
                bio: profile.bio,
                skills: profile.skills,
                industry: profile.industry,
                location: profile.location,
                interests: profile.interests,
                avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=random`,
                is_public: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            newProfiles.push(newProfile);
            createdEmails.push(email);
        }
        
        if (newProfiles.length === 0) {
            console.log('[TestDataGenerator] 作成する新しいプロファイルはありません');
            return;
        }
        
        // バッチでプロファイルを挿入
        console.log(`[TestDataGenerator] ${newProfiles.length}件のプロファイルを作成中...`);
        
        const { data: insertedProfiles, error: insertError } = await window.supabase
            .from('profiles')
            .insert(newProfiles)
            .select();
            
        if (insertError) {
            console.error('[TestDataGenerator] 挿入エラー:', insertError);
            return;
        }
        
        console.log(`[TestDataGenerator] ✅ ${insertedProfiles.length}件のプロファイルを作成しました`);
        console.log('[TestDataGenerator] 作成されたプロファイル:', insertedProfiles);
        
        // マッチングページをリロード
        if (window.matchingSupabase && typeof window.matchingSupabase.loadProfiles === 'function') {
            console.log('[TestDataGenerator] マッチングデータを再読み込み中...');
            await window.matchingSupabase.loadProfiles();
        }
        
        return insertedProfiles;
    };
    
    // UUID生成関数
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // 既存のテストデータを削除
    window.deleteTestProfiles = async function() {
        console.log('[TestDataGenerator] テストプロファイル削除開始');
        
        if (!window.supabase) {
            console.error('[TestDataGenerator] Supabaseクライアントが見つかりません');
            return;
        }
        
        const { data: deletedProfiles, error } = await window.supabase
            .from('profiles')
            .delete()
            .like('email', 'test_%@interconnect.com')
            .select();
            
        if (error) {
            console.error('[TestDataGenerator] 削除エラー:', error);
            return;
        }
        
        console.log(`[TestDataGenerator] ✅ ${deletedProfiles.length}件のテストプロファイルを削除しました`);
        return deletedProfiles;
    };
    
    console.log('[TestDataGenerator] コマンド:');
    console.log('- generateTestProfiles() : テストプロファイルを生成');
    console.log('- deleteTestProfiles() : テストプロファイルを削除');
    
})();