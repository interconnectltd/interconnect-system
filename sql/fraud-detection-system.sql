-- 不正検知システム用のテーブルとトリガー

-- ========================================
-- 1. アクセスログテーブル（IP追跡用）
-- ========================================
CREATE TABLE IF NOT EXISTS access_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'registration', 'referral_created', 'cashout_request'
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_ip_address ON access_logs(ip_address);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);

-- ========================================
-- 2. 不正検知フラグテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS fraud_flags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    flag_type TEXT NOT NULL, -- 'duplicate_ip', 'rapid_registration', 'suspicious_pattern'
    severity TEXT DEFAULT 'low', -- 'low', 'medium', 'high'
    details JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_fraud_flags_user_id ON fraud_flags(user_id);
CREATE INDEX idx_fraud_flags_resolved ON fraud_flags(resolved);

-- ========================================
-- 3. 不正検知関数
-- ========================================

-- 同一IPからの複数登録をチェック
CREATE OR REPLACE FUNCTION check_duplicate_ip(p_ip_address TEXT, p_hours INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT user_id)
    INTO v_count
    FROM access_logs
    WHERE ip_address = p_ip_address
    AND action_type = 'registration'
    AND created_at > NOW() - INTERVAL '1 hour' * p_hours;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 短期間での大量紹介をチェック
CREATE OR REPLACE FUNCTION check_rapid_referrals(p_user_id UUID, p_hours INTEGER DEFAULT 1)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM invitations
    WHERE inviter_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 hour' * p_hours;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 不審なパターンをチェック（例：すべての紹介者が同じ情報を持つ）
