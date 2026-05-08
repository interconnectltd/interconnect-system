# Phase 6 Runbook — Vercel 接続〜Preview Smoke-test

Phase 5 までで Next.js アプリのコード/マイグレーション/Cron 設定/Smoke-test スクリプトは揃っています。この Runbook は **「ローカルだけ動く状態」から「Vercel Preview で smoke-test がオールグリーンになる状態」までを、コピペだけで完了させる** ためのものです。

想定所要時間: **合計 50〜80 分** (CLI ログイン待ち・Vercel ビルド待ちを含む)。

| § | 内容 | 目安 |
| --- | --- | --- |
| 0 | 前提確認 | 2 分 |
| 1 | CLI インストール | 3 分 |
| 2 | Supabase migration | 10〜15 分 |
| 3 | `database.ts` 自動生成 + `ignoreBuildErrors` 復帰 | 10 分 |
| 4 | Vercel 接続 + 環境変数登録 | 15〜20 分 |
| 5 | Preview デプロイ | 5〜10 分 |
| 6 | Smoke-test 実行 | 5 分 |
| 7 | トラブルシューティング | 都度 |
| 8 | 次のステップ (Phase 7) | — |

---

## § 0. 前提

- macOS / Linux (Windows の場合は WSL2 推奨)
- Node.js **20 以上** (`node -v` で確認)
- pnpm **9 以上** (`pnpm -v`)
- Supabase プロジェクトの **Project Ref** (`https://app.supabase.com/project/<REF>` の `<REF>`)
- Vercel アカウント (Hobby 可。ただし Cron は **5分間隔** を含むため Pro 推奨)
- `feat/calendar-chat-agent-a` ブランチを checkout 済み

```bash
git switch feat/calendar-chat-agent-a
git pull --ff-only
node -v && pnpm -v
```

期待出力: `v20.x.x` 以上 / `9.x.x` 以上。

---

## § 1. CLI インストール

```bash
npm i -g vercel supabase
vercel --version
supabase --version
```

期待出力 (バージョンは前後して構いません):

```
Vercel CLI 39.x.x
2.x.x
```

> Homebrew 派は `brew install supabase/tap/supabase` でも可。`vercel` は npm からのインストールが最も無難です。

---

## § 2. Supabase 接続と migration 実行

### 2.1 ログイン & link

```bash
supabase login
# ブラウザが開くのでアカウント承認

# プロジェクトに紐付け (cwd = リポジトリ root)
supabase link --project-ref <PROJECT_REF>
```

期待出力: `Finished supabase link.` が表示されること。

### 2.2 マイグレーション適用

`supabase/migrations/` には Phase 1〜4 で追加された **5 ファイル**があります。

| ファイル | 内容 |
| --- | --- |
| `00006_calendar_chat.sql` | calendar / chat / agent A スキーマ |
| `00007_scheduling_availability.sql` | 候補時間帯ロジック (00006 の CHECK 拡張を含む) |
| `00008_feed_token_version.sql` | ICS feed トークン世代管理 |
| `00009_meetings_jobs_transcripts.sql` | meetings / job_queue / transcripts |
| `00010_ics_feed_access_token_optional.sql` | feed token を nullable に |

#### A. CLI で一括適用 (推奨)

```bash
supabase db push
```

期待出力: 末尾に `Finished supabase db push.` および `Applying migration 00006_...` 〜 `00010_...` のログ。

> **重要**: `00006` と `00007` は依存関係があるため必ずワンセットで流れます。`db push` は順序を保証するので心配不要です。

#### B. SQL Editor (GUI) で手動適用する場合

`supabase db push` で権限エラーが出る場合や、レビュー目的で目視適用したい場合の手順です。

1. Supabase Dashboard → SQL Editor を開く
2. **00006 + 00007 を連結したスクリプトを 1 回で実行**
   ```bash
   cat supabase/migrations/00006_calendar_chat.sql \
       supabase/migrations/00007_scheduling_availability.sql \
     | pbcopy   # macOS
   # Linux: ... | xclip -selection clipboard
   ```
   SQL Editor にペースト → `Run`
3. 続けて `00008_feed_token_version.sql` をペースト → Run
4. `00009_meetings_jobs_transcripts.sql` をペースト → Run
5. `00010_ics_feed_access_token_optional.sql` をペースト → Run

期待出力: 各 Run で `Success. No rows returned`。

### 2.3 適用確認

```bash
supabase db remote commit --dry-run 2>&1 | head -20
```

または Dashboard → Database → Tables で以下が存在することを確認。

```
calendar_connections, calendar_events, chat_rooms, chat_messages, chat_analysis,
availability_rules, availability_overrides,
meeting_requests, meetings, meeting_participants_v2, meeting_transcripts, job_queue
```

---

## § 3. `database.ts` 自動生成

