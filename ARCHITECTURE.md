# INTERCONNECT - System Architecture

> 日本語ビジネスコミュニティプラットフォーム
> Last Updated: 2026-02-10 (v15 — 最終版)

---

## 1. 設計原則

```
Frontend : Netlify — 静的ホスティングのみ（HTML/CSS/JS 配信）
Backend  : Supabase — 完結（DB / Auth / Realtime / Storage / Edge Functions）
```

- Netlify にサーバーサイドロジックは置かない
- 全てのバックエンド処理は Supabase 内で完結させる
- データの「読み取り」はクライアントから直接、「書き込み」は可能な限りサーバー側で制御

---

## 2. Tech Stack

| Layer | Technology | 役割 |
|-------|-----------|------|
| Frontend | HTML5 / CSS3 / Vanilla JS | 静的ページ群 |
| Hosting | Netlify | CDN配信・リダイレクト・セキュリティヘッダー |
| Database | Supabase PostgreSQL | データ永続化・RLS認可・DB関数・Trigger |
| Auth | Supabase Auth | Email/Password + LINE OAuth |
| Realtime | Supabase Realtime | WebSocket リアルタイム更新 |
| Storage | Supabase Storage | 画像ファイル |
| Server Logic | Supabase Edge Functions (Deno/TS) | 外部API連携・Webhook |
| Charts | Chart.js 4.4 | ダッシュボード可視化 |
| Calendar | FullCalendar 5.11.3 | イベントカレンダー表示 |
| Icons | FontAwesome 6 | |
| Fonts | Google Fonts (Inter, Noto Sans JP) | |

---

## 3. アーキテクチャ図

```
┌──────────────────────────────────────────────────────┐
│                   Browser (Client)                    │
│   HTML Pages ─── CSS ─── JS Modules ─── Chart.js     │
└──────────────────────┬───────────────────────────────┘
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────────────┐
│                   Netlify (CDN)                       │
│   静的ファイル配信 / セキュリティヘッダー / リダイレクト  │
│   ※ サーバーサイドロジックなし                          │
└──────────────────────┬───────────────────────────────┘
                       │ HTTPS (REST / WebSocket)
                       ▼
┌──────────────────────────────────────────────────────┐
│                    Supabase                           │
│                                                      │
│  ┌─────────────┐  ┌──────────────────┐              │
│  │ Auth         │  │ Edge Functions    │              │
│  │ Email/PW     │  │ line-oauth        │◄── LINE API │
│  │ LINE OAuth   │  │ timerex-webhook   │◄── TimeRex  │
│  │ JWT/Session  │  │ timerex-booking   │──► TimeRex  │
│  └─────────────┘  │ tldv-webhook      │◄── tl;dv    │
│                    └──────────────────┘              │
│  ┌─────────────┐  ┌──────────────────┐              │
│  │ PostgreSQL   │  │ Realtime          │              │
│  │ Tables       │  │ notifications     │              │
│  │ RLS Policies │  │ messages          │              │
│  │ DB Functions │  │ connections       │              │
│  │ Triggers     │  │ user_activities   │              │
│  │ Views        │  └──────────────────┘              │
│  └─────────────┘                                     │
│  ┌─────────────┐                                     │
│  │ Storage      │                                     │
│  │ avatars      │                                     │
│  │ covers       │                                     │
│  └─────────────┘                                     │
└──────────────────────────────────────────────────────┘

外部サービス:
  LINE API ─── OAuth認証（トークン交換・プロフィール取得）
  TimeRex  ─── 相談予約（セッション作成 + Webhook受信）
  tl;dv    ─── 面談録画（Webhook受信 → 紹介報酬検証）
```

---

## 4. 処理境界（Client vs Server）

どの処理がどこで実行されるかの明確な分離:

### Client（Browser / JS）で実行

| 処理 | 理由 |
|------|------|
| マッチングスコア計算 | profiles データから `matching-unified.js` でリアルタイム計算 |
| ダッシュボード統計表示 | 各テーブルを直接 SELECT して集計 |
| 検索・フィルタ・ソート | クライアント側 UI ロジック |
| コネクション申請・承認 | `connections` テーブルに直接 INSERT/UPDATE |
| メッセージ送信 | ※ 実際は `messages` テーブルに INSERT していない（コード無効化済み）。通知のみ作成 |
| ブックマーク操作 | `bookmarks` テーブルに直接 INSERT/DELETE |
| アクティビティ記録 | `user_activities` テーブルに直接 INSERT |
| イベント参加登録 | `event_participants` に直接 INSERT |
| キャッシュアウト申請 | `cashout_requests` に INSERT + `deduct_user_points` RPC |

### Server（Supabase）で実行

| 処理 | 実行場所 | 理由 |
|------|---------|------|
| ユーザー作成後の初期化 | Trigger: `handle_new_user()` | profiles/points/settings 自動生成 |
| LINE OAuth トークン交換 | Edge Function | Channel Secret をサーバー側で保持 |
| TimeRex 予約作成 | Edge Function: `timerex-booking` | API Key をサーバー側で保持 |
| TimeRex Webhook 処理 | Edge Function: `timerex-webhook` | **⚠ 署名検証はOPTIONAL（v13発見）** + ポイント付与 |
| tl;dv Webhook 処理 | Edge Function: `tldv-webhook` | 署名検証（**⚠ タイミング攻撃脆弱性あり — v13発見**） + 面談検証 |
| 紹介リンク生成 | ※ 実際は Client 側で直接 INSERT（referral-unified.js）| DB Function `create_invite_link` は未使用 |
| ポイント付与 | DB Function: `add_referral_points` | ※現状フロントからもRPC呼出可能（要改善） |
| ポイント減算 | DB Function: `deduct_user_points` | ※現状フロントからもRPC呼出可能（要改善） |
| 紹介報酬処理 | DB Function: `process_referral_reward` | 面談完了確認後の報酬付与 |
| 不正検知 | DB Function: `check_*` 系 | IP・パターン分析 |
| RLS による認可 | PostgreSQL Policy | 全テーブルのアクセス制御 |

### 要改善: ポイント操作のセキュリティ

```
現状（問題あり）:
  cashout-modal.js → .rpc('deduct_user_points') → 承認前にポイント減算
  ※ referral-tracking.js は auth.onAuthStateChange で .rpc('add_referral_points') を呼ぶが、
    このファイルはどの HTML ページにも読み込まれていない（デッドコード確認済み）

目標:
  ポイント増減は全て Edge Function または Trigger 経由に限定
  フロントエンドからは .rpc() でのポイント操作を禁止
  RPC 関数に SECURITY DEFINER + 呼び出し元検証を追加
```

---

## 5. データベーススキーマ

### 5.1 テーブル全体像

現状 50 テーブル/ビュー（重複含む）+ 110 実装ギャップ。

**⚠ v12-v14 重要発見:**
- JSがアクセスするがCREATE TABLEがSQLに存在しないテーブル/ビュー: **10個**
  (`user_profiles`, `dashboard_stats`, `user_activities`, `share_activities`, `meeting_confirmations`, `meeting_analysis`, `invite_history`, `member_growth_stats`, `event_stats`, `industry_distribution`)
- SQLで定義されるがJSから一切アクセスされないテーブル: **15個**
  (`access_logs`, `communication_styles`, `conversations`, `event_certificates`, `match_connections`, `match_requests`, `matching_scores_cache`, `point_transactions`, `profile_views`, `referral_details`, `reward_processing_status`, `settings`, `system_notifications`, `user_interests`, `users`)
- **47以上のデッドJSファイル**（`/js/` 配下でどのHTMLページにも読み込まれない）
- **17件のスクリプト参照切れ**（HTMLが存在しないJSファイルを参照 → 404）
- **v13追加発見:**
  - `invite.html` が**別のSupabaseプロジェクト**に接続（`smpmnkypzblmmlnwgmsj` ≠ メインの `whyoqhhzwtlxprhizmor`）
  - `process_referral_on_meeting()` トリガーが `NEW.profile_id` を参照するが、`meeting_minutes` には `user_id` のみ → **トリガー実行時にエラー**
  - `register-referral-handler.js` が `window.register` をラップするが、**`window.register` は未定義** → ラップ処理が無効
  - timerex-webhook の署名検証が**OPTIONAL**（`if (signature) { ... }` — 署名なしリクエストがバイパス可能）
  - timerex-booking に**認証なし**（誰でもセッション作成可能）
  - 全Edge/Netlify Functions で **CORS `Access-Control-Allow-Origin: *`** + **入力バリデーションなし**
  - **80以上の `window.xxx` グローバル関数登録**、14以上のファイルが `window.waitForSupabase()` に依存
  - `handle_new_user()` は **3バージョン**存在（v12は2と記載 → 修正）
- **v14追加発見:**
  - Realtime購読で **メモリリーク**: `connections-manager-simple.js`（line 733-757）と `admin-referral.js`（lines 627-650）に **unsubscribe/cleanup が存在しない**
  - Realtime購読の **テーブル名不一致**: `members-supabase.js` が `profiles` を購読（実テーブルは `user_profiles`）、`notifications-realtime-unified.js` が `referrals`/`referrer_id` を購読（実テーブルは `invitations`/`inviter_id`）
  - Realtime購読の **フィルタなし**: `members-supabase.js` と `matching-realtime-updates.js` が全変更を購読（RLSバイパスリスク）
  - 登録フォームの **LINE QRファイル未永続化**: `#line-qr` ファイルアップロードが収集されるが **DB にも Storage にも保存されない**
  - 登録フォームの **ビジネス課題チェックボックス欠落**: 選択値が user_profiles に保存されず、**詳細テキストのみ保存**（revenue_details, hr_details 等）
  - **settings.html のフォームがUIスタブ**: テーマ（localStorage）以外のアカウント/プライバシー/通知設定フォームに **Supabase連携なし**
  - **cashout_requests の銀行情報不一致**: JS（cashout-modal.js）は `bank_name`/`branch_name`/`account_number` 等の**個別カラム**で INSERT するが、一部SQL定義は `bank_info JSONB`
  - **128個のSQLファイル**が発見され、テーブル定義の**重大な競合**が確認: profiles(4+ファイル), invitations(4+), invite_links(4+), cashout_requests(5+), meeting_minutes(2), connections(2), user_points(3+)
  - **SQL実行順序の管理なし**: 正式なマイグレーションシーケンスが存在しない。seed.sql と 001_migration.sql が同一トリガー名 `on_auth_user_created` で異なるロジック → 競合
  - **netlify.toml のWebhookプロキシURL未設定**: `YOUR_SUPABASE_PROJECT_REF` がプレースホルダーのまま → timerex-webhook/timerex-booking へのプロキシが **404エラー**
  - `publish = "."` で **プロジェクトルート全体をデプロイ** → SQL/設定ファイル/`.env` が公開される（セキュリティリスク）
  - **SUPABASE_SERVICE_KEY が .env に不在** → LINE認証が実行時エラー
  - **@supabase/supabase-js のバージョン不一致**: ルート ^2.52.1 vs netlify/functions ^2.39.0
  - Netlify `_headers` と `netlify.toml` で **X-Frame-Options が競合**: DENY vs SAMEORIGIN
  - `utils/security.js` に **CSRF/Rate Limit/XSS保護が実装済みだが未使用**（line-auth-simple-v4.js からインポートされていない）
- **v15追加発見（最終監査）:**
  - **TimeRex APIキーが平文ハードコード**: `timerex-booking/index.ts:10` に実APIキー `7nxFkW...` が直接記述 → リポジトリアクセス者全員に露出。**即座にキーローテーション必要**
  - **admin.html が完全にUIスタブ**: テーブルTBODYが空、データ読込コードなし。管理機能が実装されていない
  - **super-admin.html が完全にデモデータ**: Supabase接続一切なし。KPI（1,247ユーザー、¥2.34M等）は全てハードコード
  - **ポイント二重管理**: `profiles` テーブルに ALTER TABLE で `available_points`/`total_points_earned`/`total_points_used` を追加（complete-referral-setup.sql）+ `user_points` テーブルも別途存在 → 同一データが2テーブルに分散し同期なし
  - **connections CHECK制約違反がランタイムエラー**: JS が `cancelled`/`removed` を書込むが CHECK 制約は `pending/accepted/rejected/blocked` のみ → `connections-manager-simple.js` で UPDATE 失敗
  - **matching アルゴリズムが NULL 配列で静かに失敗**: `skills`/`interests`/`business_challenges` が NULL の場合にスコア計算が NaN → マッチング結果が空になる
  - **invite.html に Supabase APIキーが平文ハードコード**: `smpmnkypzblmmlnwgmsj` プロジェクトの anon key がソースコードに露出
  - **全 Edge/Netlify Functions の CORS が `Access-Control-Allow-Origin: *`**: webhooks含め全関数が任意オリジンからのアクセスを許可
  - **192 JS ファイル**: アクティブ 135 + 無効化 57（/js/disabled-scripts/）
  - **107 CSS ファイル**: アクティブ 83 + 無効化 24（/css/disabled-css/）
  - **40 HTML ページ**: 本番用 ~25 + テスト/バックアップ ~15
  - **27 シェルスクリプト**: CI/CDパイプラインなし、全て手動実行
  - **ES6モジュール不使用**: 全JSが `window.*` グローバル（80+個）で通信。暗黙的な読込順序依存
  - **dashboard が3つの異なるテーブル名を使用**: `profiles`, `user_profiles`, `members` を同一「ユーザー情報」としてフォールバック使用。`database-table-fix.js` が動的に解決を試みる
  - **deduct_user_points が管理者承認前に呼ばれる**: cashout-modal.js がキャッシュアウト申請時に即座にRPC呼出 → ポイントが承認前に減算される

統合後の目標構成:

**コアテーブル（重複統合対象含む）:**

| # | テーブル | 用途 | 備考 |
|---|---------|------|------|
| 1 | `user_profiles` | 会員プロフィール | **⚠ CREATE TABLEがSQLに存在しない（20+ファイルが参照）** ※ `profiles` と重複 → 統合 |
| 2 | `members` | 会員マスタ（seed.sql） | ※ `profiles` との統合要検討 |
| 2b | `public.users` | ユーザー基本情報（001_migration） | ※ `profiles` と重複 → 廃止対象 |
| 3 | `connections` | コネクション | |
| 4 | `messages` | DM | |
| 5 | `notifications` | 通知 | |
| 6 | `events` | イベント | ※ `event_items` と重複 → 統合 |
| 7 | `event_participants` | イベント参加 | |
| 8 | `event_reminders` | リマインダー | ※トリガー機構が未実装 |
| 9 | `matchings` | マッチング統計キャッシュ | |
| 10 | `bookmarks` | お気に入り | |
| 11 | `settings` | ユーザー設定 | |

**紹介・ポイント:**

| # | テーブル | 用途 |
|---|---------|------|
| 12 | `invite_links` | 紹介リンク |
| 13 | `invitations` | 紹介レコード |
| 14 | `user_points` | ポイント残高 |
| 15 | `point_transactions` | ポイント履歴 |
| 16 | `cashout_requests` | キャッシュアウト申請 |

**予約・面談:**

| # | テーブル | 用途 | 書込元 |
|---|---------|------|--------|
| 17 | `bookings` | TimeRex 予約記録 | Edge Function |
| 18 | `booking_sessions` | TimeRex セッション | Edge Function |
| 19 | `booking_intents` | 予約意思記録 | Client (カレンダー連携) |
| 20 | `tldv_meeting_records` | tl;dv 録画記録 | Edge Function |
| 21 | `meeting_confirmations` | 手動面談確認 | Client (管理者) |
| 22 | `meeting_analysis` | 面談AI分析データ | Client (tldv連携) |
| 23 | `reward_processing_status` | 報酬処理状態 | Edge Function |

**トラッキング・分析:**

| # | テーブル | 用途 | 書込元 |
|---|---------|------|--------|
| 24 | `user_activities` | アクティビティログ | Client |
| 25 | `activities` | マッチング時アクティビティ | Client (matching-unified.js) — `database-table-fix.js` がダッシュボードで参照 |
| 26 | `dashboard_stats` | 統計キャッシュ | Client (dashboard計算) |
| 27 | `referral_clicks` | 紹介リンククリック追跡 | Client (referral-tracking.js) ※このJSはデッドコード（HTMLから未読込）。CREATE TABLEは5SQLファイルに存在 |
| 28 | `invite_history` | 招待ページ訪問追跡 | Client (referral-landing.js) |
| 29 | `share_activities` | SNS共有追跡 | Client (share-modal-handler.js) |

**議事録・検索:**

| # | テーブル | 用途 | 書込元 |
|---|---------|------|--------|
| 30 | `meeting_minutes` | 面談議事録 | ※ INSERT するJS未発見（SQL定義のみ） |
| 31 | `search_history` | 検索履歴 | Client (advanced-search.js) |

**セキュリティ・監査:**

| # | テーブル | 用途 | 書込元 |
|---|---------|------|--------|
| 32 | `access_logs` | 監査ログ | DB Function |
| 33 | `fraud_flags` | 不正検知フラグ | DB Function |

**ビュー:**

| ビュー名 | 用途 |
|----------|------|
| `v_referral_history` | invitations + profiles + invite_links 結合 |
| `popular_search_keywords` | 直近30日の人気検索キーワード集計 |
| `suspicious_users` | 未解決の fraud_flags を持つユーザー一覧（auth.users + profiles + fraud_flags 結合） |
| `ip_registration_stats` | 同一IP登録統計（不正検知用、access_logs ベース、30日間） |

※ `dashboard-charts.js` が `member_growth_stats`, `event_stats`, `industry_distribution` を参照するが、
これらのVIEW/テーブルはSQL未定義。フォールバックでダミーデータを使用中。→ 実装ギャップ。

**SQL定義済みだがJS未使用のテーブル（15テーブル — 将来用 or 未接続）:**
- `access_logs` — 不正検知用監査ログ（fraud-detection-system.sql）※JSからの読み書きなし
- `communication_styles` — 会話スタイル（sql-archive/ のみ）
- `conversations` — 会話テーブル（sql-archive/ のみ）
- `event_certificates` — イベント参加証（`create-event-participation-tables.sql`）
- `match_connections` — マッチング接続（`create-matching-tables.sql`）
- `match_requests` — マッチングリクエスト（`create-matching-tables.sql`）
- `matching_scores_cache` — スコアキャッシュ（sql-archive/ のみ）
- `point_transactions` — ポイント履歴 ※RPCが内部で書込むがJS `.from()` でのアクセスなし
- `profile_views` — プロフィール閲覧履歴（`matching-unified.js` で明示的に無効化）
- `referral_details` — 紹介不正検知詳細（`referral-system-schema.sql`）
- `reward_processing_status` — 報酬処理状態 ※RPCが内部で書込むがJS `.from()` でのアクセスなし
- `settings` — ユーザー設定 ※handle_new_user()のINSERTのみ。JSからのアクセス0件
- `system_notifications` — システム通知（sql-archive/ のみ）
- `user_interests` — ユーザー興味（sql-archive/ のみ）
- `users` (public.users) — 001_migration定義。JS未使用（アプリは `profiles`/`user_profiles` を使用）

