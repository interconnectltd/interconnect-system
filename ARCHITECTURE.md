# INTERCONNECT - System Architecture

> 日本語ビジネスコミュニティプラットフォーム
> Last Updated: 2026-02-16

---

## 1. 設計原則

```
Frontend : Netlify — 静的ホスティングのみ（HTML/CSS/JS 配信）
Backend  : Supabase — 完結（DB / Auth / Realtime / Storage / Edge Functions）
```

- Netlify にサーバーサイドロジックは置かない（LINE OAuth 用 Netlify Function のみ例外）
- 全てのバックエンド処理は Supabase 内で完結させる
- データの「読み取り」はクライアントから直接、「書き込み」は RLS で制御
- 全テーブルに Row Level Security（RLS）を適用

---

## 2. Tech Stack

| Layer | Technology | 役割 |
|-------|-----------|------|
| Frontend | HTML5 / CSS3 / Vanilla JS | 静的ページ群（27 HTML, 33 JS, 32 CSS） |
| Hosting | Netlify | CDN 配信・セキュリティヘッダー・リダイレクト |
| Functions | Netlify Functions (Node.js) | LINE OAuth 認証処理 |
| Database | Supabase PostgreSQL | データ永続化・RLS 認可・DB 関数・Trigger |
| Auth | Supabase Auth | Email/Password + LINE OAuth (Magic Link) |
| Realtime | Supabase Realtime | WebSocket リアルタイム通知・メッセージ |
| Storage | Supabase Storage | アバター・カバー画像 |
| Edge Functions | Supabase Edge Functions (Deno/TS) | TimeRex Webhook・tldv 連携 |
| Charts | Chart.js 4.4.0 | ダッシュボード可視化 |
| Calendar | FullCalendar 5.11.3 | イベントカレンダー表示 |
| Icons | Font Awesome 6.4.0 (CDN, SRI) | |
| Fonts | Google Fonts (Inter, Noto Sans JP) | |
| SDK | Supabase JS v2.95.3 (CDN, SRI) | |

---

## 3. アーキテクチャ図

```
┌──────────────────────────────────────────────────────────┐
│                    Browser (Client)                       │
│  HTML Pages ─── CSS ─── JS Modules ─── Chart.js/Calendar  │
│                  ↓                                        │
│        supabase-unified.js (SDK v2.95.3 初期化)           │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌──────────────────────────────────────────────────────────┐
│               Netlify (CDN + Functions)                    │
│  ┌─────────────────────────────────────────────┐          │
│  │  Static Files (dist/)                        │          │
│  │  HTML / CSS / JS / Assets / favicon / robots │          │
│  └─────────────────────────────────────────────┘          │
│  ┌─────────────────────────────────────────────┐          │
│  │  Netlify Function                            │          │
│  │  line-auth-simple-v4.js (LINE OAuth)         │          │
│  └─────────────────────────────────────────────┘          │
│  Security Headers (CSP, HSTS, X-Frame-Options)            │
│  Redirects (/invite/*, /api/timerex-*)                    │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTPS / WSS
                     ▼
┌──────────────────────────────────────────────────────────┐
│                  Supabase Backend                          │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌───────────┐  │
│  │PostgreSQL│  │  Auth   │  │ Realtime │  │  Storage  │  │
│  │ 34 Tables│  │Email+   │  │ WebSocket│  │ avatars/  │  │
│  │ 10 Views │  │LINE SSO │  │ channels │  │ covers/   │  │
│  │ 11 Funcs │  │Magic    │  │          │  │           │  │
│  │ 4 Triggers│ │Link     │  │          │  │           │  │
│  └─────────┘  └─────────┘  └──────────┘  └───────────┘  │
│  ┌──────────────────────────────────────────────┐         │
│  │  Edge Functions (Deno/TypeScript)             │         │
│  │  timerex-webhook / tldv-webhook /             │         │
│  │  timerex-booking                              │         │
│  └──────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────┘
```

---

## 4. クライアント / サーバー境界

