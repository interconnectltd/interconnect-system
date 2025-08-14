# INTERCONNECT 紹介機能 詳細仕様書 v2.0

## 1. システム概要

### 1.1 機能概要
INTERCONNECTの既存会員が新規会員を紹介し、紹介が成立した場合に報酬（1,000円）を獲得できるシステム。

### 1.2 対象環境
- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+)
- **バックエンド**: Supabase (PostgreSQL, Edge Functions)
- **認証**: Supabase Auth
- **決済**: 銀行振込（手動処理）※将来的にStripe連携
- **通知**: メール（SendGrid）、LINE Messaging API

### 1.3 前提条件
- 既存のINTERCONNECTシステムに追加実装
- meeting_minutesテーブル（tl;dv連携）は実装済み
- ユーザー認証システムは実装済み

## 2. 画面仕様

### 2.1 紹介プログラムダッシュボード（/referral）

#### 2.1.1 画面レイアウト
```html
<!-- ヘッダー部 -->
<div class="referral-header">
    <h1>紹介プログラム</h1>
    <div class="referral-stats">
        <div class="stat-card">
            <span class="stat-label">獲得可能額</span>
            <span class="stat-value">¥8,000</span>
        </div>
        <div class="stat-card">
            <span class="stat-label">保留中</span>
            <span class="stat-value">¥2,000</span>
        </div>
        <div class="stat-card warning">
            <span class="stat-label">出金可能額</span>
            <span class="stat-value">¥5,000</span>
            <button class="withdraw-btn">出金申請</button>
        </div>
    </div>
</div>

<!-- 招待リンク管理 -->
<section class="invite-links-section">
    <div class="section-header">
        <h2>招待リンク</h2>
        <button class="create-link-btn">新規作成</button>
    </div>
    <div class="links-grid">
        <!-- リンクカード -->
        <div class="link-card">
            <h3>デフォルトリンク</h3>
            <div class="link-url">
                <input type="text" readonly value="https://interconnect.com/invite/ABC123XYZ">
                <button class="copy-btn">コピー</button>
            </div>
            <div class="link-stats">
                <span>クリック: 45</span>
                <span>登録: 12</span>
                <span>成立: 8</span>
            </div>
            <div class="link-actions">
                <button class="qr-btn">QRコード</button>
                <button class="share-btn">共有</button>
                <button class="delete-btn">削除</button>
            </div>
        </div>
    </div>
</section>

<!-- 紹介履歴 -->
<section class="referral-history">
    <h2>紹介履歴</h2>
    <div class="filters">
        <select id="status-filter">
            <option value="all">すべて</option>
            <option value="pending">保留中</option>
            <option value="completed">成立</option>
            <option value="cancelled">キャンセル</option>
        </select>
        <input type="date" id="date-from">
        <input type="date" id="date-to">
    </div>
    <table class="referral-table">
        <thead>
            <tr>
                <th>紹介日</th>
                <th>紹介者名</th>
                <th>会社名</th>
                <th>ステータス</th>
                <th>成立日</th>
                <th>報酬</th>
                <th>詳細</th>
            </tr>
        </thead>
        <tbody>
            <!-- データ行 -->
        </tbody>
    </table>
</section>
```

#### 2.1.2 必要なJavaScript機能
```javascript
// js/referral-dashboard.js
class ReferralDashboard {
    constructor() {
        this.initializeEventListeners();
        this.loadDashboardData();
    }

    async loadDashboardData() {
        // APIから各種データを取得
        const [stats, links, history] = await Promise.all([
            this.fetchStats(),
            this.fetchLinks(),
            this.fetchHistory()
        ]);
        
        this.renderStats(stats);
        this.renderLinks(links);
        this.renderHistory(history);
    }

    async createInviteLink(data) {
        try {
            const response = await fetch('/api/referral-links', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) throw new Error('リンク作成に失敗しました');
            
            const result = await response.json();
            this.showNotification('招待リンクを作成しました', 'success');
            return result;
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('コピーしました', 'success');
        });
    }

    generateQRCode(url) {
        // QRコード生成ライブラリを使用
        const qr = new QRCode({
            content: url,
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff",
        });
        return qr.svg();
    }
}
```

### 2.2 招待リンク作成モーダル

```html
<div class="modal" id="create-link-modal">
    <div class="modal-content">
        <h2>招待リンクを作成</h2>
        <form id="create-link-form">
            <div class="form-group">
                <label>リンク名（任意）</label>
                <input type="text" name="name" placeholder="例：Facebook広告用">
            </div>
            <div class="form-group">
                <label>有効期限（任意）</label>
                <input type="datetime-local" name="expires_at">
            </div>
            <div class="form-group">
                <label>カスタムメッセージ</label>
                <textarea name="message" rows="3" placeholder="紹介時に表示されるメッセージ"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="cancel-btn">キャンセル</button>
                <button type="submit" class="primary-btn">作成</button>
            </div>
        </form>
    </div>
</div>
```

### 2.3 出金申請画面

