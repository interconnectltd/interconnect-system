# INTERCONNECT デプロイ手順

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
3. `supabase/migrations/00007_scheduling_availability.sql` — 候補時間帯ロジック
4. `supabase/migrations/00008_feed_token_version.sql` — ICS フィードトークンの世代管理

### 3.2 適用方法

**A. Supabase SQL Editor (GUI) の場合**: 上記ファイルの内容を順にコピペして実行。

**B. CLI の場合**:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

### 3.3 重要: 00006 と 00007 は同一トランザクションで適用すること

`00006_calendar_chat.sql` のみを単独で適用した状態だと、`messages.content_type` の CHECK 制約が新しいコードが投入する値を拒否します。`00007_scheduling_availability.sql` で CHECK が拡張されるため、**必ず 00006 → 00007 をワンセットで適用**してください。SQL Editor で実行する場合は両ファイルを連結した1スクリプトとして流すのが安全です。

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
| `/api/v1/retention/cron` | 日次 18:00 UTC (= JST 03:00) | 録音・文字起こしの90日リテンション削除 |

### 初回手動トリガー

デプロイ直後に動作確認しておくと安心です。

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://<deploy>.vercel.app/api/v1/calendar/cron

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

1. **Database 型の正規化**: `supabase gen types typescript --project-id <ref> > src/types/database.ts` を整備し、`next.config.ts` の `typescript.ignoreBuildErrors` を `false` に戻す。
2. **Profile modal の候補3件提案**: legacy のプロフィール modal と新 scheduling ロジックを連携させ、空き時間候補を3件まで提案する UI を実装。
3. **メール送信基盤**: ICS の自動配信 (招待メール) のために Resend を導入予定。`RESEND_API_KEY` を env に追加し、 `/api/v1/calendar/invite` から送信。
4. **プライバシーポリシー更新**: `privacy.html` に以下の条項を追記する必要あり。
   - 会議音声の録音について
   - AI による文字起こし・要約処理について
   - 録音・文字起こしデータの90日自動削除について

---

## 参考資料

- `CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md` §13.3 デプロイ手順 / §11 セキュリティ (暗号化キー)
- `ARCHITECTURE.md` §9.6 / §10 legacy CI/CD 環境
