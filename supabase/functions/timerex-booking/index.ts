import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TIMEREX_API_URL = 'https://api.timerex.jp/v1'
const TIMEREX_API_KEY = '7nxFkWUcjmbEXpXAoeP5TujgbH7Zrk7p8nbAmMYcAfoCdM6RgnI2qK6lSEpZaGAp'

serve(async (req) => {
  // CORSの処理
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { referralCode, userId, userEmail, userName } = await req.json()
    
    console.log('Creating TimeRex booking session:', {
      referralCode,
      userId,
      userEmail,
      userName
    })
    
    // TimeRexの予約セッションを作成
    const sessionResponse = await fetch(`${TIMEREX_API_URL}/booking-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TIMEREX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bookingPageId: Deno.env.get('TIMEREX_BOOKING_PAGE_ID') || 'interconnect-consultation',
        prefill: {
          name: userName || '',
          email: userEmail || ''
        },
        customFields: {
          referral_code: referralCode || 'DIRECT',
          user_id: userId || '',
          source: 'interconnect'
        },
        metadata: {
          userId: userId,
          source: 'interconnect',
          timestamp: new Date().toISOString()
        }
      })
    })
    
    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text()
      console.error('TimeRex API error:', errorText)
      throw new Error(`TimeRex API error: ${sessionResponse.status}`)
    }
    
    const session = await sessionResponse.json()
    console.log('TimeRex session created:', session)
    
    // Supabaseクライアント初期化
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // セッション情報をデータベースに保存
    const { error: dbError } = await supabase.from('booking_sessions').insert({
      session_id: session.id,
      user_id: userId,
      user_email: userEmail,
      referral_code: referralCode || 'DIRECT',
      status: 'pending',
      timerex_data: session,
      created_at: new Date().toISOString()
    })
    
    if (dbError) {
      console.error('Error saving session to database:', dbError)
      // データベースエラーでもTimeRexのURLは返す
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        sessionId: session.id,
        bookingUrl: session.bookingUrl || session.url,
        embedUrl: session.embedUrl
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
    
  } catch (error) {
    console.error('Error creating booking session:', error)
    
    // TimeRex APIが使えない場合のフォールバック
    const fallbackUrl = buildFallbackUrl(await req.json().catch(() => ({})))
    
    return new Response(
      JSON.stringify({ 
        success: true,
        sessionId: 'fallback',
        bookingUrl: fallbackUrl,
        embedUrl: fallbackUrl,
        fallback: true
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

// フォールバック用のTimeRex URLを生成
function buildFallbackUrl(params: any) {
  const { referralCode, userId, userEmail, userName } = params
  const baseUrl = 'https://timerex.jp/book/interconnect-consultation'
  
  const urlParams = new URLSearchParams({
    name: userName || '',
    email: userEmail || '',
    custom_referral_code: referralCode || 'DIRECT',
    custom_user_id: userId || '',
    source: 'interconnect'
  })
  
  return `${baseUrl}?${urlParams.toString()}`
}