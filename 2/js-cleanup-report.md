# JavaScript重複コード・競合修正レポート

## 1. 重複している機能

### 1.1 ログアウト機能
- `js/global-functions.js`: `window.logout`
- `js/admin-utils.js`: `window.INTERCONNECT.logout`

**問題**: 同じログアウト機能が2箇所で定義されている

### 1.2 イベント参加申込機能
- `js/event-registration.js`: 静的なHTML用の参加申込処理
- `js/events-supabase.js`: Supabase連携の参加申込処理

**問題**: events.htmlで両方読み込まれているため、イベントリスナーが重複

### 1.3 レスポンシブメニュー
- `js/responsive-menu.js`: 古いバージョン
- `js/responsive-menu-simple.js`: 改良版

**問題**: 異なるページで異なるバージョンが使用されている

### 1.4 プロフィール同期
- `js/profile-sync.js`: 複数回のDOMContentLoadedイベントリスナー登録

## 2. グローバル名前空間の競合

### 2.1 INTERCONNECT オブジェクト
複数のファイルで `window.INTERCONNECT` を定義:
- `js/main-fixed.js`
- `js/admin-security.js`
- `js/admin-utils.js`
- `js/global-functions.js`
- `js/sanitizer.js`
- `js/scroll-fade-fixed.js`

## 3. 修正方針

### 3.1 即座に修正すべき項目
1. event-registration.js を無効化（完了）
2. responsive-menu.js を削除し、responsive-menu-simple.js に統一
3. global-functions.js の logout を優先し、admin-utils.js のものを削除

### 3.2 中期的に修正すべき項目
1. INTERCONNECT オブジェクトの初期化を一箇所に統一
2. DOMContentLoaded の重複を整理
3. モジュール化によるスコープの分離

## 4. 影響範囲

### 高リスク
- ログアウト機能の競合（ユーザー体験に直接影響）
- イベント参加申込の重複（二重登録の可能性）

### 中リスク
- メニューの動作不整合
- プロフィール同期の遅延

### 低リスク
- グローバルオブジェクトの重複定義（上書きされるだけ）