# INTERCONNECT 紹介機能 要件定義書

## 1. 概要

### 1.1 目的
INTERCONNECTプラットフォームに紹介制度を導入し、既存ユーザーが新規ユーザーを紹介することでキャッシュバックを獲得できる仕組みを構築する。

### 1.2 背景
- ユーザー獲得コストの削減
- 既存ユーザーのエンゲージメント向上
- 質の高いユーザーの獲得（既存ユーザーの紹介による信頼性）

### 1.3 スコープ
- 専用招待リンクの生成・管理機能
- 紹介成立条件の自動判定（tl;dv議事録登録）
- キャッシュバック管理システム
- 紹介実績管理画面

## 2. 機能要件

### 2.1 招待リンク機能

#### 2.1.1 招待リンク生成
- 各ユーザーが一意の招待リンクを生成可能
- リンク形式: `https://interconnect.com/invite/{unique_code}`
- unique_codeは8-12文字の英数字（衝突回避のため）

#### 2.1.2 招待リンク管理
- 複数の招待リンク生成可能（キャンペーン別など）
- リンクの有効期限設定（オプション）
- リンクの無効化機能
- QRコード生成機能

### 2.2 紹介追跡機能

#### 2.2.1 紹介関係の記録
- 招待リンクからの登録を自動追跡
- 紹介者と被紹介者の関係をデータベースに記録
- Cookie/セッションを使用した追跡（30日間有効）

#### 2.2.2 成立条件の監視
- tl;dv（meeting_minutes）への初回データ登録を監視
- 面談完了の自動判定
- 紹介成立のステータス管理

### 2.3 キャッシュバック機能

#### 2.3.1 報酬計算
- 紹介成立時に1,000円を自動計算
- 累積キャッシュバック額の管理
- 報酬履歴の記録

#### 2.3.2 支払い管理
- 最低支払い額の設定（例：3,000円以上）
- 支払い申請機能
- 支払いステータス管理

### 2.4 管理画面

#### 2.4.1 ユーザー向け管理画面
- 招待リンク一覧・管理
- 紹介実績の確認
- キャッシュバック残高の確認
- 支払い申請
- 紹介成功率などの統計情報

#### 2.4.2 管理者向け管理画面
- 全体の紹介統計
- キャッシュバック支払い管理
- 不正利用の監視
- 紹介キャンペーンの設定

## 3. 非機能要件

### 3.1 セキュリティ
- 招待リンクの不正利用防止
- 同一IPアドレスからの大量登録検知
- 自己紹介の防止

### 3.2 パフォーマンス
- リアルタイムでの紹介追跡
- 大量の招待リンクアクセスに対応

### 3.3 可用性
- 99.9%以上の稼働率
- 招待リンクの永続性保証

## 4. データベース設計

### 4.1 新規テーブル

#### referral_links（招待リンクテーブル）
```sql
CREATE TABLE public.referral_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(12) UNIQUE NOT NULL,
    name TEXT, -- リンクの名前（任意）
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### referrals（紹介関係テーブル）
```sql
CREATE TABLE public.referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_link_id UUID REFERENCES public.referral_links(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, cancelled
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(referrer_id, referred_id)
);
```

#### cashback_transactions（キャッシュバック取引テーブル）
```sql
CREATE TABLE public.cashback_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_id UUID REFERENCES public.referrals(id),
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(20) NOT NULL, -- earned, withdrawn, cancelled
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, paid, cancelled
    payment_method VARCHAR(50),
    payment_details JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);
