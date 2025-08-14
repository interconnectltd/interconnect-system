# イベントページ トラブルシューティングガイド

## 🚨 現在の問題と解決策

### 問題1: showCreateEventModal is not defined エラー

#### 即座の解決策（ユーザー側）
1. **強制リロード**
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **キャッシュクリア**
   - Chrome: 設定 → プライバシー → 閲覧履歴データの削除
   - キャッシュされた画像とファイルをクリア

3. **URLパラメータ追加**
   - `https://interconnects.info/events.html?nocache=1` でアクセス

#### 技術的解決策（開発側）

##### A. キャッシュバスティング強化
```javascript
// events.htmlに追加
<script src="js/calendar-integration.js?v=<?php echo time(); ?>"></script>
```

##### B. エラーの完全抑制
```javascript
// calendar-integration.jsの該当箇所を修正
function handleDateClick(info) {
    try {
        // showCreateEventModalが存在する場合のみ実行
        if (typeof window.showCreateEventModal === 'function') {
            window.showCreateEventModal(info.dateStr);
        } else {
            // 代替処理
            console.log('イベント作成機能は準備中です');
            if (window.showToast) {
                window.showToast('イベント作成機能は準備中です', 'info');
            }
        }
    } catch (error) {
        // エラーを完全に抑制
        console.log('カレンダークリック処理でエラーを回避しました');
    }
}
```

### 問題2: イベントが読み込まれない

#### 即座の解決策

##### 1. Supabase接続確認
```javascript
// ブラウザコンソールで実行
if (window.supabaseClient) {
    console.log('✅ Supabase接続OK');
} else {
    console.log('❌ Supabase未接続');
}
```

##### 2. 手動でイベント読み込み
```javascript
// ブラウザコンソールで実行
if (window.eventsSupabase) {
    window.eventsSupabase.loadEvents();
    window.eventsSupabase.loadPastEvents();
}
```

##### 3. デバッグツール使用
```javascript
// events-debug.jsを読み込んで診断
EventsDebug.diagnose();  // 問題診断
EventsDebug.autoFix();   // 自動修復
```

#### 長期的解決策

##### A. 多層防御アプローチ
```javascript
// 1. Supabase接続の多重確認
async function ensureSupabaseConnection() {
    let retries = 0;
    const maxRetries = 5;
    
    while (!window.supabaseClient && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries++;
    }
    
    if (!window.supabaseClient) {
        // フォールバック: ローカルストレージから読み込み
        loadFromLocalStorage();
    }
}

// 2. データ取得の冗長化
async function loadEventsWithFallback() {
    try {
        // プライマリ: Supabase
        await loadFromSupabase();
    } catch (error) {
        try {
            // セカンダリ: キャッシュ
            await loadFromCache();
        } catch (cacheError) {
            // フォールバック: 静的データ
            loadStaticEvents();
        }
    }
}

// 3. プログレッシブエンハンスメント
function progressiveEventLoading() {
    // ステップ1: 静的プレースホルダー表示
    showPlaceholders();
    
    // ステップ2: キャッシュデータ表示
    loadCachedEvents().then(events => {
        if (events) updateDisplay(events);
    });
    
    // ステップ3: 最新データ取得
    fetchLatestEvents().then(events => {
        updateDisplay(events);
        updateCache(events);
    });
}
```

##### B. エラーリカバリーシステム
```javascript
class EventsErrorRecovery {
    constructor() {
        this.errorCount = 0;
        this.maxErrors = 3;
        this.recoveryStrategies = [
            this.reloadSupabase,
            this.clearCacheAndReload,
            this.loadOfflineMode,
            this.showMaintenanceMessage
        ];
    }
    
    async handleError(error) {
        this.errorCount++;
        
        if (this.errorCount <= this.maxErrors) {
            // 段階的リカバリー
            const strategy = this.recoveryStrategies[this.errorCount - 1];
            await strategy.call(this);
        } else {
            // 最終手段
            this.showErrorPage();
        }
    }
    
    async reloadSupabase() {
        console.log('♻️ Supabase再接続を試行...');
        // 実装
    }
    
    async clearCacheAndReload() {
        console.log('🧹 キャッシュクリア&再読み込み...');
        // 実装
    }
    
    async loadOfflineMode() {
        console.log('📴 オフラインモードに切り替え...');
        // 実装
    }
    
    showMaintenanceMessage() {
        console.log('🔧 メンテナンスメッセージ表示...');
        // 実装
    }
}
```

##### C. パフォーマンス最適化
```javascript
// 1. 遅延読み込み
const lazyLoadEvents = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            loadEventDetails(entry.target.dataset.eventId);
        }
    });
});

// 2. バーチャルスクロール
class VirtualEventsList {
    constructor() {
        this.visibleRange = { start: 0, end: 10 };
        this.allEvents = [];
    }
    
    renderVisible() {
        const visible = this.allEvents.slice(
            this.visibleRange.start,
            this.visibleRange.end
        );
        this.updateDOM(visible);
    }
}

// 3. Service Workerキャッシュ
self.addEventListener('fetch', event => {
    if (event.request.url.includes('/api/events')) {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request).then(fetchResponse => {
                    return caches.open('events-v1').then(cache => {
                        cache.put(event.request, fetchResponse.clone());
                        return fetchResponse;
                    });
                });
            })
        );
    }
});
```

## 🛠️ 診断コマンド集

### ブラウザコンソールで実行

```javascript
// 完全診断
EventsDebug.diagnose();

// 自動修復
EventsDebug.autoFix();

// Supabase状態確認
console.log('Supabase:', window.supabaseClient ? '✅' : '❌');
console.log('EventModal:', window.eventModal ? '✅' : '❌');
console.log('EventsSupabase:', window.eventsSupabase ? '✅' : '❌');

// イベント数確認
document.querySelectorAll('.event-card').length;

// 強制リロード
location.reload(true);

// キャッシュバイパス
location.href = location.href.split('?')[0] + '?v=' + Date.now();
```

## 📊 チェックリスト

### ユーザー側で確認すること
- [ ] ブラウザは最新版か
- [ ] 拡張機能が干渉していないか
- [ ] ネットワーク接続は安定しているか
- [ ] JavaScriptが有効になっているか
- [ ] クッキーが有効になっているか

### 開発側で確認すること
- [ ] Supabaseの接続情報が正しいか
- [ ] RLS（Row Level Security）設定が適切か
- [ ] APIキーが有効か
- [ ] デプロイが成功しているか
- [ ] CDNキャッシュが更新されているか

## 🚀 緊急対応手順

1. **問題発生時**
   - デバッグツールで診断: `EventsDebug.diagnose()`
   - エラーログを収集
   - スクリーンショットを撮影

2. **一次対応**
   - 自動修復を試行: `EventsDebug.autoFix()`
   - キャッシュクリア
   - 別ブラウザで確認

3. **二次対応**
   - フォールバックモードに切り替え
   - 静的データを表示
   - メンテナンスメッセージ表示

4. **根本対応**
   - エラーログ分析
   - コード修正
   - テスト環境で検証
   - 本番デプロイ

## 📝 今後の改善案

1. **エラーモニタリング導入**
   - Sentry等のエラートラッキング
   - リアルタイムアラート
   - パフォーマンス監視

2. **Progressive Web App化**
   - オフライン対応
   - バックグラウンド同期
   - プッシュ通知

3. **CDN最適化**
   - エッジキャッシング
   - 画像最適化
   - コード分割

4. **A/Bテスト**
   - 異なる読み込み戦略の比較
   - ユーザー体験の最適化
   - エラー率の削減