# 換金システム修正手順

## エラーの原因
`ERROR: 42703: column "type" does not exist`

既存の`point_transactions`テーブルは`type`カラムではなく`transaction_type`カラムを使用しています。

## 修正内容

### 1. テーブル構造の違い

**point_transactionsテーブル**
- ❌ `type` → ✅ `transaction_type`
- ❌ `amount` → ✅ `points`
- ❌ `description` → ✅ `reason`

### 2. 実行するSQL
```sql
-- Supabase SQL Editorで実行
-- /sql/fix-cashout-system-final.sql の内容を実行
```

### 3. 主な修正点

1. **deduct_user_points関数**
   ```sql
   INSERT INTO point_transactions (
       user_id,
       transaction_type,  -- 'type'ではなく'transaction_type'
       points,           -- 'amount'ではなく'points'
       reason,           -- 'description'ではなく'reason'
       created_at
   )
   ```

2. **cashout_requestsテーブル**
   - 既存テーブルがある場合は削除せずにCREATE IF NOT EXISTSを使用
   - bank_info JSONBカラムで銀行情報を管理

3. **RLSポリシー**
   - 既存のポリシーを削除してから再作成
   - 適切な権限設定

## 実行順序

1. まず現在のテーブル構造を確認
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'point_transactions'
   ORDER BY ordinal_position;
   ```

2. fix-cashout-system-final.sqlを実行

3. 動作確認
   ```sql
   -- テスト用のポイント追加
   SELECT add_user_points(
       auth.uid(), 
       1000, 
       'manual_adjustment', 
       'テスト用ポイント'
   );
   ```

## JavaScriptコードの確認

cashout-modal.jsは変更不要です。既に正しい構造でデータを送信しています：

```javascript
const { data, error } = await supabase
    .from('cashout_requests')
    .insert({
        user_id: user.id,
        amount: amount,
        gross_amount: amount,
        tax_amount: Math.floor(amount * 0.1021),
        net_amount: amount - Math.floor(amount * 0.1021),
        bank_info: bankInfo,  // JSONB形式
        status: 'pending'
    });
```

## トラブルシューティング

### エラー: "ユーザーのポイント情報が見つかりません"
```sql
-- user_pointsレコードを作成
INSERT INTO user_points (user_id, total_points, available_points, spent_points, level)
VALUES (auth.uid(), 0, 0, 0, 1)
ON CONFLICT (user_id) DO NOTHING;
```

### エラー: "ポイントが不足しています"
```sql
-- 現在のポイント残高を確認
SELECT available_points 
FROM user_points 
WHERE user_id = auth.uid();
```

## 確認事項

1. ✅ point_transactionsテーブルのカラム名が正しい
2. ✅ cashout_requestsテーブルが作成されている
3. ✅ RLSポリシーが適切に設定されている
4. ✅ user_pointsレコードが存在する
5. ✅ available_pointsが十分にある