### 5.2 重複テーブル統合方針

```
現状（4グループ）:
  user_profiles ←→ profiles ←→ members ←→ public.users
    profiles:       SQL定義あり。Edge Functions が .from('profiles') で使用
    user_profiles:  **CREATE TABLE が SQL に存在しない（20+ JS ファイルが使用）**
                    Supabase ダッシュボードで手動作成された可能性あり
    members:        seed.sql で定義（dashboard-member-counter.js がフォールバック参照）
    public.users:   001_create_users_table.sql で定義（handle_new_user が INSERT）
    ※ 4テーブルが同じ「ユーザー情報」を持つ

  event_items ←→ events       両方使われている
  activities  ←→ user_activities  用途が微妙に異なる

統合先:
  → profiles        (user_profiles + members + public.users のカラムを移行、JS の .from() を書換)
  → events          (event_items のカラムを移行、JS の .from() を書換)
  → user_activities (activities の用途を統合)

手順:
  1. 統合先テーブルに不足カラムを追加
  2. データ移行 SQL 実行
  3. フロントエンド JS の .from() 呼び出し先を変更
  4. handle_new_user() を profiles のみに INSERT するよう統一
  5. RLS ポリシーを統合先に集約
  6. 旧テーブルを DROP
```

### 5.3 テーブル定義

#### `profiles` / `user_profiles` (統合対象)

**⚠ CRITICAL: `user_profiles` の CREATE TABLE が SQL ファイルに一切存在しない。**
20以上のアクティブ JS ファイルが `.from('user_profiles')` でアクセスするが、定義の SQL が見つからない。
Supabase ダッシュボードで手動作成された、またはビューとして存在する可能性がある。
Edge Functions は `.from('profiles')` を使用。`database-table-resolver.js`（disabled）がこの分裂を動的に解決しようとしていた形跡あり。

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK (= auth.users.id) | |
| name | TEXT | 表示名（JSでは `full_name`/`display_name` もフォールバック参照） |
| email | TEXT UNIQUE | |
| avatar_url | TEXT | |
| company | TEXT | 会社名 |
| title | TEXT | 肩書き |
| position | TEXT | 役職 |
| industry | TEXT | 業種 |
| bio | TEXT | 自己紹介 |
| phone | TEXT | 電話番号 |
| skills | TEXT[] | スキル（マッチング計算に使用） |
| interests | TEXT[] | 興味分野（マッチング計算に使用） |
| business_challenges | TEXT[] | 課題（マッチング計算に使用） |
| location | TEXT | 所在地 |
| is_active | BOOLEAN | |
| is_public | BOOLEAN | 公開設定 |
| is_admin | BOOLEAN | 管理者フラグ（RLSポリシー + admin-referral.js で使用） |
| picture_url | TEXT | プロフィール画像URL（Storage: avatars） |
| cover_url | TEXT | カバー画像URL（Storage: covers） |
| last_login | TIMESTAMPTZ | |
| last_active_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

※ `is_admin` は RLS（access_logs, fraud_flags）と JS（admin-referral.js）で使用されるが、
CREATE TABLE / ALTER TABLE での定義が SQL ファイルに見つからない。実装ギャップ。
※ `phone`, `is_public`, `is_admin` も CREATE TABLE に未定義。ダッシュボード or 未適用 ALTER TABLE の可能性。

**⚠ v12発見: JS が使用するが `profiles` の SQL 定義に存在しない追加カラム:**
- `full_name` — register-with-invite.js, message-integration.js が使用（`name` とは別カラム）
- `position` — register-with-invite.js
- `line_id` — register-with-invite.js
- `budget_range` — register-with-invite.js
- `revenue_details`, `hr_details`, `dx_details`, `strategy_details` — register-with-invite.js（5ステップ登録データ）
- `is_online` — register-with-invite.js
- `last_login_at` — register-with-invite.js（`last_login` と別名）
→ これらは `user_profiles` テーブルに存在し `profiles` の SQL 定義にはない可能性が高い。

#### `members` (seed.sql — profiles との統合検討対象)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK → auth.users | |
| name | TEXT NOT NULL | |
| email | TEXT UNIQUE NOT NULL | |
| role | TEXT default `member` | |
| status | TEXT default `active` | |
| joined_at | TIMESTAMPTZ | |
| last_active | TIMESTAMPTZ | |
| metadata | JSONB | |

※ `dashboard-member-counter.js` が `.from('members')` でアクセス（フォールバック）。
`profiles` と用途が重複するため統合候補。

#### `connections`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK | 申請者 |
| connected_user_id | UUID FK | 相手 |
| status | TEXT | `pending` / `accepted` / `rejected` / `blocked` **⚠ CHECK制約はこの4値のみ。JS は `cancelled`/`removed` も書込む → CHECK違反エラーの可能性** |
| message | TEXT | |
| responded_at | TIMESTAMPTZ | 承認/拒否日時 — members-connection.js が UPDATE で設定。**⚠ SQL定義に存在しない（`updated_at` のみ）** |
| created_at | TIMESTAMPTZ | members-connection.js / profile.js が INSERT で設定 |
| updated_at | TIMESTAMPTZ | connections-manager-simple.js が UPDATE で設定 |
| UNIQUE(user_id, connected_user_id) | | |

#### `messages`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| sender_id | UUID FK | |
| recipient_id | UUID FK | |
| content | TEXT | |
| is_read | BOOLEAN | |
| read_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

※ SQL定義ファイル未発見（Supabaseダッシュボードで作成済みの可能性）。
※ JS内でカラム名の揺れあり: `recipient_id` / `to_user_id` / `receiver_id` を動的検出（`supabase-schema-detector.js`）。

**⚠ メッセージテーブルは実質未使用。**
message-integration.js の `sendMessage()` は INSERT コードがコメントアウトされており（理由: 「メッセージテーブルがないため」）、
`{ success: true }` を返すだけ。通知（`sendMessageNotification()`）のみが動作。
`supabase-schema-detector.js` もこのテーブルを検出しようとするが、スキーマ検出器自体が未使用（後述）。

#### `notifications`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK | |
| type | VARCHAR(50) | `connection_request` / `connection_accepted` / `matching` / `booking_created` / `points_awarded` / `system` |
| category | TEXT | 通知カテゴリ（`matching` 等）— matching-unified.js で使用 |
| title | VARCHAR(255) | |
| message | TEXT | 通知本文 — connections系/notifications系/Edge Functions で使用 |
| content | TEXT | 通知本文 — matching-unified.js のみ `content` を使用（`message` と競合） |
| icon | TEXT | FontAwesome アイコン（例: `fas fa-user-plus`） — matching-unified.js |
| priority | TEXT | `normal` 等 — matching-unified.js |
| related_id | UUID | 関連レコードID — matching-unified.js, connections系 |
| related_type | TEXT | 関連エンティティ種別 — matching-unified.js |
| link | TEXT | 通知リンクURL — notifications-unified.js |
| actions | JSONB | アクション定義 — notifications-unified.js（`JSON.stringify()` で保存） |
| data | JSONB | 補足データ — timerex-webhook のみ |
| is_read | BOOLEAN | |
| read_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

**⚠ 3つの競合するスキーマ定義:**
```
定義1 (sql-archive/setup-all-tables.sql): read (BOOLEAN), message (TEXT), data (JSONB)
定義2 (sql/create-booking-tables.sql):    is_read (BOOLEAN), message (TEXT), data (JSONB)
定義3 (sql/fix-invitations-table-structure.sql): content (TEXT), category, related_id, related_type
```
JS は全て `is_read` を使用（定義2準拠）。matching-unified.js のみ `content` を使用（定義3準拠）。
`link` と `actions` カラムはどの SQL 定義にも存在しないが、notifications-unified.js が INSERT で使用。

**⚠ 11箇所から INSERT:**
- Client JS: 6ファイル（matching-unified.js, connections-manager-simple.js x2, members-connection.js, notifications-realtime-unified.js, notifications-unified.js）
- HTML inline: notifications.html
- Edge Functions: timerex-webhook x2（booking_created, points_awarded）
→ カラムセットが各ファイルで異なる。統一されたINSERT関数の作成を推奨。

#### `events` / `event_items` (統合対象)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| title | TEXT | |
| description | TEXT | |
| event_type | TEXT | `online` / `offline` / `hybrid` |
| event_date | TIMESTAMPTZ | 開催日 |
| start_time | TEXT | 開始時刻 |
| end_time | TEXT | 終了時刻 |
| location | TEXT | |
| online_url | TEXT | |
| image_url | TEXT | |
| max_participants | INTEGER | 定員 |
| price | DECIMAL | 参加費 |
| currency | TEXT | |
| organizer_id | UUID FK | |
| organizer_name | TEXT | |
| category | TEXT | |
| tags | TEXT[] | |
| requirements | TEXT | 参加条件 |
| agenda | TEXT | |
| is_public | BOOLEAN | |
| is_cancelled | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `event_participants`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| event_id | UUID FK | |
| user_id | UUID FK | |
| status | TEXT | `registered` / `confirmed` / `cancelled` / `attended` — event-modal.js / events-supabase.js が使用 |
| registration_date | TIMESTAMPTZ | event-modal.js / events-supabase.js が UPDATE で設定 |
| attendance_status | TEXT | event-registration.js が使用（※ events.html でコメントアウト無効化済み） |
| cancellation_reason | TEXT | |
| cancelled_at | TIMESTAMPTZ | |
| attendance_confirmed_at | TIMESTAMPTZ | |
| special_requirements | TEXT | |
| payment_status | TEXT | |

#### `event_reminders`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| event_id | UUID FK | |
| user_id | UUID FK | |
| reminder_type | TEXT | `email` / `notification` / `both` |
| reminder_timing | INTEGER | リマインド分数 |
| is_sent | BOOLEAN | |
| sent_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| UNIQUE(event_id, user_id, reminder_timing) | | |

※ **実装ギャップ**: リマインダーをチェックして通知を送る定期実行機構が未実装。
Supabase `pg_cron` + DB Function で reminder_timing を監視し notifications に INSERT する仕組みが必要。

#### `matchings`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK | |
| matched_user_id | UUID FK | |
| match_score | NUMERIC(3,2) | 0.00-1.00 |
| match_reasons | JSONB | マッチング理由 |
| status | TEXT default `pending` | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| UNIQUE(user_id, matched_user_id) | | |

※ マッチングスコア計算は `matching-unified.js` でクライアント側実行。
このテーブルはダッシュボード統計用キャッシュ。

#### `bookmarks`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK | |
| bookmarked_user_id | UUID FK | |
| note | TEXT | メモ |
| created_at | TIMESTAMPTZ | |
| UNIQUE(user_id, bookmarked_user_id) | | |

#### `settings`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK UNIQUE | |
| theme | TEXT default `light` | |
| language | TEXT default `ja` | |
| notifications_enabled | BOOLEAN | |
| email_notifications | BOOLEAN | |
| metadata | JSONB | |
| updated_at | TIMESTAMPTZ | |

**⚠ JSから一切アクセスなし。** `.from('settings')` の呼び出しがコードベース全体に存在しない。
settings.js は UI のフォーム操作のみで、データベースへの読み書きは行わない。
handle_new_user() (seed.sql版) が初期レコードを INSERT するのみ。実質的に未使用テーブル。

**⚠ v14発見 — settings.html のフォームが全てUIスタブ:**
settings.html には6セクション（アカウント/プライバシー/通知/外観/言語/セキュリティ）のフォームがあるが、
テーマ設定（localStorage保存）以外に Supabase への読み書きコードが**一切存在しない**。
トグルスイッチ/入力フィールドは表示のみで、保存ボタン押下時の `.from('settings').update()` 等のコードがない。

#### `invite_links`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| created_by | UUID FK | |
| link_code | VARCHAR(20) UNIQUE | 8文字ユニークコード（`generateLinkCode()` で生成: A-Z0-9） |
| description | TEXT | |
| is_active | BOOLEAN | |
| max_uses | INTEGER | |
| used_count | INTEGER | register-with-invite.js / registration-flow.js が UPDATE でインクリメント |
| referral_count | INTEGER | ※ referral-unified.js が INSERT時に使用（SQL定義は `registration_count`） |
| conversion_count | INTEGER | ※ referral-unified.js が INSERT時に使用（SQL定義は `completion_count`） |
| registration_count | INTEGER | SQL定義カラム（JSは `referral_count` でINSERT → 不一致） |
| completion_count | INTEGER | SQL定義カラム（JSは `conversion_count` でINSERT → 不一致） |
| total_rewards_earned | INTEGER | |
| last_used_at | TIMESTAMPTZ | ※ register-with-invite.js が UPDATE で設定（SQL定義に存在するか要確認） |
| expires_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**⚠ カラム名の重複 — 両方存在する可能性あり（v12確認）:**
`add-missing-columns-to-invite-links.sql` が ALTER TABLE で `referral_count`/`conversion_count` を追加。
元のCREATE TABLEには `registration_count`/`completion_count` が定義。
→ DB上には **4つのカウントカラムが共存** している可能性がある（重複した意味のカラム）。
referral-unified.js は `referral_count`/`conversion_count` でINSERT（ALTER後のカラムを使用）。
force-display-link.js は `registration_count` でSELECT（元のカラムを使用）。
→ どちらかのペアに統一すべき。

#### `invitations`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| inviter_id | UUID FK | |
| invitee_id | UUID FK | 紹介された人 **⚠ 10+ファイルで使用されるが、どの CREATE TABLE / ALTER TABLE にも定義が存在しない** |
| invitee_email | VARCHAR(255) | |
| invite_code | VARCHAR(20) | ※ SQL定義は `invitation_code`。JSは `invite_code` を使用（不一致） |
| invite_link_id | UUID FK → invite_links | 紹介リンクID（Trigger: update_invite_link_stats で使用）— register-referral-handler.js |
| accepted_by | UUID FK | 招待承認者ID — register-referral-handler.js が INSERT で使用 |
| accepted_at | TIMESTAMPTZ | 承認日時 — register-referral-handler.js が INSERT で使用 |
| status | VARCHAR(50) | `pending` / `registered` / `accepted` / `completed` |
| registered_at | TIMESTAMPTZ | 登録日時 |
| referral_data | JSONB | 紹介関連データ（source, landing_page, timestamp） |
| reward_status | VARCHAR(20) | `pending` / `earned` / `cancelled` |
| reward_points | INTEGER default 1000 | |
| reward_earned_at | TIMESTAMPTZ | 報酬確定日時 |
| meeting_completed_at | TIMESTAMPTZ | |
| fraud_score | DECIMAL(3,2) default 0.00 | 不正スコア |
| verification_notes | TEXT | 検証メモ |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

※ `inviter_email` はSQL未定義（JS/Edgeからの使用も未確認）。v7で記載していたが削除。

**⚠ 2ファイルから INSERT — 重複レコードリスク（v12修正: 3→2に訂正）:**
```
register-with-invite.js:  ← register.html から ACTIVE 読込（capture phase で submit ハンドル）
  { inviter_id, invitee_id, status: 'registered', invite_code, registered_at }

register-referral-handler.js:  ← register.html から ACTIVE 読込（window.register ラップ）
  { inviter_id, invitee_email: null, invitation_code, status: 'registered', accepted_by, accepted_at, invite_link_id }
  ※ 現在のフローでは register-with-invite.js が capture phase で先行処理するため、
    register-referral-handler.js の INSERT パスは通常発火しない（ただし完全には排除されない）

referral-tracking.js:  ← ★ デッドコード確認済み（どの HTML ページにも読み込まれていない）
  { inviter_id: null, invitee_id, invitee_email, invite_code, ... }
  → ランタイムでは実行されない。INSERT リスクはゼロ。
```
register.html の race condition: register-with-invite.js と registration-flow.js が両方
form submit をハンドルし、invite_links.used_count を独立してインクリメント → 二重加算リスク。
UNIQUE制約（inviter_id + invitee_id）や統合した単一エントリポイントが必要。

**⚠ v13発見 — register.html の追加問題:**
```
1. register-referral-handler.js が window.register をラップ（line 124）するが、
   window.register は register.html 上でどこにも定義されていない → ラップ処理は無効（空振り）

2. スクリプト読込順序の問題:
   register-referral-handler.js は line 657 で読込
   supabase-unified.js は line 677 で読込（後）
   → register-referral-handler.js が Supabase を必要とする処理を即時実行する場合、
     Supabase クライアントが未初期化の可能性がある
     （ただし window.waitForSupabase() による遅延初期化で回避している可能性あり）
```

#### `user_points`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK UNIQUE | |
| total_points | INTEGER | 累計 |
| available_points | INTEGER | 利用可能 |
| spent_points | INTEGER | 使用済み |
| level | INTEGER | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `point_transactions`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK | |
| amount | INTEGER | |
| type | TEXT | `referral_reward` / `cashout` / `manual_adjustment` / `bonus` |
| description | TEXT | |
| reference_id | UUID | |
| balance_after | INTEGER | 取引後残高 |
| created_at | TIMESTAMPTZ | |

#### `cashout_requests`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK | |
| request_number | VARCHAR(20) UNIQUE | ※SQL定義はNOT NULLだがJS側で生成・INSERTしていない（実装ギャップ） |
| amount | INTEGER | 申請ポイント数（最低 3,000pt） |
| gross_amount | DECIMAL | 税込金額 |
| tax_amount | DECIMAL | 源泉徴収 |
| net_amount | DECIMAL | 手取り |
| bank_info | JSONB | {bank_name, branch_name, account_type, account_number, holder} |
| status | TEXT | `pending` / `reviewing` / `approved` / `processing` / `completed` / `rejected` |
| approved_at | TIMESTAMPTZ | 承認日時 — admin-referral.js が UPDATE で設定 |
| approved_by | UUID FK | 承認者ID — admin-referral.js が UPDATE で設定 |
| rejected_at | TIMESTAMPTZ | 拒否日時 — admin-referral.js が UPDATE で設定 |
| rejected_by | UUID FK | 拒否者ID — admin-referral.js が UPDATE で設定 |
| reviewed_by | UUID FK | ※ SQL定義にあるが JS未使用 |
| processed_by | UUID FK | ※ SQL定義にあるが JS未使用 |
| rejection_reason | TEXT | 拒否理由 — admin-referral.js が UPDATE で設定 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