```html
<div class="withdrawal-section">
    <h2>出金申請</h2>
    
    <!-- 出金可能額の確認 -->
    <div class="balance-info">
        <div class="balance-card">
            <h3>出金可能額</h3>
            <p class="amount">¥5,000</p>
            <p class="note">※最低出金額: ¥3,000</p>
        </div>
    </div>
    
    <!-- 銀行口座情報 -->
    <form id="withdrawal-form">
        <h3>振込先情報</h3>
        <div class="form-grid">
            <div class="form-group">
                <label>金融機関名 <span class="required">*</span></label>
                <input type="text" name="bank_name" required>
            </div>
            <div class="form-group">
                <label>支店名 <span class="required">*</span></label>
                <input type="text" name="branch_name" required>
            </div>
            <div class="form-group">
                <label>口座種別 <span class="required">*</span></label>
                <select name="account_type" required>
                    <option value="普通">普通</option>
                    <option value="当座">当座</option>
                </select>
            </div>
            <div class="form-group">
                <label>口座番号 <span class="required">*</span></label>
                <input type="text" name="account_number" pattern="[0-9]{7}" required>
            </div>
            <div class="form-group">
                <label>口座名義（カナ） <span class="required">*</span></label>
                <input type="text" name="account_holder" pattern="[ァ-ヶー\s]+" required>
            </div>
            <div class="form-group">
                <label>出金額 <span class="required">*</span></label>
                <input type="number" name="amount" min="3000" max="5000" step="1000" required>
            </div>
        </div>
        
        <!-- 本人確認 -->
        <div class="verification-section">
            <h3>本人確認</h3>
            <p>初回出金時は本人確認が必要です</p>
            <div class="form-group">
                <label>マイナンバー <span class="required">*</span></label>
                <input type="text" name="my_number" pattern="[0-9]{12}" maxlength="12">
                <p class="help-text">※税務処理に必要です</p>
            </div>
        </div>
        
        <!-- 同意事項 -->
        <div class="agreement-section">
            <label>
                <input type="checkbox" name="agree_terms" required>
                <span>出金規約に同意します</span>
            </label>
            <label>
                <input type="checkbox" name="agree_tax" required>
                <span>税務上の取り扱いについて理解しました</span>
            </label>
        </div>
        
        <button type="submit" class="submit-btn">出金申請する</button>
    </form>
</div>
```

## 3. データベース詳細設計

### 3.1 テーブル定義

