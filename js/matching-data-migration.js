/**
 * データ移行ツール
 * 旧形式から新形式への完全移行をサポート
 */

class MatchingDataMigration {
    constructor() {
        this.migrationVersion = '2.0.0';
        this.backupPrefix = 'backup_matching_';
    }

    /**
     * 移行が必要かチェック
     */
    async checkMigrationNeeded() {
        const currentVersion = localStorage.getItem('matchingDataVersion');
        if (currentVersion === this.migrationVersion) {
            return false;
        }

        // サンプルデータをチェック
        const sampleKeys = Object.keys(localStorage)
            .filter(key => key.startsWith('ai_score_'))
            .slice(0, 5);

        let oldFormatCount = 0;
        let newFormatCount = 0;

        sampleKeys.forEach(key => {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data.breakdown) {
                    if ('commonTopics' in data.breakdown) oldFormatCount++;
                    if ('businessSynergy' in data.breakdown) newFormatCount++;
                }
            } catch (e) {
                // 無視
            }
        });

        return oldFormatCount > 0 || currentVersion !== this.migrationVersion;
    }

    /**
     * データのバックアップ
     */
    async backupData() {
        const backup = {
            version: localStorage.getItem('matchingDataVersion') || '1.0.0',
            timestamp: new Date().toISOString(),
            data: {}
        };

        // マッチング関連のデータをすべてバックアップ
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('ai_score_') || 
                key.startsWith('matching_') || 
                key === 'matchingDataVersion') {
                backup.data[key] = localStorage.getItem(key);
            }
        });

        // バックアップを保存
        const backupKey = `${this.backupPrefix}${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(backup));

        console.log(`[DataMigration] バックアップ作成完了: ${backupKey}`);
        return backupKey;
    }

    /**
     * データ移行の実行
     */
    async migrate() {
        console.log('[DataMigration] データ移行を開始します...');

        // 1. バックアップ作成
        const backupKey = await this.backupData();

        try {
            // 2. スコアデータの移行
            await this.migrateScoreData();

            // 3. プロフィールデータの移行
            await this.migrateProfileData();

            // 4. キャッシュのクリア
            await this.clearOldCaches();

            // 5. バージョン更新
            localStorage.setItem('matchingDataVersion', this.migrationVersion);

            console.log('[DataMigration] データ移行が完了しました');
            return {
                success: true,
                backupKey: backupKey,
                message: 'データ移行が正常に完了しました'
            };

        } catch (error) {
            console.error('[DataMigration] 移行エラー:', error);
            
            // ロールバック
            await this.rollback(backupKey);
            
            return {
                success: false,
                error: error.message,
                message: 'データ移行に失敗しました。バックアップから復元しました。'
            };
        }
    }

    /**
     * スコアデータの移行
     */
    async migrateScoreData() {
        const scoreKeys = Object.keys(localStorage)
            .filter(key => key.startsWith('ai_score_'));

        let migrated = 0;
        let failed = 0;

        for (const key of scoreKeys) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                
                if (data.breakdown) {
                    // 旧形式かチェック
                    if ('commonTopics' in data.breakdown && !('businessSynergy' in data.breakdown)) {
                        // 変換
                        const newBreakdown = this.convertBreakdown(data.breakdown);
                        data.breakdown = newBreakdown;
                        
                        // タイムスタンプ更新
                        data.timestamp = Date.now();
                        data.migrated = true;
                        
                        // 保存
                        localStorage.setItem(key, JSON.stringify(data));
                        migrated++;
                    }
                }
            } catch (error) {
                console.error(`[DataMigration] スコアデータ移行エラー (${key}):`, error);
                failed++;
            }
        }

        console.log(`[DataMigration] スコアデータ移行完了: ${migrated}件成功, ${failed}件失敗`);
    }

    /**
     * プロフィールデータの移行
     */
    async migrateProfileData() {
        // プロフィール関連のキャッシュを更新
        const profileKeys = Object.keys(localStorage)
            .filter(key => key.startsWith('matching_profile_'));

        for (const key of profileKeys) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                
                // 古いフォーマットの場合は削除（再取得を強制）
                if (data && !data.version) {
                    localStorage.removeItem(key);
                }
            } catch (error) {
                // 破損データは削除
                localStorage.removeItem(key);
            }
        }
    }

    /**
     * 古いキャッシュのクリア
     */
    async clearOldCaches() {
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7日

        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('cache_') || key.startsWith('temp_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data.timestamp && (now - data.timestamp) > maxAge) {
                        localStorage.removeItem(key);
                    }
                } catch (e) {
                    // 解析できないキャッシュは削除
                    localStorage.removeItem(key);
                }
            }
        });
    }

    /**
     * スコアブレークダウンの変換
     */
    convertBreakdown(oldBreakdown) {
        const conversionRules = {
            commonTopics: (value) => ({
                businessTrends: Math.round(value * 0.7),
                businessSynergy: Math.round(value * 0.3)
            }),
            communicationStyle: (value) => ({
                urgencyAlignment: Math.round(value * 0.6),
                resourceComplement: Math.round(value * 0.4)
            }),
            emotionalSync: (value) => ({
                growthPhaseMatch: value
            }),
            activityOverlap: (value) => ({
                urgencyAlignment: Math.round(value * 0.5),
                businessTrends: Math.round(value * 0.5)
            }),
            profileMatch: (value) => ({
                solutionMatch: Math.round(value * 0.6),
                resourceComplement: Math.round(value * 0.4)
            })
        };

        const newBreakdown = {
            businessSynergy: 50,
            solutionMatch: 50,
            businessTrends: 50,
            growthPhaseMatch: 50,
            urgencyAlignment: 50,
            resourceComplement: 50
        };

        // 変換実行
        Object.entries(oldBreakdown).forEach(([key, value]) => {
            if (conversionRules[key] && typeof value === 'number') {
                const converted = conversionRules[key](value);
                Object.entries(converted).forEach(([newKey, newValue]) => {
                    // 平均を取る（複数の旧値が同じ新値にマップされる場合）
                    newBreakdown[newKey] = Math.round(
                        (newBreakdown[newKey] + newValue) / 2
                    );
                });
            }
        });

        // 範囲チェック
        Object.keys(newBreakdown).forEach(key => {
            newBreakdown[key] = Math.max(0, Math.min(100, newBreakdown[key]));
        });

        return newBreakdown;
    }

    /**
     * ロールバック
     */
    async rollback(backupKey) {
        console.log('[DataMigration] ロールバックを実行します...');

        try {
            const backup = JSON.parse(localStorage.getItem(backupKey));
            
            if (!backup) {
                throw new Error('バックアップが見つかりません');
            }

            // すべてのマッチング関連データをクリア
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('ai_score_') || 
                    key.startsWith('matching_') || 
                    key === 'matchingDataVersion') {
                    localStorage.removeItem(key);
                }
            });

            // バックアップから復元
            Object.entries(backup.data).forEach(([key, value]) => {
                localStorage.setItem(key, value);
            });

            console.log('[DataMigration] ロールバック完了');
        } catch (error) {
            console.error('[DataMigration] ロールバックエラー:', error);
            throw error;
        }
    }

    /**
     * 移行状態のレポート
     */
    generateMigrationReport() {
        const report = {
            currentVersion: localStorage.getItem('matchingDataVersion') || 'unknown',
            targetVersion: this.migrationVersion,
            dataStats: {
                totalScores: 0,
                oldFormat: 0,
                newFormat: 0,
                corrupted: 0
            },
            backups: []
        };

        // スコアデータの統計
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('ai_score_')) {
                report.dataStats.totalScores++;
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data.breakdown) {
                        if ('businessSynergy' in data.breakdown) {
                            report.dataStats.newFormat++;
                        } else if ('commonTopics' in data.breakdown) {
                            report.dataStats.oldFormat++;
                        }
                    }
                } catch (e) {
                    report.dataStats.corrupted++;
                }
            } else if (key.startsWith(this.backupPrefix)) {
                report.backups.push(key);
            }
        });

        return report;
    }
}

// グローバルに公開
window.matchingDataMigration = new MatchingDataMigration();

// 自動移行チェック
(async function() {
    const migration = window.matchingDataMigration;
    
    if (await migration.checkMigrationNeeded()) {
        console.log('[DataMigration] データ移行が必要です');
        console.log('[DataMigration] 移行実行: window.matchingDataMigration.migrate()');
        console.log('[DataMigration] レポート: window.matchingDataMigration.generateMigrationReport()');
        
        // 通知を表示
        if (window.showNotification) {
            window.showNotification(
                'データ形式の更新があります。最適なパフォーマンスのため、データ移行を実行してください。',
                'info'
            );
        }
    }
})();