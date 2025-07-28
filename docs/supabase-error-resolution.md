# Supabase APIエラー解決ガイド

## 概要
ダッシュボードで発生していたSupabase APIエラー（400/404）を解決しました。

## 実装した修正

### 1. イベントテーブル（400エラー）
**問題**: `event_date`フィールドが存在しない
**解決策**: 
- `dashboard-event-calculator-fix.js`で自動フィールド検出機能を実装
- 優先順位: `event_date` → `date` → `start_date` → `created_at`

### 2. マッチングテーブル（404エラー）
**問題**: `matchings`テーブルが存在しない
**解決策**:
- `dashboard-matching-calculator-fix.js`で自動フォールバック機能を実装
- `user_activities`テーブルの`activity_type = 'matching'`を使用

### 3. メッセージテーブル（400エラー）
**問題**: フィールド構造の不一致
**解決策**:
- `dashboard-message-calculator-fix.js`で柔軟なフィールド検出を実装
- 受信者フィールド: `recipient_id` / `to_user_id` / `receiver_id`
- 既読フィールド: `is_read` / `read_at` / `read`

### 4. スキーマ検出器
`supabase-schema-detector.js`を追加して、データベース構造を自動検出

## 使用方法

### スキーマの確認
```javascript
// コンソールで実行
await supabaseSchemaDetector.detectAllSchemas()
```

### スキーマレポートの生成
```javascript
console.log(supabaseSchemaDetector.generateSchemaReport())
```

### 推奨事項の確認
```javascript
await supabaseSchemaDetector.generateRecommendations()
```

## 推奨されるデータベース構造

### eventsテーブル
```sql
CREATE TABLE events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    event_date date NOT NULL,  -- または date
    time text,
    location text,
    created_at timestamp with time zone DEFAULT now()
);
```

### matchingsテーブル（オプション）
```sql
CREATE TABLE matchings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id uuid REFERENCES auth.users(id),
    user2_id uuid REFERENCES auth.users(id),
    matched_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);
```

### messagesテーブル
```sql
CREATE TABLE messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES auth.users(id),
    recipient_id uuid REFERENCES auth.users(id),
    content text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);
```

## トラブルシューティング

### エラーが続く場合
1. ブラウザのキャッシュをクリア
2. F12でコンソールを開き、以下を実行:
   ```javascript
   await supabaseSchemaDetector.detectAllSchemas()
   ```
3. エラー内容を確認して、必要に応じてテーブル構造を調整

### パフォーマンスの改善
- キャッシュが30秒間有効
- 手動でキャッシュクリア: `dashboardStatsDebug.clearAllCaches()`

## 今後の改善案
1. Supabaseのデータベース構造を標準化
2. RLSポリシーの最適化
3. インデックスの追加でクエリ性能向上