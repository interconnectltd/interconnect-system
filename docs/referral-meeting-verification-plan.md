# 紹介報酬の面談確認システム改善案

## 現状の問題
- tl:dvとの実際のAPI連携が未実装
- 面談完了の自動検知ができない
- 手動での確認が必要

## 実装可能な解決策

### 1. Calendlyとの連携案
```javascript
// Calendlyのウェブフック設定
const calendlyWebhook = {
  // 面談予約時
  "invitee.created": async (payload) => {
    // 招待者のメールアドレスから紹介を特定
    const invitation = await findInvitationByEmail(payload.email);
    if (invitation) {
      await updateInvitationStatus(invitation.id, 'meeting_scheduled');
    }
  },
  
  // 面談完了時
  "invitee.canceled": async (payload) => {
    // キャンセル処理
  },
  
  // カスタムフィールドで招待コードを受け取る
  customFields: {
    "invite_code": "招待コード"
  }
};
```

### 2. Google Calendar + Google Meetの統合
```javascript
// Google Calendar APIを使用
async function checkMeetingCompletion(inviteeEmail) {
  const calendar = google.calendar({version: 'v3'});
  
  // イベントを検索
  const events = await calendar.events.list({
    calendarId: 'primary',
    q: inviteeEmail,
    timeMin: new Date().toISOString(),
    singleEvents: true
  });
  
  // Google Meetの参加ログを確認
  for (const event of events.items) {
    if (event.conferenceData?.entryPoints) {
      // Meet APIで参加者リストを確認
      const participants = await getMeetParticipants(event.conferenceData.conferenceId);
      if (participants.includes(inviteeEmail)) {
        return true;
      }
    }
  }
}
```

### 3. 独自の面談確認システム
```sql
-- 面談確認用のテーブル
CREATE TABLE meeting_verifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invitation_id UUID REFERENCES invitations(id),
    meeting_url TEXT NOT NULL,
    verification_code TEXT UNIQUE NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    host_confirmed BOOLEAN DEFAULT FALSE,
    invitee_confirmed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 面談中の確認トークン
CREATE TABLE meeting_attendance_tokens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    meeting_verification_id UUID REFERENCES meeting_verifications(id),
    token TEXT UNIQUE NOT NULL,
    issued_to TEXT NOT NULL, -- 'host' or 'invitee'
    confirmed_at TIMESTAMP WITH TIME ZONE,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### 4. 実装手順

#### Step 1: 面談リンクの生成
```javascript
async function generateMeetingLink(invitationId) {
  const verificationCode = generateSecureCode();
  
  // 面談確認レコードを作成
  const { data: verification } = await supabase
    .from('meeting_verifications')
    .insert({
      invitation_id: invitationId,
      meeting_url: `https://meet.google.com/xxx-xxxx-xxx`,
      verification_code: verificationCode
    })
    .select()
    .single();
  
  // 招待者と被招待者にメール送信
  await sendMeetingInvitation({
    hostEmail: invitation.inviter.email,
    inviteeEmail: invitation.invitee.email,
    meetingUrl: verification.meeting_url,
    verificationUrl: `${BASE_URL}/verify-meeting/${verificationCode}`
  });
}
```

#### Step 2: 面談中の確認
```javascript
// 面談開始時に両者が確認
async function confirmMeetingAttendance(verificationCode, userRole) {
  const token = generateAttendanceToken();
  
  // トークンを発行
  await supabase
    .from('meeting_attendance_tokens')
    .insert({
      meeting_verification_id: verification.id,
      token: token,
      issued_to: userRole,
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2時間後
    });
  
  // QRコードまたはリンクで確認
  return {
    confirmUrl: `${BASE_URL}/confirm-attendance/${token}`,
    qrCode: generateQRCode(token)
  };
}
```

#### Step 3: 自動報酬処理
```javascript
// 両者の確認が揃ったら報酬を付与
CREATE OR REPLACE FUNCTION process_verified_meeting()
RETURNS TRIGGER AS $$
BEGIN
    -- 両者の確認をチェック
    IF EXISTS (
        SELECT 1 FROM meeting_attendance_tokens
        WHERE meeting_verification_id = NEW.meeting_verification_id
        AND issued_to = 'host' AND confirmed_at IS NOT NULL
    ) AND EXISTS (
        SELECT 1 FROM meeting_attendance_tokens
        WHERE meeting_verification_id = NEW.meeting_verification_id
        AND issued_to = 'invitee' AND confirmed_at IS NOT NULL
    ) THEN
        -- 面談完了を記録
        UPDATE meeting_verifications
        SET ended_at = NOW(),
            duration_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
        WHERE id = NEW.meeting_verification_id;
        
        -- 報酬を処理
        PERFORM process_referral_reward(
            (SELECT invitation_id FROM meeting_verifications WHERE id = NEW.meeting_verification_id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 5. Zoom連携案
```javascript
// Zoom Webhook設定
const zoomWebhooks = {
  // 参加者が入室
  "meeting.participant_joined": async (payload) => {
    const { meeting, participant } = payload;
    await trackParticipant(meeting.id, participant.email, 'joined');
  },
  
  // 参加者が退室
  "meeting.participant_left": async (payload) => {
    const { meeting, participant } = payload;
    await trackParticipant(meeting.id, participant.email, 'left');
  },
  
  // 会議終了
  "meeting.ended": async (payload) => {
    await processMeetingCompletion(payload.meeting.id);
  }
};
```

## 推奨される実装

### 最もシンプルで確実な方法：管理者による手動確認

```javascript
// 管理画面に確認ボタンを追加
async function confirmMeetingManually(invitationId, adminNotes) {
  const { data: { user } } = await supabase.auth.getUser();
  
  // 管理者のみ実行可能
  if (!isAdmin(user)) throw new Error('Unauthorized');
  
  // 面談完了を記録
  await supabase
    .from('meeting_confirmations')
    .insert({
      invitation_id: invitationId,
      confirmed_by: user.id,
      confirmation_method: 'manual_admin',
      notes: adminNotes,
      confirmed_at: new Date()
    });
  
  // 報酬を処理
  await processReferralReward(invitationId);
}
```

### ハイブリッドアプローチ

1. **自動化できる部分**
   - カレンダー予約の検知
   - メール送信の自動化
   - 基本的な参加確認

2. **人間の確認が必要な部分**
   - 実際に有意義な面談が行われたか
   - 不正な申請でないか
   - 報酬支払いの最終承認

## 結論

現在の実装では面談確認が不完全なため、以下のいずれかの対応が必要：

1. **Calendly/Zoom/Google Meetなどの実際のAPIと連携**
2. **独自の面談確認システムを構築**
3. **管理者による手動確認プロセスを追加**

最も現実的なのは、**3の手動確認 + 1の部分的な自動化**の組み合わせです。