※ JS（cashout-modal.js）は `amount`, `gross_amount`, `bank_info` で INSERT。
SQL定義の一部は `points_amount`, `cash_amount`, `bank_details` を使用（バージョン不一致）。
JS実装に合わせるべき。

**⚠ v14発見 — 銀行情報のカラム構造不一致:**
```
cashout-modal.js (実際のINSERT): 個別カラムで INSERT
  bank_name, branch_name, branch_code, account_type, account_number, account_holder

SQL定義1 (complete-referral-setup.sql): JSONB 1カラム
  bank_info JSONB → {bank_name, branch_name, account_type, account_number, holder}

SQL定義2 (fix-referral-tables-final.sql): 個別 TEXT カラム
  bank_name TEXT, branch_name TEXT, account_type TEXT, account_number TEXT

→ JS の個別カラム INSERT が成功するには、SQL定義2 が適用されている必要がある。
  SQL定義1 が適用されていると INSERT が失敗する。
```

**⚠ キャッシュアウト原子性の問題:**
cashout-modal.js はまず `cashout_requests` に INSERT し、その後 `.rpc('deduct_user_points')` を呼ぶ。
RPC が失敗した場合、cashout_requests レコードは存在するがポイントは未減算の状態になる。
→ トランザクションで一括処理すべき（DB Function で INSERT + ポイント減算をアトミックに実行）。

#### `bookings`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| booking_id | TEXT | **⚠ timerex-webhook が INSERT で使用するが、SQL定義のカラム名は `timerex_id`** |
| timerex_id | VARCHAR(255) UNIQUE | SQL定義カラム |
| session_ref | TEXT | **⚠ timerex-webhook が INSERT で使用するが、SQL定義のカラム名は `session_id`** |
| user_email | TEXT | |
| user_name | TEXT | |
| staff_name | TEXT | 担当者名 |
| scheduled_at | TIMESTAMPTZ | |
| duration_minutes | INTEGER default 30 | |
| consultation_type | TEXT | 相談種別 |
| consultation_details | TEXT | 相談内容 |
| referral_code | TEXT | |
| meeting_url | TEXT | **⚠ timerex-webhook が INSERT で使用するが、SQL定義のカラム名は `google_meet_url`** |
| status | TEXT | `confirmed` / `completed` / `cancelled` |
| completed_at | TIMESTAMPTZ | |
| cancelled_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

書込: Edge Function (`timerex-webhook`) のみ
**⚠ v12発見: timerex-webhook が使用する3カラム名が全てSQL定義と不一致:**
`booking_id`→`timerex_id`、`session_ref`→`session_id`、`meeting_url`→`google_meet_url`
→ INSERT が失敗する可能性が高い。Edge Function のカラム名を SQL 定義に合わせる修正が必要。

#### `booking_sessions`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| timerex_session_id | VARCHAR UNIQUE | ※ Edge Function(TS)は `session_id` で INSERT（不一致） |
| user_id | UUID FK | |
| user_email | VARCHAR(255) | |
| referral_code | VARCHAR(20) | |
| status | VARCHAR(50) default `pending` | |
| timerex_data | JSONB | ※ Edge Function(TS)は `session_data` で INSERT（不一致） |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

書込: Edge Function (`timerex-booking`) のみ
※ SQL定義(`timerex_session_id`/`timerex_data`)とEdge Function TS(`session_id`/`session_data`)でカラム名不一致。実装ギャップ。

#### `booking_intents`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK | |
| referral_code | TEXT | |
| booking_method | VARCHAR(50) | calendly / google_calendar |
| metadata | JSONB | |
| created_at | TIMESTAMPTZ | |

書込: Client (google-calendar-booking.js, calendly-booking.js)

#### `tldv_meeting_records`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| meeting_id | TEXT | |
| invitee_email | TEXT | |
| meeting_date | DATE | |
| duration_minutes | INTEGER | |
| recording_url | TEXT | |
| transcript_url | TEXT | |
| is_valid | BOOLEAN | 15分以上 = true |
| created_at | TIMESTAMPTZ | |

書込: Edge Function (`tldv-webhook`) + Client (manual-meeting-confirmation.js, tldv-api-integration.js)
※ INSERT はクライアントからも実行される（Edge Function のみではない）。
UPDATE（recording_url, transcript_url）も tldv-api-integration.js と tldv-webhook の両方から実行。

#### `meeting_confirmations`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| invitation_id | UUID FK | |
| confirmed_by | UUID FK | 確認した管理者 |
| confirmation_type | TEXT | manual |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

書込: Client (manual-meeting-confirmation.js — 管理者操作)
用途: tl;dv で自動検出できなかった面談を管理者が手動確認

#### `meeting_analysis`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| meeting_id | TEXT | |
| analysis_result | JSONB | AI分析結果（word_count, has_business_keywords, participant_balance） |
| is_quality_meeting | BOOLEAN | word_count > 1000 かつ ビジネスキーワード含む |
| created_at | TIMESTAMPTZ | |

書込: Client (tldv-api-integration.js)
※ v9まで `analysis_data` と記載していたが、実際のJSは `analysis_result` で INSERT。

#### `reward_processing_status`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| invitation_id | UUID FK → invitations | |
| status | TEXT | `pending` / `processing` / `completed` / `failed` |
| tldv_meeting_id | TEXT | |
| meeting_verified_at | TIMESTAMPTZ | |
| reward_amount | INTEGER default 1000 | |
| error_message | TEXT | |
| retry_count | INTEGER default 0 | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

書込: Edge Function (Webhook処理)
読込: Client (admin-referral.js — invitations からリレーション結合で参照)

#### `user_activities`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK | |
| activity_type | TEXT | `login` / `connection` / `matching` / `event` / `message` |
| activity_detail | TEXT | アクティビティ詳細 — dashboard-event-participation.js が INSERT で使用 |
| description | TEXT | ※ SQL定義カラム（JS は `activity_detail` を使用 → 不一致の可能性） |
| related_id | UUID | 関連レコードID — dashboard-event-participation.js が INSERT で使用 |
| metadata | JSONB | ※ SQL定義カラム（JS は `related_id` を使用 → 不一致の可能性） |
| created_at | TIMESTAMPTZ | |

**⚠ JSの INSERT カラムとSQL定義が不一致の可能性:**
dashboard-event-participation.js: `{ user_id, activity_type, activity_detail, related_id, created_at }`
SQL定義: `description`, `metadata` カラム
→ `activity_detail` vs `description`、`related_id` vs `metadata` が異なる。

#### `activities` (user_activities との統合対象)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| type | VARCHAR(50) | `member_joined` / `event_completed` / `matching_success` / `message_sent` / `connection_made` / `profile_updated` / `event_created` |
| title | TEXT NOT NULL | |
| description | TEXT | |
| user_id | UUID FK → auth.users | |
| related_user_id | UUID FK → auth.users | |
| event_id | UUID FK → events | |
| data | JSONB | |
| created_at | TIMESTAMPTZ | |

定義元: sql-archive/setup-all-tables.sql
書込: Client (matching-unified.js) — `{ type, title, user_id, related_user_id }`
読込: Client (database-table-fix.js がダッシュボード用にクエリ — events→activities 変換シムとして機能)

※ `database-table-fix.js` が `activities` テーブルを `events` の代替として参照:
- `type: 'event_completed'` でフィルタしてイベント数を計算
- `type: 'event_upcoming'` でフィルタして今後のイベントを表示
- matchings テーブルの代わりに `connections` テーブルを参照するパッチも含む

#### `dashboard_stats`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| stat_type | TEXT | |
| stat_value | JSONB | |
| updated_at | TIMESTAMPTZ | |

**⚠ CREATE TABLE 文が SQL ファイルに存在しない。**
dashboard-data.js が INSERT/UPSERT するが、テーブル定義の SQL が見つからない。
ULTIMATE-FINAL-test-data.sql に `DROP TRIGGER IF EXISTS update_dashboard_stats_trigger` の参照のみ。
テーブルが存在しない場合、INSERT/UPSERT は失敗し、dashboard-data.js のフォールバックでダミーデータを使用。

書込: Client (dashboard-data.js から upsert `...newStats, updated_at`)
読込: Client (dashboard-data.js, dashboard-member-counter.js)

#### `referral_clicks`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| referral_code | VARCHAR(20) | |
| clicked_at | TIMESTAMPTZ | クリック日時 |
| user_agent | TEXT | |
| referrer | TEXT | リファラURL |
| landing_url | TEXT | ランディングURL |
| ip_address | INET | |
| created_at | TIMESTAMPTZ | |

書込: Client (referral-tracking.js) ※ このJSはデッドコード（HTMLから未読込）
※ v12確認: CREATE TABLE は5つのSQLファイルに定義あり（referral-tracking-tables*.sql, execute-in-order.sql）

#### `invite_history`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| invite_link_id | UUID FK | ※ JS(referral-landing.js) が INSERT で使用 |
| ip_address | TEXT | ※ JS(referral-landing.js) が INSERT で使用 |
| user_agent | TEXT | ※ JS(referral-landing.js) が INSERT で使用 |
| invite_code | TEXT | ※ SQL定義カラム（JS は `invite_link_id` を使用 → 不一致） |
| visitor_info | JSONB | ※ SQL定義カラム（JS は `ip_address`/`user_agent` を個別カラムで使用 → 不一致） |
| created_at | TIMESTAMPTZ | |

書込: Client (referral-landing.js)
**⚠ v12修正: CREATE TABLE が独立して存在しない。**
`fix-invitations-table-structure.sql` 内の関数ボディ内に部分的定義（`invite_link_id, invitation_id, created_at`）があるのみ。
JS の INSERT: `{ invite_link_id, ip_address, user_agent }` — `ip_address`/`user_agent` は定義になく、`invitation_id` は JS が省略。
テーブル自体がSQL管理外の可能性。

#### `share_activities`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK | |
| platform | TEXT | twitter / line / facebook / email — JS(share-modal-handler.js) が INSERT で使用 |
| share_url | TEXT | 共有URL — JS が INSERT で使用 |
| shared_at | TIMESTAMPTZ | 共有日時 — JS が INSERT で使用 |
| share_type | TEXT | ※ SQL定義カラム（JS は `platform` を使用 → 不一致） |
| shared_url | TEXT | ※ SQL定義カラム（JS は `share_url` を使用 → 不一致） |
| metadata | JSONB | ※ SQL定義カラム（JS は未使用） |
| created_at | TIMESTAMPTZ | ※ SQL定義カラム（JS は `shared_at` を使用 → 不一致） |

書込: Client (share-modal-handler.js)
**⚠ v12修正: CREATE TABLE が SQL ファイルに一切存在しない。**
v11まで記載していた `share_type`/`shared_url`/`created_at` のSQL定義カラムは誤り。
テーブル自体がSQL管理外（Supabaseダッシュボードで作成の可能性）。
実際のカラムは JS の INSERT に合わせて `user_id`/`platform`/`share_url`/`shared_at` と想定。

#### `meeting_minutes`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK | |
| meeting_title | TEXT | 面談タイトル |
| meeting_date | TIMESTAMPTZ | 面談日時 |
| content | TEXT | 議事録内容 |
| summary | TEXT | 要約 |
| keywords | TEXT[] | キーワード |
| participants | TEXT[] | 参加者 |
| action_items | JSONB | アクション項目 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**⚠ INSERT する JS が見つからない。** SQL定義（create-meeting-minutes-table.sql）のみ存在。
profile-detail-modal.js は meeting_minutes を SELECT（閲覧）するが INSERT は行わない。
サンプルデータは SQL で直接 INSERT される。実際の議事録書き込み機能は未実装。

**⚠ v13発見: `process_referral_on_meeting()` トリガーの致命的バグ:**
referral-system-schema.sql で定義される `process_referral_on_meeting()` が `NEW.profile_id` を参照するが、
`meeting_minutes` テーブルのカラムは `user_id` のみ（`profile_id` は存在しない）。
→ このトリガーが meeting_minutes に設定された場合、INSERT時に **`profile_id does not exist` エラー**で失敗する。
修正: `NEW.profile_id` → `NEW.user_id` に変更が必要。

#### `search_history`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK | |
| search_query | TEXT | 検索クエリ |
| filters | JSONB | 検索フィルタ |
| searched_at | TIMESTAMPTZ | 検索日時 |
| results_count | INTEGER | 結果件数 |
| clicked_results | UUID[] | クリックした結果 |

書込: Client (advanced-search.js)
メンテナンス: `clean_old_search_history()` で90日以上前のレコード削除

#### `access_logs`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK | |
| action_type | TEXT | `registration` / `referral_created` / `cashout_request` |
| ip_address | TEXT | |
| user_agent | TEXT | |
| metadata | JSONB | |
| created_at | TIMESTAMPTZ | |

#### `fraud_flags`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK | |
| flag_type | TEXT | `duplicate_ip` / `rapid_registration` / `suspicious_pattern` |
| severity | TEXT | `low` / `medium` / `high` |
| details | JSONB | |
| resolved | BOOLEAN | |
| resolved_by | UUID FK | |
| resolved_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

#### `v_referral_history` (VIEW)

```sql
-- invitations + profiles + invite_links を結合
-- referral-unified.js から .from('v_referral_history').select('*') で参照
```

### 5.4 ER図

```
                          auth.users
                              │ 1:1
                              ▼
                          profiles ──── settings
                       ┌────┤    ├────┐
                       │    │    │    │
                       ▼    │    │    ▼
                connections │    │  bookmarks
                  (from/to) │    │
                       │    │    │
                       ▼    ▼    ▼
                  messages  notifications  user_activities
                                               │
                                               ▼
                                         dashboard_stats

        events ──── event_participants
          │              │
          └── event_reminders (※トリガー未実装)

        invite_links ──── invitations ──── referral_clicks
             │                │              invite_history
             │                │              share_activities
             │                ▼
             │          user_points ──── point_transactions
             │                │
             │                ▼
             │         cashout_requests
             │
             └── booking_sessions ──── bookings
                                         │
                                    ┌────┴────┐
                                    │         │
                          tldv_meeting   meeting_
                          _records       confirmations
                              │
                              ▼
                        meeting_analysis

        matchings (統計キャッシュ)
        booking_intents (予約意思)
        meeting_minutes (面談議事録)
        search_history (検索履歴)
        access_logs / fraud_flags (セキュリティ)
```

---

## 6. 認証

### 6.1 Email / Password

```
Browser                      Supabase Auth
   │  signUp / signIn            │
   ├────────────────────────────►│
   │                             │ validate → create session
   │  JWT + Refresh Token        │
   │◄────────────────────────────┤
   │                             │
   │  Trigger: handle_new_user() │
   │  → profiles INSERT (id, username=meta.username, full_name=meta.full_name, avatar_url=meta.avatar_url)
   │  → settings INSERT (id, user_id, theme='system', language='ja')
   │  Trigger: create_user_points_on_signup()
   │  → user_points INSERT (user_id, total_points=0, available_points=0, spent_points=0)
```

**⚠ handle_new_user() バージョン競合（v13確認: 3バージョン）:**
```
Version 1 — seed.sql 版:
  → profiles INSERT (id, username, full_name, avatar_url) ← raw_user_meta_data から取得
  → settings INSERT (id, user_id, theme='system', language='ja')

Version 2 — 001_create_users_table.sql 版:
  → public.users INSERT (id, email, name) ← profiles ではなく public.users に INSERT
  ※ この版が適用されると profiles が生成されない

Version 3 — sql-archive/create-profiles-table.sql 版（v13発見）:
  → profiles INSERT (id, email, name) ← COALESCE(meta->>'name', email) でフォールバック
  ※ settings INSERT なし。username/full_name/avatar_url ではなく email/name を使用

使用すべき版: seed.sql 版（profiles に INSERT する版）
001版は public.users テーブルと共に廃止対象。
create-profiles-table.sql版は archive 内だが、誤って適用された場合 settings が作成されない。
```

### 6.2 LINE OAuth

```
Browser           Netlify Function (※移行予定)   LINE API
   │                      │                        │
   │ 1. LINE ログイン押下  │                        │
   │─────────────────────────────────────────────► │
   │                      │  (LINE認証画面)         │
   │ 2. 認証コード返却     │                        │
   │◄─────────────────────────────────────────────  │
   │ 3. コード送信         │                        │
   ├─────────────────────►│                        │
   │                      │ 4. token交換            │
   │                      ├───────────────────────►│
   │                      │ 5. access token         │
   │                      │◄───────────────────────┤
   │                      │ 6. profile取得          │
   │                      ├───────────────────────►│
   │                      │ 7. profile data         │
   │                      │◄───────────────────────┤
   │                      │                        │
   │                      │ 8. Supabase Auth upsert │
   │                      │    email: line_{userId}@interconnect.com
   │                      │    user_metadata: { name, picture, provider, line_user_id }
   │                      │ 9. JWT発行              │
   │ 10. JWT + redirect   │                        │
   │◄─────────────────────┤                        │
```

**⚠ LINE OAuth メタデータキー不一致:**
```
line-auth-simple-v4.js が設定するメタデータ:
  { name: "LINE名", picture: "URL", provider: "line", line_user_id: "U..." }

handle_new_user() (seed.sql版) が参照するメタデータ:
  raw_user_meta_data->>'username'   → LINE の場合 NULL
  raw_user_meta_data->>'full_name'  → LINE の場合 NULL
  raw_user_meta_data->>'avatar_url' → LINE の場合 NULL

結果: LINE ログインユーザーの profiles レコードは username/full_name/avatar_url が全て NULL になる。
対応: handle_new_user() で name/picture キーも参照するよう修正が必要。
  例: COALESCE(meta->>'username', meta->>'name', meta->>'full_name')
```

**⚠ v13発見 — line-auth-simple-v4.js の追加問題:**
```
1. LINE_CHANNEL_ID のハードコードフォールバック: '2007688781'
   → 環境変数が未設定の場合にフォールバック値を使用。意図しないLINEアプリへの接続リスク

2. listUsers() をフィルタなしで呼出
   → ユーザー検索時に auth.admin.listUsers() を全件取得。ユーザー数増加でパフォーマンス劣化

3. 情報漏洩: エラー詳細がクライアントに返却
   → try/catch でキャッチしたエラーの全文をレスポンスボディに含める。内部構造が露出
```

### 6.3 ゲストモード

`guest-login-handler.js` / `guest-mode-manager.js` によるゲストアクセス:
- ダッシュボードの閲覧が可能（デモデータ表示）
- Supabase 認証なし、ローカルデモデータのみ

