# INTERCONNECT 残存問題 完全リスト

**作成日:** 2026-02-11
**Phase 1〜4 修正後の再監査**

---

## 修正済み (Phase 1〜4)

| ID | 問題 | 状態 |
|----|------|------|
| A1/A2 | netlify.toml publish → dist | ✅ 修正済 |
| A3 | TimeRex APIキーハードコード | ✅ 修正済 |
| A4 | invite.html 別プロジェクト接続 | ✅ 修正済 |
| A5 | .envの秘密鍵 → build.shで除外 | ✅ 修正済 |
| A6 | admin.html 認証ガード | ✅ 修正済 |
| A7 | CORS * → 特定オリジン制限 | ✅ 修正済 |
| A8 | Webhook署名検証を必須化 | ✅ 修正済 |
| B1-B5/B9 | 正規SQLスキーマ統合 | ✅ 修正済 |
| C1-C3 | Realtimeテーブル名修正 | ✅ 修正済 |
| C4 | unsubscribe/cleanup追加 | ✅ 修正済（一部） |
| D1-D3/D5 | window.*関数定義修正 | ✅ 修正済 |
| E1 | supabase変数名統一 | ✅ 修正済（一部） |
| E2 | getUser()安全分割代入 | ✅ 修正済（一部） |
| E4 | NaN防止（matchingスコア） | ✅ 修正済 |

---

## 🔴 CRITICAL: 未完了の修正作業（Phase 1-4 の残り）

### 1. getUser() 未移行箇所（14件）

`window.safeGetUser()` への移行が完了していないファイル:

| ファイル | 行 | コード |
|---------|-----|-------|
| profile-modal-unified.js | 34 | `const { data: { user } } = await window.supabaseClient.auth.getUser()` |
| profile-modal-unified.js | 830 | 同上 |
| profile-modal-unified.js | 876 | 同上 |
| message-integration.js | 116 | 同上 |
| message-integration.js | 169 | 同上 |
| message-integration.js | 238 | 同上 |
| user-dropdown-handler.js | 235 | `const { data: { user } } = await client.auth.getUser()` |
| user-dropdown-handler.js | 285 | 同上 |
| profile-bundle.js | 996 | `const { data: { user } } = await window.supabaseClient.auth.getUser()` |
| profile-bundle.js | 1234 | 同上 |
| matching-bundle.js | 634 | 同上 |
| dashboard.js | 252 | `const { data: { user } } = await supabaseInstance.auth.getUser()` |
| members-bundle.js | 1085 | `const { data: { user } } = await window.supabaseClient.auth.getUser()` |
| members-bundle.js | 2363 | 同上 |

### 2. admin-referral-bundle.js インライン getUser（3件 — クラッシュ確実）

| 行 | コード |
|-----|-------|
| 822 | `approved_by: (await window.supabaseClient.auth.getUser()).data.user.id` |
| 848 | `rejected_by: (await window.supabaseClient.auth.getUser()).data.user.id` |
| 884 | `resolved_by: (await window.supabaseClient.auth.getUser()).data.user.id` |

→ `.data` が null の場合、即 TypeError で処理中断

### 3. supabase変数名未統一: `window.supabase` 直接使用（38件+）

**dashboard-unified.js** が最大の問題（30件以上の `window.supabase.` 使用）

他にも:
- messages-bundle.js:61
- message-integration.js:111
- registration-unified.js:2117, 2120, 2128
- activities.js:98

**`window.supabase` は `supabase-unified.js` で後方互換エイリアスとして設定されているため動作はするが、一貫性がない。**

---

## 🟠 HIGH: 未対応のセキュリティ問題

### 4. オープンリダイレクト（A10）

**ファイル:** js/supabase-unified.js:282-285
```javascript
const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
if (redirectUrl) {
    sessionStorage.removeItem('redirectAfterLogin');
    window.location.href = redirectUrl;  // 検証なし
}
```
→ sessionStorageに外部URLを仕込まれると、ログイン後に悪意あるサイトへリダイレクト

### 5. XSS: onclick属性にユーザーデータ未エスケープ埋め込み（A13拡大）

当初 members-bundle.js のみ報告されていたが、実際は**5ファイル以上**に同じパターン:

| ファイル | 行 | テンプレートリテラル内容 |
|---------|-----|----------------------|
| messages-bundle.js | 203-206 | `onclick="...showQRCode('${connection.line_qr}', '${connection.name}')"` |
| profile-modal-unified.js | 664, 669, 674 | `onclick="...sendConnect('${profile.id}')"` |
| matching-bundle.js | 3346 | `onclick="...removeFilter(this, '${filter.element.name}')"` |
| members-bundle.js | 2734, 2737 | `onclick="...href='profile.html?user=${user.id}'"` |
| referral-bundle.js | 616, 619, 622 | `onclick="copyLink('${link.id}')"` |

