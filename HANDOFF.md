# INTERCONNECT プロジェクト引き継ぎドキュメント

**作成日:** 2026-02-12
**対象:** 新しいセッションでの作業継続用

---

## 1. プロジェクト概要

- **名前:** INTERCONNECT — 日本語ビジネスコミュニティプラットフォーム
- **リポジトリ:** `interconnectltd/interconnect-system` (GitHub)
- **ローカルパス:** `/Users/sara/Desktop/interconnect`
- **サイトURL:** https://interconnect-system.netlify.app
- **アーキテクチャ:** Netlify（静的フロントエンド + Functions）+ Supabase（DB, Auth, Realtime, Storage, Edge Functions）

### 技術スタック
- フロントエンド: 素のHTML/CSS/JS（ビルドツールなし）、Supabase JS SDK v2.95.3（CDN）
- バックエンド: Supabase（PostgreSQL + Auth + Realtime）
- LINE OAuth: Netlify Function (`line-auth-simple-v4.js`) 経由
- デプロイ: `build.sh` で `dist/` にコピー → Netlify にデプロイ

---

## 2. 完了済み作業の全体像

### ファイル統合（2026-02-11）
- JS: 135 → 33ファイル（76%削減）
- CSS: 83 → 30ファイル（64%削減）
- 統合後の参照整合性: 壊れたリンク0件（27 HTML検証済み）

### 問題修正（セクション1〜7、2026-02-11〜12）

元の問題リスト56件中 **52件修正済み（93%）**。CRITICAL 14件は100%修正。

| セクション | 内容 | 修正件数 | コミット |
|-----------|------|---------|---------|
| Phase 1-6 | ファイル統合時の修正 | 約20件 | `cf3a1d3` 〜 `5aca6e5` |
| セクション1 | ユーザー登録・ログイン | 23件 | `ed5e632`, `27952b5` |
| セクション2 | ダッシュボード | 14件 | `c82affe` |
| セクション3 | メンバー一覧・マッチング | 7件 | `a5923b2` |
| セクション4 | 設定・管理・リカバリー | 7件 | `66ec206` |
| セクション5 | super-admin完全修正 | 7件 | `534e77d` |
| セクション6 | 残存フロントエンド問題 | 7件 | `403ac0b`, `c32b365` |
| セクション7 | 最終クリーンアップ（SRI・レガシー削除・デッドコード） | 9件 | `faa768c` |
| デプロイ修正 | Netlify起動に必要な設定・認証フロー修正 | — | `0195815` |

### デプロイ修正（セクション7後に追加実施）
- `netlify.toml`: `YOUR_SUPABASE_PROJECT_REF` → 実際のプロジェクトID
- `line-auth-simple-v4.js`: CORS `*` → オリジンallowlist + `generateLink(magiclink)` でセッショントークン生成
- `line-callback.html`: `verifyOtp(token_hash)` でSupabaseセッション確立
- `supabase-unified.js`: SDK動的ロード時にバージョンピン + SRI + 重複防止
- `package.json`: `YOUR_USERNAME` → `interconnectltd`
- `.env`: サイト名統一、環境変数ドキュメント追加
- `deploy.yml`: `publish-dir: './dist'` + `bash build.sh` ステップ追加

### ISSUES-LIST.md の残存4件（元の56件のうち）
これらはバックエンド変更 or 低優先で、現セッションのスコープ外:
- **A9**: timerex-booking ユーザー認証なし（Edge Function修正）
- **A11**: 管理者チェックがクライアント側のみ（RLSポリシー追加）
- **A15**: security.jsがline-auth関数で未使用（Netlify Function修正）
- **G4**: booking-complete/line-callback インラインスタイル（低優先）

---

## 3. 総合検証で新たに発見された問題（16件）

セクション7完了後、「実際に使う上での残存問題」を徹底検証した結果、ISSUES-LIST外の新規問題16件を発見。これらを **セクション8〜10** として整理済み。

---

## 4. これからの修正プラン

### セクション8: フロントエンド即時修正（5件）

#### 8-1: スクリプト順序修正 — CRITICAL
**問題:** `supabase-unified.js` がページバンドルより後に読み込まれている
**影響:** ページ全体が機能しない（Supabaseクライアント未初期化のまま実行）

