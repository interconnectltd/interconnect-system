-- ========================================
-- INTERCONNECT 紹介システム データベーススキーマ
-- ========================================

-- 既存のinvitationsテーブルに紹介報酬関連カラムを追加
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS reward_points INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS reward_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (reward_status IN ('pending', 'earned', 'cancelled')),
ADD COLUMN IF NOT EXISTS reward_earned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS meeting_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS fraud_score DECIMAL(3, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_invitations_reward_status 
ON public.invitations(reward_status) 
WHERE reward_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_invitations_inviter_rewards 
ON public.invitations(inviter_id, reward_status, created_at DESC);

-- 既存のinvite_linksテーブルに統計カラムを追加
ALTER TABLE public.invite_links 
ADD COLUMN IF NOT EXISTS registration_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_rewards_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS campaign_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_invite_links_stats 
ON public.invite_links(created_by, is_active, created_at DESC);

-- user_pointsテーブルの確認と調整
ALTER TABLE public.user_points 
ADD COLUMN IF NOT EXISTS referral_points_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_points_spent INTEGER DEFAULT 0;

-- meeting_minutesテーブルの拡張
ALTER TABLE public.meeting_minutes 
ADD COLUMN IF NOT EXISTS referral_processed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS referral_invitation_id UUID REFERENCES public.invitations(id);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_referral 
ON public.meeting_minutes(referral_processed, created_at) 
WHERE referral_processed = false;

-- ========================================
-- 新規テーブル: 紹介詳細
-- ========================================
CREATE TABLE IF NOT EXISTS public.referral_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invitation_id UUID REFERENCES public.invitations(id) ON DELETE CASCADE,
    referrer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    referred_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    meeting_minutes_id UUID REFERENCES public.meeting_minutes(id),
    
    -- 不正検知情報
    referrer_ip INET,
    referred_ip INET,
    referrer_device_id TEXT,
    referred_device_id TEXT,
    same_device_flag BOOLEAN DEFAULT false,
    same_network_flag BOOLEAN DEFAULT false,
    
    -- 検証情報
    fraud_score DECIMAL(3, 2) DEFAULT 0.00,
    fraud_reasons JSONB DEFAULT '[]',
    verification_status VARCHAR(20) DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id),
    verification_notes TEXT,
    
    -- メタデータ
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_referral_detail UNIQUE(invitation_id)
);

-- インデックス
CREATE INDEX idx_referral_details_verification 
ON public.referral_details(verification_status, created_at DESC);

CREATE INDEX idx_referral_details_fraud 
ON public.referral_details(fraud_score DESC) 
WHERE fraud_score > 0.5;

-- ========================================
-- 新規テーブル: キャッシュアウト申請
-- ========================================
CREATE TABLE IF NOT EXISTS public.cashout_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    request_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- 金額情報
    points_amount INTEGER NOT NULL CHECK (points_amount >= 3000),
    cash_amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL,
    net_amount DECIMAL(10, 2) NOT NULL,
    
    -- 振込先情報
    bank_details JSONB NOT NULL,
    
    -- 税務情報
    tax_info JSONB DEFAULT '{}',
    
    -- ステータス管理
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'reviewing', 'approved', 'processing', 'completed', 'rejected', 'cancelled')),
    
    -- 処理情報
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- 拒否・キャンセル情報
    rejection_reason TEXT,
    cancellation_reason TEXT,
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_cashout_requests_user_status 
ON public.cashout_requests(user_id, status, created_at DESC);

CREATE INDEX idx_cashout_requests_processing 
ON public.cashout_requests(status, created_at) 
WHERE status IN ('pending', 'approved', 'processing');

-- ========================================
-- トリガー関数: meeting_minutes挿入時の紹介報酬処理
-- ========================================
CREATE OR REPLACE FUNCTION process_referral_on_meeting()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_invitation RECORD;
    v_fraud_score DECIMAL(3, 2);
    v_referral_detail_id UUID;
