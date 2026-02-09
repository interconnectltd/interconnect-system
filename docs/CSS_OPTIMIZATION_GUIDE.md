# CSS最適化ガイド

## 問題点

### 1. !important の過剰使用（240箇所）
- navbar-fresh.css: 118箇所
- debug-line-button.css: 26箇所
- buttons.css: 14箇所

### 2. z-indexの極端な値
- z-index: 10000 (user-menu-fix.css)
- z-index: 9999 (複数ファイル)
- z-index: 9998, 9997 (階層が複雑)

## 推奨される修正

### 1. !important の削減
```css
/* 悪い例 */
.button {
    background: red !important;
    color: white !important;
}

/* 良い例 - より具体的なセレクタを使用 */
.auth-container .auth-button.line-button {
    background: #00C300;
    color: white;
}
```

### 2. z-index の標準化
```css
/* z-index の標準値 */
:root {
    --z-index-dropdown: 1000;
    --z-index-sticky: 1020;
    --z-index-fixed: 1030;
    --z-index-modal-backdrop: 1040;
    --z-index-modal: 1050;
    --z-index-popover: 1060;
    --z-index-tooltip: 1070;
}

/* 使用例 */
.modal {
    z-index: var(--z-index-modal);
}
```

### 3. CSSの整理手順

1. **重複の削除**
   - 同じプロパティが複数回定義されている箇所を統合
   - 未使用のCSSルールを削除

2. **詳細度の最適化**
   - !importantを削除し、より具体的なセレクタを使用
   - クラスの組み合わせで詳細度を上げる

3. **変数の活用**
   - 共通の値（色、サイズ、z-index）をCSS変数化
   - メンテナンス性の向上

### 4. パフォーマンスの改善

1. **セレクタの最適化**
   ```css
   /* 悪い例 - 深いネスト */
   .container > div > ul > li > a { }
   
   /* 良い例 - クラスを使用 */
   .nav-link { }
   ```

2. **アニメーションの最適化**
   - will-changeプロパティの適切な使用
   - transformとopacityのみでアニメーション

### 5. 実装優先順位

1. **高優先度**
   - LINEボタン関連のCSS（auth-unified.css）
   - ナビゲーション関連（navbar-fresh.css）

2. **中優先度**
   - モーダル関連
   - フォーム関連

3. **低優先度**
   - アニメーション効果
   - デバッグ用CSS

## 次のステップ

1. CSS監査ツールの使用を検討
2. PostCSSやSassの導入でメンテナンス性向上
3. CSS-in-JSソリューションの検討（大規模な場合）