| ファイル | 現状の問題 |
|---------|-----------|
| `messages.html` (行308-318) | `messages-bundle.js`(行314) → `supabase-unified.js`(行318) — 逆 |
| `notifications.html` (行410-420) | `notifications-unified.js`(行416), `notifications-realtime-unified.js`(行417) → `supabase-unified.js`(行420) — 逆 |

**修正方法:** 両ファイルで `supabase-unified.js` を `<!-- Core initialization -->` コメント直後（`core-utils.js` の前）に移動。

**参考:** `referral.html`, `connections.html`, `dashboard.html` 等は正しい順序。

#### 8-2: connections.html 依存スクリプト不足 — HIGH
**問題:** `connections-bundle.js` が `window.showToast()` を15箇所で呼び出すが、`notification-system-unified.js` が未読込
**影響:** コネクト承認/拒否/取消/削除の全操作でトースト通知が出ない

**ファイル:** `connections.html` (行359-367)
```
現状:
  <script src="js/supabase-unified.js?v=1.1"></script>  ← 行360
  <script src="js/core-utils.js"></script>               ← 行361
  <script src="js/global-functions.js"></script>          ← 行362
  <script src="js/connections-bundle.js"></script>        ← 行363
  ...

修正: connections-bundle.js の前に追加:
  <script src="js/notification-system-unified.js"></script>
```

**showToast定義場所:** `js/notification-system-unified.js` 行25（定義）→ 行198（`window.showToast = showToast`）

#### 8-3: title→position カラム名不一致 — HIGH
**問題:** `connections-bundle.js` が `user_profiles.title` カラムを参照するが、正規スキーマは `position`
**影響:** コネクション一覧で役職が表示されない

**修正箇所:**
```
connections-bundle.js:
  行206: .select('id, name, email, company, title, avatar_url')
         → .select('id, name, email, company, position, avatar_url')

  行369, 420, 466, 517: const position = user.title || '';
                         → const position = user.position || '';
```

**注意:** 行570, 718の `title: 'コネクト承認'` 等は通知オブジェクトのタイトルで、カラム名ではない。修正不要。

#### 8-4: favicon.ico / robots.txt — LOW
**問題:** ルートに `favicon.ico`, `robots.txt` がない
**影響:** ブラウザの404エラー、SEO

**修正:**
- `favicon.ico`: シンプルなSVG favicon を `<link rel="icon">` で全HTMLに追加、または `.ico` ファイル作成
- `robots.txt`: 基本的な allow ルール作成
- `build.sh` は既に両ファイルのコピーに対応済み（行26-27）

#### 8-5: deploy.yml push — MEDIUM
**問題:** 前回の修正で `deploy.yml` はローカルでは修正済みだが、GitHub OAuthスコープ制限で push できなかった
**現状:** ローカルの `deploy.yml` は正しい内容（`publish-dir: './dist'`, `bash build.sh` ステップあり）
**対応:** `git push` を再試行、またはGitHub UI から直接更新

---

### セクション9: バックエンド/DB修正（3件）

#### 9-1: notifications INSERT RLS ポリシー追加 — CRITICAL
**問題:** `notifications` テーブルに INSERT ポリシーがない → フロントエンドから通知を作成できない

**現在のRLS（`000_canonical_schema.sql` 行153-163）:**
```sql
-- SELECT: 自分の通知のみ閲覧可
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);
-- UPDATE: 自分の通知のみ更新可（既読マーク用）
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);
-- ALL: service_roleのみ全操作可
CREATE POLICY "Service role can manage all notifications" ON notifications
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
```

**不足:** 認証ユーザーがINSERTできるポリシーがない

**追加すべきSQL:**
```sql
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
CREATE POLICY "Authenticated users can create notifications" ON notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

**注意:** 他ユーザーへの通知送信（コネクト申請通知等）が必要なため、`auth.uid() = user_id` ではなく `authenticated` ロールチェックが適切。

#### 9-2: cashout_requests admin UPDATE RLS — HIGH
**問題:** admin/super-adminが cashout_requests のステータスを更新できない（承認/却下不可）

**現在のRLS（`000_canonical_schema.sql` 行444-454）:**
```sql
-- SELECT: 自分のリクエストのみ
CREATE POLICY "Users can view own cashout requests" ON cashout_requests
    FOR SELECT USING (auth.uid() = user_id);
