import { withAuth, json, handleApiError } from "@/lib/api-helpers";
import { generateFeedToken } from "@/lib/calendar/feed-token";

/**
 * GET /api/v1/calendar/feed-token
 * 認証済みユーザーのカレンダーフィードトークンを返す
 */
export async function GET() {
  try {
    const { user } = await withAuth();
    const token = generateFeedToken(user.id);
    return json({ token });
  } catch (error) {
    return handleApiError(error);
  }
}
