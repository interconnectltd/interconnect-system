# INTERCONNECT システムアーキテクチャ

> エグゼクティブ向けビジネスマッチングプラットフォームの詳細設計ドキュメント
> 最終更新: 2026-02-08 | HTML参照ベースの実態調査に基づく

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
| `@supabase/supabase-js@2` | DB/Auth クライアント | index, register, dashboard, invite |
| `chart.js@4.4.0` | ダッシュボードチャート | dashboard |
| `fullcalendar@5.11.3` | カレンダー表示 | events |
| Font Awesome 6.0/6.4 | アイコン | 全ページ |
| Google Fonts | Inter + Noto Sans JP | 全ページ |

---

## 3. アーキテクチャ全体図

```
┌──────────────────────────────────────────────────────────┐
│                   ブラウザ (クライアント)                    │
│                                                          │
│  HTML (19ページ)  ←→  JS (109モジュール)  ←→  CSS (79ファイル) │
│        │                    │                            │
│        │         ┌──────────┴──────────┐                 │
│        │         │ INTERCONNECT Core   │                 │
│        │         │ + supabase-unified  │                 │
│        │         └──────────┬──────────┘                 │
└────────┼────────────────────┼────────────────────────────┘
         │          ┌─────────┴─────────┐
         │          │  REST API (HTTPS) │
         │          │  Realtime (WSS)   │
         │          └─────────┬─────────┘
┌────────┼────────────────────┼────────────────────────────┐
│        ▼                    ▼                            │
│  ┌──────────────────────────────────────────┐            │
│  │            Supabase Cloud                │            │
│  │  ┌──────────┐  ┌───────────────────┐     │            │
│  │  │PostgreSQL │  │ Edge Functions    │     │            │
│  │  │ 30+テーブル │  │ timerex-webhook  │     │            │
│  │  │ + RLS     │  │ timerex-booking  │     │            │
│  │  │ + 6 RPC   │  │ tldv-webhook     │     │            │
│  │  └──────────┘  └───────────────────┘     │            │
│  │  ┌──────────┐                            │            │
│  │  │ Realtime │  (14チャネル購読)            │            │
│  │  └──────────┘                            │            │
│  └──────────────────────────────────────────┘            │
│                                                          │
│  ┌──────────────────────────────────────────┐            │
│  │            Netlify                        │            │
│  │  ┌─────────────┐  ┌──────────────┐       │            │
│  │  │ Static CDN  │  │ Functions    │       │            │
│  │  │ HTML/JS/CSS │  │ line-auth-v4 │       │            │
│  │  └─────────────┘  └──────────────┘       │            │
│  └──────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐          ┌──────────────────┐
│ LINE Platform   │          │ TimeRex / tldv   │
│ OAuth 2.0       │          │ Webhook連携       │
└─────────────────┘          └──────────────────┘
```

---

## 4. ディレクトリ構造

**本番稼働に必要なファイルのみ記載** (テスト/デバッグ/無効化ファイルは除外)

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
├── js/         # クライアントJS (実使用: 109ファイル)
├── css/        # スタイルシート (実使用: 79ファイル)
├── sql/        # SQLマイグレーション
├── config/
│   └── admin-config.json             # 管理画面設定
├── includes/
│   ├── header-right-unified.html     # ヘッダーコンポーネント
│   └── security-meta.html            # セキュリティメタタグ
├── assets/                           # 静的アセット
│
├── [19 HTMLページ]                    # 本番ページ
├── netlify.toml                      # Netlify設定
├── package.json                      # プロジェクト設定
└── .env                              # 環境変数
```

---

## 5. フロントエンド設計

### 5.1 初期化チェーン

全ページ共通の初期化順序:

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

Tier 3 - 機能モジュール (Tier 2の後、supabaseReady待ち)
  ├── notification-system-unified.js  → 統一通知API
  ├── notifications-realtime-unified.js → リアルタイム通知
  ├── profile-sync.js                 → プロフィール同期
  ├── event-modal.js                  → イベントモーダル (eventModalReady発火)
  └── dashboard.js                    → ダッシュボード基盤

Tier 4 - ページ固有 (Tier 3の後)
  └── 各ページの専用モジュール群
```

### 5.2 グローバル名前空間

