# INTERCONNECT 問題リスト

**作成日:** 2026-02-11
**ファイル統合後の徹底監査に基づく**

---

## カテゴリA: セキュリティ（即座対応必要）

| # | 深刻度 | 問題 | ファイル |
|---|---|---|---|
| A1 | **CRITICAL** | `.env`が本番シークレットを含んだまま公開可能（publish="."） | netlify.toml:2, .env |
| A2 | **CRITICAL** | `publish="."` — SQL/設定/.envファイルがCDN経由で全世界に公開 | netlify.toml:2 |
| A3 | **CRITICAL** | TimeRex APIキーがソースコードにハードコード | supabase/functions/timerex-booking/index.ts:10 |
| A4 | **CRITICAL** | invite.html が**別のSupabaseプロジェクト**に接続 | invite.html:268-271 |
| A5 | **CRITICAL** | LINE Channel Secret が .env に平文保存 | .env:7 |
| A6 | **CRITICAL** | admin.html に認証チェックなし — 誰でもアクセス可能 | admin.html |
| A7 | **HIGH** | CORS `Access-Control-Allow-Origin: *` — 全オリジン許可 | netlify.toml:18-20 |
| A8 | **HIGH** | timerex-webhook の署名検証がオプション（スキップ可能） | timerex-webhook/index.ts:21-33 |
| A9 | **HIGH** | timerex-booking にユーザー認証なし | timerex-booking/index.ts:19-51 |
| A10 | **HIGH** | オープンリダイレクト — sessionStorageのURLを検証なしでリダイレクト | supabase-unified.js:255,273 |
| A11 | **HIGH** | 管理者チェックがクライアント側のみ（is_admin） | admin-referral-bundle.js:29-50 |
| A12 | **HIGH** | 全フォームにCSRFトークンなし | 全HTML |
| A13 | **HIGH** | XSS: onclick属性にユーザーIDを未エスケープで埋め込み | members-bundle.js:2726,2729 |
| A14 | **MEDIUM** | CDNリソースにSRI（integrity）属性なし | 全HTML |
| A15 | **MEDIUM** | security.jsが実装済みだがline-auth関数が使っていない | netlify/functions/ |

---

## カテゴリB: データベース・スキーマ不整合

| # | 深刻度 | 問題 | 詳細 |
|---|---|---|---|
| B1 | **CRITICAL** | `user_profiles` の CREATE TABLE が存在しない | JSは`user_profiles`を使用、SQLは`profiles`のみ定義 |
| B2 | **CRITICAL** | `invite_links` のカラム名衝突: `created_by` vs `user_id` | 2つのSQLが異なるカラム定義 → RPC INSERT失敗 |
| B3 | **CRITICAL** | `cashout_requests` のデータ型不一致: JSONB vs 個別カラム | JS→JSONB、一方のSQL→個別TEXT → INSERT失敗 |
| B4 | **CRITICAL** | `invitations` のカラム名衝突: `invitation_code` vs `invite_code` | 4つ以上のSQLファイルが異なる定義 |
| B5 | **HIGH** | `connections` CHECK制約: pending/accepted/rejected/blocked のみ | JSがcancelled/removedを書き込み → ランタイムエラー |
| B6 | **HIGH** | ポイント二重管理: `profiles.available_points` と `user_points`テーブル | 同期機構なし → 残高不整合 |
| B7 | **HIGH** | 9テーブルがJSから参照されるがCREATE TABLEなし | user_profiles, event_participants, messages, activities, meeting_confirmations, member_growth_stats, industry_distribution, share_activities, invite_history |
| B8 | **HIGH** | RPC関数のオーバーロード: create_invite_link(3版), get_referral_stats(5版) | 最後に実行されたSQLが勝つ |
| B9 | **MEDIUM** | マイグレーション順序が未定義 — DROP IF EXISTSなし | 再実行すると衝突 |
| B10 | **MEDIUM** | 複数の「FINAL」テストデータファイル | どれが正しいか不明 |

---

## カテゴリC: Realtime購読の問題

| # | 深刻度 | 問題 | ファイル:行 |
|---|---|---|---|
| C1 | **CRITICAL** | テーブル名不一致: `profiles` → 正しくは `user_profiles` | members-bundle.js:419 |
| C2 | **CRITICAL** | テーブル名不一致: `referrals`/`referrer_id` → 正しくは `invitations`/`inviter_id` | notifications-realtime-unified.js:169 |
| C3 | **CRITICAL** | テーブル名不一致: `matches` → 正しくは `matchings` | notifications-realtime-unified.js:127,135 |
| C4 | **HIGH** | 全13 Realtime購読でunsubscribe/cleanupなし → メモリリーク | members-bundle.js, connections-bundle.js, matching-bundle.js, admin-referral-bundle.js, notifications-realtime-unified.js, notifications-unified.js, dashboard-unified.js |
| C5 | **MEDIUM** | members-bundle, matching-bundle がフィルタなしで全変更を購読 | members-bundle.js, matching-bundle.js |

---

## カテゴリD: window.*グローバル関数の問題

