import { withAuth, json, jsonError, handleApiError } from "@/lib/api-helpers";

/** POST /api/v1/calendar/disconnect — カレンダー連携解除 */
export async function POST() {
  try {
    const { user, supabase } = await withAuth();

    const { data, error } = await supabase
      .from("calendar_connections")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return jsonError(404, "NOT_FOUND", "有効なカレンダー連携が見つかりません");
    }

    return json({ disconnected: true });
  } catch (error) {
    return handleApiError(error);
  }
}
