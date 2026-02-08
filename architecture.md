# INTERCONNECT システムアーキテクチャ

> エグゼクティブ向けビジネスマッチングプラットフォームの詳細設計ドキュメント

---

## 目次

1. [システム概要](#1-システム概要)
2. [技術スタック](#2-技術スタック)
3. [ディレクトリ構造](#3-ディレクトリ構造)
4. [アーキテクチャ全体図](#4-アーキテクチャ全体図)
5. [フロントエンド設計](#5-フロントエンド設計)
6. [バックエンド設計](#6-バックエンド設計)
7. [データベース設計](#7-データベース設計)
8. [認証・認可](#8-認証認可)
9. [外部サービス連携](#9-外部サービス連携)
10. [API設計](#10-api設計)
11. [セキュリティ設計](#11-セキュリティ設計)
12. [デプロイメント・CI/CD](#12-デプロイメントcicd)
13. [リアルタイム通信](#13-リアルタイム通信)
14. [主要機能別アーキテクチャ](#14-主要機能別アーキテクチャ)

---

## 1. システム概要

INTERCONNECTは、起業家・経営者を対象としたビジネスマッチングプラットフォームです。メンバー同士のマッチング、イベント管理、紹介報酬システム、リアルタイム通知などを提供し、ビジネスコミュニティの形成を支援します。

### 設計思想

- **JAMstack アーキテクチャ**: 静的HTMLフロントエンド + サーバレスAPI + マネージドDB
- **BaaS中心**: Supabaseをバックエンド基盤として活用し、インフラ管理を最小化
- **モジュラーJS設計**: フレームワーク非依存のVanilla JavaScriptをモジュール単位で構成
- **リアルタイム志向**: Supabase RealtimeによるWebSocket通信でライブデータ同期

---

## 2. 技術スタック

| レイヤー | 技術 | バージョン | 用途 |
|---------|------|-----------|------|
| ホスティング | Netlify | - | 静的サイト配信、サーバレス関数 |
| データベース | PostgreSQL (Supabase) | 15+ | データ永続化、RLS |
| サーバレス関数 | Netlify Functions (Node.js) | 18 | LINE OAuth処理 |
| Edge Functions | Supabase Edge Functions (Deno) | 1.40+ | Webhook処理、予約API |
| 認証 | Supabase Auth | - | メール/パスワード、LINE OAuth 2.0 |
| リアルタイム | Supabase Realtime | - | WebSocket通知 |
| ストレージ | Supabase Storage | - | アバター、画像 (上限52MB) |
| フロントエンド | Vanilla JavaScript (ES6+) | - | UIロジック |
| スタイリング | CSS (カスタム) | - | レスポンシブデザイン |
| チャート | Chart.js | 4.4.0 | ダッシュボード可視化 |
| アイコン | Font Awesome | 6.0 | UIアイコン |
| フォント | Google Fonts | - | Inter, Noto Sans JP |
| CI/CD | GitHub Actions | - | 自動デプロイ |
| パッケージ管理 | npm | 9+ | 依存関係管理 |

### 主要依存ライブラリ

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

---

## 3. ディレクトリ構造

```
interconnect-system/
│
├── .github/workflows/          # CI/CDパイプライン
│   └── deploy.yml              #   Netlify自動デプロイ
│
├── supabase/                   # Supabaseバックエンド
│   ├── functions/              #   Edge Functions (TypeScript/Deno)
│   │   ├── timerex-webhook/    #     TimeRex Webhook受信
│   │   ├── timerex-booking/    #     予約セッション作成
│   │   └── tldv-webhook/       #     会議録画Webhook受信
│   ├── migrations/             #   DBマイグレーション
│   ├── config.toml             #   ローカル開発設定
│   └── seed.sql                #   初期データ
│
├── netlify/                    # Netlify Functions (Node.js)
│   └── functions/
│       ├── line-auth-simple-v4.js    # LINE Login OAuth処理
│       ├── test-env.js               # 環境変数テスト
│       └── utils/
│           ├── security.js           # セキュリティユーティリティ
│           └── error-handler.js      # エラーハンドリング
│
├── js/                         # クライアントサイドJavaScript (135ファイル)
│   ├── [コアモジュール]
│   │   ├── interconnect-core.js      # グローバル名前空間
│   │   ├── supabase-unified.js       # Supabase初期化
│   │   ├── auth-enhanced.js          # 認証強化
│   │   └── common.js                 # 共通ユーティリティ
│   ├── [ダッシュボード] (15+ファイル)
│   │   ├── dashboard-bundle.js       # バンドル管理
│   │   ├── dashboard-stats-initializer.js
│   │   ├── dashboard-charts.js
│   │   └── ...
│   ├── [機能モジュール]
│   │   ├── connections-manager-simple.js  # マッチング
│   │   ├── events-supabase.js             # イベント
│   │   ├── notification-system-unified.js # 通知
│   │   ├── admin-referral.js              # 紹介管理
│   │   └── ...
│   └── [ユーティリティ]
│       ├── toast-unified.js          # トースト通知UI
│       ├── performance-monitor.js    # パフォーマンス監視
│       ├── cleanup-manager.js        # メモリリーク防止
│       └── event-listener-manager.js # イベントリスナー管理
│
├── css/                        # スタイルシート (83ファイル)
│   ├── style.css               # メインスタイル
│   ├── dashboard.css           # ダッシュボード
│   ├── auth-unified.css        # 認証画面
│   ├── responsive-*.css        # レスポンシブ対応
│   └── z-index-priority.css    # Z-index管理
│
├── sql/                        # SQLマイグレーション・フィクスチャ (80+ファイル)
│   ├── referral-system-schema.sql
│   ├── create-matching-tables.sql
│   ├── fraud-detection-system.sql
│   └── ...
│
├── config/
│   └── admin-config.json       # 管理画面設定
│
├── includes/                   # HTMLパーシャル
│   ├── header-right-unified.html
│   └── security-meta.html
│
├── assets/                     # 静的アセット（画像等）
│
├── [HTMLページ] (37ファイル)
│   ├── index.html              # ランディングページ
│   ├── login.html / register.html
│   ├── dashboard.html          # メインダッシュボード
│   ├── matching.html / connections.html
│   ├── events.html / members.html
│   ├── profile.html / messages.html
│   ├── admin.html / super-admin.html
│   ├── referral.html / billing.html
│   └── ...
│
├── netlify.toml                # Netlify設定
├── package.json                # プロジェクト設定
└── .env                        # 環境変数（本番はNetlify管理）
```

---

## 4. アーキテクチャ全体図

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          クライアント (ブラウザ)                           │
│                                                                         │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ HTML Pages │  │ JavaScript   │  │ CSS          │  │ Assets        │  │
│  │ (37 files) │  │ (135 files)  │  │ (83 files)   │  │ (images etc.) │  │
│  └─────┬─────┘  └──────┬───────┘  └──────────────┘  └───────────────┘  │
│        │               │                                                │
│        │    ┌──────────┴──────────────┐                                 │
│        │    │   INTERCONNECT Core     │                                 │
│        │    │   (グローバル名前空間)    │                                 │
│        │    └──────────┬──────────────┘                                 │
│        │               │                                                │
│        │    ┌──────────┴──────────────┐                                 │
│        │    │  supabase-unified.js    │                                 │
│        │    │  (Supabaseクライアント)  │                                 │
│        │    └──────────┬──────────────┘                                 │
│        │               │                                                │
└────────┼───────────────┼────────────────────────────────────────────────┘
         │               │
         │     ┌─────────┴─────────┐
         │     │    REST API       │  ← HTTPS
         │     │    Realtime WS    │  ← WebSocket
         │     └─────────┬─────────┘
         │               │
┌────────┼───────────────┼────────────────────────────────────────────────┐
│        ▼               ▼                                                │
│  ┌─────────────────────────────────────────┐                           │
│  │          Supabase Cloud                 │                           │
│  │                                          │                           │
│  │  ┌────────────┐  ┌────────────────────┐ │  ┌─────────────────────┐ │
│  │  │ PostgreSQL │  │ Edge Functions     │ │  │ Supabase Auth       │ │
│  │  │ (20+ tables│  │ ├─ timerex-webhook │ │  │ ├─ Email/Password   │ │
│  │  │  + RLS)    │  │ ├─ timerex-booking │ │  │ ├─ Session管理      │ │
│  │  │            │  │ └─ tldv-webhook    │ │  │ └─ JWT発行          │ │
│  │  └────────────┘  └────────────────────┘ │  └─────────────────────┘ │
│  │                                          │                           │
│  │  ┌────────────────┐  ┌───────────────┐  │                           │
│  │  │ Realtime       │  │ Storage       │  │                           │
│  │  │ (WebSocket)    │  │ (52MB limit)  │  │                           │
│  │  └────────────────┘  └───────────────┘  │                           │
│  └─────────────────────────────────────────┘                           │
│                                                                         │
│  ┌─────────────────────────────────────────┐                           │
│  │          Netlify                         │                           │
│  │                                          │                           │
│  │  ┌──────────────┐  ┌─────────────────┐  │                           │
│  │  │ Static CDN   │  │ Functions       │  │                           │
│  │  │ (HTML/JS/CSS)│  │ ├─ line-auth    │  │                           │
│  │  │              │  │ └─ test-env     │  │                           │
│  │  └──────────────┘  └─────────────────┘  │                           │
│  └─────────────────────────────────────────┘                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────────┐    ┌─────────────────────────────────┐
│ LINE Platform       │    │ 外部サービス                      │
│ ├─ OAuth 2.0認証     │    │ ├─ TimeRex (予約管理)            │
│ ├─ プロフィール取得    │    │ ├─ tldv.io (会議録画)           │
│ └─ Channel連携       │    │ └─ Chart.js / Font Awesome等    │
└─────────────────────┘    └─────────────────────────────────┘
```

---

## 5. フロントエンド設計

### 5.1 初期化フロー

各HTMLページは以下の順序でJavaScriptを読み込み、初期化します。

```
1. interconnect-core.js
   └─ window.INTERCONNECT グローバル名前空間を作成
   └─ モジュール登録メカニズム (registerModule) を提供
   └─ デバッグモード設定 (?debug=true)

2. supabase-unified.js
   └─ Supabase SDK を CDN から動的読み込み
   └─ window.supabaseClient を初期化
   └─ window.waitForSupabase() Promise を公開
   └─ 認証状態チェック (checkAuthStatus)
   └─ 'supabaseReady' カスタムイベント発火

3. ページ固有モジュール
   └─ dashboard-bundle.js / events-supabase.js / etc.
   └─ waitForSupabase() で初期化待ち合わせ
   └─ データ取得・UI描画

4. ユーティリティモジュール
   └─ notification-system-unified.js
   └─ toast-unified.js
   └─ performance-monitor.js
```

### 5.2 グローバル名前空間

`window.INTERCONNECT` オブジェクトがシステム全体のエントリポイントとして機能します。

```javascript
window.INTERCONNECT = {
    version: '1.0.0',
    initialized: false,
    modules: {},       // 登録済みモジュール
    utils: {},         // ユーティリティ関数
    security: {},      // セキュリティ関連
    config: {
        debug: false,
        apiBaseUrl: window.location.origin,
        sessionTimeout: 30 * 60 * 1000,    // 30分
        maxLoginAttempts: 5,
        lockoutTime: 15 * 60 * 1000        // 15分
    }
};
```

### 5.3 ページ構成

| カテゴリ | ページ | 主要JSモジュール |
|---------|--------|----------------|
| **公開** | `index.html` | `homepage-perfect-final.js`, `hero-simple.js` |
| **認証** | `login.html`, `register.html` | `auth-enhanced.js`, `supabase-unified.js` |
| **コア** | `dashboard.html` | `dashboard-bundle.js` (15+サブモジュール) |
| **コア** | `connections.html` | `connections-manager-simple.js` |
| **コア** | `events.html` | `events-supabase.js` |
| **コア** | `members.html` | `members-view-mode.js` |
| **コア** | `profile.html` | `profile-sync.js`, `avatar-size-enforcer.js` |
| **コア** | `messages.html` | `message-integration.js` |
| **コア** | `matching.html` | `matching.js`, `advanced-search.js` |
| **管理** | `admin.html` | `admin-security.js`, `admin-utils.js` |
| **管理** | `super-admin.html` | `super-admin.js`, `admin-site-settings.js` |
| **紹介** | `referral.html` | `admin-referral.js`, `referral-rls-workaround.js` |
| **課金** | `billing.html` | `cashout-modal.js` |

### 5.4 通知システム

29箇所に分散していた通知実装を `notification-system-unified.js` に統合。

```
通知タイプ: SUCCESS | ERROR | WARNING | INFO
表示位置:   固定(top: 20px, right: 20px)
Z-Index:    999999 (最前面)
自動消去:   3000ms (デフォルト)
XSS対策:   メッセージのHTMLエスケープ処理済み
```

### 5.5 レスポンシブデザイン

CSSはモバイルファースト設計で、`responsive-*.css` ファイル群がブレークポイントごとのレイアウト調整を担当。ダークモードは `admin-config.json` の `darkMode: "auto"` 設定により、OSのカラースキーム設定に自動追従します。

---

## 6. バックエンド設計

### 6.1 サーバレス関数アーキテクチャ

バックエンドは2種類のサーバレス関数で構成されます。

#### Netlify Functions (Node.js 18)

LINE Login のOAuth処理など、外部APIとの秘密情報を扱う処理を担当。

| 関数 | パス | 用途 |
|-----|------|------|
| `line-auth-simple-v4` | `/.netlify/functions/line-auth-simple-v4` | LINE OAuth認証フロー |
| `test-env` | `/.netlify/functions/test-env` | 環境変数テスト |

#### Supabase Edge Functions (Deno/TypeScript)

Webhook受信やAPIプロキシなど、データベースとの密結合が必要な処理を担当。

| 関数 | パス | 用途 |
|-----|------|------|
| `timerex-webhook` | `/api/timerex-webhook` | TimeRex予約イベント受信 |
| `timerex-booking` | `/api/timerex-booking` | 予約セッション作成 |
| `tldv-webhook` | `/api/tldv-webhook` | 会議録画イベント受信 |

### 6.2 Webhook処理フロー (TimeRex)

```
TimeRex
  │
  ├─ booking.created ──→ bookingsテーブルにINSERT
  │                       → 紹介コードがあれば紹介者に通知
  │
  ├─ booking.completed ─→ bookingsステータスを'completed'に更新
  │                       → 紹介ポイント付与 (1,000pt)
  │                       → ポイント付与通知を作成
  │
  └─ booking.cancelled ─→ bookingsステータスを'cancelled'に更新
```

署名検証: HMAC SHA256 (`X-TimeRex-Signature` ヘッダー)

### 6.3 Supabase REST API (自動生成)

全テーブルに対して自動的にREST APIが生成されます。クライアントからは `@supabase/supabase-js` SDKを経由してアクセスします。

```
ベースURL: https://whyoqhhzwtlxprhizmor.supabase.co/rest/v1/
認証:      Authorization: Bearer <jwt_token>
           apikey: <anon_key>
```

---

## 7. データベース設計

### 7.1 ER図概要

```
auth.users (Supabase管理)
    │
    ├──1:1──→ profiles (公開プロフィール)
    ├──1:1──→ users (詳細ビジネス情報)
    ├──1:1──→ user_points (ポイント残高)
    │
    ├──1:N──→ match_requests (マッチングリクエスト)
    ├──N:M──→ match_connections (確立されたコネクション)
    ├──1:N──→ profile_views (プロフィール閲覧履歴)
    ├──1:N──→ bookmarks (ブックマーク)
    │
    ├──1:N──→ events (作成イベント)
    ├──N:M──→ event_participants (イベント参加)
    │
    ├──1:N──→ invitations (紹介)
    ├──1:N──→ invite_links (紹介リンク)
    ├──1:N──→ cashout_requests (キャッシュアウト)
    │
    ├──1:N──→ notifications (通知)
    ├──1:N──→ booking_sessions (予約)
    └──1:N──→ meeting_minutes (議事録)
```

### 7.2 テーブル定義

#### ユーザー管理

**`profiles`** - 公開プロフィール
| カラム | 型 | 説明 |
|-------|-----|------|
| id | UUID (PK) | auth.usersへのFK |
| username | TEXT (UNIQUE) | ユーザー名 |
| full_name | TEXT | 氏名 |
| avatar_url | TEXT | アバター画像URL |
| bio | TEXT | 自己紹介 |
| website | TEXT | Webサイト |
| created_at / updated_at | TIMESTAMPTZ | タイムスタンプ |

**`users`** - ビジネス情報
| カラム | 型 | 説明 |
|-------|-----|------|
| id | UUID (PK) | auth.usersへのFK |
| email | TEXT (UNIQUE) | メールアドレス |
| name / company / position | TEXT | 基本情報 |
| line_id / line_user_id | TEXT | LINE連携情報 |
| industry / employee_count / annual_revenue | TEXT | 企業情報 |
| challenges / interests | JSONB | 課題・関心事 |

#### マッチング

**`match_requests`** - マッチングリクエスト
| カラム | 型 | 説明 |
|-------|-----|------|
| id | UUID (PK) | |
| requester_id / recipient_id | UUID (FK) | リクエスト元/先 |
| status | TEXT | pending / accepted / rejected / cancelled |
| message | TEXT | メッセージ |

**`match_connections`** - 確立されたコネクション
| カラム | 型 | 説明 |
|-------|-----|------|
| id | UUID (PK) | |
| user1_id / user2_id | UUID (FK) | ユニークペア |
| match_score | NUMERIC (0-1) | マッチングスコア |
| match_reasons | JSONB | マッチ理由 |

**`profile_views`** - プロフィール閲覧
| カラム | 型 | 説明 |
|-------|-----|------|
| viewer_id / viewed_user_id | UUID (FK) | 閲覧者/被閲覧者 |
| view_duration | INTEGER | 閲覧時間(秒) |
| source | TEXT | matching / search / direct |

#### イベント管理

**`events`** - イベント
| カラム | 型 | 説明 |
|-------|-----|------|
| id | UUID (PK) | |
| user_id | UUID (FK) | 作成者 |
| title / description | TEXT | タイトル/説明 |
| start_time / end_time | TIMESTAMPTZ | 開催期間 |
| location / status | TEXT | 場所/ステータス |
| image_url | TEXT | イベント画像 |

**`event_participants`** - イベント参加者
| カラム | 型 | 説明 |
|-------|-----|------|
| event_id / user_id | UUID (FK) | 複合キー |
| status | TEXT | attending / interested / declined |

#### 紹介・報酬システム

**`invitations`** - 紹介トラッキング
| カラム | 型 | 説明 |
|-------|-----|------|
| id | UUID (PK) | |
| inviter_id / invitee_id | UUID (FK) | 紹介者/被紹介者 |
| invite_code | TEXT (UNIQUE) | 紹介コード |
| status | TEXT | pending / registered / completed |
| reward_points | INTEGER (default: 1000) | 報酬ポイント |
| reward_status | TEXT | pending / earned / cancelled |
| fraud_score | NUMERIC (0-1) | 不正スコア |

**`invite_links`** - 紹介リンク
| カラム | 型 | 説明 |
|-------|-----|------|
| id | UUID (PK) | |
| created_by | UUID (FK) | 作成者 |
| link_code | TEXT (UNIQUE) | リンクコード |
| is_active | BOOLEAN | 有効フラグ |
| registration_count / completion_count | INTEGER | カウンター |
| total_rewards_earned | INTEGER | 累計報酬 |
| campaign_code | TEXT | キャンペーンコード |
| metadata | JSONB | メタデータ |

**`referral_details`** - 不正検知データ
| カラム | 型 | 説明 |
|-------|-----|------|
| referrer/referred IP | INET | IPアドレス |
| referrer/referred device_id | TEXT | デバイスID |
| same_device_flag / same_network_flag | BOOLEAN | 同一端末/ネットワークフラグ |
| fraud_score | NUMERIC (0-1) | 不正スコア |
| fraud_reasons | JSONB | 不正理由 |
| verification_status | TEXT | pending / verified / rejected |

**`referral_clicks`** - クリックトラッキング
| カラム | 型 | 説明 |
|-------|-----|------|
| referral_code | TEXT | 紹介コード |
| ip_address | INET | IPアドレス |
| user_agent / referrer / landing_url | TEXT | トラッキング情報 |

#### キャッシュアウト

**`cashout_requests`** - キャッシュアウト申請
| カラム | 型 | 説明 |
|-------|-----|------|
| id | UUID (PK) | |
| user_id | UUID (FK) | 申請者 |
| request_number | TEXT (UNIQUE) | 申請番号 |
| points_amount | INTEGER (min: 3000) | ポイント数 |
| cash_amount / tax_amount / net_amount | NUMERIC | 金額 |
| bank_details | JSONB | 銀行情報 |
| tax_info | JSONB | 税務情報 |
| status | TEXT | pending → reviewing → approved → processing → completed |
| reviewed_by / processed_by | UUID (FK) | 処理者 |
| rejection_reason / cancellation_reason | TEXT | 理由 |

**`user_points`** - ポイント残高
| カラム | 型 | 説明 |
|-------|-----|------|
| user_id | UUID (FK) | ユーザー |
| referral_points_earned / referral_points_spent | INTEGER | 取得/消費 |
| current_balance | INTEGER | 現在残高 |

#### 通知・コミュニケーション

**`notifications`** - 通知
| カラム | 型 | 説明 |
|-------|-----|------|
| id | UUID (PK) | |
| user_id | UUID (FK) | 対象ユーザー |
| title / message | TEXT | 通知内容 |
| type | TEXT | info / success / error / warning / points_awarded |
| read | BOOLEAN | 既読フラグ |
| data | JSONB | 付加データ |

#### 予約・面談

**`booking_sessions`** - 予約セッション
| カラム | 型 | 説明 |
|-------|-----|------|
| session_id | TEXT (UNIQUE) | セッション識別子 |
| user_id / user_email | TEXT | ユーザー情報 |
| referral_code | TEXT | 紹介コード |
| status | TEXT | pending / completed / cancelled |
| session_data | JSONB | TimeRexレスポンスデータ |

**`meeting_minutes`** - 議事録
| カラム | 型 | 説明 |
|-------|-----|------|
| id | UUID (PK) | |
| user_id | UUID (FK) | ユーザー |
| duration_minutes | INTEGER | 面談時間 |
| key_points | JSONB | 要点 |
| referral_processed | BOOLEAN | 紹介処理済みフラグ |
| referral_invitation_id | UUID (FK) | 紹介ID |

### 7.3 Row Level Security (RLS)

全テーブルでRLSが有効化されており、以下のポリシーが適用されます。

```sql
-- 基本パターン例
-- 読み取り: 全ユーザーが公開プロフィールを閲覧可能
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

-- 更新: 自分のデータのみ更新可能
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- 管理操作: service_role キーのみ
CREATE POLICY "Service role can manage referrals"
  ON invitations FOR ALL USING (auth.role() = 'service_role');
```

---

## 8. 認証・認可

### 8.1 認証フロー

システムは2つの認証方式をサポートします。

#### メール/パスワード認証

```
ブラウザ → supabase-unified.js → Supabase Auth API
         signInWithPassword()      → JWT発行
                                   → localStorage保存
                                   → dashboard.html へリダイレクト
```

#### LINE Login OAuth 2.0

```
1. ブラウザ
   └─ handleLineLogin()
   └─ CSRFトークン (state) 生成・sessionStorageに保存
   └─ LINE認証画面 (access.line.me) へリダイレクト

2. LINE認証画面
   └─ ユーザー認証・同意
   └─ line-callback.html へリダイレクト (code + state)

3. line-callback.html
   └─ state検証 (CSRF対策)
   └─ Netlify Function (line-auth-simple-v4) 呼び出し

4. Netlify Function (サーバサイド)
   └─ LINE Token API で access_token 取得
   └─ LINE Profile API でユーザー情報取得
   └─ Supabase Admin API でユーザー作成/更新
   └─ メールアドレス生成: line_{userId}@interconnect.com
   └─ 認証結果をクライアントに返却

5. ブラウザ
   └─ dashboard.html へリダイレクト
```

### 8.2 セッション管理

- **JWT有効期限**: 3600秒 (1時間)
- **自動リフレッシュ**: `autoRefreshToken: true`
- **永続化**: `persistSession: true` (localStorage)
- **セッションタイムアウト**: 30分 (INTERCONNECT config)

### 8.3 ページアクセス制御

```javascript
// 公開ページ（認証不要）
const publicPages = [
  'index.html', 'login.html', 'register.html',
  'forgot-password.html', 'line-callback.html', 'invite.html'
];

// 保護ページ（認証必須）
const protectedPages = [
  'dashboard', 'members', 'events', 'messages',
  'matching', 'profile', 'referral', 'notifications', 'settings'
];

// 未認証で保護ページにアクセス → login.html へリダイレクト
// リダイレクト先は sessionStorage に保存され、ログイン後に復帰
```

---

## 9. 外部サービス連携

### 9.1 LINE Platform

| 項目 | 値 |
|------|-----|
| プロトコル | OAuth 2.0 Authorization Code Flow |
| Channel ID | 2007688781 |
| スコープ | profile, openid, email |
| コールバック | `/line-callback.html` |

### 9.2 TimeRex (予約管理)

| 項目 | 説明 |
|------|------|
| 用途 | 無料相談の予約管理 |
| 連携方式 | Webhook (booking.created/completed/cancelled) |
| 署名検証 | HMAC SHA256 (`X-TimeRex-Signature`) |
| API | 予約セッション作成 (`timerex-booking` Edge Function) |
| データフロー | 予約 → 面談完了 → 紹介ポイント自動付与 |

### 9.3 tldv.io (会議録画)

| 項目 | 説明 |
|------|------|
| 用途 | 面談録画・文字起こし |
| 連携方式 | Webhook (録画完了イベント) |
| データフロー | 録画完了 → meeting_minutes保存 → 不正検知トリガー |

### 9.4 連携データフロー

```
[TimeRex予約] ──webhook──→ [timerex-webhook Edge Function]
                                    │
                              booking.created
                                    │
                              ┌─────┴─────┐
                              │ bookings   │ INSERT
                              │ table      │
                              └─────┬─────┘
                                    │
                              紹介コードあり?
                                    │ Yes
                              ┌─────┴──────┐
                              │notifications│ INSERT (紹介者へ)
                              │ table       │
                              └────────────┘

[面談完了] ──webhook──→ booking.completed
                              │
                        ┌─────┴─────┐
                        │ bookings   │ UPDATE (status='completed')
                        └─────┬─────┘
                              │
                        紹介コードあり?
                              │ Yes
                        ┌─────┴──────────┐
                        │ add_referral_   │ RPC (1,000pt付与)
                        │ points()        │
                        └─────┬──────────┘
                              │
                        ┌─────┴──────┐
                        │notifications│ INSERT (ポイント獲得通知)
                        └────────────┘
```

---

## 10. API設計

### 10.1 Netlify Functions

#### POST `/.netlify/functions/line-auth-simple-v4`

LINE OAuthの認証コードを受け取り、Supabaseユーザーを作成/更新する。

```
Request:
  POST /.netlify/functions/line-auth-simple-v4
  Content-Type: application/json
  Body: { "code": "auth_code", "redirect_uri": "https://..." }

Response (成功):
  200 OK
  {
    "success": true,
    "user": {
      "id": "uuid",
      "email": "line_{userId}@interconnect.com",
      "display_name": "LINE表示名",
      "picture_url": "https://...",
      "line_user_id": "U...",
      "is_new_user": true|false
    },
    "redirect_to": "dashboard.html"
  }

Response (エラー):
  400 Bad Request  - パラメータ不足、LINEトークン取得失敗
  500 Server Error - サーバ設定エラー、DB操作エラー
```

### 10.2 Supabase Edge Functions

#### POST `/api/timerex-webhook`

TimeRexからのWebhookイベントを受信・処理する。

```
Request:
  POST /api/timerex-webhook
  X-TimeRex-Signature: sha256={hmac}
  Body: { "type": "booking.created|completed|cancelled", "data": {...} }

Response:
  200 OK { "success": true }
  401 Unauthorized (署名検証失敗)
  500 Internal Server Error
```

#### POST `/api/timerex-booking`

予約セッションを作成し、TimeRex埋め込みURLを返す。

```
Request:
  POST /api/timerex-booking
  Body: { "referralCode": "...", "userId": "...", "userEmail": "...", "userName": "..." }

Response:
  200 OK { "success": true, "sessionId": "...", "bookingUrl": "...", "embedUrl": "..." }
```

### 10.3 Supabase REST API (クライアント直接アクセス)

全テーブルに対するCRUD操作はSupabase JSクライアント経由で実行。RLSにより認可を制御。

```javascript
// 読み取り例
const { data } = await supabaseClient
  .from('profiles')
  .select('*')
  .eq('id', userId);

// 書き込み例
const { data, error } = await supabaseClient
  .from('match_requests')
  .insert({ requester_id: userId, recipient_id: targetId, status: 'pending' });

// リアルタイム購読例
supabaseClient
  .channel('notifications')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
    (payload) => showToast(payload.new.message, 'info')
  )
  .subscribe();
```

---

## 11. セキュリティ設計

### 11.1 多層防御

```
┌─────────────────────────────────┐
│ レイヤー 1: HTTPヘッダー         │
│ ├─ X-Frame-Options: DENY       │
│ ├─ X-XSS-Protection: 1         │
│ └─ X-Content-Type-Options: nosniff │
├─────────────────────────────────┤
│ レイヤー 2: 認証・認可           │
│ ├─ Supabase Auth (JWT)         │
│ ├─ LINE OAuth 2.0              │
│ └─ CSRF対策 (stateパラメータ)   │
├─────────────────────────────────┤
│ レイヤー 3: データアクセス制御    │
│ ├─ Row Level Security (RLS)    │
│ └─ service_role / anon_key分離  │
├─────────────────────────────────┤
│ レイヤー 4: 入力検証             │
│ ├─ XSSエスケープ (escapeHtml)  │
│ ├─ JSON構造検証                │
│ └─ リダイレクトURL検証          │
├─────────────────────────────────┤
│ レイヤー 5: レート制限           │
│ ├─ 10リクエスト/分/IP          │
│ └─ メモリ内カウンター           │
├─────────────────────────────────┤
│ レイヤー 6: Webhook検証         │
│ ├─ HMAC SHA256署名検証         │
│ └─ タイミングセーフ比較         │
├─────────────────────────────────┤
│ レイヤー 7: 不正検知             │
│ ├─ IP/デバイス重複検出          │
│ ├─ 不正スコア (fraud_score)    │
│ └─ 手動検証フロー              │
└─────────────────────────────────┘
```

### 11.2 セキュリティユーティリティ (`netlify/functions/utils/security.js`)

| 関数 | 用途 |
|------|------|
| `generateState()` | CSRF対策用の暗号的ランダム文字列生成 |
| `validateState()` | タイミングセーフなstate検証 (`crypto.timingSafeEqual`) |
| `validateRequest()` | Content-Type検証、JSON解析、必須フィールドチェック |
| `getClientIP()` | Netlifyヘッダーからの実IP取得 |
| `checkRateLimit()` | メモリ内レート制限 (10req/min/IP) |
| `isValidRedirectURL()` | プロトコル・ドメインのホワイトリスト検証 |
| `escapeHtml()` | XSS防止用HTMLエスケープ |

### 11.3 管理画面セキュリティ設定

```json
{
  "security": {
    "sessionTimeout": 3600000,     // 1時間
    "maxLoginAttempts": 3,
    "passwordPolicy": {
      "minLength": 8,
      "requireNumbers": true,
      "requireSymbols": true,
      "requireUppercase": true
    }
  }
}
```

---

## 12. デプロイメント・CI/CD

### 12.1 デプロイメントパイプライン

```
Developer
  │
  └─ git push origin main
       │
       ▼
  GitHub Actions (deploy.yml)
  ┌─────────────────────────────┐
  │ 1. actions/checkout@v4      │
  │ 2. actions/setup-node@v4    │
  │    └─ Node.js 18 + npmキャッシュ │
  │ 3. npm install              │
  │    └─ --prefix netlify/functions │
  │ 4. nwtgck/actions-netlify@v2│
  │    └─ publish-dir: .        │
  │    └─ production-branch: main │
  │ 5. 通知                      │
  └─────────────────────────────┘
       │
       ▼
  Netlify
  ┌─────────────────────────────┐
  │ Static CDN                  │
  │ └─ HTML/JS/CSS/Assets       │
  │                             │
  │ Serverless Functions        │
  │ └─ line-auth-simple-v4.js   │
  │ └─ esbuild バンドラー       │
  └─────────────────────────────┘
       │
       ▼
  https://interconnect-auto-test.netlify.app
```

### 12.2 Netlify設定 (`netlify.toml`)

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

### 12.3 リダイレクトルール

| From | To | Status | 用途 |
|------|----|--------|------|
| `/invite/*` | `/index.html` | 200 | SPA紹介リンクルーティング |
| `/api/timerex-webhook` | Supabase Edge Function | 200 | TimeRex Webhook プロキシ |
| `/api/timerex-booking` | Supabase Edge Function | 200 | 予約API プロキシ |

### 12.4 環境変数

| 変数 | 管理場所 | 用途 |
|------|---------|------|
| `SUPABASE_URL` | Netlify | SupabaseプロジェクトURL |
| `SUPABASE_ANON_KEY` | Netlify | Supabase匿名キー |
| `SUPABASE_SERVICE_KEY` | Netlify | Supabaseサービスキー (管理用) |
| `LINE_CHANNEL_ID` | Netlify | LINE Login チャネルID |
| `LINE_CHANNEL_SECRET` | Netlify | LINE Login チャネルシークレット |
| `TIMEREX_API_KEY` | Supabase | TimeRex APIキー |
| `TIMEREX_WEBHOOK_SECRET` | Supabase | TimeRex Webhook署名シークレット |
| `TLDV_API_KEY` | Supabase | tldv.io APIキー |

---

## 13. リアルタイム通信

### 13.1 Supabase Realtime

WebSocketベースのリアルタイムデータ同期により、ページリロードなしでUIを更新します。

```javascript
// 購読パターン
supabaseClient
  .channel('channel-name')
  .on('postgres_changes', {
    event: 'INSERT',          // INSERT | UPDATE | DELETE | *
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${currentUserId}`
  }, handleNotification)
  .subscribe();
```

### 13.2 主な購読チャネル

| チャネル | テーブル | イベント | UI更新内容 |
|---------|---------|---------|-----------|
| notifications | notifications | INSERT | トースト通知表示 |
| match-requests | match_requests | INSERT/UPDATE | マッチングリクエスト更新 |
| messages | messages | INSERT | 新着メッセージ表示 |
| profiles | profiles | UPDATE | メンバー情報リアルタイム反映 |
| dashboard | 複数テーブル | * | KPI数値リアルタイム更新 |

### 13.3 接続管理

- **自動再接続**: SDKの組み込み機能で自動的にWebSocket再接続
- **メモリリーク防止**: `cleanup-manager.js` が購読解除を管理
- **イベントリスナー管理**: `event-listener-manager.js` で重複登録を防止

---

## 14. 主要機能別アーキテクチャ

### 14.1 ダッシュボード

ダッシュボードは15以上のサブモジュールで構成される最も複雑な画面です。

```
dashboard-bundle.js (オーケストレーター)
├── dashboard-stats-initializer.js    → KPI集計 (ユーザー数, 収益, マッチ率)
├── dashboard-upcoming-events.js      → 直近イベント表示
├── dashboard-event-participation.js  → イベント参加率
├── dashboard-activity-enhancer.js    → アクティビティフィード
├── dashboard-charts.js               → Chart.js チャート描画
├── dashboard-realtime-calculator.js  → リアルタイムKPI更新
└── dashboard-dynamic-calculator.js   → 動的計算処理
```

### 14.2 マッチングシステム

```
[ユーザーA]                    [ユーザーB]
    │                              │
    └─ connections-manager-simple.js │
       │                           │
       ├─ match_requests INSERT ───┤ (status: pending)
       │   (requester_id = A)      │
       │                           │
       │  ← Realtime通知 ─────────┤
       │                           │
       │                           ├─ UPDATE (status: accepted)
       │                           │
       └─ match_connections INSERT─┘ (user1=A, user2=B, score, reasons)
```

### 14.3 紹介・報酬システム

```
[紹介者] ─→ invite_links 作成 (link_code生成)
                │
                ▼
[被紹介者] ─→ /invite/{link_code} でアクセス
                │
                ├─ referral_clicks INSERT (トラッキング)
                │
                ├─ 会員登録 → invitations INSERT (status: registered)
                │
                ├─ TimeRex予約 → booking_sessions INSERT
                │
                ├─ 面談完了 → Webhook → booking.completed
                │               │
                │               ├─ 不正検知 (referral_details)
                │               │   ├─ IP/デバイス重複チェック
                │               │   ├─ 同一ネットワークフラグ
                │               │   └─ fraud_score 算出
                │               │
                │               ├─ (正当な場合) add_referral_points RPC
                │               │   └─ 1,000pt 付与
                │               │
                │               └─ notifications INSERT (ポイント獲得通知)
                │
                └─ キャッシュアウト (3,000pt以上で申請可能)
                    └─ cashout_requests INSERT
                    └─ 管理者レビュー → 承認 → 処理 → 完了
```

### 14.4 管理者機能

```
admin.html (一般管理者)
├── ユーザー管理
├── イベント管理
├── 通知管理
└── 基本アナリティクス

super-admin.html (スーパー管理者)
├── KPIダッシュボード (全統計)
├── サイト設定変更
├── 紹介システム管理
├── キャッシュアウト承認フロー
├── 不正検知レビュー
└── システムログ
```

---

## 補足: パフォーマンス設計

### クライアントサイド最適化

- **遅延読み込み**: `admin-config.json` の `lazyLoading: true`
- **画像最適化**: `optimizeImages: true`
- **キャッシュ**: 5分のデータキャッシュタイムアウト
- **パフォーマンス監視**: `performance-monitor.js` でFCP/LCP/メモリ使用量を計測
- **メモリリーク防止**: `cleanup-manager.js` でイベントリスナー・タイマー・DOM要素を適切に解放

### サーバサイド最適化

- **データベース接続プール**: 最大100接続
- **API結果行数制限**: 最大1,000行/リクエスト
- **圧縮**: `enableCompression: true`
- **CDN配信**: Netlify CDNによる静的ファイルのグローバル配信
- **サーバレスコールドスタート**: esbuildバンドラーによるFunction最適化