```sql
-- ========================================
-- 1. 招待リンクテーブル
-- ========================================
CREATE TABLE public.referral_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(12) UNIQUE NOT NULL,
    name VARCHAR(100),
    message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    click_count INTEGER DEFAULT 0,
    registration_count INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_referral_links_user_id ON public.referral_links(user_id);
CREATE INDEX idx_referral_links_code ON public.referral_links(code);
CREATE INDEX idx_referral_links_is_active ON public.referral_links(is_active);

-- ========================================
-- 2. 紹介関係テーブル
-- ========================================
CREATE TABLE public.referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_link_id UUID REFERENCES public.referral_links(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    registration_ip INET,
    registration_user_agent TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    fraud_score DECIMAL(3, 2) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_referral UNIQUE(referrer_id, referred_id),
    CONSTRAINT status_check CHECK (status IN ('pending', 'completed', 'cancelled', 'suspended'))
);

-- インデックス
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_referrals_created_at ON public.referrals(created_at);

-- ========================================
-- 3. キャッシュバック取引テーブル
-- ========================================
CREATE TABLE public.cashback_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_id UUID REFERENCES public.referrals(id),
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_details JSONB,
    bank_reference VARCHAR(100),
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    net_amount DECIMAL(10, 2),
    notes TEXT,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT type_check CHECK (type IN ('earned', 'withdrawn', 'adjustment', 'cancelled')),
    CONSTRAINT status_check CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'failed', 'cancelled'))
);

-- インデックス
CREATE INDEX idx_cashback_transactions_user_id ON public.cashback_transactions(user_id);
CREATE INDEX idx_cashback_transactions_status ON public.cashback_transactions(status);
CREATE INDEX idx_cashback_transactions_type ON public.cashback_transactions(type);

-- ========================================
-- 4. キャッシュバック残高テーブル
-- ========================================
CREATE TABLE public.cashback_balances (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_earned DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_withdrawn DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_pending DECIMAL(10, 2) NOT NULL DEFAULT 0,
    current_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    available_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    last_withdrawal_at TIMESTAMP WITH TIME ZONE,
    withdrawal_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT balance_check CHECK (current_balance >= 0 AND available_balance >= 0)
);

-- ========================================
-- 5. 紹介クリック追跡テーブル
-- ========================================
CREATE TABLE public.referral_clicks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referral_link_id UUID NOT NULL REFERENCES public.referral_links(id),
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_referral_clicks_link_id ON public.referral_clicks(referral_link_id);
CREATE INDEX idx_referral_clicks_clicked_at ON public.referral_clicks(clicked_at);

-- ========================================
-- 6. 不正検知ログテーブル
-- ========================================
CREATE TABLE public.fraud_detection_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    referral_id UUID REFERENCES public.referrals(id),
    detection_type VARCHAR(50) NOT NULL,
    risk_score DECIMAL(3, 2) NOT NULL,
    details JSONB NOT NULL,
    action_taken VARCHAR(50),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 7. 税務情報テーブル
-- ========================================
CREATE TABLE public.tax_information (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    my_number VARCHAR(12),
    my_number_verified BOOLEAN DEFAULT false,
    tax_withholding_rate DECIMAL(5, 2) DEFAULT 10.21,
    tax_documents JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 8. 支払い設定テーブル
-- ========================================
CREATE TABLE public.payment_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 初期設定データ
INSERT INTO public.payment_settings (setting_key, setting_value, description) VALUES
('minimum_withdrawal', '{"amount": 3000, "currency": "JPY"}', '最低出金額'),
('maximum_withdrawal', '{"amount": 100000, "currency": "JPY"}', '最高出金額'),
('monthly_limit', '{"amount": 500000, "currency": "JPY"}', '月間出金上限'),
('referral_reward', '{"amount": 1000, "currency": "JPY"}', '紹介報酬額'),
('fraud_threshold', '{"score": 0.7}', '不正検知しきい値'),
('cooling_period', '{"days": 90}', '報酬確定までの期間');

-- ========================================
-- RLSポリシー
-- ========================================

-- referral_links
ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral links" ON public.referral_links
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own referral links" ON public.referral_links
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own referral links" ON public.referral_links
    FOR UPDATE USING (auth.uid() = user_id);

-- referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referrals where they are referrer" ON public.referrals
    FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "System can create referrals" ON public.referrals
    FOR INSERT WITH CHECK (true);

-- cashback_transactions
ALTER TABLE public.cashback_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.cashback_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- cashback_balances
ALTER TABLE public.cashback_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own balance" ON public.cashback_balances
    FOR SELECT USING (auth.uid() = user_id);

-- ========================================
-- トリガー関数
-- ========================================

-- 1. referral_linksの更新日時自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_referral_links_updated_at BEFORE UPDATE
    ON public.referral_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. 紹介成立時の処理
CREATE OR REPLACE FUNCTION process_referral_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_referral RECORD;
    v_reward_amount DECIMAL(10, 2);
    v_setting JSONB;
BEGIN
    -- 該当ユーザーの紹介情報を取得
    SELECT * INTO v_referral FROM public.referrals 
    WHERE referred_id = NEW.user_id 
    AND status = 'pending'
    LIMIT 1;
    
    IF v_referral IS NOT NULL THEN
        -- 報酬額を設定から取得
        SELECT setting_value INTO v_setting FROM public.payment_settings 
        WHERE setting_key = 'referral_reward' AND is_active = true;
        
        v_reward_amount := COALESCE((v_setting->>'amount')::DECIMAL, 1000);
        
        -- 紹介を完了に更新
        UPDATE public.referrals 
        SET status = 'completed', completed_at = NOW(), updated_at = NOW()
        WHERE id = v_referral.id;
        
        -- キャッシュバック取引を作成
        INSERT INTO public.cashback_transactions (
            user_id, referral_id, amount, type, status, net_amount
        ) VALUES (
            v_referral.referrer_id, v_referral.id, v_reward_amount, 
            'earned', 'approved', v_reward_amount
        );
        
        -- 残高を更新
        INSERT INTO public.cashback_balances (
            user_id, total_earned, current_balance, available_balance
        ) VALUES (
            v_referral.referrer_id, v_reward_amount, v_reward_amount, v_reward_amount
        ) ON CONFLICT (user_id) DO UPDATE SET
            total_earned = cashback_balances.total_earned + v_reward_amount,
            current_balance = cashback_balances.current_balance + v_reward_amount,
            available_balance = cashback_balances.available_balance + v_reward_amount,
            updated_at = NOW();
        
        -- 通知を送信（別途実装）
        PERFORM send_referral_completion_notification(v_referral.referrer_id, v_referral.referred_id);
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER trigger_process_referral_completion
AFTER INSERT ON public.meeting_minutes
FOR EACH ROW EXECUTE FUNCTION process_referral_completion();

-- 3. 不正検知
CREATE OR REPLACE FUNCTION check_referral_fraud()
RETURNS TRIGGER AS $$
DECLARE
    v_same_ip_count INTEGER;
    v_recent_referrals INTEGER;
    v_fraud_score DECIMAL(3, 2) := 0;
BEGIN
    -- 同一IPからの登録数をチェック
    SELECT COUNT(*) INTO v_same_ip_count
    FROM public.referrals
    WHERE registration_ip = NEW.registration_ip
    AND created_at > NOW() - INTERVAL '24 hours';
    
    IF v_same_ip_count > 3 THEN
        v_fraud_score := v_fraud_score + 0.3;
    END IF;
    
    -- 短期間での大量紹介をチェック
    SELECT COUNT(*) INTO v_recent_referrals
    FROM public.referrals
    WHERE referrer_id = NEW.referrer_id
    AND created_at > NOW() - INTERVAL '1 hour';
    
    IF v_recent_referrals > 5 THEN
        v_fraud_score := v_fraud_score + 0.4;
    END IF;
    
    -- 不正スコアを更新
    NEW.fraud_score := v_fraud_score;
    
    -- 高リスクの場合はログに記録
    IF v_fraud_score > 0.7 THEN
        INSERT INTO public.fraud_detection_logs (
            user_id, referral_id, detection_type, risk_score, details
        ) VALUES (
            NEW.referrer_id, NEW.id, 'automatic_detection', v_fraud_score,
            jsonb_build_object(
                'same_ip_count', v_same_ip_count,
                'recent_referrals', v_recent_referrals
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_check_referral_fraud
BEFORE INSERT ON public.referrals
FOR EACH ROW EXECUTE FUNCTION check_referral_fraud();
```

## 4. API仕様詳細

### 4.1 Supabase Edge Functions

