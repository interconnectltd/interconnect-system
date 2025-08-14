-- 紹介報酬の自動処理システム（修正版）

-- ========================================
-- 1. 報酬処理状態を管理するテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS reward_processing_status (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    tldv_meeting_id TEXT,
    meeting_verified_at TIMESTAMP WITH TIME ZONE,
    reward_amount INTEGER DEFAULT 1000,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_reward_processing_status_invitation_id ON reward_processing_status(invitation_id);
CREATE INDEX idx_reward_processing_status_status ON reward_processing_status(status);

-- ========================================
-- 2. tl:dv会議確認用のモックテーブル（実際はAPIで確認）
-- ========================================
CREATE TABLE IF NOT EXISTS tldv_meeting_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    meeting_id TEXT UNIQUE NOT NULL,
    invitee_email TEXT NOT NULL,
    meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER,
    recording_url TEXT,
    transcript_url TEXT,
    is_valid BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 3. 報酬処理の自動化関数
-- ========================================

-- tl:dv会議の完了を確認して報酬を処理
CREATE OR REPLACE FUNCTION process_referral_reward(p_invitation_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_invitation invitations%ROWTYPE;
    v_invitee_email TEXT;
    v_meeting_record tldv_meeting_records%ROWTYPE;
    v_existing_reward reward_processing_status%ROWTYPE;
    v_result JSONB;
BEGIN
    -- 招待情報を取得
    SELECT i.* INTO v_invitation
    FROM invitations i
    WHERE i.id = p_invitation_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Invitation not found'
        );
    END IF;
    
    -- すでに処理済みかチェック
    SELECT * INTO v_existing_reward
    FROM reward_processing_status
    WHERE invitation_id = p_invitation_id
    AND status = 'completed';
    
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Reward already processed'
        );
    END IF;
    
    -- 招待者のメールアドレスを取得
    SELECT email INTO v_invitee_email
    FROM auth.users
    WHERE id = v_invitation.invitee_id;
    
    -- tl:dv会議記録を確認（実際はAPIで確認）
    SELECT * INTO v_meeting_record
    FROM tldv_meeting_records
    WHERE invitee_email = v_invitee_email
    AND meeting_date > v_invitation.created_at
    AND is_valid = TRUE
    ORDER BY meeting_date ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        -- 処理状態を更新
        INSERT INTO reward_processing_status (invitation_id, status, error_message)
        VALUES (p_invitation_id, 'pending', 'Meeting not found')
        ON CONFLICT (invitation_id) DO UPDATE
        SET status = 'pending',
            error_message = 'Meeting not found',
            retry_count = reward_processing_status.retry_count + 1,
            updated_at = NOW();
            
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Meeting not completed yet'
        );
    END IF;
    
    -- トランザクション開始
    BEGIN
        -- 処理状態を更新
        INSERT INTO reward_processing_status (
            invitation_id,
            status,
            tldv_meeting_id,
            meeting_verified_at
        )
        VALUES (
            p_invitation_id,
            'processing',
            v_meeting_record.meeting_id,
            v_meeting_record.meeting_date
        )
        ON CONFLICT (invitation_id) DO UPDATE
        SET status = 'processing',
            tldv_meeting_id = v_meeting_record.meeting_id,
            meeting_verified_at = v_meeting_record.meeting_date,
            updated_at = NOW();
        
        -- ポイントを付与
        INSERT INTO user_points (user_id, available_points, total_earned)
        VALUES (v_invitation.inviter_id, 1000, 1000)
        ON CONFLICT (user_id) DO UPDATE
        SET available_points = user_points.available_points + 1000,
            total_earned = user_points.total_earned + 1000,
            updated_at = NOW();
        
        -- 招待状態を更新
        UPDATE invitations
        SET status = 'completed',
            completed_at = NOW()
        WHERE id = p_invitation_id;
        
        -- 処理完了
        UPDATE reward_processing_status
        SET status = 'completed',
            updated_at = NOW()
        WHERE invitation_id = p_invitation_id;
        
        -- 通知を作成（任意）
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            data
        )
        VALUES (
            v_invitation.inviter_id,
            'reward_earned',
            '紹介報酬を獲得しました！',
            '紹介した方がtl:dv会議を完了したため、1,000ポイントを獲得しました。',
            jsonb_build_object(
                'invitation_id', p_invitation_id,
                'amount', 1000,
                'meeting_id', v_meeting_record.meeting_id
            )
        );
        
        v_result := jsonb_build_object(
            'success', TRUE,
            'reward_amount', 1000,
            'meeting_id', v_meeting_record.meeting_id
        );
        
        RETURN v_result;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- エラー時はロールバック
            UPDATE reward_processing_status
            SET status = 'failed',
                error_message = SQLERRM,
                updated_at = NOW()
            WHERE invitation_id = p_invitation_id;
            
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. バッチ処理用の関数
-- ========================================