### 3.1 型ファイル生成

```bash
supabase gen types typescript --project-id <PROJECT_REF> --schema public \
  > src/types/database.ts
```

期待出力: 標準出力には何も出ず、`src/types/database.ts` が **数百〜千数百行** で書き換わる。

```bash
wc -l src/types/database.ts
```

期待出力: `1500` 行前後 (現状 1589 行)。

### 3.2 手動修正 — 列挙型エイリアスを復元

`supabase gen types` は **Postgres ENUM** からのみ列挙型を生成します。本リポジトリの `NotificationType` / `MeetingPlatform` はアプリ層の Union として使われているため、生成後にファイル先頭へ追記してください。

`src/types/database.ts` の **冒頭** (先頭の `export type Json = ...` の直後) に以下を追記:

```ts
// --- Application-level enums (kept across regenerations of this file) ---
export type NotificationType =
  | "match"
  | "message"
  | "event"
  | "calendar_event"
  | "meeting_request"
  | "system";

export type MeetingPlatform = "zoom" | "google_meet" | "teams" | "in_person";
```

> このブロックは `supabase gen types` を再実行するたびに消えるので、**毎回追記する** のが運用ルールです。コードレビュー時にも diff で必ず確認すること。

### 3.3 型チェック

```bash
pnpm type-check
```

期待出力: `Found 0 errors.` または無出力で正常終了。

エラーが残る場合は § 7.3 を参照。

### 3.4 `next.config.ts` の strict 化

型チェックが通ったら、`next.config.ts` の TS スキップを解除します。

```diff
   typescript: {
-    // Phase 1 scaffolding: ...
-    ignoreBuildErrors: true,
+    ignoreBuildErrors: false,
   },
```

最終確認:

```bash
pnpm build
```

期待出力: `✓ Compiled successfully` で終了し、Route Handlers が一覧表示される。

---

## § 4. Vercel 接続

### 4.1 link

```bash
vercel login
vercel whoami    # 期待: 自分のメールアドレスが表示される
vercel link
```

対話で以下のように回答:

- `Set up "<dir>"?` → `Y`
- `Which scope?` → 自分の Team / Personal
- `Link to existing project?` → 既存があれば `Y`、なければ `N` で新規
- `What's your project's name?` → 例: `interconnect-next`

期待出力: `Linked to <scope>/<project> (created .vercel)`。

### 4.2 暗号化キーを生成

```bash
# 64-hex (32 byte) — CALENDAR_TOKEN_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# base64url 32 byte — CALENDAR_FEED_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# base64url 24 byte — CRON_SECRET
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

期待出力 (例):
```
4f9c...e3a1            # 64文字hex
xK3y...AbC             # 43文字base64url
qZ8...mE               # 32文字base64url
```

> **注意**: `CALENDAR_TOKEN_ENCRYPTION_KEY` は本番投入後に変更すると既存ユーザーの OAuth トークンが復号不能になります。生成時にパスワードマネージャ等へバックアップを必ず取ること。

### 4.3 環境変数登録 (9 変数 × 3 環境)

`vercel env add <KEY>` は対話で値と環境 (Production / Preview / Development) を選びます。**3 環境すべてにチェック** を入れてください。

| # | Key | 取得元 |
| --- | --- | --- |
| 1 | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| 2 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 同上 → `anon public` |
| 3 | `SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` と同値 |
| 4 | `SUPABASE_SERVICE_KEY` | 同上 → `service_role` (公開禁止) |
| 5 | `CALENDAR_TOKEN_ENCRYPTION_KEY` | § 4.2 で生成した 64-hex |
| 6 | `CALENDAR_FEED_SECRET` | § 4.2 で生成した base64url |
| 7 | `CRON_SECRET` | § 4.2 で生成した base64url |
| 8 | `ANTHROPIC_API_KEY` | https://console.anthropic.com/ |
| 9 | `DEEPGRAM_API_KEY` | https://console.deepgram.com/ |

```bash
for key in \
  NEXT_PUBLIC_SUPABASE_URL \
  NEXT_PUBLIC_SUPABASE_ANON_KEY \
  SUPABASE_URL \
  SUPABASE_SERVICE_KEY \
  CALENDAR_TOKEN_ENCRYPTION_KEY \
  CALENDAR_FEED_SECRET \
  CRON_SECRET \
  ANTHROPIC_API_KEY \
  DEEPGRAM_API_KEY
do
  vercel env add "$key"
done
```

期待出力: 各キーで `✅ Added Environment Variable <KEY> to Project <name> [production preview development]`。

確認:

```bash
vercel env ls
```

期待出力: 9 変数 × 3 環境 = **27 行** の表が表示される。

### 4.4 オプション変数 (該当機能を使う場合のみ)

| 機能 | 変数 |
| --- | --- |
| Google Calendar | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| Outlook | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REDIRECT_URI` |
| Zoom Webhook | `ZOOM_WEBHOOK_SECRET` |
| メール送信 (Phase 7) | `RESEND_API_KEY` |