### 6.4 ロール

| Role | アクセス範囲 |
|------|-------------|
| `member` | 自分のデータCRUD、他会員プロフィール閲覧 |
| `admin` | + 全ユーザー管理、イベント管理、サイト設定 |
| `super_admin` | + システム全体、紹介管理、キャッシュアウト承認 |
| 未認証 | LP・ログイン・登録画面のみ |
| ゲスト | ダッシュボード閲覧のみ（デモデータ） |

---

## 7. 機能一覧

### 7.1 ダッシュボード
- リアルタイム統計（会員数・イベント数・マッチング数・メッセージ数）
- Chart.js 可視化（会員推移・業種分布・参加率）
- アクティビティフィード
- 直近イベントウィジェット
- 各テーブルを直接 SELECT + `dashboard_stats` キャッシュ参照

### 7.2 スマートマッチング
- **challenges ↔ skills** マッピングアルゴリズム
- 重み付きスコア計算（業種・地域・スキル・興味）
- レーダーチャートで互換性可視化
- ブックマーク（`bookmarks`）
- マッチング → コネクション申請への導線
- **全計算はクライアント側** (`matching-unified.js` 136KB)

### 7.3 コネクション
- 申請 / 承認 / 拒否 / キャンセル
- 4タブ（受信・送信・接続済み・拒否済み）
- 検索・ソート
- Realtime購読で即時更新
- 成立時に `notifications` INSERT

### 7.4 会員一覧
- 全アクティブ会員の一覧
- フィルタ（業種・役職・スキル・地域）
- ページネーション（12件/ページ）
- リスト/グリッド切替
- プレビューモーダル

### 7.5 プロフィール
- 3タブ（About / Experience / Interests）
- 編集モーダル
- Storage画像アップロード（`avatars` / `covers`）
- コネクション状態表示
- 5ステップ登録データ対応

### 7.6 イベント
- 一覧（upcoming / past）
- 詳細モーダル
- 参加登録 / キャンセル
- 参加者一覧
- カレンダー連携（Google Calendar / TimeRex）
- リマインダー設定（※通知送信トリガーは未実装）
- 管理者CRUD

### 7.7 メッセージ
- コネクション済みユーザー間のDM
- Realtime購読で即時配信
- 既読管理
- **⚠ 実質未実装**: `messages` テーブルへの INSERT がコメントアウト済み。通知のみ動作。

### 7.8 通知
- Realtime WebSocket即時配信
- タイプ: connection / message / event / referral / system / booking_created / points_awarded
- 一括既読・個別既読・削除
- バッジ（未読数）
- トースト通知

### 7.9 紹介プログラム
- 紹介リンク生成（referral-unified.js が `invite_links` に直接 INSERT ※RPC `create_invite_link` は未使用）
- SNS共有ボタン（`share_activities` 記録）
- クリック追跡（`referral_clicks`）
- 訪問追跡（`invite_history`）
- 紹介フロー: クリック → 登録 → 面談予約 → 面談完了 → 報酬
- ポイント付与（面談完了で1,000pt）
- ポイント残高管理（`user_points`）
- キャッシュアウト（最低3,000pt → 源泉徴収計算 → 銀行振込）
- 手動面談確認（`meeting_confirmations` — tl;dvで自動検出できない場合）
- 不正検知（後述）

### 7.10 管理パネル
- ユーザー管理（一覧・ロール変更・無効化）
- イベント管理
- サイト設定
- 紹介分析（RPC: `get_referral_analytics`, `get_top_referrers`）
- キャッシュアウト承認/拒否
- ポイント手動付与/減算（RPC: `add_user_points`）

### 7.11 設定
- プロフィール設定
- パスワード変更
- 通知設定
- プライバシー設定
- LINE連携
- **⚠ `settings` テーブルは JS から一切アクセスなし。** settings.js はUI操作のみ。

### 7.12 JS 互換レイヤー

**`database-table-fix.js`（アクティブ — dashboard.html で読み込み）:**
ダッシュボードの `dashboardEventCalculator` / `dashboardMatchingCalculator` をパッチし、
旧テーブル名で実装されたコードを実DB構造にマッピングするシムレイヤー。

| 旧テーブル名（コード） | 実テーブル名（DB） | 変換ロジック |
|---------------------|-----------------|------------|
| `events` | `activities` (type='event_completed') | イベント数カウント |
| `events` (upcoming) | `activities` (type='event_upcoming') | 今後のイベント表示 |
| `matchings` | `connections` (status IN accepted/success/null) | コネクション数カウント |

→ フォールバックでダミーデータ（経営戦略セミナー等）を表示する機能あり。

**`supabase-schema-detector.js`（未使用 — どの JS からもインポート/呼出なし）:**
テーブル構造を動的に検出し、カラム名のフォールバックを行うユーティリティ。
`window.supabaseSchemaDetector` としてグローバル登録されるが、実際に参照するコードは存在しない。

検出対象:
- 6テーブル: events, matchings, messages, user_activities, users, profiles
- 受信者フィールド: recipient_id → to_user_id → receiver_id
- 日付フィールド: event_date → date → start_date → created_at
- 既読フィールド: is_read → read_at → read

### 7.13 HTML → JS ロードチェーン（v12追加）

**共有モジュール（5ページ以上で読込）:**

| JS ファイル | 読込ページ数 | DB操作 |
|------------|:----------:|--------|
| `supabase-unified.js` | 16 | Supabase初期化（CDN動的ロード含む） |
| `error-prevention.js` | 18+ | なし |
| `dashboard.js` | 8 | `user_points` SELECT |
| `notifications-realtime-unified.js` | 5 | `user_profiles`/`events`/`notifications` SELECT/INSERT |
| `user-dropdown-handler.js` | 7 | `notifications` SELECT/UPDATE |

**キーページのテーブル接触数:**

| ページ | アクティブ JS | 接触テーブル数 |
|--------|:----------:|:----------:|
| dashboard.html | 33 | 12+ |
| referral.html | 18 | 7 |
| events.html | 20 | 5 |
| register.html | 14 | 3 |
| matching.html | 13 | 5 |
| connections.html | 9 | 4 |
| admin-referral.html | 6 | 8 |

**⚠ 47以上のデッドJSファイル（`/js/` 配下、`disabled-scripts/` 除外）:**
どのHTMLページにも `<script>` タグで読み込まれていない。
Supabase `.from()` 呼出を含むものも多数あり、静的解析では「実行される」ように見えるが
ランタイムでは一切実行されない。主要なデッドコード:
- `referral-tracking.js` — invitations INSERT + .rpc('add_referral_points') を含むが未使用
- `dashboard-data.js` — dashboard_stats/user_activities への INSERT を含むが未使用
- `tldv-api-integration.js` — tldv_meeting_records/meeting_analysis への INSERT を含むが未使用
- `event-registration.js` — events.html でコメントアウト無効化済み（events-supabase.js と重複のため）
- `supabase-schema-detector.js` — テーブル構造検出ユーティリティ。グローバル登録のみ

**⚠ v13発見 — クロスファイル JS 依存関係の問題:**

| 問題 | 詳細 |
|------|------|
| 80+ `window.xxx` グローバル登録 | モジュールシステム不使用、全てグローバル変数で連携 |
| `window.waitForSupabase()` 依存 | 14以上のファイルがこの関数に依存。定義元: `supabase-unified.js` |
| `supabaseReady` イベント | 17ファイルがリッスン。Supabase初期化完了通知 |
| 3つのプロフィールモーダル実装 | `MembersProfileModal`, `ProfileDetailModal`, `showProfileModal` が並存 |
| `stepChanged` イベント | ディスパッチされるがリスナーが **0件**（デッドイベント） |
| `window.openCashoutModal` | referral-unified.js で呼出されるが定義がアクティブスクリプトに見つからない |
| Dashboard 40+ スクリプト依存 | dashboard.html が33以上のJSを読込。パフォーマンスに影響 |

**⚠ 17件のスクリプト参照切れ（HTMLが存在しないJSを参照 → 404）:**

| HTML | 存在しない JS |
|------|-------------|
| referral.html | `referral-debug-network.js`, `notifications.js` |
| events.html | `events-debug.js`（disabled-scripts/ にのみ存在） |
| admin-referral.html | `supabase-client.js`, `admin-common.js` |
| admin.html | `admin.js`, `notifications.js` |
| billing.html | `notifications.js` |
| referral-old.html | `supabase-client.js`, `referral.js` |
| referral-old2.html | `supabase-client.js`, `referral-enhanced.js` |
| referral-backup.html | `supabase-client.js`, `referral-enhanced.js` |
| activities.html | `supabase-client.js` |
| check-referral-setup.html | `supabase-client.js` |
| referral-debug.html | `supabase-client.js` |

---

## 8. Supabase バックエンド設計

### 8.1 RLS（Row Level Security）

全テーブルに RLS を適用。

**RLSパターン:**

```sql
-- P1: 自分のデータのみ
FOR ALL USING (user_id = auth.uid());

-- P2: 公開閲覧（認証済み）
FOR SELECT USING (auth.role() = 'authenticated');

-- P3: 双方向（コネクション・メッセージ）
-- connections: user_id = auth.uid() OR connected_user_id = auth.uid()
-- messages: sender_id = auth.uid() OR recipient_id = auth.uid()
FOR SELECT USING (user_id = auth.uid() OR connected_user_id = auth.uid());

-- P4: 管理者
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);
-- ※ 実際の SQL では is_admin BOOLEAN を使用。role カラムでの判定は未実装。

-- P5: Service Role（Edge Function）
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
```

**テーブル別RLSマトリクス:**

| テーブル | SELECT | INSERT | UPDATE | DELETE |
|---------|--------|--------|--------|--------|
| profiles | `is_public=true OR own` ※P2ではない | Trigger自動 | P1 本人 | P4 admin |
| connections | P3 当事者 | P1 認証済み | P3 当事者 | P4 admin |
| messages | P3 送信者/受信者 | P1 認証済み | — | — |
| notifications | P1 本人 | P1 認証済み + P5 service | P1 本人 | P1 本人 |
| events | P2 認証済み全員 | P4 admin | P4 admin | P4 admin |
| event_participants | P1+P4 | P1 認証済み | P1+P4 | — |
| event_reminders | P1 本人 | P1 認証済み | P1 本人 | P1 本人 |
| matchings | P2 認証済み | P1 認証済み | — | — |
| bookmarks | P1 本人 | P1 本人 | — | P1 本人 |
| settings | P1 本人 | Trigger自動 | P1 本人 | — |
| invite_links | P1 作成者 | P1 本人 | P1 作成者 | P1 作成者 |
| invitations | P1 当事者 | P5 service | P5 service | — |
| user_points | P1 本人 | P5 service | **⚠ P1 本人（セキュリティバグ）** | — |
| point_transactions | P1 本人 | P5 service | — | — |
| cashout_requests | P1 本人 | P1 本人 | P4 admin + P1(pending→cancelledのみ) | — |
| bookings | email一致 + P5 service | P5 service | P5 service | — |
| booking_sessions | P1+P5 | P5 service | P5 service | — |
| booking_intents | P1 本人 | P1 認証済み | — | — |
| tldv_meeting_records | P5 service | P5 service | P5 service | — |
| meeting_confirmations | P4 admin | P4 admin | — | — |
| meeting_analysis | P5 service | P5+P1 | — | — |
| user_activities | P1 本人 | P1 認証済み | — | — |
| dashboard_stats | P2 認証済み | P1 認証済み | P1 認証済み | — |
| referral_clicks | — | P1 認証済み | — | — |
| invite_history | — | P1 認証済み | — | — |
| share_activities | P1 本人 | P1 認証済み | — | — |
| meeting_minutes | P1 本人(`profile_id`) ※check-and-fix版 / P2 認証済み全員(create版) **⚠ v13: `profile_id` カラム不在** | P1 本人 | P1 本人 | P1 本人 |
| search_history | P1 本人 | P1 本人 | — | — |
| access_logs | P4 admin | P5 service | — | — |
| fraud_flags | P4+P1(自分のフラグ閲覧可) | P5 service | P4 admin | — |

**⚠ セキュリティバグ — user_points UPDATE:**
`user_points` の UPDATE ポリシーが `user_id = auth.uid()` で設定されている。
これにより一般ユーザーが自分のポイント残高を自由に変更できる（P1レベル脆弱性）。
UPDATE は P5 (service_role) のみに制限すべき。

**profiles SELECT の補足:**
`is_public = true OR auth.uid() = id` の条件。非公開プロフィールは本人以外閲覧不可。
P2（認証済み全員閲覧）ではない点に注意。

**cashout_requests UPDATE の補足:**
管理者は全レコード更新可。一般ユーザーは自分の `status='pending'` レコードを `status='cancelled'` にのみ変更可能。

### 8.1b RLSポリシー競合と追加セキュリティ問題

**⚠ 150件以上のCREATE POLICYが77のSQLファイルに散在。同テーブルに複数の競合ポリシーが存在。**
最後に実行されたSQLが勝つため、本番のポリシー状態はDB直接確認が必要。

**深刻な競合テーブル:**

| テーブル | 競合ファイル数 | 問題 |
|---------|:----------:|------|
| profiles | 4 | seed.sql版は `USING(true)` 全公開、perfect版は `is_public=true OR own OR admin email` |
| invitations | 5 | `invitee_id` vs `accepted_by` カラム名不一致、ポリシー条件が異なる |
| cashout_requests | 6 | UPDATE条件が異なる（WITH CHECK有無、status制約有無） |
| invite_links | 5 | `user_id` vs `created_by` カラム名不一致 |

**ハードコードされた管理者メール:**
```sql
-- fix-profiles-rls-policy-perfect.sql
USING (is_public = true OR auth.uid() = id OR auth.jwt() ->> 'email' = 'ooxmichaelxoo@gmail.com')
```
→ 管理者判定にメールアドレスをハードコード。`is_admin` フラグに統一すべき。

**anon ロールへの GRANT（未認証ユーザーが実行可能）:**
```sql
GRANT ALL ON cashout_requests TO anon;          -- ⚠ 最高リスク
GRANT EXECUTE ON FUNCTION create_invite_link TO anon;
GRANT EXECUTE ON FUNCTION get_user_invite_links TO anon;
GRANT EXECUTE ON FUNCTION get_referral_stats TO anon;
```
→ 未認証ユーザーがキャッシュアウトテーブルに全操作可能。即時修正必要。

**SECURITY DEFINER に SET search_path なし:**
20以上の関数が `SECURITY DEFINER` だが `SET search_path = public` がない。
→ search_path 操作によるSQLインジェクションリスク。

**RLS有効だがポリシー未定義のテーブル:**
- `event_participants` — RLS有効だがCREATE POLICY文が見つからない
- `fraud_flags` — fraud-detection-system-fixed.sql にはあるが他で上書きの可能性
- `referral_clicks` — ポリシー未定義
- `reward_processing_status` — ポリシー未定義
- `tldv_meeting_records` — ポリシー未定義
- `access_logs` — fraud-detection-system-fixed.sql にはあるが他で上書きの可能性
- `booking_intents` — ポリシー未定義

→ RLS有効 + ポリシーなし = 全アクセス拒否。意図的なら問題ないが、Edge Functionの service_role アクセスにも影響する可能性あり。

**profiles INSERT の過度に寛容なポリシー:**
```sql
-- fix-profiles-rls-policy.sql（Version 2）
FOR INSERT WITH CHECK (true)  -- ⚠ 認証済みユーザーが任意のIDでprofiles作成可能
```
→ なりすまし攻撃が可能。`WITH CHECK (auth.uid() = id)` に修正すべき。

**RLS管理者判定パターンの不整合:**
```
主流パターン（fraud-detection等）:
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)

event_certificates / referral_details:
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')

profiles（perfect版）:
  auth.jwt() ->> 'email' = 'ooxmichaelxoo@gmail.com'
```
→ 管理者判定が3パターン混在。`is_admin = TRUE` に統一すべき。

**REVOKE文が0件:**
全SQLファイルにREVOKE文なし。DROP POLICY IF EXISTS のみ使用。
→ 古いポリシーが蓄積する可能性。`DROP POLICY IF EXISTS` → `CREATE POLICY` パターンで対応はされているが、
確実にクリーンな状態にするにはポリシーの棚卸しが必要。

### 8.2 DB Functions (RPC)

フロントエンドから `.rpc()` で呼び出される関数:

| Function | 引数 | 用途 | 呼出元 |
|----------|------|------|--------|
| `create_invite_link(p_user_id, p_description)` | UUID, TEXT | 紹介リンク生成 | ※ disabled-scripts のみ。実際は referral-unified.js が invite_links に直接 INSERT |
| `get_user_invite_links(p_user_id)` | UUID | 紹介リンク一覧（RLSワークアラウンド） | referral-rls-workaround.js |
| `add_referral_points` | **⚠ バージョン競合** | 紹介ポイント付与 | referral-tracking.js, timerex-webhook |
| `add_user_points(p_user_id, p_amount, [p_type, p_description, p_reference_id])` | UUID, INT, [TEXT, TEXT, UUID] | ポイント追加（2〜5引数の2バージョン） | admin-referral.js |
| `deduct_user_points(p_user_id, p_amount)` | UUID, INT | ポイント減算 | cashout-modal.js |
| `process_referral_reward(p_invitation_id)` | UUID | 紹介報酬処理（returns JSONB） | tldv-webhook, tldv-api-integration.js, manual-meeting-confirmation.js |
| `get_referral_analytics(start_date, end_date)` | DATE, DATE | 紹介分析 | admin-referral.js |
| `get_top_referrers(limit_count)` | INT | トップ紹介者 | admin-referral.js |
| `get_referral_stats(p_user_id)` | UUID | ユーザー別紹介統計 | ※ SQL定義あり、アクティブJS未使用 |

**⚠ `add_referral_points` — 7バージョン存在（v12確認。v11記載の3は誤り）:**
```
■ TypeA（6ファイル）: referral_code TEXT → invite_links から user_id 検索 → profiles.referral_points 更新
  - 各バージョンで point_transactions のカラム名が異なる
  - 一部は notifications に content カラム、別は message カラムで INSERT

■ TypeB（2ファイル）: user_id UUID → 直接 profiles.referral_points 更新
  - invite_links の検索なし

■ 致命的競合:
  JS呼出 (referral-tracking.js — デッドコード):
    .rpc('add_referral_points', { referral_code: TEXT, points: 500, reason })

  Edge Function呼出 (timerex-webhook):
    .rpc('add_referral_points', { user_id: UUID, points: 1000, reason, booking_id })

  → 第1パラメータの型が TEXT vs UUID で互換性なし。
    PostgreSQL は named parameter matching を使うため、両バージョンは共存できない。
    最後に実行された SQL が勝つ。
```

