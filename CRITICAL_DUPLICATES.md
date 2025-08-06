# 🚨 重大な重複・競合リスト

## 最優先で対処すべき重複

### 1. マッチング機能: 51ファイル
現在51個のマッチング関連JSファイルが存在（目標: 5ファイル以下）

**影響**: 
- 同じ機能の複数実装による動作不整合
- デバッグの困難さ
- メンテナンス不可能

**解決策**:
```
matching-unified.js    // メイン統合ファイル
matching-ui.js        // UI関連
matching-api.js       // API通信
matching-charts.js    // グラフ表示
matching-filters.js   // フィルター機能
```

### 2. DOMContentLoaded: 130箇所
**最も多い重複パターン**:
```javascript
// 同じページで複数回登録されている例
document.addEventListener('DOMContentLoaded', function() { ... });
document.addEventListener('DOMContentLoaded', () => { ... });
window.addEventListener('DOMContentLoaded', function() { ... });
```

**影響**:
- ページ読み込み時の処理が130回実行
- パフォーマンスの著しい低下
- 初期化順序の混乱

### 3. モーダルCSS: 14箇所で定義
**z-index地獄の例**:
```css
/* ファイル1 */ .modal { z-index: 1000; }
/* ファイル2 */ .modal { z-index: 10000; }
/* ファイル3 */ .modal { z-index: 1000 !important; }
/* ファイル4 */ #cashout-modal.modal { z-index: 9999; }
```

### 4. Font Awesome: 30箇所で読み込み
**同じページで3回読み込みの例**:
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
<link rel="stylesheet" href="https://use.fontawesome.com/releases/v6.0.0/css/all.css">
```

### 5. showToast: 11箇所で定義
**微妙に異なる実装**:
```javascript
// バージョン1: 3秒表示
function showToast(message, type = 'info') { setTimeout(..., 3000) }

// バージョン2: 5秒表示
function showToast(message, type = 'info') { setTimeout(..., 5000) }

// バージョン3: duration引数あり
function showToast(message, type = 'info', duration = 3000) { ... }
```

## 即座に削除可能なファイル

### バックアップフォルダ（合計321ファイル）
```
/css/backup-referral-css/     # 18ファイル
/css/_old_referral_css/       # 6ファイル  
/js/_old_supabase/           # 推定10+ファイル
```

### 明らかに不要なファイル
```
main.js / main-fixed.js                    # 同じ機能
dashboard-fix-loading.js                   # 既に統合済み
events-supabase.js / events-supabase-fix.js # 重複
calendar.js                                # calendar-integration.jsに置換済み
```

## パフォーマンスへの影響

### 現在の読み込み時間推定
- Font Awesome × 30 = 約3MB
- Google Fonts × 56 = 約5MB  
- 重複JS実行 × 130 = 約500ms遅延
- **合計: 8MB+ の無駄な転送**

### 最適化後の予想
- Font Awesome × 1 = 100KB
- Google Fonts × 1 = 90KB
- JS実行 × 10 = 50ms
- **削減効果: 97%の転送量削減**

## 緊急対応プラン

### 今日中に実施
1. ✅ toast-unified.js作成済み → 全ファイルに適用
2. backup/oldフォルダの即削除

### 今週中に実施
1. マッチング51ファイル → 5ファイルに統合
2. DOMContentLoaded → ページごとに1つに統合
3. Font Awesome/Google Fonts → テンプレート化

### 検証が必要な削除候補
- fix系ファイル: 47個
- test系ファイル: 2個
- backup系ファイル: 1個
- old系ファイル: 1個

## 影響度ランキング

| 優先度 | 項目 | ファイル数 | 影響 |
|--------|------|-----------|------|
| 🔴 1位 | DOMContentLoaded | 130 | パフォーマンス |
| 🔴 2位 | マッチングJS | 51 | 機能不整合 |
| 🔴 3位 | Font Awesome | 30 | 読み込み速度 |
| 🟡 4位 | モーダルCSS | 14 | UI不整合 |
| 🟡 5位 | showToast | 11 | 動作差異 |