```

#### cashback_balances（キャッシュバック残高テーブル）
```sql
CREATE TABLE public.cashback_balances (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_earned DECIMAL(10, 2) DEFAULT 0,
    total_withdrawn DECIMAL(10, 2) DEFAULT 0,
    current_balance DECIMAL(10, 2) DEFAULT 0,
    last_withdrawal_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4.2 既存テーブルの拡張

#### profiles テーブルへの追加
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS 
    referrer_id UUID REFERENCES auth.users(id);
```

## 5. API設計

### 5.1 招待リンクAPI

#### POST /api/referral-links
招待リンクの生成
```json
Request:
{
    "name": "SNSキャンペーン用",
    "expires_at": "2025-12-31T23:59:59Z"
}

Response:
{
    "id": "uuid",
    "code": "ABC123XYZ",
    "url": "https://interconnect.com/invite/ABC123XYZ",
    "qr_code": "base64_encoded_image"
}
```

#### GET /api/referral-links
招待リンク一覧の取得

#### DELETE /api/referral-links/{id}
招待リンクの無効化

### 5.2 紹介実績API

#### GET /api/referrals
紹介実績の取得
```json
Response:
{
    "referrals": [
        {
            "id": "uuid",
            "referred_user": {
                "name": "山田太郎",
                "registered_at": "2025-01-15T10:00:00Z"
            },
            "status": "completed",
            "completed_at": "2025-01-20T15:30:00Z",
            "cashback_amount": 1000
        }
    ],
    "summary": {
        "total_referrals": 10,
        "completed_referrals": 8,
        "pending_referrals": 2,
        "total_earned": 8000
    }
}
```

### 5.3 キャッシュバックAPI

#### GET /api/cashback/balance
残高の取得

#### POST /api/cashback/withdraw
出金申請
```json
Request:
{
    "amount": 5000,
    "payment_method": "bank_transfer",
    "payment_details": {
        "bank_name": "○○銀行",
        "branch_name": "△△支店",
        "account_type": "普通",
        "account_number": "1234567",
        "account_holder": "ヤマダ タロウ"
    }
}
```

## 6. 実装フロー

### 6.1 招待リンクからの登録フロー
1. ユーザーが招待リンクをクリック
2. `/invite/{code}` にアクセス
3. codeの有効性確認
4. Cookieに招待コードを保存（30日間）
5. 登録画面へリダイレクト
6. 登録完了時にreferralsテーブルに記録

### 6.2 紹介成立フロー
1. meeting_minutesテーブルへのINSERTトリガー
2. 該当ユーザーの紹介関係を確認
3. 初回登録の場合、紹介成立と判定
4. referralsのstatusを'completed'に更新
5. cashback_transactionsに報酬記録
6. cashback_balancesを更新
7. 紹介者に通知送信

### 6.3 キャッシュバック支払いフロー
1. ユーザーが出金申請
2. 管理者が申請内容を確認
3. 支払い処理実行
4. ステータスを'paid'に更新
5. ユーザーに完了通知

## 7. UI/UXデザイン要件

### 7.1 ユーザー向け画面
- ダッシュボードに「紹介プログラム」セクション追加
- 専用の紹介管理ページ（/referral）
- モバイルレスポンシブ対応

### 7.2 管理者向け画面
- 管理画面に「紹介管理」メニュー追加
- 統計ダッシュボード
- 支払い管理インターフェース

## 8. 統合ポイント

### 8.1 既存機能との統合
- profilesテーブルとの連携
- meeting_minutesテーブルの監視
- 通知システムとの統合
- ダッシュボード統計への反映

### 8.2 外部サービス連携
- メール通知（紹介成立時）
- LINE通知（オプション）
- 決済システム（将来的な自動化）

## 9. セキュリティ考慮事項

### 9.1 不正防止策
- IPアドレスベースの制限
- デバイスフィンガープリンティング
- 異常なパターンの検知
- 手動レビュープロセス

### 9.2 プライバシー保護
- 被紹介者の情報は最小限に制限
- 個人情報の適切な暗号化
- GDPRコンプライアンス

## 10. 今後の拡張性

### 10.1 段階的な報酬システム
- 紹介人数に応じたボーナス
- VIPプログラム
- 期間限定キャンペーン

### 10.2 分析機能の強化
- 紹介経路の詳細分析
- コンバージョン率の最適化
- A/Bテスト機能

### 10.3 他機能との連携
- マッチング機能との統合
- イベント参加促進
- コミュニティ形成支援

## 11. 開発スケジュール（想定）

### Phase 1: 基本機能（4週間）
- Week 1-2: データベース設計・API開発
- Week 3: フロントエンド実装
- Week 4: 統合テスト

### Phase 2: 管理機能（2週間）
- Week 5: 管理画面開発
- Week 6: セキュリティ強化

### Phase 3: 最適化（2週間）
- Week 7: パフォーマンス最適化
- Week 8: 本番環境準備

## 12. KPI（重要業績評価指標）

### 12.1 主要指標
- 月間紹介数
- 紹介成立率
- 平均紹介数/ユーザー
- キャッシュバック支払い額

### 12.2 サブ指標
- 招待リンククリック率
- 登録完了率
- 面談実施率
- リピート紹介率

## 13. リスクと対策

### 13.1 技術的リスク
- **リスク**: 大量アクセスによるシステム負荷
- **対策**: CDN活用、キャッシング戦略

### 13.2 ビジネスリスク
- **リスク**: キャッシュバックコストの増大
- **対策**: 上限設定、段階的な展開

### 13.3 法的リスク
- **リスク**: 個人情報保護法違反
- **対策**: 法務レビュー、同意取得プロセス

## 14. 成功基準

- 3ヶ月で既存ユーザーの30%が紹介機能を利用
- 紹介経由の新規登録が月間登録数の20%以上
- 紹介成立率60%以上
- システム稼働率99.9%以上