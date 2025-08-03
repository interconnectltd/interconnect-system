# 紹介機能要件定義書 - 不足点・リスク分析

## 1. 不足している重要機能

### 1.1 不正対策の詳細化
- **複数アカウント作成の防止**
  - メールアドレスの類似性チェック（test1@, test2@などの連番）
  - 同一デバイスからの複数アカウント登録制限
  - 電話番号認証の追加

- **なりすまし防止**
  - 本人確認プロセス（身分証明書アップロード）
  - 銀行口座名義との照合
  - 初回面談時の本人確認

### 1.2 税務関連機能
- **源泉徴収対応**
  - 報酬が一定額を超えた場合の源泉徴収
  - 支払調書の発行機能
  - マイナンバー収集・管理機能

- **確定申告サポート**
  - 年間収支レポートの出力
  - 税務申告用データのエクスポート

### 1.3 コンプライアンス機能
- **反社会的勢力チェック**
  - 新規登録時の反社チェック連携
  - 定期的な再チェック機能

- **マネーロンダリング対策**
  - 異常な金額の移動検知
  - 取引パターンの監視

## 2. 運用上のリスクと対策

### 2.1 キャッシュフロー管理
- **問題**: 大量の紹介成立時の資金不足
- **対策案**:
  - 月間上限額の設定
  - 支払いタイミングの分散（月末締め翌月末払い等）
  - エスクロー口座の設置

### 2.2 紹介の質の担保
- **問題**: 質の低いユーザーの大量紹介
- **対策案**:
  - 紹介されたユーザーの継続率による報酬調整
  - 3ヶ月以内の退会時の報酬取り消し条項
  - 紹介者のレーティングシステム

### 2.3 システム負荷対策
- **問題**: キャンペーン時の急激なアクセス増
- **対策案**:
  - Rate Limiting（API制限）の詳細設計
  - 待機列（Queue）システムの実装
  - 段階的なロールアウト機能

## 3. 法的考慮事項の追加

### 3.1 特定商取引法対応
- 紹介プログラムの利用規約の整備
- クーリングオフ対応の明記
- 紹介報酬の支払い条件の明確化

### 3.2 景品表示法対応
- 紹介報酬の上限設定（商品価格の20%以下）
- 不当な顧客誘引の防止
- 広告表現のガイドライン策定

### 3.3 個人情報保護
- 紹介時の個人情報取扱い同意
- オプトアウト機能の実装
- データ保持期間の明確化

## 4. 技術的な追加要件

### 4.1 監査ログ機能
```sql
CREATE TABLE public.referral_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    target_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4.2 不正検知テーブル
```sql
CREATE TABLE public.fraud_detection_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    conditions JSONB NOT NULL,
    action VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.fraud_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    rule_id UUID REFERENCES public.fraud_detection_rules(id),
    severity VARCHAR(20) NOT NULL,
    details JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4.3 支払い制限テーブル
```sql
CREATE TABLE public.payment_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    limit_type VARCHAR(50) NOT NULL,
    limit_value DECIMAL(10, 2) NOT NULL,
    period VARCHAR(20),
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
    effective_to TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 5. 運用マニュアルの必要性

### 5.1 カスタマーサポート向け
- 紹介トラブル対応フロー
- 支払い関連の問い合わせ対応
- 不正疑いユーザーの対応手順

### 5.2 経理部門向け
- 月次決算処理手順
- 源泉徴収計算方法
- 支払調書発行手順

### 5.3 法務部門向け
- 利用規約違反時の対応
- 紛争解決プロセス
- 当局への報告手順

## 6. 追加のAPI要件

### 6.1 管理者向けAPI
```
GET /api/admin/referrals/suspicious
不審な紹介パターンの一覧取得

POST /api/admin/referrals/{id}/review
紹介の手動レビュー結果を記録

GET /api/admin/cashback/pending-payments
保留中の支払い一覧

POST /api/admin/cashback/bulk-approve
一括承認処理
```

### 6.2 レポートAPI
```
GET /api/reports/referral-analytics
紹介分析レポート（日次/週次/月次）

GET /api/reports/fraud-summary
不正検知サマリー

GET /api/reports/tax-summary
税務関連サマリー
```

## 7. テスト要件の追加

### 7.1 負荷テスト
- 同時1000人の招待リンクアクセス
- 1日10万件の紹介トラッキング
- 月末の大量支払い処理

### 7.2 セキュリティテスト
- ペネトレーションテスト
- SQLインジェクション対策確認
- XSS対策確認

### 7.3 不正対策テスト
- 自己紹介の防止確認
- 複数アカウント作成の防止確認
- 異常パターンの検知確認

## 8. 監視・アラート要件

### 8.1 ビジネスメトリクス監視
- 異常な紹介数の急増
- 成立率の急激な変化
- 支払い額の異常値

### 8.2 システム監視
- API応答時間
- データベース負荷
- エラー率

### 8.3 セキュリティ監視
- 不正ログイン試行
- 異常なAPIアクセスパターン
- データ漏洩の兆候

## 9. 段階的リリース計画

### Phase 0: パイロット版（追加）
- 限定50名でのクローズドベータ
- 手動での支払い処理
- フィードバック収集と改善

### Phase 1-3: （既存の計画に追加）
- A/Bテストの実装
- 段階的な機能開放
- ロールバック計画の準備

## 10. 緊急時対応計画

### 10.1 システム障害時
- 紹介リンクのフォールバック機能
- 手動での紹介記録方法
- ユーザーへの通知方法

### 10.2 不正大量発生時
- 機能の一時停止手順
- 調査・対応フロー
- 被害の最小化策

### 10.3 法的問題発生時
- 証拠保全手順
- 当局への報告フロー
- ユーザーへの説明方法