**⚠ 他のRPC関数のバージョン爆発（v12発見）:**
```
get_referral_stats:  11バージョン（最多）— 返却カラム数が4/5/6/7で異なる。参照テーブルも profiles vs user_points で分裂
create_invite_link:  10バージョン — 返却型が JSON/TABLE/UUID の3パターン。user_id vs created_by のカラム名競合あり
deduct_user_points:  6バージョン — FOR UPDATE有無、advisory lock有無、point_transactions書込有無が異なる
add_user_points:     4バージョン — 返却型 BOOLEAN vs VOID、point_transactions のカラム名3パターン

point_transactions のカラム名が3つの命名規則で競合:
  規則1: amount, type, description, reference_id, balance_after
  規則2: transaction_type, points, reason, related_id, related_type
  規則3: points, reason, booking_id, referral_code
```

サーバー側のみで使用される関数:

**初期化・ライフサイクル:**

| Function | 用途 |
|----------|------|
| `handle_new_user()` | Trigger: ユーザー作成時に profiles/user_points/settings 生成 |
| `create_user_points_on_signup()` | Trigger: ポイントテーブル初期化 |
| `handle_auth_user_delete()` | Trigger: ユーザー削除時のクリーンアップ |
| `update_updated_at_column()` | Trigger: updated_at 自動更新 |
| `update_last_active_at()` | Trigger: 最終アクティブ日時更新 |

**不正検知:**

| Function | 用途 |
|----------|------|
| `check_duplicate_ip(ip, hours)` | 同一IP検出 |
| `check_rapid_referrals(user_id, hours)` | 高速紹介検出 |
| `check_suspicious_patterns(user_id)` | 複合パターン分析 |
| `detect_registration_fraud()` | Trigger: 登録時の自動不正検知 |
| `detect_referral_fraud()` | Trigger: 紹介時の自動不正検知 |

**イベント処理:**

| Function | 用途 |
|----------|------|
| `handle_event_registration()` | Trigger: イベント参加登録処理 |
| `handle_event_cancellation()` | Trigger: イベント参加キャンセル処理 |
| `generate_certificate_number(event_id, num)` | イベント参加証番号生成 |

**紹介・報酬処理:**

※ `add_referral_points` は7バージョン中、TypeAが `profiles.referral_points` を、TypeBが直接 `profiles.referral_points` を UPDATE。
一方 `add_user_points`/`deduct_user_points` は `user_points.available_points` を UPDATE。
ポイントが `profiles.referral_points` と `user_points.available_points` の2箇所に分散し、同期メカニズムなし（実装ギャップ #24）。

| Function | 用途 |
|----------|------|
| `process_pending_rewards()` | 未処理報酬のバッチ処理 |
| `record_tldv_meeting()` | tl;dv 面談記録作成 |
| `complete_referral_meeting()` | 紹介面談の完了処理 |
| `update_invite_link_stats()` | Trigger: 紹介リンク統計更新 |
| `get_referral_stats(p_user_id)` | ユーザー別紹介統計取得 |

**紹介リンク・招待:**

| Function | 用途 |
|----------|------|
| `create_invitation(inviter_id, email, code, link_id)` | 招待レコード作成 |
| `accept_invitation(code, user_id)` | 招待承認処理 |
| `generate_invite_code()` | ランダム招待コード生成 |
| `get_referral_link_stats(p_link_id)` | リンク別統計 |
| `get_fraud_flag_details(p_flag_id)` | 不正フラグ詳細 |
| `process_cashout_request(UUID, INT)` | キャッシュアウト処理（v12発見 — 未文書化） |
| `add_referral_reward(UUID, UUID, INT)` | 紹介報酬付与（v12発見 — 2バージョン） |
| `add_referral_points_booking(UUID, INT, TEXT, TEXT)` | 予約時報酬付与（v12発見 — create_invite_link_fixed の別名版） |
| `get_my_invite_links(UUID)` | 自分の紹介リンク取得（v12発見） |
| `accept_invitation(TEXT, UUID)` | 招待承認処理（v12発見） |

**メンテナンス:**

| Function | 用途 |
|----------|------|
| `cleanup_old_logs()` | 古い access_logs 削除 |
| `cleanup_resolved_flags()` | 解決済み fraud_flags 削除 |
| `clean_old_search_history()` | 90日以上前の検索履歴削除 |

### 8.3 Triggers

**認証・ライフサイクル:**

| Trigger | テーブル | Event | Function |
|---------|---------|-------|----------|
| `on_auth_user_created` | auth.users | INSERT | `handle_new_user()` |
| `on_auth_user_created_points` | auth.users | INSERT | `create_user_points_on_signup()` |
| `on_auth_user_deleted` | auth.users | DELETE | `handle_auth_user_delete()` |
| `update_*_updated_at` | 各テーブル | UPDATE | `update_updated_at_column()` |
| `update_profiles_last_active` | profiles | UPDATE | `update_last_active_at()` |

**不正検知:**

| Trigger | テーブル | Event | Function |
|---------|---------|-------|----------|
| `check_registration_fraud` | auth.users | INSERT | `detect_registration_fraud()` |
| `check_referral_fraud` | invitations | INSERT | `detect_referral_fraud()` |

**イベント:**

| Trigger | テーブル | Event | Function |
|---------|---------|-------|----------|
| `trigger_event_registration` | event_participants | INSERT | `handle_event_registration()` |
| `trigger_event_cancellation` | event_participants | UPDATE | `handle_event_cancellation()` |

**紹介:**

| Trigger | テーブル | Event | Function |
|---------|---------|-------|----------|
| `update_link_stats_on_invitation` | invitations | INSERT/UPDATE | `update_invite_link_stats()` |
| `process_referral_on_meeting` | meeting_minutes | INSERT | `process_referral_on_meeting()` **⚠ v13発見: FAILS — `NEW.profile_id` 参照だが meeting_minutes に `profile_id` なし（`user_id` のみ）** |

**⚠ v13発見 — Trigger関数の追加問題:**
```
update_updated_at_column(): 5以上の同一定義が複数SQLファイルに重複（実害なし、コード重複のみ）
handle_new_user(): 3バージョン存在（seed.sql / 001_migration / create-profiles-table.sql）
  → INSERT先・カラム名が全て異なる。最後に実行されたSQLが勝つ
process_referral_on_meeting(): NEW.profile_id → meeting_minutes.user_id に修正必要
```

**未実装だが必要なTrigger:**

| Trigger | テーブル | Event | Function | 用途 |
|---------|---------|-------|----------|------|
| `send_event_reminder` | event_reminders | — | 定期チェック | remind_at 到達時に通知送信 |

→ Supabase `pg_cron` で定期実行し、`reminder_timing` と `event_date` を比較して `is_sent = false` のレコードを処理し `notifications` に INSERT する。

### 8.4 Edge Functions

#### `line-oauth-callback`
**状態**: 現在 Netlify Function として稼働 → Supabase Edge Function に移行予定

1. LINE 認証コードでアクセストークン取得
2. LINE プロフィール取得
3. Supabase Auth ユーザー作成/更新（`listUsers()` で既存ユーザー検索 **⚠ フィルタなし全件取得**）
4. JWT + リダイレクトURL返却

**⚠ v13発見 — セキュリティ問題:**
- LINE_CHANNEL_ID にハードコードフォールバック `'2007688781'`（環境変数未設定時に使用）
- エラー詳細をクライアントに返却（内部構造の情報漏洩）
- CSRF保護は実装済み（state/nonce を sessionStorage で管理）✓
- Auth token refresh は設定済み（persistSession: true, autoRefreshToken: true）✓

#### `timerex-webhook` (稼働中)
Webhook署名検証: `X-TimeRex-Signature` (HMAC SHA-256)

**⚠ v13発見 — 重大なセキュリティ問題:**
```
1. 署名検証がOPTIONAL: if (signature) { verify } — 署名ヘッダーなしでリクエスト送信すると検証をバイパス可能
   → 攻撃者が任意のWebhookイベントを偽造できる（bookings作成、ポイント付与等）
   修正: 署名がない場合はリクエストを拒否すべき

2. タイミング攻撃脆弱性: 署名比較に !== を使用（crypto.timingSafeEqual を使用すべき）
   → 理論的にサイドチャネル攻撃で署名を推測可能

3. bookings の INSERT/UPDATE 不整合:
   INSERT: booking_id カラムで保存
   UPDATE: timerex_id カラムでフィルタ
   → 同一レコードの INSERT と UPDATE で異なるカラムを使用。UPDATE がヒットしない可能性

4. DB エラーのサイレント失敗: エラーをログ出力するがスローしない → 部分的な処理完了状態が発生
```

テーブルアクセス: `bookings`(W), `invite_links`(R), `notifications`(W)
RPC呼出: `add_referral_points()`

| Event | 処理 |
|-------|------|
| `booking.created` | bookings INSERT → invite_links から紹介者検索 → notifications INSERT（紹介者に通知） |
| `booking.completed` | bookings UPDATE(status=completed) → `add_referral_points(紹介者, 1000)` → notifications INSERT |
| `booking.cancelled` | bookings UPDATE(status=cancelled) |

#### `timerex-booking` (稼働中)
1. TimeRex API にセッション作成
2. booking_sessions に保存
3. 予約URL返却

**⚠ v13発見 — セキュリティ・実装問題:**
```
1. 認証なし: Authorization ヘッダーのチェックなし。誰でもセッション作成APIを呼出可能
   → 不正な予約セッションの大量作成が可能

2. TimeRex API キーのハードコード: 7nxFkWUc...（既知 — ギャップ#5）

3. レスポンス偽装: 失敗時もフォールバックで { success: true } を返却
   → クライアントが成功と誤認、ユーザーに誤った予約完了を表示

4. Request Body 二重消費バグ: line 19 で body 読取後、line 104 で再度読取を試みる
   → 2回目の読取は空になり、処理が失敗する可能性
```

#### `tldv-webhook` (稼働中)
Webhook署名検証: `x-tldv-signature` (HMAC-SHA256) **⚠ タイミング攻撃脆弱性あり（v13発見 — `!==` 使用）**

| Event | 処理 |
|-------|------|
| `meeting.ended` | invitee_email で invitation 検索 → tldv_meeting_records 作成 → 15分以上なら `process_referral_reward()` |
| `recording.ready` | recording_url 保存 |
| `transcript.ready` | transcript_url 保存 |

### 8.5 Realtime 購読

**v14 完全監査結果: 11アクティブ購読 + 3無効化スクリプト内購読**

**通知系（notifications-realtime-unified.js — 5購読）:**

| テーブル | イベント | フィルタ | 用途 | クリーンアップ |
|---------|---------|---------|------|-------------|
| notifications | INSERT | `user_id=eq.${userId}` | 新着通知 | ✓ unload |
| messages | INSERT | `receiver_id=eq.${userId}` | 新着メッセージ | ✓ unload |
| **matches** | * | `user1_id` / `user2_id` | マッチング更新 | ✓ unload |
| event_participants | INSERT | `user_id=eq.${userId}` | イベント参加更新 | ✓ unload |
| **referrals** | * | **`referrer_id`**`=eq.${userId}` | 紹介更新 | ✓ unload |

**⚠ テーブル名・カラム名不一致（実装ギャップ #4、v14再確認）:**
- `matches` → 実テーブル名は `matchings`（購読が**サイレント失敗**）
- `referrals` → 実テーブル名は `invitations`（購読が**サイレント失敗**）
- `referrer_id` → 実カラム名は `inviter_id`（購読が**サイレント失敗**）
- `receiver_id` → messages テーブルの実カラム名は `recipient_id`（ただし messages テーブル自体が実質未使用）

**通知系（notifications-unified.js — 1購読）:**

| テーブル | イベント | フィルタ | 用途 | クリーンアップ |
|---------|---------|---------|------|-------------|
| notifications | INSERT | `user_id=eq.${userId}` | 通知同期 | ✓ unload |

**コネクション系（2ファイル — 2購読）:**

| テーブル | イベント | フィルタ | 用途 | 呼出元 | クリーンアップ |
|---------|---------|---------|------|--------|-------------|
| connections | * | `user_id` + `connected_user_id` 双方向 | コネクション状態変化 | members-connection.js | ✓ cleanup() |
| connections | * | `user_id` + `connected_user_id` 双方向 | コネクション状態変化 | connections-manager-simple.js | **🔴 なし — メモリリーク** |

**プロフィール系（2ファイル — 2購読）:**

| テーブル | イベント | フィルタ | 用途 | 呼出元 | クリーンアップ |
|---------|---------|---------|------|--------|-------------|
| **profiles** | * | **フィルタなし（全変更）** | プロフィール変更 | members-supabase.js | ✓ removeChannel() |
| user_profiles | * | **フィルタなし（全変更）** | マッチング用プロフィール更新 | matching-realtime-updates.js | ✓ unload |

**⚠ v14発見:**
- `members-supabase.js` が `profiles` テーブルを購読（実テーブルは `user_profiles`）→ **サイレント失敗**
- 両ファイルとも**フィルタなし** → 全ユーザーの変更通知を受信。RLS が Realtime をブロックしない場合、**過剰なイベント受信**（パフォーマンス劣化 + 潜在的なデータ漏洩リスク）

**ダッシュボード系（dashboard-updater.js — 3購読）:**

| テーブル | イベント | フィルタ | 用途 | クリーンアップ |
|---------|---------|---------|------|-------------|
| dashboard_stats | * | — | 統計データ更新 | ✓ destroy() |
| user_activities | INSERT | — | アクティビティフィード | ✓ destroy() |
| events | * | — | イベントデータ更新 | ✓ destroy() |

**管理系（admin-referral.js — 2購読）:**

| テーブル | イベント | フィルタ | 用途 | クリーンアップ |
|---------|---------|---------|------|-------------|
| invitations | * | — | 紹介データ更新 | **🔴 なし — メモリリーク** |
| cashout_requests | * | — | キャッシュアウト更新 | **🔴 なし — メモリリーク** |

**⚠ v14発見 — メモリリーク:**
- `connections-manager-simple.js`（line 733-757）: 購読は `this.subscription` に格納されるが、`unsubscribe()` / `removeChannel()` を呼ぶコードが存在しない
- `admin-referral.js`（lines 627-650）: 2つの購読が変数に格納されず、クリーンアップ不可能

**クリーンアップ状況サマリー:**

| ファイル | 購読数 | クリーンアップ | ステータス |
|---------|:-----:|-------------|---------|
| notifications-unified.js | 1 | ✓ unload | OK |
| notifications-realtime-unified.js | 5 | ✓ unload | **テーブル名不一致** |
| members-supabase.js | 1 | ✓ removeChannel() | **テーブル名不一致 + フィルタなし** |
| members-connection.js | 1 | ✓ cleanup() | OK |
| matching-realtime-updates.js | 1 | ✓ unload | **フィルタなし** |
| connections-manager-simple.js | 1 | **🔴 なし** | **メモリリーク** |
| dashboard-updater.js | 3 | ✓ destroy() | OK |
| admin-referral.js | 2 | **🔴 なし** | **メモリリーク** |

### 8.6 Storage

| Bucket | 公開 | 書込権限 | 最大サイズ | 形式 |
|--------|------|---------|-----------|------|
| `avatars` | Public read | 本人のみ | 5MB | jpeg, png, gif, webp |
| `covers` | Public read | 本人のみ | 10MB | jpeg, png, gif, webp |

パス: `{bucket}/{user_id}/{filename}`

---

## 9. Netlify設定

静的ホスティングが主目的。LINE OAuth 移行完了後にサーバーサイドロジックを完全除去予定。

```toml
[build]
  publish = "."                # ⚠ v14発見: ルート全体をデプロイ → SQL/.env 等が公開される
  command = "npm install --prefix netlify/functions"

[build.environment]
  NODE_VERSION = "18"

# ★移行完了後に削除
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

# ★移行完了後に削除
[[plugins]]
  package = "@netlify/plugin-functions-install-core"

# Netlify Functions 用 CORS（★移行完了後に削除）
[[headers]]
  for = "/.netlify/functions/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"    # ⚠ 全ドメイン許可
    Access-Control-Allow-Headers = "Content-Type"
    Access-Control-Allow-Methods = "POST, OPTIONS"

# セキュリティヘッダー
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"    # ⚠ _headers ファイルと競合（後述）
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"

# 紹介リンクのリダイレクト
[[redirects]]
  from = "/invite/*"
  to = "/index.html"
  status = 200

# TimeRex Webhook受信（Supabase Edge Function にプロキシ）
[[redirects]]
  from = "/api/timerex-webhook"
  to = "https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/timerex-webhook"
  # ⚠ v14発見: プレースホルダー未設定 → プロキシが 404/DNS エラー
  status = 200
  force = true

# TimeRex 予約セッション作成API
[[redirects]]
  from = "/api/timerex-booking"
  to = "https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/timerex-booking"
  # ⚠ v14発見: プレースホルダー未設定 → プロキシが 404/DNS エラー
  status = 200
  force = true
```

**⚠ v14発見 — Netlify設定の重大な問題:**
```
1. publish = "." → プロジェクトルート全体（SQL/設定/.env含む）がCDNにデプロイされる
   修正: publish = "public" に変更し、HTML/CSS/JS/assets のみを公開ディレクトリに配置

2. Webhook プロキシURL が YOUR_SUPABASE_PROJECT_REF のまま → 機能しない
   修正: https://whyoqhhzwtlxprhizmor.supabase.co/functions/v1/... に設定

3. SUPABASE_SERVICE_KEY が .env ファイルに不在 → LINE認証が実行時エラー
   修正: Netlify Dashboard の環境変数に SUPABASE_SERVICE_KEY を追加

4. @supabase/supabase-js のバージョン不一致:
   ルート package.json: ^2.52.1
   netlify/functions/package.json: ^2.39.0
   → 互換性問題の可能性。バージョンを統一すべき

5. _headers ファイルとの競合:
   netlify.toml: X-Frame-Options = "DENY"
   _headers / includes/security-meta.html: X-Frame-Options = "SAMEORIGIN"
   → Netlify は netlify.toml > _headers の優先順位。DENY が適用される
```

**_headers ファイル（キャッシュ制御）:**
```
/assets/*.mp4  → Cache-Control: public, max-age=31536000, immutable
/assets/*      → Cache-Control: public, max-age=31536000, immutable
/*.html        → Cache-Control: no-cache, no-store, must-revalidate
/js/*          → Cache-Control: no-cache, no-store, must-revalidate
/css/*         → Cache-Control: public, max-age=300, must-revalidate
```

