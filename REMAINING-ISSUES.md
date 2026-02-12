# INTERCONNECT 残存問題 完全リスト

**作成日:** 2026-02-11
**最終更新:** 2026-02-12（セクション1〜5完了後）

---

## 修正済み（Phase 1〜4 + セクション1〜5）

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

---

## 残存問題（17件）

### HIGH（6件）

| ID | 問題 | 備考 |
|----|------|------|
| A9 | timerex-booking ユーザー認証なし | Edge Function修正が必要 |
| A11 | 管理者チェックがクライアント側のみ | RLSポリシーで is_admin チェック追加推奨 |
| A12 | 全フォームにCSRFトークンなし | Supabase JWT認証でリスク低。SameSite cookie設定で軽減可能 |
| B6 | ポイント二重管理（profiles.available_points + user_points） | user_pointsに一元化推奨 |
| E5 | messages-bundle ダミーデータ表示 | エラーUI表示に置換推奨 |
| F4 | billing.html コンテンツ空 | ページ実装が必要 |

### MEDIUM（8件）

| ID | 問題 | 備考 |
|----|------|------|
| A14 | CDN SRI属性なし | integrity hash追加推奨 |
| A15 | security.jsがline-authで未使用 | 影響なし |
| B10 | 複数「FINAL」テストデータファイル | 整理推奨 |
| C5 | Realtime購読フィルタなし（全変更受信） | user_idフィルタ推奨 |
| D4 | RealtimeNotifications未エクスポート | 影響小 |
| E10 | LINE QRファイル未保存 | Storage upload実装が必要 |
| F5 | 管理ページリンク404（5件） | ページ作成またはリンク削除 |
| G2 | リスト表示モードCSS未定義 | CSS追加が必要 |

### LOW（3件）

| ID | 問題 | 備考 |
|----|------|------|
| D6 | window.*デッドコード40件+ | コード品質改善 |
| G3 | image-loaded/error状態クラス未定義 | CSS追加が必要 |
| G4 | booking-complete/line-callbackインラインスタイル | CSS外部化推奨 |

---

## その他の未対応事項（ISSUES-LIST外）

| 問題 | 備考 |
|------|------|
| E6: profileCache有効期限未チェック | 動作に影響なし |
| E7: 税額浮動小数点精度 | Math.floorで実害なし |
| スクリプト読み込み順序不整合（一部ページ） | profile.html等 |
| モバイルナビHTML構造崩壊（matching/referral等） | タグ修正が必要 |
| 認証チェック欠落ページ（activities/billing/booking） | supabase-unified.js追加必要 |
| コメントアウト済みscript参照（残り約20件） | 削除推奨 |

---

## 集計

| 状態 | CRITICAL | HIGH | MEDIUM | LOW | 合計 |
|------|----------|------|--------|-----|------|
| ✅ 修正済 | 14 | 18 | 7 | 0 | **39** |
| ⬜ 未対応 | 0 | 5 | 9 | 3 | **17** |
| **合計** | **14** | **23** | **16** | **3** | **56** |

**CRITICAL: 14/14 修正済み (100%)**
**HIGH: 18/23 修正済み (78%)**
**全体: 39/56 修正済み (70%)**

---

## 推奨対応順（残り17件）

### 優先度1: セキュリティ
1. A9: timerex-booking 認証追加
2. A11: RLSで is_admin チェック追加

### 優先度2: データ整合性
3. B6: ポイント管理一元化
4. E5: ダミーデータ削除 → エラーUI
5. E10: LINE QR Storage upload実装

### 優先度3: 機能実装
6. F4: billing.html コンテンツ
7. F5: 管理ページリンク整理

### 優先度4: 品質改善
8. A14: SRI属性追加
9. C5: Realtimeフィルタ追加
10. G2/G3: CSS追加
11. D6: デッドコード削除
