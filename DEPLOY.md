# INTERCONNECT デプロイ手順

> **最終更新日**: 2026-05-09
> **対応 Phase**: Phase 5 (型システム正規化 + 文書整備) 進行中 / Phase 6 (本番デプロイ + smoke test) 着手準備完了
> 上位ドキュメント: [`docs/ARCHITECTURE-V5.md`](./docs/ARCHITECTURE-V5.md) §8

本ドキュメントは、リポジトリをクローンしたチームメンバーがローカル動作確認から本番デプロイまでを完了するための手順書です。

---

## 1. 前提

INTERCONNECT は現在、2系統のフロントエンドが共存しています。

- **Legacy (Netlify ホスティング)**: `*.html` + `js/*.js` + `css/*.css` の静的構成。会員管理・LINE連携・プロフィール等は引き続きこちらで稼働しています。
- **新 Next.js (Vercel ホスティング)**: `src/` 配下の App Router 実装。Calendar / Chat / Agent A (録音→文字起こし→AI分析) など新機能はこちらに集約されています。

両系統とも **Supabase** を共通のバックエンド (Auth / DB / Storage / RLS) として利用しているため、Supabase プロジェクトは1つです。Vercel と Netlify は同じ Supabase URL / Key を参照する構成になります。

---

## 2. 環境変数の準備

### 2.1 ファイル作成

```bash
cp .env.example .env.local
```

Vercel 上では `vercel env pull .env.local` でも取得可能です(後述の §5 参照)。

### 2.2 必須キー (これが揃っていないと起動不可)

| Key | 用途 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | クライアント Supabase 接続 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | クライアント Supabase 接続 |
| `SUPABASE_URL` | サーバー側 Supabase 接続 |
| `SUPABASE_SERVICE_KEY` | サーバー側 RLS バイパス (Service Role) |
| `CALENDAR_TOKEN_ENCRYPTION_KEY` | OAuth トークンの AES 暗号化 (32バイト=64hex) |
| `CALENDAR_FEED_SECRET` | ICS フィード署名用シークレット |
| `CRON_SECRET` | Vercel Cron の Bearer 認証 |
| `ANTHROPIC_API_KEY` | Haiku (会議検知) + Opus (議事録分析) |
| `DEEPGRAM_API_KEY` | Agent A の音声文字起こし |

### 2.3 オプションキー (該当機能を使う場合のみ)

- **Google Calendar 連携**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- **Outlook (Microsoft Graph) 連携**: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REDIRECT_URI`
- **Zoom Webhook 受信**: `ZOOM_WEBHOOK_SECRET` (`ZOOM_VERIFICATION_TOKEN` は C3 パッチで廃止)
- **LINE LIFF / OAuth (legacy)**: `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `NEXT_PUBLIC_LINE_*`, `NEXT_PUBLIC_LIFF_ID`

### 2.4 暗号化キーの生成方法

Node.js が手元にあれば以下のワンライナーで生成できます。

```bash
# CALENDAR_TOKEN_ENCRYPTION_KEY (64文字hex / 32バイト)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# CALENDAR_FEED_SECRET (base64url)
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# CRON_SECRET (任意の長い乱数)
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

`CALENDAR_TOKEN_ENCRYPTION_KEY` を後から変更すると既存の保存済み OAuth トークンが復号できなくなる点に注意してください (該当ユーザーは再連携が必要)。

---

## 3. Supabase マイグレーション

Supabase プロジェクトが新規の場合は、以下を順番に適用してください。

### 3.1 適用順

1. `sql/000_canonical_schema.sql` — legacy 側で既に適用済みの想定 (会員・プロフィール・チャット等)
2. `supabase/migrations/00006_calendar_chat.sql` — Calendar / Chat / Agent A スキーマ
3. `supabase/migrations/00007_scheduling_availability.sql` — 候補時間帯ロジック / `messages.content_type` CHECK 拡張
4. `supabase/migrations/00008_feed_token_version.sql` — ICS フィードトークンの世代管理 (per-user リボーク)
5. `supabase/migrations/00009_meetings_jobs_transcripts.sql` — `meetings` / `meeting_requests` / `meeting_participants_v2` / `meeting_transcripts` / `job_queue` を新設 (00006 から参照されていた `public.meetings` を実体化)
6. `supabase/migrations/00010_ics_feed_access_token_optional.sql` — ICS フィード接続向けに `calendar_connections.access_token_enc` の NOT NULL 制約を解除 (※後述 3.3)

### 3.2 適用方法

**A. Supabase SQL Editor (GUI) の場合**: 上記ファイルの内容を順にコピペして実行。

**B. CLI の場合**:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

### 3.3 重要事項

#### 3.3.1 00006 と 00007 は同一トランザクションで適用すること

`00006_calendar_chat.sql` のみを単独で適用した状態だと、`messages.content_type` の CHECK 制約が新しいコードが投入する値 (`scheduling_card` / `meeting_suggestion` / `meeting_confirmed`) を拒否します。`00007_scheduling_availability.sql` で CHECK が拡張されるため、**必ず 00006 → 00007 をワンセットで適用**してください。SQL Editor で実行する場合は両ファイルを連結した1スクリプトとして流すのが安全です。

#### 3.3.2 00010 で NOT NULL を解除する理由

`calendar_connections.access_token_enc` は OAuth (Google / Microsoft) 接続では必須ですが、**ICS フィード購読の場合は OAuth bearer token を持たず URL 自体が credential** になります。代わりに専用カラム `ics_url` に AES-256-GCM で暗号化した URL を 1 度だけ保存します。00010 はこの運用の差異に合わせ DB 制約を緩和し、必須性は provider ごとにアプリケーション層 (`src/lib/calendar/service.ts`) で検証します。詳細は `docs/privacy-policy-update-draft.md` §2.3 を参照。

### 3.4 Database 型の自動生成 (`supabase gen types`)

現状 `src/types/database.ts` は **手書きで保守されている** ため (00006〜00009 を反映済み)、Phase 5 の一環として Supabase 公式 CLI による自動生成へ移行します。手順は以下:

```bash
# 1. Supabase CLI で認証 (初回のみ)
supabase login