**Netlify Functions ユーティリティ（v14発見 — 未使用）:**
`netlify/functions/utils/security.js` に CSRF state生成・Rate Limit・XSSエスケープ・リクエストバリデーション等が**実装済み**だが、
`line-auth-simple-v4.js` からインポート/使用されていない。この保護機能を有効化すべき。

移行完了後の削除対象:
1. `[functions]` セクション
2. `[[plugins]]` セクション
3. `/.netlify/functions/*` 用 CORS ヘッダー
4. `netlify/functions/` ディレクトリ
5. Webhook プロキシ `[[redirects]]` (Edge Function に直接アクセスに変更)

---

## 10. セキュリティ

### Frontend
- XSS防止: `safe-dom-utils.js`
- CSRF防止: LINE OAuth state/nonce
- 安全なStorage: `safe-storage.js`
- 入力サニタイズ: `sanitizer.js`
- メタタグ: `includes/security-meta.html`（X-Frame-Options: SAMEORIGIN）

※ `netlify.toml` では X-Frame-Options: DENY。`includes/security-meta.html` では SAMEORIGIN。整合性要確認。

### Backend
- 全テーブル RLS 適用（※ ただし7テーブルでポリシー未定義）
- Service Key は Edge Functions 内のみ
- JWT 有効期限 3,600秒
- Webhook 署名検証（TimeRex SHA256 / tl;dv HMAC-SHA256）

### v15追加 — 露出した秘密情報（即時対応必要）

| 種類 | 場所 | リスク |
|------|------|--------|
| **TimeRex APIキー** | `supabase/functions/timerex-booking/index.ts:10` に平文 `7nxFkWUcjmbEXpXAoeP5TujgbH7Zrk7p8nbAmMYcAfoCdM6RgnI2qK6lSEpZaGAp` | リポジトリにアクセスできる全員がTimeRex APIを操作可能。**キーローテーション + 環境変数化が必須** |
| **Supabase anon key** | `invite.html:269-270` に平文（`smpmnkypzblmmlnwgmsj` プロジェクト） | ソースコードから別プロジェクトのURLとキーが露出。anon keyは公開可だがプロジェクトURLとセットで露出 |
| **Supabase anon key** | `js/supabase-unified.js:17-18` に平文（メインプロジェクト） | anon keyは設計上公開可だが、RLSポリシーの不備（user_points UPDATE P1、anon GRANT等）と組合わせるとリスク増大 |
| **LINE CHANNEL_ID** | `line-auth-simple-v4.js` にフォールバック値 `2007688781` | 環境変数未設定時に意図しないLINEアプリへ接続 |

### v15追加 — ページ別セキュリティ評価

| ページ | 認証チェック | DB読取 | DB書込 | Realtime | メモリリーク | 重大問題 |
|--------|:----------:|:------:|:------:|:--------:|:----------:|---------|
| register.html | なし(公開) | なし | auth.users, profiles | なし | なし | QR未保存、race condition |
| login.html | なし(公開) | なし | auth.users | なし | なし | LINE OAuth壊れている |
| dashboard.html | あり | profiles,events,members,activities | user_activities | events | **あり** | 3テーブル名フォールバック |
| matching.html | あり | profiles,connections | connections,notifications | profiles | **あり** | NULL配列で失敗 |
| connections.html | あり | connections,profiles | connections,notifications | connections | **あり** | CHECK制約違反 |
| referral.html | あり | invite_links,invitations,user_points | invite_links,invitations,cashout_requests | 不明 | 可能性あり | 承認前ポイント減算 |
| admin.html | あり(形式的) | **なし** | **なし** | なし | なし | **UIスタブのみ** |
| super-admin.html | **なし** | **なし** | **なし** | なし | なし | **ハードコードデモデータ** |
| settings.html | あり | **なし** | **なし** | なし | なし | **UIスタブのみ** |
| invite.html | なし(公開) | invite_links(別DB) | なし | なし | なし | **別Supabaseプロジェクト** |
- **⚠ 全Edge Functions/Netlify Functions で CORS `Access-Control-Allow-Origin: *`** — 任意ドメインからの呼出可能
- **⚠ `anon` ロールへの GRANT** — 未認証ユーザーが cashout_requests 等に操作可能
- **⚠ v13発見: timerex-webhook の署名検証がOPTIONAL** — 署名ヘッダーなしでバイパス可能
- **⚠ v13発見: timerex-booking に認証なし** — 誰でも予約セッション作成可能
- **⚠ v13発見: 全Webhook署名検証にタイミング攻撃脆弱性** — `!==` 使用（`crypto.timingSafeEqual` 未使用）
- **⚠ v13発見: 全Edge/Netlify Functions で入力バリデーションなし**
- **⚠ v13発見: line-auth-simple-v4.js がエラー詳細をクライアントに返却** — 内部構造の情報漏洩
- **⚠ v14発見: `publish = "."` でプロジェクトルート全体がCDNにデプロイ** — SQL/.env/設定ファイルが公開
- **⚠ v14発見: netlify.toml の Webhook プロキシ URL がプレースホルダー** — timerex-webhook/booking が機能しない
- **⚠ v14発見: SUPABASE_SERVICE_KEY が .env に不在** — LINE 認証が実行時エラー
- **⚠ v14発見: `netlify/functions/utils/security.js` に CSRF/Rate Limit が実装済みだが未使用**

### Supabase クライアント初期化（v13追加）

**⚠ CRITICAL: `invite.html` が別の Supabase プロジェクトに接続:**
```
メインアプリ（supabase-unified.js）: https://whyoqhhzwtlxprhizmor.supabase.co
invite.html（インライン定義）:        https://smpmnkypzblmmlnwgmsj.supabase.co  ← 別プロジェクト！
```
→ invite.html で紹介リンクの検証・クリック追跡が行われるが、メインDBとは**完全に別のデータベース**に書込まれる。
→ 紹介フロー全体が機能しない可能性が高い。invite.html のSupabase設定をメインプロジェクトに統一すべき。

**Supabase createClient() の全8箇所:**

| 場所 | ファイル | プロジェクト | 認証情報 |
|------|---------|------------|---------|
| Frontend | supabase-unified.js (line 17-18) | whyoqhhzwtlxprhizmor | anon key ハードコード |
| Frontend | supabase-client.js（デッドコード） | whyoqhhzwtlxprhizmor | anon key ハードコード |
| Frontend | invite.html（インライン） | **smpmnkypzblmmlnwgmsj** | **別の anon key** |
| Backend | line-auth-simple-v4.js | 環境変数 | service role key |
| Backend | tldv-webhook/index.ts | 環境変数 | service role key |
| Backend | timerex-webhook/index.ts | 環境変数 | service role key |
| Backend | timerex-booking/index.ts | 環境変数 | service role key |
| Setup | setup-supabase-env.js | 環境変数 | service role key |

→ フロントエンドの anon key ハードコードは許容範囲（RLSで保護）だが、プロジェクトURL不一致は致命的。

### フォーム → DB カラムマッピング（v14追加）

**register.html 登録フォーム（5ステップ）→ user_profiles INSERT:**

| HTML フォームフィールド | DB カラム | 変換 |
|---------------------|----------|------|
| `#name` | `name`, `full_name` | 同一値を両カラムに保存 |
| `#company` | `company` | 直接 |
| `#email` | `email` | 直接（auth.signUp にも使用） |
| `#password` | (auth.users) | auth.signUp のみ、profiles に保存しない |
| `#password-confirm` | — | バリデーションのみ、保存しない |
| `#phone` | `phone` | 直接 |
| `#line-id` | `line_id` | kebab → snake 変換 |
| `#line-qr` | **⚠ 未保存** | ファイルアップロードが収集されるが DB にも Storage にも保存されない |
| `#position` | `position` | 直接 |
| `#budget` | `budget_range` | **フィールド名 ≠ カラム名** |
| `#skills-pr` | `bio` | **フィールド名 ≠ カラム名** |
| `#revenue-details` | `revenue_details` | kebab → snake |
| `#hr-details` | `hr_details` | kebab → snake |
| `#dx-details` | `dx_details` | kebab → snake |
| `#strategy-details` | `strategy_details` | kebab → snake |
| `input[name="skills"]` | `skills` (TEXT[]) | チェックボックス配列 |
| `input[name="interests"]` | `interests` (TEXT[]) | チェックボックス配列 |
| `input[name="challenges"]` | **⚠ 未保存** | チェックボックスの選択値は保存されない。詳細テキストのみ保存 |
| `input[name="agree"]` | — | バリデーションのみ |
| `input[name="newsletter"]` | — | バリデーションのみ |

**⚠ v14発見 — 保存されないフォームデータ:**
1. `#line-qr` ファイル: ファイル選択UIがあるが、Storage にアップロードするコードが存在しない
2. `input[name="challenges"]`: ビジネス課題の選択値（新規顧客獲得、DX推進等）が配列として保存されない。
   個別の詳細テキスト（revenue_details, hr_details 等）のみが user_profiles に保存される
3. `input[name="newsletter"]`: ニュースレター購読の意思表示が保存されない

**cashout-modal.js → cashout_requests INSERT:**

| フォームフィールド | DB カラム | 備考 |
|-----------------|----------|------|
| `#cashoutAmount` | `points` | 金額ではなくポイント数 |
| (計算) | `gross_amount`, `tax_amount`, `net_amount` | 10.21%源泉徴収計算 |
| `#bankName` | `bank_name` | **⚠ SQL定義が JSONB vs TEXT で分裂** |
| `#branchName` | `branch_name` | 同上 |
| `#branchCode` | `branch_code` | 同上 |
| `#accountType` | `account_type` | 同上 |
| `#accountNumber` | `account_number` | 最大7桁 |
| `#accountHolder` | `account_holder` | カタカナのみ |

### 不正検知

```
アクション → access_logs 記録
    │
    ├── check_duplicate_ip(ip, 24h)    同一IP複数ユーザー
    ├── check_rapid_referrals(user, 1h) 短時間大量紹介
    └── check_suspicious_patterns(user) 複合パターン
    │
    ▼
fraud_score (0.00 - 1.00)
    ├── < 0.3  → 自動承認
    ├── 0.3-0.7 → fraud_flags → 管理者レビュー
    └── > 0.7  → 自動拒否 + 管理者通知
```

---

## 11. データフロー

### 11.1 紹介 → 登録 → 面談 → 報酬

```
1. 紹介リンク共有
   │  share_activities 記録
   ▼
2. リンククリック → invite.html
   │  referral_clicks 記録
   │  invite_history 記録
   │  referral_code をセッション保存
   │  **⚠ v13発見: invite.html は別のSupabaseプロジェクトに接続 → 記録がメインDBに届かない**
   ▼
3. register.html → Supabase Auth signUp
   │  Trigger: handle_new_user()
   │  → profiles / user_points / settings 作成
   ▼
4. invitations レコード作成（⚠ 2つのアクティブJSファイルがINSERT → 重複リスク）
   │  register-with-invite.js（capture phase）/ register-referral-handler.js（window.register ラップ）
   │  ※ referral-tracking.js はデッドコード（HTMLから未読込）
   │  invite_links.used_count++ ← ⚠ registration-flow.js も独立して UPDATE → 二重加算リスク
   │  access_logs 記録
   ▼
5. 相談予約 → Edge Function: timerex-booking
   │  → TimeRex API セッション作成
   │  → booking_sessions 保存
   │  (カレンダー連携時は booking_intents も記録)
   ▼
6. 予約確定 → TimeRex Webhook: booking.created
   │  → bookings 作成
   │  → 紹介者に notifications INSERT
   ▼
7. 面談実施 → 2経路で検証:

   経路A: TimeRex Webhook: booking.completed
   │  → add_referral_points(紹介者, 1000)
   │  → user_points 更新 + point_transactions 記録
   │  → 紹介者に notifications INSERT

   経路B: tl;dv Webhook: meeting.ended
   │  → tldv_meeting_records 作成
   │  → duration >= 15分 → process_referral_reward()
   │  → meeting_analysis (AI分析データ保存)

   経路C: 手動確認 (tl;dv未検出時)
   │  → meeting_confirmations 作成（管理者操作）
   │  → process_referral_reward()
   ▼
8. キャッシュアウト申請
   │  → cashout_requests 作成
   │  → deduct_user_points() ※要改善: 承認後に実行すべき
   │  → 管理者レビュー → 承認/拒否
   │  → 拒否時: add_user_points() で返金
```

---

## 12. SQLファイル管理状況（v14追加）

### 12.1 ファイル構成

**合計122個のSQLファイル（v15更新）:**
```
supabase/migrations/   → 1ファイル (001_create_users_table.sql)
supabase/             → 1ファイル (seed.sql)
sql/                  → ~84ファイル（本体ビジネスロジック）
sql-archive/          → ~31ファイル（廃止版）
ルート                → ~5ファイル（.sql / setup系）
ルート直下            → ~4ファイル（スポット修正）
```

### 12.2 テーブル定義の重大な競合

| テーブル | 競合ファイル数 | 主な競合内容 |
|---------|:----------:|------------|
| **profiles** | 4+ | seed.sql vs check-and-fix-tables.sql vs complete-referral-setup.sql — カラムセットが大幅に異なる |
| **invitations** | 4+ | カラム構造が incompatible（email-based vs UUID-based、カラム名 inviter_email vs inviter_id） |
| **invite_links** | 4+ | `created_by` vs `user_id` カラム名競合。カウントカラム名も不統一 |
| **cashout_requests** | 5+ | `bank_info JSONB` vs 個別 TEXT カラム。amount vs points_amount |
| **meeting_minutes** | 2 | `profile_id FK→profiles` vs `user_id FK→auth.users` + カラムセット相違 |
| **connections** | 2 | FK先が `profiles(id)` vs `auth.users(id)` で不整合 |
| **user_points** | 3+ | カラムセットが不統一。ALTER TABLE による追加カラムの競合 |

### 12.3 関数オーバーロードの競合

```
create_invite_link:    6+ バージョン（シグネチャ: UUID/UUID,TEXT/UUID,TEXT,INTEGER）
get_referral_stats:    5+ バージョン（返却カラム数: 4/5/6/7 で異なる）
add_referral_points:   異なるシグネチャが共存（TEXT vs UUID の第1パラメータ）
deduct_user_points:    異なるロック戦略（FOR UPDATE / advisory lock / なし）
update_updated_at_column: 5+ファイルに同一定義が重複
```

### 12.4 トリガー競合

```
on_auth_user_created:
  seed.sql       → handle_new_user() → profiles + settings に INSERT
  001_migration  → handle_new_user() → public.users に INSERT
  ※ 同一トリガー名で異なるロジック。後から実行された SQL が勝つ

update_*_updated_at:
  多数のファイルで CREATE TRIGGER（DROP IF EXISTS なし）→ 再実行時にエラー
```

### 12.5 実行順序の問題

```
正式なマイグレーションシーケンスが存在しない。
dependencies:
  1. auth.users     → Supabase 提供（SQL ファイル外）
  2. profiles       → 他の多くのテーブルの FK 先
  3. invitations    → referral_details の FK 先
  4. invite_links   → 関数 create_invite_link の INSERT 先
  5. user_points    → get_referral_stats の参照先

問題:
  - meeting_minutes in referral-system-schema.sql が referral_details への FK を持つが、
    referral_details が後で定義される（循環/未解決参照）
  - event_participants が events テーブルを参照するが、events の CREATE TABLE がない
  - ほとんどの CREATE TRIGGER に IF NOT EXISTS / DROP IF EXISTS がない → 再実行不可

複数の "FINAL" テストデータファイル:
  - ABSOLUTE-FINAL-test-data.sql
  - FINAL-PERFECT-test-data.sql
  - ULTIMATE-FINAL-test-data.sql
  → どれが最新か不明。1つに統合すべき
```

---

## 13. 外部API連携

| サービス | 用途 | 連携方法 | 認証情報 |
|---------|------|---------|---------|
| LINE Login | OAuth認証 | Edge Function → LINE API | CHANNEL_ID + CHANNEL_SECRET |
| TimeRex | 相談予約 | Edge Function ↔ TimeRex API | TIMEREX_API_KEY + WEBHOOK_SECRET |
| tl;dv | 面談録画検証 | Webhook受信 | TLDV_WEBHOOK_SECRET |

---

## 14. 移行: Netlify Functions → Supabase Edge Functions

### 現状
```
netlify/functions/
├── line-auth-simple-v4.js     ← LINE OAuth (Node.js)
├── test-env.js                ← デバッグ用（環境変数チェック）※本番削除対象
└── utils/
    ├── error-handler.js       ← エラークラス (ValidationError, AuthenticationError 等)
    └── security.js            ← CSRF state生成, Rate Limit, XSSエスケープ
```
※ `test-env.js` は環境変数の存在確認を返すデバッグ関数。本番では削除すべき。
**⚠ v13発見:** test-env.js は環境変数の**部分的な値**も返却する（名前の存在だけでなく値の先頭部分が露出）。
認証なしで `/.netlify/functions/test-env` にアクセス可能 → 即時削除が必要。

### 目標
```
supabase/functions/
├── line-oauth-callback/       ← LINE OAuth (Deno/TS)  ★移行
├── timerex-webhook/           ← 稼働中
├── timerex-booking/           ← 稼働中
└── tldv-webhook/              ← 稼働中
```

### 手順
1. `line-auth-simple-v4.js` を Deno Edge Function に書き換え
2. `line-callback.html` の呼び出し先を Edge Function URL に変更
3. LINE Developer Console コールバックURL更新
4. 動作確認
5. `netlify/functions/` 削除
6. `netlify.toml` から `[functions]` 削除
7. 環境変数を Supabase ダッシュボードに移行

---

## 15. 実装ギャップ（要対応）

