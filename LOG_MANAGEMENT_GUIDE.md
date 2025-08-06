# コンソールログ管理システム 使用ガイド

## 概要
このシステムは、コンソールログの履歴管理、関数実行の追跡、重複実行の検出を行い、デバッグを効率化します。

## 含まれるファイル

1. **service-worker-filter.js**
   - Chrome拡張機能からのログスパムを削減
   - Service Worker関連のエラーをフィルタリング

2. **console-history-logger.js**
   - すべてのコンソールログを記録
   - タイムスタンプと呼び出し元情報を追加
   - 履歴の検索とエクスポート機能

3. **function-execution-tracker.js**
   - 関数の実行回数を追跡
   - 重複実行を検出して警告
   - パフォーマンス問題の特定

## 使い方

### コンソール履歴管理（ch コマンド）

```javascript
// すべての履歴を表示
ch.show()

// エラーのみ表示
ch.showErrors()

// 関数呼び出し統計を表示
ch.showFunctionStats()

// 重複実行を検出（2回以上実行された関数）
ch.findDuplicates()

// 特定の回数以上実行された関数を検出
ch.findDuplicates(5)

// 履歴をJSONファイルとしてエクスポート
ch.export()

// 履歴をクリア
ch.clear()
```

### 関数実行トラッカー（ft コマンド）

```javascript
// 実行統計を表示
ft.showStats()

// 特定関数の詳細を表示
ft.showDetails('updateUserInfo')

// 新しい関数を追跡対象に追加
ft.track('myFunction')

// 追跡をリセット
ft.reset()
```

## デバッグの流れ

1. **ページを開いてエラーを確認**
   ```javascript
   ch.showErrors()  // エラーのみ表示
   ```

2. **重複実行を確認**
   ```javascript
   ch.findDuplicates()  // 重複実行を検出
   ft.showStats()       // 実行統計を表示
   ```

3. **特定の関数を詳しく調査**
   ```javascript
   ft.showDetails('updateUserInfo')  // 実行履歴を表示
   ```

4. **ログをエクスポートして共有**
   ```javascript
   ch.export()  // JSONファイルとしてダウンロード
   ```

## 設定のカスタマイズ

```javascript
// Service Workerログのフィルタリングを無効化
window.ConsoleHistory.config.filterServiceWorker = false

// 重複実行の自動ブロックを有効化
window.FunctionTracker.config.blockDuplicates = true

// 追跡する関数を追加
window.FunctionTracker.config.trackingFunctions.push('myNewFunction')
```

## トラブルシューティング

### Q: ログが多すぎて見づらい
A: Service Workerフィルターが有効になっているか確認してください。

### Q: 特定の関数が追跡されない
A: `ft.track('関数名')` で手動で追加してください。

### Q: 履歴が消えた
A: ページリロード時に履歴はリセットされます。重要な情報は `ch.export()` で保存してください。

## 実装済みHTML

以下のHTMLファイルに既に組み込まれています：
- dashboard.html
- matching.html
- referral.html
- events.html

他のHTMLファイルに追加する場合は、`<script>` タグの最初に以下を追加：

```html
<!-- Service Workerログフィルター（最初に読み込む） -->
<script src="js/service-worker-filter.js"></script>
<!-- コンソール履歴管理 -->
<script src="js/console-history-logger.js"></script>
<!-- 関数実行トラッカー -->
<script src="js/function-execution-tracker.js"></script>
```

## 今後の改善案

1. ログの永続化（IndexedDB使用）
2. ビジュアルなダッシュボード
3. パフォーマンスメトリクスの追加
4. エラーパターンの自動検出