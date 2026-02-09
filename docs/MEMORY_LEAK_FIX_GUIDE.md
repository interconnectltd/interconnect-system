# メモリリーク修正ガイド

## 発見された問題と修正内容

### 1. **重大な問題**

#### main.js
- ❌ **問題**: IntersectionObserverが解放されていない
- ❌ **問題**: 多数のイベントリスナーが削除されていない
- ❌ **問題**: ビデオリソースが適切に解放されていない
- ✅ **修正**: `main-fixed.js`で全ての問題を修正

#### loading-screen.js
- ❌ **問題**: setIntervalのクリア時の競合状態
- ❌ **問題**: window.loadイベントが削除されていない
- ❌ **問題**: ビデオリソースが解放されていない
- ✅ **修正**: `loading-screen-fixed.js`で全ての問題を修正

#### background-animation.js
- ❌ **問題**: 無限ループのrequestAnimationFrame
- ❌ **問題**: resizeイベントリスナーが削除されていない
- ❌ **問題**: ページ遷移時もアニメーションが継続
- ✅ **修正**: `background-animation-fixed.js`で全ての問題を修正

#### scroll-fade.js
- ❌ **問題**: 複数のIntersectionObserverが解放されていない
- ❌ **問題**: カウンターアニメーションのsetIntervalが残る可能性
- ⚠️ **注意**: 現在のままでも動作するが、長時間使用で問題が発生する可能性

### 2. **CSSアニメーションの問題**

- ❌ **問題**: 多数の無限ループアニメーション
- ✅ **修正**: `animations-performance.css`でパフォーマンス最適化

## 適用方法

### ステップ1: JavaScriptファイルの置き換え

```bash
# バックアップを作成
cp js/main.js js/main.backup.js
cp js/loading-screen.js js/loading-screen.backup.js
cp js/background-animation.js js/background-animation.backup.js

# 修正版に置き換え
cp js/main-fixed.js js/main.js
cp js/loading-screen-fixed.js js/loading-screen.js
cp js/background-animation-fixed.js js/background-animation.js
```

### ステップ2: CSSの追加

index.htmlに以下を追加:

```html
<!-- 既存のCSSの後に追加 -->
<link rel="stylesheet" href="css/animations-performance.css">
```

### ステップ3: パフォーマンス監視（開発環境のみ）

開発環境でメモリリークを監視したい場合:

```html
<!-- bodyタグの最後に追加 -->
<script src="js/performance-monitor.js"></script>
```

コンソールで状態確認:
```javascript
// 現在の状態を確認
PerformanceMonitor.getStatus()

// レポートをクリア
PerformanceMonitor.clearReports()
```

## 修正内容の詳細

### 1. イベントリスナー管理
- 全てのaddEventListenerに対応するremoveEventListenerを追加
- イベントリスナーを配列で管理し、一括削除可能に

### 2. タイマー管理
- setTimeout/setIntervalのIDを管理
- ページ遷移時に全てクリア

### 3. Observer管理
- IntersectionObserverを配列で管理
- クリーンアップ時にdisconnect()を呼び出し

### 4. ビデオリソース管理
- ビデオ要素削除時にsrcをクリア
- pause()とload()でリソースを解放

### 5. アニメーション最適化
- 無限ループアニメーションを有限回数に変更
- 非表示時はアニメーションを一時停止
- GPU最適化とcontainプロパティの使用

## 効果測定

修正前後でメモリ使用量を比較:

1. Chrome DevToolsのMemoryタブを開く
2. Heap snapshotを取得
3. 10分間サイトを操作
4. 再度Heap snapshotを取得して比較

期待される改善:
- メモリ使用量の増加が大幅に減少
- 長時間使用してもパフォーマンスが劣化しない
- モバイルデバイスでのバッテリー消費が改善

## 注意事項

1. **テスト環境で十分にテストしてから本番環境に適用してください**
2. **既存の機能が正常に動作することを確認してください**
3. **モバイルデバイスでの動作確認を忘れずに**

## トラブルシューティング

問題が発生した場合:

1. コンソールエラーを確認
2. バックアップファイルから復元
3. 段階的に修正を適用（まずmain.jsのみなど）

## 今後の推奨事項

1. **コードレビュー**: 新しいコードを追加する際は必ずクリーンアップ処理を確認
2. **定期的な監視**: PerformanceMonitorを使用して定期的にチェック
3. **アニメーション**: 新しいアニメーションは必ず有限回数か、適切な停止条件を設定