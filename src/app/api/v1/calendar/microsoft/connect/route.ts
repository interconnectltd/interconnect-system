import { withAuth, json, jsonError, handleApiError } from "@/lib/api-helpers";

const SCOPES = [
  "openid",
  "email",
  "offline_access",
  "Calendars.Read",
];

/** POST /api/v1/calendar/microsoft/connect — Microsoft Calendar OAuth フロー開始 */
export async function POST() {
  try {
    const { user } = await withAuth();

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) {
      return jsonError(500, "CONFIG_ERROR", "Microsoft OAuth が設定されていません");
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/microsoft/callback`;
    const tenantId = process.env.MICROSOFT_TENANT_ID ?? "common";

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES.join(" "),
      response_mode: "query",
      prompt: "consent",
      state: user.id,
    });

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`;

    return json({ url });
  } catch (error) {
    return handleApiError(error);
  }
}