# 2. プロジェクトに紐付け (.supabase/ 以下が初期化される)
supabase link --project-ref <PROJECT_REF>

# 3. 型を再生成し src/types/database.ts へ上書き
supabase gen types typescript --project-id <PROJECT_REF> > src/types/database.ts
```

`<PROJECT_REF>` は Supabase ダッシュボード `Project Settings → General → Reference ID` の値 (例: `abcdefghijklmnop`)。

#### 3.4.1 生成後に維持する手書き定義

自動生成された型には **アプリ層で利用しているリテラル列挙** が含まれないため、生成後に以下を **追記し直す** 必要があります (元ファイル冒頭の Enums セクションを丸ごと再追加):

- `NotificationType` (chat_message / meeting_request / mutual_match など 15 値)
- `MeetingPlatform` (`zoom` / `google_meet` / `teams` / `in_person`)
- `CalendarProvider` (`google` / `microsoft` / `ics_feed`)
- `ChatContentType` (`scheduling_card` / `meeting_suggestion` / `meeting_confirmed` ほか)

これらは Postgres 側で純粋な enum ではなく CHECK 制約や `text` カラムで表現されているため、`gen types` では `string` として落ちてしまいます。手書き enum を維持することで TypeScript 側の網羅性チェックを失わずに済みます。

#### 3.4.2 `next.config.ts` の `ignoreBuildErrors` を戻す

`next.config.ts` には Phase 1 scaffolding の名残として以下が残っています:

```ts
typescript: {
  ignoreBuildErrors: true,
},
```

`gen types` 適用後にビルドが通ることを確認したら、**`false` に戻して** PR を出してください (Phase 5 完了の必須条件)。

---

## 4. ローカル動作確認

```bash
pnpm install
pnpm dev
```

確認ポイント:

- `http://localhost:3000/` でランディングが表示される
- `http://localhost:3000/login` で Supabase 認証 (メール+パスワード) が成功する
- ブラウザ devtools の Network で Supabase へのリクエストが 200 で返ること
- Console に `Supabase URL is required` 等の env 起因エラーが出ていないこと

`pnpm dev` 起動時に Next.js が型エラーで落ちる場合は §8 の Database 型生成タスクを参照。

---

## 5. Vercel デプロイ

### 5.1 プロジェクト紐付け

```bash
# 既存プロジェクトに紐付け
vercel link

# 新規作成する場合は対話プロンプトで作成
```

### 5.2 環境変数の登録

`.env.local` の各キーを Vercel の **Production / Preview / Development** 3環境すべてに登録します。

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add CALENDAR_TOKEN_ENCRYPTION_KEY
vercel env add CALENDAR_FEED_SECRET
vercel env add CRON_SECRET
vercel env add ANTHROPIC_API_KEY
vercel env add DEEPGRAM_API_KEY
# 必要に応じて Google / Microsoft / Zoom / LINE のキーも追加
```

ダッシュボード (Project → Settings → Environment Variables) からの一括投入も可能です。

### 5.3 本番デプロイ

```bash
vercel deploy --prod
```

プレビュー確認は `vercel deploy` (フラグなし)。

---

## 6. Vercel Cron の確認

`vercel.json` の `crons` セクションに以下が登録されていることを確認します。

| Path | Schedule | 役割 |
| --- | --- | --- |
| `/api/v1/calendar/cron` | 15分ごと | カレンダー差分同期 / トークンリフレッシュ |
| `/api/v1/jobs/cron` | 5分ごと | `job_queue` polling → ingest/analyze ハンドラ起動 (Agent A pipeline) |
| `/api/v1/retention/cron` | 日次 18:00 UTC (= JST 03:00) | 録音・文字起こしの90日リテンション削除 |

### 初回手動トリガー

デプロイ直後に動作確認しておくと安心です。

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://<deploy>.vercel.app/api/v1/calendar/cron

curl -H "Authorization: Bearer $CRON_SECRET" \
  https://<deploy>.vercel.app/api/v1/jobs/cron

curl -H "Authorization: Bearer $CRON_SECRET" \
  https://<deploy>.vercel.app/api/v1/retention/cron
```

