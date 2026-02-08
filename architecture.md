# INTERCONNECT システムアーキテクチャ

> エグゼクティブ向けビジネスマッチングプラットフォームの詳細設計ドキュメント
> 最終更新: 2026-02-08 | 全HTMLのscript/link参照 + grep実態調査に基づく

---

## 目次

1. [システム概要](#1-システム概要)
2. [技術スタック](#2-技術スタック)
3. [アーキテクチャ全体図](#3-アーキテクチャ全体図)
4. [ディレクトリ構造](#4-ディレクトリ構造)
5. [フロントエンド設計](#5-フロントエンド設計)
6. [ページ別モジュール構成](#6-ページ別モジュール構成)
7. [JavaScript モジュール依存グラフ](#7-javascript-モジュール依存グラフ)
8. [バックエンド設計](#8-バックエンド設計)
9. [データベース設計](#9-データベース設計)
10. [認証・認可](#10-認証認可)
11. [外部サービス連携](#11-外部サービス連携)
12. [セキュリティ設計](#12-セキュリティ設計)
13. [リアルタイム通信](#13-リアルタイム通信)
14. [デプロイメント・CI/CD](#14-デプロイメントcicd)
15. [主要業務フロー](#15-主要業務フロー)
16. [コードベース健全性レポート](#16-コードベース健全性レポート)

---

## 1. システム概要

INTERCONNECTは、起業家・経営者を対象としたビジネスマッチングプラットフォーム。メンバー同士のマッチング、イベント管理、紹介報酬システム、リアルタイム通知を提供し、ビジネスコミュニティの形成を支援する。

### 設計原則

- **JAMstack**: 静的HTML + サーバレスAPI + マネージドDB (ビルドステップなし)
- **BaaS中心**: Supabaseをバックエンド基盤として全面採用
- **フレームワークレス**: Vanilla JavaScript (ES6+) によるモジュラー設計
- **リアルタイム**: Supabase RealtimeによるWebSocket通信でライブ同期

---

## 2. 技術スタック

| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| ホスティング | Netlify (CDN + Functions) | - |
| データベース | PostgreSQL (Supabase Cloud) | 15+ |
| ストレージ | Supabase Storage | - |
| サーバレス関数 | Netlify Functions (Node.js) | 18 |
| Edge Functions | Supabase Edge Functions (Deno) | 1.40+ |
| 認証 | Supabase Auth + LINE OAuth 2.0 | - |
| リアルタイム | Supabase Realtime (WebSocket) | - |
| フロントエンド | Vanilla JavaScript (ES6+) | - |
| チャート | Chart.js | 4.4.0 |
| カレンダー | FullCalendar | 5.11.3 |
| アイコン | Font Awesome | 6.0 / 6.4 |
| フォント | Google Fonts (Inter, Noto Sans JP) | - |
| CI/CD | GitHub Actions | - |

### 依存ライブラリ

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.52.1",
    "dotenv": "^17.2.1",
    "node-fetch": "^2.6.9"
  },
  "devDependencies": {
    "netlify-cli": "^15.0.0"
  }
}
```

### 外部CDN

| ライブラリ | 用途 | 使用ページ |
|-----------|------|-----------|
| `@supabase/supabase-js@2` | DB/Auth クライアント | index, register, dashboard, invite, admin-referral |
| `chart.js@4.4.0` | ダッシュボードチャート | dashboard, admin-referral |
| `fullcalendar@5.11.3` | カレンダー表示 | events |
| Font Awesome 6.0/6.4 | アイコン | 全ページ |
| Google Fonts | Inter + Noto Sans JP | 全ページ |

---

## 3. アーキテクチャ全体図

```
┌──────────────────────────────────────────────────────────────┐
│                   ブラウザ (クライアント)                        │
│                                                              │
│  HTML (27ページ)  ←→  JS (109参照)  ←→  CSS (79参照)          │
│        │                  │                                  │
│        │       ┌──────────┴──────────┐                       │
│        │       │ INTERCONNECT Core   │                       │
│        │       │ + supabase-unified  │                       │
│        │       └──────────┬──────────┘                       │
└────────┼──────────────────┼──────────────────────────────────┘
         │        ┌─────────┴─────────┐
         │        │  REST API (HTTPS) │
         │        │  Realtime (WSS)   │
         │        └─────────┬─────────┘
┌────────┼──────────────────┼──────────────────────────────────┐
│        ▼                  ▼                                  │
│  ┌────────────────────────────────────────────┐              │
│  │             Supabase Cloud                 │              │
│  │  ┌──────────┐  ┌───────────────────┐       │              │
│  │  │PostgreSQL │  │ Edge Functions    │       │              │
│  │  │ 33テーブル │  │ timerex-webhook  │       │              │
│  │  │ +1ビュー   │  │ timerex-booking  │       │              │
│  │  │ +7 RPC    │  │ tldv-webhook     │       │              │
│  │  └──────────┘  └───────────────────┘       │              │
│  │  ┌──────────┐  ┌──────────────────┐        │              │
│  │  │ Realtime │  │ Storage          │        │              │
│  │  │ 15チャネル │  │ avatars, covers  │        │              │
│  │  └──────────┘  └──────────────────┘        │              │
│  └────────────────────────────────────────────┘              │
│                                                              │
│  ┌────────────────────────────────────────────┐              │
│  │             Netlify                         │              │
│  │  ┌─────────────┐  ┌──────────────┐         │              │
│  │  │ Static CDN  │  │ Functions    │         │              │
│  │  │ HTML/JS/CSS │  │ line-auth-v4 │         │              │
│  │  └─────────────┘  └──────────────┘         │              │
│  └────────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐          ┌──────────────────┐
│ LINE Platform   │          │ TimeRex / tldv   │
│ OAuth 2.0       │          │ Webhook連携       │
└─────────────────┘          └──────────────────┘
```

---

## 4. ディレクトリ構造

```
interconnect-system/
│
├── .github/workflows/
│   └── deploy.yml                    # CI/CD: Netlify自動デプロイ
│
├── supabase/
│   ├── functions/
│   │   ├── timerex-webhook/index.ts  # TimeRex Webhook受信
│   │   ├── timerex-booking/index.ts  # 予約セッション作成
│   │   └── tldv-webhook/index.ts     # 会議録画Webhook受信
│   ├── migrations/                   # DBマイグレーション
│   ├── config.toml                   # ローカル開発設定
│   └── seed.sql                      # 初期データ
│
├── netlify/
│   └── functions/
│       ├── line-auth-simple-v4.js    # LINE OAuth処理
│       └── utils/
│           ├── security.js           # CSRF, Rate Limit, XSS防止
│           └── error-handler.js      # エラーハンドリング
│
├── js/                               # クライアントJS
│   ├── [109ファイル: HTML参照あり]
│   ├── [43ファイル: HTML未参照 (孤児)]
│   └── disabled-scripts/             # 無効化済み (57ファイル)
│
├── css/                              # スタイルシート
│   ├── [79ファイル: HTML参照あり]
│   ├── [13ファイル: HTML未参照 (孤児)]
│   ├── disabled-css/                 # 無効化済み (24ファイル)
│   └── _old_referral_css/            # 旧紹介CSS (7ファイル)
│
├── sql/                              # SQLマイグレーション (84ファイル)
├── sql-archive/                      # アーカイブ済みSQL (31ファイル)
│
├── config/
│   └── admin-config.json             # 管理画面設定
├── includes/
│   ├── header-right-unified.html     # ヘッダーコンポーネント
│   └── security-meta.html            # セキュリティメタタグ
├── assets/                           # 静的アセット
│
├── [27 本番HTMLページ]
├── [10 テスト/デバッグ/バックアップHTML]
├── netlify.toml                      # Netlify設定
├── package.json
└── .env
```

---

## 5. フロントエンド設計

### 5.1 初期化チェーン

```
Tier 1 - 基盤 (依存なし、最初にロード)
  ├── interconnect-core.js    → window.INTERCONNECT 名前空間を作成
  └── supabase-unified.js     → Supabase SDK動的ロード
                                 window.supabaseClient 初期化
                                 window.waitForSupabase() 公開
                                 'supabaseReady' イベント発火

Tier 2 - ユーティリティ (Tier 1の後)
  ├── error-prevention.js     → エラー防止ガード
  ├── null-check-fixes.js     → null参照防止
  ├── safe-dom-utils.js       → safeSetHTML(), escapeHTML() 等
  ├── safe-storage.js         → localStorage安全アクセス
  ├── toast-unified.js        → showToast/Success/Error/Warning()
  └── global-functions.js     → logout(), nextStep(), prevStep()

Tier 3 - 機能モジュール (supabaseReady待ち)
  ├── notification-system-unified.js  → 統一通知API
  ├── notifications-realtime-unified.js → リアルタイム通知
  ├── profile-sync.js                 → プロフィール同期
  ├── event-modal.js                  → イベントモーダル (eventModalReady発火)
  └── dashboard.js                    → ダッシュボード基盤

Tier 4 - ページ固有
  └── 各ページの専用モジュール群
```

### 5.2 グローバル名前空間

```javascript
window.INTERCONNECT = {
    version: '1.0.0',
    modules: {},           // registerModule() で登録
    utils: {},
    security: {},
    config: {
        debug: false,
        apiBaseUrl: window.location.origin,
        sessionTimeout: 30 * 60 * 1000,  // 30分
        maxLoginAttempts: 5,
        lockoutTime: 15 * 60 * 1000      // 15分
    }
};
```

### 5.3 カスタムイベント連携

| イベント名 | 発火元 | 購読先 |
|-----------|--------|--------|
| `supabaseReady` | supabase-unified.js | dashboard.js, events-supabase.js, activities.js, profile.js, members-supabase.js, profile-detail-modal.js, dashboard-data.js 他 (11+ファイル) |
| `eventModalReady` | event-modal.js | events-supabase.js |
| `stepChanged` | global-functions.js | registration-flow.js |

### 5.4 通知システム

3つのモジュールが役割分担:

| モジュール | 役割 |
|-----------|------|
| `notification-system-unified.js` | トーストUI表示 (成功/エラー/警告/情報) |
| `notifications-unified.js` | DB通知の読み込み・表示・操作 |
| `notifications-realtime-unified.js` | Realtimeによる新着通知の即時反映 |

---

## 6. ページ別モジュール構成

### 全27ページ一覧

| # | ページ | 分類 | 用途 |
|---|--------|------|------|
| 1 | index.html | 公開 | ランディングページ |
| 2 | login.html | 公開 | ログイン |
| 3 | register.html | 公開 | 会員登録 (ステップ形式) |
| 4 | forgot-password.html | 公開 | パスワードリセット |
| 5 | line-callback.html | 公開 | LINE OAuth コールバック |
| 6 | invite.html | 公開 | 紹介リンクランディング |
| 7 | about.html | 公開 | 会社情報 |
| 8 | privacy.html | 公開 | プライバシーポリシー |
| 9 | terms.html | 公開 | 利用規約 |
| 10 | book-consultation.html | 公開 | 無料相談予約 |
| 11 | booking-complete.html | 公開 | 予約完了確認 |
| 12 | dashboard.html | 保護 | メインダッシュボード |
| 13 | events.html | 保護 | イベント一覧・カレンダー |
| 14 | connections.html | 保護 | コネクション管理 |
| 15 | matching.html | 保護 | マッチング |
| 16 | members.html | 保護 | メンバー一覧 |
| 17 | profile.html | 保護 | プロフィール編集 |
| 18 | messages.html | 保護 | メッセージング |
| 19 | notifications.html | 保護 | 通知一覧 |
| 20 | settings.html | 保護 | ユーザー設定 |
| 21 | activities.html | 保護 | アクティビティフィード |
| 22 | referral.html | 保護 | 紹介・ポイント管理 |
| 23 | billing.html | 保護 | 請求 |
| 24 | admin.html | 管理 | 管理者パネル |
| 25 | super-admin.html | 管理 | スーパー管理者 (UIシェルのみ、DB接続なし) |
| 26 | admin-site-settings.html | 管理 | サイト設定 (UIフォームのみ、DB接続なし) |
| 27 | admin-referral.html | 管理 | 紹介プログラム管理 |

**テスト/バックアップ (本番不要 - 10ファイル):**
`check-referral-setup.html`, `generate-video-poster.html`, `referral-backup.html`, `referral-debug.html`, `referral-old.html`, `referral-old2.html`, `test-connections.html`, `test-matching.html`, `test-matching-connection.html`, `test-matching-detailed.html`

### 保護ページ共通ベース

ほぼ全ての保護ページが読み込む共通セット:

```
JS共通: error-prevention.js, null-check-fixes.js, safe-dom-utils.js,
        safe-storage.js, global-functions.js, supabase-unified.js,
        profile-sync.js, responsive-menu-simple.js, dashboard.js,
        user-dropdown-handler.js, avatar-size-enforcer.js,
        notification-system-unified.js

CSS共通: style.css, buttons.css, dashboard.css, logout-button-fix.css,
         notifications.css, responsive-menu.css, user-menu-zindex-only.css,
         z-index-priority.css, avatar-size-unified.css,
         sidebar-responsive-fix.css, header-padding-fix.css
```

### ページ固有モジュール (主要ページのみ)

#### dashboard.html (最も複雑: JS 34本)

```
固有JS: interconnect-core.js, service-worker-filter.js,
        console-history-logger.js, suppress-duplicate-warnings.js,
        function-execution-tracker.js, guest-mode-manager.js,
        notifications-realtime-unified.js, dashboard-bundle.js,
        dashboard-event-fix.js, dashboard-stats-initializer.js,
        dashboard-member-calculator.js, dashboard-event-calculator.js,
        dashboard-matching-calculator.js, dashboard-upcoming-events.js,
        dashboard-fix-loading.js, database-table-fix.js,
        activity-event-filter.js, activity-event-filter-fix.js,
        dashboard-charts.js, message-integration.js,
        global-viewing-history.js
固有CSS: dashboard-states.css, realtime-notifications.css,
         header-user-menu-redesign.css, event-modal.css,
         event-detail-modal.css, activity-enhanced.css,
         activity-event-filter.css, dashboard-charts.css,
         css-conflict-fix.css, responsive-complete.css, timerex-booking.css
外部CDN: Chart.js 4.4.0
```

#### events.html

```
固有JS: toast-unified.js, event-modal.js, events-supabase.js,
        events-debug.js(*), calendar-integration.js
固有CSS: events.css, events-supabase.css, event-modal.css,
         calendar-integration.css, toast-unified.css
外部CDN: FullCalendar 5.11.3 (JS + CSS + ja locale)
注: events-debug.js(*)はディスク上に存在しない (ゴーストリファレンス)
```

#### matching.html

```
固有JS: matching-unified.js, global-viewing-history.js,
        profile-detail-modal.js, profile-modal-priority.js,
        matching-filter-reset.js, matching-realtime-updates.js
固有CSS: matching-unified.css, matching-loading.css,
         user-dropdown-unified.css
```

#### members.html

```
固有JS: members-profile-modal.js, members-supabase.js,
        member-profile-preview.js, members-search.js,
        members-connection.js, members-view-mode.js,
        global-viewing-history.js, advanced-search.js
固有CSS: members.css, member-profile-preview.css,
         members-profile-modal.css, advanced-search.css
```

#### referral.html

```
固有JS: service-worker-filter.js, referral-debug-network.js(*),
        console-history-logger.js, suppress-duplicate-warnings.js,
        function-execution-tracker.js, common.js, notifications.js(*),
        user-menu.js, cashout-modal.js, referral-unified.js,
        share-modal-handler.js, final-essential-fixes.js(*)
固有CSS: referral-unified.css, referral-final-fix.css,
         referral-link-card-redesign.css, share-modal-enhanced.css
注: (*)付きはディスク上に存在しない (ゴーストリファレンス)
```

#### invite.html (インラインJS、~85行)

```
外部JS: @supabase/supabase-js@2 (CDNのみ)
インラインJS:
  - URLからinvite codeを解析
  - invite_links テーブルを検証 (is_active, max_uses, expires_at)
  - 紹介者プロフィールを表示
  - sessionStorageにinviteCode/inviterIdを保存
  - register.html?invite={code} へCTA設定
固有CSS: auth-unified.css, invite.css, css-conflict-fix.css
```

#### admin-referral.html

```
固有JS: supabase-client.js(*), admin-common.js(*), admin-referral.js,
        manual-meeting-confirmation.js
外部CDN: Supabase SDK, Chart.js
固有CSS: admin.css, admin-referral.css(*)
注: supabase-client.js, admin-common.js, admin-referral.css はディスク上に存在しない
```

#### super-admin.html (インラインJS、~144行)

```
インラインJS: ナビゲーション、サイドバートグル、モバイルメニュー、
             通知パネル、ログアウト (UIシェルのみ、DB接続なし)
外部JS: error-prevention.js, null-check-fixes.js, safe-dom-utils.js, safe-storage.js のみ
固有CSS: super-admin.css
```

#### admin-site-settings.html (インラインJS、~77行)

```
インラインJS: セクション切替(7セクション)、保存/リセットアラート、
             アイコンプレビュー、文字数カウンター (UIフォームのみ、DB接続なし)
固有CSS: super-admin.css, admin-forms.css
```

---

## 7. JavaScript モジュール依存グラフ

### グローバル変数の提供/消費関係

```
window.INTERCONNECT ──────── interconnect-core.js (提供)
  │                           common.js (拡張/再定義 ※競合注意)
  ├── .Utils ──────────────── admin-utils.js (提供, HTML未参照)
  ├── .Security ───────────── admin-security.js (提供, HTML未参照)
  └── .registerModule() ───── 各機能モジュール (消費)

window.supabaseClient ────── supabase-unified.js (提供)
window.supabase ──────────── supabase-unified.js (エイリアス)
window.waitForSupabase() ─── supabase-unified.js (提供)
  └── 50+ファイルが消費

window.showToast() ────────── toast-unified.js (提供)
window.showSuccess/Error() ── toast-unified.js (提供)
  └── 20+ファイルが消費

window.logout() ──────────── global-functions.js (提供)
window.eventModal ─────────── event-modal.js (提供)
window.safeSetHTML() ──────── safe-dom-utils.js (提供)
window.profileDetailModal ── profile-detail-modal.js (提供)
window.connectionsManager ── connections-manager-simple.js (提供)
window.matchingSupabase ──── matching-unified.js (提供)
window.membersSupabase ───── members-supabase.js (提供)
```

### 既知の競合

| 問題 | 詳細 |
|------|------|
| INTERCONNECT二重定義 | `interconnect-core.js` と `common.js` の両方が `window.INTERCONNECT` を定義。後にロードされた方が上書き |
| トースト実装の重複 | `toast-unified.js`, `toast-unified-global.js`, `notification-system-unified.js` が類似機能を提供 |
| safe-dom重複 | `safe-dom-utils.js` と `error-prevention.js` の両方が `safeSetHTML()` を提供 |

---

## 8. バックエンド設計

### 8.1 Netlify Functions (Node.js 18)

| 関数 | エンドポイント | 用途 |
|------|-------------|------|
| `line-auth-simple-v4` | `POST /.netlify/functions/line-auth-simple-v4` | LINE OAuth認証 |

**処理フロー:**
```
1. クライアントからcode + redirect_uri受信
2. LINE Token API → access_token取得
3. LINE Profile API → ユーザー情報取得
4. Supabase Admin API → ユーザー作成 or 更新
   メール: line_{userId}@interconnect.com
5. 認証結果を返却
```

### 8.2 Supabase Edge Functions (Deno/TypeScript)

| 関数 | プロキシパス | 用途 |
|------|-----------|------|
| `timerex-webhook` | `/api/timerex-webhook` | TimeRex予約Webhook |
| `timerex-booking` | `/api/timerex-booking` | 予約セッション作成 |
| `tldv-webhook` | `/api/tldv-webhook` | tldv.io録画Webhook |

### 8.3 APIエンドポイント詳細

#### LINE認証

```
POST /.netlify/functions/line-auth-simple-v4
Content-Type: application/json

Request:  { "code": "auth_code", "redirect_uri": "https://..." }
Response: {
  "success": true,
  "user": {
    "id": "uuid", "email": "line_{userId}@interconnect.com",
    "display_name": "...", "is_new_user": true|false
  },
  "redirect_to": "dashboard.html"
}
```

#### TimeRex Webhook

```
POST /api/timerex-webhook
X-TimeRex-Signature: sha256={hmac}

イベント:
  booking.created   → bookingsテーブルINSERT + 紹介者通知
  booking.completed → ステータス更新 + 紹介ポイント付与(1,000pt)
  booking.cancelled → ステータス更新
```

---

## 9. データベース設計

### 9.1 テーブル一覧

**全JS (disabled-scripts除外) + Edge Functionから `.from('table_name')` をgrep。33テーブル + 1ビュー。**

#### ユーザー・プロフィール

| テーブル | 参照元JS | 用途 |
|---------|---------|------|
| `user_profiles` | user-menu, dashboard-bundle, matching-unified, profile-detail-modal, members-supabase, advanced-search, profile-viewer, profile, connections-manager-simple, register-with-invite, dashboard-event-fix, dashboard-member-calculator, member-profile-preview, members-profile-modal, notifications-realtime-unified, profile-image-upload, message-integration | ユーザープロフィール (メイン) |
| `profiles` | tldv-webhook/index.ts | プロフィール (Edge Function用) |
| `members` | dashboard-member-counter | メンバー (カウント用) |
| `auth.users` | tldv-api-integration | 認証ユーザー |

#### マッチング・コネクション

| テーブル | 参照元JS |
|---------|---------|
| `connections` | connections-manager-simple, matching-unified, members-connection, profile-detail-modal, profile, database-table-fix, members-supabase, matching-missing-features |
| `matchings` | dashboard-matching-calculator, matching-unified, dashboard-realtime-calculator |
| `bookmarks` | matching-unified |

#### イベント

| テーブル | 参照元JS |
|---------|---------|
| `events` | dashboard-event-fix, dashboard-bundle, dashboard-realtime-calculator, event-registration, calendar, dashboard-data, dashboard-event-calculator, dashboard-event-participation, dashboard-upcoming-events, notifications-realtime-unified |
| `event_items` | calendar-integration, event-modal, events-supabase, dashboard-upcoming-events, activity-event-filter |
| `event_participants` | event-modal, event-registration, events-supabase, calendar-integration, dashboard-event-participation, activity-event-filter |
| `event_reminders` | event-registration |

#### 紹介・報酬

| テーブル | 参照元JS |
|---------|---------|
| `invite_links` | admin-referral, referral-unified, referral-tracking, register-with-invite, registration-flow, register-referral-handler, referral-landing, timerex-webhook (※invite.htmlインラインからも参照) |
| `invitations` | admin-referral, register-with-invite, referral-tracking, tldv-api-integration, manual-meeting-confirmation, register-referral-handler, tldv-webhook |
| `referral_clicks` | referral-tracking |
| `cashout_requests` | cashout-modal, admin-referral, referral-unified |
| `user_points` | admin-referral, dashboard, referral-unified |
| `fraud_flags` | admin-referral |
| `ip_registration_stats` | admin-referral |
| `invite_history` | referral-landing |
| `v_referral_history` | referral-unified (※DBビュー) |

#### 通知・メッセージ

| テーブル | 参照元JS |
|---------|---------|
| `notifications` | notifications-unified, notifications-realtime-unified, connections-manager-simple, user-dropdown-handler, matching-unified, members-connection, timerex-webhook |
| `messages` | dashboard-data, dashboard-message-calculator, dashboard-realtime-calculator, message-integration |

#### ダッシュボード・分析

| テーブル | 参照元JS |
|---------|---------|
| `dashboard_stats` | dashboard-data, dashboard-member-counter, dashboard-realtime-calculator |
| `user_activities` | dashboard-data, dashboard-bundle, activities, dashboard-event-participation, dashboard-matching-calculator, messages-external-contacts |
| `activities` | activity-event-filter, activity-event-filter-fix, dashboard-charts, matching-unified, database-table-fix |
| `member_growth_stats` | dashboard-charts |
| `event_stats` | dashboard-charts |
| `industry_distribution` | dashboard-charts |
| `search_history` | advanced-search |
| `share_activities` | share-modal-handler |

#### 面談・録画

| テーブル | 参照元JS |
|---------|---------|
| `bookings` | timerex-webhook/index.ts |
| `booking_intents` | calendly-booking, google-calendar-booking |
| `booking_sessions` | timerex-booking/index.ts |
| `meeting_minutes` | profile-detail-modal |
| `meeting_confirmations` | manual-meeting-confirmation |
| `meeting_analysis` | tldv-api-integration |
| `tldv_meeting_records` | tldv-api-integration, manual-meeting-confirmation, tldv-webhook |

### 9.2 ストレージバケット

`profile-image-upload.js` 内の `supabaseClient.storage.from()` 呼び出しより:

| バケット | 用途 | ファイル |
|---------|------|---------|
| `avatars` | プロフィール画像のアップロード・公開URL取得 | profile-image-upload.js |
| `covers` | カバー画像のアップロード・公開URL取得 | profile-image-upload.js |

### 9.3 RPC関数 (7関数)

| 関数名 | 呼び出し元 | 用途 |
|--------|-----------|------|
| `deduct_user_points` | cashout-modal.js | ポイント消費 |
| `process_referral_reward` | tldv-api-integration.js, manual-meeting-confirmation.js, tldv-webhook | 紹介報酬処理 |
| `get_top_referrers` | admin-referral.js | トップ紹介者取得 |
| `get_referral_analytics` | admin-referral.js | 紹介分析データ |
| `add_user_points` | admin-referral.js | ポイント付与(管理) |
| `add_referral_points` | referral-tracking.js, timerex-webhook | 紹介ポイント付与 |
| `get_user_invite_links` | referral-rls-workaround.js | 自分の招待リンク取得 (RLSバイパス) |

### 9.4 Realtimeチャネル (15チャネル)

`.channel('name')` をgrepした結果:

| チャネル名 | 監視テーブル | ファイル |
|-----------|------------|--------|
| `admin-referrals` | invitations | admin-referral.js |
| `admin-cashouts` | cashout_requests | admin-referral.js |
| `dashboard_stats_changes` | dashboard_stats | dashboard-updater.js |
| `user_activities_changes` | user_activities | dashboard-updater.js |
| `events_changes` | events | dashboard-updater.js |
| `connections-changes` | connections | connections-manager-simple.js |
| `connections_changes` | connections | members-connection.js |
| `notification-changes` | notifications | notifications-realtime-unified.js |
| `message-changes` | messages | notifications-realtime-unified.js |
| `matching-changes` | matches | notifications-realtime-unified.js |
| `event-changes` | event_participants | notifications-realtime-unified.js |
| `referral-changes` | referrals | notifications-realtime-unified.js |
| `notifications` | notifications | notifications-unified.js |
| `matching-profiles` | user_profiles | matching-realtime-updates.js |
| `public:profiles` | profiles | members-supabase.js |

### 9.5 Row Level Security (RLS)

```
SELECT: 認証ユーザーは公開データを閲覧可能
INSERT: 自分のデータのみ作成可能
UPDATE: 自分のデータのみ更新可能 (auth.uid() = user_id)
DELETE: 自分のデータのみ、または管理者のみ
管理操作: service_role キーによるバイパス
```

---

## 10. 認証・認可

### 10.1 メール/パスワード認証

```
login.html → supabase-unified.js: handleEmailLogin()
  → supabaseClient.auth.signInWithPassword()
  → 成功: localStorage保存 → dashboard.html
  → 失敗: エラー表示 (5秒で自動消去)
```

### 10.2 LINE Login OAuth 2.0

```
1. login.html → handleLineLogin()
   ├── CSRF state生成 → sessionStorage保存
   └── LINE認証画面へリダイレクト (scope: profile, openid, email)

2. LINE → line-callback.html (code + state)
   ├── state検証 (CSRF)
   └── POST /.netlify/functions/line-auth-simple-v4

3. Netlify Function (サーバサイド)
   ├── LINE Token API → access_token取得
   ├── LINE Profile API → ユーザー情報取得
   └── Supabase Admin API → ユーザー作成/更新
        メール: line_{userId}@interconnect.com

4. → dashboard.html
```

### 10.3 ページアクセス制御

```
公開ページ (認証不要):
  index, login, register, forgot-password, line-callback,
  invite, about, privacy, terms, book-consultation, booking-complete

保護ページ (認証必須):
  dashboard, members, events, messages, matching,
  profile, referral, notifications, settings, activities, billing

管理ページ:
  admin, super-admin, admin-site-settings, admin-referral

未認証 + 保護ページ → login.html (リダイレクト先をsessionStorage保存)
```

---

## 11. 外部サービス連携

### 11.1 LINE Platform

| 項目 | 値 |
|------|-----|
| プロトコル | OAuth 2.0 Authorization Code Flow |
| Channel ID | 2007688781 |
| Callback | `/line-callback.html` |
| スコープ | profile, openid, email |
| 処理サーバ | Netlify Function (line-auth-simple-v4) |

### 11.2 TimeRex

| 項目 | 説明 |
|------|------|
| 用途 | 無料相談の予約管理 |
| 連携方式 | Webhook (HMAC SHA256署名検証) |
| Edge Function | `timerex-webhook`, `timerex-booking` |
| イベント | booking.created / completed / cancelled |

### 11.3 tldv.io

| 項目 | 説明 |
|------|------|
| 用途 | 面談の録画・文字起こし |
| 連携方式 | Webhook + REST API |
| Edge Function | `tldv-webhook` |

### 11.4 データフロー全体

```
[紹介者] → invite_links作成
[被紹介者] → /invite/{code} → referral_clicks記録
  ├── 会員登録 → invitations INSERT
  ├── TimeRex予約 → booking.created webhook → bookings INSERT + 紹介者通知
  ├── 面談実施 + tldv録画 → tldv-webhook → tldv_meeting_records → process_referral_reward
  └── 面談完了 → booking.completed webhook → add_referral_points (1,000pt) + 通知

[紹介者] → キャッシュアウト申請 (3,000pt以上)
  └── cashout_requests INSERT → 管理者レビュー → 承認 → 処理 → 完了
```

---

## 12. セキュリティ設計

| レイヤー | 実装 |
|---------|------|
| HTTPヘッダー | `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `X-Content-Type-Options: nosniff` |
| 認証 | Supabase Auth (JWT, 3600秒有効期限) + LINE OAuth 2.0 |
| CSRF防御 | stateパラメータ + `crypto.timingSafeEqual` (security.js) |
| データアクセス | 全テーブルRLS有効、service_role / anon_key 分離 |
| 入力検証 | XSSエスケープ, JSON構造検証, リダイレクトURL検証 |
| レート制限 | 10リクエスト/分/IP (security.js) |
| Webhook検証 | HMAC SHA256署名検証 (timerex-webhook) |
| 不正検知 | fraud_flags, ip_registration_stats テーブル |
| DOM安全 | safe-dom-utils.js |

### セキュリティユーティリティ (security.js)

| 関数 | 用途 |
|------|------|
| `generateState()` | `crypto.randomBytes(32)` でCSRFトークン生成 |
| `validateState()` | `crypto.timingSafeEqual` でタイミングセーフ検証 |
| `validateRequest()` | Content-Type検証, JSON解析, 必須フィールド検査 |
| `getClientIP()` | `x-nf-client-connection-ip` / `x-forwarded-for` からIP取得 |
| `checkRateLimit()` | Mapベースのスライディングウィンドウ (10req/min) |
| `isValidRedirectURL()` | プロトコル + ドメインホワイトリスト検証 |
| `escapeHtml()` | `& < > " '` の5文字エスケープ |

---

## 13. リアルタイム通信

```
Supabase Realtime (WebSocket)
  ├── postgres_changes (テーブル変更検知)
  │     └── INSERT / UPDATE / DELETE イベント
  │     └── filter: user_id=eq.{currentUserId} 等
  └── クライアント側ハンドラ
        ├── UIの即時更新 (通知バッジ、リスト等)
        ├── トースト通知表示
        └── 統計値の再計算
```

購読管理:
- **購読開始**: `supabaseReady` イベント後
- **再接続**: Supabase SDK自動再接続
- **購読解除**: `cleanup-manager.js` (※HTML未参照の孤児ファイル)
- **重複防止**: `event-listener-manager.js`

---

## 14. デプロイメント・CI/CD

```
git push origin main
  ↓
GitHub Actions (.github/workflows/deploy.yml)
  ├── Ubuntu latest, Node.js 18
  ├── npm install --prefix netlify/functions
  └── nwtgck/actions-netlify@v2 → esbuild バンドル
  ↓
Netlify CDN → https://interconnect-auto-test.netlify.app
```

### リダイレクトルール (netlify.toml)

| From | To | Status |
|------|----|--------|
| `/invite/*` | `/index.html` | 200 |
| `/api/timerex-webhook` | Supabase Edge Function | 200 |
| `/api/timerex-booking` | Supabase Edge Function | 200 |

### 環境変数

| 変数 | 管理場所 |
|------|---------|
| `SUPABASE_URL` | Netlify / フロントエンドJS内ハードコード |
| `SUPABASE_ANON_KEY` | フロントエンドJS内ハードコード / invite.htmlインライン |
| `SUPABASE_SERVICE_KEY` | Netlify Functions環境変数 |
| `LINE_CHANNEL_ID` | Netlify / フロントエンドJS内ハードコード |
| `LINE_CHANNEL_SECRET` | Netlify Functions環境変数 |
| `TIMEREX_WEBHOOK_SECRET` | Supabase Edge Function環境変数 |

---

## 15. 主要業務フロー

### 15.1 新規会員登録 (紹介経由)

```
1. /invite/{code} → invite.html (インラインJS)
   invite_links検証、紹介者表示、sessionStorageにコード保存
2. register.html → registration-flow.js (ステップ形式)
3. register-with-invite.js → invite_links, invitations 更新
4. Supabase Auth → ユーザー作成
5. user_profiles INSERT
6. → dashboard.html
```

### 15.2 マッチング

```
1. matching.html → matching-unified.js
2. user_profiles から候補一覧取得
3. フィルタリング (業種、課題、関心事)
4. レーダーチャートでマッチ度可視化
5. コネクション申請 → connections INSERT
6. 相手にリアルタイム通知
7. 承認 → connections UPDATE (status: accepted)
```

### 15.3 キャッシュアウト

```
1. referral.html → ポイント残高確認 (user_points)
2. cashout-modal.js → 申請フォーム (3,000pt以上)
3. deduct_user_points RPC → ポイント消費
4. cashout_requests INSERT (status: pending)
5. admin-referral.html → 管理者レビュー
6. 承認 → processing → completed
```

---

## 16. コードベース健全性レポート

### ゴーストリファレンス (HTMLが参照するが、ディスク上に存在しないファイル)

**JS: 35件**
```
admin-common.js, admin.js, additional-critical-features.js,
critical-features-restoration.js, database-table-resolver.js,
debug-logger.js, dedupe-restoration-classes.js, events-debug.js,
final-critical-features.js, final-essential-fixes.js,
hero-simple.js, hero-slant-remover.js, homepage-loading-final-fix.js,
homepage-loading-video-fix.js, line-callback-debug.js, line-debug.js,
line-login-debug-full.js, line-login-fix.js, line-login-immediate.js,
matching-buttons-fix.js, matching-complete-fix.js,
matching-connections-essential-only.js, matching-init-fix.js,
matching-table-adapter.js, missing-critical-features.js,
notification-sender.js, notifications.js, referral-debug-network.js,
referral-enhanced.js, referral.js, supabase-client.js,
supabase-wait-fix.js, typewriter-effect.js,
video-performance-optimizer.js, video-preload-optimize.js
```

**CSS: 7件**
```
admin-referral.css, hero-slant-fix.css, referral-responsive-perfect.css,
referral-responsive.css, referral.css, typewriter-init.css,
user-dropdown-fix-final.css
```

### 孤児ファイル (ディスク上に存在するが、どのHTMLからも参照されていない)

**JS: 43件**
```
admin-security.js, admin-site-settings.js, admin-utils.js,
animation-manager.js, background-animation.js, calendar.js,
calendly-booking.js, cleanup-manager.js, dashboard-activity-enhancer.js,
dashboard-data.js, dashboard-dynamic-calculator.js,
dashboard-event-details.js, dashboard-event-display-enhancer.js,
dashboard-event-participation.js, dashboard-initial-loading.js,
dashboard-load-order-optimizer.js, dashboard-member-counter.js,
dashboard-message-calculator.js, dashboard-realtime-calculator.js,
dashboard-stat-renderer.js, dashboard-stats-integrator.js,
dashboard-ui.js, dashboard-updater.js, digital-text-effect.js,
force-display-link.js, global-error-handler.js,
google-calendar-booking.js, infographic-presentation.js, matching.js,
monodukuri-presentation.js, performance-monitor.js, presentation.js,
production-ready-check.js, referral-rls-workaround.js,
referral-tracking.js, scroll-fade.js, settings.js,
supabase-schema-detector.js, super-admin.js, system-health-check.js,
timerex-booking.js, tldv-api-integration.js, user-menu-enhanced.js
```

**注意:** 孤児JSのうち以下はHTML参照のJSから間接的に依存される可能性あり:
- `dashboard-updater.js` (Realtimeチャネル3件を持つ)
- `dashboard-member-counter.js`, `dashboard-message-calculator.js`, `dashboard-realtime-calculator.js` (DBテーブル参照あり)
- `referral-tracking.js` (RPC呼び出し、Realtimeなし)
- `tldv-api-integration.js` (RPC呼び出し、テーブル参照あり)

**CSS: 13件**
```
animations-performance.css, auth-modern.css, calendar.css,
cleanup-redundant.css, grayish-blue-cards.css,
infographic-presentation.css, monodukuri-presentation.css,
notifications-enhanced.css, presentation.css,
register-sns-removal.css, registration-enhanced.css,
subtle-blue-cards.css, user-menu-fix.css
```

### 不要ディレクトリ/ファイル群

| 対象 | ファイル数 | 内容 |
|------|-----------|------|
| `js/disabled-scripts/` | 57 | 無効化済みJS |
| `css/disabled-css/` | 24 | 無効化済みCSS |
| `css/_old_referral_css/` | 7 | 旧紹介CSS |
| `sql-archive/` | 31 | アーカイブ済みSQL |
| テスト/バックアップHTML | 10 | テスト・デバッグ・旧版ページ |
