# CSS クリーンアップ計画

## 現状の問題点

1. **CSSファイルが約80個存在**（通常のプロジェクトの5-10倍）
2. **サイドバー幅の不統一**（240px, 250px, 260px の混在）
3. **重複した定義**が多数存在
4. **バックアップフォルダ**に古いファイルが大量に残存

## 実施済みの修正

### 1. 統一CSS作成
- `css/sidebar-responsive-fix.css` - サイドバーレイアウトの統一定義
- `css/cleanup-redundant.css` - 重複定義のクリーンアップ用

### 2. HTMLファイルへの適用
全ての主要ページに統一CSSを追加：
- dashboard.html
- members.html
- events.html
- messages.html
- matching.html
- profile.html
- notifications.html
- settings.html

### 3. レガシーコードのコメントアウト
- `css/dashboard.css` の `.dashboard-sidebar` 定義（使用されていない）

## 安全に削除可能なファイル

### バックアップフォルダ（すでに別フォルダに退避済み）
- `css/backup-referral-css/` - 22ファイル
- `css/_old_referral_css/` - 6ファイル
- `css/backup/old-matching/` - 5ファイル

### 重複している可能性が高いファイル
以下は慎重に検証後、削除を検討：

1. **balanced-blue-theme.css** - backup-referral-cssにも存在
2. **timerex-booking.css** - 2箇所に存在
3. **timerex-modal.css** - 2箇所に存在
4. **user-dropdown-fix-final.css** - バックアップにも存在
5. **z-index-priority.css** - 複数箇所に存在

## 推奨される統合

### 1. レイアウト系CSS統合
以下を1つのファイルに統合することを推奨：
- dashboard.css
- dashboard-states.css
- sidebar-responsive-fix.css
→ **dashboard-unified.css**

### 2. レスポンシブ系CSS統合
- responsive-complete.css
- responsive-menu.css
- settings-responsive-fix.css
→ **responsive-unified.css**

### 3. ユーザーメニュー系CSS統合
- user-menu-fix.css
- user-menu-zindex-only.css
- user-dropdown-fix-final.css
- header-user-menu-redesign.css
→ **user-menu-unified.css**

## 実装優先順位

1. **高優先度**：現在競合している定義の解決
   - サイドバー幅を260pxに統一
   - main-content のマージンを統一

2. **中優先度**：バックアップフォルダの整理
   - 3ヶ月以上前のバックアップを削除
   - 重要なものはアーカイブとして保管

3. **低優先度**：CSSファイルの統合
   - 機能ごとにグループ化
   - 重複定義を削除
   - ミニファイ化

## 注意事項

- **削除前に必ずバックアップ**を作成
- **段階的に実施**（一度に全て削除しない）
- **動作確認**を各段階で実施
- **Gitでの変更履歴**を残す

## 期待される効果

1. **パフォーマンス向上**：読み込むCSSファイル数の削減
2. **メンテナンス性向上**：重複定義の排除
3. **一貫性の確保**：統一されたレイアウト
4. **開発効率の向上**：どのファイルを編集すべきか明確化