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

interface ScoredSuggestion {
  date: string;
  start: string;
  end: string;
  score: number;
}

/**
 * 30分刻みのスロットに分割する
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

  const { data: rules } = await serviceClient
    .from("availability_rules")
    .select("start_time, end_time")
    .eq("user_id", userId)
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true)
    .order("start_time", { ascending: true });

  if (!rules || rules.length === 0) return [];

  const { data: overrides } = await serviceClient
    .from("availability_overrides")
    .select("override_type, start_time, end_time")
    .eq("user_id", userId)
    .eq("target_date", date);

  let baseSlots: TimeSlot[] = [];

  const hasBlock = overrides?.some(
    (o: { override_type: string }) => o.override_type === "block",
  );
  if (hasBlock) return [];

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
      baseSlots = baseSlots.filter((slot) => {
        for (const event of events) {
          const eventStart = new Date(event.start_at);
          const eventEnd = new Date(event.end_at);

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

          const eventStartTime = esLocal.padStart(5, "0");
          const eventEndTime = eeLocal.padStart(5, "0");

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

/**
 * §3.2 スコア計算
 * - 両者の空きスロット内: +50点
 * - 営業時間内(9:00-18:00): +20点
 * - 直近日優先: -5点/日（今日からの日数）
 * - 午前(9-12) > 午後(12-17) > 夕方(17-): +10/+5/+0点
 * - 連続空き時間の中央: +10点
 */
function scoreSlot(
  slot: TimeSlot,
  today: Date,
  allOverlapSlots: TimeSlot[],
): number {
  let score = 0;

  // 両者の空きスロット内（overlap前提なので常に+50）
  score += 50;

  // 営業時間内(9:00-18:00)
  const startHour = parseInt(slot.start.split(":")[0] ?? "0", 10);
  if (startHour >= 9 && startHour < 18) {
    score += 20;
  }

  // 直近日優先: -5点/日
  const slotDate = new Date(slot.date + "T00:00:00");
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const daysDiff = Math.floor(
    (slotDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  score -= daysDiff * 5;

  // 午前 > 午後 > 夕方
  if (startHour >= 9 && startHour < 12) {
    score += 10; // 午前
  } else if (startHour >= 12 && startHour < 17) {
    score += 5; // 午後
  }
  // 夕方: +0

  // 連続空き時間の中央: 前後にも同じ日のoverlapスロットがあれば+10
  const sameDaySlots = allOverlapSlots
    .filter((s) => s.date === slot.date)
    .map((s) => s.start)
    .sort();
  const slotIndex = sameDaySlots.indexOf(slot.start);
  if (slotIndex > 0 && slotIndex < sameDaySlots.length - 1) {
    score += 10;
  }

  return score;
}

/** POST /api/v1/scheduling/suggest — 候補3件自動提案 */
export async function POST(request: Request) {
  try {
    const { user } = await withAuth();
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return jsonError(400, "BAD_REQUEST", "リクエストボディが不正です");
    }

    const { target_user_id, duration_min = 30 } = body;

    if (!target_user_id || !isValidUUID(target_user_id)) {
      return jsonError(
        400,
        "BAD_REQUEST",
        "有効なtarget_user_idを指定してください",
      );
    }

    if (typeof duration_min !== "number" || duration_min < 30) {
      return jsonError(
        400,
        "BAD_REQUEST",
        "duration_minは30以上の数値で指定してください",
      );
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
      .eq("id", target_user_id)
      .single();

    const myTimezone =
      (myProfile as Record<string, unknown> | null)?.timezone as string ??
      "Asia/Tokyo";
    const theirTimezone =
      (theirProfile as Record<string, unknown> | null)?.timezone as string ??
      "Asia/Tokyo";

    // 今日から7日間を探索
    const today = new Date();
    const overlapSlots: TimeSlot[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0]!;

      const [mySlotsForDay, theirSlotsForDay] = await Promise.all([
        computeUserSlots(serviceClient, user.id, dateStr, myTimezone),
        computeUserSlots(serviceClient, target_user_id, dateStr, theirTimezone),
      ]);

      const theirSet = new Set(
        theirSlotsForDay.map((s) => `${s.date}|${s.start}|${s.end}`),
      );
      for (const mySlot of mySlotsForDay) {
        const key = `${mySlot.date}|${mySlot.start}|${mySlot.end}`;
        if (theirSet.has(key)) {
          overlapSlots.push(mySlot);
        }
      }
    }

    // duration_min > 30 の場合、連続スロットを結合
    const slotsPerBlock = Math.ceil(duration_min / 30);
    const candidates: TimeSlot[] = [];

    if (slotsPerBlock === 1) {
      candidates.push(...overlapSlots);
    } else {
      // 連続するスロットを検出
      for (let i = 0; i <= overlapSlots.length - slotsPerBlock; i++) {
        const first = overlapSlots[i]!;
        let consecutive = true;
        for (let j = 1; j < slotsPerBlock; j++) {
          const prev = overlapSlots[i + j - 1]!;
          const curr = overlapSlots[i + j]!;
          if (prev.date !== curr.date || prev.end !== curr.start) {
            consecutive = false;
            break;
          }
        }
        if (consecutive) {
          candidates.push({
            date: first.date,
            start: first.start,
            end: overlapSlots[i + slotsPerBlock - 1]!.end,
          });
        }
      }
    }

    // スコア計算
    const scored: ScoredSuggestion[] = candidates.map((slot) => ({
      ...slot,
      score: scoreSlot(slot, today, overlapSlots),
    }));

    // スコア降順でソートし、上位3件を返す
    scored.sort((a, b) => b.score - a.score);
    const suggestions = scored.slice(0, 3);

    return json({ suggestions });
  } catch (error) {
    return handleApiError(error);
  }
}
