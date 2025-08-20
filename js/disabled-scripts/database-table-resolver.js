/**
 * Database Table Resolver
 * profilesとuser_profilesテーブルの両方が存在する状況を解決
 * 適切なテーブルを使用するためのユーティリティ
 */

(function() {
    'use strict';
    
    console.log('[DatabaseTableResolver] 初期化開始');
    
    class DatabaseTableResolver {
        constructor() {
            this.tableStructure = {
                profiles: null,
                user_profiles: null,
                matchings: null,
                connections: null
            };
            this.primaryUserTable = null;
            this.initialized = false;
        }
        
        /**
         * テーブル構造を調査
         */
        async analyzeTableStructure() {
            console.log('[DatabaseTableResolver] テーブル構造を分析中...');
            
            try {
                // profilesテーブルの確認
                const { data: profilesData, error: profilesError } = await window.supabaseClient
                    .from('profiles')
                    .select('*')
                    .limit(1);
                
                if (!profilesError && profilesData) {
                    this.tableStructure.profiles = {
                        exists: true,
                        columns: Object.keys(profilesData[0] || {}),
                        rowCount: await this.getRowCount('profiles')
                    };
                    console.log('[DatabaseTableResolver] profilesテーブル:', this.tableStructure.profiles);
                }
                
                // user_profilesテーブルの確認
                const { data: userProfilesData, error: userProfilesError } = await window.supabaseClient
                    .from('user_profiles')
                    .select('*')
                    .limit(1);
                
                if (!userProfilesError && userProfilesData) {
                    this.tableStructure.user_profiles = {
                        exists: true,
                        columns: Object.keys(userProfilesData[0] || {}),
                        rowCount: await this.getRowCount('user_profiles')
                    };
                    console.log('[DatabaseTableResolver] user_profilesテーブル:', this.tableStructure.user_profiles);
                }
                
                // matchingsテーブルの確認
                const { data: matchingsData, error: matchingsError } = await window.supabaseClient
                    .from('matchings')
                    .select('*')
                    .limit(1);
                
                if (!matchingsError) {
                    this.tableStructure.matchings = {
                        exists: true,
                        columns: Object.keys(matchingsData?.[0] || {}),
                        rowCount: await this.getRowCount('matchings')
                    };
                    console.log('[DatabaseTableResolver] matchingsテーブル:', this.tableStructure.matchings);
                }
                
                // connectionsテーブルの確認
                const { data: connectionsData, error: connectionsError } = await window.supabaseClient
                    .from('connections')
                    .select('*')
                    .limit(1);
                
                if (!connectionsError) {
                    this.tableStructure.connections = {
                        exists: true,
                        columns: Object.keys(connectionsData?.[0] || {}),
                        rowCount: await this.getRowCount('connections')
                    };
                    console.log('[DatabaseTableResolver] connectionsテーブル:', this.tableStructure.connections);
                }
                
                // プライマリユーザーテーブルを決定
                this.determinePrimaryUserTable();
                
                this.initialized = true;
                
                return this.tableStructure;
                
            } catch (error) {
                console.error('[DatabaseTableResolver] テーブル構造分析エラー:', error);
                return null;
            }
        }
        
        /**
         * 行数を取得
         */
        async getRowCount(tableName) {
            try {
                const { count, error } = await window.supabaseClient
                    .from(tableName)
                    .select('*', { count: 'exact', head: true });
                
                if (error) {
                    console.error(`[DatabaseTableResolver] ${tableName}の行数取得エラー:`, error);
                    return 0;
                }
                
                return count || 0;
                
            } catch (error) {
                console.error(`[DatabaseTableResolver] ${tableName}の行数取得エラー:`, error);
                return 0;
            }
        }
        
        /**
         * プライマリユーザーテーブルを決定
         */
        determinePrimaryUserTable() {
            const profiles = this.tableStructure.profiles;
            const userProfiles = this.tableStructure.user_profiles;
            
            // 両方存在する場合
            if (profiles?.exists && userProfiles?.exists) {
                // より多くのデータがある方を使用
                if (profiles.rowCount >= userProfiles.rowCount) {
                    this.primaryUserTable = 'profiles';
                    console.log('[DatabaseTableResolver] プライマリテーブル: profiles (データ数が多い)');
                } else {
                    this.primaryUserTable = 'user_profiles';
                    console.log('[DatabaseTableResolver] プライマリテーブル: user_profiles (データ数が多い)');
                }
            }
            // profilesのみ存在
            else if (profiles?.exists) {
                this.primaryUserTable = 'profiles';
                console.log('[DatabaseTableResolver] プライマリテーブル: profiles (唯一存在)');
            }
            // user_profilesのみ存在
            else if (userProfiles?.exists) {
                this.primaryUserTable = 'user_profiles';
                console.log('[DatabaseTableResolver] プライマリテーブル: user_profiles (唯一存在)');
            }
            // どちらも存在しない
            else {
                console.error('[DatabaseTableResolver] ユーザーテーブルが見つかりません');
                this.primaryUserTable = 'profiles'; // デフォルト
            }
        }
        
        /**
         * ユーザープロフィール取得（適切なテーブルから）
         */
        async getUserProfile(userId) {
            if (!this.initialized) {
                await this.analyzeTableStructure();
            }
            
            try {
                const { data, error } = await window.supabaseClient
                    .from(this.primaryUserTable)
                    .select('*')
                    .eq('id', userId)
                    .single();
                
                if (error) {
                    console.error('[DatabaseTableResolver] プロフィール取得エラー:', error);
                    // フォールバック：もう一つのテーブルを試す
                    const fallbackTable = this.primaryUserTable === 'profiles' ? 'user_profiles' : 'profiles';
                    const { data: fallbackData, error: fallbackError } = await window.supabaseClient
                        .from(fallbackTable)
                        .select('*')
                        .eq('id', userId)
                        .single();
                    
                    if (!fallbackError && fallbackData) {
                        console.log(`[DatabaseTableResolver] フォールバック(${fallbackTable})成功`);
                        return fallbackData;
                    }
                    
                    return null;
                }
                
                return data;
                
            } catch (error) {
                console.error('[DatabaseTableResolver] プロフィール取得エラー:', error);
                return null;
            }
        }
        
        /**
         * 全ユーザー取得（適切なテーブルから）
         */
        async getAllUsers(excludeUserId = null) {
            if (!this.initialized) {
                await this.analyzeTableStructure();
            }
            
            try {
                let query = window.supabaseClient.from(this.primaryUserTable).select('*');
                
                if (excludeUserId) {
                    query = query.neq('id', excludeUserId);
                }
                
                const { data, error } = await query;
                
                if (error) {
                    console.error('[DatabaseTableResolver] 全ユーザー取得エラー:', error);
                    return [];
                }
                
                return data || [];
                
            } catch (error) {
                console.error('[DatabaseTableResolver] 全ユーザー取得エラー:', error);
                return [];
            }
        }
        
        /**
         * テーブル同期状態をチェック
         */
        async checkTableSync() {
            if (!this.initialized) {
                await this.analyzeTableStructure();
            }
            
            const profiles = this.tableStructure.profiles;
            const userProfiles = this.tableStructure.user_profiles;
            
            if (profiles?.exists && userProfiles?.exists) {
                console.log('[DatabaseTableResolver] 両方のテーブルが存在します');
                
                // ID の差分をチェック
                const { data: profileIds } = await window.supabaseClient
                    .from('profiles')
                    .select('id');
                
                const { data: userProfileIds } = await window.supabaseClient
                    .from('user_profiles')
                    .select('id');
                
                const profileIdSet = new Set(profileIds?.map(p => p.id) || []);
                const userProfileIdSet = new Set(userProfileIds?.map(p => p.id) || []);
                
                const onlyInProfiles = [...profileIdSet].filter(id => !userProfileIdSet.has(id));
                const onlyInUserProfiles = [...userProfileIdSet].filter(id => !profileIdSet.has(id));
                
                console.log('[DatabaseTableResolver] 同期状態:', {
                    profiles_only: onlyInProfiles.length,
                    user_profiles_only: onlyInUserProfiles.length,
                    synchronized: onlyInProfiles.length === 0 && onlyInUserProfiles.length === 0
                });
                
                return {
                    synchronized: onlyInProfiles.length === 0 && onlyInUserProfiles.length === 0,
                    onlyInProfiles,
                    onlyInUserProfiles
                };
            }
            
            return { synchronized: true };
        }
        
        /**
         * レポート生成
         */
        generateReport() {
            return {
                initialized: this.initialized,
                primaryTable: this.primaryUserTable,
                structure: this.tableStructure,
                recommendation: this.getRecommendation()
            };
        }
        
        /**
         * 推奨事項を取得
         */
        getRecommendation() {
            const profiles = this.tableStructure.profiles;
            const userProfiles = this.tableStructure.user_profiles;
            
            if (profiles?.exists && userProfiles?.exists) {
                if (profiles.rowCount === 0 && userProfiles.rowCount > 0) {
                    return 'user_profilesテーブルを使用してください（profilesは空）';
                }
                if (userProfiles.rowCount === 0 && profiles.rowCount > 0) {
                    return 'profilesテーブルを使用してください（user_profilesは空）';
                }
                return '両方のテーブルが存在します。データの統合を検討してください';
            }
            
            if (profiles?.exists) {
                return 'profilesテーブルを使用してください';
            }
            
            if (userProfiles?.exists) {
                return 'user_profilesテーブルを使用してください';
            }
            
            return 'ユーザーテーブルが見つかりません。データベース設定を確認してください';
        }
    }
    
    // グローバルに公開
    window.databaseTableResolver = new DatabaseTableResolver();
    
    // 自動初期化
    if (window.supabaseClient) {
        window.databaseTableResolver.analyzeTableStructure().then(result => {
            console.log('[DatabaseTableResolver] 分析完了:', window.databaseTableResolver.generateReport());
        });
    } else {
        document.addEventListener('supabaseReady', () => {
            window.databaseTableResolver.analyzeTableStructure().then(result => {
                console.log('[DatabaseTableResolver] 分析完了:', window.databaseTableResolver.generateReport());
            });
        });
    }
    
    // デバッグコマンド
    window.checkDatabaseTables = async () => {
        const resolver = window.databaseTableResolver;
        
        if (!resolver.initialized) {
            await resolver.analyzeTableStructure();
        }
        
        const report = resolver.generateReport();
        const syncStatus = await resolver.checkTableSync();
        
        console.log('=== Database Table Report ===');
        console.log('Primary Table:', report.primaryTable);
        console.log('Recommendation:', report.recommendation);
        console.log('Sync Status:', syncStatus);
        console.table(report.structure);
        
        return { report, syncStatus };
    };
    
})();