| # | 課題 | 影響度 | 対応方針 |
|---|------|--------|---------|
| 1 | LINE OAuth が Netlify Function に残存 | 高 | Supabase Edge Function に移行 |
| 2 | ポイント操作がフロントから RPC 呼出可能 | 高 | RPC に SECURITY DEFINER + 検証ロジック追加、または Edge Function 経由に変更 |
| 3 | キャッシュアウト時にポイントが承認前に減算される | 高 | 管理者承認後に減算する処理フローに変更 |
| 4 | Realtime 購読のテーブル名・カラム名不一致 | 高 | `notifications-realtime-unified.js` 内: `matches`→`matchings`、`referrals`→`invitations`、`receiver_id`→`recipient_id` に修正 |
| 5 | TIMEREX_API_KEY が `timerex-booking/index.ts` にハードコード | 高 | 環境変数に移行、キーをローテーション |
| 6 | `.env` ファイルに認証情報がリポジトリに含まれている | 高 | `.gitignore` に追加済み（v13確認）だが、過去のコミット履歴に残っている可能性。全キーをローテーション |
| 7 | イベントリマインダーの送信トリガーが未実装 | 中 | pg_cron で定期実行し notifications に INSERT |
| 8 | ダッシュボードチャート用VIEW未定義 | 中 | `member_growth_stats`, `event_stats`, `industry_distribution` の VIEW を SQL で作成 |
| 9 | profiles / user_profiles / members テーブル重複（3テーブル） | 中 | profiles に統合、JS の .from() を書換 |
| 10 | events / event_items テーブル重複 | 中 | events に統合、JS の .from() を書換 |
| 11 | activities / user_activities テーブル重複 | 低 | user_activities に統合 |
| 12 | billing.html が空のプレースホルダー | 低 | 決済システム未実装（外部処理 or 将来実装） |
| 13 | messages テーブルのカラム名が JS 内で不統一 | 中 | `recipient_id` / `to_user_id` / `receiver_id` が混在。統一すべき |
| 14 | messages テーブルの CREATE TABLE SQL が未管理 | 低 | SQL 移行ファイルにスキーマ定義を追加 |
| 15 | point_transactions の type 制約が SQL バージョン間で不統一 | 低 | `referral_reward/cashout/manual_adjustment/bonus` に統一 |
| 16 | `profiles.is_admin` が CREATE TABLE / ALTER TABLE に未定義 | 高 | RLS + JS で使用中だが、カラムの CREATE 文がSQL に存在しない。ALTER TABLE で追加必要 |
| 17 | `invitations.invite_code` vs `invitation_code` 不一致 | 中 | JS は `invite_code`、SQL は `invitation_code`。どちらかに統一 |
| 18 | `booking_sessions` のカラム名不一致 | 中 | SQL: `timerex_session_id`/`timerex_data`、Edge Function TS: `session_id`/`session_data` |
| 19 | **user_points UPDATE がP1（セキュリティバグ）** | **最高** | `user_id = auth.uid()` でUPDATE許可 → ユーザーがポイント残高を自由に変更可能。P5 (service_role) のみに制限すべき |
| 20 | LINE OAuth メタデータキー不一致 | 高 | Netlify Functionが設定する `name`/`picture` と handle_new_user() が参照する `username`/`full_name`/`avatar_url` が不一致 → LINE ユーザーのプロフィールが NULL |
| 21 | handle_new_user() のバージョン競合 | 高 | seed.sql版(→profiles)と001_migration版(→public.users)が共存。適用順序で挙動が変わる |
| 22 | `public.users` テーブルが `profiles` と重複 | 中 | 001_create_users_table.sql で定義。handle_new_user() の INSERT先が profiles でなく public.users になるバージョンあり |
| 23 | `cashout_requests.request_number` が未生成 | 中 | SQL定義は NOT NULL UNIQUE だが、JS（cashout-modal.js）は INSERT時に request_number を含めていない → INSERT失敗の可能性 |
| 24 | `add_referral_points` が `profiles.referral_points` を更新 | 中 | `user_points.available_points` ではなく `profiles.referral_points` を更新。ポイント管理が2箇所に分散 |
| 25 | cashout_requests カラム名のSQL/JS不一致 | 中 | JS: `amount`/`gross_amount`/`bank_info`、一部SQL: `points_amount`/`cash_amount`/`bank_details` |
| 26 | **RLSポリシー150件以上が77ファイルに散在・競合** | **最高** | profiles/invitations/cashout_requests/invite_links で深刻な競合。最終適用状態はDB直接確認が必要 |
| 27 | **anon ロールに重要関数のGRANT** | **最高** | `GRANT ALL ON cashout_requests TO anon` 等。未認証ユーザーがキャッシュアウトテーブルに全操作可能 |
| 28 | **プロフィールRLSにハードコード管理者メール** | 高 | `ooxmichaelxoo@gmail.com` が profiles RLS の SELECT/INSERT/UPDATE/DELETE で使用。`is_admin` に統一すべき |
| 29 | SECURITY DEFINER 関数に SET search_path なし | 高 | 20以上の関数で search_path 操作によるインジェクションリスク |
| 30 | `add_referral_points` のバージョン爆発 | **最高** | **7バージョン**存在（v12確認。v11の3は誤り）。JS(referral_code TEXT)とEdge(user_id UUID)で第1パラメータ型が非互換。PostgreSQLで共存不可 |
| 31 | JS は `user_profiles` を使用、Edge Functions は `profiles` を使用 | 高 | テーブル名が統一されていない。`picture_url`/`cover_url` は user_profiles 固有の可能性 |
| 32 | `meeting_analysis` カラム名不一致 | 中 | JS: `analysis_result` + `is_quality_meeting`、旧文書: `analysis_data` |
| 33 | `create_invite_link` RPC がアクティブJSで未使用 | 中 | disabled-scripts のみ。referral-unified.js は invite_links に直接 INSERT |
| 34 | RLS有効だがポリシー未定義のテーブルが7つ | 中 | event_participants, referral_clicks, reward_processing_status, tldv_meeting_records, access_logs, booking_intents 等 |
| 35 | `test-env.js` デバッグ用Netlify Function が残存 | 中 | 環境変数の存在を返す。本番では削除すべき |
| 36 | 環境変数名の不統一（VITE_プレフィックス、SERVICE_KEY名） | 低 | .env: VITE_*、Edge: 非VITE、Netlify: SUPABASE_SERVICE_KEY（_ROLE_なし） |
| 37 | **notifications INSERT が11箇所に分散・カラムセット不統一** | **高** | matching-unified.js は `content`/`category`/`icon`/`priority`/`related_id`/`related_type` を使用、他は `message`/`link`/`actions`。統一されたINSERT関数が必要 |
| 38 | **invitations INSERT が2ファイルから重複実行** | **高** | register-with-invite.js / register-referral-handler.js が同一register.htmlで同時ロード（v12修正: referral-tracking.jsはデッドコード→3→2に訂正）。加えて invite_links.used_count の二重インクリメントリスク |
| 39 | キャッシュアウト INSERT とポイント減算が非アトミック | 高 | cashout-modal.js: INSERT → .rpc('deduct_user_points') の順序。RPC失敗時にレコードのみ残る |
| 40 | `invite_links` の JS INSERT カラム名がSQL定義と不一致 | 高 | JS: `referral_count`/`conversion_count`、SQL: `registration_count`/`completion_count` → INSERT失敗の可能性 |
| 41 | `invite_history` の JS INSERT カラム名がSQL定義と完全不一致 | 高 | JS: `invite_link_id`/`ip_address`/`user_agent`、SQL: `invite_code`/`visitor_info` |
| 42 | `share_activities` の JS INSERT カラム名がSQL定義と全不一致 | 高 | JS: `platform`/`share_url`/`shared_at`、SQL: `share_type`/`shared_url`/`created_at` |
| 43 | `user_activities` の JS INSERT カラム名がSQL定義と不一致 | 中 | JS: `activity_detail`/`related_id`、SQL: `description`/`metadata` |
| 44 | `settings` テーブルが JS から一切アクセスなし | 中 | `.from('settings')` の呼出が0件。handle_new_user() が INSERT するのみ。実質未使用 |
| 45 | `messages` テーブルが実質未使用 | 中 | message-integration.js の INSERT がコメントアウト（「メッセージテーブルがないため」）。通知のみ動作 |
| 46 | `dashboard_stats` の CREATE TABLE 文が SQL に存在しない | 中 | dashboard-data.js が INSERT/UPSERT するがテーブル定義なし → INSERT失敗時にフォールバックでダミーデータ |
| 47 | `meeting_minutes` の INSERT する JS が存在しない | 中 | SQL定義のみ。議事録の書き込み機能は未実装。サンプルデータは SQL で直接 INSERT |
| 48 | `supabase-schema-detector.js` が未使用 | 低 | グローバル登録されるが、どの JS からも呼出されない。削除候補 |
| 49 | `cashout_requests` に `approved_at`/`approved_by`/`rejected_at`/`rejected_by` がSQL定義に存在するか未確認 | 中 | admin-referral.js が UPDATE で設定するが、CREATE TABLE に含まれているか要確認 |
| 50 | **`user_profiles` の CREATE TABLE が SQL に存在しない** | **最高** | 20以上のアクティブJSファイルが参照する最重要テーブルだが、SQLファイルに定義なし。Supabaseダッシュボードで手動作成の可能性 |
| 51 | **`invitations.invitee_id` が SQL 定義に存在しない** | **最高** | 10以上のJS/TSファイルが参照するが、どの CREATE TABLE / ALTER TABLE にもカラム定義なし |
| 52 | **`bookings` Edge Function の3カラム名が全てSQL定義と不一致** | **高** | timerex-webhook: `booking_id`→`timerex_id`, `session_ref`→`session_id`, `meeting_url`→`google_meet_url`。INSERT失敗する |
| 53 | `connections` のステータス CHECK 制約不一致 | 高 | CHECK は `pending/accepted/rejected/blocked` のみ許可。JS は `cancelled`/`removed` も書込む → CHECK違反エラー |
| 54 | **JSがアクセスするがCREATE TABLEのないテーブル/ビューが10個** | **最高** | user_profiles, dashboard_stats, user_activities, share_activities, meeting_confirmations, meeting_analysis, invite_history, member_growth_stats, event_stats, industry_distribution |
| 55 | SQL定義済みだがJS未使用のテーブルが15個 | 中 | access_logs, communication_styles, conversations, event_certificates, match_connections, match_requests, matching_scores_cache, point_transactions, profile_views, referral_details, reward_processing_status, settings, system_notifications, user_interests, users |
| 56 | **47以上のデッドJSファイル** | 高 | `/js/` 配下でどのHTMLにも読み込まれないファイルが47+。一部はSupabase操作を含み、静的解析と実行時の挙動が大きく異なる |
| 57 | **17件のスクリプト参照切れ（404）** | 高 | referral.html, events.html, admin-referral.html 等のアクティブページで存在しないJSファイルを参照。ブラウザコンソールエラーの原因 |
| 58 | register.html の race condition | 高 | register-with-invite.js（capture phase）と registration-flow.js（bubble phase）が両方submit処理。invite_links.used_count の二重インクリメントリスク |
| 59 | **RPC関数バージョン爆発** | **最高** | get_referral_stats: 11ver, create_invite_link: 10ver, add_referral_points: 7ver, deduct_user_points: 6ver, add_user_points: 4ver。どのバージョンが本番適用されているかDB直接確認が必要 |
| 60 | **`point_transactions` の3つの命名規則が競合** | 高 | (amount/type/description) vs (transaction_type/points/reason) vs (points/reason/booking_id/referral_code)。RPC関数バージョンによりINSERTされるカラム名が異なる |
| 61 | ポイントが2テーブルに分散・同期なし | 高 | add_referral_points は `profiles.referral_points` を更新、add_user_points/deduct_user_points は `user_points.available_points` を更新。両テーブル間の同期メカニズムなし |
| 62 | **`invite.html` が別のSupabaseプロジェクトに接続** | **最高** | メイン: `whyoqhhzwtlxprhizmor`、invite.html: `smpmnkypzblmmlnwgmsj`。紹介フロー全体が別DBに書込まれ機能しない |
| 63 | **timerex-webhook の署名検証がOPTIONAL** | **最高** | `if (signature) { verify }` — 署名ヘッダーなしでバイパス可能。任意のWebhookイベント偽造が可能 |
| 64 | **timerex-booking に認証なし** | **最高** | Authorization チェックなし。誰でも予約セッション作成APIを呼出可能 |
| 65 | Webhook署名検証にタイミング攻撃脆弱性 | 高 | timerex-webhook、tldv-webhook 共に `!==` で署名比較。`crypto.timingSafeEqual` を使用すべき |
| 66 | `process_referral_on_meeting()` トリガーが FAIL | **最高** | `NEW.profile_id` を参照するが meeting_minutes に `profile_id` カラムなし（`user_id` のみ）→ トリガー実行時エラー |
| 67 | `register-referral-handler.js` が未定義の `window.register` をラップ | 高 | register.html で `window.register` はどこにも定義されていない → ラップ処理が空振り |
| 68 | register.html のスクリプト読込順序 | 中 | register-referral-handler.js（line 657）が supabase-unified.js（line 677）より前に読込 |
| 69 | timerex-booking の Request Body 二重消費 | 高 | line 19 で body 読取後、line 104 で再読取 → 2回目は空。処理失敗の可能性 |
| 70 | timerex-booking が失敗時も `{ success: true }` を返却 | 高 | フォールバックで成功レスポンス → クライアントが成功と誤認 |
| 71 | timerex-webhook の INSERT/UPDATE カラム不整合 | 高 | INSERT: `booking_id` で保存、UPDATE: `timerex_id` でフィルタ → 同一レコードの更新がヒットしない可能性 |
| 72 | 全Edge/Netlify Functions で入力バリデーションなし | 高 | リクエストボディの型・値チェックが一切なし |
| 73 | line-auth-simple-v4.js がエラー詳細をクライアントに返却 | 高 | 内部エラーメッセージ・スタックトレースが露出。情報漏洩リスク |
| 74 | line-auth-simple-v4.js の `listUsers()` フィルタなし | 中 | auth.admin.listUsers() を全件取得。ユーザー数増加でパフォーマンス劣化・メモリ逼迫 |
| 75 | LINE_CHANNEL_ID のハードコードフォールバック | 中 | line-auth-simple-v4.js: 環境変数未設定時に `'2007688781'` を使用 → 意図しないLINEアプリへの接続 |
| 76 | `test-env.js` が環境変数の部分的な値を返却 | 高 | 認証なしで `/.netlify/functions/test-env` にアクセス可能。値の先頭部分が露出 |
| 77 | 3つのプロフィールモーダル実装が並存 | 中 | `MembersProfileModal`, `ProfileDetailModal`, `showProfileModal` — 統一すべき |
| 78 | `handle_new_user()` が3バージョン存在 | 高 | seed.sql / 001_migration / create-profiles-table.sql で INSERT先・カラム名が全て異なる |
| 79 | **Realtime購読メモリリーク（connections-manager-simple.js）** | **高** | line 733-757: connections 購読に unsubscribe/removeChannel なし。ページ離脱後も購読が残存 |
| 80 | **Realtime購読メモリリーク（admin-referral.js）** | **高** | lines 627-650: invitations + cashout_requests の2購読が変数に格納されず、クリーンアップ不可能 |
| 81 | **Realtime購読テーブル名不一致（members-supabase.js）** | **高** | `profiles` テーブルを購読するが実テーブルは `user_profiles` → サイレント失敗 |
| 82 | **Realtime購読テーブル名不一致（referrals/referrer_id）** | **高** | notifications-realtime-unified.js が `referrals`/`referrer_id` を購読。実テーブルは `invitations`/`inviter_id` → サイレント失敗 |
| 83 | **Realtime購読テーブル名不一致（matches）** | **高** | notifications-realtime-unified.js が `matches` を購読。実テーブルは `matchings` → サイレント失敗 |
| 84 | Realtime購読フィルタなし（members-supabase.js + matching-realtime-updates.js） | 中 | 全ユーザーの変更通知を受信。過剰なイベント + 潜在的データ漏洩リスク |
| 85 | 登録フォームの LINE QR ファイルが未永続化 | 高 | `#line-qr` ファイルアップロードが収集されるが DB にも Storage にも保存されない |
| 86 | 登録フォームのビジネス課題チェックボックスが未保存 | 中 | `input[name="challenges"]` の選択値が user_profiles に保存されない。詳細テキストのみ保存 |
| 87 | **settings.html のフォームがUIスタブ** | **高** | テーマ（localStorage）以外のアカウント/プライバシー/通知/セキュリティ設定に Supabase 連携なし |
| 88 | **cashout_requests 銀行情報のJSONB vs 個別カラム不一致** | **高** | JS は個別カラム（bank_name等）で INSERT、一部SQL定義は bank_info JSONB → INSERT 失敗の可能性 |
| 89 | **netlify.toml の Webhook プロキシ URL が未設定** | **最高** | `YOUR_SUPABASE_PROJECT_REF` がプレースホルダーのまま → timerex-webhook/booking へのプロキシが 404 |
| 90 | **`publish = "."` でプロジェクトルート全体がデプロイ** | **最高** | SQL ファイル、.env、設定ファイルが CDN に公開される。`publish = "public"` に変更必要 |
| 91 | **SUPABASE_SERVICE_KEY が .env に不在** | **高** | LINE 認証（line-auth-simple-v4.js line 59）が実行時エラーで失敗 |
| 92 | @supabase/supabase-js バージョン不一致 | 中 | ルート ^2.52.1 vs netlify/functions ^2.39.0。互換性問題の可能性 |
| 93 | **128個のSQLファイルにマイグレーション順序なし** | **高** | 正式な実行シーケンスが存在しない。テーブル定義の重大な競合（profiles 4+, invitations 4+, cashout_requests 5+） |
| 94 | seed.sql と 001_migration.sql のトリガー競合 | 高 | 同一トリガー名 `on_auth_user_created` で異なるロジック（profiles vs public.users に INSERT） |
| 95 | `netlify/functions/utils/security.js` が未使用 | 中 | CSRF/Rate Limit/XSS保護が実装済みだが line-auth-simple-v4.js からインポートされていない |
| 96 | **TimeRex APIキーが平文ハードコード** | **最高** | `timerex-booking/index.ts:10` に実APIキー `7nxFkW...AfoCdM6RgnI2qK6lSEpZaGAp` が直接記述。リポジトリアクセス者全員がTimeRex APIを操作可能。**即座にキーローテーション + Deno.env.get()に変更必要** |
| 97 | **admin.html が完全にUIスタブ** | **高** | テーブルTBODYが空（`<!-- Table rows will be dynamically loaded -->`）。データ読込コードなし。管理機能が未実装 |
| 98 | **super-admin.html がハードコードデモデータ** | **高** | Supabase接続一切なし。KPI数値（1,247ユーザー、¥2.34M等）は全て静的HTML。検索はalert()のみ。実質プレースホルダー |
| 99 | **ポイントが profiles と user_points の2テーブルに分散** | **高** | profiles: `available_points`/`total_points_earned`/`total_points_used`（ALTER TABLE追加）。user_points: `total_points`/`available_points`/`spent_points`。同期メカニズムなし。RPC関数によって更新先が異なる |
| 100 | **connections CHECK制約がランタイムエラーを発生** | **高** | JS（connections-manager-simple.js）が `cancelled`/`removed` を UPDATE で書込むが、CHECK制約は `pending`/`accepted`/`rejected`/`blocked` のみ → `23514 check_violation` エラーでUPDATE失敗 |
| 101 | **matching アルゴリズムが NULL 配列で静かに失敗** | **高** | `matching-unified.js` のスコア計算で `skills`/`interests`/`business_challenges` が NULL → `Array.filter()` or `.includes()` が TypeError → マッチング結果が空になるがエラーハンドリングなし |
| 102 | **invite.html に Supabase 認証情報が平文** | **高** | line 269-270: `smpmnkypzblmmlnwgmsj` の URL + anon key がソースコードに露出 |
| 103 | **全 Edge/Netlify Functions の CORS が `*`** | **高** | webhooks（timerex-webhook, tldv-webhook）含め5関数全てが `Access-Control-Allow-Origin: *`。ドメイン制限なし |
| 104 | **192 JS ファイル（135 アクティブ + 57 無効化）** | **中** | `/js/disabled-scripts/` に57ファイル残存。git historyで保持可能だが削除されていない。disabled-scripts内に認証情報を含む古いファイルの可能性あり |
| 105 | **107 CSS ファイル（83 アクティブ + 24 無効化）** | **低** | `/css/disabled-css/` に24ファイル。CSS重複・肥大化。production buildの最適化なし |
| 106 | **ES6モジュール不使用・80+ window グローバル** | **中** | 全JSが `window.*` パターン。暗黙的な読込順序依存。`supabase-unified.js` が最初に読まれる前提で `window.waitForSupabase()` で同期 |
| 107 | **テスト/バックアップHTMLが本番に残存** | **中** | test-matching.html, test-connections.html, test-matching-*.html, referral-backup.html, referral-debug.html, referral-old.html, referral-old2.html, check-referral-setup.html, generate-video-poster.html |
| 108 | **CI/CDパイプラインなし** | **中** | 27シェルスクリプトが手動実行。`.github/workflows/deploy.yml` が存在するが未使用の可能性。sync-to-windows*.sh が4つ重複 |
| 109 | **30+ RPC関数が管理不能** | **高** | SQL全体で30以上のRPC関数が定義。同一関数名で複数バージョン（get_referral_stats: 2ver, add_referral_points: 3ver等）。どのバージョンが本番適用済みかDB直接確認以外に方法なし |
| 110 | **17トリガーの競合** | **高** | `on_auth_user_created` が2ファイルで異なるロジック。`process_referral_on_meeting` が profile_id を参照（meeting_minutes に存在しない）。DROP TRIGGER IF EXISTS なしで再実行時エラー |

