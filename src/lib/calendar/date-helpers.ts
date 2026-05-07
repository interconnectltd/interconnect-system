const TZ = "Asia/Tokyo";

function getTokyoParts(date: Date): {
  year: number;
  month: number;
  day: number;
  weekday: number;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: weekdayMap[get("weekday")] ?? 0,
  };
}

// Asia/Tokyo is UTC+9 with no DST, so we can construct day boundaries by
// subtracting the fixed offset from a UTC midnight of the target wall-clock date.
function tokyoMidnightUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, -9, 0, 0, 0));
}

export function getWeekRange(weekOffset: number): { from: string; to: string } {
  const now = new Date();
  const today = getTokyoParts(now);
  // Monday-start: Mon=0 ... Sun=6
  const dayIndex = (today.weekday + 6) % 7;

  const baseMonday = tokyoMidnightUtc(today.year, today.month, today.day);
  baseMonday.setUTCDate(baseMonday.getUTCDate() - dayIndex + weekOffset * 7);

  const sundayEnd = new Date(baseMonday);
  sundayEnd.setUTCDate(sundayEnd.getUTCDate() + 7);

  return { from: baseMonday.toISOString(), to: sundayEnd.toISOString() };
}

export function formatWeekLabel(fromIso: string, toIso: string): string {
  const from = new Date(fromIso);
  // The exclusive `to` is the next Monday; the displayed end-of-week is the
  // Sunday before it.
  const lastDay = new Date(new Date(toIso).getTime() - 24 * 60 * 60 * 1000);

  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: TZ,
    month: "long",
    day: "numeric",
  });
  return `${formatter.format(from)} 〜 ${formatter.format(lastDay)}`;
}

export function formatCalendarDate(iso: string): string {
  const date = new Date(iso);
  const md = new Intl.DateTimeFormat("ja-JP", {
    timeZone: TZ,
    month: "numeric",
    day: "numeric",
  }).format(date);
  const weekday = new Intl.DateTimeFormat("ja-JP", {
    timeZone: TZ,
    weekday: "short",
  }).format(date);
  return `${md} (${weekday})`;
}

export function formatCalendarTime(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
