# INTERCONNECT - 未実装機能リスト

## 調査日時
2025年1月6日

## 概要
プロジェクト内のコードを調査し、以下の未実装・準備中の機能を発見しました。

## 1. メッセージ機能（最優先）
- **場所**: messages.html
- **現状**: 「現在準備中なので、直接相手の連絡先を知るためにマッチング申請して、プロフィールにLINEあるので、そこからご連絡してください。」と表示
- **必要な実装**:
  - リアルタイムチャット機能
  - メッセージ履歴の保存
  - 既読管理
  - ファイル添付機能
  - 通知連携

## 2. カレンダー機能
- **場所**: notifications.html (247行目)
- **現状**: `alert('カレンダーに追加機能は準備中です')`
- **必要な実装**:
  - Google Calendar連携
  - イベントのカレンダー追加
  - リマインダー設定

## 3. マッチング機能の完全実装
- **場所**: matching.js
- **現状**: 
  - `alert('コネクト機能は準備中です')` (20行目)
  - `alert('プロフィール表示機能は準備中です')` (28行目)
- **必要な実装**:
  - コネクト申請機能
  - マッチングアルゴリズム
  - プロファイル詳細表示
  - マッチング履歴

## 4. ブックマーク機能
- **場所**: profile-detail-modal.js (790行目)
- **現状**: `alert('ブックマーク機能は準備中です')`
- **必要な実装**:
  - プロフィールのブックマーク保存
  - ブックマーク一覧表示
  - ブックマーク管理

## 5. 高度な検索機能
- **場所**: members-search.js (310行目)
- **現状**: `console.log('[MembersSearch] 高度な検索機能は今後実装予定')`
- **必要な実装**:
  - 複数条件での絞り込み検索
  - 検索履歴の保存
  - 検索結果のソート機能

## 6. イベント参加登録
- **場所**: dashboard-event-details.js (262行目)
- **現状**: `alert('イベントへの参加登録機能は準備中です。')`
- **必要な実装**:
  - イベント参加申込フロー
  - 参加者リスト管理
  - キャンセル機能
  - 参加証発行

## 7. プロフィール関連
- **場所**: profile.js
- **現状**: 737行目、742行目に「実装予定」のコメント
- **必要な実装**:
  - プロフィール画像のアップロード
  - カバー画像の設定
  - SNSリンクの追加

## 8. 画像・アバター関連
- **現状**: 多くのHTMLファイルで`user-placeholder.svg`を使用
- **必要な実装**:
  - 画像アップロード機能
  - 画像リサイズ・最適化
  - デフォルトアバターの改善

## 実装優先順位（推奨）

### 高優先度
1. **メッセージ機能** - ユーザー間のコミュニケーションの核となる機能
2. **マッチング機能の完全実装** - サービスの主要機能
3. **イベント参加登録** - イベント管理の重要機能

### 中優先度
4. **プロフィール画像アップロード** - UX向上に必要
5. **高度な検索機能** - ユーザビリティ向上
6. **カレンダー連携** - 利便性向上

### 低優先度
7. **ブックマーク機能** - 付加価値機能

## 技術的要件

### メッセージ機能の実装に必要なもの
- Supabaseのリアルタイムサブスクリプション
- messagesテーブルの設計
- WebSocket接続の管理
- メッセージ暗号化（オプション）

### データベーステーブル設計案
```sql
-- メッセージテーブル
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id),
    receiver_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ブックマークテーブル
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    bookmarked_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, bookmarked_user_id)
);
```

## 次のステップ
1. メッセージ機能の要件定義書作成
2. データベース設計の詳細化
3. UI/UXデザインの作成
4. 段階的な実装計画の策定