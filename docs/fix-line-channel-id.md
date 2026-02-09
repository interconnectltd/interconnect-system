# LINE Channel IDエラー解決ガイド

## エラー内容
```
400 Bad Request
Invalid client_id. You can use a Channel ID found in a LINE developers site as client_id.
```

## 現在の設定
- JavaScript内のChannel ID: `2007688781`
- Netlify環境変数: `2007688781`

## 確認事項

### 1. LINE Developersで確認
1. [LINE Developers](https://developers.line.biz/console/)にログイン
2. プロバイダーを選択
3. **チャネルタイプを確認**：
   - ❌ Messaging API（これではない）
   - ✅ LINE Login（これが必要）

### 2. 正しいChannel IDの見つけ方
1. LINE Login用のチャネルを選択
2. 「チャネル基本設定」タブ
3. 「チャネルID」をコピー（10桁の数字）

### 3. チャネルの状態確認
- ステータス: **公開**になっているか
- LINE Login: **有効**になっているか

## 考えられる原因

### 原因1: 間違ったチャネルタイプ
- Messaging APIのChannel IDを使用している可能性
- LINE Login専用のチャネルが必要

### 原因2: チャネルが未公開
- 開発中ステータスの場合はエラーになる
- 「公開」ステータスにする必要がある

### 原因3: LINE Loginが無効
- チャネル設定でLINE Loginを有効にする必要がある

## 解決手順

### ステップ1: LINE Login用チャネルの作成（必要な場合）
```
1. LINE Developersで「新規チャネル作成」
2. チャネルタイプ: 「LINE Login」を選択
3. 必要情報を入力して作成
4. チャネルを「公開」に変更
```

### ステップ2: 正しいChannel IDで更新
```bash
# 1. JavaScriptファイルを更新
# js/auth-supabase.js の LINE_CHANNEL_ID を修正

# 2. Netlify環境変数を更新
netlify env:set LINE_CHANNEL_ID "正しいChannel ID"

# 3. 再デプロイ
netlify deploy --trigger
```

### ステップ3: コールバックURLの設定
LINE Developersで以下のURLを設定：
- https://interconnect-auto-test.netlify.app/line-callback.html
- http://localhost:8888/line-callback.html

## デバッグツール

デバッグ用HTMLを作成しました：
- `/debug-line-login.html`

アクセスして設定を確認：
https://interconnect-auto-test.netlify.app/debug-line-login.html

## 緊急対応

もしChannel IDが見つからない場合：
1. 新しいLINE Loginチャネルを作成
2. 作成後のChannel IDを使用
3. 全ての設定を更新