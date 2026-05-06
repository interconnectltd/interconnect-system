import { withAuth, json, jsonError, handleApiError } from "@/lib/api-helpers";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

/** POST /api/v1/calendar/connect — Google Calendar OAuth フロー開始 */
export async function POST() {
  try {
    const { user } = await withAuth();

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return jsonError(500, "CONFIG_ERROR", "Google OAuth が設定されていません");
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      state: user.id,
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    return json({ url });
  } catch (error) {
    return handleApiError(error);
  }
}
