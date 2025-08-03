# 紹介機能 - 既存システムとの統合修正案

## 1. 既存テーブルとの競合・重複

### 1.1 招待機能の既存実装
すでに以下のテーブルが存在しています：
- `invitations` - 招待管理
- `invite_links` - 招待リンク
- `invite_history` - 招待履歴

**対応方針**：
- 既存の招待システムを拡張して紹介機能を実装
- 新規テーブルを作らず、既存テーブルにカラムを追加

### 1.2 ポイントシステムの活用
すでに以下のテーブルが存在：
- `user_points` - ユーザーポイント残高
- `point_transactions` - ポイント取引履歴

**対応方針**：
- キャッシュバックの代わりにポイントシステムを活用
- 1000ポイント = 1000円として管理

## 2. 修正後のデータベース設計

### 2.1 既存テーブルの拡張

```sql
-- invitationsテーブルに紹介報酬関連カラムを追加
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS
    reward_points INTEGER DEFAULT 1000,
    reward_status VARCHAR(20) DEFAULT 'pending',
    reward_earned_at TIMESTAMP WITH TIME ZONE,
    meeting_completed_at TIMESTAMP WITH TIME ZONE;

-- invite_linksテーブルに統計カラムを追加
ALTER TABLE public.invite_links ADD COLUMN IF NOT EXISTS
    registration_count INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    total_rewards_earned INTEGER DEFAULT 0;

-- user_pointsは既存のまま使用（ポイント残高管理）

-- point_transactionsで紹介報酬を記録（既存のまま使用）
```

### 2.2 新規追加テーブル（最小限）

```sql
-- 紹介の詳細情報のみ新規作成
CREATE TABLE public.referral_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invitation_id UUID REFERENCES public.invitations(id),
    referrer_id UUID REFERENCES auth.users(id),
    referred_id UUID REFERENCES auth.users(id),
    meeting_minutes_id UUID REFERENCES public.meeting_minutes(id),
    fraud_score DECIMAL(3, 2) DEFAULT 0,
    verification_status VARCHAR(20) DEFAULT 'pending',
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_referral_detail UNIQUE(invitation_id)
);

-- キャッシュアウト申請（ポイント→現金）
CREATE TABLE public.cashout_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    points_amount INTEGER NOT NULL,
    cash_amount DECIMAL(10, 2) NOT NULL,
    bank_details JSONB NOT NULL,
    tax_info JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 3. 既存システムとの連携修正

### 3.1 meeting_minutesテーブルとの連携

```sql
-- meeting_minutesテーブルの既存構造を活用
-- profile_idカラムが既に存在するので、これを使用
-- user_idではなくprofile_idで連携

CREATE OR REPLACE FUNCTION process_referral_on_meeting()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_invitation RECORD;
BEGIN
    -- profile_idからuser_idを取得
    SELECT id INTO v_user_id FROM auth.users 
    WHERE id = (SELECT id FROM profiles WHERE id = NEW.profile_id);
    
    -- 該当する招待を検索
    SELECT * INTO v_invitation FROM invitations 
    WHERE invitee_email = (SELECT email FROM profiles WHERE id = NEW.profile_id)
    AND status = 'accepted'
    AND reward_status = 'pending'
    ORDER BY accepted_at DESC
    LIMIT 1;
    
    IF v_invitation IS NOT NULL THEN
        -- 招待の報酬ステータスを更新
        UPDATE invitations 
        SET reward_status = 'earned',
            reward_earned_at = NOW(),
            meeting_completed_at = NEW.meeting_date
        WHERE id = v_invitation.id;
        
        -- ポイントを付与（既存のpoint_transactionsを使用）
        INSERT INTO point_transactions (
            user_id, transaction_type, points, reason, 
            related_id, related_type
        ) VALUES (
            v_invitation.inviter_id, 'earned', v_invitation.reward_points,
            '紹介報酬', v_invitation.id, 'invitation'
        );
        
        -- ユーザーポイント残高を更新
        UPDATE user_points 
        SET total_points = total_points + v_invitation.reward_points,
            available_points = available_points + v_invitation.reward_points,
            updated_at = NOW()
        WHERE user_id = v_invitation.inviter_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_referral_on_meeting