CREATE OR REPLACE FUNCTION check_suspicious_patterns(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_suspicious BOOLEAN DEFAULT FALSE;
    v_same_phone_count INTEGER;
    v_similar_email_count INTEGER;
BEGIN
    -- 同じ電話番号を持つ紹介者をチェック
    SELECT COUNT(DISTINCT i.invitee_id)
    INTO v_same_phone_count
    FROM invitations i
    JOIN profiles p1 ON i.inviter_id = p1.id
    JOIN profiles p2 ON i.invitee_id = p2.id
    WHERE i.inviter_id = p_user_id
    AND p1.phone = p2.phone
    AND p1.phone IS NOT NULL;
    
    -- 似たようなメールアドレスパターンをチェック
    SELECT COUNT(DISTINCT i.invitee_id)
    INTO v_similar_email_count
    FROM invitations i
    JOIN profiles p ON i.invitee_id = p.id
    WHERE i.inviter_id = p_user_id
    AND p.email SIMILAR TO '%[0-9]{3,}@%'; -- 数字が3つ以上含まれるメール
    
    IF v_same_phone_count > 2 OR v_similar_email_count > 5 THEN
        v_suspicious := TRUE;
    END IF;
    
    RETURN v_suspicious;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. 自動不正検知トリガー
-- ========================================

-- 登録時の不正検知
CREATE OR REPLACE FUNCTION detect_registration_fraud()
RETURNS TRIGGER AS $$
DECLARE
    v_ip_count INTEGER;
    v_user_agent TEXT;
    v_ip_address TEXT;
BEGIN
    -- メタデータからIP情報を取得（実際の実装では、アプリケーション側で設定）
    v_ip_address := NEW.raw_user_meta_data->>'ip_address';
    v_user_agent := NEW.raw_user_meta_data->>'user_agent';
    
    IF v_ip_address IS NOT NULL THEN
        -- アクセスログに記録
        INSERT INTO access_logs (user_id, action_type, ip_address, user_agent)
        VALUES (NEW.id, 'registration', v_ip_address, v_user_agent);
        
        -- 同一IPからの登録をチェック
        v_ip_count := check_duplicate_ip(v_ip_address, 24);
        
        IF v_ip_count > 3 THEN
            -- 不正フラグを立てる
            INSERT INTO fraud_flags (user_id, flag_type, severity, details)
            VALUES (
                NEW.id,
                'duplicate_ip',
                CASE
                    WHEN v_ip_count > 10 THEN 'high'
                    WHEN v_ip_count > 5 THEN 'medium'
                    ELSE 'low'
                END,
                jsonb_build_object(
                    'ip_address', v_ip_address,
                    'registration_count', v_ip_count
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成
CREATE TRIGGER check_registration_fraud
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION detect_registration_fraud();

-- 紹介作成時の不正検知
CREATE OR REPLACE FUNCTION detect_referral_fraud()
RETURNS TRIGGER AS $$
DECLARE
    v_rapid_count INTEGER;
    v_suspicious BOOLEAN;
BEGIN
    -- 短期間での大量紹介をチェック
    v_rapid_count := check_rapid_referrals(NEW.inviter_id, 1);
    
    IF v_rapid_count > 5 THEN
        INSERT INTO fraud_flags (user_id, flag_type, severity, details)
        VALUES (
            NEW.inviter_id,
            'rapid_registration',
            'medium',
            jsonb_build_object(
                'referral_count_last_hour', v_rapid_count
            )
        );
    END IF;
    
    -- 不審なパターンをチェック
    v_suspicious := check_suspicious_patterns(NEW.inviter_id);
    
    IF v_suspicious THEN
        INSERT INTO fraud_flags (user_id, flag_type, severity, details)
        VALUES (
            NEW.inviter_id,
            'suspicious_pattern',
            'high',
            jsonb_build_object(
                'pattern_type', 'similar_invitee_data'
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成
CREATE TRIGGER check_referral_fraud
AFTER INSERT ON invitations
FOR EACH ROW
EXECUTE FUNCTION detect_referral_fraud();

-- ========================================
-- 5. 管理者向けビュー
-- ========================================

-- 不正の可能性があるユーザー一覧
CREATE OR REPLACE VIEW suspicious_users AS
SELECT 
    u.id,
    u.email,
    p.name,
    p.company,
    COUNT(DISTINCT ff.id) as flag_count,
    MAX(ff.severity) as max_severity,
    ARRAY_AGG(DISTINCT ff.flag_type) as flag_types,
    MAX(ff.created_at) as last_flag_date
FROM auth.users u
JOIN profiles p ON u.id = p.id
JOIN fraud_flags ff ON u.id = ff.user_id
WHERE ff.resolved = FALSE
GROUP BY u.id, u.email, p.name, p.company
ORDER BY flag_count DESC, max_severity DESC;

-- IP別登録統計
CREATE OR REPLACE VIEW ip_registration_stats AS
SELECT 
    ip_address,
    COUNT(DISTINCT user_id) as user_count,
    MIN(created_at) as first_registration,
    MAX(created_at) as last_registration,
    ARRAY_AGG(DISTINCT user_id ORDER BY created_at) as user_ids
FROM access_logs
WHERE action_type = 'registration'
AND created_at > NOW() - INTERVAL '30 days'
GROUP BY ip_address
HAVING COUNT(DISTINCT user_id) > 1
ORDER BY user_count DESC;

-- ========================================
-- 6. RLSポリシー
-- ========================================

-- アクセスログは管理者のみ閲覧可能
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all access logs" ON access_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = TRUE
        )
    );

-- 不正フラグは管理者のみ閲覧・更新可能
ALTER TABLE fraud_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage fraud flags" ON fraud_flags
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = TRUE
        )
    );

-- ユーザーは自分のフラグのみ閲覧可能
CREATE POLICY "Users can view own fraud flags" ON fraud_flags
    FOR SELECT
    USING (user_id = auth.uid());

-- ========================================
-- 7. 定期クリーンアップ関数
-- ========================================

-- 古いアクセスログをクリーンアップ
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM access_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- 解決済みの古いフラグをクリーンアップ
CREATE OR REPLACE FUNCTION cleanup_resolved_flags()
RETURNS void AS $$
BEGIN
    DELETE FROM fraud_flags
    WHERE resolved = TRUE
    AND resolved_at < NOW() - INTERVAL '180 days';
END;
$$ LANGUAGE plpgsql;