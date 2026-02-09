# アニメーション最適化ガイド

## 実装した最適化

### 1. AnimationManager の導入
統一されたrequestAnimationFrameマネージャーを作成しました。

**機能：**
- 複数のアニメーションを1つのrequestAnimationFrameで管理
- 自動的なFPS調整（30/60/120 FPS）
- ページ非表示時の自動停止
- パフォーマンスモニタリング
- バッテリーセーバー対応

### 2. 修正したファイル

#### background-animation.js
- AnimationManagerに統合
- 個別のrequestAnimationFrameを削除
- クリーンアップ処理を追加

#### presentation.js & monodukuri-presentation.js
- カウンターアニメーションをAnimationManagerに統合
- deltaTimeベースの更新で一貫したアニメーション速度を実現

### 3. 使用方法

```javascript
// アニメーションの登録
AnimationManager.register('myAnimation', (deltaTime, currentTime) => {
    // アニメーションコード
}, {
    priority: 1,  // 優先度（高い値が先に実行される）
    fps: 60      // 希望するFPS（省略可能）
});

// アニメーションの解除
AnimationManager.unregister('myAnimation');

// ステータス確認
console.log(AnimationManager.getStatus());
```

### 4. パフォーマンスの改善

#### Before（問題点）
- 各アニメーションが独自のrequestAnimationFrameを使用
- ページ非表示時もアニメーションが継続
- FPS制御なし
- メモリリークの可能性

#### After（改善後）
- 統一されたアニメーションループ
- 自動的なパフォーマンス調整
- ページ非表示時の自動停止
- 適切なクリーンアップ

### 5. パフォーマンスモード

**自動調整：**
- FPS < 30：低パフォーマンスモード（30 FPS）に切り替え
- FPS > 50：通常モードに復帰
- バッテリー残量20%未満：FPSを半分に削減

### 6. 今後の推奨事項

1. **新しいアニメーションを追加する場合**
   - 必ずAnimationManagerを使用する
   - 適切な優先度を設定する
   - クリーンアップ処理を忘れない

2. **既存のアニメーションの移行**
   - background-animation-fixed.js も同様に移行可能
   - settings-navigation.js のrequestAnimationFrameも統合推奨

3. **モニタリング**
   - 定期的に`AnimationManager.getStatus()`でパフォーマンスを確認
   - 実際のFPSが目標値を大きく下回る場合は最適化を検討

## メモリ使用量の削減

AnimationManagerの導入により：
- 無駄なアニメーションループが削減
- ページ遷移時の適切なクリーンアップ
- バックグラウンドタブでのCPU使用率がゼロに

これにより、ユーザー体験を損なうことなく、システムリソースの効率的な使用が実現されました。