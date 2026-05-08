# Supabase Migrations — 適用順序ガイド

このディレクトリは Calendar / Chat / Agent A 機能用の SQL マイグレーション群です。
本番運用での適用順序・依存関係・rollback 方針をここで一元管理します。

> 関連: [`DEPLOY.md` §3 Supabase マイグレーション](../../DEPLOY.md#3-supabase-マイグレーション)

---

## 1. 適用順序フロー

```
sql/000_canonical_schema.sql        (legacy / 既適用想定)
              │
              ▼
   ┌──────────────────────┐
   │ 00006_calendar_chat  │  Calendar OAuth + Chat 基本テーブル
   └──────────┬───────────┘
              │  ※ 同一トランザクションで連結 (DEPLOY.md §3.3)
              ▼
   ┌──────────────────────────────┐
   │ 00007_scheduling_availability │  Availability + chat content_type 拡張
   └──────────┬───────────────────┘
              ▼
   ┌──────────────────────────┐
   │ 00008_feed_token_version │  ICS feed トークンの世代カラム追加
   └──────────┬───────────────┘
              ▼
   ┌──────────────────────────────────┐
   │ 00009_meetings_jobs_transcripts  │  meetings 系 + 00006 FK 補完
   └──────────┬───────────────────────┘
              ▼
   ┌────────────────────────────────────────┐
   │ 00010_ics_feed_access_token_optional   │  access_token_enc を NULL 許容に
   └────────────────────────────────────────┘
```

---

## 2. 各マイグレーションの役割

| #     | ファイル                                | 影響テーブル / カラム                                                                                                                  | 種別           |
| ----- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 00006 | `00006_calendar_chat.sql`               | `calendar_connections`, `calendar_events`, `chat_rooms`, `chat_messages`, `chat_analysis`; `notifications.type` enum 拡張             | CREATE         |
| 00007 | `00007_scheduling_availability.sql`     | `availability_rules`, `availability_overrides`; `calendar_events.external_event_id` rename; `chat_messages.content_type` CHECK 拡張; `user_profiles.timezone` | CREATE + ALTER |
| 00008 | `00008_feed_token_version.sql`          | `user_profiles.feed_token_version`                                                                                                     | ALTER          |
| 00009 | `00009_meetings_jobs_transcripts.sql`   | `meeting_requests`, `meetings`, `meeting_participants_v2`, `meeting_transcripts`, `job_queue`; `calendar_events.linked_meeting_id` FK 後付け | CREATE + DO    |
| 00010 | `00010_ics_feed_access_token_optional.sql` | `calendar_connections.access_token_enc` の NOT NULL 解除                                                                              | ALTER (冪等)   |

---

## 3. 順序制約の根拠

### 3.1 00006 → 00007 (連結必須)

`00006` で作成した `chat_messages.content_type` の CHECK 制約 (`text | image | file`) は、
新コードが投入する `scheduling_card / meeting_suggestion / meeting_confirmed` を拒否します。
`00007` で CHECK が拡張されるまで本番コードが動かないため、**必ず同一トランザクションで連結**してください。

### 3.2 00006 → 00009 (Forward FK の後追い解決)

`00006` の `calendar_events.linked_meeting_id` は宣言時点で `public.meetings` が存在しないため、
**FK なしの裸の UUID 列**として作成されます。`00009` がテーブル `meetings` を作成した直後の `DO $$` ブロックで
`pg_constraint` を検査し、未追加なら `ALTER TABLE ... ADD CONSTRAINT calendar_events_linked_meeting_id_fkey` を実行
(commit `dd3199b` 修正済)。この DO block により新規 DB / 既適用 DB の両方で冪等動作します。

### 3.3 00010 (単独・冪等)

`access_token_enc` への `DROP NOT NULL` のみ。再適用しても 2 回目以降は no-op。

---

## 4. 適用方法

### A. Supabase SQL Editor (GUI)

`_apply_in_order.sql` を参照してください。`psql` の `\i` を含むため、SQL Editor で使う場合は
各ファイルの中身を順番にインラインしてから流す必要があります (連結スクリプトの末尾コメント参照)。

### B. CLI (推奨)

```bash
supabase link --project-ref <project-ref>
supabase db push
```

### C. psql 直 (combined)

```bash
psql "$DATABASE_URL" -f supabase/migrations/_apply_in_order.sql
```

---

## 5. Rollback 方針

**前進専用 (forward-only)**。本番 DB に対する down マイグレーションは提供しません。

理由:

- 00006 〜 00009 はリリース済み機能の基盤テーブルであり、削除はデータロスを伴う
- 00010 の `DROP NOT NULL` は既存 OAuth 行を破壊しないため、戻す必要がない

事故時の復旧は **Supabase の PITR (Point-in-Time Recovery)** または論理ダンプからの復元で対応してください。
スキーマ修正が必要な場合は次の番号 (`00011_*.sql`) で前進修正します。

---

## 6. 新規マイグレーション追加時のチェックリスト

- [ ] ファイル名は `0001N_short_description.sql` (4 桁ゼロ埋め)
- [ ] 冪等性: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DO $$ ... pg_constraint 検査` 等
- [ ] forward FK が必要な場合は本ファイル §3.2 のパターンを踏襲
- [ ] RLS を有効化し、`service_role` ポリシーを忘れず追加
- [ ] `_apply_in_order.sql` に `\i` 行を追記
- [ ] 本 README §1 のフロー図と §2 の表に追記
- [ ] `DEPLOY.md` §3.1 の順序リストに追記

---

## 7. 関連ドキュメント

- [`../../DEPLOY.md`](../../DEPLOY.md) §3 Supabase マイグレーション
- [`../../CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md`](../../CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md) §3, §5, §6.2, §13.3
- [`../../docs/ARCHITECTURE-V5.md`](../../docs/ARCHITECTURE-V5.md)
