# Phase 6 完了判定チェックリスト

> **位置付け**: Phase 6（本番デプロイ + smoke test 実走）の **完了基準** を定義する判定書。
> **手順は扱わない** — 実行手順は `docs/PHASE-6-RUNBOOK.md`、環境/設定は `DEPLOY.md` を参照。
> **上位文脈**: `docs/ARCHITECTURE-V5.md` §8（Phase 5 完了 → Phase 6 着手 → Phase 7 外部審査）。
>
> 使い方: 各項目を上から順に確認し、すべて `[x]` が埋まれば Phase 6 を完了とみなす。
> 期待値（"= ..."）と確認方法（"→ ..."）を1行ずつ添える。

---

## § 1. 前提条件チェック

- [ ] Node.js 20+ / pnpm 9+ がローカルに導入済み = `pnpm -v` が 9 以上 → `pnpm -v && node -v`
- [ ] Vercel CLI が導入済み = `vercel --version` が応答 → `vercel --version`
- [ ] Supabase プロジェクト本番分が存在 = ダッシュボードで project-ref 確認可 → Supabase Console
- [ ] `vercel whoami` が **正しい team** を返す = misslink 防止 → `vercel whoami`
- [ ] 本ブランチが `feat/calendar-chat-agent-a` 系列で最新 main を取り込み済み = `git log --oneline main..HEAD` が想定通り → `git fetch && git status`

## § 2. CLI / 環境変数チェック

- [ ] `.vercel/project.json`（または `repo.json`）が存在 = `vercel link` 完了 → `ls .vercel/`
- [ ] DEPLOY.md §2.2 の必須キー9種が **Production / Preview / Development 全環境** に投入済 = `vercel env ls` で 3環境すべてに表示 → `vercel env ls`
- [ ] `CALENDAR_TOKEN_ENCRYPTION_KEY` が 64文字 hex = AES-256-GCM 規格 → `vercel env pull && grep CALENDAR_TOKEN .env.local | awk -F= '{print length($2)}'`
- [ ] `CRON_SECRET` が3環境で同値 = Cron 認証一致 → ダッシュボード or `vercel env pull` 比較
- [ ] Google / Microsoft / Zoom 等オプションキーは「使う環境のみ」投入 = 不要環境に流出していない → `vercel env ls`

## § 3. Supabase Migration チェック

- [ ] `00006_calendar_chat.sql` 適用済 = `calendar_connections / calendar_events / chat_rooms / chat_messages / chat_analysis` が存在 → `select to_regclass('public.calendar_connections');` 等が NOT NULL
- [ ] `00007_scheduling_availability.sql` 適用済 = `availability_rules / availability_overrides` が存在 + `messages.content_type` の CHECK が拡張済 → 同上
- [ ] `00008_feed_token_version.sql` 適用済 = `user_profiles.feed_token_version` カラムあり → `\d user_profiles`
- [ ] `00009_meetings_jobs_transcripts.sql` 適用済 = `meeting_requests / meetings / meeting_participants_v2 / meeting_transcripts / job_queue` が存在 → 同上
- [ ] `00010_ics_feed_access_token_optional.sql` 適用済 = ICS access_token カラムが NULL 許容 → `\d calendar_connections`
- [ ] **RLS が全テーブルで ENABLE** = 新規追加テーブル全件で `rowsecurity = true` → `select tablename, rowsecurity from pg_tables where schemaname='public';`
- [ ] Realtime publication に `chat_messages` / `notifications` が追加済 = チャット即時配信前提 → `select * from pg_publication_tables where pubname='supabase_realtime';`

## § 4. Database 型チェック

- [ ] `supabase gen types typescript --project-id <ref>` 実行済 = `src/types/database.ts` が最新スキーマ反映 → `git diff src/types/database.ts`
- [ ] `pnpm tsc --noEmit` がエラー 0件 = 型不整合なし → `pnpm tsc --noEmit | tail`
- [ ] `next.config.ts` の `typescript.ignoreBuildErrors` が **`false` に復帰** = 緊急回避フラグ解除 → `grep ignoreBuildErrors next.config.ts`
- [ ] `pnpm build` がローカルで PASS = Vercel ビルドと同等通過 → `pnpm build`

## § 5. Preview デプロイチェック

- [ ] `vercel deploy`（フラグなし）が成功 = ビルドログに ERROR なし → CLI 出力
- [ ] Preview URL を取得済 = `https://<hash>-<team>.vercel.app` → CLI 末尾 + `vercel ls`
- [ ] ホーム `/` が **HTTP 200** で返る = SSR/SSG 正常 → `curl -I <preview-url>/`
- [ ] `/login` 等主要ページが 200 = ルーティング健全 → `curl -I <preview-url>/login`

## § 6. Smoke-test チェック

- [ ] `scripts/smoke-test.sh <preview-url>` が **全項目 PASS** = エンドポイント疎通 OK → `bash scripts/smoke-test.sh https://<preview>`
- [ ] `tsx scripts/smoke-test-supabase.ts` が PASS = service key で読み書き可 → `pnpm tsx scripts/smoke-test-supabase.ts`
- [ ] `/api/v1/health` が `{ ok: true }` で **200** = アプリ起動健全 → `curl <preview>/api/v1/health`
- [ ] `/api/v1/calendar/cron` が **無認証で 401 / `Bearer $CRON_SECRET` で 200** = Cron 認証ガード機能 → `curl` 2回比較
- [ ] `/api/v1/jobs/cron` が同様に **401 vs 200** を返す = ジョブ Cron ガード機能 → 同上
- [ ] `/api/v1/retention/cron` が同様に **401 vs 200** を返す = リテンション Cron ガード機能 → 同上

## § 7. 機能動作チェック

- [ ] Google OAuth 連携が完走 = `calendar_connections` に provider='google' 行が暗号化済で挿入 → UI で「連携」→ DB 確認
- [ ] ICS subscribe が成功 = `/calendar/ics/subscribe` POST 200 + `calendar_events` に取り込み行 → UI 操作 + select count
- [ ] チャット送受信が双方向で通る = 2セッションでメッセージが Realtime で即時表示 → 2 ブラウザでテスト
- [ ] `/api/v1/scheduling/suggest` が候補を返却 = レスポンスに最大3件の候補時間帯 → curl + 認証
- [ ] `/api/v1/jobs/cron` が **5分後に Vercel Cron で自動実走** = ログに自動 invocation を確認 → `vercel logs --follow` を 6分待機

## § 8. PR Ready 化チェック

- [ ] PR が draft 解除（Ready for review）= レビュー依頼可能状態 → GitHub UI
- [ ] PR コメントに **Preview URL** を共有済 = レビュアーが即アクセス可 → `gh pr view --comments`
- [ ] PR 説明に Phase 6 完了の判定根拠（このチェックリストへのリンク）を記載 = トレーサビリティ → PR description
- [ ] `docs/ARCHITECTURE-V5.md` §8 の Phase 6 行を「✓ 完了」に更新済 = 進捗の単一情報源を維持 → `git diff docs/ARCHITECTURE-V5.md`

---

**すべてチェック完了で Phase 6 完了 → Phase 7（Zoom Marketplace / Azure AD 外部審査 + 本番ローンチ）着手可。**
