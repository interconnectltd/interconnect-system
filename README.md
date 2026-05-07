# INTERCONNECT

日本語経営者コミュニティプラットフォーム

## 概要

INTERCONNECT は、日本の経営者・起業家・事業責任者が出会い、学び、協業するためのプライベートコミュニティプラットフォームです。プロフィール公開、メンバーマッチング、イベント参加、相談予約に加え、新機能としてカレンダー連携・1:1 チャット・AI 議事録 (Agent A) を提供します。

本リポジトリには **2 つのアプリケーション** が同居しています。本番運用中のレガシー静的サイト (Netlify) と、新機能向けに段階的に立ち上げ中の Next.js アプリケーション (Vercel) です。

## アーキテクチャ概観

| 層 | 構成 | ステータス |
| --- | --- | --- |
| Legacy フロントエンド | Vanilla JS + 各種 `*.html` (Netlify) | 本番運用中 (https://inter-connect.app) |
| Next.js アプリ | App Router / `/chat`, `/calendar`, `/settings`, `/meetings`, `/connections` | `feat/calendar-chat-agent-a` ブランチ — 未デプロイ |
| API | Next.js Route Handlers (`/api/v1/*`) | 同上 |
| Backend | Supabase (Postgres + Auth + Realtime + Storage + Edge Functions) | 共通利用 |
| Worker | Agent A 録音 → 文字起こし (`worker/`) | 開発中 |
| ホスティング | Netlify (legacy) / Vercel (Next.js) | 並走運用予定 |

```
              ┌───────────────────────┐
   ユーザー ──┤  Netlify (legacy 静的)│──┐
              └───────────────────────┘  │
              ┌───────────────────────┐  ├──► Supabase (DB / Auth / Realtime / Storage)
              │  Vercel (Next.js)     │──┤
              └─────────┬─────────────┘  │
                        │                │
                        ▼                │
                 worker/ (Agent A) ──────┘
```

詳細は以下を参照してください。

- レガシー構成: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- 新機能設計: [`CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md`](./CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md)

## クイックスタート (開発)

```bash
cp .env.example .env.local   # 必要な値を入力 (Supabase URL / ANON KEY など)
pnpm install
pnpm dev                     # Next.js — http://localhost:3000
```

レガシー静的サイトを単体で確認する場合は、リポジトリルートで任意の静的ファイルサーバを起動してください (例: `npx serve .`)。

## デプロイ

デプロイ手順・環境ごとの注意事項は [`DEPLOY.md`](./DEPLOY.md) を参照してください。

- Netlify: `main` ブランチへの push で自動デプロイ (本番)
- Vercel: `feat/calendar-chat-agent-a` を Preview として接続予定

## ディレクトリ構成

| パス | 用途 |
| --- | --- |
| `/` (トップレベル `*.html`, `js/`, `css/`, `img/`) | legacy Netlify サイト |
| `src/app/` | Next.js App Router (pages + API) |
| `src/components/` | UI コンポーネント |
| `src/lib/` | ユーティリティ (`calendar/`, `chat/`, `supabase/`, `utils.ts` ほか) |
| `src/types/`, `src/validations/` | 型定義・Zod スキーマ |
| `supabase/migrations/` | DB マイグレーション (`00006_*` 以降が新機能用) |
| `worker/` | Agent A 録音 → 文字起こし worker |
| `scripts/` | smoke-test ほかオペレーション用スクリプト |
| `docs/` | 補助ドキュメント (要件定義書、ポリシー草案など) |
| `netlify/`, `netlify.toml` | legacy デプロイ設定 |

```
interconnect2/
├── *.html, js/, css/, img/        # legacy Netlify サイト
├── src/
│   ├── app/                       # Next.js App Router (pages + /api/v1/*)
│   ├── components/                # UI コンポーネント
│   ├── lib/                       # calendar / chat / supabase / utils
│   ├── types/  validations/       # 型定義・Zod スキーマ
│   └── content/                   # 静的コンテンツ
├── supabase/migrations/           # 00006 以降が新機能 (calendar / chat / meetings)
├── worker/                        # Agent A worker
├── scripts/                       # smoke-test, review-tools ほか
├── docs/                          # 補助資料
├── ARCHITECTURE.md
├── CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md
└── DEPLOY.md
```

## テスト

```bash
pnpm test                  # vitest (Phase 5 で追加)
./scripts/smoke-test.sh    # deploy 後の検証 (本番 / Preview を対象)
```

Supabase 接続のスモークテストは `scripts/smoke-test-supabase.ts` から実行できます。

## 主要ドキュメント

| ファイル | 内容 |
| --- | --- |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | legacy 構成 (Netlify + Vanilla JS) の全体像 |
| [`CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md`](./CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md) | カレンダー / チャット / Agent A の設計 |
| [`DEPLOY.md`](./DEPLOY.md) | デプロイ手順・運用ノート |
| [`docs/privacy-policy-update-draft.md`](./docs/privacy-policy-update-draft.md) | 新機能に伴うプライバシーポリシー追記草案 |
| [`docs/INTERCONNECT_要件定義書.html`](./docs/INTERCONNECT_要件定義書.html) | プロダクト要件定義 |

## コントリビュート

機能追加・修正は feature ブランチを切り、Pull Request で `main` (legacy) もしくは対応する開発ブランチ (`feat/calendar-chat-agent-a` ほか) に対して提出してください。コミットメッセージは日本語可、変更点と意図 (why) を簡潔に記載します。レビュー観点は `scripts/review-agent-prompt.md` を参考にしてください。

## セキュリティ

脆弱性や情報漏えいに関する報告は GitHub Issue ではなく、運営宛に直接お知らせください。Supabase の匿名キーを除き、サービスロールキー・各種 API シークレット・`CRON_SECRET` 等は決してコミットせず、`.env.local` および Vercel/Netlify の環境変数として管理してください。Row Level Security (RLS) の前提に依存しているため、マイグレーションを変更する際はポリシーの整合を必ず確認してください。