#### 4.1.1 招待リンク作成
```typescript
// supabase/functions/create-referral-link/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { name, expires_at, message } = await req.json()

    // ユニークなコードを生成
    const code = generateUniqueCode()

    // リンクを作成
    const { data, error } = await supabaseClient
      .from('referral_links')
      .insert({
        user_id: user.id,
        code,
        name,
        expires_at,
        message,
        metadata: {
          created_from: req.headers.get('User-Agent'),
          ip: req.headers.get('X-Forwarded-For')
        }
      })
      .select()
      .single()

    if (error) throw error

    // QRコードを生成
    const qrCode = await generateQRCode(`${Deno.env.get('APP_URL')}/invite/${code}`)

    return new Response(
      JSON.stringify({
        ...data,
        url: `${Deno.env.get('APP_URL')}/invite/${code}`,
        qr_code: qrCode
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

function generateUniqueCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

async function generateQRCode(url: string): Promise<string> {
  // QRコード生成の実装
  const qr = new QRCode(url)
  return qr.toDataURL()
}
```

#### 4.1.2 紹介追跡
```typescript
// supabase/functions/track-referral/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, action } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // リンクの有効性を確認
    const { data: link, error: linkError } = await supabaseClient
      .from('referral_links')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single()

    if (linkError || !link) {
      throw new Error('Invalid referral link')
    }

    // 有効期限チェック
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      throw new Error('Referral link has expired')
    }

    if (action === 'click') {
      // クリックを記録
      await supabaseClient.from('referral_clicks').insert({
        referral_link_id: link.id,
        ip_address: req.headers.get('X-Forwarded-For'),
        user_agent: req.headers.get('User-Agent'),
        referer: req.headers.get('Referer'),
        utm_source: new URL(req.url).searchParams.get('utm_source'),
        utm_medium: new URL(req.url).searchParams.get('utm_medium'),
        utm_campaign: new URL(req.url).searchParams.get('utm_campaign')
      })

      // クリック数を更新
      await supabaseClient
        .from('referral_links')
        .update({ click_count: link.click_count + 1 })
        .eq('id', link.id)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        referrer_id: link.user_id,
        message: link.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
```

#### 4.1.3 出金申請
```typescript
// supabase/functions/request-withdrawal/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const withdrawalData = await req.json()

    // 残高確認
    const { data: balance } = await supabaseClient
      .from('cashback_balances')
      .select('available_balance')
      .eq('user_id', user.id)
      .single()

    if (!balance || balance.available_balance < withdrawalData.amount) {
      throw new Error('Insufficient balance')
    }

    // 最低出金額チェック
    const { data: settings } = await supabaseClient
      .from('payment_settings')
      .select('setting_value')
      .eq('setting_key', 'minimum_withdrawal')
      .single()

    const minimumAmount = settings?.setting_value?.amount || 3000
    if (withdrawalData.amount < minimumAmount) {
      throw new Error(`Minimum withdrawal amount is ¥${minimumAmount}`)
    }

    // マイナンバー確認（初回のみ）
    const { data: taxInfo } = await supabaseClient
      .from('tax_information')
      .select('my_number_verified')
      .eq('user_id', user.id)
      .single()

    if (!taxInfo?.my_number_verified && withdrawalData.my_number) {
      await supabaseClient
        .from('tax_information')
        .upsert({
          user_id: user.id,
          my_number: withdrawalData.my_number,
          my_number_verified: false // 管理者が確認後にtrueに更新
        })
    }

    // 源泉徴収額を計算
    const taxRate = 0.1021 // 10.21%
    const taxAmount = Math.floor(withdrawalData.amount * taxRate)
    const netAmount = withdrawalData.amount - taxAmount

    // 出金申請を作成
    const { data: transaction, error } = await supabaseClient
      .from('cashback_transactions')
      .insert({
        user_id: user.id,
        amount: withdrawalData.amount,
        type: 'withdrawn',
        status: 'pending',
        payment_method: 'bank_transfer',
        payment_details: {
          bank_name: withdrawalData.bank_name,
          branch_name: withdrawalData.branch_name,
          account_type: withdrawalData.account_type,
          account_number: withdrawalData.account_number,
          account_holder: withdrawalData.account_holder
        },
        tax_amount: taxAmount,
        net_amount: netAmount
      })
      .select()
      .single()

    if (error) throw error

    // 残高を更新（保留中として）
    await supabaseClient
      .from('cashback_balances')
      .update({
        available_balance: balance.available_balance - withdrawalData.amount,
        total_pending: balance.total_pending + withdrawalData.amount
      })
      .eq('user_id', user.id)

    // 管理者に通知
    await notifyAdminOfWithdrawal(user.id, transaction.id)

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        message: '出金申請を受け付けました。2-3営業日で処理されます。'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
```

## 5. フロントエンド実装詳細

