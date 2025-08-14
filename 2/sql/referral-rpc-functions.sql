-- 紹介プログラム用のRPC関数

-- ========================================
-- 1. ポイント操作関数
-- ========================================

-- ポイントを減算する
CREATE OR REPLACE FUNCTION deduct_user_points(
    p_user_id UUID,
    p_amount INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_points INTEGER;
BEGIN
    -- 現在のポイントを取得
    SELECT available_points INTO v_current_points
    FROM user_points
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- ポイントが不足している場合はエラー
    IF v_current_points IS NULL OR v_current_points < p_amount THEN
        RAISE EXCEPTION 'Insufficient points';
    END IF;
    
    -- ポイントを減算
    UPDATE user_points
    SET available_points = available_points - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ポイントを加算する
CREATE OR REPLACE FUNCTION add_user_points(
    p_user_id UUID,
    p_amount INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO user_points (user_id, available_points, total_earned)
    VALUES (p_user_id, p_amount, p_amount)
    ON CONFLICT (user_id) DO UPDATE
    SET available_points = user_points.available_points + p_amount,
        total_earned = user_points.total_earned + p_amount,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 2. 統計情報取得関数
-- ========================================

-- 紹介統計を取得
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS TABLE (
    total_referrals INTEGER,
    successful_referrals INTEGER,
    pending_referrals INTEGER,
    total_rewards INTEGER,
    available_points INTEGER,
    total_earned_points INTEGER,
    cashout_pending INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- 総紹介数
        COALESCE(COUNT(DISTINCT i.id), 0)::INTEGER as total_referrals,
        -- 成功した紹介数
        COALESCE(COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END), 0)::INTEGER as successful_referrals,
        -- 保留中の紹介数
        COALESCE(COUNT(DISTINCT CASE WHEN i.status IN ('pending', 'registered') THEN i.id END), 0)::INTEGER as pending_referrals,
        -- 総報酬額
        COALESCE(COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) * 1000, 0)::INTEGER as total_rewards,
        -- 利用可能ポイント
        COALESCE(up.available_points, 0)::INTEGER as available_points,
        -- 総獲得ポイント
        COALESCE(up.total_earned, 0)::INTEGER as total_earned_points,
        -- 申請中のキャッシュアウト額
        COALESCE(
            (SELECT SUM(amount)::INTEGER 
             FROM cashout_requests 
             WHERE user_id = p_user_id 
             AND status IN ('pending', 'approved', 'processing')), 
            0
        )::INTEGER as cashout_pending
    FROM invitations i
    LEFT JOIN user_points up ON up.user_id = p_user_id
    WHERE i.inviter_id = p_user_id
    GROUP BY up.available_points, up.total_earned;
END;
$$ LANGUAGE plpgsql;

-- トップ紹介者を取得
CREATE OR REPLACE FUNCTION get_top_referrers(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    company TEXT,
    referral_count BIGINT,
    successful_count BIGINT,
    total_points INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.name,
        p.company,
        COUNT(DISTINCT i.id) as referral_count,
        COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) as successful_count,
        COALESCE(up.total_earned, 0) as total_points
    FROM profiles p
    JOIN invitations i ON i.inviter_id = p.id
    LEFT JOIN user_points up ON up.user_id = p.id
    GROUP BY p.id, p.name, p.company, up.total_earned
    ORDER BY successful_count DESC, referral_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. 分析用関数
-- ========================================

-- 紹介プログラムの分析データを取得
CREATE OR REPLACE FUNCTION get_referral_analytics(
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    daily_referrals JSONB,
    daily_rewards JSONB,
    success_rates JSONB,
    user_distribution JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(start_date, end_date, '1 day'::interval)::date as date
    ),
    daily_stats AS (
        SELECT 
            ds.date,
            COUNT(DISTINCT i.id) as referral_count,
            COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) as success_count,
            COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) * 1000 as reward_amount
        FROM date_series ds
        LEFT JOIN invitations i ON DATE(i.created_at) = ds.date
        GROUP BY ds.date
    ),
    user_dist AS (
        SELECT 
            p.name,
            COUNT(DISTINCT i.id) as count
        FROM profiles p
        JOIN invitations i ON i.inviter_id = p.id
        WHERE i.created_at BETWEEN start_date AND end_date
        GROUP BY p.name
        ORDER BY count DESC
        LIMIT 10
    )
    SELECT 
        -- 日別紹介数
        (SELECT jsonb_agg(
            jsonb_build_object(
                'date', to_char(date, 'MM/DD'),
                'count', referral_count
            ) ORDER BY date
        ) FROM daily_stats) as daily_referrals,
        
        -- 日別報酬額
        (SELECT jsonb_agg(
            jsonb_build_object(
                'date', to_char(date, 'MM/DD'),
                'amount', reward_amount
            ) ORDER BY date
        ) FROM daily_stats) as daily_rewards,
        
        -- 日別成功率
        (SELECT jsonb_agg(
            jsonb_build_object(
                'date', to_char(date, 'MM/DD'),
                'rate', CASE 
                    WHEN referral_count > 0 
                    THEN ROUND((success_count::numeric / referral_count::numeric) * 100, 1)
                    ELSE 0
                END
            ) ORDER BY date
        ) FROM daily_stats) as success_rates,
        
        -- ユーザー別分布
        (SELECT jsonb_agg(
            jsonb_build_object(
                'name', name,
                'count', count
            ) ORDER BY count DESC
        ) FROM user_dist) as user_distribution;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. 管理者用関数
-- ========================================

-- 不正フラグの詳細情報を取得
CREATE OR REPLACE FUNCTION get_fraud_flag_details(p_flag_id UUID)
RETURNS TABLE (
    flag_info JSONB,
    user_activity JSONB,
    related_users JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH flag_data AS (
        SELECT * FROM fraud_flags WHERE id = p_flag_id
    ),
    user_activities AS (
        SELECT 
            jsonb_agg(
                jsonb_build_object(
                    'action', action_type,
                    'ip_address', ip_address,
                    'timestamp', created_at,
                    'metadata', metadata
                ) ORDER BY created_at DESC
            ) as activities
        FROM access_logs
        WHERE user_id = (SELECT user_id FROM flag_data)
        AND created_at > NOW() - INTERVAL '30 days'
    ),
    related AS (
        SELECT 
            jsonb_agg(
                DISTINCT jsonb_build_object(
                    'user_id', al2.user_id,
                    'ip_address', al2.ip_address,
                    'action_count', (
                        SELECT COUNT(*) 
                        FROM access_logs al3 
                        WHERE al3.user_id = al2.user_id
                    )
                )
            ) as users
        FROM access_logs al1
        JOIN access_logs al2 ON al1.ip_address = al2.ip_address AND al1.user_id != al2.user_id
        WHERE al1.user_id = (SELECT user_id FROM flag_data)
    )
    SELECT 
        to_jsonb(fd.*) as flag_info,
        ua.activities as user_activity,
        r.users as related_users
    FROM flag_data fd
    CROSS JOIN user_activities ua
    CROSS JOIN related r;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. 権限設定
-- ========================================

-- 一般ユーザー用の権限
GRANT EXECUTE ON FUNCTION get_referral_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_user_points(UUID, INTEGER) TO authenticated;

-- 管理者用の権限（別途管理者ロールが必要）
-- GRANT EXECUTE ON FUNCTION get_top_referrers(INTEGER) TO admin_role;
-- GRANT EXECUTE ON FUNCTION get_referral_analytics(DATE, DATE) TO admin_role;
-- GRANT EXECUTE ON FUNCTION get_fraud_flag_details(UUID) TO admin_role;