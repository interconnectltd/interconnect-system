/**
 * tl:dv API連携モジュール
 * tl:dvのWebhookとAPIを使用して面談完了を自動検知
 */

class TldvIntegration {
    constructor() {
        // tl:dv API設定（環境変数から取得）
        this.apiKey = process.env.TLDV_API_KEY;
        this.apiUrl = 'https://api.tldv.io/v1';
        this.webhookSecret = process.env.TLDV_WEBHOOK_SECRET;
    }

    /**
     * tl:dv Webhookエンドポイント
     * Supabase Edge Functionとして実装
     */
    async handleWebhook(request) {
        // Webhook署名の検証
        const signature = request.headers.get('x-tldv-signature');
        if (!this.verifyWebhookSignature(request.body, signature)) {
            return new Response('Invalid signature', { status: 401 });
        }

        const event = await request.json();
        
        switch (event.type) {
            case 'meeting.ended':
                await this.processMeetingEnded(event.data);
                break;
            case 'recording.ready':
                await this.processRecordingReady(event.data);
                break;
            case 'transcript.ready':
                await this.processTranscriptReady(event.data);
                break;
        }

        return new Response('OK', { status: 200 });
    }

    /**
     * 面談終了時の処理
     */
    async processMeetingEnded(meetingData) {
        const { meeting_id, participants, duration_seconds, ended_at } = meetingData;
        
        // 参加者のメールアドレスから招待を特定
        for (const participant of participants) {
            const invitation = await this.findInvitationByEmail(participant.email);
            
            if (invitation) {
                // tl:dv会議記録を作成
                await supabase
                    .from('tldv_meeting_records')
                    .insert({
                        meeting_id: meeting_id,
                        invitee_email: participant.email,
                        meeting_date: ended_at,
                        duration_minutes: Math.floor(duration_seconds / 60),
                        is_valid: duration_seconds >= 900 // 15分以上を有効とする
                    });
                
                // 面談が有効な場合、報酬処理を実行
                if (duration_seconds >= 900) {
                    await this.triggerRewardProcessing(invitation.id);
                }
            }
        }
    }

    /**
     * 録画準備完了時の処理
     */
    async processRecordingReady(recordingData) {
        const { meeting_id, recording_url, duration_seconds } = recordingData;
        
        // 録画URLを更新
        await supabase
            .from('tldv_meeting_records')
            .update({ 
                recording_url: recording_url,
                duration_minutes: Math.floor(duration_seconds / 60)
            })
            .eq('meeting_id', meeting_id);
    }

    /**
     * 文字起こし準備完了時の処理
     */
    async processTranscriptReady(transcriptData) {
        const { meeting_id, transcript_url } = transcriptData;
        
        // 文字起こしURLを更新
        await supabase
            .from('tldv_meeting_records')
            .update({ transcript_url: transcript_url })
            .eq('meeting_id', meeting_id);
        
        // 文字起こし内容を分析（オプション）
        if (this.shouldAnalyzeTranscript) {
            await this.analyzeTranscript(meeting_id, transcript_url);
        }
    }

    /**
     * メールアドレスから招待を検索
     */
    async findInvitationByEmail(email) {
        const { data: user } = await supabase
            .from('auth.users')
            .select('id')
            .eq('email', email)
            .single();
        
        if (!user) return null;
        
        const { data: invitation } = await supabase
            .from('invitations')
            .select('*')
            .eq('invitee_id', user.id)
            .eq('status', 'registered')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        return invitation;
    }

    /**
     * 報酬処理をトリガー
     */
    async triggerRewardProcessing(invitationId) {
        const { error } = await supabase
            .rpc('process_referral_reward', { p_invitation_id: invitationId });
        
        if (error) {
            console.error('報酬処理エラー:', error);
        }
    }

    /**
     * Webhook署名の検証
     */
    verifyWebhookSignature(payload, signature) {
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', this.webhookSecret)
            .update(JSON.stringify(payload))
            .digest('hex');
        
        return signature === expectedSignature;
    }