```javascript
window.INTERCONNECT = {
    version: '1.0.0',
    modules: {},           // registerModule() で登録
    utils: {},
    security: {},          // admin-security.js で拡充
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

3つの通知モジュールが役割分担:

| モジュール | 役割 |
|-----------|------|
| `notification-system-unified.js` | トーストUI表示 (成功/エラー/警告/情報) |
| `notifications-unified.js` | DB通知の読み込み・表示・操作 |
| `notifications-realtime-unified.js` | Realtimeによる新着通知の即時反映 |

---

## 6. ページ別モジュール構成

### 全ページ共通ベース

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

### ページ固有モジュール

#### index.html (ランディングページ)

```
固有JS: referral-landing.js, homepage-perfect-final.js, main.js
固有CSS: navbar-fresh.css, homepage-modern.css, homepage-complete.css,
         contact-balanced.css, hero.css, video系CSS
特徴: 紹介コード検出、ヒーローアニメーション、ビデオ背景
```

#### login.html

```
固有JS: auth-background-safe.js, guest-mode-manager.js,
        guest-login-handler.js, line-login-simple.js
固有CSS: auth-unified.css
特徴: メール/パスワード認証、LINE Login、ゲストモード
```

#### register.html

```
固有JS: register-referral-handler.js, register-auth-check.js,
        auth.js, registration-flow.js, register-enhanced-validation.js,
        register-with-invite.js, register-char-count.js,
        register-strict-validation.js, toast-unified-global.js
固有CSS: auth.css, auth-unified.css, auth-register-fix.css,
         register-ui-fix.css, register-responsive.css
特徴: ステップ形式登録、紹介コード処理、バリデーション
```

#### dashboard.html

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
         css-conflict-fix.css, responsive-complete.css,
         timerex-booking.css
外部CDN: Chart.js 4.4.0
特徴: 最もモジュール数が多い (34 JS)。KPI表示、チャート、
      アクティビティフィード、リアルタイム更新
```

#### events.html

```
固有JS: toast-unified.js, event-modal.js, events-supabase.js,
        events-debug.js, calendar-integration.js
固有CSS: events.css, events-supabase.css, event-modal.css,
         calendar-integration.css, toast-unified.css
外部CDN: FullCalendar 5.11.3 (JS + CSS + ja locale)
特徴: イベント一覧、カレンダー表示、参加登録
```

#### connections.html

```
固有JS: sidebar-toggle.js, connections-manager-simple.js,
        matching-missing-features.js, profile-detail-modal.js,
        members-profile-modal.js
固有CSS: dashboard-states.css, connections.css,
         header-user-menu-redesign.css, css-conflict-fix.css,
         responsive-complete.css, members-profile-modal.css
特徴: コネクション管理、プロフィールモーダル
```

#### matching.html

```
固有JS: matching-unified.js, global-viewing-history.js,
        profile-detail-modal.js, profile-modal-priority.js,
        matching-filter-reset.js, matching-realtime-updates.js
固有CSS: matching-unified.css, matching-loading.css,
         user-dropdown-unified.css
特徴: マッチングアルゴリズム、レーダーチャート、
      フィルタリング、リアルタイム更新
```

#### members.html

```
固有JS: members-profile-modal.js, members-supabase.js,
        member-profile-preview.js, members-search.js,
        members-connection.js, members-view-mode.js,
        global-viewing-history.js, advanced-search.js
固有CSS: members.css, member-profile-preview.css,
         members-profile-modal.css, responsive-complete.css,
         advanced-search.css
特徴: メンバー一覧、検索、プロフィールプレビュー、
      コネクション申請
```

#### profile.html

```
固有JS: profile.js, profile-viewer.js, profile-image-upload.js
固有CSS: profile.css, profile-image-upload.css
特徴: プロフィール編集、画像アップロード
```

#### messages.html

```
固有JS: messages-external-contacts.js, messages-viewing-history.js,
        message-integration.js
固有CSS: messages.css, info-card-contrast-fix.css,
         realtime-notifications.css
特徴: メッセージング、外部コンタクト管理
```

#### referral.html

```
固有JS: service-worker-filter.js, referral-debug-network.js,
        console-history-logger.js, suppress-duplicate-warnings.js,
        function-execution-tracker.js, common.js, notifications.js,
        user-menu.js, cashout-modal.js, referral-unified.js,
        share-modal-handler.js, final-essential-fixes.js
固有CSS: referral-unified.css, referral-final-fix.css,
         referral-link-card-redesign.css, share-modal-enhanced.css,
         header-user-menu-redesign.css
特徴: 紹介リンク管理、ポイント表示、キャッシュアウト申請、
      共有モーダル
```

