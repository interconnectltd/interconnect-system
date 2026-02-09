# 紹介システムセットアップ手順

## エラー解決手順

### 1. 関数エラーの修正
以下のSQLを**順番に**実行してください：

```sql
-- まず、fix-referral-function.sql を実行
```

1. Supabaseダッシュボードにログイン
2. SQL Editorを開く
3. `/sql/fix-referral-function.sql`の内容をコピー＆ペースト
4. Runボタンをクリック

### 2. テーブルのセットアップ（関数エラーが解決してから）
```sql
-- 次に、complete-referral-setup.sqlの一部を実行
-- ただし、関数定義部分は除く
```

### 3. 動作確認
1. ブラウザで`/check-referral-setup.html`にアクセス
2. 各テストを実行：
   - 接続テスト
   - テーブル確認
   - 関数確認
   - テストリンク作成

## トラブルシューティング

### "cannot change return type"エラーが出た場合
```sql
-- 既存の関数を完全に削除
DROP FUNCTION IF EXISTS get_referral_stats(UUID);
DROP FUNCTION IF EXISTS create_invite_link(UUID, TEXT, INTEGER);
```

### テーブルが見つからないエラー
```sql
-- invite_linksテーブルを作成
CREATE TABLE IF NOT EXISTS invite_links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    link_code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    registration_count INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    total_rewards_earned INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成
CREATE POLICY "Users can view own invite links" ON invite_links
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create invite links" ON invite_links
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own invite links" ON invite_links
    FOR UPDATE USING (auth.uid() = created_by);
```

### cashout_requestsテーブルが見つからない場合
```sql
CREATE TABLE IF NOT EXISTS cashout_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    tax_amount INTEGER NOT NULL,
    net_amount INTEGER NOT NULL,
    bank_info JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE cashout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cashout requests" ON cashout_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cashout requests" ON cashout_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## 確認事項

1. **Supabaseプロジェクト設定**
   - Authentication > Providersでメール認証が有効になっているか
   - Database > Tablesで必要なテーブルが作成されているか
   - Database > Functionsで関数が正しく作成されているか

2. **JavaScript設定**
   - `/js/supabase-client.js`でSupabase URLとAnon Keyが正しく設定されているか

3. **RLSポリシー**
   - 各テーブルでRow Level Securityが有効になっているか
   - 適切なポリシーが設定されているか

## サポート

問題が解決しない場合は、以下の情報を確認してください：
- ブラウザのコンソールのエラーメッセージ
- Supabase LogsのDatabase logs
- Network タブでのAPIレスポンス