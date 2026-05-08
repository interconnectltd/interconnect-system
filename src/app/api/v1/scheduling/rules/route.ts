import {
  withAuth,
  json,
  handleApiError,
  validationErrorResponse,
} from "@/lib/api-helpers";
import { createServiceClient } from "@/lib/supabase/server";
import { availabilityRulesUpdateSchema } from "@/validations/calendar";

/** GET /api/v1/scheduling/rules — 空き時間ルール取得 */
export async function GET() {
  try {
    const { user } = await withAuth();
    const serviceClient = await createServiceClient();

    const { data, error } = await serviceClient
      .from("availability_rules")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;

    return json(data ?? []);
  } catch (error) {
    return handleApiError(error);
  }
}

/** PUT /api/v1/scheduling/rules — 空き時間ルール一括更新 */
export async function PUT(request: Request) {
  try {
    const { user } = await withAuth();
    const body = await request.json().catch(() => null);

    // Zod: array<{day_of_week:0-6, start_time/end_time strict HH:MM,
    // start_time<end_time}>, max 50 rules.
    const parsed = availabilityRulesUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }
    const { rules } = parsed.data;

    const serviceClient = await createServiceClient();

    // 既存ルールを全削除
    const { error: deleteError } = await serviceClient
      .from("availability_rules")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) throw deleteError;

    // 新しいルールを一括挿入
    if (rules.length > 0) {
      const rows = rules.map((rule) => ({
        user_id: user.id,
        day_of_week: rule.day_of_week,
        start_time: rule.start_time,
        end_time: rule.end_time,
        is_active: true,
      }));

      const { error: insertError } = await serviceClient
        .from("availability_rules")
        .insert(rows);

      if (insertError) throw insertError;
    }

    // 更新後のデータを返す
    const { data, error } = await serviceClient
      .from("availability_rules")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;

    return json(data ?? []);
  } catch (error) {
    return handleApiError(error);
  }
}
