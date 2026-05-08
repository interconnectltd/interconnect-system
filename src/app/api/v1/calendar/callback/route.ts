import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/calendar/google";
import { verifyOAuthState } from "@/lib/calendar/oauth-state";

/** GET /api/v1/calendar/callback — Google OAuth コールバック */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (errorParam || !code || !state) {
    const msg = errorParam === "access_denied"
      ? "カレンダー連携が拒否されました"
      : "カレンダー連携に失敗しました";
    return NextResponse.redirect(`${appUrl}/settings?error=${encodeURIComponent(msg)}`);
  }

  // Verify state HMAC — rejects stale/forged state to prevent account hijacking.
  const verified = verifyOAuthState(state);
  if (!verified) {
    return NextResponse.redirect(
      `${appUrl}/settings?error=${encodeURIComponent("OAuthセッションが無効または期限切れです")}`,
    );
  }
  const userId = verified.userId;

  try {
    const redirectUri = `${appUrl}/api/v1/calendar/callback`;

    // Authorization code をトークンに交換
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(
        `${appUrl}/settings?error=${encodeURIComponent("トークンの取得に失敗しました")}`,
      );
    }

    const tokens = await tokenRes.json();

    // Google userinfo からメールアドレスを取得
    const userinfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    const userinfo = userinfoRes.ok ? await userinfoRes.json() : null;
    const providerEmail = userinfo?.email ?? "unknown";

    // トークンを暗号化
    const accessTokenEnc = encryptToken(tokens.access_token);
    const refreshTokenEnc = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : null;

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // calendar_connections に upsert (service role で RLS バイパス)
    const supabase = await createServiceClient();
    const { error } = await supabase
      .from("calendar_connections")
      .upsert(
        {
          user_id: userId,
          provider: "google",
          provider_email: providerEmail,
          access_token_enc: accessTokenEnc,
          refresh_token_enc: refreshTokenEnc,
          token_expires_at: expiresAt,
          is_active: true,
        },
        { onConflict: "user_id,provider,provider_email" },
      );

    if (error) {
      console.error("Failed to store calendar connection:", error);
      return NextResponse.redirect(
        `${appUrl}/settings?error=${encodeURIComponent("カレンダー接続の保存に失敗しました")}`,
      );
    }

    return NextResponse.redirect(
      `${appUrl}/settings?success=${encodeURIComponent("Googleカレンダーを連携しました")}`,
    );
  } catch (error) {
    console.error("Calendar callback error:", error);
    return NextResponse.redirect(
      `${appUrl}/settings?error=${encodeURIComponent("カレンダー連携中にエラーが発生しました")}`,
    );
  }
}