| 処理 | 実行場所 | 理由 |
|-----|---------|------|
| ページ描画・UI操作 | Client (JS) | UX速度 |
| Supabase データ取得 | Client → Supabase | RLS で認可制御済み |
| LINE OAuth トークン交換 | Netlify Function | Channel Secret を秘匿 |
| Webhook 受信 (TimeRex) | Supabase Edge Function | 署名検証 + DB 直接操作 |
| Webhook 受信 (tldv) | Supabase Edge Function | 署名検証 + DB 直接操作 |
| ポイント加算・減算 | Supabase DB 関数 | SECURITY DEFINER で不正防止 |
| リアルタイム通知 | Client ← Supabase Realtime | WebSocket 購読 |
| 画像アップロード | Client → Supabase Storage | RLS で認可制御 |

---

## 5. データベーススキーマ

正規スキーマ: `sql/000_canonical_schema.sql`（唯一の真実源 — 28 セクション）

### 5.1 テーブル一覧（34 テーブル）

#### コアテーブル

| テーブル | 説明 | 主要カラム |
|---------|------|-----------|
| `user_profiles` | ユーザープロフィール | id, name, email, company, position, industry, bio, avatar_url, is_admin, is_active |
| `connections` | コネクション（人脈） | user_id, connected_user_id, status (pending/accepted/rejected/cancelled/removed/blocked/reaccepted) |
| `messages` | ダイレクトメッセージ | sender_id, receiver_id, content, is_read |
| `notifications` | 通知 | user_id, type, title, message, link, actions (JSONB), is_read |
| `activities` | アクティビティフィード | type, title, user_id, related_user_id |

#### イベント

| テーブル | 説明 | 主要カラム |
|---------|------|-----------|
| `event_items` | イベント情報 | title, event_date, event_type (online/offline/hybrid), capacity, organizer_id |
| `event_participants` | イベント参加者 | event_id, user_id, status, attendance_status, payment_status |
| `event_certificates` | 参加証明書 | event_id, participant_id, certificate_number |

#### マッチング

| テーブル | 説明 | 主要カラム |
|---------|------|-----------|
| `match_requests` | マッチングリクエスト | requester_id, recipient_id, status, message |
| `match_connections` | マッチング成立 | user1_id, user2_id, match_score, match_reasons (JSONB) |

#### 紹介プログラム

| テーブル | 説明 | 主要カラム |
|---------|------|-----------|
| `invite_links` | 招待リンク | created_by, link_code, used_count, referral_count, campaign_code |
| `invitations` | 招待状 | inviter_id, invitee_email, invitation_code, status, reward_points, fraud_score |
| `invite_history` | 招待履歴 | invite_link_id, invitation_id, ip_address |
| `referral_clicks` | リファラルクリック | referral_code, user_agent, ip_address |
| `referral_details` | リファラル詳細・不正検知 | referrer_id, referred_id, fraud_score, verification_status |

#### ポイントシステム

| テーブル | 説明 | 主要カラム |
|---------|------|-----------|
| `user_points` | ポイント残高 | user_id, total_earned, balance, available_points |
| `point_transactions` | ポイント履歴 | user_id, points, reason, referral_code |
| `cashout_requests` | 換金申請 | user_id, amount, bank_info (JSONB), status |

#### 予約・面談

| テーブル | 説明 | 主要カラム |
|---------|------|-----------|
| `booking_sessions` | 予約セッション | session_id, user_id, referral_code, status |
| `bookings` | 予約確定 | booking_id, user_email, staff_name, scheduled_at, meeting_url |
| `meeting_confirmations` | 面談確認 | user_id, meeting_datetime, duration_minutes |
| `meeting_minutes` | 面談議事録 | user_id, meeting_title, summary, action_items (JSONB) |
| `tldv_meeting_records` | tldv 会議録画 | meeting_id, invitee_email, recording_url |

#### ユーザー行動

