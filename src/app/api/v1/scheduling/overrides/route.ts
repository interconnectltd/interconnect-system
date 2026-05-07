import { withAuth, json, jsonError, handleApiError } from "@/lib/api-helpers";
import { createServiceClient } from "@/lib/supabase/server";

/** GET /api/v1/scheduling/overrides — 除外日一覧（未来のみ） */
export async function GET() {
  try {
    const { user } = await withAuth();
    const serviceClient = await createServiceClient();

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await serviceClient
      .from("availability_overrides")
      .select("*")
      .eq("user_id", user.id)
      .gte("target_date", today)
      .order("target_date", { ascending: true });

    if (error) throw error;

    return json(data ?? []);
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/v1/scheduling/overrides — 除外日追加 */
export async function POST(request: Request) {
  try {
    const { user } = await withAuth();
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return jsonError(400, "BAD_REQUEST", "リクエストボディが不正です");
    }

    const { target_date, override_type, start_time, end_time } = body;

    // バリデーション: target_date
    if (!target_date || isNaN(Date.parse(target_date))) {
      return jsonError(400, "BAD_REQUEST", "target_dateの日付形式が不正です");
    }

    // バリデーション: override_type
    if (override_type !== "block" && override_type !== "custom") {
      return jsonError(
        400,
        "BAD_REQUEST",
        "override_typeは'block'または'custom'で指定してください",
      );
    }

    // custom の場合は時刻が必要
    if (override_type === "custom") {
      const timeRegex = /^\d{2}:\d{2}$/;
      if (
        !start_time ||
        !end_time ||
        !timeRegex.test(start_time) ||
        !timeRegex.test(end_time)
      ) {
        return jsonError(
          400,
          "BAD_REQUEST",
          "customの場合、start_timeとend_timeをHH:MM形式で指定してください",
        );
      }
      if (start_time >= end_time) {
        return jsonError(
          400,
          "BAD_REQUEST",
          "start_timeはend_timeより前に設定してください",
        );
      }
    }

    const serviceClient = await createServiceClient();

    // 重複チェック
    let duplicateQuery = serviceClient
      .from("availability_overrides")
      .select("id")
      .eq("user_id", user.id)
      .eq("target_date", target_date);

    if (override_type === "block") {
      duplicateQuery = duplicateQuery.eq("override_type", "block");
    } else {
      duplicateQuery = duplicateQuery.eq("start_time", start_time);
    }

    const { data: existing } = await duplicateQuery.maybeSingle();

    if (existing) {
      return jsonError(409, "CONFLICT", "同じ日付に既に除外設定が存在します");
    }

    const { data, error } = await serviceClient
      .from("availability_overrides")
      .insert({
        user_id: user.id,
        target_date,
        override_type,
        start_time: override_type === "custom" ? start_time : null,
        end_time: override_type === "custom" ? end_time : null,
      })
      .select()
      .single();

    if (error) throw error;

    return json(data, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
