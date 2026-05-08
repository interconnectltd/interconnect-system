import { withAuth, json, jsonError, handleApiError } from "@/lib/api-helpers";
import { isValidUUID } from "@/lib/sanitize";
import { createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

interface TimeSlot {
  date: string;
  start: string;
  end: string;
}

/**
 * 30分刻みのスロットに分割する
 * 例: 10:00-12:00 → [10:00-10:30, 10:30-11:00, 11:00-11:30, 11:30-12:00]
 */
function splitInto30MinSlots(
  date: string,
  startTime: string,
  endTime: string,
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const parts = startTime.split(":").map(Number);
  const endParts = endTime.split(":").map(Number);
  const startH = parts[0] ?? 0;
  const startM = parts[1] ?? 0;
  const endH = endParts[0] ?? 0;
  const endM = endParts[1] ?? 0;
  let currentMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  while (currentMin + 30 <= endMin) {
    const sH = Math.floor(currentMin / 60);
    const sM = currentMin % 60;
    const eH = Math.floor((currentMin + 30) / 60);
    const eM = (currentMin + 30) % 60;
    slots.push({
      date,
      start: `${String(sH).padStart(2, "0")}:${String(sM).padStart(2, "0")}`,
      end: `${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`,
    });
    currentMin += 30;
  }
  return slots;
}

/**
 * 特定ユーザーの特定日の空きスロット（30分刻み）を計算する
 */
async function computeUserSlots(
  serviceClient: SupabaseClient<Database>,
  userId: string,
  date: string,
  timezone: string,
): Promise<TimeSlot[]> {
  const dayOfWeek = new Date(date + "T00:00:00").getDay();

  // 1. availability_rules からその曜日のスロットを取得
  const { data: rules } = await serviceClient
    .from("availability_rules")
    .select("start_time, end_time")
    .eq("user_id", userId)
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true)
    .order("start_time", { ascending: true });

  if (!rules || rules.length === 0) return [];

  // 2. availability_overrides を確認
  const { data: overrides } = await serviceClient
    .from("availability_overrides")
    .select("override_type, start_time, end_time")
    .eq("user_id", userId)
    .eq("target_date", date);

  let baseSlots: TimeSlot[] = [];

  // block override があれば空きなし
  const hasBlock = overrides?.some(
    (o: { override_type: string }) => o.override_type === "block",
  );
  if (hasBlock) return [];

  // custom override があればそれで置き換え
  const customOverrides = overrides?.filter(
    (o: { override_type: string }) => o.override_type === "custom",
  );
  if (customOverrides && customOverrides.length > 0) {
    for (const co of customOverrides) {
      if (co.start_time && co.end_time) {
        baseSlots.push(
          ...splitInto30MinSlots(
            date,
            co.start_time.slice(0, 5),
            co.end_time.slice(0, 5),
          ),
        );
      }
    }
  } else {
    // ルールから30分スロットに展開
    for (const rule of rules) {
      baseSlots.push(
        ...splitInto30MinSlots(
          date,
          rule.start_time.slice(0, 5),
          rule.end_time.slice(0, 5),
        ),
      );
    }
  }

  if (baseSlots.length === 0) return [];

  // 3. calendar_events からその日の予定を取得して除外
  const { data: connections } = await serviceClient
    .from("calendar_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (connections && connections.length > 0) {
    const connectionIds = connections.map((c: { id: string }) => c.id);

    const { data: events } = await serviceClient
      .from("calendar_events")
      .select("start_at, end_at")
      .eq("user_id", userId)
      .in("connection_id", connectionIds)
      .gte("start_at", date + "T00:00:00")
      .lte("start_at", date + "T23:59:59");

    if (events && events.length > 0) {
      // イベントの時間帯をローカルHH:MM形式に変換して除外
      baseSlots = baseSlots.filter((slot) => {
        for (const event of events) {
          const eventStart = new Date(event.start_at);
          const eventEnd = new Date(event.end_at);

          // イベントをローカル時刻に変換
          const esLocal = eventStart.toLocaleString("en-US", {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          const eeLocal = eventEnd.toLocaleString("en-US", {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });

          // HH:MM形式に正規化
          const eventStartTime = esLocal.padStart(5, "0");
          const eventEndTime = eeLocal.padStart(5, "0");

          // スロットがイベントと重複するか
          if (slot.start < eventEndTime && slot.end > eventStartTime) {
            return false;
          }
        }
        return true;
      });
    }
  }

  return baseSlots;
}

/** GET /api/v1/scheduling/availability — 空き時間照合 */
export async function GET(request: Request) {
  try {
    const { user } = await withAuth();
    const { searchParams } = new URL(request.url);

    const targetUserId = searchParams.get("target_user_id");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!targetUserId || !isValidUUID(targetUserId)) {
      return jsonError(
        400,
        "BAD_REQUEST",
        "有効なtarget_user_idを指定してください",
      );
    }

    if (!from || isNaN(Date.parse(from))) {
      return jsonError(400, "BAD_REQUEST", "fromの日付形式が不正です");
    }

    if (!to || isNaN(Date.parse(to))) {
      return jsonError(400, "BAD_REQUEST", "toの日付形式が不正です");
    }

    const serviceClient = await createServiceClient();

    // ユーザーのタイムゾーンを取得
    const { data: myProfile } = await serviceClient
      .from("user_profiles")
      .select("timezone")
      .eq("id", user.id)
      .single();

    const { data: theirProfile } = await serviceClient
      .from("user_profiles")
      .select("timezone")
      .eq("id", targetUserId)
      .single();

    const myTimezone =
      (myProfile as Record<string, unknown> | null)?.timezone as string ??
      "Asia/Tokyo";
    const theirTimezone =
      (theirProfile as Record<string, unknown> | null)?.timezone as string ??
      "Asia/Tokyo";

    // 日付範囲の日ごとにスロットを計算
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const mySlots: TimeSlot[] = [];
    const theirSlots: TimeSlot[] = [];
    const overlapSlots: TimeSlot[] = [];

    const current = new Date(fromDate);
    while (current <= toDate) {
      const dateStr = current.toISOString().split("T")[0]!;

      const [mySlotsForDay, theirSlotsForDay] = await Promise.all([
        computeUserSlots(serviceClient, user.id, dateStr, myTimezone),
        computeUserSlots(serviceClient, targetUserId, dateStr, theirTimezone),
      ]);

      mySlots.push(...mySlotsForDay);
      theirSlots.push(...theirSlotsForDay);

      // 重なりを計算（同じdate + 同じ start/end のスロット）
      const theirSet = new Set(
        theirSlotsForDay.map((s) => `${s.date}|${s.start}|${s.end}`),
      );
      for (const mySlot of mySlotsForDay) {
        const key = `${mySlot.date}|${mySlot.start}|${mySlot.end}`;
        if (theirSet.has(key)) {
          overlapSlots.push(mySlot);
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return json({
      my_slots: mySlots,
      their_slots: theirSlots.map((s) => ({
        date: s.date,
        start: s.start,
        end: s.end,
      })),
      overlap_slots: overlapSlots,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
