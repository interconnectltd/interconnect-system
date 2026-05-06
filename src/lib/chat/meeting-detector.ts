import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/server";

// --- §4.2 Stage 1: Regex filter (zero cost) ---

const MEETING_INTENT_PATTERN =
  /(明日|来週|今週|(\d{1,2})(時|：|:)|月曜|火曜|水曜|木曜|金曜|Zoom|Meet|ミーティング|打ち合わせ|会議しま|MTGしま|オンラインで)/;

/**
 * Quick pre-filter: returns true only for text messages matching
 * meeting-related patterns. Non-text content types are always skipped (§4.4).
 */
export function shouldCheckIntent(
  message: string,
  contentType: string,
): boolean {
  if (contentType !== "text") return false;
  return MEETING_INTENT_PATTERN.test(message);
}

// --- §4.2 Stage 2: Haiku intent classification ---

export interface MeetingIntent {
  intent: "confirmed" | "proposed" | "none";
  datetime: string | null; // ISO 8601
  platform: "zoom" | "meet" | null;
  confidence: number; // 0-1
}

const NONE_INTENT: MeetingIntent = {
  intent: "none",
  datetime: null,
  platform: null,
  confidence: 0,
};

const SYSTEM_PROMPT = `あなたは日本語ビジネスチャットの会議意図検知アシスタントです。
ユーザーから渡されるチャット履歴を分析し、オンライン会議のスケジュール意図を判定してください。

判定基準:
- "confirmed": 具体的な日時が決まり、双方が合意している（「大丈夫です」「そうしましょう」「了解です」など）。confidence >= 0.8。
- "proposed": 片方が日時を提案しているが、まだ合意に至っていない。confidence 0.5-0.8。
- "none": 会議の話題ではない、過去の会議への言及、事務連絡など。

日時の解釈ルール:
- 相対的な日本語の日時表現（明日、来週火曜、今週金曜など）は、現在日時を基準にISO 8601形式（タイムゾーン+09:00）に変換してください。
- 現在日時: ${new Date().toISOString()}

プラットフォーム検知:
- "Zoom"、"zoom"への言及 → "zoom"
- "Meet"、"Google Meet"への言及 → "meet"
- 言及なし → null

必ず以下のJSON形式のみで回答してください。説明文は不要です:
{"intent":"confirmed"|"proposed"|"none","datetime":"ISO8601文字列"|null,"platform":"zoom"|"meet"|null,"confidence":0.0〜1.0}`;

/**
 * Calls Claude Haiku to classify meeting intent from recent chat context.
 * Takes the last 5 messages + the current message.
 */
export async function detectMeetingIntent(
  messages: { content: string; sender_id: string }[],
  currentMessage: string,
): Promise<MeetingIntent> {
  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const contextLines = messages
      .slice(-5)
      .map((m) => `[${m.sender_id}]: ${m.content}`)
      .join("\n");

    const userPrompt = `チャット履歴:\n${contextLines}\n\n最新メッセージ:\n${currentMessage}`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return NONE_INTENT;

    const parsed = JSON.parse(textBlock.text);

    // Validate shape
    if (
      !parsed ||
      !["confirmed", "proposed", "none"].includes(parsed.intent) ||
      typeof parsed.confidence !== "number" ||
      parsed.confidence < 0 ||
      parsed.confidence > 1
    ) {
      return NONE_INTENT;
    }

    if (
      parsed.platform !== null &&
      parsed.platform !== "zoom" &&
      parsed.platform !== "meet"
    ) {
      parsed.platform = null;
    }

    return {
      intent: parsed.intent,
      datetime: typeof parsed.datetime === "string" ? parsed.datetime : null,
      platform: parsed.platform,
      confidence: parsed.confidence,
    };
  } catch {
    return NONE_INTENT;
  }
}

// --- §4.4 Anti-spam: suppress duplicate suggestions ---

/**
 * Returns true if a meeting_suggestion message was posted in this room
 * within the given time window.
 */
export async function hasRecentSuggestion(
  roomId: string,
  withinHours: number,
): Promise<boolean> {
  try {
    const serviceClient = await createServiceClient();

    const since = new Date(
      Date.now() - withinHours * 60 * 60 * 1000,
    ).toISOString();

    const { data, error } = await serviceClient
      .from("chat_messages")
      .select("id")
      .eq("room_id", roomId)
      .eq("content_type", "meeting_suggestion")
      .gte("created_at", since)
      .limit(1);

    if (error) return false;

    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}
