# エラーハンドリング改善の実装ガイド

## 実施した改善内容

### 1. nullチェックの追加

#### auth-supabase.js
- `document.getElementById()`の結果に対するnullチェックを追加
- `localStorage`と`sessionStorage`へのアクセス前に存在確認を追加
- `window.supabase`オブジェクトの存在確認を追加

#### registration-flow.js
- フォーム要素取得時のnullチェックを追加（`getElementValue`ヘルパー関数を実装）
- ファイル処理時の要素存在確認を追加
- パスワード確認時の要素存在確認を追加

#### dashboard.js
- ストレージアクセス時の`typeof Storage`チェックを追加
- DOM要素の存在確認を追加
- try-catchブロックでストレージエラーをハンドリング

#### line-login-debug-full.js
- 文字列操作前のnullチェックを追加
- `btoa`関数のエラーハンドリングを追加
- URLパース時のエラーハンドリングを改善

### 2. 空のcatchブロックの修正

すべての空のcatchブロックに以下の処理を追加：
- `console.error()`でエラーログを出力
- ユーザーへの適切なエラーメッセージ表示
- エラーの詳細情報（メッセージ、スタックトレース）を記録

### 3. メモリリーク対策

#### cleanup-manager.js（新規作成）
- イベントリスナーの自動追跡と削除機能
- `setInterval`と`setTimeout`の管理機能
- ページ遷移時の自動クリーンアップ

#### global-error-handler.js（新規作成）
- グローバルエラーハンドラーの実装
- 未処理のPromiseエラーのキャッチ
- エラーログの保存と管理

### 4. イベントリスナーの適切な管理

- 名前付き関数を使用してリスナーを定義
- クリーンアップ用にハンドラーへの参照を保存
- 重複リスナーの防止

## 使用方法

### 1. HTMLファイルへの追加

各HTMLファイルの`<head>`セクションに以下を追加してください：

```html
<!-- エラーハンドリング関連 -->
<script src="js/global-error-handler.js"></script>
<script src="js/cleanup-manager.js"></script>
```

### 2. CleanupManagerの使用例

```javascript
// イベントリスナーの追加（自動追跡）
CleanupManager.addEventListener(
    document.getElementById('myButton'),
    'click',
    handleClick,
    { once: false }
);

// インターバルの設定（自動管理）
CleanupManager.setInterval(updateData, 5000, 'dataUpdateInterval');

// ページ遷移時のクリーンアップ
window.addEventListener('beforeunload', () => {
    CleanupManager.cleanupAll();
});
```

### 3. エラーハンドリングの使用例

```javascript
// try-catchの代わりにsafeExecuteを使用
await window.safeExecute(
    async () => {
        // エラーが発生する可能性のあるコード
        const data = await fetchData();
        return data;
    },
    'データ取得処理',
    'データの取得に失敗しました'
);

// 手動でエラーを記録
window.handleError(
    new Error('カスタムエラー'),
    'カスタム処理',
    'エラーが発生しました'
);
```

## 推奨事項

1. **新しいイベントリスナーを追加する際は`CleanupManager`を使用**
   - メモリリークを防ぐため、直接`addEventListener`を使用せず、`CleanupManager.addEventListener`を使用

2. **ストレージアクセス時は必ず存在確認**
   ```javascript
   if (typeof Storage !== 'undefined') {
       localStorage.setItem('key', 'value');
   }
   ```

3. **DOM要素アクセス時はnullチェック**
   ```javascript
   const element = document.getElementById('myElement');
   if (element) {
       element.textContent = 'Hello';
   }
   ```

4. **非同期処理では`safeExecute`を活用**
   - エラーが自動的にログに記録され、ユーザーに通知される

## テスト方法

1. **エラーログの確認**
   ```javascript
   // コンソールでエラーログを確認
   console.log(window.getErrorLog());
   ```

2. **メモリリークのチェック**
   - Chrome DevToolsのMemoryプロファイラを使用
   - ページ遷移を繰り返してメモリ使用量を監視

3. **エラーハンドリングのテスト**
   - ネットワークを切断してfetchエラーをテスト
   - ストレージを無効にしてストレージエラーをテスト

## 今後の改善提案

1. **エラーレポートサービスとの統合**
   - Sentryなどのエラー監視サービスと連携

2. **パフォーマンス監視**
   - 大量のイベントリスナーが登録された場合の警告機能

3. **自動リトライ機能**
   - ネットワークエラー時の自動再試行

4. **エラーの分類と優先度付け**
   - 重要度に応じたエラー通知の実装