import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tldv-signature',
}

// 環境変数
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TLDV_WEBHOOK_SECRET = Deno.env.get('TLDV_WEBHOOK_SECRET')!

// Supabaseクライアント初期化
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Webhook署名の検証
async function verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const data = encoder.encode(payload)
  const key = encoder.encode(TLDV_WEBHOOK_SECRET)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data)
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  return signature === computedSignature
}

// メールアドレスから招待を検索
async function findInvitationByEmail(email: string) {
  // ユーザーを検索
  const { data: userData } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (!userData) return null

  // 最新の未完了招待を検索
  const { data: invitation } = await supabase
    .from('invitations')
    .select('*')
    .eq('invitee_id', userData.id)
    .eq('status', 'registered')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return invitation
}

// 面談終了時の処理
async function processMeetingEnded(meetingData: any) {
  const { meeting_id, participants, duration_seconds, ended_at } = meetingData
  
  console.log(`Processing meeting ended: ${meeting_id}`)
  
  for (const participant of participants) {
    const invitation = await findInvitationByEmail(participant.email)
    
    if (invitation) {
      console.log(`Found invitation for ${participant.email}`)
      
      // tl:dv会議記録を作成
      const { error: recordError } = await supabase
        .from('tldv_meeting_records')
        .insert({
          meeting_id: meeting_id,
          invitee_email: participant.email,
          meeting_date: ended_at,
          duration_minutes: Math.floor(duration_seconds / 60),
          is_valid: duration_seconds >= 900 // 15分以上を有効とする
        })
      
      if (recordError) {
        console.error('Error creating meeting record:', recordError)
        continue
      }
      
      // 面談が有効な場合、報酬処理を実行
      if (duration_seconds >= 900) {
        const { error: rewardError } = await supabase
          .rpc('process_referral_reward', { p_invitation_id: invitation.id })
        
        if (rewardError) {
          console.error('Error processing reward:', rewardError)
        } else {
          console.log(`Reward processed for invitation ${invitation.id}`)
        }
      }
    }
  }
}

// 録画準備完了時の処理
async function processRecordingReady(recordingData: any) {
  const { meeting_id, recording_url, duration_seconds } = recordingData
  
  const { error } = await supabase
    .from('tldv_meeting_records')
    .update({ 
      recording_url: recording_url,
      duration_minutes: Math.floor(duration_seconds / 60)
    })
    .eq('meeting_id', meeting_id)
  
  if (error) {
    console.error('Error updating recording URL:', error)
  }
}

// 文字起こし準備完了時の処理
async function processTranscriptReady(transcriptData: any) {
  const { meeting_id, transcript_url } = transcriptData
  
  const { error } = await supabase
    .from('tldv_meeting_records')
    .update({ transcript_url: transcript_url })
    .eq('meeting_id', meeting_id)
  
  if (error) {
    console.error('Error updating transcript URL:', error)
  }
}

serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // リクエストボディを取得
    const payload = await req.text()
    
    // 署名検証
    const signature = req.headers.get('x-tldv-signature')
    if (!signature || !await verifyWebhookSignature(payload, signature)) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // イベントをパース
    const event = JSON.parse(payload)
    console.log(`Received tl:dv webhook: ${event.type}`)
    
    // イベントタイプに応じた処理
    switch (event.type) {
      case 'meeting.ended':
        await processMeetingEnded(event.data)
        break
      
      case 'recording.ready':
        await processRecordingReady(event.data)
        break
      
      case 'transcript.ready':
        await processTranscriptReady(event.data)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})