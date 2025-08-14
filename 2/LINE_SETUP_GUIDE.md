# LINE Login 設定ガイド

## エラーの解決方法

「Invalid client_id」エラーが表示される場合、以下の手順で設定を確認してください。

## 1. LINE Developersコンソールでの設定

### ステップ1: LINE Developersにログイン
1. [LINE Developers](https://developers.line.biz/console/)にアクセス
2. LINEアカウントでログイン

### ステップ2: チャネルの確認
1. 既存のチャネルがある場合は選択
2. ない場合は新規作成：
   - 「新規プロバイダー作成」をクリック
   - プロバイダー名を入力（例：INTERCONNECT）
   - 「作成」をクリック

### ステップ3: LINE Loginチャネルの作成
1. 作成したプロバイダーを選択
2. 「新規チャネル作成」をクリック
3. チャネルの種類で「LINE Login」を選択
4. 以下の情報を入力：
   - **チャネル名**: INTERCONNECT
   - **チャネル説明**: 経営者コミュニティプラットフォーム
   - **アプリタイプ**: ウェブアプリ
   - **メールアドレス**: あなたのメールアドレス

### ステップ4: チャネル基本設定
1. 作成したチャネルを選択
2. 「チャネル基本設定」タブで以下を確認：
   - **チャネルID**: `2007213003`（これがあなたのChannel IDか確認）
   - **チャネルシークレット**: コピーして保存

### ステップ5: LINE Login設定
1. 「LINE Login設定」タブを選択
2. 以下を設定：

#### コールバックURL
```
https://your-site.netlify.app/line-callback.html
http://localhost:8888/line-callback.html
```
※ 両方追加してください（本番用とローカルテスト用）

#### その他の設定
- **ウェブアプリでLINEログインを利用**: ON
- **Emailアドレスの取得権限**: 申請する（任意）
- **プロフィール情報の取得**: ON

### ステップ6: 開発者モードの確認
- チャネルが「開発中」ステータスになっていることを確認
- 本番公開前はこの状態でOK

## 2. コードの修正（必要な場合）

現在のChannel ID（2007213003）が正しくない場合：

1. `/js/auth-supabase.js`を編集：
```javascript
// LINE Login Configuration
const LINE_CHANNEL_ID = 'あなたの正しいChannel ID';
```

## 3. 環境変数の設定

Netlifyダッシュボードで：
1. Site settings → Environment variables
2. 以下を追加：
   - `LINE_CHANNEL_ID`: あなたのChannel ID
   - `LINE_CHANNEL_SECRET`: チャネルシークレット

## 4. トラブルシューティング

### Invalid client_idエラーの原因
1. **Channel IDが間違っている**
   - LINE Developersコンソールで正しいIDを確認
   
2. **チャネルが無効化されている**
   - チャネルのステータスを確認
   
3. **LINE Login機能が有効になっていない**
   - 「ウェブアプリでLINEログインを利用」がONか確認

### 確認手順
1. ブラウザの開発者ツールを開く（F12）
2. Networkタブを選択
3. LINEログインボタンをクリック
4. リダイレクトURLのclient_idパラメータを確認

## 5. 正しいChannel IDの取得方法

1. [LINE Developers](https://developers.line.biz/console/)にログイン
2. プロバイダーを選択
3. LINE Loginチャネルを選択
4. 「チャネル基本設定」タブ
5. **チャネルID**をコピー（10桁の数字）

このIDを使用してコードを更新してください。