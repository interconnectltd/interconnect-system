/**
 * マッチング機能の設定ファイル
 * サーバーサイドページネーションの設定を含む
 */

window.MATCHING_CONFIG = {
    // ページネーション設定
    ITEMS_PER_PAGE: 6,          // 1ページあたりの表示件数
    MAX_PAGE_BUTTONS: 5,        // 表示するページボタンの最大数
    
    // パフォーマンス設定
    USE_SERVER_PAGINATION: true, // サーバーサイドページネーションを使用
    CACHE_DURATION: 5 * 60 * 1000, // キャッシュ有効期間（5分）
    DEBOUNCE_DELAY: 300,        // フィルター変更のデバウンス遅延
    
    // リトライ設定
    MAX_RETRIES: 3,             // 最大リトライ回数
    RETRY_DELAY: 1000,          // リトライ間隔（ミリ秒）
    
    // フィルター設定
    FILTERS: {
        industry: {
            'tech': 'IT・テクノロジー',
            'finance': '金融',
            'healthcare': '医療・ヘルスケア',
            'retail': '小売・流通',
            'manufacturing': '製造業',
            'consulting': 'コンサルティング',
            'education': '教育',
            'real_estate': '不動産',
            'media': 'メディア・広告',
            'other': 'その他'
        },
        location: {
            'tokyo': '東京',
            'osaka': '大阪',
            'nagoya': '名古屋',
            'fukuoka': '福岡',
            'sapporo': '札幌',
            'sendai': '仙台',
            'hiroshima': '広島',
            'kyoto': '京都',
            'kobe': '神戸',
            'remote': 'リモート',
            'overseas': '海外',
            'other': 'その他'
        },
        interest: {
            'collaboration': '協業',
            'investment': '投資',
            'mentoring': 'メンタリング',
            'networking': 'ネットワーキング',
            'hiring': '採用・人材',
            'partnership': 'パートナーシップ',
            'consulting': 'コンサルティング',
            'sales': '販売・営業'
        }
    },
    
    // ソート設定
    SORT_OPTIONS: {
        'score': 'マッチング度順',
        'newest': '新着順',
        'active': 'アクティブ順',
        'name': '名前順'
    },
    
    // マッチングスコア計算の重み
    SCORE_WEIGHTS: {
        industry: 0.3,          // 業界の一致
        location: 0.2,          // 地域の一致
        skills: 0.3,            // スキルの一致
        interests: 0.2          // 興味・関心の一致
    },
    
    // API設定
    API_ENDPOINTS: {
        profiles: 'profiles',
        connections: 'connections',
        messages: 'messages'
    },
    
    // UI設定
    UI: {
        SHOW_LOADING_SKELETON: true,    // スケルトンローディングを表示
        SHOW_MATCH_PERCENTAGE: true,    // マッチング率を表示
        ENABLE_INFINITE_SCROLL: false,  // 無限スクロール（将来実装）
        ANIMATION_DURATION: 300         // アニメーション時間（ミリ秒）
    },
    
    // デバッグ設定
    DEBUG: {
        LOG_QUERIES: false,             // SQLクエリをログ出力
        LOG_PERFORMANCE: false,         // パフォーマンス計測をログ出力
        SHOW_ERROR_DETAILS: true        // エラー詳細を表示
    }
};

// 設定の検証
(function validateConfig() {
    const config = window.MATCHING_CONFIG;
    
    // 必須項目のチェック
    if (config.ITEMS_PER_PAGE < 1 || config.ITEMS_PER_PAGE > 50) {
        console.warn('[MatchingConfig] ITEMS_PER_PAGE should be between 1 and 50');
        config.ITEMS_PER_PAGE = 6;
    }
    
    if (config.MAX_RETRIES < 0 || config.MAX_RETRIES > 10) {
        console.warn('[MatchingConfig] MAX_RETRIES should be between 0 and 10');
        config.MAX_RETRIES = 3;
    }
    
    console.log('[MatchingConfig] Configuration loaded successfully');
})();