### 5.1 招待ページ（/invite/{code}）
```html
<!-- invite.html -->
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>INTERCONNECTへようこそ - 特別招待</title>
    <link rel="stylesheet" href="css/invite-landing.css">
</head>
<body>
    <div class="invite-container">
        <div class="invite-header">
            <img src="assets/logo.svg" alt="INTERCONNECT">
            <h1>特別招待を受け取りました</h1>
        </div>
        
        <div class="referrer-info" id="referrer-info">
            <!-- 動的に挿入 -->
        </div>
        
        <div class="invite-benefits">
            <h2>INTERCONNECTに参加すると</h2>
            <ul>
                <li>経営者同士の質の高いネットワーク</li>
                <li>AIマッチングによる最適なビジネスパートナー探し</li>
                <li>限定イベントへの参加</li>
                <li>ビジネス課題の解決支援</li>
            </ul>
        </div>
        
        <div class="cta-section">
            <button class="register-btn" onclick="proceedToRegister()">
                無料で登録する
            </button>
            <p class="terms">登録により利用規約に同意したものとみなされます</p>
        </div>
    </div>
    
    <script>
        // URLからコードを取得
        const pathParts = window.location.pathname.split('/');
        const inviteCode = pathParts[pathParts.length - 1];
        
        // 紹介者情報を取得
        async function loadReferrerInfo() {
            try {
                const response = await fetch('/api/track-referral', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: inviteCode, action: 'click' })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Cookieに保存
                    document.cookie = `referral_code=${inviteCode};max-age=${30*24*60*60};path=/`;
                    document.cookie = `referrer_id=${data.referrer_id};max-age=${30*24*60*60};path=/`;
                    
                    // カスタムメッセージを表示
                    if (data.message) {
                        document.getElementById('referrer-info').innerHTML = `
                            <div class="custom-message">${data.message}</div>
                        `;
                    }
                } else {
                    window.location.href = '/register';
                }
            } catch (error) {
                console.error('Error:', error);
                window.location.href = '/register';
            }
        }
        
        function proceedToRegister() {
            window.location.href = '/register';
        }
        
        // ページ読み込み時に実行
        loadReferrerInfo();
    </script>
</body>
</html>
```

### 5.2 登録フォームの改修
```javascript
// js/register-referral-integration.js
class RegisterReferralIntegration {
    constructor() {
        this.referralCode = this.getReferralFromCookie();
        this.referrerId = this.getReferrerIdFromCookie();
    }
    
    getReferralFromCookie() {
        const match = document.cookie.match(/referral_code=([^;]+)/);
        return match ? match[1] : null;
    }
    
    getReferrerIdFromCookie() {
        const match = document.cookie.match(/referrer_id=([^;]+)/);
        return match ? match[1] : null;
    }
    
    async handleRegistration(userData) {
        try {
            // Supabaseでユーザー登録
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        name: userData.name,
                        company: userData.company,
                        referral_code: this.referralCode,
                        referrer_id: this.referrerId
                    }
                }
            });
            
            if (authError) throw authError;
            
            // プロフィール作成
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: authData.user.id,
                    ...userData,
                    referrer_id: this.referrerId
                });
            
            if (profileError) throw profileError;
            
            // 紹介関係を記録
            if (this.referrerId) {
                const { error: referralError } = await supabase
                    .from('referrals')
                    .insert({
                        referrer_id: this.referrerId,
                        referred_id: authData.user.id,
                        referral_link_id: await this.getReferralLinkId(),
                        registration_ip: await this.getClientIP(),
                        registration_user_agent: navigator.userAgent
                    });
                
                if (referralError) console.error('Referral tracking error:', referralError);
            }
            
            // 成功時の処理
            this.clearReferralCookies();
            window.location.href = '/dashboard';
            
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }
    
    async getReferralLinkId() {
        if (!this.referralCode) return null;
        
        const { data } = await supabase
            .from('referral_links')
            .select('id')
            .eq('code', this.referralCode)
            .single();
        
        return data?.id || null;
    }
    
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch {
            return null;
        }
    }
    
    clearReferralCookies() {
        document.cookie = 'referral_code=;max-age=0;path=/';
        document.cookie = 'referrer_id=;max-age=0;path=/';
    }
}
```

## 6. 管理画面仕様

### 6.1 管理者ダッシュボード
```html
<!-- admin-referral.html -->
<div class="admin-referral-dashboard">
    <h1>紹介プログラム管理</h1>
    
    <!-- 統計サマリー -->
    <div class="stats-grid">
        <div class="stat-card">
            <h3>本日の紹介</h3>
            <p class="stat-value">12</p>
            <p class="stat-change positive">+20%</p>
        </div>
        <div class="stat-card">
            <h3>保留中の支払い</h3>
            <p class="stat-value">¥45,000</p>
            <p class="stat-count">15件</p>
        </div>
        <div class="stat-card">
            <h3>今月の支払い総額</h3>
            <p class="stat-value">¥234,000</p>
            <p class="stat-limit">上限: ¥500,000</p>
        </div>
        <div class="stat-card warning">
            <h3>要確認</h3>
            <p class="stat-value">3件</p>
            <p class="stat-label">不正の疑い</p>
        </div>
    </div>
    
    <!-- タブメニュー -->
    <div class="admin-tabs">
        <button class="tab-btn active" data-tab="withdrawals">出金申請</button>
        <button class="tab-btn" data-tab="referrals">紹介一覧</button>
        <button class="tab-btn" data-tab="fraud">不正検知</button>
        <button class="tab-btn" data-tab="settings">設定</button>
    </div>
    
    <!-- 出金申請タブ -->
    <div class="tab-content active" id="withdrawals-tab">
        <div class="filters">
            <select id="withdrawal-status">
                <option value="pending">保留中</option>
                <option value="approved">承認済み</option>
                <option value="completed">完了</option>
                <option value="all">すべて</option>
            </select>
            <button class="bulk-approve-btn">一括承認</button>
        </div>
        
        <table class="admin-table">
            <thead>
                <tr>
                    <th><input type="checkbox" id="select-all"></th>
                    <th>申請日</th>
                    <th>ユーザー</th>
                    <th>金額</th>
                    <th>源泉徴収</th>
                    <th>振込額</th>
                    <th>口座情報</th>
                    <th>ステータス</th>
                    <th>アクション</th>
                </tr>
            </thead>
            <tbody>
                <!-- 動的に生成 -->
            </tbody>
        </table>
    </div>
    
    <!-- 不正検知タブ -->
    <div class="tab-content" id="fraud-tab">
        <div class="fraud-alerts">
            <div class="alert-card high-risk">
                <h4>高リスク: 同一IPから複数登録</h4>
                <p>User ID: abc123が1時間で5件の紹介</p>
                <p>IP: 192.168.1.1</p>
                <div class="alert-actions">
                    <button class="suspend-btn">アカウント停止</button>
                    <button class="investigate-btn">詳細調査</button>
                    <button class="dismiss-btn">却下</button>
                </div>
            </div>
        </div>
    </div>
</div>
```

