import { withAuth, json, jsonError, handleApiError } from "@/lib/api-helpers";
import { generateFeedToken } from "@/lib/calendar/feed-token";

/**
 * 認証済みユーザーの現行 feed_token_version を取得（NULL/未設定時は 1 を返す）
 */
async function getFeedTokenVersion(
  supabase: Awaited<ReturnType<typeof withAuth>>["supabase"],
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("feed_token_version")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[feed-token] failed to fetch version", error);
    throw error;
  }

  const v = (data as { feed_token_version: number | null } | null)
    ?.feed_token_version;
  return typeof v === "number" && v >= 1 ? v : 1;
}

function buildFeedUrl(token: string, request: Request): string {
  const origin = new URL(request.url).origin;
  return `${origin}/api/v1/calendar/feed/${token}`;
}

/**
 * GET /api/v1/calendar/feed-token
 * 認証済みユーザーのカレンダーフィードトークンを返す（既存トークンを再生成）
 */
export async function GET(request: Request) {
  try {
    const { user, supabase } = await withAuth();
    const version = await getFeedTokenVersion(supabase, user.id);
    const token = generateFeedToken(user.id, version);
    return json({ token, url: buildFeedUrl(token, request) });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/calendar/feed-token
 * フィードトークンをローテーションする。
 * feed_token_version をインクリメント → 当該ユーザーの旧トークンは全て失効。
 * 他ユーザーには影響なし。
 */
export async function POST(request: Request) {
  try {
    const { user, supabase } = await withAuth();

    const current = await getFeedTokenVersion(supabase, user.id);
    const next = current + 1;

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ feed_token_version: next })
      .eq("id", user.id);

    if (updateError) {
      console.error("[feed-token] failed to bump version", updateError);
      return jsonError(
        500,
        "FEED_TOKEN_ROTATION_FAILED",
        "フィードトークンのローテーションに失敗しました",
      );
    }

    const token = generateFeedToken(user.id, next);
    return json({ token, url: buildFeedUrl(token, request) });
  } catch (error) {
    return handleApiError(error);
  }
}
