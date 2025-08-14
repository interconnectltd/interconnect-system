# TimeRex代替ソリューション

## 問題
TimeRexサイト（timerex.jp）へのアクセスができない状態
- ERR_CONNECTION_TIMED_OUT エラー
- サーバーが応答しない

## 実装した代替案

### 1. Google Calendar統合（実装済み）
`/js/google-calendar-booking.js`

**特徴：**
- 追加費用なし
- Googleアカウントがあれば誰でも使える
- 予約リンクを自動生成
- 紹介コードを詳細欄に含める

**使用方法：**
```javascript
// dashboard.htmlまたはreferral.htmlで
<script src="js/google-calendar-booking.js?v=1.0"></script>
```

**仕組み：**
1. 予約ボタンをクリック
2. Google Calendarの予約作成画面が開く
3. ユーザーが日時を調整して送信
4. INTERCONNECTの担当者に通知が届く

### 2. Calendly統合（準備済み）
`/js/calendly-booking.js`

**特徴：**
- プロフェッショナルな予約システム
- 自動的に空き時間を表示
- リマインダー自動送信
- Zoom/Google Meet自動生成

**必要な準備：**
1. Calendlyアカウント作成（https://calendly.com）
2. 予約ページ設定
3. `calendly-booking.js`内のURLを更新

**使用方法：**
```javascript
// calendlyUrlを実際のURLに変更
this.calendlyUrl = 'https://calendly.com/your-account/consultation';
```

### 3. 予約意図の記録（実装済み）
`/sql/create-booking-intents-table.sql`

**機能：**
- どの方法で予約しようとしたかを記録
- 紹介コードを保存
- 後でフォローアップ可能

## 推奨する移行プラン

### 短期対応（今すぐ）
1. **Google Calendar版を使用**
   - 既に実装済み
   - 追加コスト不要
   - すぐに使用可能

### 中期対応（1週間以内）
1. **Calendlyアカウント作成**
   - 無料プランで開始
   - より洗練されたUX
   - 自動化機能が豊富

2. **TimeRexの状況確認**
   - サービス復旧を待つ
   - 他の日本製予約システムを検討

### 長期対応（1ヶ月以内）
1. **自社予約システム構築**
   - Supabase + Next.jsで実装
   - 完全なコントロール
   - カスタマイズ自由

## 現在の設定

### Google Calendar版（アクティブ）
- HTMLファイルで`google-calendar-booking.js`を読み込み
- 予約ボタンクリックでGoogle Calendarが開く
- 紹介コードが自動的に含まれる

### 切り替え方法
```html
<!-- Google Calendar版 -->
<script src="js/google-calendar-booking.js?v=1.0"></script>

<!-- Calendly版に切り替える場合 -->
<script src="js/calendly-booking.js?v=1.0"></script>

<!-- TimeRexが復旧したら -->
<script src="js/timerex-booking-fix.js?v=3.0"></script>
```

## メリット・デメリット比較

| 機能 | TimeRex | Google Calendar | Calendly |
|------|---------|----------------|----------|
| 費用 | 有料 | 無料 | 無料〜 |
| 設定の簡単さ | ◯ | ◎ | ◯ |
| 自動化 | ◎ | △ | ◎ |
| 日本語対応 | ◎ | ◎ | △ |
| カスタマイズ | ◯ | △ | ◯ |
| 信頼性 | ？ | ◎ | ◎ |

## 次のステップ

1. ✅ Google Calendar版で運用開始
2. ⬜ Calendlyアカウント作成検討
3. ⬜ TimeRexサービス状況の定期確認
4. ⬜ ユーザーフィードバック収集
5. ⬜ 最適なソリューション選定