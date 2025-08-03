# tl:dv API連携セットアップガイド

## 概要
INTERCONNECTの紹介プログラムでは、tl:dvと連携して面談の自動検証を行います。

## セットアップ手順

### 1. tl:dvアカウントの準備

1. [tl:dv](https://tldv.io) でアカウントを作成
2. ダッシュボードから「Settings」→「Developers」へ
3. API Keyを生成してコピー
4. Webhook URLを設定：`https://[YOUR-SUPABASE-PROJECT].supabase.co/functions/v1/tldv-webhook`

### 2. Supabase環境変数の設定

Supabaseダッシュボードで以下の環境変数を設定：

```bash
# tl:dv API Key
TLDV_API_KEY=tldv_api_xxxxxxxxxxxxxxxx

# tl:dv Webhook Secret（tl:dvダッシュボードで確認）
TLDV_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx

# tl:dv Calendar ID（予約用）
TLDV_CALENDAR_ID=cal_xxxxxxxxxxxxxxxx
```

### 3. Supabase Edge Functionのデプロイ

```bash
# Supabase CLIをインストール
npm install -g supabase

# ログイン
supabase login

# Edge Functionをデプロイ
supabase functions deploy tldv-webhook
```

### 4. tl:dv Webhookの設定

tl:dvダッシュボードで以下のイベントを有効化：

- ✅ meeting.ended
- ✅ recording.ready
- ✅ transcript.ready

### 5. データベースの準備

修正版のSQLを実行：

```sql
-- 修正版のSQLファイルを実行
\i /path/to/fraud-detection-system-fixed.sql
\i /path/to/referral-reward-automation-fixed.sql
```

## 動作確認

### 1. テスト用の招待作成

```javascript
// 招待リンクを作成
const { data: inviteLink } = await supabase
  .from('invite_links')
  .insert({
    created_by: currentUserId,
    link_code: 'TEST123',
    is_active: true
  })
  .select()
  .single();
```

### 2. テスト用の登録

1. 招待リンクから新規ユーザーを登録
2. tl:dvで面談を予約
3. 面談を実施（15分以上）

### 3. 報酬確認

```javascript
// 報酬処理状態を確認
const { data: status } = await supabase
  .from('reward_processing_status')
  .select('*')
  .eq('invitation_id', invitationId)
  .single();

console.log('報酬処理状態:', status);
```

## トラブルシューティング

### Webhookが動作しない場合

1. **署名検証エラー**
   - `TLDV_WEBHOOK_SECRET`が正しく設定されているか確認
   - tl:dvダッシュボードで最新のWebhook Secretを確認

2. **404エラー**
   - Edge FunctionのURLが正しいか確認
   - `supabase functions list`でデプロイ状態を確認

3. **権限エラー**
   - `SUPABASE_SERVICE_ROLE_KEY`が設定されているか確認
   - RLSポリシーが正しく設定されているか確認

### 報酬が付与されない場合

1. **面談時間の確認**
   - 15分以上の面談が必要
   - `tldv_meeting_records`テーブルで`duration_minutes`を確認

2. **招待ステータスの確認**
   ```sql
   SELECT * FROM invitations 
   WHERE id = '[invitation_id]';
   ```

3. **手動での報酬処理**
   ```sql
   SELECT process_referral_reward('[invitation_id]');
   ```

## 本番環境での注意事項

1. **レート制限**
   - tl:dv APIには1分あたり60リクエストの制限
   - バッチ処理は適切な間隔で実行

2. **データ保持**
   - tl:dvの録画は90日間保持
   - 必要に応じてバックアップを作成

3. **セキュリティ**
   - APIキーは環境変数で管理
   - Webhook署名は必ず検証
   - IPホワイトリストの設定を検討

## 代替案：手動確認フロー

tl:dv連携が難しい場合は、管理画面での手動確認機能を使用：

1. 管理画面（`/admin-referral.html`）にアクセス
2. 「紹介一覧」タブで該当の紹介を確認
3. 「面談確認」ボタンをクリック
4. 面談詳細を入力して承認

## サポート

問題が解決しない場合は、以下の情報を含めてサポートに連絡：

- Supabaseプロジェクトリファレンス
- エラーメッセージ
- Edge Functionのログ（`supabase functions logs tldv-webhook`）
- 関連するinvitation_id