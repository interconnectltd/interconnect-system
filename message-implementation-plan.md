# メッセージページ リアルタイムチャット実装計画

## 現状分析
- 現在は外部連絡先情報を表示するだけの静的ページ
- チャット機能は未実装
- Supabase連携なし

## 実装内容

### 1. データベース構造
```sql
-- チャットルームテーブル
create table chat_rooms (
  id uuid default uuid_generate_v4() primary key,
  name text,
  type text default 'direct', -- direct, group
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- チャット参加者テーブル
create table chat_participants (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references chat_rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_read_at timestamp with time zone default timezone('utc'::text, now())
);

-- メッセージテーブル
create table messages (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references chat_rooms(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete cascade,
  content text not null,
  type text default 'text', -- text, image, file
  file_url text,
  is_edited boolean default false,
  edited_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- メッセージ既読状態テーブル
create table message_reads (
  id uuid default uuid_generate_v4() primary key,
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  read_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(message_id, user_id)
);
```

### 2. UI構造
```
メッセージページ
├── 左サイドバー（チャット一覧）
│   ├── 検索バー
│   ├── チャットルームリスト
│   └── 新規チャット作成ボタン
├── 中央（チャットエリア）
│   ├── チャットヘッダー（相手情報）
│   ├── メッセージ表示エリア
│   ├── タイピングインジケーター
│   └── メッセージ入力エリア
└── 右サイドバー（チャット情報）※オプション
    ├── 参加者一覧
    ├── 共有ファイル
    └── チャット設定
```

### 3. 実装ファイル

#### HTML変更
- `messages.html` - 完全に書き換え

#### JavaScript（新規作成）
1. `js/messages-supabase.js` - Supabase連携
2. `js/messages-realtime.js` - リアルタイム通信
3. `js/messages-ui.js` - UI管理
4. `js/messages-input.js` - メッセージ入力処理
5. `js/messages-file-upload.js` - ファイルアップロード
6. `js/messages-typing.js` - タイピングインジケーター
7. `js/messages-notification.js` - 通知管理

#### CSS変更
- `css/messages.css` - チャットUIスタイル追加

### 4. 機能一覧

#### 必須機能
1. **チャットルーム管理**
   - ダイレクトメッセージ（1対1）
   - チャットルーム一覧表示
   - 未読メッセージ数表示

2. **メッセージ送受信**
   - テキストメッセージ送信
   - リアルタイム受信（WebSocket）
   - 送信失敗時の再送信

3. **既読管理**
   - 既読/未読状態表示
   - 最終既読位置の記憶

4. **タイピングインジケーター**
   - 「入力中...」の表示
   - リアルタイム更新

5. **メッセージ表示**
   - 無限スクロール（過去メッセージ）
   - 日付区切り表示
   - 自動スクロール（新着時）

#### オプション機能
1. **ファイル送信**
   - 画像アップロード
   - ファイル添付
   - プレビュー表示

2. **メッセージ編集・削除**
   - 送信後の編集
   - メッセージ削除

3. **検索機能**
   - メッセージ内検索
   - ユーザー検索

4. **通知**
   - デスクトップ通知
   - サウンド通知

### 5. 実装順序
1. HTML/CSS基本構造作成
2. Supabase接続設定
3. チャットルーム一覧表示
4. メッセージ送受信基本機能
5. リアルタイム通信実装
6. 既読管理実装
7. タイピングインジケーター
8. ファイルアップロード（オプション）

### 6. セキュリティ考慮事項
- XSS対策（HTMLエスケープ）
- CSRF対策
- ファイルアップロードの検証
- RLS（Row Level Security）設定
- メッセージの暗号化（オプション）