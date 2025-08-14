# プロフィール画像アップロード機能 実装ガイド

## 概要
INTERCONNECTプラットフォームのプロフィール画像アップロード機能を実装しました。この機能により、ユーザーは自分のプロフィール画像とカバー画像をアップロード・変更できます。

## 実装内容

### 1. 新規作成ファイル

#### JavaScript
- `/js/profile-image-upload.js`
  - プロフィール画像・カバー画像のアップロード処理
  - 画像のリサイズ・最適化
  - Supabase Storageへの保存
  - リアルタイムプレビュー機能

#### CSS
- `/css/profile-image-upload.css`
  - アップロードモーダルのスタイル
  - プレビュー表示のスタイル
  - ローディング・トースト通知のスタイル

#### SQL
- `/sql/create-storage-buckets.sql`
  - Supabase Storage用のバケット設定
  - RLS（Row Level Security）ポリシー設定

### 2. 更新ファイル
- `/profile.html`
  - 画像アップロード用のCSSとJavaScriptを追加
  - モーダルのonclickイベントを新しい関数に変更

## 主な機能

### 1. アバター画像アップロード
- **ファイルサイズ制限**: 5MB以下
- **対応形式**: JPEG, PNG, GIF, WebP
- **自動リサイズ**: 400x400px
- **保存先**: `avatars`バケット

### 2. カバー画像アップロード
- **ファイルサイズ制限**: 10MB以下
- **対応形式**: JPEG, PNG, GIF, WebP
- **自動リサイズ**: 1200x300px
- **保存先**: `covers`バケット

### 3. 画像最適化
- アスペクト比を保持したリサイズ
- JPEG形式への変換（品質90%）
- Canvas APIを使用したクライアントサイド処理

### 4. ユーザー体験
- ドラッグ&ドロップ対応のアップロードエリア
- リアルタイムプレビュー
- アップロード中のローディング表示
- 成功・エラー時のトースト通知

## Supabase設定手順

### 1. Storage バケットの作成
Supabase管理画面で以下のSQLを実行してください：

```sql
-- /sql/create-storage-buckets.sql の内容を実行
```

### 2. 環境変数の確認
以下の環境変数が設定されていることを確認：
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 使用方法

### ユーザー側の操作
1. プロフィールページにアクセス
2. アバターまたはカバー画像のカメラアイコンをクリック
3. 画像を選択またはドラッグ&ドロップ
4. プレビューを確認して「保存」をクリック

### 開発者向け API

```javascript
// アバター画像を保存
window.ProfileImageUpload.saveAvatarImage()

// カバー画像を保存
window.ProfileImageUpload.saveCoverImage()

// モーダルを閉じる
window.ProfileImageUpload.closeAvatarModal()
window.ProfileImageUpload.closeCoverModal()
```

## セキュリティ

### RLSポリシー
- ユーザーは自分の画像のみアップロード・更新・削除可能
- 画像は公開アクセス可能（プロフィール表示用）
- フォルダ名にユーザーIDを使用して分離

### ファイル検証
- MIMEタイプのチェック
- ファイルサイズの制限
- 画像形式の検証

## トラブルシューティング

### よくある問題

1. **アップロードエラー**
   - Supabase Storageバケットが作成されているか確認
   - RLSポリシーが正しく設定されているか確認
   - ユーザーが認証されているか確認

2. **画像が表示されない**
   - バケットの公開設定を確認
   - URLが正しく生成されているか確認

3. **リサイズが機能しない**
   - ブラウザがCanvas APIをサポートしているか確認
   - 画像ファイルが破損していないか確認

## 今後の改善案

1. **画像編集機能**
   - クロップ機能
   - フィルター機能
   - 回転・反転機能

2. **パフォーマンス最適化**
   - WebWorkerでの画像処理
   - Progressive JPEG対応
   - CDN統合

3. **追加機能**
   - 複数画像のギャラリー
   - 画像の履歴管理
   - AI画像生成統合