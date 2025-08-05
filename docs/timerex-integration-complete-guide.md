# TimeRex統合 完全実装ガイド

## 概要
このガイドでは、INTERCONNECTシステムにTimeRex予約システムを統合する手順を順番に説明します。

## 実装の流れ

### Phase 1: データベース準備（完了）
1. ✅ SQLテーブルの作成
   - booking_sessions
   - bookings
   - referral_tracking
   - booking_referral_view

### Phase 2: バックエンド実装（完了）
1. ✅ Supabase Edge Functions作成
   - timerex-booking: 予約セッション作成
   - timerex-webhook: 予約状態の更新

### Phase 3: フロントエンド実装（完了）
1. ✅ 予約ボタンUI（index.html）
2. ✅ 予約ハンドラーJS（timerex-booking.js）
3. ✅ 紹介コード自動適用
4. ✅ z-index管理

### Phase 4: 外部サービス設定（実施予定）
1. ⏳ TimeRexアカウント作成
2. ⏳ Supabase Edge Functionsデプロイ
3. ⏳ Netlify環境変数設定

## 詳細実装手順

### 1. データベースセットアップ
```bash
# Supabaseダッシュボードで実行
# /sql/execute-in-order.sql の内容をSQL Editorで実行
```

### 2. Edge Functionsデプロイ
```bash
# Supabase CLIを使用
cd /home/ooxmichaelxoo/INTERCONNECT_project
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy timerex-booking
supabase functions deploy timerex-webhook

# 環境変数設定
supabase secrets set TIMEREX_API_KEY=YOUR_API_KEY
supabase secrets set TIMEREX_BOOKING_PAGE_ID=interconnect-consultation
supabase secrets set TIMEREX_WEBHOOK_SECRET=YOUR_SECRET
```

### 3. TimeRex設定
1. アカウント作成
2. 予約ページ作成（ID: interconnect-consultation）
3. カスタムフィールド設定：
   - referral_code（非表示、必須）
   - user_id（非表示、任意）
   - consultation_type（表示、必須）
   - consultation_details（表示、任意）
4. Webhook設定：
   - URL: https://interconnect-auto.netlify.app/api/timerex-webhook
   - イベント: 全て選択

### 4. Netlify設定
1. 環境変数追加：
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - NEXT_PUBLIC_TIMEREX_PAGE_ID
2. netlify.tomlのProject ID更新
3. デプロイ実行

### 5. 動作確認
1. 予約ボタンのクリックテスト
2. 紹介コードの自動適用確認
3. 予約データの保存確認
4. Webhook通知の受信確認

## ファイル構成

### SQLファイル
- `/sql/execute-in-order.sql` - 全テーブル作成
- `/sql/create-booking-tables-perfect.sql` - 予約テーブル
- `/sql/referral-tracking-tables-perfect.sql` - 紹介追跡テーブル

### JavaScriptファイル
- `/js/timerex-booking.js` - 予約ボタンハンドラー
- `/js/referral-landing.js` - 紹介リンク処理
- `/js/register-referral-handler.js` - 登録時の紹介コード処理

### Edge Functions
- `/supabase/functions/timerex-booking/` - 予約API
- `/supabase/functions/timerex-webhook/` - Webhook受信

### スタイル
- `/css/z-index-priority.css` - レイヤー管理

## トラブルシューティング

### よくある問題

1. **supabaseClient未定義エラー**
   - 解決済み: null チェックとフォールバック処理追加

2. **SQL実行エラー**
   - 解決済み: カラム名の統一（session_id, booking_id）

3. **z-index競合**
   - 解決済み: 優先順位管理CSS追加

### デバッグ方法

1. **Edge Functionsログ確認**
   ```bash
   supabase functions logs timerex-booking --follow
   ```

2. **ブラウザコンソール確認**
   - 予約ボタンクリック時のエラー
   - ネットワークタブでAPIレスポンス確認

3. **Supabaseダッシュボード**
   - テーブルデータ確認
   - RLSポリシー確認

## 次のステップ

1. TimeRexアカウント作成と設定
2. Supabase Edge Functionsの本番デプロイ
3. Netlify環境変数の設定
4. 本番環境での動作テスト
5. ユーザーマニュアルの作成

## 関連ドキュメント

- [Supabase Edge Functionsデプロイ手順](/docs/supabase-edge-functions-deploy.md)
- [TimeRex設定手順](/docs/timerex-setup-guide.md)
- [Netlify環境変数設定手順](/docs/netlify-env-setup-guide.md)