#### admin.html / super-admin.html / admin-site-settings.html

```
admin固有JS: debug-logger.js, admin.js, notifications.js
super-admin固有JS: (HTML内インラインのみ)
admin-site固有JS: (HTML内インラインのみ)
admin固有CSS: admin.css, super-admin.css, admin-forms.css
特徴: ユーザー管理、サイト設定、KPI表示。
      super-admin/admin-site-settingsは最小限のJS外部参照
```

---

## 7. JavaScript モジュール依存グラフ

### グローバル変数による暗黙的依存

```
window.INTERCONNECT ──────── interconnect-core.js (提供)
  │                           common.js (拡張/再定義 ※競合注意)
  ├── .Utils ──────────────── admin-utils.js (提供)
  ├── .Security ───────────── admin-security.js (提供, Utils依存)
  └── .registerModule() ───── 各機能モジュール (消費)

window.supabaseClient ────── supabase-unified.js (提供)
window.supabase ──────────── supabase-unified.js (エイリアス)
window.waitForSupabase() ─── supabase-unified.js (提供)
  └── 50+ファイルが消費 (async初期化の待ち合わせ)

window.showToast() ────────── toast-unified.js (提供)
window.showSuccess/Error() ── toast-unified.js (提供)
  └── 20+ファイルが消費

window.logout() ──────────── global-functions.js (提供)
  └── 5+ファイルが消費

window.eventModal ─────────── event-modal.js (提供)
  └── events-supabase.js (消費, eventModalReady待ち)

window.safeSetHTML() ──────── safe-dom-utils.js (提供)
window.escapeHTML() ───────── safe-dom-utils.js (提供)
  └── 多数のファイルが消費

window.profileDetailModal ── profile-detail-modal.js (提供)
window.connectionsManager ── connections-manager-simple.js (提供)
window.matchingSupabase ──── matching-unified.js (提供)
window.membersSupabase ───── members-supabase.js (提供)
window.referralTracker ───── referral-tracking.js (提供)
```

### 既知の競合

| 問題 | 詳細 |
|------|------|
| INTERCONNECT二重定義 | `interconnect-core.js` と `common.js` の両方が `window.INTERCONNECT` を定義。後にロードされた方が上書き |
| トースト実装の重複 | `toast-unified.js`, `toast-unified-global.js`, `notification-system-unified.js` が類似機能を提供 |
| safe-dom重複 | `safe-dom-utils.js` と `error-prevention.js` の両方が `safeSetHTML()` を提供 |

---

## 8. バックエンド設計

### 8.1 サーバレス関数

#### Netlify Functions (Node.js 18)

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

#### Supabase Edge Functions (Deno/TypeScript)

| 関数 | プロキシパス | 用途 |
|------|-----------|------|
| `timerex-webhook` | `/api/timerex-webhook` | TimeRex予約イベントWebhook |
| `timerex-booking` | `/api/timerex-booking` | 予約セッション作成API |
| `tldv-webhook` | `/api/tldv-webhook` | tldv.io録画完了Webhook |

### 8.2 APIエンドポイント詳細

#### LINE認証