### 6.2 管理者向けJavaScript
```javascript
// js/admin-referral.js
class AdminReferralDashboard {
    constructor() {
        this.currentTab = 'withdrawals';
        this.initializeEventListeners();
        this.loadDashboardData();
    }
    
    async approveWithdrawal(transactionId) {
        try {
            // マイナンバー確認
            const verified = await this.verifyTaxInfo(transactionId);
            if (!verified) {
                if (!confirm('マイナンバーが未確認です。続行しますか？')) {
                    return;
                }
            }
            
            // 承認処理
            const { error } = await supabase
                .from('cashback_transactions')
                .update({
                    status: 'approved',
                    processed_by: this.getCurrentAdminId(),
                    processed_at: new Date().toISOString()
                })
                .eq('id', transactionId);
            
            if (error) throw error;
            
            this.showNotification('出金申請を承認しました', 'success');
            this.refreshWithdrawalList();
            
        } catch (error) {
            this.showNotification('エラーが発生しました: ' + error.message, 'error');
        }
    }
    
    async bulkApprove() {
        const selectedIds = this.getSelectedTransactionIds();
        if (selectedIds.length === 0) {
            this.showNotification('項目を選択してください', 'warning');
            return;
        }
        
        if (!confirm(`${selectedIds.length}件の出金申請を承認しますか？`)) {
            return;
        }
        
        try {
            // バッチ処理
            const promises = selectedIds.map(id => this.approveWithdrawal(id));
            await Promise.all(promises);
            
            this.showNotification(`${selectedIds.length}件を承認しました`, 'success');
            
        } catch (error) {
            this.showNotification('一部の処理でエラーが発生しました', 'error');
        }
    }
    
    async suspendUser(userId, reason) {
        try {
            // ユーザーの全紹介を無効化
            await supabase
                .from('referrals')
                .update({ status: 'suspended' })
                .eq('referrer_id', userId)
                .eq('status', 'pending');
            
            // 不正ログに記録
            await supabase
                .from('fraud_detection_logs')
                .insert({
                    user_id: userId,
                    detection_type: 'manual_suspension',
                    risk_score: 1.0,
                    details: { reason },
                    action_taken: 'account_suspended',
                    reviewed_by: this.getCurrentAdminId()
                });
            
            this.showNotification('アカウントを停止しました', 'success');
            
        } catch (error) {
            this.showNotification('エラーが発生しました: ' + error.message, 'error');
        }
    }
    
    async exportTaxReport(year, month) {
        try {
            const { data, error } = await supabase
                .from('cashback_transactions')
                .select(`
                    *,
                    user:user_id (
                        id,
                        email,
                        profiles (name, company)
                    ),
                    tax_information (my_number)
                `)
                .eq('type', 'withdrawn')
                .eq('status', 'completed')
                .gte('processed_at', `${year}-${month}-01`)
                .lt('processed_at', `${year}-${month + 1}-01`);
            
            if (error) throw error;
            
            // CSV生成
            const csv = this.generateTaxReportCSV(data);
            this.downloadCSV(csv, `tax_report_${year}_${month}.csv`);
            
        } catch (error) {
            this.showNotification('エクスポートに失敗しました', 'error');
        }
    }
}
```

## 7. セキュリティ実装

### 7.1 不正検知アルゴリズム
```javascript
// js/fraud-detection.js
class FraudDetection {
    constructor() {
        this.rules = [
            {
                name: 'same_ip_multiple_accounts',
                check: async (referral) => {
                    const count = await this.countSameIPRegistrations(referral.registration_ip);
                    return count > 3 ? 0.3 : 0;
                }
            },
            {
                name: 'rapid_referrals',
                check: async (referral) => {
                    const count = await this.countRecentReferrals(referral.referrer_id);
                    return count > 5 ? 0.4 : 0;
                }
            },
            {
                name: 'similar_email_patterns',
                check: async (referral) => {
                    const similarity = await this.checkEmailSimilarity(referral.referrer_id);
                    return similarity > 0.8 ? 0.3 : 0;
                }
            },
            {
                name: 'device_fingerprint_match',
                check: async (referral) => {
                    const matches = await this.checkDeviceFingerprint(referral);
                    return matches > 2 ? 0.5 : 0;
                }
            }
        ];
    }
    
    async calculateFraudScore(referral) {
        let totalScore = 0;
        
        for (const rule of this.rules) {
            const score = await rule.check(referral);
            totalScore += score;
        }
        
        return Math.min(totalScore, 1.0);
    }
    
    async checkDeviceFingerprint(referral) {
        // デバイスフィンガープリント生成
        const fingerprint = await this.generateFingerprint();
        
        // 既存のフィンガープリントと比較
        const { count } = await supabase
            .from('referrals')
            .select('id', { count: 'exact' })
            .eq('metadata->device_fingerprint', fingerprint)
            .neq('id', referral.id);
        
        return count;
    }
    
    async generateFingerprint() {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        return result.visitorId;
    }
}
```

