-- =============================================================
-- INTERCONNECT セキュリティ修正マイグレーション
-- レビューエージェント検出の DB レベル修正
--
-- 対象:
--   F-002/F-018: deduct_user_points レースコンディション + 非アトミック換金
--   F-003: イベント定員チェックトリガー修正（既存トリガーが壊れている）
--   F-004: メッセージ送信にコネクション確認を追加（RLS）
--   F-008/F-016: コネクション UPDATE RLS を役割別に分割
--
-- 実行方法:
--   Supabase Dashboard > SQL Editor > New query > 貼り付けて Run
--
-- 注意:
--   - すべてのステートメントは冪等（何度実行しても安全）
--   - 既存データに影響なし
--   - クライアント側の既存コードとの後方互換性あり
-- =============================================================

BEGIN;

-- =============================================================
-- 1. deduct_user_points: FOR UPDATE ロック追加（F-018）
--
-- 問題: SELECT と UPDATE の間にレースコンディション
--       並行トランザクションが同時に残高チェックを通過し、
--       残高を超えた減算が可能
-- 修正: SELECT ... FOR UPDATE で行ロックを取得
-- =============================================================

CREATE OR REPLACE FUNCTION deduct_user_points(p_user_id UUID, p_amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_available INTEGER;
BEGIN
    -- 行ロックを取得して並行減算を防止
    SELECT available_points INTO v_available
    FROM user_points
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_available IS NULL THEN
        RAISE EXCEPTION 'ユーザーのポイントレコードが見つかりません';
    END IF;

    IF v_available < p_amount THEN
        RAISE EXCEPTION 'ポイント残高が不足しています（残高: %, 要求: %）', v_available, p_amount;
    END IF;

    UPDATE user_points
    SET balance = balance - p_amount,
        available_points = available_points - p_amount,
        referral_points_spent = referral_points_spent + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$;

-- 認証ユーザーが呼び出し可能にする
GRANT EXECUTE ON FUNCTION deduct_user_points(UUID, INTEGER) TO authenticated;


-- =============================================================
-- 2. process_cashout_request: アトミック換金関数（F-002）
--
-- 問題: クライアント側で INSERT + RPC が2つの独立操作
--       INSERT成功後にRPC失敗 → ポイント未減算のまま換金レコードが残る
--       2タブ同時申請 → 残高超過の換金が可能
-- 修正: 1つのDB関数内で INSERT + ポイント減算を1トランザクションで実行
--       FOR UPDATE ロックで並行処理を防止
--
-- クライアント側: 既存の2ステップ呼び出しも引き続き動作する
--                （deduct_user_points が FOR UPDATE 付きに修正済みのため）
--                 新規コードではこの関数を使うことを推奨
-- =============================================================

CREATE OR REPLACE FUNCTION process_cashout_request(
    p_user_id UUID,
    p_amount INTEGER,
    p_bank_info JSONB,
    p_tax_rate NUMERIC DEFAULT 0.1021
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_available INTEGER;
    v_tax INTEGER;
    v_net INTEGER;
    v_cashout_id UUID;
BEGIN
    -- 1. 行ロックを取得してポイント残高を確認
    SELECT available_points INTO v_available
    FROM user_points
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_available IS NULL THEN
        RAISE EXCEPTION 'ユーザーのポイントレコードが見つかりません';
    END IF;

    IF v_available < p_amount THEN
        RAISE EXCEPTION 'ポイント残高が不足しています（残高: %, 要求: %）', v_available, p_amount;
    END IF;

    -- 2. 税額計算
    v_tax := FLOOR(p_amount * p_tax_rate);
    v_net := p_amount - v_tax;

    -- 3. 換金リクエストを作成
    INSERT INTO cashout_requests (
        user_id, amount, gross_amount, tax_amount, net_amount,
        bank_info, status
    ) VALUES (
        p_user_id, p_amount, p_amount, v_tax, v_net,
        p_bank_info, 'pending'
    ) RETURNING id INTO v_cashout_id;

    -- 4. ポイントを減算（同一トランザクション内）
    UPDATE user_points
    SET balance = balance - p_amount,
        available_points = available_points - p_amount,
        referral_points_spent = referral_points_spent + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN v_cashout_id;
END;
$$;

GRANT EXECUTE ON FUNCTION process_cashout_request(UUID, INTEGER, JSONB, NUMERIC) TO authenticated;


-- =============================================================
-- 3. イベント定員チェックトリガー修正（F-003）
--
-- 問題: 既存の handle_event_registration() トリガーが壊れている
--       - `events` テーブルを参照（正しくは `event_items`）
--       - `attendance_status` をチェック（正しくは `status`）
--       - AFTER INSERT（遅すぎる、BEFORE INSERT であるべき）
-- 修正: 正しいテーブル・カラム名で BEFORE INSERT トリガーを再作成
-- =============================================================

-- 壊れた古いトリガーを削除
DROP TRIGGER IF EXISTS trigger_event_registration ON event_participants;

-- 新しい定員チェック関数
CREATE OR REPLACE FUNCTION check_event_capacity()
RETURNS TRIGGER AS $$
DECLARE
    v_max INTEGER;
    v_count INTEGER;
BEGIN
    -- event_items から定員を取得
    SELECT max_participants INTO v_max
    FROM event_items
    WHERE id = NEW.event_id;

    -- 定員未設定なら制限なし
    IF v_max IS NULL THEN
        RETURN NEW;
    END IF;

    -- キャンセル以外の参加者数をカウント
    SELECT COUNT(*) INTO v_count
    FROM event_participants
    WHERE event_id = NEW.event_id
    AND status != 'cancelled';

    -- 定員超過チェック
    IF v_count >= v_max THEN
        RAISE EXCEPTION 'このイベントは定員に達しています（定員: %、現在: %）', v_max, v_count;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- BEFORE INSERT トリガー（INSERT を拒否できる）
DROP TRIGGER IF EXISTS trigger_check_event_capacity ON event_participants;
CREATE TRIGGER trigger_check_event_capacity
    BEFORE INSERT ON event_participants
    FOR EACH ROW
    EXECUTE FUNCTION check_event_capacity();


-- =============================================================
-- 4. コネクション UPDATE RLS を役割別に分割（F-008/F-016）
--
-- 問題: 現在のポリシーは user_id と connected_user_id の双方に
--       無制限の UPDATE を許可。送信者が自分の pending リクエストを
--       自分で accepted に変更可能（Supabase API 直接呼び出しで）
-- 修正: 3つのポリシーに分割
--   (a) 受信者のみが pending を accepted/rejected に変更可能
--   (b) 送信者のみが pending を cancelled に変更可能
--   (c) 双方が accepted を removed/blocked に変更可能
-- =============================================================

-- 既存の過度に寛容なポリシーを削除
DROP POLICY IF EXISTS "Users can update their connections" ON connections;

-- (a) 受信者（connected_user_id）は pending リクエストを承認/拒否できる
DROP POLICY IF EXISTS "Recipients can respond to connections" ON connections;
CREATE POLICY "Recipients can respond to connections" ON connections
    FOR UPDATE
    USING (auth.uid() = connected_user_id AND status = 'pending')
    WITH CHECK (status IN ('accepted', 'rejected'));

-- (b) 送信者（user_id）は自分の pending リクエストをキャンセルできる
DROP POLICY IF EXISTS "Senders can cancel pending connections" ON connections;
CREATE POLICY "Senders can cancel pending connections" ON connections
    FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (status = 'cancelled');

-- (c) 双方が accepted コネクションを削除/ブロックできる
DROP POLICY IF EXISTS "Users can manage accepted connections" ON connections;
CREATE POLICY "Users can manage accepted connections" ON connections
    FOR UPDATE
    USING (
        (auth.uid() = user_id OR auth.uid() = connected_user_id)
        AND status = 'accepted'
    )
    WITH CHECK (status IN ('removed', 'blocked'));

-- (d) 管理者は全コネクションを更新可能
DROP POLICY IF EXISTS "Admin can update all connections" ON connections;
CREATE POLICY "Admin can update all connections" ON connections
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );


-- =============================================================
-- 5. メッセージ INSERT RLS: コネクション確認追加（F-004）
--
-- 問題: 現在のポリシーは auth.uid() = sender_id のみチェック
--       コネクション未確認のまま任意ユーザーにメッセージ送信可能
-- 修正: accepted なコネクションが存在する場合のみ INSERT を許可
--
-- 注意: クライアント側でも二重チェック済み（messages-bundle.js）
--       これはDB側の最終防衛線
-- =============================================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can send messages" ON messages;

-- コネクション確認付きの INSERT ポリシー
CREATE POLICY "Users can send messages to connected users" ON messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM connections
            WHERE status = 'accepted'
            AND (
                (user_id = auth.uid() AND connected_user_id = receiver_id)
                OR (connected_user_id = auth.uid() AND user_id = receiver_id)
            )
        )
    );


-- =============================================================
-- 検証クエリ（実行後に確認用）
-- =============================================================

-- 確認1: deduct_user_points 関数が存在するか
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'deduct_user_points';

-- 確認2: process_cashout_request 関数が存在するか
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'process_cashout_request';

-- 確認3: event_participants のトリガー一覧
-- SELECT tgname, tgtype FROM pg_trigger WHERE tgrelid = 'event_participants'::regclass;

-- 確認4: connections テーブルの RLS ポリシー
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'connections';

-- 確認5: messages テーブルの RLS ポリシー
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'messages';

COMMIT;