`401 Unauthorized` が返る場合は `CRON_SECRET` の不一致、`500` の場合は Supabase 接続 or 暗号化キーの問題を疑います。Vercel Logs を併せて確認してください。

---

## 7. 外部サービス申請 (本番ローンチ前)

新機能を本番投入する前に、以下の外部審査・契約を進めておく必要があります。

- **Zoom Marketplace 審査**: 公開アプリの審査は通常 4〜8週間。Server-to-Server OAuth アプリで先行運用し、Public 化のタイミングで切り替える方針を推奨。
- **Azure AD アプリ登録 (Outlook対応)**: 法人テナントでの管理者承認 (admin consent) が必要。マルチテナント設定の場合は同意画面の文言レビューも済ませておく。
- **Deepgram 日本語精度 PoC**: V1 P0 マイルストーン。実際の会議録音サンプルで WER (Word Error Rate) を計測し、Nova-2 / Whisper 等のモデル比較を行うこと。

---

## 8. 既知の Phase 残タスク

リリース前に着手 / 検討すべき残課題:

1. **Database 型の正規化**: §3.4 の手順で `supabase gen types` を実行し、`next.config.ts` の `typescript.ignoreBuildErrors` を `false` に戻す (Phase 6 中)。
2. **Profile modal の候補3件提案**: legacy のプロフィール modal と新 scheduling ロジックを連携させ、空き時間候補を3件まで提案する UI を実装。
3. **メール送信基盤**: ICS の自動配信 (招待メール) のために Resend を導入予定。`RESEND_API_KEY` を env に追加し、 `/api/v1/calendar/invite` から送信。
4. **プライバシーポリシー更新**: `privacy.html` に以下の条項を追記する必要あり。
   - 会議音声の録音について
   - AI による文字起こし・要約処理について
   - 録音・文字起こしデータの90日自動削除について
5. **`analyze` job handler 実装** (Phase 7): Opus 4.6 構造化分析パス。現状は `/api/v1/jobs/cron` 内で no-op スキップで `completed` マーク。

---

## 9. Phase 6 完了の定義

Phase 6 (本番デプロイ準備) が完了したと判断する基準。詳細手順は [`docs/PHASE-6-RUNBOOK.md`](./docs/PHASE-6-RUNBOOK.md)、項目別チェックは [`docs/PHASE-6-CHECKLIST.md`](./docs/PHASE-6-CHECKLIST.md) を参照。

### 9.1 環境構築完了
- [ ] `vercel link` で Vercel project に紐付け済み
- [ ] `supabase login` + `supabase link --project-ref <REF>` 完了
- [ ] §2.2 の必須9キー + §2.3 の利用機能分の env が Production / Preview / Development の3環境に投入済 (`vercel env ls` で確認)

### 9.2 DB 反映完了
- [ ] §3.1 の順序で migration 00006 → 00007 (連結) → 00008 → 00009 → 00010 を全適用
- [ ] `scripts/smoke-test-supabase.ts` 実行で全 12 テーブル + 2 realtime publication が PASS

### 9.3 型・ビルド健全性
- [ ] §3.4 の `supabase gen types` 実行後に `pnpm type-check` が **0 件**
- [ ] `next.config.ts` の `typescript.ignoreBuildErrors` を `false` に復帰
- [ ] `pnpm build` が成功し、25 ページ + 全 cron route (`/api/v1/calendar/cron`, `/api/v1/jobs/cron`, `/api/v1/retention/cron`) が出力に含まれる

### 9.4 Preview デプロイ + Smoke-test
- [ ] `vercel deploy` (preview) 成功、URL を控える
- [ ] `BASE_URL=<preview> CRON_SECRET=xxx ./scripts/smoke-test.sh` が PASSED ≧ 12 / FAILED == 0
- [ ] `/api/v1/health` が 200 + `status: "ok"`
- [ ] 3 cron すべてが 401 (no auth) / 200 (with bearer) を区別

### 9.5 PR レビュー準備完了
- [ ] PR #1 を draft → ready for review に格上げ
- [ ] preview URL を PR コメントで共有
- [ ] CRITICAL/HIGH 残課題 0 件 (privacy.html 本文挿入は法務レビュー律速で別軸)

すべてチェック完了で Phase 6 完了 → Phase 7 (Zoom Marketplace 審査 / Azure AD 審査 / Deepgram PoC / `analyze` handler / Resend) 着手可。

---

## 参考資料

- `CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md` §13.3 デプロイ手順 / §11 セキュリティ (暗号化キー)
- `ARCHITECTURE.md` §9.6 / §10 legacy CI/CD 環境