---

## 16. 環境変数

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...            # クライアント側（公開可）
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...    # Edge Functions のみ（秘匿）

# LINE
LINE_CHANNEL_ID=xxxxxxxxxx             # ※ line-auth-simple-v4.js にデフォルト値あり（要削除）
LINE_CHANNEL_SECRET=xxxxxxxxxx
LINE_REDIRECT_URI=https://your-site.netlify.app/line-callback.html

# 外部API
TIMEREX_API_KEY=xxxxxxxxxx             # ※ 現状ハードコード（実装ギャップ #5）
TIMEREX_WEBHOOK_SECRET=xxxxxxxxxx
TIMEREX_BOOKING_PAGE_ID=interconnect-consultation  # デフォルト値あり
TLDV_WEBHOOK_SECRET=xxxxxxxxxx

# Netlify（移行完了後に不要）
NETLIFY_AUTH_TOKEN=nfp_xxxxx
NETLIFY_SITE_ID=xxxxxxxx
```

**⚠ 環境変数名の不一致:**
```
.env ファイル:           VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_LINE_CHANNEL_*
Edge Functions:          SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (Deno.env.get)
Netlify Function:        SUPABASE_URL, SUPABASE_SERVICE_KEY (※ _ROLE_ なし)
→ Netlify Function は SUPABASE_SERVICE_KEY、Edge Functions は SUPABASE_SERVICE_ROLE_KEY。名前が異なる。
→ VITE_ プレフィックスはフロントエンドビルドツール用だが、本プロジェクトは静的サイトのため不要。
```

---

## 17. 開発ワークフロー

```bash
# ローカル開発
npm run dev                      # Netlify Dev

# Supabase
npx supabase start               # ローカルSupabase起動
npx supabase db push              # マイグレーション適用
npx supabase functions serve      # Edge Functions テスト

# デプロイ
git push origin main              # Netlify 自動デプロイ
npx supabase db push --linked     # 本番DB マイグレーション
npx supabase functions deploy     # Edge Functions デプロイ
```

---

## 18. ファイル統計（v15追加）

### 18.1 プロジェクト全体

| カテゴリ | アクティブ | 無効化/アーカイブ | 合計 | サイズ |
|----------|:---------:|:---------------:|:----:|-----:|
| HTML | ~25 | ~15 (test/backup) | 40 | ~600KB |
| JavaScript | 135 | 57 (disabled-scripts/) | 192 | ~2.5MB |
| CSS | 83 | 24 (disabled-css/) | 107 | ~1.0MB |
| SQL | 84 (sql/) | 31 (sql-archive/) | 122 | ~608KB |
| Edge Functions (TS) | 3 | 0 | 3 | ~12KB |
| Netlify Functions (JS) | 2 | 0 | 2 | ~15KB |
| Shell Scripts | 27 | 0 | 27 | ~30KB |
| Config | 7 | 0 | 7 | ~10KB |
| **合計** | **~366** | **~127** | **~500** | **~4.8MB** |

### 18.2 削除候補ファイル

```
即時削除可能（本番に不要）:
  /js/disabled-scripts/         → 57ファイル（git historyで保持）
  /css/disabled-css/            → 24ファイル
  test-matching*.html           → 3ファイル
  test-connections.html         → 1ファイル
  referral-backup.html          → 1ファイル
  referral-debug.html           → 1ファイル
  referral-old.html             → 1ファイル
  referral-old2.html            → 1ファイル
  check-referral-setup.html     → 1ファイル
  generate-video-poster.html    → 1ファイル
  netlify/functions/test-env.js → 1ファイル
  debug-connections.js          → 1ファイル
  test-matching-functionality.js → 1ファイル
  setup-dashboard-tables.js     → 1ファイル（ルートに不要）
  avatar-fix-report.txt         → 1ファイル
  sql-archive/                  → 31ファイル（git historyで保持）
  ─────────────────────
  合計: ~128ファイル 削除可能
```

### 18.3 Supabase接続テーブル使用状況（Ground Truth）

**JSから `.from()` で実際にアクセスされるテーブル（20テーブル）:**

| テーブル | 操作 | 主要ファイル |
|---------|------|-------------|
| user_profiles | SELECT/INSERT/UPDATE | 15+ファイル（matching, members, admin, profile等） |
| profiles | SELECT | Edge Functions（tldv-webhook等）, dashboard |
| members | SELECT | dashboard-member-counter.js（フォールバック） |
| connections | SELECT/INSERT/UPDATE | connections-manager-simple.js, matching-unified.js, members-connection.js |
| notifications | SELECT/INSERT/UPDATE/DELETE | notifications-unified.js, matching-unified.js, connections系, Edge Functions |
| event_items | SELECT | events-supabase.js, event-modal.js, calendar.js, dashboard |
| event_participants | SELECT/INSERT/UPDATE | event-modal.js, events-supabase.js, event-registration.js |
| invite_links | SELECT/INSERT/UPDATE | referral-unified.js, register-with-invite.js, admin-referral.js |
| invitations | SELECT/INSERT/UPDATE | register-with-invite.js, register-referral-handler.js, admin-referral.js |
| user_points | SELECT | admin-referral.js, referral-unified.js |
| cashout_requests | SELECT/INSERT | admin-referral.js, cashout-modal.js |
| fraud_flags | SELECT | admin-referral.js |
| bookmarks | SELECT/INSERT/DELETE | matching-unified.js |
| dashboard_stats | SELECT/INSERT/UPDATE | dashboard-data.js |
| user_activities | SELECT/INSERT | activities.js, dashboard-data.js |
| activities | SELECT | activity-event-filter.js |
| referral_clicks | INSERT | referral-tracking.js（※デッドコード） |
| booking_intents | SELECT | calendly-booking.js |
| ip_registration_stats | SELECT | admin-referral.js |
| messages | SELECT | dashboard-data.js（カウントのみ） |

**RPC関数の使用状況:**

| 関数名 | 呼出元 | パラメータ |
|--------|--------|----------|
| get_top_referrers | admin-referral.js | { limit_count: 5 } |
| get_referral_analytics | admin-referral.js | { start_date, end_date } |
| add_user_points | admin-referral.js | { p_user_id, p_amount } |
| deduct_user_points | cashout-modal.js | { p_user_id, p_amount } |
| process_referral_reward | manual-meeting-confirmation.js, tldv-api-integration.js | { p_invitation_id } |
| add_referral_points | referral-tracking.js（※デッドコード） | { p_user_id, p_amount } |
| get_user_invite_links | referral-rls-workaround.js | { p_user_id } |

**Realtime購読一覧（13チャネル）:**

| チャネル名 | テーブル | ファイル | cleanup有無 |
|-----------|---------|---------|:-----------:|
| notification-changes | notifications | notifications-realtime-unified.js | なし |
| message-changes | messages | notifications-realtime-unified.js | なし |
| matching-changes | matchings | notifications-realtime-unified.js | なし |
| event-changes | event_items | notifications-realtime-unified.js | なし |
| referral-changes | invitations | notifications-realtime-unified.js | なし |
| dashboard_stats_changes | dashboard_stats | dashboard-updater.js | なし |
| user_activities_changes | user_activities | dashboard-updater.js | なし |
| events_changes | event_items | dashboard-updater.js | なし |
| connections_changes | connections | connections-manager-simple.js | **なし（メモリリーク）** |
| admin-referrals | invitations | admin-referral.js | **なし（メモリリーク）** |
| admin-cashouts | cashout_requests | admin-referral.js | **なし（メモリリーク）** |
| matching-profiles | profiles | matching-realtime-updates.js | なし |
| public:profiles | profiles | members-supabase.js | なし |

→ 13購読中、**全てにcleanup/unsubscribeなし**。SPAではないため毎回ページ遷移でリセットされるが、同一ページ内での再初期化時にリークする。

---

## 19. 本質機能と設計原則の整合性（v15追加）

### 19.1 「Netlify = 静的のみ / Supabase = 完結」の現状評価

```
原則: フロントエンドはNetlifyだけ。バックエンドはSupabase完結。

現状の違反:
  ❌ line-auth-simple-v4.js    → Netlify Function（Supabase Auth admin操作）
  ❌ test-env.js               → Netlify Function（デバッグ用 → 削除すべき）
  ❌ netlify.toml [functions]  → サーバーサイドロジックの設定が残存
  ❌ netlify.toml [[redirects]]→ Webhook プロキシが未設定で機能していない

準拠:
  ✓ timerex-booking    → Supabase Edge Function
  ✓ timerex-webhook    → Supabase Edge Function
  ✓ tldv-webhook       → Supabase Edge Function
  ✓ 全テーブル RLS     → Supabase PostgreSQL
  ✓ handle_new_user()  → Supabase Trigger
  ✓ fraud_detection    → Supabase DB Function

移行完了に必要な作業:
  1. line-auth-simple-v4.js → Supabase Edge Function に移行
  2. test-env.js → 削除
  3. netlify.toml から [functions], [[plugins]] を削除
  4. netlify/functions/ ディレクトリを削除
  5. Webhook プロキシ URL を正しく設定（or Edge Function 直接呼出に変更）
```

### 19.2 本質機能の実装完了度

```
ビジネスコミュニティプラットフォームの本質機能:

  ✅ ユーザー登録・認証  → 実装済み（Email/PW + LINE OAuth）
     ⚠ LINE OAuth が壊れている（netlify.toml プレースホルダー、SERVICE_KEY不在）
     ⚠ handle_new_user() が3バージョン競合

  ✅ プロフィール管理    → 実装済み（profile.js + profile-sync.js）
     ⚠ user_profiles の CREATE TABLE がSQLに存在しない
     ⚠ 登録時の QR/challenges が保存されない

  ✅ 会員検索・閲覧      → 実装済み（members-supabase.js + members-search.js）
     ⚠ profiles/user_profiles/members の3テーブルが混在

  ✅ マッチング          → 実装済み（matching-unified.js 136KB）
     ⚠ 全計算がクライアント側（重い）
     ⚠ NULL配列で静かに失敗

  ✅ コネクション申請    → 実装済み（connections-manager-simple.js）
     ⚠ CHECK制約違反でcancelled/removed操作が失敗
     ⚠ Realtime購読メモリリーク

  ⚠ メッセージング      → UI実装済み / DB書込み無効化
     → messages テーブルへの INSERT がコメントアウト
     → 通知のみ動作

  ✅ イベント管理        → 実装済み（events-supabase.js）
     ⚠ events/event_items の2テーブルが混在
     ⚠ リマインダー送信機構が未実装

  ✅ 通知                → 実装済み（notifications-unified.js + Realtime）
     ⚠ 11箇所からINSERT、カラムセット不統一

  ✅ ダッシュボード      → 実装済み（24ファイルのdashboard-*系）
     ⚠ チャート用VIEW未定義（ダミーデータ使用）
     ⚠ 過度に分割（24ファイル → 3-4に統合可能）

  ✅ 紹介・ポイント      → 実装済み（referral-unified.js + cashout-modal.js）
     ⚠ invite.html が別Supabaseプロジェクト
     ⚠ ポイント二重管理（profiles + user_points）
     ⚠ 承認前ポイント減算

  ❌ 管理パネル          → UIのみ（admin.html = スタブ、super-admin.html = デモデータ）
     → admin-referral.html のみ機能的（紹介管理）

  ❌ 設定                → UIのみ（settings.html = 全フォームがスタブ）
     → テーマのみlocalStorageで動作

  ❌ 請求・決済          → 未実装（billing.html = プレースホルダー）
```

### 19.3 「余計な機能は増やさない」の観点 — 削減候補

```
過剰な実装（統合・削減すべき）:
  - dashboard-*.js 24ファイル → 3-4ファイルに統合
  - auth-*.js 9ファイル → supabase-unified.js に集約
  - referral-*.html 5ファイル → referral.html 1ファイルに
  - matching-*.js 13ファイル → matching-unified.js で既に統合済み（残骸を削除）
  - プロフィールモーダル 3実装 → 1つに統合
  - notifications INSERT 11箇所 → DB Function 1つに統合
  - SQL 122ファイル → 正規マイグレーション 10-15ファイルに整理

不要な機能（削除すべき）:
  - presentation.js / infographic-presentation.js / monodukuri-presentation.js（プレゼン機能）
  - generate-video-poster.html（動画ポスター生成）
  - check-referral-setup.html（デバッグ用）
  - performance-monitor.js（開発用）
  - console-history-logger.js（開発用）
  - function-execution-tracker.js（開発用）
  - production-ready-check.js（1回実行で終了するチェック）
  - system-health-check.js（開発用）
  - suppress-duplicate-warnings.js（根本解決すべき）
  - extension-conflict-fix.js（ブラウザ拡張の問題）
  - service-worker-filter.js（SWは未使用）
  - debug-connections.js（デバッグ用）
  - database-table-fix.js（根本的にテーブル名を統一すべき）

SQL 整理方針:
  現状: 122ファイル、実行順序なし、重大な競合多数
  目標: supabase/migrations/ に 001-015 の番号付きマイグレーションファイル
  手順:
    1. 本番DBのスキーマを pg_dump でエクスポート（Ground Truth）
    2. Ground Truth から clean な CREATE TABLE/FUNCTION/POLICY を生成
    3. 番号付きマイグレーションに整理（001_tables, 002_functions, 003_triggers, 004_rls, 005_seed）
    4. sql/ と sql-archive/ を削除（git historyで保持）
```

---

## 20. 最終総括（v15）

### 実装ギャップの深刻度分布

| 深刻度 | 件数 | 代表的な問題 |
|--------|:----:|-------------|
| **最高** | 12 | user_points UPDATE P1, RLS 150件競合, anon GRANT, user_profiles未定義, invite.html別DB, timerex署名Optional, timerex-booking認証なし, APIキー平文, netlify.toml未設定, publish="." |
| **高** | 48 | Realtimeメモリリーク, テーブル名不一致, CHECK制約違反, ポイント二重管理, admin/settingsスタブ, etc. |
| **中** | 35 | テーブル重複, カラム名不一致, 設定未使用, テスト残存, CI/CDなし, etc. |
| **低** | 15 | billing未実装, CSS肥大化, disabled-scripts残存, etc. |
| **合計** | **110** | |

### 修正優先順位

```
Phase 0: セキュリティ緊急対応（即日）
  - TimeRex APIキーをローテーション + 環境変数化
  - publish = "public" に変更（SQL/.env公開阻止）
  - user_points UPDATE RLS を service_role のみに制限
  - anon GRANT を REVOKE
  - timerex-webhook 署名検証を必須化
  - timerex-booking に認証チェック追加
  - test-env.js を削除

Phase 1: データベース正規化（1-2日）
  - 本番DBスキーマを pg_dump で取得（Ground Truth確定）
  - user_profiles / profiles / members を統合
  - events / event_items を統合
  - connections CHECK制約に cancelled を追加
  - invite.html のSupabase接続先をメインプロジェクトに修正
  - handle_new_user() を1バージョンに統一
  - ポイント管理を user_points に一本化

Phase 2: Netlify→Supabase移行完了（2-3日）
  - line-auth-simple-v4.js → Supabase Edge Function
  - netlify.toml から Functions/Plugins セクション削除
  - Webhook プロキシURLを正しく設定 or 直接呼出
  - CORS を特定ドメインに制限

Phase 3: フロントエンド整理（3-5日）
  - disabled-scripts/ と disabled-css/ を削除
  - テスト/バックアップHTMLを削除
  - dashboard-*.js を3-4ファイルに統合
  - notifications INSERT を DB Function に統合
  - Realtime購読に cleanup/unsubscribe を追加
  - matching アルゴリズムにNULLチェック追加

Phase 4: 管理機能実装（5-7日）
  - admin.html に実データ読込を実装
  - settings.html のフォームをSupabaseに接続
  - cashout の承認後ポイント減算フローに変更

Phase 5: SQL正規化（並行作業）
  - 番号付きマイグレーションに整理
  - sql/ と sql-archive/ をgit historyに退避
  - RPC関数の重複バージョンを整理
```