AFTER INSERT ON meeting_minutes
FOR EACH ROW EXECUTE FUNCTION process_referral_on_meeting();
```

### 3.2 既存の通知システムとの連携

```sql
-- notificationsテーブルを使用（system_notificationsは使わない）
CREATE OR REPLACE FUNCTION send_referral_notification(
    p_user_id UUID,
    p_referred_name TEXT,
    p_points INTEGER
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO notifications (
        user_id, type, category, title, content,
        icon, priority, action_url
    ) VALUES (
        p_user_id,
        'referral_completed',
        'reward',
        '紹介が成立しました！',
        p_referred_name || '様の紹介が成立し、' || p_points || 'ポイントを獲得しました',
        'fa-gift',
        'high',
        '/dashboard/points'
    );
END;
$$ LANGUAGE plpgsql;
```

### 3.3 既存のLINE連携の活用

```javascript
// 既存のline_auth_detailsテーブルを活用
class ReferralLineNotification {
    async sendCompletionNotification(userId, referredName, points) {
        // line_auth_detailsから情報を取得
        const { data: lineAuth } = await supabase
            .from('line_auth_details')
            .select('line_user_id')
            .eq('user_id', userId)
            .single();
        
        if (!lineAuth?.line_user_id) return;
        
        // 既存のLINE通知システムを使用
        await this.sendLineNotification(lineAuth.line_user_id, {
            type: 'referral_completed',
            data: { referredName, points }
        });
    }
}
```

## 4. APIの修正

### 4.1 招待リンク作成（既存のinvite_linksを使用）

```typescript
// supabase/functions/create-invitation-link/index.ts
serve(async (req) => {
    const { description, max_uses } = await req.json();
    
    // 既存のinvite_linksテーブルを使用
    const { data: link } = await supabase
        .from('invite_links')
        .insert({
            created_by: user.id,
            link_code: generateUniqueCode(),
            description: description || '紹介リンク',
            max_uses: max_uses || null,
            is_active: true
        })
        .select()
        .single();
    
    // 対応するinvitationレコードを作成
    const { data: invitation } = await supabase
        .from('invitations')
        .insert({
            inviter_id: user.id,
            invitation_code: link.link_code,
            status: 'pending'
        })
        .select()
        .single();
    
    return new Response(JSON.stringify({
        ...link,
        url: `${APP_URL}/invite/${link.link_code}`
    }));
});
```

### 4.2 ポイント→現金化API

```typescript
// supabase/functions/request-cashout/index.ts
serve(async (req) => {
    const { points, bank_details } = await req.json();
    
    // ユーザーのポイント残高確認
    const { data: userPoints } = await supabase
        .from('user_points')
        .select('available_points')
        .eq('user_id', user.id)
        .single();
    
    if (userPoints.available_points < points) {
        throw new Error('ポイント残高が不足しています');
    }
    
    // 最低交換ポイント（3000ポイント = 3000円）
    if (points < 3000) {
        throw new Error('最低3000ポイントから交換可能です');
    }
    
    // キャッシュアウト申請を作成
    const { data: cashout } = await supabase
        .from('cashout_requests')
        .insert({
            user_id: user.id,
            points_amount: points,
            cash_amount: points, // 1ポイント = 1円
            bank_details,
            tax_info: { rate: 0.1021 } // 源泉徴収率
        })
        .select()
        .single();
    
    // ポイントを減算
    await supabase.from('point_transactions').insert({
        user_id: user.id,
        transaction_type: 'withdrawn',
        points: -points,
        reason: 'キャッシュアウト申請',
        related_id: cashout.id,
        related_type: 'cashout'
    });
    
    // 残高を更新
    await supabase
        .from('user_points')
        .update({
            available_points: userPoints.available_points - points,
            spent_points: supabase.raw('spent_points + ?', [points])
        })
        .eq('user_id', user.id);
    
    return new Response(JSON.stringify(cashout));
});
```

## 5. フロントエンドの修正

### 5.1 ダッシュボードの統合

```javascript
// 既存のdashboard.jsに追加
class DashboardEnhanced {
    async loadReferralStats() {
        // 既存のpoint_transactionsから紹介報酬を集計
        const { data: referralPoints } = await supabase
            .from('point_transactions')
            .select('points')
            .eq('user_id', this.userId)
            .eq('transaction_type', 'earned')
            .eq('related_type', 'invitation');
        
        const totalEarned = referralPoints.reduce((sum, t) => sum + t.points, 0);
        
        // 既存のuser_pointsから現在の残高を取得
        const { data: balance } = await supabase
            .from('user_points')
            .select('available_points')
            .eq('user_id', this.userId)
            .single();
        
        this.updateReferralWidget({
            totalEarned,
            availablePoints: balance.available_points,
            canCashout: balance.available_points >= 3000
        });
    }
}
```

### 5.2 招待管理画面の修正

```html
<!-- 既存のinvite.htmlを修正 -->
<div class="invite-section">
    <h2>招待・紹介プログラム</h2>
    
    <!-- 既存の招待リンク管理 -->
    <div class="invite-links">
        <h3>あなたの招待リンク</h3>
        <div id="invite-links-list">
            <!-- 既存のinvite_linksから表示 -->
        </div>
    </div>
    
    <!-- 紹介実績（新規追加） -->
    <div class="referral-stats">
        <h3>紹介実績</h3>
        <div class="stats-grid">
            <div class="stat-card">
                <span>獲得ポイント</span>
                <span class="value" id="total-points">0</span>
            </div>
            <div class="stat-card">
                <span>紹介人数</span>
                <span class="value" id="referral-count">0</span>
            </div>
        </div>
    </div>
    
    <!-- ポイント交換 -->
    <div class="point-exchange">
        <h3>ポイント交換</h3>
        <p>現在の交換可能ポイント: <span id="available-points">0</span>pt</p>
        <button id="cashout-btn" disabled>現金に交換する（最低3000pt）</button>
    </div>
</div>
```

## 6. 不正検知の改善

```sql
-- 既存のuser_activitiesテーブルを活用した不正検知
CREATE OR REPLACE FUNCTION check_referral_fraud_pattern()
RETURNS TRIGGER AS $$
DECLARE
    v_same_ip_count INTEGER;
    v_rapid_invites INTEGER;
    v_device_match INTEGER;
BEGIN
    -- 同一IPからの招待をチェック
    SELECT COUNT(DISTINCT i.id) INTO v_same_ip_count
    FROM invitations i
    JOIN user_activities ua ON ua.user_id = i.invitee_email::uuid
    WHERE ua.ip_address = (
        SELECT ip_address FROM user_activities
        WHERE user_id = NEW.invitee_email::uuid
        ORDER BY created_at DESC LIMIT 1
    )
    AND i.created_at > NOW() - INTERVAL '24 hours';
    
    -- 短時間での大量招待
    SELECT COUNT(*) INTO v_rapid_invites
    FROM invitations
    WHERE inviter_id = NEW.inviter_id
    AND created_at > NOW() - INTERVAL '1 hour';
    
    -- デバイス情報の一致をチェック
    SELECT COUNT(*) INTO v_device_match
    FROM user_activities ua1
    JOIN user_activities ua2 ON ua1.user_agent = ua2.user_agent
    WHERE ua1.user_id = NEW.inviter_id
    AND ua2.user_id = NEW.invitee_email::uuid
    AND ua1.created_at > NOW() - INTERVAL '7 days';
    
    -- 不正スコアを計算して記録
    IF v_same_ip_count > 3 OR v_rapid_invites > 5 OR v_device_match > 0 THEN
        INSERT INTO admin_logs (
            admin_id, action, entity_type, entity_id, changes
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', -- システム
            'fraud_detection',
            'invitation',
            NEW.id,
            jsonb_build_object(
                'same_ip_count', v_same_ip_count,
                'rapid_invites', v_rapid_invites,
                'device_match', v_device_match
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 7. 管理画面の統合

```javascript
// 既存のadmin.jsに追加
class AdminReferralManagement {
    constructor() {
        // 既存のadmin_logsテーブルを活用
        this.initializeReferralTab();
    }
    
    async loadPendingCashouts() {
        // cashout_requestsから保留中の申請を取得
        const { data: cashouts } = await supabase
            .from('cashout_requests')
            .select(`
                *,
                user:user_id (
                    id,
                    profiles!inner (name, company)
                )
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        
        this.renderCashoutRequests(cashouts);
    }
    
    async approveCashout(cashoutId) {
        // トランザクション処理
        const { error } = await supabase.rpc('approve_cashout', {
            p_cashout_id: cashoutId,
            p_admin_id: this.currentAdminId
        });
        
        if (!error) {
            // admin_logsに記録
            await supabase.from('admin_logs').insert({
                admin_id: this.currentAdminId,
                action: 'approve_cashout',
                entity_type: 'cashout_request',
                entity_id: cashoutId
            });
        }
    }
}
```

## 8. 移行計画

### Phase 1: 既存システムの拡張（1週間）
1. 既存テーブルへのカラム追加
2. トリガー関数の作成
3. 既存APIの修正

### Phase 2: 新機能の追加（1週間）
1. キャッシュアウト機能
2. 不正検知強化
3. 管理画面の拡張

### Phase 3: テストと調整（1週間）
1. 既存機能との統合テスト
2. パフォーマンステスト
3. セキュリティ監査

## 9. 注意事項

### 9.1 既存データの保護
- 既存のinvitations, invite_linksのデータは保持
- 新しいカラムはDEFAULT値を設定
- 既存のAPIとの後方互換性を維持

### 9.2 命名規則の統一
- 既存システムは`user_id`を使用
- 新規追加部分も`user_id`で統一（referrer_idではなく）

### 9.3 セキュリティ
- 既存のRLSポリシーを継承
- admin_logsで全ての操作を記録
- user_activitiesで行動追跡

## 10. 削除すべき仕様

元の仕様書から以下を削除：
1. referral_links テーブル（invite_linksを使用）
2. referrals テーブル（invitationsを拡張）
3. cashback_transactions（point_transactionsを使用）
4. cashback_balances（user_pointsを使用）
5. system_notifications（notificationsを使用）

これにより、既存システムとの完全な統合が可能になります。