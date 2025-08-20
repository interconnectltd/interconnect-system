/**
 * Critical Features Restoration
 * 削除されたファイルから本当に必要な機能だけを復活
 * 既存システムの補完・修正用
 */

(function() {
    'use strict';
    
    console.log('[CriticalRestore] 重要機能の復活開始');
    
    // ============================================================
    // 1. Supabase初期化待機の改善（リトライ機能付き）
    // ============================================================
    window.waitForSupabaseWithRetry = async function(maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const client = await window.waitForSupabase();
                if (client) return client;
                
                // リトライ前に少し待つ
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`[CriticalRestore] Supabase初期化リトライ ${i + 1}/${maxRetries}:`, error);
            }
        }
        
        console.error('[CriticalRestore] Supabase初期化に失敗しました');
        return null;
    };
    
    // ============================================================
    // 2. イベント参加申込機能の修正
    // ============================================================
    window.registerForEvent = async function(eventId) {
        try {
            const client = await window.waitForSupabaseWithRetry();
            if (!client) throw new Error('Supabaseクライアントが利用できません');
            
            const { data: { user } } = await client.auth.getUser();
            if (!user) {
                if (typeof showError === 'function') {
                    showError('ログインが必要です');
                }
                window.location.href = 'login.html';
                return;
            }
            
            // 既存の参加状況を確認
            const { data: existing } = await client
                .from('event_participants')
                .select('*')
                .eq('event_id', eventId)
                .eq('user_id', user.id)
                .maybeSingle();
            
            if (existing) {
                if (existing.status === 'cancelled') {
                    // 再登録
                    await client
                        .from('event_participants')
                        .update({ 
                            status: 'registered',
                            registration_date: new Date().toISOString()
                        })
                        .eq('id', existing.id);
                    
                    if (typeof showSuccess === 'function') {
                        showSuccess('イベントに再登録しました！');
                    }
                } else {
                    if (typeof showInfo === 'function') {
                        showInfo('既にこのイベントに参加登録済みです');
                    }
                }
            } else {
                // 新規登録
                await client
                    .from('event_participants')
                    .insert({
                        event_id: eventId,
                        user_id: user.id,
                        status: 'registered',
                        registration_date: new Date().toISOString()
                    });
                
                if (typeof showSuccess === 'function') {
                    showSuccess('イベントへの参加申込が完了しました！');
                }
                
                // 通知送信
                if (window.createNotification) {
                    await window.createNotification(user.id, 'event_registration', {
                        event_id: eventId
                    });
                }
            }
            
            // イベント一覧を更新
            if (window.eventsSupabase?.loadEvents) {
                window.eventsSupabase.loadEvents();
            }
            
        } catch (error) {
            console.error('[CriticalRestore] イベント参加申込エラー:', error);
            if (typeof showError === 'function') {
                showError('参加申込中にエラーが発生しました');
            }
        }
    };
    
    // ============================================================
    // 3. マッチングデータ取得のリトライ機能
    // ============================================================
    window.fetchMatchingDataWithRetry = async function(maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const client = await window.waitForSupabaseWithRetry();
                if (!client) throw new Error('Supabaseクライアントが利用できません');
                
                const { data: { user } } = await client.auth.getUser();
                if (!user) throw new Error('認証されていません');
                
                // profilesテーブルから取得（database-table-resolverを使用）
                let profiles;
                if (window.databaseTableResolver?.initialized) {
                    profiles = await window.databaseTableResolver.getAllUsers(user.id);
                } else {
                    // フォールバック
                    const { data } = await client
                        .from('profiles')
                        .select('*')
                        .neq('id', user.id);
                    profiles = data || [];
                }
                
                console.log(`[CriticalRestore] マッチングデータ取得成功: ${profiles.length}件`);
                return profiles;
                
            } catch (error) {
                console.error(`[CriticalRestore] マッチングデータ取得エラー (試行 ${i + 1}/${maxRetries}):`, error);
                
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // 指数バックオフ
                }
            }
        }
        
        return [];
    };
    
    // ============================================================
    // 4. リアルタイム通知の接続管理
    // ============================================================
    window.initRealtimeNotifications = async function() {
        try {
            const client = await window.waitForSupabaseWithRetry();
            if (!client) return;
            
            const { data: { user } } = await client.auth.getUser();
            if (!user) return;
            
            // 既存のチャンネルをクリーンアップ
            if (window.notificationChannel) {
                await client.removeChannel(window.notificationChannel);
            }
            
            // 新しいチャンネルを作成
            window.notificationChannel = client
                .channel(`notifications:${user.id}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                }, (payload) => {
                    console.log('[CriticalRestore] リアルタイム通知受信:', payload);
                    
                    // 通知を表示
                    if (window.displayNotification) {
                        window.displayNotification(payload.new);
                    }
                    
                    // 未読カウントを更新
                    if (window.updateUnreadCount) {
                        window.updateUnreadCount();
                    }
                })
                .subscribe((status) => {
                    console.log('[CriticalRestore] リアルタイム通知接続状態:', status);
                });
                
        } catch (error) {
            console.error('[CriticalRestore] リアルタイム通知初期化エラー:', error);
        }
    };
    
    // ============================================================
    // 5. ダッシュボード統計エラー修正
    // ============================================================
    window.fixDashboardStats = async function() {
        try {
            const client = await window.waitForSupabaseWithRetry();
            if (!client) return;
            
            // 406エラーを回避するためのヘッダー設定
            const options = {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            };
            
            // matchingsテーブルの存在確認
            const { data: matchingTest, error: matchingError } = await client
                .from('matchings')
                .select('id')
                .limit(1);
            
            if (matchingError && matchingError.code === '42P01') {
                console.log('[CriticalRestore] matchingsテーブルが存在しません、connectionsを使用');
                // connectionsテーブルを使用
                const { data: connections } = await client
                    .from('connections')
                    .select('*', options);
                    
                return { matchings: connections || [] };
            }
            
            const { data: matchings } = await client
                .from('matchings')
                .select('*', options);
                
            return { matchings: matchings || [] };
            
        } catch (error) {
            console.error('[CriticalRestore] ダッシュボード統計修正エラー:', error);
            return { matchings: [] };
        }
    };
    
    // ============================================================
    // 6. 高度なマッチングスコア計算
    // ============================================================
    window.calculateAdvancedMatchingScore = function(user1, user2) {
        let score = 0;
        let factors = [];
        
        // スキルマッチング（30%）
        if (user1.skills && user2.business_challenges) {
            const skillMatch = calculateSkillChallengeMatch(user1.skills, user2.business_challenges);
            score += skillMatch * 0.3;
            factors.push({ name: 'スキルマッチ', value: skillMatch });
        }
        
        // 興味の一致（20%）
        if (user1.interests && user2.interests) {
            const interestMatch = calculateArrayOverlap(user1.interests, user2.interests);
            score += interestMatch * 0.2;
            factors.push({ name: '興味の一致', value: interestMatch });
        }
        
        // 業界の関連性（15%）
        if (user1.industry && user2.industry) {
            const industryMatch = user1.industry === user2.industry ? 100 : 
                                  areIndustriesRelated(user1.industry, user2.industry) ? 60 : 20;
            score += industryMatch * 0.15;
            factors.push({ name: '業界の関連性', value: industryMatch });
        }
        
        // 地域の近さ（10%）
        if (user1.location && user2.location) {
            const locationMatch = calculateLocationProximity(user1.location, user2.location);
            score += locationMatch * 0.1;
            factors.push({ name: '地域の近さ', value: locationMatch });
        }
        
        // アクティビティ（15%）
        const activityScore = calculateActivityScore(user1.last_login, user2.last_login);
        score += activityScore * 0.15;
        factors.push({ name: 'アクティビティ', value: activityScore });
        
        // プロフィール完成度（10%）
        const completeness = calculateProfileCompleteness(user1, user2);
        score += completeness * 0.1;
        factors.push({ name: 'プロフィール充実度', value: completeness });
        
        return {
            totalScore: Math.round(score),
            factors: factors
        };
    };
    
    // ヘルパー関数
    function calculateSkillChallengeMatch(skills, challenges) {
        if (!skills || !challenges) return 0;
        
        const skillArray = Array.isArray(skills) ? skills : skills.split(',');
        const challengeArray = Array.isArray(challenges) ? challenges : challenges.split(',');
        
        let matchCount = 0;
        for (const challenge of challengeArray) {
            for (const skill of skillArray) {
                if (isSkillRelevantToChallenge(skill, challenge)) {
                    matchCount++;
                    break;
                }
            }
        }
        
        return (matchCount / challengeArray.length) * 100;
    }
    
    function calculateArrayOverlap(arr1, arr2) {
        if (!arr1 || !arr2) return 0;
        
        const array1 = Array.isArray(arr1) ? arr1 : arr1.split(',');
        const array2 = Array.isArray(arr2) ? arr2 : arr2.split(',');
        
        const set1 = new Set(array1.map(s => s.trim().toLowerCase()));
        const set2 = new Set(array2.map(s => s.trim().toLowerCase()));
        
        let overlap = 0;
        for (const item of set1) {
            if (set2.has(item)) overlap++;
        }
        
        const maxSize = Math.max(set1.size, set2.size);
        return maxSize > 0 ? (overlap / maxSize) * 100 : 0;
    }
    
    function areIndustriesRelated(ind1, ind2) {
        const relatedIndustries = {
            'IT・通信': ['AI・機械学習', 'Web開発', 'モバイル開発'],
            '金融': ['フィンテック', '保険', '投資'],
            '医療・ヘルスケア': ['バイオテクノロジー', '製薬', '医療機器'],
            'マーケティング': ['広告', 'PR', 'デジタルマーケティング']
        };
        
        for (const [key, values] of Object.entries(relatedIndustries)) {
            if ((ind1 === key || values.includes(ind1)) && 
                (ind2 === key || values.includes(ind2))) {
                return true;
            }
        }
        return false;
    }
    
    function calculateLocationProximity(loc1, loc2) {
        if (!loc1 || !loc2) return 0;
        if (loc1 === loc2) return 100;
        
        // 同じ地方なら60点
        const regions = {
            '関東': ['東京', '神奈川', '埼玉', '千葉', '茨城', '栃木', '群馬'],
            '関西': ['大阪', '京都', '兵庫', '奈良', '和歌山', '滋賀'],
            '中部': ['愛知', '岐阜', '静岡', '三重', '新潟', '富山', '石川', '福井', '山梨', '長野']
        };
        
        for (const [region, prefectures] of Object.entries(regions)) {
            if (prefectures.some(p => loc1.includes(p)) && 
                prefectures.some(p => loc2.includes(p))) {
                return 60;
            }
        }
        
        return 20;
    }
    
    function calculateActivityScore(lastLogin1, lastLogin2) {
        if (!lastLogin1 || !lastLogin2) return 0;
        
        const date1 = new Date(lastLogin1);
        const date2 = new Date(lastLogin2);
        const now = new Date();
        
        const days1 = Math.floor((now - date1) / (1000 * 60 * 60 * 24));
        const days2 = Math.floor((now - date2) / (1000 * 60 * 60 * 24));
        
        let score = 0;
        if (days1 < 7) score += 50;
        else if (days1 < 30) score += 30;
        else if (days1 < 90) score += 10;
        
        if (days2 < 7) score += 50;
        else if (days2 < 30) score += 30;
        else if (days2 < 90) score += 10;
        
        return score;
    }
    
    function calculateProfileCompleteness(user1, user2) {
        let score = 0;
        let count = 0;
        
        const checkFields = ['name', 'title', 'company', 'bio', 'skills', 'interests', 'avatar_url'];
        
        for (const field of checkFields) {
            if (user1[field]) count++;
            if (user2[field]) count++;
        }
        
        return (count / (checkFields.length * 2)) * 100;
    }
    
    function isSkillRelevantToChallenge(skill, challenge) {
        const skillLower = skill.toLowerCase().trim();
        const challengeLower = challenge.toLowerCase().trim();
        
        // 直接マッチ
        if (challengeLower.includes(skillLower) || skillLower.includes(challengeLower)) {
            return true;
        }
        
        // 関連性マップ
        const relevanceMap = {
            'マーケティング': ['集客', '顧客獲得', 'ブランディング', 'PR'],
            'データ分析': ['分析', 'レポート', 'KPI', '可視化'],
            'プロジェクト管理': ['進行管理', 'スケジュール', 'リソース管理'],
            '営業': ['売上', '新規開拓', '顧客関係'],
            '開発': ['システム', 'アプリ', 'Web', 'プログラミング']
        };
        
        for (const [key, values] of Object.entries(relevanceMap)) {
            if (skillLower.includes(key) && values.some(v => challengeLower.includes(v))) {
                return true;
            }
        }
        
        return false;
    }
    
    // ============================================================
    // 7. 自動初期化
    // ============================================================
    
    // DOMContentLoaded後に重要機能を初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCriticalFeatures);
    } else {
        initializeCriticalFeatures();
    }
    
    async function initializeCriticalFeatures() {
        console.log('[CriticalRestore] 重要機能の自動初期化開始');
        
        // Supabaseの準備を待つ
        const client = await window.waitForSupabaseWithRetry();
        if (!client) {
            console.error('[CriticalRestore] Supabaseが利用できません');
            return;
        }
        
        // リアルタイム通知を初期化
        await window.initRealtimeNotifications();
        
        // イベント参加ボタンの修正
        const eventActionBtn = document.getElementById('eventActionBtn');
        if (eventActionBtn) {
            eventActionBtn.addEventListener('click', async () => {
                const modal = document.getElementById('eventDetailModal');
                const eventId = modal?.dataset.eventId;
                if (eventId) {
                    await window.registerForEvent(eventId);
                }
            });
        }
        
        console.log('[CriticalRestore] 重要機能の初期化完了');
    }
    
    // グローバル公開
    window.CriticalFeaturesRestoration = {
        waitForSupabaseWithRetry: window.waitForSupabaseWithRetry,
        registerForEvent: window.registerForEvent,
        fetchMatchingDataWithRetry: window.fetchMatchingDataWithRetry,
        initRealtimeNotifications: window.initRealtimeNotifications,
        fixDashboardStats: window.fixDashboardStats,
        calculateAdvancedMatchingScore: window.calculateAdvancedMatchingScore
    };
    
})();