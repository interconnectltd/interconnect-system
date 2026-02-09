# カレンダー連携機能 実装ガイド

## 概要
INTERCONNECTプラットフォームのカレンダー連携機能を実装しました。この機能により、ユーザーは参加予定のイベントをカレンダー形式で表示し、外部カレンダーアプリと連携できます。

## 実装内容

### 1. 新規作成ファイル

#### JavaScript
- `/js/calendar-integration.js`
  - FullCalendarを使用したカレンダー表示
  - Googleカレンダー連携
  - iCalフォーマットでのエクスポート
  - イベントリマインダー機能

#### CSS
- `/css/calendar-integration.css`
  - カレンダーUIのスタイリング
  - FullCalendarのカスタマイズ
  - レスポンシブ対応

### 2. 更新ファイル
- `/events.html`
  - カレンダービューセクションを追加
  - FullCalendarライブラリの読み込み
  - Google APIの読み込み（オプション）

## 主な機能

### 1. カレンダー表示
- 月表示、週表示、リスト表示の切り替え
- 日本語ローカライズ対応
- 参加予定のイベントを色分け表示
- イベントクリックで詳細表示

### 2. Googleカレンダー連携
- **簡易版**: URLスキームを使用した単一イベントの追加
- **完全版**: Google Calendar APIを使用した双方向同期（要API設定）

### 3. iCalエクスポート
- 参加予定のイベントをiCalフォーマットでダウンロード
- 各種カレンダーアプリ（Outlook、Apple Calendar等）にインポート可能

### 4. イベント管理
- カレンダー上でイベントの確認
- 参加状況の即座の反映
- オンライン/オフラインイベントの区別

## 使用方法

### ユーザー側の操作
1. イベントページにアクセス
2. 「カレンダー表示」ボタンをクリック
3. カレンダー上でイベントを確認
4. 必要に応じて外部カレンダーに追加

### 開発者向け API

```javascript
// カレンダー初期化
window.CalendarIntegration.initialize()

// Googleカレンダー連携
window.CalendarIntegration.syncWithGoogleCalendar()

// iCalエクスポート
window.CalendarIntegration.exportToICal()

// 単一イベントをGoogleカレンダーに追加
window.CalendarIntegration.addToGoogleCalendar(eventId)

// カレンダーの更新
window.CalendarIntegration.refresh()
```

## FullCalendar設定

### 基本設定
```javascript
{
    initialView: 'dayGridMonth',    // 初期表示
    locale: 'ja',                   // 日本語化
    height: 'auto',                 // 高さ自動調整
    dayMaxEvents: 3,               // 1日の最大表示イベント数
}
```

### ビューオプション
- `dayGridMonth`: 月表示
- `timeGridWeek`: 週表示（時間軸あり）
- `listMonth`: リスト表示

## Google Calendar API設定（完全版を使用する場合）

### 1. Google Cloud Consoleでプロジェクト作成
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新規プロジェクトを作成
3. Google Calendar APIを有効化

### 2. 認証情報の作成
1. APIキーを作成
2. OAuth 2.0クライアントIDを作成
3. 承認済みのJavaScriptオリジンを設定

### 3. コードに認証情報を設定
```javascript
// calendar-integration.js の該当箇所を更新
apiKey: 'YOUR_API_KEY',
clientId: 'YOUR_CLIENT_ID'
```

## iCalフォーマット

### エクスポート形式
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//INTERCONNECT//Event Calendar//EN
BEGIN:VEVENT
UID:event-id@interconnect.com
DTSTART:20240215T140000Z
DTEND:20240215T160000Z
SUMMARY:イベントタイトル
DESCRIPTION:イベント詳細
LOCATION:開催場所
END:VEVENT
END:VCALENDAR
```

## セキュリティ考慮事項

### 1. APIキーの管理
- 本番環境では環境変数を使用
- クライアントサイドに機密情報を含めない

### 2. 権限管理
- ユーザーは自分が参加するイベントのみ表示
- カレンダーへの書き込み権限は最小限に

### 3. データ保護
- エクスポートデータには個人情報を含めない
- HTTPSでの通信を必須とする

## トラブルシューティング

### よくある問題

1. **カレンダーが表示されない**
   - FullCalendarライブラリが正しく読み込まれているか確認
   - コンソールでJavaScriptエラーを確認

2. **イベントが表示されない**
   - Supabaseへの接続を確認
   - event_participantsテーブルのデータを確認

3. **Googleカレンダー連携が動作しない**
   - APIキーとクライアントIDが正しいか確認
   - ドメインが承認済みオリジンに含まれているか確認

## 今後の改善案

1. **リマインダー機能の強化**
   - プッシュ通知対応
   - メール通知の自動化

2. **他のカレンダーサービス連携**
   - Outlook Calendar
   - Apple Calendar
   - LINE WORKS

3. **高度な機能**
   - 繰り返しイベントの対応
   - タイムゾーン対応
   - カレンダー共有機能