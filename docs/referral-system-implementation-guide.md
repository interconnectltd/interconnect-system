# INTERCONNECT 紹介システム実装ガイド
## 既存システム統合版 - 完全実装仕様書

## 目次
1. [概要](#概要)
2. [既存システムとの統合方針](#既存システムとの統合方針)
3. [データベース実装](#データベース実装)
4. [バックエンド実装](#バックエンド実装)
5. [フロントエンド実装](#フロントエンド実装)
6. [セキュリティ実装](#セキュリティ実装)
7. [運用・監視](#運用監視)

---

## 概要

### システム要件
- **目的**: ユーザーが紹介した新規ユーザーがtl:dv面談を完了したら1,000円相当のポイントを付与
- **既存システム活用**: invitations, invite_links, user_points, point_transactionsテーブルを拡張
- **新規テーブル**: 最小限の追加のみ（referral_details, cashout_requests）

### 技術スタック
- **バックエンド**: Supabase (PostgreSQL, Edge Functions, Auth)
- **フロントエンド**: HTML/CSS/JavaScript (既存システムに準拠)
- **通知**: 既存のnotifications, LINE連携を活用

---

## 既存システムとの統合方針

### 1. 既存テーブルの活用
```sql
-- 既存テーブルとその役割
-- invitations: 招待管理（紹介機能のベース）
-- invite_links: 招待リンク管理
-- user_points: ポイント残高管理
-- point_transactions: ポイント履歴
-- meeting_minutes: tl:dv面談記録
-- notifications: 通知システム
-- line_auth_details: LINE連携
```

### 2. 拡張方針
- 既存テーブルにカラムを追加して機能拡張
- 新規APIは既存のAPIパターンに準拠
- UIは既存のデザインシステムを踏襲

---

## データベース実装

### 1. 既存テーブルの拡張

```sql
-- ========================================
-- 1. invitationsテーブルの拡張
-- ========================================
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

-- ========================================
-- 2. invite_linksテーブルの拡張
-- ========================================
ALTER TABLE public.invite_links 
ADD COLUMN IF NOT EXISTS registration_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_rewards_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS campaign_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_invite_links_stats 
ON public.invite_links(created_by, is_active, created_at DESC);

-- ========================================
-- 3. user_pointsテーブルの確認と調整
-- ========================================
-- 既存構造を確認し、必要に応じて以下を追加
ALTER TABLE public.user_points 
ADD COLUMN IF NOT EXISTS referral_points_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_points_spent INTEGER DEFAULT 0;

-- ========================================
-- 4. meeting_minutesテーブルの拡張
-- ========================================
ALTER TABLE public.meeting_minutes 
ADD COLUMN IF NOT EXISTS referral_processed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS referral_invitation_id UUID REFERENCES public.invitations(id);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_referral 
ON public.meeting_minutes(referral_processed, created_at) 
WHERE referral_processed = false;
```

### 2. 新規テーブルの作成

```sql
-- ========================================
-- 1. 紹介詳細テーブル
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
-- 2. キャッシュアウト申請テーブル
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
    /* 例:
    {
        "bank_name": "三菱UFJ銀行",
        "branch_name": "渋谷支店",
        "account_type": "普通",
        "account_number": "1234567",
        "account_holder": "山田太郎"
    }
    */
    
    -- 税務情報
    tax_info JSONB DEFAULT '{}',
    /* 例:
    {
        "withholding_rate": 0.1021,
        "has_tax_certificate": false,
        "mynumber_submitted": false
    }
    */
    
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
-- 3. 不正検知ルールテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS public.fraud_detection_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_name VARCHAR(100) UNIQUE NOT NULL,
    rule_type VARCHAR(50) NOT NULL
        CHECK (rule_type IN ('device', 'network', 'behavior', 'timing', 'pattern')),
    
    -- ルール条件
    conditions JSONB NOT NULL,
    /* 例:
    {
        "type": "same_device",
        "threshold": 3,
        "time_window": "24 hours",
        "severity": "high"
    }
    */
    
    -- アクション
    action VARCHAR(50) NOT NULL
        CHECK (action IN ('flag', 'block', 'review', 'notify')),
    score_impact DECIMAL(3, 2) DEFAULT 0.1,
    
    -- 有効性
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100,
    
    -- メタデータ
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- デフォルトルールの挿入
INSERT INTO public.fraud_detection_rules (rule_name, rule_type, conditions, action, score_impact, description) VALUES
('same_device_multiple_accounts', 'device', 
 '{"type": "same_device", "threshold": 3, "time_window": "7 days"}', 
 'flag', 0.3, '同一デバイスから複数アカウント作成'),
('rapid_invitations', 'timing', 
 '{"type": "invitation_rate", "threshold": 10, "time_window": "1 hour"}', 
 'review', 0.2, '短時間での大量招待'),
('same_ip_registration', 'network', 
 '{"type": "same_ip", "threshold": 5, "time_window": "24 hours"}', 
 'flag', 0.25, '同一IPからの複数登録'),
('immediate_meeting_completion', 'timing', 
 '{"type": "meeting_speed", "threshold": "30 minutes", "after": "registration"}', 
 'review', 0.4, '登録後即座の面談完了');

-- ========================================
-- 4. 監査ログテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS public.referral_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    actor_id UUID REFERENCES auth.users(id),
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    
    -- 変更内容
    old_value JSONB,
    new_value JSONB,
    change_reason TEXT,
    
    -- コンテキスト情報
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_referral_audit_logs_target 
ON public.referral_audit_logs(target_type, target_id, created_at DESC);

CREATE INDEX idx_referral_audit_logs_actor 
ON public.referral_audit_logs(actor_id, created_at DESC);
```

### 3. トリガー関数の実装

```sql
-- ========================================
-- 1. meeting_minutes挿入時の紹介報酬処理
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
        -- 不正スコアを計算
        SELECT calculate_referral_fraud_score(v_invitation.inviter_id, v_user_id) 
        INTO v_fraud_score;
        
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
            PERFORM send_referral_completion_notification(
                v_invitation.inviter_id, 
                v_user_id, 
                v_invitation.reward_points
            );
            
            -- 監査ログ
            INSERT INTO referral_audit_logs (
                action_type, actor_id, target_type, target_id, new_value
            ) VALUES (
                'auto_approve_referral', NULL, 'invitation', v_invitation.id,
                jsonb_build_object(
                    'fraud_score', v_fraud_score,
                    'reward_points', v_invitation.reward_points
                )
            );
        ELSE
            -- 高リスクの場合は手動レビュー待ち
            UPDATE referral_details
            SET verification_status = 'pending',
                fraud_reasons = get_fraud_reasons(v_invitation.inviter_id, v_user_id)
            WHERE id = v_referral_detail_id;
            
            -- 管理者に通知
            PERFORM notify_admin_high_risk_referral(v_referral_detail_id, v_fraud_score);
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
-- 2. 不正スコア計算関数
-- ========================================
CREATE OR REPLACE FUNCTION calculate_referral_fraud_score(
    p_referrer_id UUID,
    p_referred_id UUID
) RETURNS DECIMAL(3, 2) AS $$
DECLARE
    v_score DECIMAL(3, 2) := 0.00;
    v_same_ip_count INTEGER;
    v_device_match_count INTEGER;
    v_rapid_invite_count INTEGER;
    v_registration_speed INTERVAL;
BEGIN
    -- 同一IPチェック
    SELECT COUNT(*) INTO v_same_ip_count
    FROM (
        SELECT DISTINCT ua1.ip_address
        FROM user_activities ua1
        WHERE ua1.user_id = p_referrer_id
        AND ua1.created_at > NOW() - INTERVAL '7 days'
        INTERSECT
        SELECT DISTINCT ua2.ip_address
        FROM user_activities ua2
        WHERE ua2.user_id = p_referred_id
    ) AS same_ips;
    
    IF v_same_ip_count > 0 THEN
        v_score := v_score + 0.3;
    END IF;
    
    -- デバイスIDチェック
    SELECT COUNT(*) INTO v_device_match_count
    FROM (
        SELECT jsonb_array_elements_text(ua1.metadata->'device_ids') AS device_id
        FROM user_activities ua1
        WHERE ua1.user_id = p_referrer_id
        AND ua1.created_at > NOW() - INTERVAL '30 days'
        INTERSECT
        SELECT jsonb_array_elements_text(ua2.metadata->'device_ids') AS device_id
        FROM user_activities ua2
        WHERE ua2.user_id = p_referred_id
    ) AS same_devices;
    
    IF v_device_match_count > 0 THEN
        v_score := v_score + 0.4;
    END IF;
    
    -- 短時間での大量招待チェック
    SELECT COUNT(*) INTO v_rapid_invite_count
    FROM invitations
    WHERE inviter_id = p_referrer_id
    AND created_at > NOW() - INTERVAL '1 hour';
    
    IF v_rapid_invite_count > 5 THEN
        v_score := v_score + 0.2;
    END IF;
    
    -- 登録から面談までの速度チェック
    SELECT age(NOW(), u.created_at) INTO v_registration_speed
    FROM auth.users u
    WHERE u.id = p_referred_id;
    
    IF v_registration_speed < INTERVAL '30 minutes' THEN
        v_score := v_score + 0.3;
    END IF;
    
    -- スコアを0-1の範囲に正規化
    IF v_score > 1.00 THEN
        v_score := 1.00;
    END IF;
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 3. 通知送信関数
-- ========================================
CREATE OR REPLACE FUNCTION send_referral_completion_notification(
    p_referrer_id UUID,
    p_referred_id UUID,
    p_points INTEGER
) RETURNS VOID AS $$
DECLARE
    v_referred_name TEXT;
BEGIN
    -- 紹介された人の名前を取得
    SELECT name INTO v_referred_name
    FROM profiles
    WHERE id = p_referred_id;
    
    -- 通知を作成
    INSERT INTO notifications (
        user_id, type, category, title, content,
        icon, priority, action_url, metadata
    ) VALUES (
        p_referrer_id,
        'referral_completed',
        'reward',
        '紹介が成立しました！',
        format('%s様の紹介が成立し、%sポイントを獲得しました', 
            COALESCE(v_referred_name, 'ゲスト'), p_points),
        'fa-gift',
        'high',
        '/dashboard/points',
        jsonb_build_object(
            'referred_id', p_referred_id,
            'points', p_points,
            'timestamp', NOW()
        )
    );
    
    -- LINE通知も送信（LINE連携している場合）
    PERFORM send_line_referral_notification(p_referrer_id, v_referred_name, p_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. RLSポリシー

```sql
-- ========================================
-- referral_details テーブルのRLS
-- ========================================
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

-- ========================================
-- cashout_requests テーブルのRLS
-- ========================================
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
```

---

## バックエンド実装

### 1. Supabase Edge Functions

#### 招待リンク作成API

```typescript
// supabase/functions/create-referral-link/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 認証確認
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { description, max_uses, campaign_code } = await req.json()

    // 一意のコードを生成
    const generateUniqueCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let code = ''
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return code
    }

    let linkCode: string
    let attempts = 0
    
    // 一意のコードを見つけるまでリトライ
    while (attempts < 10) {
      linkCode = generateUniqueCode()
      const { data: existing } = await supabaseClient
        .from('invite_links')
        .select('id')
        .eq('link_code', linkCode)
        .single()
      
      if (!existing) break
      attempts++
    }

    if (attempts >= 10) {
      throw new Error('Failed to generate unique code')
    }

    // invite_links レコードを作成
    const { data: inviteLink, error: linkError } = await supabaseClient
      .from('invite_links')
      .insert({
        created_by: user.id,
        link_code: linkCode!,
        description: description || '紹介リンク',
        max_uses: max_uses || null,
        is_active: true,
        metadata: {
          campaign_code: campaign_code || null,
          created_via: 'referral_system'
        }
      })
      .select()
      .single()

    if (linkError) throw linkError

    // レスポンス
    const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://interconnect.jp'
    const response = {
      success: true,
      data: {
        ...inviteLink,
        url: `${baseUrl}/invite/${inviteLink.link_code}`,
        share_text: `INTERCONNECTに参加しませんか？私の紹介リンクから登録できます: ${baseUrl}/invite/${inviteLink.link_code}`
      }
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

#### キャッシュアウト申請API

```typescript
// supabase/functions/request-cashout/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { points, bank_details } = await req.json()

    // 入力検証
    if (!points || points < 3000) {
      return new Response(JSON.stringify({ 
        error: '最低3,000ポイントから交換可能です' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 必須銀行情報の検証
    const requiredBankFields = ['bank_name', 'branch_name', 'account_type', 'account_number', 'account_holder']
    for (const field of requiredBankFields) {
      if (!bank_details[field]) {
        return new Response(JSON.stringify({ 
          error: `${field}は必須項目です` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // ポイント残高確認
    const { data: userPoints, error: pointsError } = await supabaseClient
      .from('user_points')
      .select('available_points')
      .eq('user_id', user.id)
      .single()

    if (pointsError || !userPoints) {
      return new Response(JSON.stringify({ 
        error: 'ポイント残高の確認に失敗しました' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (userPoints.available_points < points) {
      return new Response(JSON.stringify({ 
        error: 'ポイント残高が不足しています',
        available: userPoints.available_points,
        requested: points
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 申請番号を生成
    const generateRequestNumber = () => {
      const date = new Date()
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      return `CO${year}${month}${random}`
    }

    // 税金計算（源泉徴収10.21%）
    const withholding_rate = 0.1021
    const tax_amount = Math.floor(points * withholding_rate)
    const net_amount = points - tax_amount

    // トランザクション開始
    const { data: cashoutRequest, error: cashoutError } = await supabaseClient
      .from('cashout_requests')
      .insert({
        user_id: user.id,
        request_number: generateRequestNumber(),
        points_amount: points,
        cash_amount: points, // 1ポイント = 1円
        tax_amount: tax_amount,
        net_amount: net_amount,
        bank_details: bank_details,
        tax_info: {
          withholding_rate: withholding_rate,
          calculation_date: new Date().toISOString()
        },
        status: 'pending'
      })
      .select()
      .single()

    if (cashoutError) throw cashoutError

    // ポイント履歴に記録
    const { error: transactionError } = await supabaseClient
      .from('point_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'withdrawn',
        points: -points,
        reason: `キャッシュアウト申請: ${cashoutRequest.request_number}`,
        related_id: cashoutRequest.id,
        related_type: 'cashout'
      })

    if (transactionError) {
      // ロールバック的な処理（cashout_requestsを削除）
      await supabaseClient
        .from('cashout_requests')
        .delete()
        .eq('id', cashoutRequest.id)
      
      throw transactionError
    }

    // ポイント残高を更新
    const { error: updateError } = await supabaseClient
      .from('user_points')
      .update({
        available_points: userPoints.available_points - points,
        referral_points_spent: supabaseClient.raw('referral_points_spent + ?', [points]),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateError) {
      // ロールバック処理
      await supabaseClient
        .from('cashout_requests')
        .delete()
        .eq('id', cashoutRequest.id)
      
      await supabaseClient
        .from('point_transactions')
        .delete()
        .eq('related_id', cashoutRequest.id)
        .eq('related_type', 'cashout')
      
      throw updateError
    }

    // 管理者に通知
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'cashout_requested',
        category: 'admin',
        title: '新しいキャッシュアウト申請',
        content: `${cashoutRequest.request_number}: ${points}ポイント`,
        priority: 'high',
        action_url: '/admin/cashouts',
        metadata: {
          request_id: cashoutRequest.id,
          amount: points
        }
      })

    // レスポンス
    return new Response(JSON.stringify({
      success: true,
      data: {
        request_id: cashoutRequest.id,
        request_number: cashoutRequest.request_number,
        points_amount: points,
        tax_amount: tax_amount,
        net_amount: net_amount,
        status: 'pending',
        message: '申請を受け付けました。3-5営業日以内に処理されます。'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

#### 紹介統計API

```typescript
// supabase/functions/get-referral-stats/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 紹介リンク統計
    const { data: linkStats } = await supabaseClient
      .from('invite_links')
      .select('registration_count, completion_count, total_rewards_earned')
      .eq('created_by', user.id)
      .eq('is_active', true)

    const totalRegistrations = linkStats?.reduce((sum, link) => sum + (link.registration_count || 0), 0) || 0
    const totalCompletions = linkStats?.reduce((sum, link) => sum + (link.completion_count || 0), 0) || 0
    const totalRewardsEarned = linkStats?.reduce((sum, link) => sum + (link.total_rewards_earned || 0), 0) || 0

    // ポイント残高
    const { data: pointBalance } = await supabaseClient
      .from('user_points')
      .select('available_points, referral_points_earned, referral_points_spent')
      .eq('user_id', user.id)
      .single()

    // 最近の紹介
    const { data: recentReferrals } = await supabaseClient
      .from('invitations')
      .select(`
        id,
        invitee_email,
        status,
        reward_status,
        reward_points,
        created_at,
        accepted_at,
        reward_earned_at
      `)
      .eq('inviter_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // 月別統計
    const { data: monthlyStats } = await supabaseClient
      .rpc('get_monthly_referral_stats', { p_user_id: user.id })

    // キャッシュアウト履歴
    const { data: cashoutHistory } = await supabaseClient
      .from('cashout_requests')
      .select('request_number, points_amount, net_amount, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    return new Response(JSON.stringify({
      success: true,
      data: {
        summary: {
          total_registrations: totalRegistrations,
          total_completions: totalCompletions,
          conversion_rate: totalRegistrations > 0 ? (totalCompletions / totalRegistrations * 100).toFixed(1) : 0,
          total_rewards_earned: totalRewardsEarned,
          available_points: pointBalance?.available_points || 0,
          lifetime_earned: pointBalance?.referral_points_earned || 0,
          lifetime_spent: pointBalance?.referral_points_spent || 0
        },
        recent_referrals: recentReferrals || [],
        monthly_stats: monthlyStats || [],
        cashout_history: cashoutHistory || [],
        can_cashout: (pointBalance?.available_points || 0) >= 3000
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

---

## フロントエンド実装

### 1. 紹介管理画面

```html
<!-- referral-dashboard.html -->
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>紹介プログラム - INTERCONNECT</title>
    <link rel="stylesheet" href="css/common.css">
    <link rel="stylesheet" href="css/referral.css">
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <header class="dashboard-header">
            <h1>紹介プログラム</h1>
            <p class="subtitle">友達を紹介して、1,000ポイントを獲得しよう</p>
        </header>

        <!-- ポイント概要 -->
        <section class="points-summary card">
            <div class="points-grid">
                <div class="point-item">
                    <span class="label">利用可能ポイント</span>
                    <span class="value" id="available-points">0</span>
                    <span class="unit">pt</span>
                </div>
                <div class="point-item">
                    <span class="label">累計獲得</span>
                    <span class="value" id="total-earned">0</span>
                    <span class="unit">pt</span>
                </div>
                <div class="point-item">
                    <span class="label">紹介人数</span>
                    <span class="value" id="referral-count">0</span>
                    <span class="unit">人</span>
                </div>
                <div class="point-item">
                    <span class="label">成約率</span>
                    <span class="value" id="conversion-rate">0</span>
                    <span class="unit">%</span>
                </div>
            </div>
            <button id="cashout-btn" class="cashout-button" disabled>
                ポイントを現金化する（最低3,000pt）
            </button>
        </section>

        <!-- 紹介リンク管理 -->
        <section class="referral-links card">
            <h2>紹介リンク</h2>
            <div class="link-create-form">
                <input type="text" id="link-description" placeholder="リンクの説明（例：Twitter用）">
                <button id="create-link-btn" class="primary-button">
                    新しいリンクを作成
                </button>
            </div>
            
            <div id="links-list" class="links-list">
                <!-- 動的に生成 -->
            </div>
        </section>

        <!-- 紹介履歴 -->
        <section class="referral-history card">
            <h2>最近の紹介</h2>
            <div class="history-filters">
                <select id="status-filter">
                    <option value="all">すべて</option>
                    <option value="pending">招待中</option>
                    <option value="accepted">登録済み</option>
                    <option value="earned">報酬獲得</option>
                </select>
            </div>
            <div id="referrals-list" class="referrals-list">
                <!-- 動的に生成 -->
            </div>
        </section>

        <!-- キャッシュアウト履歴 -->
        <section class="cashout-history card">
            <h2>キャッシュアウト履歴</h2>
            <div id="cashout-list" class="cashout-list">
                <!-- 動的に生成 -->
            </div>
        </section>
    </div>

    <!-- キャッシュアウトモーダル -->
    <div id="cashout-modal" class="modal">
        <div class="modal-content">
            <h3>ポイントを現金化</h3>
            <form id="cashout-form">
                <div class="form-group">
                    <label>交換ポイント数</label>
                    <input type="number" id="cashout-points" min="3000" step="100" required>
                    <span class="help-text">最低3,000ポイントから、100ポイント単位で交換できます</span>
                </div>
                
                <div class="form-group">
                    <label>振込先情報</label>
                    <input type="text" id="bank-name" placeholder="銀行名" required>
                    <input type="text" id="branch-name" placeholder="支店名" required>
                    <select id="account-type" required>
                        <option value="">口座種別を選択</option>
                        <option value="普通">普通</option>
                        <option value="当座">当座</option>
                    </select>
                    <input type="text" id="account-number" placeholder="口座番号" pattern="[0-9]{7}" required>
                    <input type="text" id="account-holder" placeholder="口座名義（カタカナ）" required>
                </div>
                
                <div class="tax-info">
                    <p>※ 源泉徴収税（10.21%）が差し引かれます</p>
                    <div id="cashout-calculation">
                        <!-- 動的に計算結果を表示 -->
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="submit" class="primary-button">申請する</button>
                    <button type="button" class="secondary-button" onclick="closeCashoutModal()">
                        キャンセル
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script type="module" src="js/referral-dashboard.js"></script>
</body>
</html>
```

### 2. JavaScript実装

```javascript
// js/referral-dashboard.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

class ReferralDashboard {
    constructor() {
        this.supabase = createClient(
            'YOUR_SUPABASE_URL',
            'YOUR_SUPABASE_ANON_KEY'
        )
        this.user = null
        this.stats = null
        this.init()
    }

    async init() {
        // 認証確認
        const { data: { user } } = await this.supabase.auth.getUser()
        if (!user) {
            window.location.href = '/login'
            return
        }
        this.user = user

        // イベントリスナー設定
        this.setupEventListeners()

        // データ読み込み
        await this.loadStats()
        await this.loadReferralLinks()
        await this.loadReferralHistory()
        await this.loadCashoutHistory()

        // リアルタイム更新設定
        this.setupRealtimeSubscriptions()
    }

    setupEventListeners() {
        // リンク作成
        document.getElementById('create-link-btn').addEventListener('click', () => {
            this.createReferralLink()
        })

        // キャッシュアウト
        document.getElementById('cashout-btn').addEventListener('click', () => {
            this.openCashoutModal()
        })

        // キャッシュアウトフォーム
        document.getElementById('cashout-form').addEventListener('submit', (e) => {
            e.preventDefault()
            this.submitCashout()
        })

        // ポイント数変更時の計算
        document.getElementById('cashout-points').addEventListener('input', (e) => {
            this.calculateCashout(e.target.value)
        })

        // ステータスフィルター
        document.getElementById('status-filter').addEventListener('change', () => {
            this.loadReferralHistory()
        })
    }

    async loadStats() {
        try {
            const response = await fetch('/api/get-referral-stats', {
                headers: {
                    'Authorization': `Bearer ${this.supabase.auth.session()?.access_token}`
                }
            })
            
            const { data } = await response.json()
            this.stats = data

            // UI更新
            document.getElementById('available-points').textContent = 
                data.summary.available_points.toLocaleString()
            document.getElementById('total-earned').textContent = 
                data.summary.lifetime_earned.toLocaleString()
            document.getElementById('referral-count').textContent = 
                data.summary.total_completions
            document.getElementById('conversion-rate').textContent = 
                data.summary.conversion_rate

            // キャッシュアウトボタンの有効化
            const cashoutBtn = document.getElementById('cashout-btn')
            if (data.can_cashout) {
                cashoutBtn.disabled = false
                cashoutBtn.classList.add('enabled')
            }
        } catch (error) {
            console.error('統計の読み込みエラー:', error)
            this.showNotification('統計の読み込みに失敗しました', 'error')
        }
    }

    async loadReferralLinks() {
        try {
            const { data: links, error } = await this.supabase
                .from('invite_links')
                .select('*')
                .eq('created_by', this.user.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false })

            if (error) throw error

            const linksList = document.getElementById('links-list')
            linksList.innerHTML = links.map(link => this.renderLinkItem(link)).join('')
        } catch (error) {
            console.error('リンク読み込みエラー:', error)
        }
    }

    renderLinkItem(link) {
        const url = `${window.location.origin}/invite/${link.link_code}`
        return `
            <div class="link-item" data-link-id="${link.id}">
                <div class="link-info">
                    <p class="link-description">${link.description || '紹介リンク'}</p>
                    <p class="link-stats">
                        登録: ${link.registration_count || 0}人 / 
                        完了: ${link.completion_count || 0}人
                    </p>
                </div>
                <div class="link-url">
                    <input type="text" value="${url}" readonly>
                    <button onclick="copyLink('${url}')" class="copy-button">
                        <i class="fa fa-copy"></i>
                    </button>
                </div>
                <div class="link-actions">
                    <button onclick="shareLink('${url}', '${link.description}')" 
                            class="share-button">
                        共有
                    </button>
                    <button onclick="generateQR('${url}')" class="qr-button">
                        QR
                    </button>
                </div>
            </div>
        `
    }

    async createReferralLink() {
        const description = document.getElementById('link-description').value

        try {
            const response = await fetch('/api/create-referral-link', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.supabase.auth.session()?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ description })
            })

            const result = await response.json()
            
            if (result.success) {
                this.showNotification('リンクを作成しました', 'success')
                document.getElementById('link-description').value = ''
                await this.loadReferralLinks()
            } else {
                throw new Error(result.error)
            }
        } catch (error) {
            this.showNotification('リンクの作成に失敗しました', 'error')
        }
    }

    async loadReferralHistory() {
        const filter = document.getElementById('status-filter').value

        try {
            let query = this.supabase
                .from('invitations')
                .select(`
                    *,
                    profiles!invitee_email(name, company)
                `)
                .eq('inviter_id', this.user.id)
                .order('created_at', { ascending: false })
                .limit(20)

            if (filter !== 'all') {
                if (filter === 'earned') {
                    query = query.eq('reward_status', 'earned')
                } else if (filter === 'pending') {
                    query = query.eq('status', 'pending')
                } else if (filter === 'accepted') {
                    query = query.eq('status', 'accepted').eq('reward_status', 'pending')
                }
            }

            const { data: referrals, error } = await query

            if (error) throw error

            const referralsList = document.getElementById('referrals-list')
            referralsList.innerHTML = referrals.map(ref => this.renderReferralItem(ref)).join('')
        } catch (error) {
            console.error('紹介履歴の読み込みエラー:', error)
        }
    }

    renderReferralItem(referral) {
        const statusClass = this.getReferralStatusClass(referral)
        const statusText = this.getReferralStatusText(referral)
        
        return `
            <div class="referral-item ${statusClass}">
                <div class="referral-info">
                    <p class="referral-email">${this.maskEmail(referral.invitee_email)}</p>
                    <p class="referral-date">${this.formatDate(referral.created_at)}</p>
                </div>
                <div class="referral-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    ${referral.reward_status === 'earned' ? 
                        `<span class="reward-amount">+${referral.reward_points}pt</span>` : 
                        ''}
                </div>
            </div>
        `
    }

    getReferralStatusClass(referral) {
        if (referral.reward_status === 'earned') return 'status-earned'
        if (referral.status === 'accepted') return 'status-accepted'
        if (referral.status === 'pending') return 'status-pending'
        return 'status-cancelled'
    }

    getReferralStatusText(referral) {
        if (referral.reward_status === 'earned') return '報酬獲得'
        if (referral.status === 'accepted') return '登録済み'
        if (referral.status === 'pending') return '招待中'
        return 'キャンセル'
    }

    async loadCashoutHistory() {
        // stats APIから取得済みのデータを使用
        if (!this.stats?.cashout_history) return

        const cashoutList = document.getElementById('cashout-list')
        
        if (this.stats.cashout_history.length === 0) {
            cashoutList.innerHTML = '<p class="empty-message">キャッシュアウト履歴はありません</p>'
            return
        }

        cashoutList.innerHTML = this.stats.cashout_history.map(cashout => 
            this.renderCashoutItem(cashout)
        ).join('')
    }

    renderCashoutItem(cashout) {
        const statusClass = this.getCashoutStatusClass(cashout.status)
        const statusText = this.getCashoutStatusText(cashout.status)
        
        return `
            <div class="cashout-item">
                <div class="cashout-info">
                    <p class="cashout-number">${cashout.request_number}</p>
                    <p class="cashout-date">${this.formatDate(cashout.created_at)}</p>
                </div>
                <div class="cashout-amount">
                    <p class="points">${cashout.points_amount.toLocaleString()}pt</p>
                    <p class="net-amount">¥${cashout.net_amount.toLocaleString()}</p>
                </div>
                <div class="cashout-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
        `
    }

    getCashoutStatusClass(status) {
        const classes = {
            'pending': 'status-pending',
            'reviewing': 'status-reviewing',
            'approved': 'status-approved',
            'processing': 'status-processing',
            'completed': 'status-completed',
            'rejected': 'status-rejected',
            'cancelled': 'status-cancelled'
        }
        return classes[status] || 'status-unknown'
    }

    getCashoutStatusText(status) {
        const texts = {
            'pending': '申請中',
            'reviewing': '審査中',
            'approved': '承認済み',
            'processing': '処理中',
            'completed': '完了',
            'rejected': '却下',
            'cancelled': 'キャンセル'
        }
        return texts[status] || '不明'
    }

    openCashoutModal() {
        const modal = document.getElementById('cashout-modal')
        modal.classList.add('active')
        
        // 最大交換可能ポイントを設定
        const pointsInput = document.getElementById('cashout-points')
        pointsInput.max = this.stats.summary.available_points
        pointsInput.value = Math.min(3000, this.stats.summary.available_points)
        
        this.calculateCashout(pointsInput.value)
    }

    closeCashoutModal() {
        const modal = document.getElementById('cashout-modal')
        modal.classList.remove('active')
        document.getElementById('cashout-form').reset()
    }

    calculateCashout(points) {
        const pointsNum = parseInt(points) || 0
        const taxRate = 0.1021
        const taxAmount = Math.floor(pointsNum * taxRate)
        const netAmount = pointsNum - taxAmount

        const calculation = document.getElementById('cashout-calculation')
        calculation.innerHTML = `
            <div class="calculation-row">
                <span>交換ポイント:</span>
                <span>${pointsNum.toLocaleString()}pt</span>
            </div>
            <div class="calculation-row">
                <span>源泉徴収税 (10.21%):</span>
                <span>-${taxAmount.toLocaleString()}円</span>
            </div>
            <div class="calculation-row total">
                <span>振込金額:</span>
                <span>¥${netAmount.toLocaleString()}</span>
            </div>
        `
    }

    async submitCashout() {
        const form = document.getElementById('cashout-form')
        const formData = new FormData(form)
        
        const cashoutData = {
            points: parseInt(document.getElementById('cashout-points').value),
            bank_details: {
                bank_name: document.getElementById('bank-name').value,
                branch_name: document.getElementById('branch-name').value,
                account_type: document.getElementById('account-type').value,
                account_number: document.getElementById('account-number').value,
                account_holder: document.getElementById('account-holder').value
            }
        }

        try {
            const response = await fetch('/api/request-cashout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.supabase.auth.session()?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cashoutData)
            })

            const result = await response.json()
            
            if (result.success) {
                this.showNotification(result.data.message, 'success')
                this.closeCashoutModal()
                await this.loadStats()
                await this.loadCashoutHistory()
            } else {
                throw new Error(result.error)
            }
        } catch (error) {
            this.showNotification(error.message || 'エラーが発生しました', 'error')
        }
    }

    setupRealtimeSubscriptions() {
        // ポイント残高の更新を監視
        this.supabase
            .channel('user-points-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'user_points',
                filter: `user_id=eq.${this.user.id}`
            }, () => {
                this.loadStats()
            })
            .subscribe()

        // 招待状態の更新を監視
        this.supabase
            .channel('invitation-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'invitations',
                filter: `inviter_id=eq.${this.user.id}`
            }, () => {
                this.loadReferralHistory()
                this.loadStats()
            })
            .subscribe()
    }

    // ユーティリティメソッド
    maskEmail(email) {
        const [name, domain] = email.split('@')
        const maskedName = name.substring(0, 2) + '***'
        return `${maskedName}@${domain}`
    }

    formatDate(dateString) {
        const date = new Date(dateString)
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        })
    }

    showNotification(message, type = 'info') {
        // 既存の通知システムを使用
        const notification = document.createElement('div')
        notification.className = `notification notification-${type}`
        notification.textContent = message
        document.body.appendChild(notification)

        setTimeout(() => {
            notification.classList.add('fade-out')
            setTimeout(() => notification.remove(), 300)
        }, 3000)
    }
}

// グローバル関数（HTMLから呼び出し用）
window.copyLink = function(url) {
    navigator.clipboard.writeText(url).then(() => {
        const dashboard = window.referralDashboard
        dashboard.showNotification('リンクをコピーしました', 'success')
    })
}

window.shareLink = function(url, description) {
    const text = `INTERCONNECTに参加しませんか？私の紹介リンクから登録できます`
    
    if (navigator.share) {
        navigator.share({
            title: 'INTERCONNECT紹介',
            text: text,
            url: url
        })
    } else {
        // フォールバック: Twitterシェア
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
        window.open(twitterUrl, '_blank')
    }
}

window.generateQR = function(url) {
    // QRコード生成（別途実装）
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
    window.open(qrUrl, '_blank')
}

window.closeCashoutModal = function() {
    window.referralDashboard.closeCashoutModal()
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    window.referralDashboard = new ReferralDashboard()
})
```

### 3. CSS スタイル

```css
/* css/referral.css */
:root {
    --primary-color: #6366f1;
    --success-color: #10b981;
    --warning-color: #f59e0b;
    --danger-color: #ef4444;
    --text-primary: #1f2937;
    --text-secondary: #6b7280;
    --bg-primary: #ffffff;
    --bg-secondary: #f9fafb;
    --border-color: #e5e7eb;
}

/* ポイント概要 */
.points-summary {
    background: linear-gradient(135deg, var(--primary-color), #4f46e5);
    color: white;
    padding: 2rem;
    border-radius: 1rem;
    margin-bottom: 2rem;
}

.points-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
}

.point-item {
    text-align: center;
}

.point-item .label {
    display: block;
    font-size: 0.875rem;
    opacity: 0.9;
    margin-bottom: 0.5rem;
}

.point-item .value {
    font-size: 2rem;
    font-weight: bold;
}

.point-item .unit {
    font-size: 1rem;
    opacity: 0.9;
}

.cashout-button {
    width: 100%;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.3);
    color: white;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: not-allowed;
    transition: all 0.3s ease;
}

.cashout-button.enabled {
    background: white;
    color: var(--primary-color);
    cursor: pointer;
}

.cashout-button.enabled:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* リンク管理 */
.link-create-form {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.link-create-form input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    font-size: 1rem;
}

.links-list {
    space-y: 1rem;
}

.link-item {
    padding: 1.5rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    margin-bottom: 1rem;
}

.link-info {
    margin-bottom: 1rem;
}

.link-description {
    font-weight: 500;
    margin-bottom: 0.25rem;
}

.link-stats {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.link-url {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.link-url input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    font-family: monospace;
    font-size: 0.875rem;
    background-color: var(--bg-secondary);
}

.copy-button {
    padding: 0.5rem 1rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    cursor: pointer;
    transition: background-color 0.2s;
}

.copy-button:hover {
    background-color: var(--border-color);
}

.link-actions {
    display: flex;
    gap: 0.5rem;
}

.share-button,
.qr-button {
    flex: 1;
    padding: 0.5rem;
    background: white;
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s;
}

.share-button:hover,
.qr-button:hover {
    background-color: var(--bg-secondary);
    border-color: var(--primary-color);
    color: var(--primary-color);
}

/* 紹介履歴 */
.history-filters {
    margin-bottom: 1rem;
}

.history-filters select {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    font-size: 1rem;
}

.referral-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    margin-bottom: 0.75rem;
}

.referral-email {
    font-weight: 500;
    margin-bottom: 0.25rem;
}

.referral-date {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 500;
}

.status-pending {
    background-color: #fef3c7;
    color: #92400e;
}

.status-accepted {
    background-color: #dbeafe;
    color: #1e40af;
}

.status-earned {
    background-color: #d1fae5;
    color: #065f46;
}

.reward-amount {
    margin-left: 0.5rem;
    font-weight: bold;
    color: var(--success-color);
}

/* キャッシュアウト履歴 */
.cashout-item {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 1rem;
    align-items: center;
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    margin-bottom: 0.75rem;
}

.cashout-number {
    font-weight: 500;
    font-family: monospace;
}

.cashout-date {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.cashout-amount {
    text-align: right;
}

.points {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.net-amount {
    font-weight: bold;
    color: var(--text-primary);
}

/* モーダル */
.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    align-items: center;
    justify-content: center;
}

.modal.active {
    display: flex;
}

.modal-content {
    background: white;
    padding: 2rem;
    border-radius: 1rem;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-content h3 {
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
}

.form-group {
    margin-bottom: 1.5rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
}

.form-group input,
.form-group select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    font-size: 1rem;
    margin-bottom: 0.5rem;
}

.help-text {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.tax-info {
    background-color: var(--bg-secondary);
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
}

.tax-info p {
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.calculation-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-color);
}

.calculation-row.total {
    border-bottom: none;
    border-top: 2px solid var(--border-color);
    margin-top: 0.5rem;
    padding-top: 1rem;
    font-weight: bold;
}

.modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
}

/* ボタン共通スタイル */
.primary-button {
    padding: 0.75rem 1.5rem;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.primary-button:hover {
    background-color: #4f46e5;
    transform: translateY(-1px);
}

.secondary-button {
    padding: 0.75rem 1.5rem;
    background-color: white;
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.secondary-button:hover {
    background-color: var(--bg-secondary);
}

/* 通知 */
.notification {
    position: fixed;
    top: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    border-radius: 0.5rem;
    color: white;
    font-weight: 500;
    z-index: 2000;
    animation: slideIn 0.3s ease;
}

.notification-success {
    background-color: var(--success-color);
}

.notification-error {
    background-color: var(--danger-color);
}

.notification-info {
    background-color: var(--primary-color);
}

.notification.fade-out {
    animation: fadeOut 0.3s ease;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes fadeOut {
    to {
        opacity: 0;
        transform: translateY(-1rem);
    }
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
    .points-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
    }
    
    .cashout-item {
        grid-template-columns: 1fr;
        gap: 0.5rem;
    }
    
    .cashout-amount {
        text-align: left;
    }
    
    .link-actions {
        flex-direction: column;
    }
}

/* カード共通スタイル */
.card {
    background: white;
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-bottom: 1.5rem;
}

.card h2 {
    margin-bottom: 1rem;
    font-size: 1.25rem;
    font-weight: 600;
}

/* 空状態 */
.empty-message {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
}
```

---

## セキュリティ実装

### 1. 不正検知システム

```sql
-- 不正検知用のストアドプロシージャ
CREATE OR REPLACE FUNCTION detect_referral_fraud_patterns()
RETURNS TABLE (
    user_id UUID,
    pattern_type TEXT,
    risk_score DECIMAL,
    details JSONB
) AS $$
BEGIN
    -- 同一IPからの複数アカウント
    RETURN QUERY
    SELECT 
        ua.user_id,
        'same_ip_multiple_accounts'::TEXT,
        COUNT(DISTINCT ua2.user_id)::DECIMAL / 10.0,
        jsonb_build_object(
            'ip_address', ua.ip_address,
            'account_count', COUNT(DISTINCT ua2.user_id),
            'accounts', array_agg(DISTINCT ua2.user_id)
        )
    FROM user_activities ua
    JOIN user_activities ua2 ON ua2.ip_address = ua.ip_address
    WHERE ua.created_at > NOW() - INTERVAL '7 days'
    GROUP BY ua.user_id, ua.ip_address
    HAVING COUNT(DISTINCT ua2.user_id) > 3;

    -- 短時間での大量招待
    RETURN QUERY
    SELECT 
        i.inviter_id,
        'rapid_invitations'::TEXT,
        COUNT(*)::DECIMAL / 20.0,
        jsonb_build_object(
            'invitation_count', COUNT(*),
            'time_window', '1 hour',
            'invitation_ids', array_agg(i.id)
        )
    FROM invitations i
    WHERE i.created_at > NOW() - INTERVAL '1 hour'
    GROUP BY i.inviter_id
    HAVING COUNT(*) > 10;

    -- 自己紹介パターン
    RETURN QUERY
    SELECT 
        i.inviter_id,
        'self_referral_pattern'::TEXT,
        1.0::DECIMAL,
        jsonb_build_object(
            'matching_fields', 
            CASE 
                WHEN p1.phone = p2.phone THEN 'phone'
                WHEN p1.company = p2.company AND p1.department = p2.department THEN 'company_dept'
                ELSE 'other'
            END
        )
    FROM invitations i
    JOIN profiles p1 ON p1.id = i.inviter_id
    JOIN profiles p2 ON p2.id = i.invitee_email::uuid
    WHERE i.created_at > NOW() - INTERVAL '30 days'
    AND (
        p1.phone = p2.phone OR
        (p1.company = p2.company AND p1.department = p2.department)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 定期実行用のジョブ（pg_cronを使用する場合）
SELECT cron.schedule(
    'detect-referral-fraud',
    '*/30 * * * *', -- 30分ごと
    $$
    INSERT INTO fraud_alerts (user_id, rule_id, severity, details)
    SELECT 
        user_id,
        (SELECT id FROM fraud_detection_rules WHERE rule_name = pattern_type),
        CASE 
            WHEN risk_score > 0.8 THEN 'high'
            WHEN risk_score > 0.5 THEN 'medium'
            ELSE 'low'
        END,
        details
    FROM detect_referral_fraud_patterns()
    WHERE risk_score > 0.3;
    $$
);
```

### 2. APIレート制限

```typescript
// supabase/functions/_shared/rate-limiter.ts
export class RateLimiter {
    private static instances = new Map<string, RateLimiter>()
    private requests = new Map<string, number[]>()

    constructor(
        private windowMs: number = 60000, // 1分
        private maxRequests: number = 10
    ) {}

    static getInstance(key: string, windowMs?: number, maxRequests?: number): RateLimiter {
        if (!this.instances.has(key)) {
            this.instances.set(key, new RateLimiter(windowMs, maxRequests))
        }
        return this.instances.get(key)!
    }

    async checkLimit(identifier: string): Promise<boolean> {
        const now = Date.now()
        const requests = this.requests.get(identifier) || []
        
        // 古いリクエストを削除
        const validRequests = requests.filter(time => now - time < this.windowMs)
        
        if (validRequests.length >= this.maxRequests) {
            return false // レート制限に達した
        }
        
        validRequests.push(now)
        this.requests.set(identifier, validRequests)
        return true
    }

    getRemainingRequests(identifier: string): number {
        const now = Date.now()
        const requests = this.requests.get(identifier) || []
        const validRequests = requests.filter(time => now - time < this.windowMs)
        return Math.max(0, this.maxRequests - validRequests.length)
    }
}

// 使用例（Edge Function内）
const rateLimiter = RateLimiter.getInstance('referral-creation', 3600000, 5) // 1時間に5回まで

if (!await rateLimiter.checkLimit(user.id)) {
    return new Response(JSON.stringify({ 
        error: 'レート制限に達しました。しばらく待ってから再試行してください。',
        remaining: rateLimiter.getRemainingRequests(user.id)
    }), {
        status: 429,
        headers: corsHeaders
    })
}
```

---

## 運用・監視

### 1. 管理画面

```javascript
// js/admin-referral.js
class AdminReferralManagement {
    constructor() {
        this.initializeAdminPanel()
    }

    async initializeAdminPanel() {
        // 保留中のキャッシュアウト申請を読み込み
        await this.loadPendingCashouts()
        
        // 不正アラートを読み込み
        await this.loadFraudAlerts()
        
        // 統計ダッシュボード
        await this.loadReferralMetrics()
    }

    async loadPendingCashouts() {
        const { data: cashouts } = await supabase
            .from('cashout_requests')
            .select(`
                *,
                user:user_id (
                    id,
                    profiles!inner (name, company, email)
                ),
                point_balance:user_points!user_id (
                    available_points,
                    total_points
                )
            `)
            .in('status', ['pending', 'reviewing'])
            .order('created_at', { ascending: false })

        this.renderCashoutQueue(cashouts)
    }

    renderCashoutQueue(cashouts) {
        const container = document.getElementById('cashout-queue')
        
        container.innerHTML = cashouts.map(cashout => `
            <div class="admin-cashout-item" data-id="${cashout.id}">
                <div class="cashout-header">
                    <h4>${cashout.request_number}</h4>
                    <span class="status-badge status-${cashout.status}">
                        ${this.getStatusText(cashout.status)}
                    </span>
                </div>
                
                <div class="cashout-details">
                    <div class="user-info">
                        <p><strong>申請者:</strong> ${cashout.user.profiles.name}</p>
                        <p><strong>会社:</strong> ${cashout.user.profiles.company}</p>
                        <p><strong>メール:</strong> ${cashout.user.profiles.email}</p>
                    </div>
                    
                    <div class="amount-info">
                        <p><strong>申請ポイント:</strong> ${cashout.points_amount.toLocaleString()}pt</p>
                        <p><strong>源泉徴収:</strong> -¥${cashout.tax_amount.toLocaleString()}</p>
                        <p><strong>振込額:</strong> ¥${cashout.net_amount.toLocaleString()}</p>
                    </div>
                    
                    <div class="bank-info">
                        <p><strong>振込先:</strong></p>
                        <p>${cashout.bank_details.bank_name} ${cashout.bank_details.branch_name}</p>
                        <p>${cashout.bank_details.account_type} ${cashout.bank_details.account_number}</p>
                        <p>${cashout.bank_details.account_holder}</p>
                    </div>
                </div>
                
                <div class="fraud-check">
                    ${this.renderFraudIndicators(cashout.user_id)}
                </div>
                
                <div class="admin-actions">
                    <button onclick="approveCashout('${cashout.id}')" 
                            class="btn-approve">承認</button>
                    <button onclick="rejectCashout('${cashout.id}')" 
                            class="btn-reject">却下</button>
                    <button onclick="requestMoreInfo('${cashout.id}')" 
                            class="btn-info">追加情報要求</button>
                </div>
            </div>
        `).join('')
    }

    async approveCashout(cashoutId) {
        const reason = await this.promptReason('承認理由を入力してください')
        if (!reason) return

        try {
            // キャッシュアウトを承認
            const { error } = await supabase
                .from('cashout_requests')
                .update({
                    status: 'approved',
                    reviewed_by: this.currentUser.id,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', cashoutId)

            if (error) throw error

            // 監査ログに記録
            await supabase
                .from('referral_audit_logs')
                .insert({
                    action_type: 'cashout_approved',
                    actor_id: this.currentUser.id,
                    target_type: 'cashout_request',
                    target_id: cashoutId,
                    change_reason: reason
                })

            this.showNotification('キャッシュアウトを承認しました', 'success')
            await this.loadPendingCashouts()

        } catch (error) {
            this.showNotification('エラーが発生しました', 'error')
        }
    }

    async loadFraudAlerts() {
        const { data: alerts } = await supabase
            .from('fraud_alerts')
            .select(`
                *,
                user:user_id (
                    profiles!inner (name, email)
                ),
                rule:rule_id (rule_name, rule_type)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(20)

        this.renderFraudAlerts(alerts)
    }

    renderFraudAlerts(alerts) {
        const container = document.getElementById('fraud-alerts')
        
        const alertsByUser = {}
        alerts.forEach(alert => {
            const userId = alert.user_id
            if (!alertsByUser[userId]) {
                alertsByUser[userId] = {
                    user: alert.user,
                    alerts: []
                }
            }
            alertsByUser[userId].alerts.push(alert)
        })

        container.innerHTML = Object.entries(alertsByUser).map(([userId, data]) => `
            <div class="fraud-alert-group">
                <div class="alert-header">
                    <h4>${data.user.profiles.name}</h4>
                    <span class="risk-score">${this.calculateRiskScore(data.alerts)}</span>
                </div>
                
                <div class="alert-list">
                    ${data.alerts.map(alert => `
                        <div class="alert-item severity-${alert.severity}">
                            <span class="alert-type">${alert.rule.rule_name}</span>
                            <span class="alert-details">${this.formatAlertDetails(alert.details)}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="alert-actions">
                    <button onclick="investigateUser('${userId}')">調査</button>
                    <button onclick="blockUser('${userId}')">ブロック</button>
                    <button onclick="dismissAlerts('${userId}')">却下</button>
                </div>
            </div>
        `).join('')
    }

    async loadReferralMetrics() {
        // 各種メトリクスを取得
        const [dailyStats, fraudStats, payoutStats] = await Promise.all([
            this.getDailyReferralStats(),
            this.getFraudStats(),
            this.getPayoutStats()
        ])

        // グラフを描画
        this.renderDailyChart(dailyStats)
        this.renderFraudChart(fraudStats)
        this.renderPayoutChart(payoutStats)
    }

    async exportMonthlyReport() {
        const month = document.getElementById('report-month').value
        
        const { data, error } = await supabase
            .rpc('generate_monthly_referral_report', { 
                p_month: month 
            })

        if (error) {
            this.showNotification('レポート生成に失敗しました', 'error')
            return
        }

        // CSVとしてダウンロード
        const csv = this.convertToCSV(data)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `referral_report_${month}.csv`
        link.click()
    }
}

// グローバル関数
window.approveCashout = (id) => window.adminReferral.approveCashout(id)
window.rejectCashout = (id) => window.adminReferral.rejectCashout(id)
window.investigateUser = (id) => window.adminReferral.investigateUser(id)

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    window.adminReferral = new AdminReferralManagement()
})
```

### 2. 監視アラート設定

```sql
-- アラート用のビュー作成
CREATE OR REPLACE VIEW referral_monitoring_metrics AS
SELECT 
    -- 時間別の紹介数
    date_trunc('hour', created_at) AS hour,
    COUNT(*) AS invitation_count,
    COUNT(DISTINCT inviter_id) AS unique_inviters,
    
    -- 異常検知用メトリクス
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '10 minutes') AS recent_count,
    COUNT(DISTINCT inviter_id) FILTER (WHERE created_at > NOW() - INTERVAL '10 minutes') AS recent_unique_inviters,
    
    -- 成功率
    COUNT(*) FILTER (WHERE status = 'accepted') AS accepted_count,
    COUNT(*) FILTER (WHERE reward_status = 'earned') AS completed_count
    
FROM invitations
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- アラート生成関数
CREATE OR REPLACE FUNCTION check_referral_anomalies()
RETURNS VOID AS $$
DECLARE
    v_recent_rate DECIMAL;
    v_avg_rate DECIMAL;
    v_threshold DECIMAL := 2.0; -- 平均の2倍以上で異常とする
BEGIN
    -- 直近10分間の紹介率を計算
    SELECT COUNT(*) / 10.0 INTO v_recent_rate
    FROM invitations
    WHERE created_at > NOW() - INTERVAL '10 minutes';
    
    -- 過去7日間の平均紹介率を計算
    SELECT COUNT(*) / (7 * 24 * 6.0) INTO v_avg_rate
    FROM invitations
    WHERE created_at > NOW() - INTERVAL '7 days';
    
    -- 異常を検知したらアラートを作成
    IF v_recent_rate > v_avg_rate * v_threshold THEN
        INSERT INTO system_alerts (
            alert_type, severity, title, message, metadata
        ) VALUES (
            'referral_spike',
            'high',
            '紹介数の異常な増加を検知',
            format('直近10分間で%s件の紹介（平均の%.1f倍）', 
                v_recent_rate * 10, v_recent_rate / NULLIF(v_avg_rate, 0)),
            jsonb_build_object(
                'recent_rate', v_recent_rate,
                'average_rate', v_avg_rate,
                'threshold', v_threshold
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## 実装チェックリスト

### Phase 1: 基盤構築（3日間）
- [ ] データベーススキーマの実装
  - [ ] 既存テーブルの拡張
  - [ ] 新規テーブルの作成
  - [ ] トリガー関数の実装
  - [ ] RLSポリシーの設定
- [ ] 基本的なSupabase Edge Functionsの実装
  - [ ] 招待リンク作成API
  - [ ] 統計取得API

### Phase 2: フロントエンド実装（3日間）
- [ ] 紹介ダッシュボードの実装
  - [ ] ポイント表示
  - [ ] リンク管理
  - [ ] 紹介履歴
- [ ] 既存ページへの統合
  - [ ] ナビゲーションメニューへの追加
  - [ ] ダッシュボードウィジェット

### Phase 3: 高度な機能（3日間）
- [ ] キャッシュアウト機能
  - [ ] 申請フォーム
  - [ ] 銀行情報検証
  - [ ] 税金計算
- [ ] 不正検知システム
  - [ ] 検知ルールの実装
  - [ ] アラート機能
- [ ] 管理画面
  - [ ] キャッシュアウト承認
  - [ ] 不正調査ツール

### Phase 4: テストと最適化（2日間）
- [ ] 統合テスト
- [ ] パフォーマンス最適化
- [ ] セキュリティ監査
- [ ] ドキュメント整備

### Phase 5: 本番展開（1日間）
- [ ] 段階的ロールアウト
- [ ] 監視設定
- [ ] バックアップ確認
- [ ] サポート体制確立

---

## トラブルシューティング

### よくある問題と解決方法

1. **紹介リンクが機能しない**
   - invite_linksテーブルのis_activeを確認
   - max_usesの上限を確認
   - クッキーが正しく設定されているか確認

2. **ポイントが付与されない**
   - meeting_minutesのreferral_processedフラグを確認
   - invitationsのreward_statusを確認
   - トリガー関数のログを確認

3. **キャッシュアウトができない**
   - user_pointsのavailable_pointsを確認
   - 最低交換額（3000pt）を満たしているか確認
   - 保留中の申請がないか確認

4. **不正検知の誤検知**
   - fraud_detection_rulesの閾値を調整
   - IPアドレスの共有（オフィスなど）を考慮
   - ホワイトリスト機能の実装を検討

---

この実装ガイドは、既存のINTERCONNECTシステムと完全に統合された紹介システムを構築するための包括的な仕様書です。既存のテーブルとAPIを最大限活用し、新規追加を最小限に抑えることで、システムの複雑性を抑えながら必要な機能を実現します。