### 7.2 Rate Limiting実装
```typescript
// supabase/functions/_shared/rate-limiter.ts
export class RateLimiter {
    private cache: Map<string, number[]> = new Map();
    
    constructor(
        private windowMs: number = 60000, // 1分
        private maxRequests: number = 10
    ) {}
    
    async checkLimit(identifier: string): Promise<boolean> {
        const now = Date.now();
        const requests = this.cache.get(identifier) || [];
        
        // 古いリクエストを削除
        const validRequests = requests.filter(
            timestamp => now - timestamp < this.windowMs
        );
        
        if (validRequests.length >= this.maxRequests) {
            return false; // レート制限に達した
        }
        
        validRequests.push(now);
        this.cache.set(identifier, validRequests);
        
        return true;
    }
}

// 使用例
const rateLimiter = new RateLimiter(60000, 5); // 1分間に5リクエストまで

export async function checkRateLimit(req: Request): Promise<boolean> {
    const ip = req.headers.get('X-Forwarded-For') || 'unknown';
    return await rateLimiter.checkLimit(ip);
}
```

## 8. 通知システム

### 8.1 メール通知テンプレート
```html
<!-- email-templates/referral-completed.html -->
<!DOCTYPE html>
<html>
<head>
    <style>
        .email-container {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
        }
        .header {
            background: #0066ff;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .content {
            padding: 30px;
            background: #f8f9fa;
        }
        .reward-box {
            background: white;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
        }
        .reward-amount {
            font-size: 36px;
            color: #0066ff;
            font-weight: bold;
        }
        .cta-button {
            display: inline-block;
            background: #0066ff;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>紹介が成立しました！</h1>
        </div>
        <div class="content">
            <p>{{referrer_name}}様</p>
            <p>おめでとうございます！あなたの紹介で{{referred_name}}様がINTERCONNECTに参加され、初回面談を完了しました。</p>
            
            <div class="reward-box">
                <p>獲得報酬</p>
                <div class="reward-amount">¥1,000</div>
                <p>現在の残高: ¥{{current_balance}}</p>
            </div>
            
            <p>報酬は残高に追加されました。¥3,000以上から出金申請が可能です。</p>
            
            <center>
                <a href="{{app_url}}/referral" class="cta-button">
                    紹介プログラムを確認
                </a>
            </center>
            
            <p>今後ともINTERCONNECTをよろしくお願いいたします。</p>
        </div>
    </div>
</body>
</html>
```

### 8.2 LINE通知実装
```javascript
// js/line-notification-referral.js
class LineNotificationReferral {
    async sendCompletionNotification(userId, referredName, amount) {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('line_user_id')
                .eq('id', userId)
                .single();
            
            if (!profile?.line_user_id) return;
            
            const message = {
                type: 'flex',
                altText: '紹介が成立しました！',
                contents: {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [{
                            type: 'text',
                            text: '🎉 紹介成立のお知らせ',
                            weight: 'bold',
                            size: 'lg',
                            color: '#ffffff'
                        }],
                        backgroundColor: '#0066ff'
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: `${referredName}様の紹介が成立しました`,
                                wrap: true
                            },
                            {
                                type: 'separator',
                                margin: 'md'
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '獲得報酬'
                                    },
                                    {
                                        type: 'text',
                                        text: `¥${amount.toLocaleString()}`,
                                        align: 'end',
                                        weight: 'bold',
                                        size: 'xl',
                                        color: '#0066ff'
                                    }
                                ],
                                margin: 'md'
                            }
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [{
                            type: 'button',
                            action: {
                                type: 'uri',
                                label: '詳細を確認',
                                uri: `${process.env.APP_URL}/referral`
                            },
                            style: 'primary'
                        }]
                    }
                }
            };
            
            await this.sendLineMessage(profile.line_user_id, message);
            
        } catch (error) {
            console.error('LINE notification error:', error);
        }
    }
}
```

## 9. テスト仕様

### 9.1 E2Eテストシナリオ
```javascript
// tests/e2e/referral.test.js
describe('紹介機能E2Eテスト', () => {
    test('紹介リンクからの登録フロー', async () => {
        // 1. 紹介リンクを作成
        const referrer = await createTestUser();
        const link = await createReferralLink(referrer.id);
        
        // 2. 紹介リンクにアクセス
        await page.goto(`/invite/${link.code}`);
        await expect(page).toHaveURL(/\/invite\//);
        
        // 3. 登録ボタンをクリック
        await page.click('.register-btn');
        await expect(page).toHaveURL('/register');
        
        // 4. 新規ユーザー登録
        const newUser = await registerNewUser();
        
        // 5. referralsテーブルに記録されているか確認
        const referral = await getReferralRecord(referrer.id, newUser.id);
        expect(referral).toBeDefined();
        expect(referral.status).toBe('pending');
        
        // 6. meeting_minutesに記録を追加
        await createMeetingMinute(newUser.id);
        
        // 7. 紹介が完了しているか確認
        const completedReferral = await getReferralRecord(referrer.id, newUser.id);
        expect(completedReferral.status).toBe('completed');
        
        // 8. キャッシュバックが追加されているか確認
        const balance = await getCashbackBalance(referrer.id);
        expect(balance.total_earned).toBe(1000);
    });
    
    test('不正検知テスト', async () => {
        const referrer = await createTestUser();
        const link = await createReferralLink(referrer.id);
        
        // 同一IPから複数登録
        for (let i = 0; i < 5; i++) {
            await registerUserWithReferral(link.code, '192.168.1.1');
        }
        
        // 不正フラグが立っているか確認
        const fraudLogs = await getFraudLogs(referrer.id);
        expect(fraudLogs.length).toBeGreaterThan(0);
        expect(fraudLogs[0].risk_score).toBeGreaterThan(0.7);
    });
});
```

