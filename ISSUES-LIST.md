# INTERCONNECT 問題リスト

**作成日:** 2026-02-11
**最終更新:** 2026-02-12（セクション1〜6修正後）

---

## カテゴリA: セキュリティ（即座対応必要）

| # | 深刻度 | 問題 | ファイル | 状態 |
|---|---|---|---|---|
| A1 | **CRITICAL** | `.env`が本番シークレットを含んだまま公開可能（publish="."） | netlify.toml:2, .env | ✅ Phase修正済 |
| A2 | **CRITICAL** | `publish="."` — SQL/設定/.envファイルがCDN経由で全世界に公開 | netlify.toml:2 | ✅ Phase修正済 |
| A3 | **CRITICAL** | TimeRex APIキーがソースコードにハードコード | supabase/functions/timerex-booking/index.ts:10 | ✅ Phase修正済 |
| A4 | **CRITICAL** | invite.html が**別のSupabaseプロジェクト**に接続 | invite.html:268-271 | ✅ Phase修正済 |
| A5 | **CRITICAL** | LINE Channel Secret が .env に平文保存 | .env:7 | ✅ Phase修正済 |
| A6 | **CRITICAL** | admin.html に認証チェックなし — 誰でもアクセス可能 | admin.html | ✅ セクション4修正 |
| A7 | **HIGH** | CORS `Access-Control-Allow-Origin: *` — 全オリジン許可 | netlify.toml:18-20 | ✅ Phase修正済 |
| A8 | **HIGH** | timerex-webhook の署名検証がオプション（スキップ可能） | timerex-webhook/index.ts:21-33 | ✅ Phase修正済 |
| A9 | **HIGH** | timerex-booking にユーザー認証なし | timerex-booking/index.ts:19-51 | ⬜ 未対応 |
| A10 | **HIGH** | オープンリダイレクト — sessionStorageのURLを検証なしでリダイレクト | supabase-unified.js | ✅ セクション1修正 |
| A11 | **HIGH** | 管理者チェックがクライアント側のみ（is_admin） | admin-referral-bundle.js:29-50 | ⬜ 未対応（RLS補強必要） |
| A12 | **HIGH** | 全フォームにCSRFトークンなし | 全HTML | ⬜ 低リスク（JWT認証） |
| A13 | **HIGH** | XSS: onclick属性にユーザーIDを未エスケープで埋め込み | members-bundle.js:2726,2729 | ✅ セクション2修正（dashboard）、セクション3修正（members/matching） |
| A14 | **MEDIUM** | CDNリソースにSRI（integrity）属性なし | 全HTML | ⬜ 未対応 |
| A15 | **MEDIUM** | security.jsが実装済みだがline-auth関数が使っていない | netlify/functions/ | ⬜ 低影響 |

---

## カテゴリB: データベース・スキーマ不整合

| # | 深刻度 | 問題 | 詳細 | 状態 |
|---|---|---|---|---|
| B1 | **CRITICAL** | `user_profiles` の CREATE TABLE が存在しない | JSは`user_profiles`を使用、SQLは`profiles`のみ定義 | ✅ Phase修正済（canonical schema） |
| B2 | **CRITICAL** | `invite_links` のカラム名衝突: `created_by` vs `user_id` | 2つのSQLが異なるカラム定義 | ✅ Phase修正済 |
| B3 | **CRITICAL** | `cashout_requests` のデータ型不一致: JSONB vs 個別カラム | JS→JSONB、一方のSQL→個別TEXT | ✅ Phase修正済 |
| B4 | **CRITICAL** | `invitations` のカラム名衝突: `invitation_code` vs `invite_code` | 4つ以上のSQLファイルが異なる定義 | ✅ Phase修正済 |
| B5 | **HIGH** | `connections` CHECK制約: pending/accepted/rejected/blocked のみ | JSがcancelled/removedを書き込み | ✅ Phase修正済 |
| B6 | **HIGH** | ポイント二重管理: `profiles.available_points` と `user_points`テーブル | 同期機構なし | ⬜ 未対応 |
| B7 | **HIGH** | 9テーブルがJSから参照されるがCREATE TABLEなし | user_profiles等 | ✅ Phase修正済（canonical schema） |
| B8 | **HIGH** | RPC関数のオーバーロード: create_invite_link(3版), get_referral_stats(5版) | 最後に実行されたSQLが勝つ | ✅ Phase修正済（canonical schema） |
| B9 | **MEDIUM** | マイグレーション順序が未定義 — DROP IF EXISTSなし | 再実行すると衝突 | ✅ Phase修正済 |
| B10 | **MEDIUM** | 複数の「FINAL」テストデータファイル | どれが正しいか不明 | ⬜ 低影響 |

