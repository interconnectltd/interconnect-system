# INTERCONNECT 残存問題 完全リスト

**作成日:** 2026-02-11
**最終更新:** 2026-02-12（セクション1〜7完了後・最終版）

---

## 修正済み（Phase 1〜4 + セクション1〜6）

### Phase修正（ファイル統合時）
| ID | 問題 | 状態 |
|----|------|------|
| A1/A2 | netlify.toml publish → dist | ✅ 修正済 |
| A3 | TimeRex APIキーハードコード | ✅ 修正済 |
| A4 | invite.html 別プロジェクト接続 | ✅ 修正済 |
| A5 | .envの秘密鍵 → build.shで除外 | ✅ 修正済 |
| A7 | CORS * → 特定オリジン制限 | ✅ 修正済 |
| A8 | Webhook署名検証を必須化 | ✅ 修正済 |
| B1-B5/B7-B9 | 正規SQLスキーマ統合（canonical schema） | ✅ 修正済 |
| C1-C3 | Realtimeテーブル名修正 | ✅ 修正済 |
| D1-D3/D5 | window.*関数定義修正 | ✅ 修正済 |
| E1 | supabase変数名統一（エイリアス設定） | ✅ 修正済 |
| E4 | NaN防止（matchingスコア） | ✅ 修正済 |

### セクション1: ユーザー登録・ログイン（23件）
| 修正内容 | 状態 |
|----------|------|
| register.html スクリプト読み込み順修正 | ✅ |
| registration-unified.js 二重submit防止 | ✅ |
| registration-unified.js レースコンディション修正（E3） | ✅ |
| registration-unified.js QR失敗通知 | ✅ |
| supabase-unified.js LINE OAuth重複削除 | ✅ |
| supabase-unified.js ログイン試行レート制限 | ✅ |
| supabase-unified.js onAuthStateChange unsubscribe | ✅ |
| supabase-unified.js オープンリダイレクト修正（A10） | ✅ |
| guest-mode-manager.js 管理ページブロック | ✅ |
| 000_canonical_schema.sql RLSポリシー12テーブル追加 | ✅ |
| signUp後nullチェック（メール列挙防止） | ✅ |
| reset-password.html 新規作成 | ✅ |

### セクション2: ダッシュボード（14件）
| 修正内容 | 状態 |
|----------|------|
| モーダルクラッシュ修正（dashboardUI公開） | ✅ |
| ハードコード統計値（1234/15/89）削除 | ✅ |
| デッドコード削除（DashboardFinalFixes/EventFix） | ✅ |
| 重複init防止 | ✅ |
| N+1クエリ修正（event_participants一括取得） | ✅ |
| user_profilesからDB名前/アバター反映 | ✅ |
| XSS修正: showEventModal DOM構築化（A13） | ✅ |
| beforeunload: Chart.js破棄 + interval停止（C4） | ✅ |

### セクション3: メンバー一覧・マッチング（7件）
| 修正内容 | 状態 |
|----------|------|
| members.html スクリプト読み込み順統一 | ✅ |
| matching.html スクリプト順 + デバッグ削除 | ✅ |
| members-bundle.js フォールバック接続数→0 | ✅ |
| matching-bundle.js ダミースコア削除（A13関連） | ✅ |

### セクション4: 設定・管理・リカバリー（7件）
| 修正内容 | 状態 |
|----------|------|
| settings-bundle.js 実保存実装（F3） | ✅ |
| admin.html 認証ガード（A6） | ✅ |
| admin.html DB実データ化（F1） | ✅ |
| reset-password.html リカバリートークン検証 | ✅ |
| connections-bundle.js 重複init guard（E9） | ✅ |
| register-page.css slide-left/right追加（G1） | ✅ |
| 6 HTMLからコメントアウトscript削除（F6） | ✅ |
| referral-bundle.js toLocaleString null guard（E8） | ✅ |

