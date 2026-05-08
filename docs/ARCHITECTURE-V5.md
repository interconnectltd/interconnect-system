# INTERCONNECT アーキテクチャ V5（統合版）

> **発行日**: 2026-05-07
> **最終更新**: 2026-05-09
> **位置付け**: 本書は legacy 版（`ARCHITECTURE.md`）と新機能版（`CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md`）の **上位ナビゲーション層**。
> 詳細仕様は各下位ドキュメントを参照すること。

---

## 1. 改訂概要

V5 を新設する理由は次の3点。

| # | 課題 | V5 での解決 |
|---|---|---|
| 1 | 真実の在り処が2分割（legacy + 新機能）で「全体像」を読む手段がなかった | 1枚の責務マトリクス + DB一覧 + APIインデックスで横断把握を可能にする |
| 2 | 移行期で「どこに何があるか」が不明瞭（HTML+JS と Next.js が共存） | コードベース構成セクションで境界を明示 |
| 3 | Phase 進捗が複数ファイルに散在 | フェーズ進捗表で 2026-05-07 時点を確定スナップショット化 |

**重要原則**: legacy 版・新機能版は本書の発行後も **コミットメッセージ等から参照されるため削除・改名しない**。

---

## 2. システム全体像

INTERCONNECT は legacy（HTML + Vanilla JS）と新コード（Next.js）が **同一 Supabase プロジェクトを共有しながら共存する移行期** にある。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  Browser                                    │
│        (legacy *.html  /  Next.js Server Components & Client UI)            │
└──────────────────────┬──────────────────────────────┬───────────────────────┘
                       │                              │
        legacy 静的配信 │                              │ 動的ルート / API
                       ▼                              ▼