```
POST /.netlify/functions/line-auth-simple-v4
Content-Type: application/json

Request:  { "code": "auth_code", "redirect_uri": "https://..." }
Response: {
  "success": true,
  "user": {
    "id": "uuid",
    "email": "line_{userId}@interconnect.com",
    "display_name": "...",
    "line_user_id": "U...",
    "is_new_user": true|false
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

#### Supabase REST API (自動生成)

クライアントは `@supabase/supabase-js` SDK経由で全テーブルにアクセス。RLSで認可制御。

---

## 9. データベース設計

### 9.1 実際にコードから参照されているテーブル一覧

**コード内の `.from('table_name')` パターンを全JS/Edge Functionで検索した結果。**

#### ユーザー・プロフィール

| テーブル | 主な参照元 | 用途 |
|---------|-----------|------|
| `user_profiles` | user-menu.js, dashboard-bundle.js, matching-unified.js, profile-detail-modal.js, members-supabase.js, advanced-search.js, profile-viewer.js, profile.js, connections-manager-simple.js, register-with-invite.js | ユーザープロフィール (メイン) |
| `profiles` | tldv-webhook/index.ts | プロフィール (Edge Function用) |

#### マッチング・コネクション

| テーブル | 主な参照元 | 用途 |
|---------|-----------|------|
| `connections` | connections-manager-simple.js, matching-unified.js, members-connection.js, profile-detail-modal.js, profile.js, database-table-fix.js | コネクション管理 |
| `matchings` | dashboard-matching-calculator.js, matching-unified.js, dashboard-realtime-calculator.js | マッチング結果 |
| `bookmarks` | matching-unified.js | ブックマーク |

#### イベント

| テーブル | 主な参照元 | 用途 |
|---------|-----------|------|
| `events` | dashboard-event-fix.js, dashboard-bundle.js, dashboard-realtime-calculator.js, event-registration.js, calendar.js, dashboard-data.js | イベント |
| `event_items` | calendar-integration.js, event-modal.js, events-supabase.js, dashboard-upcoming-events.js | イベント詳細項目 |
| `event_participants` | event-modal.js, event-registration.js, events-supabase.js, calendar-integration.js, dashboard-event-participation.js | イベント参加者 |
| `event_reminders` | event-registration.js | リマインダー |

#### 紹介・報酬

| テーブル | 主な参照元 | 用途 |
|---------|-----------|------|
| `invite_links` | admin-referral.js, referral-unified.js, referral-tracking.js, register-with-invite.js, registration-flow.js, timerex-webhook | 紹介リンク |
| `invitations` | admin-referral.js, register-with-invite.js, referral-tracking.js, tldv-api-integration.js, manual-meeting-confirmation.js, tldv-webhook | 紹介トラッキング |
| `referral_clicks` | referral-tracking.js | クリック記録 |
| `cashout_requests` | cashout-modal.js, admin-referral.js | キャッシュアウト |
| `user_points` | admin-referral.js, dashboard.js, referral-unified.js | ポイント残高 |
| `fraud_flags` | admin-referral.js | 不正フラグ |
| `ip_registration_stats` | admin-referral.js | IP別登録統計 |
| `v_referral_history` | referral-unified.js | 紹介履歴ビュー |
| `invite_history` | referral-landing.js | 招待履歴 |

#### 通知・メッセージ

| テーブル | 主な参照元 | 用途 |
|---------|-----------|------|
| `notifications` | notifications-unified.js, notifications-realtime-unified.js, connections-manager-simple.js, user-dropdown-handler.js, matching-unified.js, timerex-webhook | 通知 |
| `messages` | dashboard-data.js, dashboard-message-calculator.js, dashboard-realtime-calculator.js, message-integration.js | メッセージ |

#### ダッシュボード・分析

| テーブル | 主な参照元 | 用途 |
|---------|-----------|------|
| `dashboard_stats` | dashboard-data.js, dashboard-member-counter.js, dashboard-realtime-calculator.js | 集計統計 |
| `user_activities` | dashboard-data.js, dashboard-bundle.js, activities.js, dashboard-event-participation.js, dashboard-matching-calculator.js | アクティビティ |
| `activities` | activity-event-filter.js, dashboard-charts.js, matching-unified.js | アクティビティ(別参照) |
| `member_growth_stats` | dashboard-charts.js | メンバー成長統計 |
| `event_stats` | dashboard-charts.js | イベント統計 |
| `industry_distribution` | dashboard-charts.js | 業種分布 |
| `search_history` | advanced-search.js | 検索履歴 |
| `share_activities` | share-modal-handler.js | 共有アクティビティ |

#### 面談・録画

| テーブル | 主な参照元 | 用途 |
|---------|-----------|------|
| `bookings` | timerex-webhook/index.ts | TimeRex予約 |
| `booking_intents` | calendly-booking.js, google-calendar-booking.js | 予約インテント |
| `booking_sessions` | timerex-booking/index.ts | 予約セッション |
| `meeting_minutes` | profile-detail-modal.js | 議事録 |
| `meeting_confirmations` | manual-meeting-confirmation.js | 面談確認 |
| `meeting_analysis` | tldv-api-integration.js | 面談分析 |
| `tldv_meeting_records` | tldv-api-integration.js, manual-meeting-confirmation.js, tldv-webhook | tldv録画記録 |

### 9.2 RPC関数 (実使用のみ)

| 関数名 | 呼び出し元 | 用途 |
|--------|-----------|------|
| `deduct_user_points` | cashout-modal.js | ポイント消費 |
| `process_referral_reward` | tldv-api-integration.js, manual-meeting-confirmation.js, tldv-webhook | 紹介報酬処理 |
| `get_top_referrers` | admin-referral.js | トップ紹介者取得 |
| `get_referral_analytics` | admin-referral.js | 紹介分析データ |
| `add_user_points` | admin-referral.js | ポイント付与(管理) |
| `add_referral_points` | referral-tracking.js, timerex-webhook | 紹介ポイント付与 |

### 9.3 Realtimeチャネル (14チャネル)

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

### 9.4 Row Level Security (RLS)

全テーブルでRLS有効。基本方針:

```
SELECT: 認証ユーザーは公開データを閲覧可能
INSERT: 自分のデータのみ作成可能
UPDATE: 自分のデータのみ更新可能 (auth.uid() = user_id)
DELETE: 自分のデータのみ、または管理者のみ
管理操作: service_role キーによるバイパス
```

### 9.5 ストレージ

コードベース上、`supabase.storage.from()` の呼び出しは確認されていない。プロフィール画像は `profile-image-upload.js` で処理されるが、ストレージの具体的な実装詳細はHTML内インラインまたは別メカニズムの可能性がある。

---

## 10. 認証・認可

### 10.1 メール/パスワード認証

```
login.html
  └── supabase-unified.js: handleEmailLogin()
       └── supabaseClient.auth.signInWithPassword()
            └── 成功: localStorage保存 → dashboard.html
            └── 失敗: エラー表示 (5秒で自動消去)