---

## カテゴリC: Realtime購読の問題

| # | 深刻度 | 問題 | ファイル:行 | 状態 |
|---|---|---|---|---|
| C1 | **CRITICAL** | テーブル名不一致: `profiles` → 正しくは `user_profiles` | members-bundle.js:419 | ✅ Phase修正済 |
| C2 | **CRITICAL** | テーブル名不一致: `referrals`/`referrer_id` → 正しくは `invitations`/`inviter_id` | notifications-realtime-unified.js:169 | ✅ Phase修正済 |
| C3 | **CRITICAL** | テーブル名不一致: `matches` → 正しくは `matchings` | notifications-realtime-unified.js:127,135 | ✅ Phase修正済 |
| C4 | **HIGH** | 全13 Realtime購読でunsubscribe/cleanupなし → メモリリーク | 複数ファイル | ✅ セクション2修正（dashboard cleanup追加） |
| C5 | **MEDIUM** | members-bundle, matching-bundle がフィルタなしで全変更を購読 | members-bundle.js, matching-bundle.js | ✅ セクション6修正（handleProfileUpdate限定化 + unsubscribe確認済） |

---

## カテゴリD: window.*グローバル関数の問題

| # | 深刻度 | 問題 | ファイル:行 | 状態 |
|---|---|---|---|---|
| D1 | **HIGH** | `window.sendConnectRequest` — 呼び出されるが未定義 | members-bundle.js:2746 | ✅ Phase修正済 |
| D2 | **HIGH** | `window.openChat` — どこにも定義されていない | messages-bundle.js:620 | ✅ Phase修正済 |
| D3 | **HIGH** | `window.openCashoutModal` — 循環参照 | referral-bundle.js:851 | ✅ Phase修正済 |
| D4 | **MEDIUM** | `window.RealtimeNotifications` — クラス未エクスポート | dashboard-unified.js:2182 | ✅ 修正済み（参照消滅、fixRealtimeNotifications()空関数化） |
| D5 | **MEDIUM** | `window.openShareModal` — 同ファイル内で2回定義 | referral-bundle.js:803,968 | ✅ Phase修正済 |
| D6 | **LOW** | 40+のwindow.*が定義されているが一度も呼ばれない（デッドコード） | core-utils.js等 | ⬜ 低影響 |

---

## カテゴリE: ロジックバグ・データフロー

| # | 深刻度 | 問題 | ファイル:行 | 状態 |
|---|---|---|---|---|
| E1 | **CRITICAL** | `supabase`を`window.supabaseClient`の代わりに使用 → 未定義エラー | referral-bundle.js:296 | ✅ Phase修正済（エイリアス設定） |
| E2 | **HIGH** | getUser()のdata直接分割代入 — dataがnullなら即クラッシュ | connections-bundle.js:51, profile-bundle.js:88 | ✅ セクション1〜4修正（safeGetUser + null guard） |
| E3 | **HIGH** | 登録フローのレースコンディション: window.registerがラップ時未定義の可能性 | registration-unified.js:177-199 | ✅ セクション1修正（二重submit防止 + upsert） |
| E4 | **HIGH** | マッチングスコア計算: skills/interestsがNULL → NaN → 結果空 | matching-bundle.js:95 | ✅ Phase修正済 |
| E5 | **HIGH** | messages-bundle: Supabase失敗時にダミーデータを静かに表示 | messages-bundle.js:61-86 | ✅ 修正済み（loadDummyData() 削除済み、エラーUI実装済み） |
| E6 | **MEDIUM** | profileCache の有効期限が定義済みだが未チェック | members-bundle.js:24,79 | ⬜ 低影響 |
| E7 | **MEDIUM** | 税額計算の浮動小数点精度問題 | referral-bundle.js:239,305 | ⬜ Math.floorで実害なし |
| E8 | **MEDIUM** | cashout.amount.toLocaleString() — null/stringならクラッシュ | referral-bundle.js:699 | ✅ セクション4修正 |
| E9 | **MEDIUM** | イベントリスナー重複登録の可能性 | connections-bundle.js:75-79 | ✅ セクション4修正（重複init guard） |
| E10 | **MEDIUM** | LINE QRファイルがフォームで収集されるがDB/Storageに保存されない | registration-unified.js | ✅ 修正済み（registration-unified.js:2240-2270でStorage upload実装済み） |

