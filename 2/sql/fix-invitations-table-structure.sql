-- ===========================
-- invitationsテーブル構造の修正
-- 実際のカラムに合わせて修正
-- ===========================

-- 既存のinvitationsテーブルの構造:
-- inviter_id (紹介者)
-- invitee_email (招待されたメールアドレス)
-- accepted_by (登録したユーザーのID)
-- status, points_earned, etc.

-- 1. get_referral_stats関数を修正（invitationsテーブルの正しいカラムを使用）
DROP FUNCTION IF EXISTS get_referral_stats(UUID);

CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS TABLE(
    available_points INTEGER,
    total_points_earned INTEGER,
    total_referrals INTEGER,
    successful_referrals INTEGER,
    conversion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH user_stats AS (
        -- ユーザーのポイント情報
        SELECT 
            COALESCE(up.available_points, 0) as available_points,
            COALESCE(up.total_points, 0) as total_points_earned
        FROM user_points up
        WHERE up.user_id = p_user_id
    ),
    referral_stats AS (
        -- 紹介統計（正しいカラム名を使用）
        SELECT 
            COUNT(*) as total_referrals,
            COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as successful_referrals
        FROM invitations i
        WHERE i.inviter_id = p_user_id
    )
    SELECT 
        COALESCE((SELECT available_points FROM user_stats), 0)::INTEGER,
        COALESCE((SELECT total_points_earned FROM user_stats), 0)::INTEGER,
        COALESCE((SELECT total_referrals FROM referral_stats), 0)::INTEGER,
        COALESCE((SELECT successful_referrals FROM referral_stats), 0)::INTEGER,
        CASE 
            WHEN (SELECT total_referrals FROM referral_stats) > 0 
            THEN ROUND(((SELECT successful_referrals FROM referral_stats)::NUMERIC / (SELECT total_referrals FROM referral_stats)) * 100, 2)
            ELSE 0
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 紹介履歴を取得するビューを作成（複雑なクエリを簡素化）
CREATE OR REPLACE VIEW v_referral_history AS
SELECT 
    i.id,
    i.inviter_id,
    i.invitee_email,
    i.invitation_code,
    i.custom_message,
    i.status,
    i.points_earned,
    i.sent_at,
    i.accepted_at,
    i.accepted_by,
    i.expires_at,
    -- 招待された人のプロファイル情報（もし登録済みなら）
    p.name as invitee_name,
    p.company as invitee_company,
    p.avatar_url as invitee_avatar
FROM invitations i
LEFT JOIN profiles p ON p.id = i.accepted_by;

-- 3. RLSポリシーの更新（invitee_idカラムを使用しない）
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view invitations they created" ON invitations;
DROP POLICY IF EXISTS "Users can view invitations they received" ON invitations;

-- 新しいポリシー（正しいカラムを使用）
CREATE POLICY "Users can view invitations they created" ON invitations
    FOR SELECT USING (inviter_id = auth.uid());

CREATE POLICY "Users can view invitations where they are the acceptor" ON invitations
    FOR SELECT USING (accepted_by = auth.uid());

CREATE POLICY "Users can create invitations" ON invitations
    FOR INSERT WITH CHECK (inviter_id = auth.uid());

-- 4. インデックスの更新
DROP INDEX IF EXISTS idx_invitations_invitee_id;
CREATE INDEX IF NOT EXISTS idx_invitations_accepted_by ON invitations(accepted_by);
CREATE INDEX IF NOT EXISTS idx_invitations_invitee_email ON invitations(invitee_email);

-- 5. 招待を作成する関数
CREATE OR REPLACE FUNCTION create_invitation(
    p_inviter_id UUID,
    p_invitee_email TEXT,
    p_custom_message TEXT DEFAULT NULL,
    p_invite_link_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_invitation_id UUID;
    v_invitation_code TEXT;
BEGIN
    -- 招待コードを生成
    v_invitation_code := UPPER(
        SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 6)
    );
    
    -- 既存の招待をチェック（同じメールアドレスに対する有効な招待）
    IF EXISTS (
        SELECT 1 FROM invitations 
        WHERE inviter_id = p_inviter_id 
        AND invitee_email = p_invitee_email 
        AND status = 'pending'
        AND (expires_at IS NULL OR expires_at > NOW())
    ) THEN
        RAISE EXCEPTION '既にこのメールアドレスに対する有効な招待が存在します';
    END IF;
    
    -- 招待を作成
    INSERT INTO invitations (
        inviter_id,
        invitee_email,
        invitation_code,
        custom_message,
        status,
        sent_at,
        expires_at
    ) VALUES (
        p_inviter_id,
        p_invitee_email,
        v_invitation_code,
        p_custom_message,
        'pending',
        NOW(),
        NOW() + INTERVAL '30 days'
    ) RETURNING id INTO v_invitation_id;
    
    -- 招待リンクとの関連付け（もしあれば）
    IF p_invite_link_id IS NOT NULL THEN
        INSERT INTO invite_history (
            invite_link_id,
            invitation_id,
            created_at
        ) VALUES (
            p_invite_link_id,
            v_invitation_id,
            NOW()
        );
        
        -- リンクの使用回数を増やす
        UPDATE invite_links 
        SET used_count = used_count + 1 
        WHERE id = p_invite_link_id;
    END IF;
    
    RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 招待を承認する関数
CREATE OR REPLACE FUNCTION accept_invitation(
    p_invitation_code TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_invitation RECORD;
BEGIN
    -- 招待を検索
    SELECT * INTO v_invitation
    FROM invitations
    WHERE invitation_code = p_invitation_code
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > NOW());
    
    IF NOT FOUND THEN
        RAISE EXCEPTION '有効な招待が見つかりません';
    END IF;
    
    -- 招待を更新
    UPDATE invitations
    SET 
        status = 'registered',
        accepted_at = NOW(),
        accepted_by = p_user_id
    WHERE id = v_invitation.id;
    
    -- 通知を作成
    INSERT INTO notifications (
        user_id,
        type,
        category,
        title,
        content,
        related_id,
        related_type
    ) VALUES (
        v_invitation.inviter_id,
        'referral_accepted',
        'referral',
        '紹介が承認されました',
        v_invitation.invitee_email || 'さんが登録しました',
        v_invitation.id,
        'invitation'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 権限の付与
GRANT ALL ON invitations TO authenticated;
GRANT SELECT ON v_referral_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_invitation(UUID, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT, UUID) TO authenticated;