┌──────────────────────────────────┐   ┌──────────────────────────────────────┐
│   Netlify (legacy/static)        │   │   Vercel (Next.js / src/)            │
│   - *.html                       │   │   - App Router (src/app)             │
│   - css/, js/, images/           │   │   - /api/v1/**  (REST + Webhook)     │
│   - GitHub Actions deploy.yml    │   │   - Cron: calendar 15min, retention  │
│                                  │   │           daily 18:00 UTC            │
└──────────────────────┬───────────┘   └──────────────────────┬───────────────┘
                       │                                      │
                       └──────────────┬───────────────────────┘
                                      ▼
                ┌──────────────────────────────────────────┐
                │   Supabase (DB + Auth + Realtime + Storage) │
                │   - Postgres + RLS                        │
                │   - Edge Functions (一部バッチ)            │
                │   - Realtime (chat / notifications)       │
                └────────┬───────────┬───────────┬──────────┘
                         │           │           │
                         ▼           ▼           ▼
               ┌────────────┐ ┌──────────┐ ┌──────────┐
               │ Anthropic  │ │ Deepgram │ │   Zoom   │
               │ (Haiku/    │ │ (STT     │ │ (録音    │
               │  Opus 4.6) │ │  話者分離) │ │  Webhook) │
               └────────────┘ └──────────┘ └──────────┘
```

凡例: 実線 = 実装済み、点線 = 移行予定（legacy → Next.js）。

---

## 3. コードベース構成

| コードベース | デプロイ先 | 主な配置 | 役割 |
|---|---|---|---|
| **Legacy（HTML + Vanilla JS）** | Netlify | `*.html`, `css/**`, `js/**` | 既存ユーザー向け本番（認証・登録・プロフィール・招待・決済等） |
| **Next.js v5** | Vercel（予定） | `src/app/**`, `src/components/**`, `src/lib/**`, `src/types/**` | 新機能（カレンダー / チャット / 日程調整 / Agent A）、移行先 |
| **Backend（共通）** | Supabase | `sql/000_canonical_schema.sql`, `supabase/migrations/00006-00009` | DB + Auth + Realtime + Storage（両コードベースから利用） |
| **Worker（Agent A）** | Vercel Functions / Cron | `worker/src/handlers/ingest.ts` | Zoom Webhook で起動、Deepgram 文字起こし → Opus 分析へ受け渡し |

詳細は legacy: `ARCHITECTURE.md §8`、新機能: `CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md §13.4`。

---

## 4. 責務マトリクス

凡例: ◎ = 主担当 / ◯ = 既存実装あり / △ = 今後実装または部分実装 / − = 該当なし

| 責務 | レガシー (Netlify) | Next.js (Vercel) | Supabase | Worker |
|---|---|---|---|---|
| ユーザー認証 | ◯（現状本番） | △（移行予定） | ◎ Auth | − |
| 会員管理（プロフィール / IC-ID） | ◯ | ◯ | ◎ DB + RLS | − |
| マッチング・つながり | ◯ | △ | ◎ | − |
| 招待・ポイント・換金 | ◎ | − | ◎ | − |
| 通知（プッシュ・バナー） | ◯ | △ | ◎ Realtime | − |
| チャット 1:1 | − | ◎ | ◎ Realtime | − |
| チャット内 AI 会議検知 | − | ◎ Haiku | − | − |
| カレンダー同期（Google / Outlook / ICS） | − | ◎ | ◎ DB | − |
| 空き時間ルール・除外日 | − | ◎ | ◎ DB | − |
| 日程候補自動提案 | − | ◎ | ◎ | − |
| 会議作成・確定・ICS 配布 | − | ◎ | ◎ | − |
| 会議録音受信（Webhook） | − | ◎（受信のみ） | ◎ Storage | − |
| 文字起こし（話者分離） | − | △（呼出） | ◯ DB | ◎ Deepgram |
| 構造化分析・スコア更新 | − | △ | ◎ | ◎ Opus |
| 90 日リテンション削除 | − | ◎ Cron | ◎ DB | − |

---

## 5. DB スキーマ全テーブル一覧

`sql/000_canonical_schema.sql` (canonical) + `supabase/migrations/00006`〜`00009` の和集合。詳細列定義は各 SQL ファイルを参照。

### 5.1 コアスキーマ（`sql/000_canonical_schema.sql`）

| テーブル | 概要 |
|---|---|
| user_profiles | 会員プロフィール（IC-ID、timezone、feed_token_version 含む） |
| connections | 会員同士のつながり関係 |
| notifications | アプリ内通知 |
| event_items / event_participants | イベント本体 / 参加者 |
| invite_links / invitations / invite_history | 招待リンクと送信履歴 |
| user_points / point_transactions / cashout_requests | ポイント残高・台帳・換金申請 |
| activities / user_activities / share_activities | 各種行動ログ |
| messages | レガシー DM テーブル（新チャットとは別系統） |
| match_requests / match_connections / profile_views / bookmarks | マッチング系 |
| booking_sessions / bookings | 予約セッション |
| fraud_flags / ip_registration_stats / referral_clicks / referral_details | 不正検知 |
| search_history | 検索履歴 |
| meeting_confirmations / tldv_meeting_records / meeting_minutes | 旧会議系（tl;dv 連携の残存） |
| settings / event_certificates | 設定・証明書 |
| contact_inquiries / news_items / site_settings / login_sessions / faqs / case_studies | LP・運営側コンテンツ（`add-homepage-and-settings-tables.sql` でも個別管理） |

### 5.2 マイグレーションで追加（新機能）

| テーブル | 1行説明 | 追加先 |
|---|---|---|
| calendar_connections | プロバイダー別 OAuth/ICS 接続情報（AES-256-GCM 暗号化） | 00006 |
| calendar_events | 正規化済みイベント（external_event_id でプロバイダー横断） | 00006 |
| chat_rooms | 1:1 チャットルーム | 00006 |
| chat_messages | メッセージ本体（content_type で日程調整カード等を識別） | 00006 |
| chat_analysis | チャット分析結果（Agent A 出力の格納） | 00006 |
| availability_rules | 週間空き時間テンプレート | 00007 |
| availability_overrides | 特定日の空き/不在オーバーライド | 00007 |
| user_profiles.feed_token_version | ICS 公開フィードトークンの per-user リボーク用カラム | 00008 |
| meeting_requests | 会議リクエスト本体（候補時間配列） | 00009 |
| meetings | 確定会議（calendar_events と双方向 FK） | 00009 |
| meeting_participants_v2 | 役割付き参加者（requester/target/guest） | 00009 |
| meeting_transcripts | Agent A の文字起こし格納（status, source, language） | 00009 |
| job_queue | ingest/analyze の非同期ディスパッチ | 00009 |

> `meetings` テーブル本体は 00009 で初めて作成される。00006 が `ALTER TABLE public.meetings` で参照していた依存関係を 00009 で解決した経緯は `00009` ヘッダコメント参照。

---

## 6. API エンドポイント全リスト

実体は `src/app/api/v1/**/route.ts`。詳細スキーマは `CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md §7`。

### 6.1 カレンダー (`/api/v1/calendar/*`)

| メソッド | パス | 役割 |
|---|---|---|
| POST | `/calendar/connect` | Google OAuth 開始 |
| GET | `/calendar/callback` | Google OAuth コールバック |
| POST | `/calendar/microsoft/connect` | Microsoft (Outlook) OAuth 開始 |
| GET | `/calendar/microsoft/callback` | Microsoft OAuth コールバック |
| POST | `/calendar/disconnect` | プロバイダー切断 |
| POST | `/calendar/sync` | 手動同期トリガ |
| GET | `/calendar/events` | 同期済みイベント一覧 |
| POST | `/calendar/ics/subscribe` | ICS URL 購読登録 |
| GET | `/calendar/feed/[token]` | ICS フィード公開（per-user token） |
| POST | `/calendar/feed-token` | フィードトークン発行・回転 |
| GET | `/calendar/cron` | 15分間隔 Cron（全ユーザー差分同期） |

### 6.2 日程調整 (`/api/v1/scheduling/*`)

| メソッド | パス | 役割 |
|---|---|---|
| GET | `/scheduling/availability` | 双方の空き時間照合（タイトル非開示） |
| POST | `/scheduling/suggest` | 候補3件自動提案（スコアリング付き） |
| POST | `/scheduling/confirm` | 日時確定 + 会議自動作成 |
| GET / PUT | `/scheduling/rules` | 週間テンプレート取得・更新 |
| POST / DELETE | `/scheduling/overrides`, `/scheduling/overrides/[id]` | 除外日 |

### 6.3 チャット (`/api/v1/chat/*`)

| メソッド | パス | 役割 |
|---|---|---|
| GET / POST | `/chat/rooms` | ルーム一覧 / 作成 |
| GET / POST | `/chat/rooms/[roomId]/messages` | メッセージ取得・送信（送信時に意図検知トリガ） |
| POST | `/chat/rooms/[roomId]/read` | 既読更新 |

### 6.4 会議 (`/api/v1/meetings/*`)

| メソッド | パス | 役割 |
|---|---|---|
| POST | `/meetings/from-chat` | チャット確認カードから会議作成 |
| GET | `/meetings/[id]/ics` | 確定会議の ICS ダウンロード |

### 6.5 Webhook / Cron / Misc

| メソッド | パス | 役割 |
|---|---|---|
| POST | `/webhooks/zoom` | Zoom `recording.completed` 受信 → `job_queue` に ingest 投入 |
| GET | `/retention/cron` | 90日経過テキストの null 化（日次 18:00 UTC） |
| GET | `/health` | ヘルスチェック |
| GET / POST | `/matching/[userId]`, `/matching/compute` | マッチング計算（移行中） |

---

## 7. 設定とデプロイ

### 7.1 配布チャネル

| 対象 | 仕組み | 設定ファイル |
|---|---|---|
| Legacy | GitHub Actions（`deploy.yml`） → Netlify 直接配信 | `.github/workflows/deploy.yml` |
| Next.js | git push → Vercel 自動デプロイ | `vercel.json`, `DEPLOY.md` |
| DB | Supabase SQL Editor で migrations 手動実行 | `supabase/migrations/00006-00009`, `sql/000_canonical_schema.sql` |

### 7.2 Vercel Cron 一覧

| パス | スケジュール | 用途 |
|---|---|---|
| `/api/v1/calendar/cron` | `*/15 * * * *` | 全ユーザーのカレンダー差分同期（Google/Outlook/ICS） |
| `/api/v1/jobs/cron` | `*/5 * * * *` | `job_queue` の pending ジョブ polling → Agent A ingest/analyze 起動 |
| `/api/v1/retention/cron` | `0 18 * * *` | プライバシーポリシー準拠の 90日テキスト null 化 |

定義実体は `vercel.json`。スモークテストは `scripts/smoke-test.sh`。

### 7.3 必須環境変数（抜粋）

- `CALENDAR_TOKEN_ENCRYPTION_KEY`（64文字 hex）
- `CALENDAR_FEED_SECRET`
- `CRON_SECRET`
- `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET`
- `ZOOM_WEBHOOK_SECRET`
- `DEEPGRAM_API_KEY`
- `ANTHROPIC_API_KEY`
- Supabase 標準（`NEXT_PUBLIC_SUPABASE_URL` 等）

完全リストは `DEPLOY.md`。

---

## 8. フェーズ進捗（2026-05-09 時点）

| Phase | 内容 | 状態 |
|---|---|---|
| Phase 1 | scaffolding（Next.js / src 構造 / 共通ライブラリ） | ✓ 完了 |
| Phase 2 | UI 実装（チャット / カレンダー / 設定 / 会議タブ） | ✓ 完了 |
| Phase 3 | セキュリティ強化 + V6 対策（90日 Cron / フィードトークン版数） | ✓ 完了 |
| Phase 4 | デプロイ阻害リスク先回り（00009 マイグレーションで欠損テーブル補完など） | ✓ 完了 |
| Phase 5 | 型正規化 + UI + CSP + ヘルスチェック + V5 統合書 + hardening | ✓ 完了 |
| Phase 6 | Vercel 接続 / DB migration / gen types / preview deploy / smoke-test | ⏳ 進行中 |
| Phase 7 | Zoom Marketplace 審査 / Azure AD 審査 / Deepgram PoC / analyze handler / Resend メール基盤 | ⏸ 未着手 |

---

## 9. 未解決事項（V1–V8）

`CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md §12` のうち **2026-05-09 時点で未解決のもの**。V6（90日 Cron）は Phase 3 で実装済みのため除外。V7・V8 は Phase 5 完了時点で識別された新規項目。

| # | 項目 | 優先度 | 備考 |
|---|---|---|---|
| V1 | Deepgram 日本語精度 | P0 | Phase 7 で PoC を実施し本番導入可否を判断 |
| V2 | Haiku 日本語会議検知精度 | P1 | Phase 7 で曖昧表現のチューニング |
| V3 | Zoom Marketplace 審査期間 | P1 | Phase 6 完了後着手、4–8 週間想定 |
| V4 | Azure AD アプリ審査 | P2 | Phase 6 完了後着手（Outlook 連携用） |
| V5 | ICS URL の更新遅延 | P2 | 本番運用後にプロバイダーごとの実測 |
| V7 | Supabase gen types 実行 → `next.config.ts` の `ignoreBuildErrors: false` 復帰 | P0 | Phase 6 中に対応（DB migration 直後） |
| V8 | Agent A `analyze` job handler の実装（Opus 4.6 構造化分析） | P1 | Phase 7 で実装、現状は ingest のみ稼働 |

---

## 10. ナビゲーション

| 目的 | 参照先 |
|---|---|
| Legacy 詳細（HTML/JS、Netlify、認証フロー、レガシー DB） | `ARCHITECTURE.md` |
| 新機能 詳細（カレンダー / チャット / 日程調整 / Agent A の設計と実装） | `CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md` |
| デプロイ手順（環境変数 / Vercel / Supabase 実行順） | `DEPLOY.md` |
| Phase 6 ランブック（Vercel 接続 / migration / smoke-test 手順） | `docs/PHASE-6-RUNBOOK.md`（A5 が作成予定） |
| プライバシーポリシー改訂草案 | `docs/privacy-policy-update-draft.md` |
| スモークテストランナー | `scripts/smoke-test.sh` |
| DB マイグレーション | `sql/000_canonical_schema.sql`, `supabase/migrations/00006`〜`00009` |
| Cron / ルーティング設定 | `vercel.json` |
| Worker（Agent A 録音処理） | `worker/src/handlers/ingest.ts` |

---

> 本書は legacy 版 / 新機能版を **置き換えるものではない**。両者は引き続き正本として保守し、本書はその上に立つ索引として運用する。