-- INSERT: 自分のリクエストのみ
CREATE POLICY "Users can create cashout requests" ON cashout_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);
-- UPDATE: 自分のpendingリクエストのみ（キャンセル用）
CREATE POLICY "Users can cancel pending cashout requests" ON cashout_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
```

**不足:** admin用のSELECT ALL + UPDATE ポリシー

**追加すべきSQL:**
```sql
-- Admin can view all cashout requests
DROP POLICY IF EXISTS "Admin can view all cashout requests" ON cashout_requests;
CREATE POLICY "Admin can view all cashout requests" ON cashout_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Admin can update cashout requests (approve/reject)
DROP POLICY IF EXISTS "Admin can update cashout requests" ON cashout_requests;
CREATE POLICY "Admin can update cashout requests" ON cashout_requests
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );
```

#### 9-3: Netlify環境変数設定 — HIGH
**問題:** LINE OAuth と Supabase admin API に必要な環境変数がNetlifyダッシュボードに未設定

**設定場所:** Netlify Dashboard → Site settings → Environment variables

| 変数名 | 値の取得場所 | 用途 |
|--------|-------------|------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → URL | line-auth-simple-v4.js |
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard → Settings → API → service_role key | line-auth-simple-v4.js（admin操作） |
| `LINE_CHANNEL_ID` | LINE Developers Console → チャネル基本設定 | line-auth-simple-v4.js |
| `LINE_CHANNEL_SECRET` | LINE Developers Console → チャネル基本設定 | line-auth-simple-v4.js |
| `NETLIFY_AUTH_TOKEN` | GitHub Secrets に設定（deploy.yml用） | GitHub Actions |
| `NETLIFY_SITE_ID` | GitHub Secrets に設定（deploy.yml用） | GitHub Actions |

**注意:** `SUPABASE_SERVICE_KEY` はフロントエンドに絶対に露出させないこと。Netlify Functions 内でのみ使用。

---

### セクション10: 品質向上（低優先・任意）

| # | 問題 | 対応 |
|---|------|------|
| 10-1 | 不足画像11件 | HTML内の `<img src="images/...">` で参照されているが実ファイルなし。プレースホルダー or 削除 |
| 10-2 | 27MB動画ファイル | `dist/` 内の大容量ファイル。CDN or 外部ストレージへ移動推奨 |
| 10-3 | ダッシュボードダミーイベント | イベントが0件時のフォールバック表示。DB接続後は自然解消 |
| 10-4 | G4 インラインスタイル | booking-complete.html, line-callback.html の `<style>` タグ。CSS外部化推奨 |

---

## 5. 重要なファイル構成

### HTML（27ファイル）
```
about.html, activities.html, admin.html, admin-referral.html, admin-site-settings.html,
billing.html, book-consultation.html, booking-complete.html, connections.html,
dashboard.html, events.html, forgot-password.html, index.html, invite.html,
line-callback.html, login.html, matching.html, members.html, messages.html,
notifications.html, privacy.html, profile.html, referral.html, register.html,
reset-password.html, settings.html, super-admin.html, terms.html
```

### JS（33ファイル）
**共通（全ページ）:** `supabase-unified.js`, `core-utils.js`, `global-functions.js`, `profile-sync.js`, `responsive-menu-simple.js`, `dashboard.js`, `user-dropdown-handler.js`, `avatar-size-enforcer.js`, `notification-system-unified.js`, `notifications-realtime-unified.js`

**ページ別バンドル:** `members-bundle.js`, `matching-bundle.js`, `events-bundle.js`, `profile-bundle.js`, `connections-bundle.js`, `referral-bundle.js`, `registration-unified.js`, `dashboard-unified.js`, `profile-modal-unified.js`, `notifications-unified.js`, `messages-bundle.js`, `message-integration.js`

**その他:** `login-bundle.js`, `homepage-bundle.js`, `settings-bundle.js`, `admin-bundle.js`, `admin-referral-bundle.js`, `guest-mode-manager.js`, `auth.js`

### SQL
- `sql/000_canonical_schema.sql` — **正規スキーマ（唯一の真実源）**
- `sql/fix-*.sql`, `sql/add-*.sql` 等 — マイグレーション/修正スクリプト（70+個）

### Netlify Functions
- `netlify/functions/line-auth-simple-v4.js` — LINE OAuth処理

### 設定
- `netlify.toml` — Netlify設定（ビルド、ヘッダー、リダイレクト）
- `.github/workflows/deploy.yml` — GitHub Actions CI/CD
- `build.sh` — ビルドスクリプト（dist/へコピー）
- `.env` — 環境変数（**本番ではNetlifyダッシュボードで管理**）

---

## 6. Supabase設定情報

| 項目 | 値 |
|------|-----|
| Project URL | `https://zrddqaaaoerbguwxrlic.supabase.co` |
| Project Ref | `zrddqaaaoerbguwxrlic` |
| Anon Key | `.env` の `VITE_SUPABASE_ANON_KEY` 参照 |
| Service Key | Supabase Dashboard → Settings → API → service_role key |