| テーブル | 説明 | 主要カラム |
|---------|------|-----------|
| `profile_views` | プロフィール閲覧 | viewer_id, viewed_user_id, view_duration |
| `bookmarks` | ブックマーク | user_id, bookmarked_user_id, note |
| `search_history` | 検索履歴 | user_id, search_query, filters (JSONB) |
| `share_activities` | シェア活動 | user_id, platform, share_url |
| `user_activities` | ユーザー活動ログ | user_id, activity_type, related_id |

#### 不正検知

| テーブル | 説明 | 主要カラム |
|---------|------|-----------|
| `fraud_flags` | 不正フラグ | user_id, flag_type, resolved |
| `ip_registration_stats` | IP 登録統計 | ip_address, user_count |

#### システム設定・コンテンツ

| テーブル | 説明 | 主要カラム |
|---------|------|-----------|
| `settings` | ユーザー設定 | user_id, theme, language, notifications_enabled |
| `contact_inquiries` | お問い合わせ | name, email, message, status (new/read/replied/closed) |
| `news_items` | ニュース | title, content, category, is_published |
| `site_settings` | サイト設定 | key (PK), value (JSONB) |
| `login_sessions` | ログインセッション | user_id, device, browser, ip_address |
| `faqs` | FAQ | question, answer, category, sort_order |
| `case_studies` | 成功事例 | title, background, solution, metrics (JSONB) |

### 5.2 ビュー（10 ビュー）

| ビュー | 説明 |
|--------|------|
| `profiles` | user_profiles の後方互換ビュー |
| `events` | event_items の後方互換ビュー |
| `matchings` | dashboard-unified.js 用マッチングビュー |
| `v_referral_history` | 紹介履歴集計 |
| `booking_details` | 予約詳細 |
| `booking_stats` | 予約統計 |
| `member_growth_stats` | 会員成長統計 |
| `industry_distribution` | 業種分布 |
| `event_stats` | イベント統計 |
| `referral_statistics` | 紹介統計 |

### 5.3 DB 関数（11 関数）

| 関数 | 引数 | 戻値 | 用途 |
|------|-----|------|------|
| `update_updated_at_column()` | — | TRIGGER | updated_at 自動更新 |
| `handle_new_user()` | — | TRIGGER | auth.users 作成時 → user_profiles 自動挿入 |
| `get_referral_stats(UUID)` | user_id | TABLE | ポイント・紹介統計取得 |
| `add_referral_points(TEXT, INT, TEXT, TEXT?)` | code, points, reason, booking_id | VOID | リファラルポイント加算 |
| `deduct_user_points(UUID, INT)` | user_id, amount | VOID | ポイント減算 |
| `add_user_points(UUID, INT)` | user_id, amount | VOID | ポイント加算 |
| `create_invitation(UUID, TEXT, TEXT?, UUID?)` | inviter_id, email, message, link_id | UUID | 招待作成 |
| `accept_invitation(TEXT, UUID)` | code, user_id | BOOLEAN | 招待受諾 |
| `get_top_referrers(INT?)` | limit_count | TABLE | トップ紹介者取得 |
| `get_referral_analytics(DATE, DATE)` | start_date, end_date | JSON | 紹介分析 |
| `process_referral_reward(UUID)` | invitation_id | JSON | 紹介報酬処理 |

全関数は `SECURITY DEFINER` で実行（トリガー関数を除く）。

### 5.4 トリガー（4 トリガー）

| トリガー | テーブル | タイミング |
|---------|---------|-----------|
| `update_user_profiles_updated_at` | user_profiles | BEFORE UPDATE |
| `update_connections_updated_at` | connections | BEFORE UPDATE |
| `update_user_points_updated_at` | user_points | BEFORE UPDATE |
| `on_auth_user_created` | auth.users | AFTER INSERT |

### 5.5 RLS ポリシー概要

全テーブルに RLS を有効化。主要パターン:

