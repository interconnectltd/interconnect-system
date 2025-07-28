/**
 * Supabase Schema Detector
 * データベーススキーマを自動検出して最適なクエリを構築
 */

(function() {
    'use strict';

    class SupabaseSchemaDetector {
        constructor() {
            this.schemaCache = new Map();
            this.detectedSchemas = {};
        }

        /**
         * テーブルのスキーマを検出
         */
        async detectTableSchema(tableName) {
            // キャッシュチェック
            if (this.schemaCache.has(tableName)) {
                return this.schemaCache.get(tableName);
            }

            try {
                console.log(`[SchemaDetector] ${tableName}テーブルのスキーマを検出中...`);
                
                // サンプルデータを取得してカラムを確認
                const { data, error } = await window.supabase
                    .from(tableName)
                    .select('*')
                    .limit(1);

                if (error) {
                    console.error(`[SchemaDetector] ${tableName}テーブルエラー:`, error);
                    
                    // 404エラーの場合はテーブルが存在しない
                    if (error.code === '42P01' || error.message.includes('not found')) {
                        const schema = { exists: false, columns: [], error: error.message };
                        this.schemaCache.set(tableName, schema);
                        return schema;
                    }
                    
                    throw error;
                }

                const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
                const schema = {
                    exists: true,
                    columns: columns,
                    sampleData: data[0] || {},
                    detectedAt: new Date().toISOString()
                };

                // スキーマをキャッシュ
                this.schemaCache.set(tableName, schema);
                this.detectedSchemas[tableName] = schema;

                console.log(`[SchemaDetector] ${tableName}のスキーマ:`, columns);
                return schema;

            } catch (error) {
                console.error(`[SchemaDetector] スキーマ検出エラー (${tableName}):`, error);
                return { exists: false, columns: [], error: error.message };
            }
        }

        /**
         * イベントテーブルの最適なクエリビルダー
         */
        async buildEventQuery(startDate, endDate) {
            const schema = await this.detectTableSchema('events');
            
            if (!schema.exists) {
                console.warn('[SchemaDetector] eventsテーブルが存在しません');
                return null;
            }

            let query = window.supabase.from('events').select('*', { count: 'exact', head: true });
            
            // 日付フィールドの優先順位
            const dateFields = ['event_date', 'date', 'start_date', 'created_at'];
            const dateField = dateFields.find(field => schema.columns.includes(field));

            if (dateField) {
                query = query.gte(dateField, startDate).lte(dateField, endDate);
                console.log(`[SchemaDetector] 使用する日付フィールド: ${dateField}`);
            } else {
                console.warn('[SchemaDetector] 適切な日付フィールドが見つかりません');
            }

            return query;
        }

        /**
         * マッチングテーブルの最適なクエリビルダー
         */
        async buildMatchingQuery(startDate, endDate) {
            // まずmatchingsテーブルを確認
            let schema = await this.detectTableSchema('matchings');
            
            if (!schema.exists) {
                console.log('[SchemaDetector] matchingsテーブルが存在しない、代替テーブルを検索');
                
                // user_activitiesテーブルを確認
                schema = await this.detectTableSchema('user_activities');
                if (schema.exists) {
                    return window.supabase
                        .from('user_activities')
                        .select('*', { count: 'exact', head: true })
                        .in('activity_type', ['matching', 'profile_exchange', 'connection'])
                        .gte('created_at', startDate)
                        .lte('created_at', endDate);
                }
                
                return null;
            }

            // 日付フィールドの判定
            const dateField = schema.columns.includes('matched_at') ? 'matched_at' : 'created_at';
            
            return window.supabase
                .from('matchings')
                .select('*', { count: 'exact', head: true })
                .gte(dateField, startDate)
                .lte(dateField, endDate);
        }

        /**
         * メッセージテーブルの最適なクエリビルダー
         */
        async buildMessageQuery(userId) {
            const schema = await this.detectTableSchema('messages');
            
            if (!schema.exists) {
                console.warn('[SchemaDetector] messagesテーブルが存在しません');
                return null;
            }

            let query = window.supabase.from('messages').select('*', { count: 'exact', head: true });
            
            // 受信者フィールドの判定
            const recipientFields = ['recipient_id', 'to_user_id', 'receiver_id'];
            const recipientField = recipientFields.find(field => schema.columns.includes(field));
            
            if (recipientField) {
                query = query.eq(recipientField, userId);
            }

            // 既読フィールドの判定
            if (schema.columns.includes('is_read')) {
                query = query.eq('is_read', false);
            } else if (schema.columns.includes('read_at')) {
                query = query.is('read_at', null);
            } else if (schema.columns.includes('read')) {
                query = query.eq('read', false);
            }

            console.log(`[SchemaDetector] メッセージクエリ構築完了`);
            return query;
        }

        /**
         * 全スキーマの検出とレポート
         */
        async detectAllSchemas() {
            const tables = ['events', 'matchings', 'messages', 'user_activities', 'users', 'profiles'];
            const report = {};

            for (const table of tables) {
                report[table] = await this.detectTableSchema(table);
            }

            console.log('[SchemaDetector] 全スキーマ検出レポート:', report);
            return report;
        }

        /**
         * スキーマレポートの生成
         */
        generateSchemaReport() {
            const report = [];
            
            report.push('=== Supabase Schema Report ===');
            report.push(`検出時刻: ${new Date().toLocaleString('ja-JP')}`);
            report.push('');

            for (const [tableName, schema] of Object.entries(this.detectedSchemas)) {
                report.push(`テーブル: ${tableName}`);
                if (schema.exists) {
                    report.push(`  状態: 存在`);
                    report.push(`  カラム数: ${schema.columns.length}`);
                    report.push(`  カラム: ${schema.columns.join(', ')}`);
                } else {
                    report.push(`  状態: 存在しない`);
                    report.push(`  エラー: ${schema.error}`);
                }
                report.push('');
            }

            return report.join('\n');
        }

        /**
         * 推奨される修正案の生成
         */
        async generateRecommendations() {
            await this.detectAllSchemas();
            const recommendations = [];

            // eventsテーブルの推奨
            const eventSchema = this.detectedSchemas.events;
            if (eventSchema && eventSchema.exists) {
                if (!eventSchema.columns.includes('event_date') && !eventSchema.columns.includes('date')) {
                    recommendations.push({
                        table: 'events',
                        issue: '標準的な日付カラムが見つかりません',
                        recommendation: 'event_dateまたはdateカラムの追加を推奨',
                        severity: 'warning'
                    });
                }
            }

            // matchingsテーブルの推奨
            if (!this.detectedSchemas.matchings || !this.detectedSchemas.matchings.exists) {
                recommendations.push({
                    table: 'matchings',
                    issue: 'テーブルが存在しません',
                    recommendation: 'matchingsテーブルを作成するか、user_activitiesテーブルを使用',
                    severity: 'error'
                });
            }

            return recommendations;
        }
    }

    // グローバルに公開
    window.supabaseSchemaDetector = new SupabaseSchemaDetector();

    // コンソールヘルプ
    console.log('[SchemaDetector] モジュールが読み込まれました');
    console.log('使用方法:');
    console.log('- supabaseSchemaDetector.detectAllSchemas() - 全テーブルのスキーマを検出');
    console.log('- supabaseSchemaDetector.generateSchemaReport() - スキーマレポートを生成');
    console.log('- supabaseSchemaDetector.generateRecommendations() - 推奨事項を生成');

})();