BEGIN
    -- 既に処理済みの場合はスキップ
    IF NEW.referral_processed = true THEN
        RETURN NEW;
    END IF;
    
    -- profile_idからユーザー情報を取得
    SELECT u.id, u.email INTO v_user_id, v_user_email
    FROM auth.users u
    JOIN profiles p ON p.id = u.id
    WHERE p.id = NEW.profile_id;
    
    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- 該当する招待を検索（最新の承認済み招待）
    SELECT i.* INTO v_invitation
    FROM invitations i
    WHERE i.invitee_email = v_user_email
    AND i.status = 'accepted'
    AND i.reward_status = 'pending'
    ORDER BY i.accepted_at DESC
    LIMIT 1;
    
    IF v_invitation.id IS NOT NULL THEN
        -- 簡易的な不正スコア計算（後で詳細な実装に置き換え）
        v_fraud_score := 0.0;
        
        -- 紹介詳細レコードを作成
        INSERT INTO referral_details (
            invitation_id, referrer_id, referred_id, 
            meeting_minutes_id, fraud_score
        ) VALUES (
            v_invitation.id, v_invitation.inviter_id, v_user_id,
            NEW.id, v_fraud_score
        ) RETURNING id INTO v_referral_detail_id;
        
        -- 不正スコアが低い場合は自動承認
        IF v_fraud_score < 0.3 THEN
            -- 招待の報酬ステータスを更新
            UPDATE invitations 
            SET reward_status = 'earned',
                reward_earned_at = NOW(),
                meeting_completed_at = NEW.meeting_date,
                fraud_score = v_fraud_score
            WHERE id = v_invitation.id;
            
            -- ポイントトランザクションを作成
            INSERT INTO point_transactions (
                user_id, transaction_type, points, 
                reason, related_id, related_type
            ) VALUES (
                v_invitation.inviter_id, 'earned', v_invitation.reward_points,
                format('紹介報酬: %s様の紹介', 
                    (SELECT name FROM profiles WHERE id = v_user_id)),
                v_invitation.id, 'invitation'
            );
            
            -- ユーザーポイント残高を更新
            INSERT INTO user_points (user_id, total_points, available_points, referral_points_earned)
            VALUES (v_invitation.inviter_id, v_invitation.reward_points, v_invitation.reward_points, v_invitation.reward_points)
            ON CONFLICT (user_id) DO UPDATE
            SET total_points = user_points.total_points + EXCLUDED.total_points,
                available_points = user_points.available_points + EXCLUDED.available_points,
                referral_points_earned = user_points.referral_points_earned + EXCLUDED.referral_points_earned,
                updated_at = NOW();
            
            -- invite_linksの統計を更新
            UPDATE invite_links
            SET completion_count = completion_count + 1,
                total_rewards_earned = total_rewards_earned + v_invitation.reward_points,
                updated_at = NOW()
            WHERE link_code = v_invitation.invitation_code;
            
            -- 通知を送信
            INSERT INTO notifications (
                user_id, type, category, title, content,
                icon, priority, action_url, metadata
            ) VALUES (
                v_invitation.inviter_id,
                'referral_completed',
                'reward',
                '紹介が成立しました！',
                format('%s様の紹介が成立し、%sポイントを獲得しました', 
                    COALESCE((SELECT name FROM profiles WHERE id = v_user_id), 'ゲスト'), 
                    v_invitation.reward_points),
                'fa-gift',
                'high',
                '/referral',
                jsonb_build_object(
                    'referred_id', v_user_id,
                    'points', v_invitation.reward_points,
                    'timestamp', NOW()
                )
            );
        END IF;
        
        -- meeting_minutesを更新
        NEW.referral_processed = true;
        NEW.referral_invitation_id = v_invitation.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_referral_on_meeting ON meeting_minutes;
CREATE TRIGGER trigger_referral_on_meeting
AFTER INSERT ON meeting_minutes
FOR EACH ROW EXECUTE FUNCTION process_referral_on_meeting();

-- ========================================
-- RLSポリシー
-- ========================================

-- referral_details テーブルのRLS
ALTER TABLE public.referral_details ENABLE ROW LEVEL SECURITY;

-- 自分が関係する紹介詳細のみ閲覧可能
CREATE POLICY "Users can view own referral details" ON public.referral_details
FOR SELECT USING (
    auth.uid() IN (referrer_id, referred_id)
);

-- 管理者は全て閲覧可能
CREATE POLICY "Admins can view all referral details" ON public.referral_details
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- cashout_requests テーブルのRLS
ALTER TABLE public.cashout_requests ENABLE ROW LEVEL SECURITY;

-- 自分の申請のみ閲覧・作成可能
CREATE POLICY "Users can view own cashout requests" ON public.cashout_requests
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own cashout requests" ON public.cashout_requests
FOR INSERT WITH CHECK (user_id = auth.uid());

-- キャンセルは pending 状態のみ可能
CREATE POLICY "Users can cancel pending cashout requests" ON public.cashout_requests
FOR UPDATE USING (
    user_id = auth.uid() 
    AND status = 'pending'
) WITH CHECK (
    status = 'cancelled'
);

-- 管理者は全操作可能
CREATE POLICY "Admins can manage all cashout requests" ON public.cashout_requests
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- ========================================
-- 便利な関数: 紹介統計取得
-- ========================================
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS TABLE (
    total_invitations INTEGER,
    total_registrations INTEGER,
    total_completions INTEGER,
    total_points_earned INTEGER,
    available_points INTEGER,
    conversion_rate DECIMAL(5, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER AS total_invitations,
        COUNT(*) FILTER (WHERE status = 'accepted')::INTEGER AS total_registrations,
        COUNT(*) FILTER (WHERE reward_status = 'earned')::INTEGER AS total_completions,
        COALESCE(SUM(reward_points) FILTER (WHERE reward_status = 'earned'), 0)::INTEGER AS total_points_earned,
        COALESCE((SELECT available_points FROM user_points WHERE user_id = p_user_id), 0)::INTEGER AS available_points,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE reward_status = 'earned')::DECIMAL / COUNT(*)) * 100, 2)
            ELSE 0
        END AS conversion_rate
    FROM invitations
    WHERE inviter_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;