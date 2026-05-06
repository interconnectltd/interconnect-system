import { withAuth, json, jsonError, handleApiError } from "@/lib/api-helpers";
import { createServiceClient } from "@/lib/supabase/server";

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

    if (!body || !Array.isArray(body.rules)) {
      return jsonError(400, "BAD_REQUEST", "rulesは配列で指定してください");
    }

    const rules: Array<{
      day_of_week: number;
      start_time: string;
      end_time: string;
    }> = body.rules;

    // バリデーション
    for (const rule of rules) {
      if (
        typeof rule.day_of_week !== "number" ||
        rule.day_of_week < 0 ||
        rule.day_of_week > 6
      ) {
        return jsonError(
          400,
          "BAD_REQUEST",
          "day_of_weekは0〜6の数値で指定してください",
        );
      }

      const timeRegex = /^\d{2}:\d{2}$/;
      if (!timeRegex.test(rule.start_time) || !timeRegex.test(rule.end_time)) {
        return jsonError(
          400,
          "BAD_REQUEST",
          "時刻はHH:MM形式で指定してください",
        );
      }

      if (rule.start_time >= rule.end_time) {
        return jsonError(
          400,
          "BAD_REQUEST",
          "start_timeはend_timeより前に設定してください",
        );
      }
    }

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