| パターン | 例 |
|---------|---|
| 自分のデータのみ読み書き | `auth.uid() = user_id` |
| 認証ユーザー全員が閲覧可 | `role() = 'authenticated'` |
| 管理者は全操作可 | `EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)` |
| service_role のみ | service_role（サーバーサイド専用） |
| 公開コンテンツ（誰でも閲覧） | `is_published = true` |
| 匿名でも書き込み可 | `true`（referral_clicks, contact_inquiries の INSERT） |

### 5.6 Storage バケット

| バケット | 用途 | RLS |
|---------|------|-----|
| `avatars` | プロフィール画像 | 公開読取 / ユーザー書込・更新 |
| `covers` | カバー画像 | 公開読取 / ユーザー書込 |

---

## 6. 認証フロー

### 6.1 Email/Password 認証

```
[ユーザー] → register.html / login.html
    ↓
registration-unified.js / login-bundle.js
    ↓
supabase.auth.signUp() / supabase.auth.signInWithPassword()
    ↓
on_auth_user_created トリガー → user_profiles 自動作成
    ↓
dashboard.html へリダイレクト
```

### 6.2 LINE OAuth 認証

```
[ユーザー] → login.html「LINEでログイン」ボタン
    ↓
LINE Login OAuth (access.line.me)
    ↓
line-callback.html（LINE access_token 取得）
    ↓
Netlify Function: line-auth-simple-v4.js
    ├─ LINE access_token → LINE Profile API でプロフィール取得
    ├─ Supabase Admin: generateLink(magiclink) で OTP URL 生成
    └─ クライアントに OTP トークンを返却
    ↓
クライアント: supabase.auth.verifyOtp({ token, type: 'magiclink' })
    ↓
ログイン完了 → dashboard.html へリダイレクト
```

**セキュリティ**:
- LINE Channel Secret は Netlify 環境変数に保持（クライアントに露出しない）
- Netlify Function で CORS オリジン制限（`interconnect-system.netlify.app` + localhost）
- リダイレクト URL のバリデーション（`isValidRedirectURL`）
- レートリミット（`checkRateLimit`）

---

## 7. リアルタイム機能

### 7.1 通知 (notifications-realtime-unified.js)

```javascript
supabaseClient
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, handleNewNotification)
  .subscribe()
```

対象: 全認証済みページ（dashboard, connections, messages, events, etc.）

### 7.2 メッセージ (messages-bundle.js)

送受信のリアルタイム監視。`messages` テーブルの INSERT を購読。

---

## 8. ファイル構成

### 8.1 ディレクトリ構造

```
interconnect/
├── *.html                    # 27 HTML ページ
├── css/                      # 32 CSS ファイル
├── js/                       # 33 JavaScript ファイル
├── assets/                   # SVG プレースホルダー + 動画
├── includes/                 # HTML インクルード（header-right, security-meta）
├── sql/                      # スキーマ + 70+ マイグレーション SQL
│   └── 000_canonical_schema.sql  # 正規スキーマ（唯一の真実源）
├── netlify/
│   └── functions/
│       └── line-auth-simple-v4.js  # LINE OAuth
├── supabase/
│   └── functions/
│       ├── timerex-webhook/index.ts
│       ├── timerex-booking/index.ts
│       └── tldv-webhook/index.ts
├── dist/                     # ビルド出力（公開ファイルのみ）
├── netlify.toml              # Netlify 設定
├── build.sh                  # ビルドスクリプト
├── favicon.svg               # ファビコン
├── robots.txt                # クローラー指示
└── .github/workflows/
    └── deploy.yml            # GitHub Actions CI/CD
```

### 8.2 HTML ページ一覧（27 ファイル）