### DB構成（canonical schema基準）
- テーブル: `user_profiles`, `connections`, `notifications`, `event_items`, `matchings`, `invitations`, `cashout_requests`, `user_points`, `point_transactions`, `messages`, `conversations`, `conversation_participants`, `user_settings`, `admin_settings` 等
- ビュー: `profiles`（user_profilesのエイリアス）, `events`（event_itemsのエイリアス）, `referral_statistics`, `event_stats` 等
- RLS: 全テーブルに設定済み（通知INSERT・cashout admin UPDATEのポリシー不足は9-1/9-2で対応）

---

## 7. スクリプト読み込みの正しい順序

全保護ページで以下の順序を守る必要がある:

```html
<!-- 1. Supabase初期化（最優先） -->
<script src="js/supabase-unified.js?v=1.1"></script>

<!-- 2. コアユーティリティ -->
<script src="js/core-utils.js"></script>
<script src="js/global-functions.js"></script>

<!-- 3. 共通機能 -->
<script src="js/profile-sync.js"></script>
<script src="js/notification-system-unified.js"></script>
<script src="js/notifications-realtime-unified.js"></script>
<script src="js/responsive-menu-simple.js"></script>
<script src="js/dashboard.js"></script>

<!-- 4. ページ固有バンドル -->
<script src="js/[page]-bundle.js"></script>

<!-- 5. 後処理 -->
<script src="js/user-dropdown-handler.js"></script>
<script src="js/avatar-size-enforcer.js"></script>
```

**重要:** `supabase-unified.js` は必ず最初。ページバンドルは `waitForSupabase()` や `window.supabaseClient` に依存するため。

---

## 8. 既知の制約・注意事項

1. **deploy.yml の push:** GitHub OAuth スコープに `workflow` がないため、`git push` で `.github/workflows/` の変更が拒否される。GitHub UI から直接編集するか、Personal Access Token に `workflow` スコープを追加する必要がある。

2. **registration-unified.js の構文エラー:** `node --check` で行1313に `SyntaxError: Unexpected token ':'` が検出されている。セクション1〜7の修正とは無関係（プリエクスティングバグ）。ブラウザ環境では動作する可能性があるが、要調査。

3. **Supabaseスキーマのデプロイ:** `000_canonical_schema.sql` がSupabaseに実際にデプロイされているかは未確認。Supabase Dashboard → SQL Editor で実行が必要な可能性がある。

4. **LINE Channel Secret:** `.env` に平文で記載されているが、`build.sh` で `dist/` にコピーされないため本番では安全。ただし GitHub に push されているため、ローテーション推奨。

---

## 9. 修正の実行手順（セクション8〜9）

### すぐに実行可能（フロントエンド、セクション8）

```
1. messages.html: supabase-unified.js を core-utils.js の前に移動
2. notifications.html: 同上
3. connections.html: notification-system-unified.js を追加
4. connections-bundle.js: title → position に変更（5箇所）
5. favicon.ico + robots.txt 作成
6. deploy.yml を git push（再試行 or GitHub UI）
7. git commit + push
```

### 手動操作が必要（バックエンド、セクション9）

```
1. Supabase Dashboard → SQL Editor で RLS ポリシー追加（9-1, 9-2）
2. Netlify Dashboard → Environment variables で4変数設定（9-3）
3. （必要なら）000_canonical_schema.sql を Supabase で実行
```
