# LINE Login 必要な情報

## 現在の設定
- **Channel ID**: 2007688616 ✅

## 必要な情報

### 1. チャネルシークレット（Channel Secret）
LINE Developersコンソールで取得方法：
1. [LINE Developers](https://developers.line.biz/console/)にログイン
2. プロバイダーを選択
3. Channel ID「2007688616」のチャネルを選択
4. **「チャネル基本設定」タブ**をクリック
5. **「チャネルシークレット」**の欄を確認
   - 32文字の英数字
   - 例: `1234567890abcdef1234567890abcdef`

### 2. コールバックURLの設定
LINE Developersコンソールで設定：
1. 同じチャネルの**「LINE Login設定」タブ**をクリック
2. **「コールバックURL」**に以下を追加：
   ```
   https://interconnect-sigma.netlify.app/line-callback.html
   http://localhost:8888/line-callback.html
   ```

## 注意事項

### アクセストークンとシークレットの違い
- **チャネルアクセストークン**: Messaging API用（メッセージ送信等）
- **チャネルシークレット**: LINE Login用（認証に必要）

今回必要なのは**チャネルシークレット**です。

## 設定確認チェックリスト

- [ ] Channel ID: 2007688616
- [ ] チャネルシークレット: 取得済み？
- [ ] コールバックURL: 設定済み？
- [ ] ウェブアプリでLINEログインを利用: ON？

## Netlify環境変数

設定が必要な環境変数：
```
LINE_CHANNEL_ID=2007688616
LINE_CHANNEL_SECRET=[32文字のチャネルシークレット]
```

チャネルシークレットを教えていただければ、環境変数の設定方法をご案内します。