-- 未処理の招待を一括処理
CREATE OR REPLACE FUNCTION process_pending_rewards()
RETURNS JSONB AS $$
DECLARE
    v_invitation invitations%ROWTYPE;
    v_processed_count INTEGER := 0;
    v_error_count INTEGER := 0;
    v_result JSONB;
BEGIN
    -- 未処理の招待を取得
    FOR v_invitation IN
        SELECT i.*
        FROM invitations i
        LEFT JOIN reward_processing_status rps ON i.id = rps.invitation_id
        WHERE i.status = 'registered'
        AND (rps.status IS NULL OR rps.status IN ('pending', 'failed'))
        AND i.created_at > NOW() - INTERVAL '90 days' -- 90日以内の招待のみ
        ORDER BY i.created_at ASC
        LIMIT 100 -- バッチサイズ
    LOOP
        BEGIN
            v_result := process_referral_reward(v_invitation.id);
            
            IF (v_result->>'success')::boolean THEN
                v_processed_count := v_processed_count + 1;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                v_error_count := v_error_count + 1;
                -- エラーログを記録
                RAISE WARNING 'Error processing invitation %: %', v_invitation.id, SQLERRM;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'processed_count', v_processed_count,
        'error_count', v_error_count,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. 定期実行用のスケジューラー（pg_cronを使用）
-- ========================================

-- pg_cronがインストールされている場合のみ実行
-- SELECT cron.schedule('process-referral-rewards', '*/15 * * * *', 'SELECT process_pending_rewards();');

-- ========================================
-- 6. 手動でtl:dv会議を記録する関数（テスト用）
-- ========================================

CREATE OR REPLACE FUNCTION record_tldv_meeting(
    p_meeting_id TEXT,
    p_invitee_email TEXT,
    p_meeting_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_duration_minutes INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    v_meeting_id UUID;
BEGIN
    INSERT INTO tldv_meeting_records (
        meeting_id,
        invitee_email,
        meeting_date,
        duration_minutes,
        is_valid
    )
    VALUES (
        p_meeting_id,
        p_invitee_email,
        p_meeting_date,
        p_duration_minutes,
        TRUE
    )
    RETURNING id INTO v_meeting_id;
    
    -- 関連する招待の報酬を処理
    PERFORM process_referral_reward(i.id)
    FROM invitations i
    JOIN auth.users u ON i.invitee_id = u.id
    WHERE u.email = p_invitee_email
    AND i.status = 'registered';
    
    RETURN v_meeting_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. 報酬処理の監視ビュー
-- ========================================

-- 報酬処理の概要
CREATE OR REPLACE VIEW reward_processing_summary AS
SELECT 
    status,
    COUNT(*) as count,
    SUM(reward_amount) as total_amount,
    AVG(retry_count) as avg_retry_count,
    MAX(updated_at) as last_updated
FROM reward_processing_status
GROUP BY status;

-- 未処理の招待一覧（修正版）
CREATE OR REPLACE VIEW pending_rewards AS
SELECT 
    i.id as invitation_id,
    i.inviter_id,
    i.invitee_id,
    p1.name as inviter_name,
    p2.name as invitee_name,
    u.email as invitee_email,
    i.created_at as invitation_date,
    rps.status as processing_status,
    rps.retry_count,
    rps.error_message
FROM invitations i
JOIN profiles p1 ON i.inviter_id = p1.id
LEFT JOIN profiles p2 ON i.invitee_id = p2.id
LEFT JOIN auth.users u ON i.invitee_id = u.id
LEFT JOIN reward_processing_status rps ON i.id = rps.invitation_id
WHERE i.status = 'registered'
AND (rps.status IS NULL OR rps.status != 'completed')
ORDER BY i.created_at ASC;

-- ========================================
-- 8. RLSポリシー
-- ========================================

-- 報酬処理状態は管理者のみ閲覧可能
ALTER TABLE reward_processing_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage reward processing" ON reward_processing_status
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = TRUE
        )
    );

-- tl:dv会議記録は管理者のみ管理可能
ALTER TABLE tldv_meeting_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage meeting records" ON tldv_meeting_records
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = TRUE
        )
    );