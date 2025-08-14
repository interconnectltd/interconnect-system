# cashout_requests 404エラー修正ガイド

## 問題の概要
`cashout_requests`テーブルへのアクセス時に404エラーが発生する問題。

## 原因
1. **テーブル構造の不一致**: JavaScriptコードとSQLテーブル定義でカラム名が異なる
2. **user_pointsテーブルのカラム名相違**: `points`カラムが存在せず、`available_points`を使用
3. **point_transactionsテーブルの欠如**: ポイント履歴記録用テーブルが未作成

## 修正内容

### 1. テーブル構造の修正
**変更前（create-cashout-table.sql）**:
- 個別の銀行情報カラム（bank_name, branch_name等）
- `points`カラム使用

**変更後（complete-cashout-system-fix.sql）**:
- `bank_info` JSONBカラムで銀行情報を一括管理
- `amount`, `gross_amount`, `tax_amount`, `net_amount`カラム追加
- RLSポリシーの適切な設定

### 2. 関数の修正
**deduct_user_points関数**:
- `points` → `available_points`カラムに変更
- `spent_points`カラムも同時に更新
- トランザクションレベルのロック追加
- エラーメッセージの改善

### 3. 新規テーブル追加
**point_transactionsテーブル**:
- ポイントの増減履歴を記録
- 残高追跡機能
- 参照IDによる関連付け

## 実装手順

### 1. SQLの実行
```sql
-- Supabase SQL Editorで実行
-- /sql/complete-cashout-system-fix.sql の内容を実行
```

### 2. 実行順序
1. point_transactionsテーブル作成
2. cashout_requestsテーブル削除・再作成
3. user_pointsテーブル確認・初期化
4. RPC関数の作成・更新
5. トリガー設定

### 3. 確認事項
```sql
-- テーブル構造確認
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name IN ('cashout_requests', 'point_transactions', 'user_points')
ORDER BY table_name, ordinal_position;

-- RLSポリシー確認
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('cashout_requests', 'point_transactions', 'user_points');
```

## JavaScriptコードとの互換性

### cashout-modal.js の使用例
```javascript
// 正しい構造でデータを送信
const { data, error } = await supabase
    .from('cashout_requests')
    .insert({
        user_id: user.id,
        amount: amount,
        gross_amount: amount,
        tax_amount: Math.floor(amount * 0.1021),
        net_amount: amount - Math.floor(amount * 0.1021),
        bank_info: {
            bank_name: '〇〇銀行',
            branch_name: '〇〇支店',
            account_type: '普通',
            account_number: '1234567',
            account_holder: 'ヤマダ タロウ'
        },
        status: 'pending'
    });
```

## トラブルシューティング

### 1. 権限エラーの場合
```sql
-- 権限の再付与
GRANT ALL ON cashout_requests TO authenticated;
GRANT ALL ON point_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_user_points TO authenticated;
```

### 2. ポイント不足エラー
- user_pointsテーブルにレコードが存在するか確認
- available_pointsの値を確認

### 3. RLSエラー
- auth.uid()が正しく取得できているか確認
- ポリシーが正しく設定されているか確認

## 次のステップ

1. 管理画面での換金申請処理機能
2. 換金履歴表示機能
3. ポイント履歴詳細表示
4. 源泉徴収票発行機能