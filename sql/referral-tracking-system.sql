-- 紹介リンク追跡システムのセットアップ

-- 1. invitationsテーブルにinvite_link_idカラムを追加（存在しない場合）
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS invite_link_id UUID REFERENCES invite_links(id);

-- 2. インデックスを作成
CREATE INDEX IF NOT EXISTS idx_invitations_invite_link_id ON invitations(invite_link_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invite_links_link_code ON invite_links(link_code);

-- 3. 紹介リンクの統計を更新する関数
CREATE OR REPLACE FUNCTION update_invite_link_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- invite_linksの使用回数を更新
    IF TG_OP = 'INSERT' AND NEW.invite_link_id IS NOT NULL THEN
        UPDATE invite_links
        SET used_count = used_count + 1
        WHERE id = NEW.invite_link_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. トリガーを作成
DROP TRIGGER IF EXISTS update_link_stats_on_invitation ON invitations;
CREATE TRIGGER update_link_stats_on_invitation
    AFTER INSERT ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_invite_link_stats();

-- 5. 面談完了時にポイントを付与する関数
CREATE OR REPLACE FUNCTION complete_referral_meeting(
    p_invitation_id UUID,
    p_meeting_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS JSON AS $$
DECLARE
    v_invitation invitations%ROWTYPE;
    v_inviter_id UUID;
    v_reward_amount INTEGER := 1000; -- 報酬ポイント
    v_result JSON;
BEGIN
    -- 招待情報を取得
    SELECT * INTO v_invitation
    FROM invitations
    WHERE id = p_invitation_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', '招待が見つかりません'
        );
    END IF;
    
    -- すでに完了している場合はエラー
    IF v_invitation.status = 'completed' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'すでに面談が完了しています'
        );
    END IF;
    
    -- ステータスを更新
    UPDATE invitations
    SET 
        status = 'completed',
        points_earned = v_reward_amount
    WHERE id = p_invitation_id;
    
    -- 紹介者にポイントを付与
    v_inviter_id := v_invitation.inviter_id;
    
    -- user_pointsテーブルにポイントを追加
    INSERT INTO user_points (user_id, total_points, available_points)
    VALUES (v_inviter_id, v_reward_amount, v_reward_amount)
    ON CONFLICT (user_id) DO UPDATE
    SET 
        total_points = user_points.total_points + v_reward_amount,
        available_points = user_points.available_points + v_reward_amount;
    
    -- point_transactionsに記録
    INSERT INTO point_transactions (
        user_id,
        transaction_type,
        points,
        reason,
        related_id,
        related_type
    ) VALUES (
        v_inviter_id,
        'referral_reward',
        v_reward_amount,
        '紹介報酬',
        p_invitation_id,
        'invitation'
    );
    
    -- profilesのポイントも更新
    UPDATE profiles
    SET 
        total_points_earned = COALESCE(total_points_earned, 0) + v_reward_amount,
        available_points = COALESCE(available_points, 0) + v_reward_amount
    WHERE id = v_inviter_id;
    
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
        v_inviter_id,
        'referral_complete',
        'reward',
        '紹介報酬獲得',
        '紹介した方の面談が完了し、' || v_reward_amount || 'ポイントを獲得しました！',
        p_invitation_id,
        'invitation'
    );
    
    -- 結果を返す
    SELECT json_build_object(
        'success', true,
        'invitation_id', p_invitation_id,
        'inviter_id', v_inviter_id,
        'points_awarded', v_reward_amount,
        'message', '面談完了を記録し、報酬を付与しました'
    ) INTO v_result;
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 紹介リンクの詳細統計を取得する関数
CREATE OR REPLACE FUNCTION get_referral_link_stats(p_link_id UUID)
RETURNS JSON AS $$
DECLARE
    v_stats JSON;
BEGIN
    SELECT json_build_object(
        'link_id', il.id,
        'link_code', il.link_code,
        'description', il.description,
        'created_at', il.created_at,
        'total_clicks', COALESCE(ih.click_count, 0),
        'registrations', COALESCE(i.registration_count, 0),
        'completed_meetings', COALESCE(i.completed_count, 0),
        'total_rewards', COALESCE(i.total_rewards, 0),
        'conversion_rate', 
            CASE 
                WHEN COALESCE(i.registration_count, 0) > 0 
                THEN ROUND((COALESCE(i.completed_count, 0)::NUMERIC / i.registration_count) * 100, 2)
                ELSE 0
            END,
        'recent_activities', COALESCE(i.recent_activities, '[]'::JSON)
    ) INTO v_stats
    FROM invite_links il
    LEFT JOIN (
        SELECT 
            invite_link_id,
            COUNT(*) as click_count
        FROM invite_history
        WHERE invite_link_id = p_link_id
        GROUP BY invite_link_id
    ) ih ON ih.invite_link_id = il.id
    LEFT JOIN (
        SELECT 
            invite_link_id,
            COUNT(*) FILTER (WHERE status IN ('registered', 'completed')) as registration_count,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
            SUM(points_earned) as total_rewards,
            json_agg(
                json_build_object(
                    'status', status,
                    'date', created_at,
                    'points', points_earned
                ) ORDER BY created_at DESC
            ) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_activities
        FROM invitations
        WHERE invite_link_id = p_link_id
        GROUP BY invite_link_id
    ) i ON i.invite_link_id = il.id
    WHERE il.id = p_link_id;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 権限付与
GRANT EXECUTE ON FUNCTION complete_referral_meeting TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_link_stats TO authenticated;