| ページ | ファイル | 認証要否 |
|-------|---------|---------|
| ホームページ | index.html | 不要 |
| ログイン | login.html | 不要 |
| 新規登録 | register.html | 不要 |
| パスワードリセット | forgot-password.html, reset-password.html | 不要 |
| LINE コールバック | line-callback.html | 不要 |
| 招待受諾 | invite.html | 不要 |
| 相談予約完了 | booking-complete.html | 不要 |
| 会社概要 | about.html | 不要 |
| 利用規約 | terms.html | 不要 |
| プライバシーポリシー | privacy.html | 不要 |
| ダッシュボード | dashboard.html | 要 |
| プロフィール | profile.html | 要 |
| コネクション | connections.html | 要 |
| メッセージ | messages.html | 要 |
| 通知 | notifications.html | 要 |
| イベント | events.html | 要 |
| マッチング | matching.html | 要 |
| メンバー一覧 | members.html | 要 |
| 紹介プログラム | referral.html | 要 |
| アクティビティ | activities.html | 要 |
| 設定 | settings.html | 要 |
| 請求 | billing.html | 要 |
| 相談予約 | book-consultation.html | 要 |
| 管理者 | admin.html | 要（管理者のみ） |
| スーパー管理者 | super-admin.html | 要（管理者のみ） |
| 管理者紹介管理 | admin-referral.html | 要（管理者のみ） |
| サイト設定 | admin-site-settings.html | 要（管理者のみ） |

### 8.3 JavaScript モジュール構成（33 ファイル）

#### 共通モジュール（全認証ページで使用）

| ファイル | 役割 | 読込順 |
|---------|------|--------|
| `supabase-unified.js` | Supabase SDK 初期化 + `waitForSupabase()` | **1（最優先）** |
| `core-utils.js` | ユーティリティ（escapeHtml, formatDate 等） | 2 |
| `global-functions.js` | グローバル共通関数 | 2 |
| `profile-sync.js` | プロフィール同期 | 3 |
| `notification-system-unified.js` | Toast 通知 (`showToast()`) | 3 |
| `notifications-realtime-unified.js` | Realtime 通知購読 | 3 |
| `responsive-menu-simple.js` | レスポンシブメニュー制御 | 3 |
| `dashboard.js` | サイドバー・ナビゲーション共通 | 3 |
| `user-dropdown-handler.js` | ユーザードロップダウンメニュー | 5（最後） |
| `avatar-size-enforcer.js` | アバター画像サイズ強制 | 5（最後） |

#### ページ固有バンドル

| ファイル | 対象ページ | 統合元 |
|---------|-----------|--------|
| `homepage-bundle.js` | index.html | homepage-perfect-final + referral-landing |
| `login-bundle.js` | login.html, register.html | login + registration 関連 |
| `registration-unified.js` | register.html | 登録フォーム全機能 |
| `dashboard-unified.js` | dashboard.html | 9ファイル統合（統計・チャート・活動） |
| `profile-bundle.js` | profile.html | プロフィール編集・表示 |
| `connections-bundle.js` | connections.html | コネクション管理 |
| `messages-bundle.js` | messages.html | メッセージ送受信 |
| `events-bundle.js` | events.html | イベント一覧・参加 |
| `matching-bundle.js` | matching.html | マッチング機能 |
| `members-bundle.js` | members.html | メンバー検索・一覧 |
| `settings-bundle.js` | settings.html | 設定管理 |
| `referral-bundle.js` | referral.html | 紹介プログラム |
| `admin-referral-bundle.js` | admin-referral.html | 管理者紹介管理 |
| `notifications-unified.js` | notifications.html | 通知一覧・操作 |

#### その他

| ファイル | 役割 |
|---------|------|
| `auth.js` | 認証ガード |
| `auth-background-safe.js` | バックグラウンド認証チェック |
| `forgot-password.js` | パスワードリセット |
| `message-integration.js` | メッセージ統合 |
| `global-viewing-history.js` | 閲覧履歴 |
| `guest-mode-manager.js` | ゲストモード |
| `profile-modal-unified.js` | プロフィールモーダル |
| `activities.js` | アクティビティページ |
| `main.js` | ホームページ初期化 |

### 8.4 スクリプト読み込み順序（重要）

全認証ページで以下の順序を厳守:

```
1. supabase-unified.js      ← 最優先（waitForSupabase 依存の基盤）
2. core-utils.js             ← ユーティリティ
   global-functions.js       ← グローバル関数
3. profile-sync.js           ← プロフィール同期
   notification-system-unified.js  ← Toast
   notifications-realtime-unified.js  ← Realtime
   responsive-menu-simple.js  ← メニュー
   dashboard.js              ← サイドバー
4. [page]-bundle.js          ← ページ固有ロジック
5. user-dropdown-handler.js  ← ドロップダウン
   avatar-size-enforcer.js   ← アバターサイズ
```

**注意**: `supabase-unified.js` は必ずバンドルより前に読み込むこと。`waitForSupabase()` に依存する全モジュールが正常動作するために必須。

### 8.5 CSS ファイル（32 ファイル）

| カテゴリ | ファイル |
|---------|---------|
| **基盤** | style.css, buttons.css, responsive-layout.css |
| **コンポーネント** | dashboard.css, navbar-fresh.css, user-menu.css, notifications.css, event-modal.css, members-profile-modal.css, logout-button-fix.css |
| **認証ページ** | auth-unified.css, auth-message.css, register-page.css, line-callback.css |
| **ページ固有** | homepage-page.css, homepage-complete.css, profile.css, connections.css, messages-page.css, matching.css, members-page.css, events-page.css, dashboard-page.css, settings-page.css, referral-page.css, activities.css, booking-complete.css, invite.css, legal-pages.css |
| **管理者** | admin.css, admin-forms.css, super-admin.css |

### 8.6 アセット（10 ファイル）

```
assets/
├── default-avatar.svg        # デフォルトアバター
├── user-placeholder.svg      # ユーザープレースホルダー
├── placeholder-person.svg    # 人物プレースホルダー
├── placeholder-logo.svg      # ロゴプレースホルダー
├── placeholder-hero.svg      # ヒーロープレースホルダー
├── qr-placeholder.svg        # QR コードプレースホルダー
├── video-poster.svg          # 動画ポスター
├── og-image.svg              # OGP 画像（1200x630）
├── hero-fallback.svg         # ヒーローフォールバック
└── interconnect-top.mp4      # ホームページ動画（27MB）
```

---

## 9. Netlify 設定

### 9.1 netlify.toml

```toml
[build]
  publish = "dist"
  command = "npm install --prefix netlify/functions && bash build.sh"

[build.environment]
  NODE_VERSION = "18"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```

### 9.2 ビルドプロセス (build.sh)

```
1. dist/ をクリーン
2. *.html をコピー
3. css/, js/, assets/, images/, sounds/, includes/ をコピー
4. _headers, _redirects, favicon.ico, favicon.svg, robots.txt をコピー
```

公開してはいけないファイル（.env, SQL, シェルスクリプト, ドキュメント）は `dist/` に含まれない。

### 9.3 セキュリティヘッダー

| ヘッダー | 値 |
|---------|---|
| X-Frame-Options | DENY |
| X-XSS-Protection | 1; mode=block |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Strict-Transport-Security | max-age=31536000; includeSubDomains |
| Permissions-Policy | camera=(), microphone=(), geolocation=() |
| Content-Security-Policy | (下記参照) |