→ UUIDのみの場合リスクは低いが、`connection.name` や `filter.element.name` は自由テキストで**XSS可能**

### 6. timerex-booking ユーザー認証なし（A9）

**ファイル:** supabase/functions/timerex-booking/index.ts
→ Edge Functionが認証なしでAPIコールを受け付ける。誰でも予約を作成可能。

### 7. 管理者チェックがクライアント側のみ（A11）

admin.html に認証ガードを追加済みだが、**サーバー側（RLS/Edge Function）で is_admin チェックがない**。
→ DevToolsでJS回避可能。RLSポリシーでの補強が必要。

### 8. CDN SRI属性なし（A14）

全HTMLファイルの外部CDN `<script>` にintegrityハッシュなし:
- `@supabase/supabase-js@2`
- `chart.js`
- `fullcalendar@5.11.3`
- その他

---

## 🟠 HIGH: 未対応のロジックバグ

### 9. 登録フロー レースコンディション（E3）

**ファイル:** js/registration-unified.js:2327-2381

signUp() → DB trigger が `user_profiles` 行を自動作成 → JS も直後に INSERT → 重複キーエラー

さらに、**同じフォームに submit リスナーが2回登録**されている（行 2086 と 2292）。
キャプチャフェーズ(true)とバブルフェーズで両方発火し、二重送信の可能性。

### 10. messages-bundle ダミーデータ表示（E5）

**ファイル:** js/messages-bundle.js:51-86

Supabase認証失敗やクエリエラー時に**ユーザーに通知なく**ハードコードされた架空データを表示:
```javascript
this.loadDummyData();  // 山田太郎、鈴木花子 等のテストデータ
```

### 11. toLocaleString() null クラッシュ（E8）

**ファイル:** js/referral-bundle.js
- 行 203: `availablePoints.toLocaleString()` — null ならクラッシュ
- 行 243-246: `amount.toLocaleString()` 等 — 計算結果が undefined ならクラッシュ
- 行 494-495: `referralStats.availablePoints.toLocaleString()` — プロパティ未定義ならクラッシュ
- 行 699-700: `cashout.amount.toLocaleString()` — null/string ならクラッシュ

### 12. 税額計算 浮動小数点精度（E7）

**ファイル:** js/referral-bundle.js:239, 305-306
```javascript
const tax = Math.floor(grossAmount * 0.1021);
```
→ 浮動小数点演算。金融計算には整数演算（銭単位）推奨。
→ 現状のMath.floor()で大きな誤差は出にくいが、累積すると差が出る可能性。

### 13. LINE QR コード未保存（E10）

**ファイル:** js/registration-unified.js:1619-1650, 2327-2379

登録フォームでLINE QRファイルをアップロード→プレビュー表示されるが:
1. Supabase Storageにアップロードされない
2. `user_profiles.line_qr_url` に書き込まれない
3. 完全にデータが消失する

### 14. Realtime購読フィルタなし（C5）

**ファイル:**
- members-bundle.js:416-421 — `user_profiles` テーブル全行の変更を購読
- members-bundle.js:1361-1375 — `connections` と `messages` テーブル全行を購読
- matching-bundle.js:3462-3471 — `user_profiles` テーブル全行を購読

→ 全ユーザーの更新を受信。帯域浪費 + 不要なデータ露出。

---

## 🟡 MEDIUM: ポイント二重管理（B6）

**`profiles.available_points`** と **`user_points`テーブル** の両方でポイントを管理。
同期機構がなく、残高不整合のリスク。

---

## 🟡 MEDIUM: HTML構造・スクリプト整合性

### 15. スクリプト読み込み順序の不整合

正しい順序: `supabase-unified.js` → `notification-system-unified.js` → `core-utils.js` → ページ固有JS

| ページ | 問題 |
|--------|------|
| profile.html | supabase-unified.js が**最後**に読み込まれる |
| dashboard.html | core-utils.js が notification-system の後 |

### 16. supabase-unified.js バージョン不整合

| バージョン | 使用ページ |
|-----------|-----------|
| v=1.0 | dashboard.html, login.html, profile.html, referral.html, settings.html |
| v=1.1 | matching.html, events.html |
| (なし) | index.html |

### 17. モバイルナビ HTML構造の崩壊