    /**
     * 文字起こし内容の分析（面談の質を確認）
     */
    async analyzeTranscript(meetingId, transcriptUrl) {
        try {
            // 文字起こしを取得
            const transcript = await fetch(transcriptUrl).then(res => res.text());
            
            // 簡単な分析（実際はより高度な分析を実装）
            const analysisResult = {
                word_count: transcript.split(/\s+/).length,
                has_business_keywords: this.checkBusinessKeywords(transcript),
                participant_balance: this.checkParticipantBalance(transcript)
            };
            
            // 分析結果を保存
            await supabase
                .from('meeting_analysis')
                .insert({
                    meeting_id: meetingId,
                    analysis_result: analysisResult,
                    is_quality_meeting: analysisResult.word_count > 1000 && 
                                       analysisResult.has_business_keywords
                });
            
        } catch (error) {
            console.error('文字起こし分析エラー:', error);
        }
    }

    /**
     * ビジネス関連キーワードのチェック
     */
    checkBusinessKeywords(transcript) {
        const businessKeywords = [
            'ビジネス', '事業', '経営', '戦略', 'マーケティング',
            '売上', '収益', '課題', '解決', 'ソリューション'
        ];
        
        return businessKeywords.some(keyword => 
            transcript.includes(keyword)
        );
    }

    /**
     * 参加者の発言バランスをチェック
     */
    checkParticipantBalance(transcript) {
        // 簡易的な実装（実際はより精密な分析が必要）
        const lines = transcript.split('\n');
        const speakerCounts = {};
        
        lines.forEach(line => {
            const match = line.match(/^([^:]+):/);
            if (match) {
                const speaker = match[1];
                speakerCounts[speaker] = (speakerCounts[speaker] || 0) + 1;
            }
        });
        
        const counts = Object.values(speakerCounts);
        if (counts.length < 2) return false;
        
        const max = Math.max(...counts);
        const min = Math.min(...counts);
        
        // 発言数のバランスが3:1以内なら良好とする
        return max / min <= 3;
    }

    /**
     * tl:dv APIを使用して面談情報を取得
     */
    async getMeetingInfo(meetingId) {
        const response = await fetch(`${this.apiUrl}/meetings/${meetingId}`, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch meeting info');
        }
        
        return response.json();
    }

    /**
     * 特定のユーザーの面談履歴を取得
     */
    async getUserMeetings(email) {
        const response = await fetch(`${this.apiUrl}/meetings?participant_email=${email}`, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch user meetings');
        }
        
        return response.json();
    }
}

// Supabase Edge Function として実装
export async function handleTldvWebhook(request) {
    const tldv = new TldvIntegration();
    return tldv.handleWebhook(request);
}

// クライアント側での使用例
class TldvClient {
    /**
     * 面談リンクを生成（tl:dvの予約リンクを含む）
     */
    async generateMeetingLink(invitationId) {
        // カスタムメタデータを含むtl:dv会議リンクを生成
        const metadata = {
            invitation_id: invitationId,
            platform: 'interconnect'
        };
        
        // tl:dvのカレンダー予約リンクを生成
        const tldvBookingUrl = `https://app.tldv.io/book/${TLDV_CALENDAR_ID}?metadata=${encodeURIComponent(JSON.stringify(metadata))}`;
        
        return {
            booking_url: tldvBookingUrl,
            instructions: '上記のリンクから面談日時を予約してください。面談は自動的に録画され、完了後に報酬が付与されます。'
        };
    }
    
    /**
     * 面談状況を確認
     */
    async checkMeetingStatus(invitationId) {
        const { data: records } = await supabase
            .from('tldv_meeting_records')
            .select('*')
            .eq('invitation_id', invitationId)
            .order('created_at', { ascending: false });
        
        if (!records || records.length === 0) {
            return { status: 'pending', message: '面談がまだ予約されていません' };
        }
        
        const latestRecord = records[0];
        
        if (latestRecord.is_valid) {
            return { 
                status: 'completed', 
                message: '面談が完了し、報酬が付与されました',
                meeting_date: latestRecord.meeting_date,
                duration: latestRecord.duration_minutes
            };
        } else {
            return { 
                status: 'invalid', 
                message: '面談時間が短すぎるため、報酬対象外です',
                meeting_date: latestRecord.meeting_date,
                duration: latestRecord.duration_minutes
            };
        }
    }
}

// 追加のデータベーステーブル
const createMeetingAnalysisTable = `
CREATE TABLE IF NOT EXISTS meeting_analysis (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    meeting_id TEXT REFERENCES tldv_meeting_records(meeting_id),
    analysis_result JSONB,
    is_quality_meeting BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_meeting_analysis_meeting_id ON meeting_analysis(meeting_id);
CREATE INDEX idx_meeting_analysis_quality ON meeting_analysis(is_quality_meeting);
`;

export { TldvIntegration, TldvClient };