### 9.4 CSP (Content Security Policy)

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://apis.google.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net;
font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com;
img-src 'self' data: blob: https://*.supabase.co https://ui-avatars.com https://profile.line-scdn.net;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.googleapis.com https://api.line.me https://access.line.me;
frame-src https://www.google.com;
frame-ancestors 'none'
```

**注**: `'unsafe-inline'` は script-src / style-src で使用中。多数のインラインイベントハンドラとインラインスタイルが存在するため現状維持。

### 9.5 リダイレクト

| パス | 転送先 | 用途 |
|-----|--------|------|
| `/invite/*` | `/index.html` (200) | 招待リンク SPA ルーティング |
| `/api/timerex-webhook` | Supabase Edge Function (200) | TimeRex Webhook プロキシ |
| `/api/timerex-booking` | Supabase Edge Function (200) | TimeRex 予約セッション作成 |

### 9.6 CORS 設定

Netlify Functions 用:
```
Access-Control-Allow-Origin: https://interconnect-system.netlify.app
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Methods: POST, OPTIONS
```

---

## 10. CI/CD

### GitHub Actions (deploy.yml)

```
Trigger: push to main / PR to main
Steps:
  1. Checkout code
  2. Setup Node.js 18
  3. npm install --prefix netlify/functions
  4. bash build.sh
  5. Deploy to Netlify (nwtgck/actions-netlify@v2.0)
```

**必要な GitHub Secrets**:
- `NETLIFY_AUTH_TOKEN` — Netlify API トークン
- `NETLIFY_SITE_ID` — Netlify サイト ID

**必要な Netlify 環境変数**:
- `SUPABASE_URL` — Supabase プロジェクト URL
- `SUPABASE_SERVICE_KEY` — Supabase service_role キー
- `LINE_CHANNEL_ID` — LINE Login チャネル ID
- `LINE_CHANNEL_SECRET` — LINE Login チャネルシークレット

---

## 11. セキュリティ対策

### 11.1 XSS 防止

- `escapeHtml()` — HTML エスケープ（全ユーザー入力のレンダリング時）
- `escapeAttr()` — 属性値エスケープ
- `sanitizeUrl()` — URL プロトコル検証（http/https のみ許可）
- `sanitizeImageUrl()` — 画像 URL 検証（http/https/data のみ）
- `sanitizeClassName()` — CSS クラス名の英数字制限
- 通知アクションボタン: `data-notification-action` 属性 + イベントデリゲーション（`onclick` インジェクション防止）

### 11.2 認証・認可

- 全テーブルに RLS 有効
- 管理者操作は `is_admin` フラグ検証
- service_role は Edge Functions 内のみ使用
- SECURITY DEFINER 関数でポイント操作を制御

### 11.3 インフラ

- HTTPS 強制（HSTS）
- CSP でスクリプト・接続先を制限
- X-Frame-Options: DENY（クリックジャッキング防止）
- LINE Channel Secret はサーバーサイドのみ（Netlify Function）
- Webhook 署名検証（TimeRex: HMAC-SHA256）

---

## 12. 外部サービス連携

| サービス | 用途 | 連携方法 |
|---------|------|---------|
| LINE Login | ソーシャルログイン | OAuth 2.0 → Netlify Function → Magic Link |
| TimeRex | 面談予約 | Webhook → Supabase Edge Function |
| tldv | 面談録画 | Webhook → Supabase Edge Function |
| Supabase Storage | 画像保管 | Direct upload via SDK |
| Google Fonts | Web フォント | CDN 読み込み |
| Font Awesome | アイコン | CDN 読み込み (SRI) |
| Chart.js | グラフ | CDN 読み込み |
| FullCalendar | カレンダー | CDN 読み込み |

---

## 13. URL・エンドポイント

| 用途 | URL |
|------|-----|
| 本番サイト | `https://interconnect-system.netlify.app` |
| Supabase | `https://whyoqhhzwtlxprhizmor.supabase.co` |
| LINE OAuth Function | `/.netlify/functions/line-auth-simple-v4` |
| TimeRex Webhook | `/api/timerex-webhook` → Supabase Edge Function |
| TimeRex Booking | `/api/timerex-booking` → Supabase Edge Function |

---

## 14. 主要な設計上の注意点

1. **カラム名**: `user_profiles.position`（`title` ではない）
2. **Supabase クライアント**: `window.supabaseClient` が正規名。`window.supabase` はエイリアス（supabase-unified.js で設定）
3. **テーブル名**: イベントは `event_items`（`events` はビュー）
4. **スキーマ真実源**: `sql/000_canonical_schema.sql` のみ。他の SQL はマイグレーション履歴
5. **dist/ ディレクトリ**: ビルド出力。直接編集しないこと。ソースファイルを編集して再ビルド
6. **deploy.yml 更新**: GitHub OAuth トークンに `workflow` スコープが必要