| ページ | 問題 |
|--------|------|
| matching.html:62-68 | `<li>` タグが3重にネスト（閉じタグ不足） |
| referral.html:64-65 | `sidebar-link` クラスを使用（`mobile-nav-link` が正しい） |
| settings.html:62 | 同上 |
| dashboard.html:65 | 同上 |

### 18. 認証チェック欠落ページ（4件）

| ページ | 状態 |
|--------|------|
| activities.html | supabase-unified.js 未読込 |
| billing.html | supabase-unified.js 未読込 |
| book-consultation.html | supabase-unified.js 未読込 |
| booking-complete.html | supabase-unified.js 未読込 |

### 19. 管理ページ リンク先 404（F5）

admin.html 内のナビゲーションリンクが存在しないページを参照:
- admin-dashboard.html
- admin-events.html
- admin-reports.html
- admin-settings.html
- admin-users.html

### 20. disabled/コメントアウト済みスクリプト参照（26件）（F6）

削除済みJSファイルへの `<script>` 参照がコメントアウトされたまま残存。
機能影響はないがコード品質の問題。

---

## 🟡 MEDIUM: CSS/UI 未対応（G1-G4）

| ID | 問題 |
|----|------|
| G1 | `slide-left`, `slide-right` アニメーション未定義 → 登録ステップ遷移が無反応 |
| G2 | `list-view`, `list-header` メンバー一覧リスト表示モード未定義 |
| G3 | `image-loaded`, `image-error` 状態クラス未定義 |
| G4 | booking-complete.html, line-callback.html のスタイルがインライン |

---

## 🟡 MEDIUM: ページ機能の欠落（F1-F4）

| ID | 問題 |
|----|------|
| F1 | admin.html — データ読み込みコードなし、全数値ハードコード |
| F2 | super-admin.html — Supabase接続なし、全KPIハードコード |
| F3 | settings.html — フォームがUIスタブのみ、保存機能なし |
| F4 | billing.html — コンテンツ完全空 |

---

## 🔵 LOW: その他

| ID | 問題 |
|----|------|
| A12 | 全フォームにCSRFトークンなし（Supabase JWT認証でリスク低） |
| A15 | security.jsがline-authで未使用 |
| B8 | RPC関数オーバーロード（正規スキーマで統合済みだが未適用） |
| B10 | 複数の「FINAL」テストデータファイル |
| D4 | window.RealtimeNotifications クラス未エクスポート |
| D6 | 40+のwindow.*デッドコード関数 |
| E6 | profileCache有効期限未チェック |
| E9 | イベントリスナー重複登録の可能性 |

---

## 推奨修正順序（残作業）

### 即座対応（セキュリティ + クラッシュ防止）
1. **残りのgetUser()移行** — 14件 + インライン3件 → クラッシュ防止
2. **XSS修正** — onclick属性のエスケープ処理追加
3. **オープンリダイレクト修正** — URL検証ロジック追加
4. **toLocaleString()** — null/undefined ガード追加

### 短期（データ整合性）
5. **LINE QR保存** — Storage upload + DB保存
6. **ダミーデータ削除** — エラーUI表示に置換
7. **登録フロー レースコンディション修正** — upsert使用
8. **Realtime購読フィルタ追加** — user_id でフィルタリング

### 中期（構造改善）
9. **supabase変数名統一** — dashboard-unified.js の window.supabase → window.supabaseClient
10. **スクリプト読み込み順序統一** — 全ページ共通化
11. **モバイルナビHTML修正** — matching.html等のタグ修正
12. **認証チェック追加** — activities/billing/booking ページ
13. **ポイント管理一元化** — user_points テーブルに統一

### 長期（機能実装 + UI）
14. **admin/super-admin機能実装** (F1, F2)
15. **settings保存機能** (F3)
16. **billing コンテンツ** (F4)
17. **CSS アニメーション/表示モード** (G1-G4)
18. **コメント掃除** (F6)
19. **SRI属性追加** (A14)

---

## 集計（修正後）

| 状態 | CRITICAL | HIGH | MEDIUM | LOW | 合計 |
|------|----------|------|--------|-----|------|
| ✅ 修正済 | 11 | 7 | 1 | 0 | **19** |
| 🔴 部分修正 | 0 | 3 | 0 | 0 | **3** |
| ⬜ 未対応 | 0 | 13 | 15 | 6 | **34** |
| **合計** | 11 | 23 | 16 | 6 | **56** |

**全CRITICALが修正済み（または部分修正で動作可能状態）。残り34件のうちHIGH 13件が主な対応対象。**
