# LINE Login設定の確認事項

## エラー内容
`400 Bad Request - Invalid client_id`

## 過去のやり取りで提供された情報
- **Channel ID**: 2007688616
- **Channel Secret**: 12e4b8c5e7904bb66be6006f8fd741ac
- **Channel Access Token**: jL9cSj/92V57UDPS3a3AxTBWU58cX7g1...（一部のみ）

## 考えられる原因

### 1. Channel IDの確認
- LINE DevelopersでChannel IDが`2007688616`であることを再確認
- LINE Loginが有効になっているか確認

### 2. LINE Loginの有効化
LINE Developersで：
1. 対象のチャネルを選択
2. 「LINE Login設定」タブ
3. 「LINE Loginを有効にする」がONになっているか確認

### 3. プロバイダーとチャネルの関係
- 正しいプロバイダー内のチャネルを使用しているか
- Messaging APIとLINE Loginは別のチャネルの可能性

### 4. コールバックURLの設定
現在設定すべきURL：
- https://interconnect-auto-test.netlify.app/line-callback.html
- http://localhost:8888/line-callback.html

## 確認手順

1. **LINE Developersにログイン**
   https://developers.line.biz/console/

2. **チャネル一覧を確認**
   - 「LINE Login」タイプのチャネルを探す
   - Channel ID: 2007688616 のチャネルを確認

3. **チャネル設定を確認**
   - チャネルタイプが「LINE Login」であること
   - ステータスが「公開」になっていること
   - LINE Loginが有効になっていること

4. **必要に応じて新しいLINE Loginチャネルを作成**
   - プロバイダーを選択
   - 「新規チャネル作成」
   - チャネルタイプ：「LINE Login」を選択

## 設定更新が必要な場合

```bash
# 1. JavaScriptファイルを更新
# js/auth-supabase.js の LINE_CHANNEL_ID を修正

# 2. Netlify環境変数を更新
netlify env:set LINE_CHANNEL_ID "正しいChannel ID"

# 3. 再デプロイ
netlify deploy --trigger
```