---

## § 5. Preview デプロイ

```bash
vercel deploy
```

期待出力 (末尾):

```
✅  Production: https://<project>-<hash>-<scope>.vercel.app [3m]
```

> Preview なのに `Production:` と表示されることがありますが、URL が `<hash>` を含む形式なら Preview です。`vercel deploy --prod` を **打たない限り** 本番には出ません。

URL を控えます。

```bash
PREVIEW_URL=$(vercel deploy 2>&1 | tail -n1)
echo "$PREVIEW_URL"
```

---

## § 6. Smoke-test

### 6.1 HTTP layer

```bash
BASE_URL="$PREVIEW_URL" \
CRON_SECRET="<step-4.2-で生成した値>" \
./scripts/smoke-test.sh
```

期待出力 (末尾):

```
================================================
14 PASSED, 0 FAILED, 0-2 WARNINGS
================================================
```

`PASSED >= 12` かつ `FAILED == 0` なら合格。WARNING は OAuth 環境変数未設定など想定内のものに限ります。

### 6.2 Supabase layer

```bash
SUPABASE_URL="https://<PROJECT_REF>.supabase.co" \
SUPABASE_SERVICE_KEY="<service_role_key>" \
npx tsx scripts/smoke-test-supabase.ts
```

期待出力 (末尾):

```
================================================
14 PASSED, 0 FAILED, 0-2 WARNINGS
================================================
```

`smoke_check_rls` / `smoke_check_realtime` の RPC が未作成の場合は WARN になりますが、Phase 6 では許容します。Dashboard で Tables → 各テーブル → RLS が **ON** になっていることを目視確認してください。

---

## § 7. トラブルシューティング

### 7.1 smoke-test で 401 が連発する

- `CRON_SECRET` が Vercel 側と shell 側で食い違っている可能性。`vercel env ls` で値を確認 → `vercel env pull .env.preview` でローカルへ落とし、ファイル内の値で `BASE_URL=... CRON_SECRET=...` を再構築する。
- もしくはデプロイのプロモーションが終わっていない。`vercel inspect <PREVIEW_URL>` で `READY` を確認。

### 7.2 smoke-test で 500 が出る

```bash
vercel logs <PREVIEW_URL> --since 10m
```

頻出原因:

| 症状 | 原因 |
| --- | --- |
| `decrypt: invalid key length` | `CALENDAR_TOKEN_ENCRYPTION_KEY` が 64 hex (= 32 byte) になっていない |
| `Supabase URL is required` | `NEXT_PUBLIC_SUPABASE_URL` が Preview 環境に登録されていない |
| `relation "calendar_connections" does not exist` | § 2 の migration が未適用 |

### 7.3 `supabase gen types` が失敗する

- `error: failed to retrieve generated types: project not found` → `<PROJECT_REF>` が誤り。Dashboard URL を再確認。
- `Found N errors` (型チェック) → § 3.2 の **NotificationType / MeetingPlatform 追記** が抜けている。再度追記して `pnpm type-check`。
- `Cannot find module './database'` → 出力ファイル名は **`database.ts`** であること (`database.types.ts` ではない)。

### 7.4 Cron が Preview で動かない

仕様です。**Vercel Cron は Production deployment でのみ実行** されます。動作確認は手動 curl で:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "$PREVIEW_URL/api/v1/calendar/cron"
```

期待出力: `200 OK` の JSON (`{"ok":true,"processed":0,...}` 等)。

---

## § 8. 次のステップ (Phase 7)

Phase 6 をクリアしたら、本番ローンチに向けて以下に着手します。

1. **Zoom Marketplace 申請** — Server-to-Server OAuth → Public 化。審査 4〜8 週間を見越して着手。
2. **Resend 導入** — `RESEND_API_KEY` を env に追加し、`/api/v1/calendar/invite` から ICS 添付メールを配信。
3. **Agent A `analyze` handler** — `job_queue` の `analyze` ジョブ処理 (Opus による議事録要約) を実装。`worker/` から Next.js Route Handler への移行を含む。
4. **Production deploy** — `vercel deploy --prod` + 同じ smoke-test を本番 URL で再実行。
5. **Cron 実行確認** — Production で 15 分後に `vercel logs --follow` で Cron が動いているか観測。

---

## 参考

- [`DEPLOY.md`](../DEPLOY.md) — 全体的なデプロイ運用ノート (legacy + Next.js)
- [`CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md`](../CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md) §11 / §13 — 暗号化・デプロイ周りの設計根拠
- [`docs/ARCHITECTURE-V5.md`](./ARCHITECTURE-V5.md) — Phase 1〜5 の最終アーキテクチャ