### セクション5: super-admin完全修正
| 修正内容 | 状態 |
|----------|------|
| super-admin.html 認証ガード（visibility:hidden + is_admin） | ✅ |
| super-admin.html KPI実データ化（user_profiles/cashout/matchings/events） | ✅ |
| super-admin.html アクティビティ実データ化（最新5ユーザー） | ✅ |
| super-admin.html ログアウト実装（signOut + storage clear） | ✅ |
| login.html supabase-unified.js バージョン統一（v1.2→v1.1） | ✅ |
| ISSUES-LIST.md 全56件に完了マーク追加 | ✅ |
| REMAINING-ISSUES.md 最終状態更新 | ✅ |

### セクション6: 残存フロントエンド問題一括修正
| 修正内容 | 状態 |
|----------|------|
| E5: messages-bundle loadDummyData() 確認 → 既に削除済み | ✅ |
| E10: LINE QR 確認 → registration-unified.js:2240-2270で実装済み | ✅ |
| D4: RealtimeNotifications参照 → 既に消滅済み | ✅ |
| C5: matching-bundle.js handleProfileUpdate限定化 + unsubscribe確認 | ✅ |
| F5: admin.html events/reports/systemタブ実装（DB連携） | ✅ |
| F4: billing.html プラン表示 + DB連携 + お問い合わせ導線 | ✅ |
| F6残: コメントアウトscript参照 → 全HTML確認済み（残存0件） | ✅ |

### セクション7: 最終クリーンアップ
| 修正内容 | 状態 |
|----------|------|
| A14: CDN SRI属性追加（全28 HTML、バージョンピン含む） | ✅ |
| B10: レガシーSQLテストデータファイル15件削除 | ✅ |
| D6: デッドコード window.* 28件削除（13 JSファイル） | ✅ |
| activities.html 認証ガード追加（ISSUES-LIST外） | ✅ |
| A12: JWT Bearer認証でCSRF免疫 → 非該当と判定 | ✅ |
| B6: canonical schemaで解決済み → 非該当と判定 | ✅ |
| E6: cache expiry実装済み → 非該当と判定 | ✅ |
| E7: Math.floor使用済み → 非該当と判定 | ✅ |
| G2: JS内inline CSS実装済み → 非該当と判定 | ✅ |
| G3: JS内inline CSS実装済み → 非該当と判定 | ✅ |

---

## 残存問題（4件）— 全てバックエンド変更 or 低優先

### HIGH（1件） — バックエンド変更が必要

| ID | 問題 | 備考 |
|----|------|------|
| A9 | timerex-booking ユーザー認証なし | Edge Function修正が必要 |

### MEDIUM（2件） — バックエンド変更が必要

| ID | 問題 | 備考 |
|----|------|------|
| A11 | 管理者チェックがクライアント側のみ | RLSポリシーで is_admin チェック追加推奨 |
| A15 | security.jsがline-authで未使用 | Netlify Function修正が必要 |

### LOW（1件） — 低優先

| ID | 問題 | 備考 |
|----|------|------|
| G4 | booking-complete/line-callbackインラインスタイル | CSS外部化推奨 |

---

## その他の未対応事項（ISSUES-LIST外）

| 問題 | 備考 |
|------|------|
| スクリプト読み込み順序不整合（一部ページ） | profile.html等 |
| モバイルナビHTML構造崩壊（matching/referral等） | タグ修正が必要 |
| ~~認証チェック欠落ページ（activities/booking）~~ | ✅ activities追加済み（セクション7） |

---

## 集計

| 状態 | CRITICAL | HIGH | MEDIUM | LOW | 合計 |
|------|----------|------|--------|-----|------|
| ✅ 修正済 | 14 | 22 | 14 | 2 | **52** |
| ⬜ 未対応 | 0 | 1 | 2 | 1 | **4** |
| **合計** | **14** | **23** | **16** | **3** | **56** |

**CRITICAL: 14/14 修正済み (100%)**
**HIGH: 22/23 修正済み (96%)**
**全体: 52/56 修正済み (93%)**

---

## 推奨対応順（残り4件）

### 優先度1: セキュリティ（バックエンド）
1. A9: timerex-booking 認証追加（Edge Function）
2. A11: RLSで is_admin チェック追加（SQL）
3. A15: line-auth関数でsecurity.js使用（Netlify Function）

### 優先度2: 品質改善（低優先）
4. G4: インラインスタイルCSS外部化
