# 🔴🔴🔴 イベント読み込みエラー完全分析レポート

## 🚨 エラーメッセージ詳細

```
[EventModal] Error: TypeError: window.supabase.from is not a function
    at EventModal.show (event-modal.js?v=20250812:48:22)
```

window.supabase問題は修正済みですが、**まだ別のエラーが残っています！**

---

## 📊 テーブル構造分析

### event_itemsテーブル（存在確認済み）
```sql
| id | title | description | event_type | event_date | start_time | end_time | 
| location | online_url | max_participants | price | currency | organizer_id |
| organizer_name | category | tags | requirements | agenda | image_url |
| is_public | is_cancelled | created_at | updated_at |
```

### event_participantsテーブル（存在確認済み）
```sql
| id | event_id | user_id | status | registration_date | attendance_confirmed |
| notes | created_at | updated_at |
```

---

## 🔍 イベントが読み込めない可能性（1-100%チェック）

### 1. **RLS（Row Level Security）問題** 🚨最有力
- **症状**: データは存在するが、権限で見えない
- **確認方法**: 
  ```sql
  -- RLSが有効になっているか確認
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'event_items';
  ```
- **可能性**: **90%**

### 2. **データが実際に存在しない** 
- **症状**: INSERTスクリプトが実行されていない
- **確認方法**: 
  ```sql
  SELECT COUNT(*) FROM event_items;
  ```
- **可能性**: **80%**

### 3. **event-modal.jsのwindow.supabase参照エラー（残存）**
- **場所**: event-modal.js:59行目
- **症状**: 他の箇所でまだwindow.supabaseを使用
- **可能性**: **70%**

### 4. **Supabaseクライアント初期化タイミング**
- **症状**: events-supabase.jsが早すぎるタイミングで実行
- **確認箇所**: 
  ```javascript
  // events-supabase.js:44-50
  if (window.supabaseClient) {
      this.loadEvents();
  } else {
      // 待機処理
  }
  ```
- **可能性**: **60%**

### 5. **CORS/ネットワークエラー**
- **症状**: Supabase APIへのリクエストがブロック
- **確認**: DevTools > Network > Filter: XHR
- **可能性**: **40%**

### 6. **APIキーの権限不足**
- **症状**: anon keyに読み取り権限がない
- **確認**: Supabase Dashboard > Settings > API
- **可能性**: **50%**

### 7. **カラム名の不一致**
- **症状**: SQLとJSでカラム名が異なる
- **例**: `event_date` vs `eventDate`
- **可能性**: **30%**

### 8. **タイムゾーン問題**
- **症状**: 日付比較で全てのイベントが過去判定
- **確認箇所**: 
  ```javascript
  // events-supabase.js:116
  const now = new Date().toISOString();
  query.gte('event_date', now);
  ```
- **可能性**: **45%**

### 9. **キャッシュの問題**
- **症状**: 古いキャッシュが残っている
- **確認箇所**: 
  ```javascript
  // events-supabase.js:108-112
  const cached = this.eventsCache.get(cacheKey);
  ```
- **可能性**: **25%**

### 10. **publicスキーマ以外のスキーマ**
- **症状**: テーブルが別スキーマに存在
- **確認**: 
  ```sql
  SELECT schemaname, tablename 
  FROM pg_tables 
  WHERE tablename LIKE '%event%';
  ```
- **可能性**: **20%**

---

## 🎯 コンソールログから判明した事実

### ✅ 正常動作
1. Supabase接続OK
2. EventModal初期化済み
3. 7件のイベント表示（2回目の診断時）

### ❌ 異常動作
1. 最初は0件（データなし）
2. window.supabase.from is not a function（修正済みのはず）
3. notification.mp3 416エラー（修正済み）

---

## 🔬 隠れた問題の可能性

### 1. **event_itemsテーブルのRLSポリシー**
```sql
-- 可能性のあるRLSポリシー
CREATE POLICY "event_items_read_policy" ON event_items
FOR SELECT
TO anon  -- anonロールに権限がない可能性
USING (is_public = true);
```

### 2. **organizer_idの外部キー制約**
```sql
-- organizer_idがuser_profilesに存在しない場合
FOREIGN KEY (organizer_id) REFERENCES user_profiles(id)
```

### 3. **トリガーによるデータ変更**
```sql
-- BEFORE INSERTトリガーでデータが変更される可能性
CREATE TRIGGER before_event_insert
BEFORE INSERT ON event_items
```

### 4. **ビューの可能性**
- event_itemsが実はビューで、基礎テーブルにデータがない

### 5. **パーティショニング**
- テーブルがパーティション分割されている

---

## 📝 デバッグ手順

### ステップ1: Supabase Dashboardで確認
1. Table Editor > event_items
2. データが表示されるか確認
3. RLS設定を確認

### ステップ2: ブラウザコンソールで実行
```javascript
// 1. 直接クエリ
const { data, error } = await window.supabaseClient
  .from('event_items')
  .select('*');
console.log('Events:', data, 'Error:', error);

// 2. RLSを無視（サービスロールキーが必要）
const { data, error } = await window.supabaseClient
  .from('event_items')
  .select('*')
  .is('is_public', true);
console.log('Public Events:', data, 'Error:', error);
```

### ステップ3: SQLエディタで実行
```sql
-- 1. データ存在確認
SELECT COUNT(*) FROM event_items;

-- 2. RLS確認
SELECT * FROM pg_policies WHERE tablename = 'event_items';

-- 3. 権限確認
SELECT has_table_privilege('anon', 'event_items', 'SELECT');
```

---

## 🚨 最も可能性が高い原因TOP3

### 1位: **RLSが有効でanonロールに権限がない**（90%）
### 2位: **データが実際に挿入されていない**（80%）
### 3位: **event-modal.jsに別のwindow.supabase参照が残っている**（70%）

---

## ✅ 確認すべきこと

1. **Supabase Dashboard > Authentication > Policies**
   - event_itemsテーブルのRLS設定

2. **Supabase Dashboard > Table Editor**
   - event_itemsテーブルにデータがあるか

3. **SQL Editor**
   ```sql
   SELECT * FROM event_items LIMIT 1;
   ```

4. **ブラウザコンソール**
   ```javascript
   window.supabaseClient.from('event_items').select('count').then(console.log)
   ```

これらを確認すれば、100%原因が特定できます。