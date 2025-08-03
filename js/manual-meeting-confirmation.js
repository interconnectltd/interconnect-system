/**
 * 管理者による手動面談確認機能
 */

class ManualMeetingConfirmation {
    constructor() {
        this.init();
    }

    init() {
        // 管理画面に確認ボタンを追加
        this.addConfirmationButtons();
    }

    addConfirmationButtons() {
        // 紹介一覧テーブルの各行に確認ボタンを追加
        document.querySelectorAll('.referral-row').forEach(row => {
            const status = row.dataset.status;
            const invitationId = row.dataset.invitationId;
            
            if (status === 'registered') {
                const actionCell = row.querySelector('.action-cell');
                const confirmBtn = document.createElement('button');
                confirmBtn.className = 'btn btn-success btn-sm';
                confirmBtn.innerHTML = '<i class="fas fa-check"></i> 面談確認';
                confirmBtn.onclick = () => this.openConfirmationModal(invitationId);
                actionCell.appendChild(confirmBtn);
            }
        });
    }

    openConfirmationModal(invitationId) {
        const modal = this.createConfirmationModal(invitationId);
        document.body.appendChild(modal);
        modal.classList.add('show');
    }

    createConfirmationModal(invitationId) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>面談完了確認</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="meeting-confirmation-form">
                        <div class="form-group">
                            <label>面談実施日時 <span class="required">*</span></label>
                            <input type="datetime-local" id="meeting-datetime" required>
                        </div>
                        
                        <div class="form-group">
                            <label>面談方法 <span class="required">*</span></label>
                            <select id="meeting-method" required>
                                <option value="">選択してください</option>
                                <option value="zoom">Zoom</option>
                                <option value="google_meet">Google Meet</option>
                                <option value="teams">Microsoft Teams</option>
                                <option value="in_person">対面</option>
                                <option value="phone">電話</option>
                                <option value="other">その他</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>面談時間（分） <span class="required">*</span></label>
                            <input type="number" id="meeting-duration" min="15" max="180" value="30" required>
                        </div>
                        
                        <div class="form-group">
                            <label>確認方法 <span class="required">*</span></label>
                            <div class="checkbox-group">
                                <label>
                                    <input type="checkbox" name="verification" value="calendar_check">
                                    カレンダー確認済み
                                </label>
                                <label>
                                    <input type="checkbox" name="verification" value="recording_check">
                                    録画確認済み
                                </label>
                                <label>
                                    <input type="checkbox" name="verification" value="participant_feedback">
                                    参加者フィードバック確認済み
                                </label>
                                <label>
                                    <input type="checkbox" name="verification" value="meeting_notes">
                                    議事録確認済み
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>面談内容の要約</label>
                            <textarea id="meeting-summary" rows="4" placeholder="面談で話された内容の要約（任意）"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>管理者メモ <span class="required">*</span></label>
                            <textarea id="admin-notes" rows="3" required placeholder="確認の詳細や特記事項"></textarea>
                        </div>
                        
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <strong>確認事項：</strong>
                            <ul>
                                <li>実際に面談が行われたことを確認しましたか？</li>
                                <li>紹介者と被紹介者の両方が参加しましたか？</li>
                                <li>面談時間は適切でしたか（最低15分以上）？</li>
                                <li>不正な申請の兆候はありませんか？</li>
                            </ul>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="confirm-checkbox" required>
                                <span>上記の内容を確認し、報酬支払いを承認します</span>
                            </label>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        キャンセル
                    </button>
                    <button class="btn btn-primary" onclick="manualConfirmation.confirmMeeting('${invitationId}', this)">
                        面談を確認して報酬を付与
                    </button>
                </div>
            </div>
        `;
        
        return modal;
    }

    async confirmMeeting(invitationId, button) {
        const form = document.getElementById('meeting-confirmation-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // 確認チェック
        const verificationMethods = Array.from(document.querySelectorAll('input[name="verification"]:checked'))
            .map(cb => cb.value);
        
        if (verificationMethods.length === 0) {
            alert('少なくとも1つの確認方法を選択してください');
            return;
        }

        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 処理中...';

        try {
            const confirmationData = {
                invitation_id: invitationId,
                meeting_datetime: document.getElementById('meeting-datetime').value,
                meeting_method: document.getElementById('meeting-method').value,
                duration_minutes: parseInt(document.getElementById('meeting-duration').value),
                verification_methods: verificationMethods,
                meeting_summary: document.getElementById('meeting-summary').value,
                admin_notes: document.getElementById('admin-notes').value,
                confirmed_at: new Date().toISOString()
            };

            // 1. 面談確認を記録
            const { error: confirmError } = await supabase
                .from('meeting_confirmations')
                .insert(confirmationData);

            if (confirmError) throw confirmError;

            // 2. tl:dv会議記録をモックで作成（本来はAPIから取得）
            const { data: invitation } = await supabase
                .from('invitations')
                .select('invitee_id, invitee:profiles!invitations_invitee_id_fkey(email)')
                .eq('id', invitationId)
                .single();

            const { error: meetingError } = await supabase
                .from('tldv_meeting_records')
                .insert({
                    meeting_id: `manual_${Date.now()}`,
                    invitee_email: invitation.invitee.email,
                    meeting_date: confirmationData.meeting_datetime,
                    duration_minutes: confirmationData.duration_minutes,
                    is_valid: true
                });

            if (meetingError) throw meetingError;

            // 3. 報酬処理を実行
            const { data: result, error: rewardError } = await supabase
                .rpc('process_referral_reward', { p_invitation_id: invitationId });

            if (rewardError) throw rewardError;

            // 成功通知
            this.showNotification('面談確認が完了し、報酬が付与されました', 'success');

            // モーダルを閉じる
            button.closest('.modal').remove();

            // テーブルを更新
            if (window.adminReferral) {
                window.adminReferral.loadReferralsData();
            }

        } catch (error) {
            console.error('面談確認エラー:', error);
            this.showNotification('エラーが発生しました: ' + error.message, 'error');
            button.disabled = false;
            button.innerHTML = '面談を確認して報酬を付与';
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            background: type === 'success' ? '#48bb78' : '#f56565',
            color: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '10000',
            animation: 'slideInRight 0.3s ease'
        });
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// 面談確認テーブルの作成
const createMeetingConfirmationsTable = `
CREATE TABLE IF NOT EXISTS meeting_confirmations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE,
    confirmed_by UUID REFERENCES auth.users(id),
    meeting_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    meeting_method TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    verification_methods TEXT[] NOT NULL,
    meeting_summary TEXT,
    admin_notes TEXT NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_meeting_confirmations_invitation_id ON meeting_confirmations(invitation_id);
CREATE INDEX idx_meeting_confirmations_confirmed_by ON meeting_confirmations(confirmed_by);

-- RLSポリシー
ALTER TABLE meeting_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage meeting confirmations" ON meeting_confirmations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = TRUE
        )
    );
`;

// グローバルに公開
window.manualConfirmation = new ManualMeetingConfirmation();