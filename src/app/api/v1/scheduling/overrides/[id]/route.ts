import { withAuth, json, jsonError, handleApiError } from "@/lib/api-helpers";
import { isValidUUID } from "@/lib/sanitize";
import { createServiceClient } from "@/lib/supabase/server";

/** DELETE /api/v1/scheduling/overrides/:id — 除外日削除 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { user } = await withAuth();

    if (!isValidUUID(id)) {
      return jsonError(400, "BAD_REQUEST", "IDの形式が不正です");
    }

    const serviceClient = await createServiceClient();

    // 所有者チェック
    const { data: existing, error: fetchError } = await serviceClient
      .from("availability_overrides")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existing) {
      return jsonError(404, "NOT_FOUND", "除外設定が見つかりません");
    }

    if (existing.user_id !== user.id) {
      return jsonError(403, "FORBIDDEN", "この除外設定を削除する権限がありません");
    }

    const { error: deleteError } = await serviceClient
      .from("availability_overrides")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return json({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