---

## カテゴリF: ページ機能の欠落

| # | 深刻度 | 問題 | 状態 |
|---|---|---|---|
| F1 | **HIGH** | admin.html — データ読み込みコードなし、テーブル空、全数値ハードコード | ✅ セクション4修正（DB実データ化） |
| F2 | **HIGH** | super-admin.html — Supabase接続なし、全KPIハードコード | ✅ セクション5修正（認証ガード + KPI/アクティビティ実データ + ログアウト） |
| F3 | **HIGH** | settings.html — 全フォームがUIスタブ、保存機能なし | ✅ セクション4修正（実保存実装） |
| F4 | **HIGH** | billing.html — コンテンツ空 | ✅ セクション6修正（プラン表示 + DB連携 + お問い合わせ導線） |
| F5 | **MEDIUM** | admin.html タブ3つ（events/reports/system）にコンテンツなし | ✅ セクション6修正（3セクション追加 + データ取得実装） |
| F6 | **MEDIUM** | HTMLコメント内に古いscript参照29件 | ✅ セクション4+6修正（全HTMLからコメント削除完了） |

---

## カテゴリG: CSS・UI

| # | 深刻度 | 問題 | 状態 |
|---|---|---|---|
| G1 | **MEDIUM** | `slide-left`, `slide-right` アニメーション未定義 | ✅ セクション4修正（register-page.css追加） |
| G2 | **MEDIUM** | `list-view`, `list-header`等 メンバー一覧のリスト表示モード未定義 | ⬜ 未対応 |
| G3 | **LOW** | `image-loaded`, `image-error` 状態クラス未定義 | ⬜ 低影響 |
| G4 | **LOW** | booking-complete.html, line-callback.html のスタイルがインライン | ⬜ 低影響 |

---

## 集計（セクション6完了後）

| カテゴリ | CRITICAL | HIGH | MEDIUM | LOW | 修正済 | 未対応 | 合計 |
|---|---|---|---|---|---|---|---|
| A. セキュリティ | 6→0 | 7→3 | 2→2 | 0 | 10 | 5 | **15** |
| B. DB不整合 | 4→0 | 4→1 | 2→1 | 0 | 8 | 2 | **10** |
| C. Realtime | 3→0 | 1→0 | 1→0 | 0 | 5 | 0 | **5** |
| D. グローバル関数 | 0 | 3→0 | 2→0 | 1→1 | 5 | 1 | **6** |
| E. ロジックバグ | 1→0 | 4→0 | 5→2 | 0 | 8 | 2 | **10** |
| F. ページ機能 | 0 | 4→0 | 2→0 | 0 | 6 | 0 | **6** |
| G. CSS/UI | 0 | 0 | 2→1 | 2→2 | 1 | 3 | **4** |
| **合計** | **14→0** | **23→4** | **16→6** | **3→3** | **43** | **13** | **56** |

**CRITICAL 14件: 全て修正済み**
**HIGH 23件: 19件修正済み、4件未対応**
**修正率: 43/56 = 77%**

---

## 残存問題一覧（13件）

### HIGH（4件）
- A9: timerex-booking ユーザー認証なし
- A11: 管理者チェックがクライアント側のみ（RLS補強必要）
- A12: CSRFトークンなし（JWT認証で低リスク）
- B6: ポイント二重管理

### MEDIUM（6件）
- A14: CDN SRI属性なし
- A15: security.js未使用
- B10: 複数「FINAL」テストデータ
- E6: profileCache有効期限未チェック
- E7: 税額浮動小数点精度
- G2: リスト表示モードCSS未定義

### LOW（3件）
- D6: window.*デッドコード
- G3: image状態クラス未定義
- G4: インラインスタイル