| # | 深刻度 | 問題 | ファイル:行 |
|---|---|---|---|
| D1 | **HIGH** | `window.sendConnectRequest` — 呼び出されるが未定義。接続リクエストが静かに失敗 | members-bundle.js:2746 |
| D2 | **HIGH** | `window.openChat` — どこにも定義されていない。チャット開けない | messages-bundle.js:620 |
| D3 | **HIGH** | `window.openCashoutModal` — 循環参照（自分自身を呼ぶ）。`window.cashoutModal`はあるが名前不一致 | referral-bundle.js:851 |
| D4 | **MEDIUM** | `window.RealtimeNotifications` — クラス未エクスポート | dashboard-unified.js:2182 |
| D5 | **MEDIUM** | `window.openShareModal` — 同ファイル内で2回定義（後者が上書き） | referral-bundle.js:803,968 |
| D6 | **LOW** | 40+のwindow.*が定義されているが一度も呼ばれない（デッドコード） | core-utils.js, referral-bundle.js等 |

---

## カテゴリE: ロジックバグ・データフロー

| # | 深刻度 | 問題 | ファイル:行 |
|---|---|---|---|
| E1 | **CRITICAL** | `supabase`を`window.supabaseClient`の代わりに使用 → 未定義エラー | referral-bundle.js:296 |
| E2 | **HIGH** | getUser()のdata直接分割代入 — dataがnullなら即クラッシュ | connections-bundle.js:51, profile-bundle.js:88 |
| E3 | **HIGH** | 登録フローのレースコンディション: window.registerがラップ時未定義の可能性 | registration-unified.js:177-199 |
| E4 | **HIGH** | マッチングスコア計算: skills/interestsがNULL → NaN → 結果空 | matching-bundle.js:95 |
| E5 | **HIGH** | messages-bundle: Supabase失敗時にダミーデータを静かに表示 | messages-bundle.js:61-86 |
| E6 | **MEDIUM** | profileCache の有効期限が定義済みだが未チェック（常にキャッシュ使用） | members-bundle.js:24,79 |
| E7 | **MEDIUM** | 税額計算の浮動小数点精度問題 | referral-bundle.js:239,305 |
| E8 | **MEDIUM** | cashout.amount.toLocaleString() — null/stringならクラッシュ | referral-bundle.js:699 |
| E9 | **MEDIUM** | イベントリスナー重複登録の可能性（init()が2回呼ばれる場合） | connections-bundle.js:75-79 |
| E10 | **MEDIUM** | LINE QRファイルがフォームで収集されるがDB/Storageに保存されない | registration-unified.js |

---

## カテゴリF: ページ機能の欠落

| # | 深刻度 | 問題 |
|---|---|---|
| F1 | **HIGH** | admin.html — データ読み込みコードなし、テーブル空、全数値ハードコード |
| F2 | **HIGH** | super-admin.html — Supabase接続なし、全KPIハードコード |
| F3 | **HIGH** | settings.html — 全フォームがUIスタブ、保存機能なし（テーマのlocalStorageのみ） |
| F4 | **HIGH** | billing.html — コンテンツ空（`<!-- Content will be added here -->`） |
| F5 | **MEDIUM** | 5つの管理ページへのリンクが404: admin-dashboard/events/reports/settings/users.html |
| F6 | **MEDIUM** | HTMLコメント内に古いscript参照29件（掃除推奨） |

---

## カテゴリG: CSS・UI

| # | 深刻度 | 問題 |
|---|---|---|
| G1 | **MEDIUM** | `slide-left`, `slide-right` アニメーション未定義 → 登録フォームのステップ遷移が視覚的に無反応 |
| G2 | **MEDIUM** | `list-view`, `list-header`等 メンバー一覧のリスト表示モード未定義 |
| G3 | **LOW** | `image-loaded`, `image-error` 状態クラス未定義 |
| G4 | **LOW** | booking-complete.html, line-callback.html のスタイルがインライン |

---

## 集計

| カテゴリ | CRITICAL | HIGH | MEDIUM | LOW | 合計 |
|---|---|---|---|---|---|
| A. セキュリティ | 6 | 7 | 2 | 0 | **15** |
| B. DB不整合 | 4 | 4 | 2 | 0 | **10** |
| C. Realtime | 3 | 1 | 1 | 0 | **5** |
| D. グローバル関数 | 0 | 3 | 2 | 1 | **6** |
| E. ロジックバグ | 1 | 4 | 5 | 0 | **10** |
| F. ページ機能 | 0 | 4 | 2 | 0 | **6** |
| G. CSS/UI | 0 | 0 | 2 | 2 | **4** |
| **合計** | **14** | **23** | **16** | **3** | **56** |

---

## 推奨対応順序

### Phase 1: 緊急セキュリティ修正
1. netlify.toml の `publish` を専用ディレクトリに変更 (A1, A2)
2. 全シークレットをローテーション (A3, A5)
3. invite.html のSupabase接続先を修正 (A4)
4. admin.html に認証ガードを追加 (A6)

### Phase 2: データベース正規化
1. 正規SQLスキーマを1ファイルにまとめる (B1-B4)
2. マイグレーション順序を確立 (B9)
3. CHECK制約をJS使用値と整合 (B5)

### Phase 3: Realtime修正
1. テーブル名を全て正しいものに修正 (C1-C3)
2. unsubscribe/cleanup を全購読に追加 (C4)

### Phase 4: ロジックバグ修正
1. supabase変数名の統一 (E1)
2. getUser() の安全な分割代入 (E2)
3. NULL配列のデフォルト値処理 (E4)
4. window.*関数の定義漏れ修正 (D1-D3)

### Phase 5: 機能実装
1. settings.html のフォーム保存機能 (F3)
2. admin.html のデータ読み込み (F1)
3. billing.html のコンテンツ (F4)

### Phase 6: UI/CSS修正
1. アニメーション定義追加 (G1)
2. リスト表示モードCSS (G2)
3. コメント掃除 (F6)