### 9.2 負荷テスト
```javascript
// tests/load/referral-load.test.js
import { check } from 'k6';
import http from 'k6/http';

export const options = {
    stages: [
        { duration: '30s', target: 100 },
        { duration: '1m', target: 1000 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.1'],
    },
};

export default function () {
    // 招待リンクアクセステスト
    const inviteResponse = http.get(`${__ENV.BASE_URL}/invite/TESTCODE123`);
    check(inviteResponse, {
        'invite page loaded': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    // API負荷テスト
    const apiResponse = http.post(
        `${__ENV.BASE_URL}/api/track-referral`,
        JSON.stringify({ code: 'TESTCODE123', action: 'click' }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    check(apiResponse, {
        'API responded': (r) => r.status === 200,
        'API response time < 200ms': (r) => r.timings.duration < 200,
    });
}
```

## 10. デプロイメント手順

### 10.1 環境変数設定
```bash
# .env.production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APP_URL=https://interconnect.com
SENDGRID_API_KEY=your-sendgrid-key
LINE_CHANNEL_ACCESS_TOKEN=your-line-token
```

### 10.2 データベースマイグレーション
```bash
# 1. マイグレーションファイルを作成
supabase migration new add_referral_system

# 2. SQLを記述（上記のテーブル定義をコピー）

# 3. マイグレーション実行
supabase db push

# 4. Edge Functions デプロイ
supabase functions deploy create-referral-link
supabase functions deploy track-referral
supabase functions deploy request-withdrawal
```

### 10.3 フロントエンドデプロイ
```bash
# 1. ビルド
npm run build

# 2. Netlifyにデプロイ
netlify deploy --prod

# 3. 環境変数設定
netlify env:set VITE_SUPABASE_URL $SUPABASE_URL
netlify env:set VITE_SUPABASE_ANON_KEY $SUPABASE_ANON_KEY
```

## 11. 監視設定

### 11.1 Datadogダッシュボード設定
```json
{
    "dashboard": {
        "title": "INTERCONNECT Referral System",
        "widgets": [
            {
                "type": "timeseries",
                "title": "紹介登録数",
                "query": "sum:referral.registrations{*}.as_count()"
            },
            {
                "type": "query_value",
                "title": "本日の紹介成立数",
                "query": "sum:referral.completions{*}.as_count()"
            },
            {
                "type": "heatmap",
                "title": "不正スコア分布",
                "query": "avg:referral.fraud_score{*} by {hour}"
            }
        ]
    }
}
```

### 11.2 アラート設定
```yaml
# datadog-monitors.yaml
monitors:
  - name: "High Fraud Score Alert"
    type: "metric alert"
    query: "avg(last_5m):avg:referral.fraud_score{*} > 0.7"
    message: |
      @slack-interconnect-alerts
      高い不正スコアが検出されました。
      確認してください: {{value}}
    
  - name: "Withdrawal Request Spike"
    type: "anomaly"
    query: "avg(last_1h):sum:cashback.withdrawal_requests{*} by {status}"
    message: |
      出金申請が異常に増加しています。
      キャッシュフローを確認してください。
```

## 12. 運用マニュアル

### 12.1 日次業務
1. **不正検知レポート確認**（毎朝9:00）
   - 管理画面の「不正検知」タブを確認
   - リスクスコア0.7以上は個別調査

2. **出金申請処理**（毎日14:00）
   - 保留中の申請を確認
   - マイナンバー確認
   - 一括承認または個別処理

### 12.2 月次業務
1. **支払調書作成**（月初5営業日以内）
   - 税務レポートをエクスポート
   - 源泉徴収票の作成
   - 支払調書の送付

2. **統計レポート作成**
   - 紹介数推移
   - 成立率分析
   - 不正検知状況

### 12.3 トラブルシューティング
- **「紹介が記録されない」**
  1. Cookieが有効か確認
  2. referral_linksテーブルを確認
  3. ログを確認

- **「出金できない」**
  1. 残高を確認
  2. 最低出金額を確認
  3. 本人確認状況を確認

## 13. 今後の拡張計画

### Phase 1（実装済み）
- 基本的な紹介機能
- 手動出金処理
- 基本的な不正検知

### Phase 2（3ヶ月後）
- Stripe連携による自動出金
- 高度な不正検知AI
- 紹介者ランキング

### Phase 3（6ヶ月後）
- 段階的報酬システム
- 紹介者向けダッシュボード強化
- APIの外部公開

---

この仕様書に基づいて開発を進めることで、紹介機能を確実に実装できます。