```

### 10.2 LINE Login OAuth 2.0

```
1. login.html → handleLineLogin()
   ├── CSRF state生成 → sessionStorage保存
   └── LINE認証画面へリダイレクト
        scope: profile, openid, email

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

### 10.3 ゲストモード

`guest-mode-manager.js` + `guest-login-handler.js` がゲストアクセスを提供。
login.html で使用。

### 10.4 ページアクセス制御

```javascript
// supabase-unified.js: checkAuthStatus()
公開ページ (認証不要):
  index.html, login.html, register.html,
  forgot-password.html, line-callback.html, invite.html

保護ページ (認証必須):
  dashboard, members, events, messages,
  matching, profile, referral, notifications, settings

未認証 + 保護ページ → login.html (リダイレクト先をsessionStorageに保存)
認証済み + login.html → dashboard.html (またはsessionStorage保存先)
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
| データフロー | 予約作成 → 面談完了 → 紹介ポイント自動付与 (1,000pt) |

### 11.3 tldv.io

| 項目 | 説明 |
|------|------|
| 用途 | 面談の録画・文字起こし |
| 連携方式 | Webhook + REST API |
| Edge Function | `tldv-webhook` |
| データフロー | 録画完了 → tldv_meeting_records保存 → 紹介報酬処理トリガー |

### 11.4 データフロー全体

```
[紹介者] → invite_links作成
              │
[被紹介者] → /invite/{code} → referral_clicks記録
              │
              ├── 会員登録 → invitations INSERT
              │
              ├── TimeRex予約
              │     └── booking.created webhook
              │           └── bookings INSERT
              │           └── 紹介者に通知
              │
              ├── 面談実施 + tldv録画
              │     └── tldv-webhook
              │           └── tldv_meeting_records INSERT
              │           └── process_referral_reward RPC
              │
              └── 面談完了
                    └── booking.completed webhook
                          └── add_referral_points RPC (1,000pt)
                          └── ポイント獲得通知

[紹介者] → キャッシュアウト申請 (3,000pt以上)
              └── cashout_requests INSERT
              └── 管理者レビュー → 承認 → 処理 → 完了
```

---

## 12. セキュリティ設計

### 12.1 多層防御

| レイヤー | 実装 |
|---------|------|
| HTTPヘッダー | `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `X-Content-Type-Options: nosniff` (netlify.toml) |
| 認証 | Supabase Auth (JWT, 3600秒有効期限) + LINE OAuth 2.0 |
| CSRF防御 | stateパラメータ + `crypto.timingSafeEqual` による検証 (security.js) |
| データアクセス | 全テーブルRLS有効、service_role / anon_key 分離 |
| 入力検証 | XSSエスケープ (`escapeHtml`), JSON構造検証, リダイレクトURL検証 |
| レート制限 | 10リクエスト/分/IP (メモリ内カウンター, security.js) |
| Webhook検証 | HMAC SHA256署名検証 (timerex-webhook) |
| 不正検知 | IP/デバイス重複検出, fraud_score算出, 手動検証フロー |
| DOM安全 | safe-dom-utils.js (`safeSetHTML`, `safeSetText`, `safeSetAttribute`) |

