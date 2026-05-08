import {
  withAuth,
  json,
  jsonError,
  handleApiError,
  validationErrorResponse,
} from "@/lib/api-helpers";
import { createServiceClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/calendar/crypto";
import { safeFetch, UrlGuardError } from "@/lib/calendar/url-guard";
import { icsSubscribeSchema } from "@/validations/calendar";

/** POST /api/v1/calendar/ics/subscribe — ICS URL でカレンダー接続 */
export async function POST(request: Request) {
  try {
    const { user } = await withAuth();

    const body = await request.json().catch(() => null);

    // Zod: trims, requires valid URL, https://, max length 2048.
    const parseResult = icsSubscribeSchema.safeParse(body);
    if (!parseResult.success) {
      return validationErrorResponse(parseResult.error);
    }
    const icsUrl = parseResult.data.ics_url;
    const parsedUrl = new URL(icsUrl);

    // Test-fetch the ICS URL to verify accessibility and content (SSRF-guarded)
    let icsText: string;
    try {
      const res = await safeFetch(icsUrl, {
        headers: { Accept: "text/calendar" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        return jsonError(
          400,
          "ICS_FETCH_FAILED",
          `ICS URLにアクセスできません（ステータス: ${res.status}）`,
        );
      }
      icsText = await res.text();
    } catch (err) {
      if (err instanceof UrlGuardError) {
        return jsonError(400, "INVALID_URL", "このURLには接続できません");
      }
      return jsonError(
        400,
        "ICS_FETCH_FAILED",
        "ICS URLにアクセスできませんでした。URLを確認してください",
      );
    }

    // Verify it looks like VCALENDAR data
    if (!icsText.includes("BEGIN:VCALENDAR")) {
      return jsonError(
        400,
        "INVALID_ICS",
        "有効なICSカレンダーデータが見つかりませんでした",
      );
    }

    // Encrypt the ICS URL for storage
    const accessTokenEnc = encryptToken(icsUrl);
    const icsUrlEnc = encryptToken(icsUrl);

    // Extract domain as identifier
    const providerEmail = parsedUrl.hostname;

    // Upsert into calendar_connections (service role to bypass RLS)
    const supabase = await createServiceClient();
    const { error } = await supabase
      .from("calendar_connections")
      .upsert(
        {
          user_id: user.id,
          provider: "ics_feed" as const,
          provider_email: providerEmail,
          access_token_enc: accessTokenEnc,
          ics_url: icsUrlEnc,
          refresh_token_enc: null,
          token_expires_at: null,
          is_active: true,
        },
        { onConflict: "user_id,provider,provider_email" },
      );

    if (error) {
      console.error("Failed to store ICS connection:", error);
      return jsonError(500, "DB_ERROR", "カレンダー接続の保存に失敗しました");
    }

    return json({ provider: "ics_feed", provider_email: providerEmail });
  } catch (error) {
    return handleApiError(error);
  }
}
