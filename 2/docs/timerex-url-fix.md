# TimeRex URL長さ問題の修正

## 問題
「応答が長すぎる」エラーが発生し、予約ページが開かない

## 原因
1. Edge FunctionへのCORS エラーによりフォールバックURLが使用される
2. フォールバックURLにユーザー情報やメタデータを多く含めすぎている
3. URLが長すぎてTimeRexが処理できない

## 解決策
`timerex-booking-fix.js`を作成し、以下の修正を実装：

1. **Edge Functionを使わずに直接TimeRexのURLを開く**
   - CORS問題を回避
   - シンプルなURLでアクセス

2. **URLパラメータを最小限に削減**
   - 紹介コードのみを`ref`パラメータとして含める
   - その他の情報は削除

3. **新しいタブで開く方式に変更**
   - ポップアップブロッカーの影響を受けにくい
   - 失敗時は現在のウィンドウで開く

## 変更前のURL例
```
https://timerex.jp/book/interconnect-consultation?name=&email=test@example.com&custom_referral_code=ABC123&custom_user_id=123e4567-e89b-12d3-a456-426614174000&source=interconnect&timestamp=2024-01-05T12:00:00.000Z
```

## 変更後のURL例
```
https://timerex.jp/book/interconnect-consultation?ref=ABC123
```

## 実装ファイル
- `/js/timerex-booking-fix.js` - 修正版の予約ハンドラー
- `dashboard.html` - スクリプトタグを更新
- `referral.html` - スクリプトタグを更新

## 今後の改善案
1. TimeRexアカウント作成後、正式なAPIキーを取得
2. Supabase Edge Functionsを適切にデプロイ
3. TimeRex側でカスタムフィールドを設定し、URLパラメータで自動入力できるようにする