### 12.2 セキュリティユーティリティ (security.js)

| 関数 | 用途 |
|------|------|
| `generateState()` | `crypto.randomBytes(32)` でCSRFトークン生成 |
| `validateState()` | `crypto.timingSafeEqual` でタイミングセーフ検証 |
| `validateRequest()` | Content-Type検証, JSON解析, 必須フィールド検査 |
| `getClientIP()` | `x-nf-client-connection-ip` / `x-forwarded-for` からIP取得 |
| `checkRateLimit()` | Mapベースのスライディングウィンドウ (10req/min, 1000エントリ上限) |
| `isValidRedirectURL()` | プロトコル + ドメインホワイトリスト検証 |
| `escapeHtml()` | `& < > " '` の5文字エスケープ |

---

## 13. リアルタイム通信

### アーキテクチャ

```
Supabase Realtime (WebSocket)
  │
  ├── postgres_changes (テーブル変更検知)
  │     └── INSERT / UPDATE / DELETE イベント
  │     └── filter: user_id=eq.{currentUserId} 等
  │
  └── クライアント側ハンドラ
        ├── UIの即時更新 (通知バッジ、リスト等)
        ├── トースト通知表示
        └── 統計値の再計算
```

### 購読管理

- **購読開始**: 各モジュールの初期化時 (`supabaseReady` イベント後)
- **再接続**: Supabase SDK の自動再接続機能
- **購読解除**: `cleanup-manager.js` でページ遷移時にクリーンアップ
- **重複防止**: `event-listener-manager.js` でリスナー重複登録を防止

---

## 14. デプロイメント・CI/CD

### パイプライン

```
git push origin main
  │
  ▼
GitHub Actions (.github/workflows/deploy.yml)
  ├── Ubuntu latest, Node.js 18
  ├── npm install --prefix netlify/functions
  └── nwtgck/actions-netlify@v2
       ├── publish-dir: . (ルートディレクトリ)
       ├── production-branch: main
       └── esbuild でFunctionバンドル
  │
  ▼
Netlify CDN
  └── https://interconnect-auto-test.netlify.app
```

### Netlify設定 (netlify.toml)

```toml
[build]
  publish = "."
  command = "npm install --prefix netlify/functions"

[build.environment]
  NODE_VERSION = "18"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```

### リダイレクトルール

| From | To | Status | 用途 |
|------|----|--------|------|
| `/invite/*` | `/index.html` | 200 | 紹介リンクSPAルーティング |
| `/api/timerex-webhook` | Supabase Edge Function | 200 | TimeRexプロキシ |
| `/api/timerex-booking` | Supabase Edge Function | 200 | 予約APIプロキシ |

### 環境変数

| 変数 | 管理場所 | 用途 |
|------|---------|------|
| `SUPABASE_URL` | Netlify | SupabaseプロジェクトURL |
| `SUPABASE_ANON_KEY` | フロントエンド (JS内ハードコード) | Supabase匿名キー |
| `SUPABASE_SERVICE_KEY` | Netlify Functions環境変数 | 管理用キー |
| `LINE_CHANNEL_ID` | Netlify / フロントエンド | LINE Login |
| `LINE_CHANNEL_SECRET` | Netlify Functions環境変数 | LINE Login (秘密) |
| `TIMEREX_WEBHOOK_SECRET` | Supabase Edge Function環境変数 | Webhook署名検証 |

---

## 15. 主要業務フロー

### 15.1 新規会員登録 (紹介経由)

```
1. /invite/{code} アクセス
2. index.html で referral-landing.js がコード検出
3. register.html → registration-flow.js (ステップ形式)
4. register-with-invite.js が invite_links 検証
5. Supabase Auth でユーザー作成
6. user_profiles, invitations テーブル更新
7. dashboard.html へリダイレクト
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
5. 管理者 → admin-referral.js でレビュー
6. 承認 → processing → completed
```
